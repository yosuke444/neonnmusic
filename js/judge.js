/* =========================================================
 * judge.js … 判定・HP・スコア・スキルメーター（spec.md 5章・6-2）
 * 独奏・CPU・フレンドのすべてで共有する（二重実装によるズレを防ぐ）。
 *
 * - Judge.createState()   … 1人分の成績（HP・スコア・コンボ・メーター）
 * - Judge.apply()         … 1ノーツの結果を成績に反映
 * - Judge.createSession() … 譜面＋入力 → 判定（自分の演奏用）
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const J = {
    // 判定の幅（秒）5-2
    WINDOW: { perfect: 0.045, great: 0.1 },
    // HP 5-3（調整用の定数）
    HP_MAX: 100,
    MISS_DAMAGE: { normal: 3, hold: 3, roll: 3, key: 6 },
    // スコア 5-4
    SCORE: { perfect: 100, auto: 100, great: 50, miss: 0 },
    // スキルメーター 5-5
    METER_GAIN: { perfect: 1.0, auto: 0, great: 0.5, miss: 0 },
    METER_MAX: 40,
    KEY_NOTE_MULTIPLIER: 2,
    // 長押し：終点のこの秒数前からは離してもよい
    HOLD_RELEASE_GRACE: 0.1,
    // 連打の判定（目標回数に対する割合）6-2
    ROLL_PERFECT: 1.0,
    ROLL_GREAT: 0.5,
  };

  /** ずれ（秒）→ 判定。幅の外は null（その入力は無視） */
  J.windowResult = function (dt) {
    const a = Math.abs(dt);
    if (a <= J.WINDOW.perfect) return 'perfect';
    if (a <= J.WINDOW.great) return 'great';
    return null;
  };

  /**
   * 1人分の成績
   * opts.mode: 'solo' | 'battle' | 'coop'
   * opts.meterMax: スキルメーター満タンの量（キャラごと）
   * opts.mods: 特性による補正 { greatScore: 1.2, damage: 0.8, meter: 1.1 ... }（フェーズ4）
   */
  J.createState = function (opts) {
    opts = opts || {};
    return {
      mode: opts.mode || 'solo',
      hp: J.HP_MAX,
      score: 0,
      combo: 0,
      maxCombo: 0,
      counts: { perfect: 0, great: 0, miss: 0, auto: 0 },
      meter: 0,
      meterMax: opts.meterMax || J.METER_MAX,
      meterEnabled: opts.meterEnabled !== false,
      mods: opts.mods || {},
      gameOver: false,
      // スキルの効果（フェーズ4で増える）
      shield: 0, // ダメージ無効の残り回数
      autoLeft: 0, // AUTO演奏の残りノーツ数
      scoreBoostUntil: 0,
      damageHalfUntil: 0, // フィーバー中：ミスのダメージ半分
      // 演争・協奏で使う：HPの比較相手
      refHp: null, // () => 生存者の最高HP
      sharedHp: null, // 協奏：共通HP { hp }
      judged: 0,
    };
  };

  /** スキルメーターの溜まりやすさ（5-5）。HPで負けているほど大きい（最大2倍） */
  J.meterMultiplier = function (st) {
    if (st.mode === 'battle' && st.refHp) {
      const top = Math.max(1, st.refHp());
      return 1 + (1 - Math.min(1, st.hp / top));
    }
    const hp = st.sharedHp ? st.sharedHp.hp : st.hp;
    return 1 + (1 - hp / J.HP_MAX);
  };

  function damageOf(note) {
    if (note.key) return J.MISS_DAMAGE.key;
    if (note.type === 'hold') return J.MISS_DAMAGE.hold;
    if (note.type === 'roll') return J.MISS_DAMAGE.roll;
    return J.MISS_DAMAGE.normal;
  }

  /**
   * 1ノーツの結果を反映する。
   * 戻り値：{ skill: true } … メーターが満タンになった
   */
  J.apply = function (st, note, result, now) {
    const mult = note.key ? J.KEY_NOTE_MULTIPLIER : 1;
    const out = { skill: false, damage: 0 };
    st.judged++;
    if (result === 'miss') {
      st.combo = 0;
      st.counts.miss++;
      let dmg = damageOf(note) * (st.mods.damage || 1);
      if (now !== undefined && now < st.damageHalfUntil) dmg *= 0.5;
      if (st.shield > 0) {
        st.shield--;
        dmg = 0;
        out.shielded = true;
      }
      if (st.sharedHp) {
        // 協奏：共通HP（減少量は 5-3 × 2 ÷ 人数。人数で割るのは呼び出し側が sharedHp.scale で指定）
        st.sharedHp.hp = Math.max(0, st.sharedHp.hp - dmg * (st.sharedHp.scale || 1));
        if (st.sharedHp.hp <= 0) st.gameOver = true;
      } else {
        st.hp = Math.max(0, st.hp - dmg);
        if (st.hp <= 0) st.gameOver = true;
      }
      out.damage = dmg;
      return out;
    }
    let base = J.SCORE[result] * mult;
    if (result === 'great' && st.mods.greatScore) base *= st.mods.greatScore;
    if (result === 'perfect' && st.mods.perfectScore) base *= st.mods.perfectScore;
    if (st.mods.score) base *= st.mods.score;
    if (now !== undefined && now < st.scoreBoostUntil) base *= 1.5;
    st.score += Math.round(base);
    st.combo++;
    if (st.combo > st.maxCombo) st.maxCombo = st.combo;
    st.counts[result]++;
    if (st.meterEnabled && result !== 'auto') {
      // AUTO ではメーターは溜まらない（5-5）
      const gain = J.METER_GAIN[result] * mult * J.meterMultiplier(st) * (st.mods.meter || 1);
      st.meter += gain;
      if (st.meter >= st.meterMax) {
        st.meter = 0;
        out.skill = true;
      }
    }
    return out;
  };

  /** 長押しを途中で離した：最初の判定を取り消してミスにする（6-2） */
  J.revise = function (st, note, prev, now) {
    const mult = note.key ? J.KEY_NOTE_MULTIPLIER : 1;
    let base = J.SCORE[prev] * mult;
    if (prev === 'great' && st.mods.greatScore) base *= st.mods.greatScore;
    if (prev === 'perfect' && st.mods.perfectScore) base *= st.mods.perfectScore;
    if (st.mods.score) base *= st.mods.score;
    st.score = Math.max(0, st.score - Math.round(base));
    st.counts[prev] = Math.max(0, st.counts[prev] - 1);
    st.judged--;
    return J.apply(st, note, 'miss', now);
  };

  /** 割合（0〜1）で成績の指標 */
  J.accuracy = function (st) {
    const c = st.counts;
    const n = c.perfect + c.great + c.miss + c.auto;
    return n ? (c.perfect + c.auto + c.great * 0.5) / n : 0;
  };

  /* =========================================================
   * 自分の演奏の判定（譜面＋入力）
   * opts.auto: true → すべて自動演奏（譜面確認画面）
   * 長押し：始点は押した時、終点（type:'release' のノーツ）は離した時に判定する。
   *   終点の判定の幅は通常と同じ。早く離しすぎ・離さずに押し続け・始点のミスは、終点もミス。
   * 戻り値の各関数は「出来事」の配列を返す：
   *   { type:'judge', note, result, lane } / { type:'skill' } / { type:'holdBreak', note } / { type:'rollHit', note }
   * ========================================================= */
  J.createSession = function (chart, st, opts) {
    opts = opts || {};
    const notes = chart.notes.map((n) => Object.assign({}, n, { done: false, result: null, holding: false, hits: 0 }));
    notes.forEach((n) => {
      if (n.type === 'hold' && n.tail !== undefined) {
        n.tailNote = notes[n.tail];
        notes[n.tail].headNote = n;
      }
    });
    const byLane = [[], [], [], []]; // 押して判定するノーツ（通常・長押しの始点）
    const rolls = [];
    const releases = [];
    for (const n of notes) {
      if (n.type === 'roll') rolls.push(n);
      else if (n.type === 'release') releases.push(n);
      else byLane[n.lane].push(n);
    }
    const ptr = [0, 0, 0, 0];
    let rollPtr = 0;
    let relPtr = 0;
    const holding = [null, null, null, null];
    const W = J.WINDOW.great;

    function finish(n, result, ev, now) {
      n.done = true;
      n.result = result;
      const r = J.apply(st, n, result, now);
      ev.push({ type: 'judge', note: n, result, lane: n.lane, shielded: r.shielded });
      if (r.skill) ev.push({ type: 'skill' });
    }

    function useAuto() {
      if (opts.auto) return true;
      if (st.autoLeft > 0) {
        st.autoLeft--;
        return true;
      }
      return false;
    }

    const api = {
      notes,
      state: st,

      /** 押した（t＝曲の中の時刻・秒） */
      press(lane, t) {
        const ev = [];
        // 連打中：どのレーンでも数える
        const r = rolls[rollPtr];
        if (r && !r.done && t >= r.t - W && t <= r.end) {
          r.hits++;
          ev.push({ type: 'rollHit', note: r });
          return ev;
        }
        const list = byLane[lane];
        let i = ptr[lane];
        while (i < list.length && list[i].done) i++;
        ptr[lane] = i;
        const n = list[i];
        if (!n || n.auto) return ev;
        const dt = t - n.t;
        const res = J.windowResult(dt);
        if (!res) return ev; // 判定の幅の外：無視
        finish(n, res, ev, t);
        n.dt = dt;
        if (n.type === 'hold') {
          n.holding = true;
          holding[lane] = n;
        }
        return ev;
      },

      /** 離した：長押しの終点の判定 */
      release(lane, t) {
        const ev = [];
        const n = holding[lane];
        if (!n) return ev;
        holding[lane] = null;
        n.holding = false;
        const tail = n.tailNote;
        if (!tail || tail.done) return ev;
        const dt = t - tail.t;
        const res = J.windowResult(dt);
        if (res) finish(tail, res, ev, t);
        else {
          // 早く離しすぎた
          finish(tail, 'miss', ev, t);
          n.broken = true;
          ev.push({ type: 'holdBreak', note: n, lane });
        }
        return ev;
      },

      /** 毎フレーム：通り過ぎたノーツをミスに、長押しの終点、連打の終わり、自動演奏 */
      update(t) {
        const ev = [];
        for (let lane = 0; lane < 4; lane++) {
          const list = byLane[lane];
          let i = ptr[lane];
          while (i < list.length && list[i].done) i++;
          ptr[lane] = i;
          for (let k = i; k < list.length; k++) {
            const n = list[k];
            if (n.done) continue;
            if (n.t > t + 0.001) break;
            if (n.auto || useAuto()) {
              n.auto = true;
              if (t >= n.t) {
                finish(n, 'auto', ev, t);
                if (n.type === 'hold') {
                  n.holding = true;
                  n.autoHold = true;
                }
              }
              continue;
            }
            if (t > n.t + W) finish(n, 'miss', ev, t);
          }
        }
        // 長押しの終点
        while (relPtr < releases.length && releases[relPtr].done) relPtr++;
        for (let k = relPtr; k < releases.length; k++) {
          const tail = releases[k];
          if (tail.done) continue;
          if (tail.t > t + 0.001) break;
          const head = tail.headNote;
          if (head && head.autoHold) {
            finish(tail, 'auto', ev, t);
            head.holding = false;
            continue;
          }
          if (t > tail.t + W) {
            // 離さずに押し続けた、または始点をミスした
            finish(tail, 'miss', ev, t);
            if (head) {
              if (holding[head.lane] === head) holding[head.lane] = null;
              head.holding = false;
            }
          }
        }
        // 連打
        const r = rolls[rollPtr];
        if (r && !r.done) {
          if (opts.auto && t >= r.t) r.hits = Math.min(r.target, Math.floor(((t - r.t) / (r.end - r.t)) * r.target) + 1);
          if (t >= r.end) {
            const ratio = r.hits / r.target;
            const res = opts.auto ? 'auto' : ratio >= J.ROLL_PERFECT ? 'perfect' : ratio >= J.ROLL_GREAT ? 'great' : 'miss';
            finish(r, res, ev, t);
            rollPtr++;
          }
        }
        return ev;
      },

      /** 曲の最後のノーツが終わる時刻 */
      lastTime() {
        let m = 0;
        for (const n of notes) m = Math.max(m, n.end || n.t);
        return m;
      },

      activeRoll(t) {
        const r = rolls[rollPtr];
        return r && !r.done && t >= r.t - 0.5 ? r : null;
      },
    };
    return api;
  };

  NLM.Judge = J;
})();
