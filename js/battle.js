/* =========================================================
 * battle.js … 対戦の中心（spec.md 7章・8章・14章）
 * 演争・協奏・独奏で共通：参加者・CPU・スキルの効果・脱落・順位。
 * 判定の数値は judge.js を使う（CPU・自分・フレンドで同じ計算）。
 *
 * CPUは描画せず、強さに応じた確率で判定を出す（14章）。
 * 妨害を受けている間はCPUのミスが増える（人と同じく「難しくなる」）。
 *
 * 【フレンド対戦（opts.net）】各端末は「自分」と（ホストなら）CPUだけを計算する（＝担当）。
 * 他の人の状態・スキル・脱落は通信で受け取り、remoteState / remoteSkill / remoteElim で反映する。
 * スキルの対象とレーン隠しのレーンは、発動した人の端末が決めて送る（全員で同じ結果になる）。
 * 協奏の共通HPは、各自が「自分のせいで増減した量」を送り、ホストが合計して全員に配る。
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
    const net = opts.net || null; // { host: true/false }
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
        netId: d.netId || null,
        strength: d.strength || 'normal',
        st,
        alive: true,
        elim: null,
        effects: [],
        results: [],
        rand: rng(seed + i * 977 + 1),
        noSkill,
        lastSkillAt: -99,
        sharedDelta: 0, // 協奏：この人のせいで共通HPが増減した量（曲ごと）
      };
    });
    const shared = mode === 'coop' ? { hp: J.HP_MAX, scale: 2 / players.length } : null;
    const aliveList = () => players.filter((p) => p.alive);
    // この端末が計算を担当する人：通信なしなら全員、通信ありなら自分と（ホストなら）CPU
    const owns = (p) => !net || p.local || (p.cpu && net.host);
    for (const p of players) {
      if (shared) {
        // 共通HPの窓口。増減を人ごとに記録する（通信で合計を合わせるため）
        p.st.sharedHp = {
          get hp() {
            return shared.hp;
          },
          set hp(v) {
            p.sharedDelta += v - shared.hp;
            shared.hp = v;
          },
          get scale() {
            return shared.scale;
          },
        };
      }
      if (mode === 'battle') p.st.refHp = () => Math.max(1, ...aliveList().map((q) => q.st.hp));
    }
    const R = rng(seed * 3 + 11);
    let chart = null;
    let ptr = 0;
    let songIndex = 0;
    let elimSeq = 0;
    let over = false;

    function heal(p, v) {
      if (shared) p.st.sharedHp.hp = Math.min(J.HP_MAX, shared.hp + v);
      else if (p.alive) p.st.hp = Math.min(J.HP_MAX, p.st.hp + v);
    }

    /** 独奏では他人向けのスキルを「スコア1.5倍」に置き換える（7-3） */
    function skillOf(p) {
      const sk = p.char.skill;
      if (mode === 'solo' && (sk.attack || sk.target === 'all')) return { effects: [{ type: 'scoreBoost', dur: 6 }], target: 'self' };
      return { effects: sk.effects, target: sk.target };
    }

    /** 自分の担当の人がスキルを使う：対象を決めて効果を出す */
    function useSkill(p, t, out) {
      if (p.noSkill) return;
      const { effects, target } = skillOf(p);
      const others = aliveList().filter((q) => q !== p);
      let targets;
      if (target === 'self') targets = [p];
      else if (target === 'random') targets = others.length ? [others[Math.floor(R() * others.length)]] : [];
      else if (target === 'others') targets = others;
      else targets = aliveList();
      // レーン隠しのレーン（対象ごと）も発動した側で決める
      const lanes = {};
      if (effects.some((e) => e.type === 'blind')) {
        const e = effects.find((x) => x.type === 'blind');
        for (const q of targets) {
          const ls = [0, 1, 2, 3];
          for (let i = 3; i > 0; i--) {
            const j = Math.floor(q.rand() * (i + 1));
            [ls[i], ls[j]] = [ls[j], ls[i]];
          }
          lanes[q.idx] = ls.slice(0, e.lanes);
        }
      }
      applySkill(p, targets, t, lanes, out);
    }

    /** スキルの効果を反映する。担当していない人の数値は変えない（その人の端末から届く） */
    function applySkill(p, targets, t, lanes, out) {
      const sk = p.char.skill;
      const { effects } = skillOf(p);
      for (const e of effects) {
        switch (e.type) {
          case 'heal':
            if (owns(p)) heal(p, e.value);
            break;
          case 'shield':
            if (owns(p)) p.st.shield += e.value;
            break;
          case 'auto':
            if (owns(p)) p.st.autoLeft += e.value;
            break;
          case 'fever':
            if (owns(p)) p.st.scoreBoostUntil = p.st.damageHalfUntil = t + e.dur;
            break;
          case 'guard':
            if (owns(p)) p.st.damageHalfUntil = t + e.dur + 0.5;
            break;
          case 'scoreBoost':
            if (owns(p)) p.st.scoreBoostUntil = t + e.dur;
            break;
          case 'allheal':
            if (shared) {
              if (owns(p)) heal(p, e.self || e.value);
            } else targets.forEach((q) => owns(q) && heal(q, q === p ? e.self || e.value : e.value));
            break;
          default:
            if (DISRUPT[e.type]) {
              for (const q of targets) {
                const fx = { type: e.type, from: p, start: t + WARN, end: t + WARN + e.dur, ratio: e.ratio, lanes: e.lanes, skill: sk };
                if (e.type === 'blind') fx.laneList = (lanes && lanes[q.idx]) || [0, 1, 2, 3].slice(0, e.lanes);
                fx.power = powerOf(e);
                q.effects.push(fx);
              }
            }
        }
      }
      p.lastSkillAt = t;
      out.push({ type: 'skill', p, targets, skill: sk, t, lanes, mine: owns(p) });
    }

    function markElim(p, info, out) {
      p.alive = false;
      p.elim = info;
      out.push({ type: 'elim', p, t: info.t, mine: owns(p) });
      if (aliveList().length <= 1 && !over) {
        over = true;
        out.push({ type: 'over', t: info.t });
      }
    }

    function checkElim(p, t, out) {
      if (mode !== 'battle' || !p.alive || p.st.hp > 0 || !owns(p)) return;
      markElim(p, { seq: ++elimSeq, song: songIndex, t }, out);
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
          p.sharedDelta = 0;
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
            if (!p.cpu || !p.alive || !owns(p)) continue;
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

      owns,

      /** 通信：担当していない人の状態（10回/秒）。s = { hp, score, combo, meter, maxCombo, res, sd } */
      remoteState(p, s) {
        if (!p || owns(p)) return;
        if (s.hp !== undefined && p.alive) p.st.hp = s.hp;
        if (s.score !== undefined) p.st.score = s.score;
        if (s.combo !== undefined) p.st.combo = s.combo;
        if (s.maxCombo !== undefined) p.st.maxCombo = s.maxCombo;
        if (s.meter !== undefined) p.st.meter = s.meter;
        if (s.res) p.lastRes = s.res;
        if (s.sd !== undefined) p.sharedDelta = s.sd;
        if (s.counts) Object.assign(p.st.counts, s.counts);
      },
      /** 通信：ホストが共通HPを合計し直す（協奏） */
      recomputeShared() {
        if (!shared) return 0;
        const sum = players.reduce((a, p) => a + p.sharedDelta, 0);
        shared.hp = Math.max(0, Math.min(J.HP_MAX, J.HP_MAX + sum));
        return shared.hp;
      },
      /** 通信：ホストから届いた共通HP */
      setShared(v) {
        if (shared) shared.hp = v;
      },
      /** 通信：他の人のスキル。targets は人の番号の配列 */
      remoteSkill(p, targetIdx, t, lanes) {
        const out = [];
        if (!p || owns(p)) return out;
        applySkill(p, targetIdx.map((i) => players[i]).filter(Boolean), t, lanes || {}, out);
        return out;
      },
      /** 通信：他の人の脱落（または切断） */
      remoteElim(p, info) {
        const out = [];
        if (!p || !p.alive || owns(p)) return out;
        elimSeq = Math.max(elimSeq, info.seq || 0);
        markElim(p, { seq: info.seq || ++elimSeq, song: info.song === undefined ? songIndex : info.song, t: info.t || 0 }, out);
        return out;
      },
      /** 切断した人：演争は脱落扱い、協奏は以降のスキル・判定を止める */
      drop(p, t) {
        const out = [];
        if (!p) return out;
        p.gone = true;
        if (mode === 'battle' && p.alive) markElim(p, { seq: ++elimSeq, song: songIndex, t }, out);
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
