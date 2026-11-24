/* =========================================================
 * battle.js … 対戦の中心（spec.md 7章・8章・14章）
 * 演争・協奏・独奏で共通：参加者・CPU・スキルの効果・脱落・順位。
 * 判定の数値は judge.js を使う（CPU・自分・フレンドで同じ計算）。
 *
 * CPUは描画せず、強さに応じた確率で判定を出す（14章）。
 * 妨害を受けている間はCPUのミスが増える（人と同じく「難しくなる」）。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  // CPUの強さ（1ノーツあたりのパーフェクト・グレイトの割合。残りがミス）
  const STRENGTH = {
    weak: { name: '弱い', p: 0.5, g: 0.32 },
    normal: { name: 'ふつう', p: 0.7, g: 0.24 },
    strong: { name: '強い', p: 0.86, g: 0.12 },
  };
  // 妨害の重さ：効いている間にCPUのミスがどれだけ増えるか（割合を足す）
  // 例：レーン2本を隠す → ミス +24ポイント（隠れたレーンのノーツの約半分を落とす想定）
  function powerOf(e) {
    switch (e.type) {
      case 'blind':
        return 0.12 * e.lanes;
      case 'curtain':
        return 0.36 * e.ratio;
      case 'fog':
        return 0.14;
      case 'wobble':
        return 0.16;
      case 'rush':
        return 0.07;
    }
    return 0;
  }
  const DISRUPT = { blind: 1, curtain: 1, fog: 1, wobble: 1, rush: 1 };
  const WARN = 0.5; // 妨害の予告（8-2：発動の0.5秒前）

  function rng(seed) {
    let s = seed % 2147483647 || 7;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }

  function create(opts) {
    const J = NLM.Judge;
    const Chars = NLM.Characters;
    const mode = opts.mode || 'battle';
    const seed = opts.seed || 12345;
    const players = opts.players.map((d, i) => {
      const ch = Chars.get(d.charId);
      const noSkill = mode === 'coop' && ch.skill.attack; // 協奏：攻撃系はスキルなし（7-2）
      const st = J.createState({ mode, meterMax: ch.skill.meter, mods: Object.assign({}, ch.trait.mods), meterEnabled: !noSkill });
      return {
        idx: i,
        name: d.name,
        char: ch,
        cpu: !!d.cpu,
        local: !!d.local,
        strength: d.strength || 'normal',
        st,
        alive: true,
        elim: null,
        effects: [],
        results: [],
        rand: rng(seed + i * 977 + 1),
        noSkill,
        lastSkillAt: -99,
      };
    });
    const shared = mode === 'coop' ? { hp: J.HP_MAX, scale: 2 / players.length } : null;
    const aliveList = () => players.filter((p) => p.alive);
    for (const p of players) {
      if (shared) p.st.sharedHp = shared;
      if (mode === 'battle') p.st.refHp = () => Math.max(1, ...aliveList().map((q) => q.st.hp));
    }
    const R = rng(seed * 3 + 11);
    let chart = null;
    let ptr = 0;
    let songIndex = 0;
    let elimSeq = 0;
    let over = false;

    function heal(p, v) {
      if (shared) shared.hp = Math.min(J.HP_MAX, shared.hp + v);
      else if (p.alive) p.st.hp = Math.min(J.HP_MAX, p.st.hp + v);
    }

    function useSkill(p, t, out) {
      const sk = p.char.skill;
      if (p.noSkill) return;
      let effects = sk.effects;
      let target = sk.target;
      if (mode === 'solo' && (sk.attack || target === 'all')) {
        // 独奏：他人を対象とするスキルは「一定時間スコア1.5倍」に置き換え（7-3）
        effects = [{ type: 'scoreBoost', dur: 6 }];
        target = 'self';
      }
      const others = aliveList().filter((q) => q !== p);
      let targets;
      if (target === 'self') targets = [p];
      else if (target === 'random') targets = others.length ? [others[Math.floor(R() * others.length)]] : [];
      else if (target === 'others') targets = others;
      else targets = aliveList();
      for (const e of effects) {
        switch (e.type) {
          case 'heal':
            heal(p, e.value);
            break;
          case 'shield':
            p.st.shield += e.value;
            break;
          case 'auto':
            p.st.autoLeft += e.value;
            break;
          case 'fever':
            p.st.scoreBoostUntil = p.st.damageHalfUntil = t + e.dur;
            break;
          case 'guard':
            p.st.damageHalfUntil = t + e.dur + 0.5;
            break;
          case 'scoreBoost':
            p.st.scoreBoostUntil = t + e.dur;
            break;
          case 'allheal':
            if (shared) heal(p, e.self || e.value);
            else targets.forEach((q) => heal(q, q === p ? e.self || e.value : e.value));
            break;
          default:
            if (DISRUPT[e.type]) {
              for (const q of targets) {
                const fx = { type: e.type, from: p, start: t + WARN, end: t + WARN + e.dur, ratio: e.ratio, lanes: e.lanes, skill: sk };
                if (e.type === 'blind') {
                  const ls = [0, 1, 2, 3];
                  for (let i = 3; i > 0; i--) {
                    const j = Math.floor(q.rand() * (i + 1));
                    [ls[i], ls[j]] = [ls[j], ls[i]];
                  }
                  fx.laneList = ls.slice(0, e.lanes);
                }
                fx.power = powerOf(e);
                q.effects.push(fx);
              }
            }
        }
      }
      p.lastSkillAt = t;
      out.push({ type: 'skill', p, targets, skill: sk, t });
    }

    function checkElim(p, t, out) {
      if (mode !== 'battle' || !p.alive || p.st.hp > 0) return;
      p.alive = false;
      p.elim = { seq: ++elimSeq, song: songIndex, t };
      out.push({ type: 'elim', p, t });
      if (aliveList().length <= 1 && !over) {
        over = true;
        out.push({ type: 'over', t });
      }
    }

    function afterJudge(p, result, t, out, skill) {
      // 特性：50コンボごとに回復
      if (result !== 'miss' && p.st.mods.comboHeal && p.st.combo > 0 && p.st.combo % 50 === 0) heal(p, p.st.mods.comboHeal);
      if (skill) useSkill(p, t, out);
      checkElim(p, t, out);
    }

    function disruptPower(p, t) {
      let pw = 0;
      for (const e of p.effects) if (t >= e.start && t < e.end) pw += e.power;
      return pw;
    }

    function cpuResult(p, note, t) {
      if (p.st.autoLeft > 0) {
        p.st.autoLeft--;
        return 'auto';
      }
      const s = STRENGTH[p.strength] || STRENGTH.normal;
      let miss = 1 - s.p - s.g;
      miss *= Math.max(0.4, 1 + ((chart.level || 7) - 7) * 0.08);
      if (note.type === 'roll') miss *= 0.6;
      if (note.type === 'hold') miss *= 1.15;
      if (note.chord !== null && note.chord !== undefined) miss *= 1.1;
      let q = s.p / (s.p + s.g);
      const pw = disruptPower(p, t);
      if (pw > 0) {
        miss += pw;
        q /= 1 + pw * 2;
      }
      miss = Math.min(0.65, miss);
      if (p.rand() < miss) return 'miss';
      return p.rand() < q ? 'perfect' : 'great';
    }

    const api = {
      mode,
      players,
      shared,
      get over() {
        return over;
      },
      get songIndex() {
        return songIndex;
      },
      alive: aliveList,

      /** 曲の始め。HPは引き継ぐ（5-3）。協奏の共通HPは1曲ごとに満タンから */
      startSong(ch, idx) {
        chart = ch;
        ptr = 0;
        songIndex = idx;
        for (const p of players) {
          p.effects = [];
          p.results = [];
          p.st.autoLeft = 0;
        }
        if (shared) {
          shared.hp = J.HP_MAX;
          players.forEach((p) => (p.st.gameOver = false));
        }
      },

      /** 時刻 t（曲の中の秒）までのCPUの演奏を進める。出来事の配列を返す */
      tick(t) {
        const out = [];
        const notes = chart.notes;
        while (ptr < notes.length && notes[ptr].t <= t && !over) {
          const note = notes[ptr];
          for (const p of players) {
            if (!p.cpu || !p.alive) continue;
            const res = cpuResult(p, note, note.t);
            const r = J.apply(p.st, note, res, note.t);
            p.results[ptr] = res;
            if (shared) out.push({ type: 'judge', p, result: res, note, i: ptr });
            afterJudge(p, res, note.t, out, r.skill);
            if (over) break;
          }
          ptr++;
        }
        for (const p of players) p.effects = p.effects.filter((e) => e.end > t);
        return out;
      },

      /** 自分（またはフレンド）の判定の出来事を反映する */
      onLocal(p, evs, t) {
        const out = [];
        for (const e of evs) {
          if (e.type === 'judge') afterJudge(p, e.result, t, out, false);
          else if (e.type === 'holdBreak') checkElim(p, t, out);
          else if (e.type === 'skill') {
            if (p.alive) useSkill(p, t, out);
          }
        }
        return out;
      },

      /** いま効いている妨害（自分の画面の描画用） */
      activeEffects(p, t) {
        return p.effects.filter((e) => t >= e.start && t < e.end);
      },
      /** これから来る妨害（0.5秒前の予告用） */
      warnings(p, t) {
        return p.effects.filter((e) => t >= e.start - WARN && t < e.start);
      },

      /** 順位（7-1）：生存者 → 残りHP → スコア。脱落者 → 脱落が遅い順 → スコア */
      standings() {
        const a = players.filter((p) => p.alive).sort((x, y) => y.st.hp - x.st.hp || y.st.score - x.st.score);
        const b = players
          .filter((p) => !p.alive)
          .sort((x, y) => y.elim.song - x.elim.song || Math.round((y.elim.t - x.elim.t) * 100) || y.st.score - x.st.score);
        return a.concat(b).map((p, i) => ({ rank: i + 1, p }));
      },
    };
    return api;
  }

  /**
   * CPUどうしの自動対戦（8-3：強さの確認）
   * opts: { charts:[譜面…], n:人数, strength, rounds, seed }
   * 戻り値：キャラごとの { plays, wins, rankSum }
   */
  function simulate(opts) {
    const Chars = NLM.Characters;
    const R = rng(opts.seed || 99);
    const stats = {};
    Chars.list.forEach((c) => (stats[c.id] = { plays: 0, wins: 0, rankSum: 0 }));
    for (let r = 0; r < opts.rounds; r++) {
      const pool = Chars.list.slice();
      const picks = [];
      for (let i = 0; i < opts.n; i++) picks.push(pool.splice(Math.floor(R() * pool.length), 1)[0]);
      const b = create({ mode: 'battle', seed: Math.floor(R() * 1e9), players: picks.map((c) => ({ name: c.name, charId: c.id, cpu: true, strength: opts.strength })) });
      for (let k = 0; k < opts.charts.length && !b.over; k++) {
        b.startSong(opts.charts[k], k);
        b.tick(Infinity);
      }
      for (const { rank, p } of b.standings()) {
        const s = stats[p.char.id];
        s.plays++;
        s.rankSum += rank;
        if (rank === 1) s.wins++;
      }
    }
    return stats;
  }

  NLM.Battle = { create, simulate, STRENGTH };
})();
