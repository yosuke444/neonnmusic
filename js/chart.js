/* =========================================================
 * chart.js … 譜面生成（spec.md 11章）
 * 曲の楽譜データ（music.js で読み取ったもの）＋難易度 → ノーツの配列。
 * 曲IDと難易度から毎回同じ譜面ができる（乱数も曲IDと難易度から作る）。
 *
 * ノーツ：{ t（秒）, beat, lane(0〜3), type:'tap'|'hold'|'roll', end（秒）, key, chord（同時押しの組番号）, target（連打の目標回数） }
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  /* 難易度ごとの目安（11章の表）。数値は調整用 */
  const DIFF = {
    easy: { grid: 1, nps: 2.3, minGap: 0.34, chord: 0.0, holdMin: 2, maxHand: 1, roll: 4, jack: 0.6, hat: false },
    normal: { grid: 0.5, nps: 4.8, minGap: 0.19, chord: 0.07, holdMin: 1, maxHand: 2, roll: 6, jack: 0.34, hat: false },
    hard: { grid: 0.25, nps: 7.6, minGap: 0.11, chord: 0.17, holdMin: 0.75, maxHand: 2, roll: 8, jack: 0.2, hat: false },
    extra: { grid: 0.25, nps: 11.5, minGap: 0.07, chord: 0.3, holdMin: 0.5, maxHand: 3, roll: 10, jack: 0.13, hat: true },
  };
  // 区間ごとの密度の倍率（ドロップを一番濃く）
  const SECTION_FACTOR = { intro: 0.6, build: 0.85, drop: 1.15, break: 0.6, outro: 0.55 };
  // ノーツの元になる音の優先度（11章：キック・スネア・リード・和音の刻み）
  const ROLE_W = { lead: 10, snare: 7, clap: 7, kick: 6, chord: 5, bass: 3, arp: 2, hat: 1, ohat: 1, shaker: 1 };
  // 難易度の数字の範囲（9-2）
  const LEVEL_RANGE = { easy: [1, 4], normal: [4, 8], hard: [8, 12], extra: [11, 15] };

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 1;
  }
  function rng(seed) {
    let s = seed;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }
  const onGrid = (beat, grid) => Math.abs(beat / grid - Math.round(beat / grid)) < 1e-3;

  function roleOf(c, e) {
    const p = c.parts[e.part];
    if (!p || e.part === 'roll' || e.part === 'crash' || e.part === 'fx') return null;
    if (p.type === 'drum') return ROLE_W[e.part] !== undefined ? e.part : null;
    if (p.type === 'melody') return e.part === (c.song.leadPart || 'lead') ? 'lead' : 'lead2';
    if (p.type === 'chord') return 'chord';
    if (p.type === 'bass') return 'bass';
    if (p.type === 'arp') return 'arp';
    return null;
  }

  /** 同じ拍に鳴る音をまとめた「候補」の一覧 */
  function onsets(c) {
    const map = new Map();
    for (const e of c.events) {
      const role = roleOf(c, e);
      if (!role) continue;
      const k = Math.round(e.beat * 48);
      let o = map.get(k);
      if (!o) map.set(k, (o = { beat: k / 48, roles: new Set(), lead: null, chordTop: null, chordDur: 0, w: 0 }));
      const r = role === 'lead2' ? 'lead' : role;
      o.roles.add(r);
      o.w = Math.max(o.w, ROLE_W[r] || 0);
      if (r === 'lead' && e.midi !== undefined && (!o.lead || role === 'lead')) o.lead = { midi: e.midi, dur: e.dur };
      if (r === 'chord') {
        o.chordTop = Math.max(o.chordTop || 0, e.midi);
        o.chordDur = Math.max(o.chordDur, e.dur);
      }
    }
    return [...map.values()].sort((a, b) => a.beat - b.beat);
  }

  function generate(song, difficulty) {
    const c = NLM.Music.compile(song);
    const D = DIFF[difficulty];
    const rand = rng(hashStr(song.id + '/' + difficulty));
    const spb = c.spb;
    const all = onsets(c);
    const notes = [];

    // 連打の区間（ビルド後半のスネア連打）と無音区間には他のノーツを置かない
    const rollRanges = c.rolls.map((r) => [r.beat - 0.5, r.beat + r.dur + 0.01]);
    const inRoll = (b) => rollRanges.some(([a, z]) => b >= a && b < z);

    /* 1) 区間ごとに、優先度の高い音から密度の目安まで選ぶ */
    const chosen = [];
    for (const s of c.sections) {
      const a = s.startBeat;
      const z = s.startBeat + s.beats;
      const cands = all.filter((o) => o.beat >= a && o.beat < z && onGrid(o.beat, D.grid) && !inRoll(o.beat) && (D.hat || o.w > 1));
      const secSec = s.beats * spb;
      const target = Math.round(D.nps * (SECTION_FACTOR[s.type] || 0.8) * secSec);
      const scored = cands.map((o) => {
        const pos = o.beat - a;
        let sc = o.w + o.roles.size * 0.8;
        if (onGrid(pos, 1)) sc += 2;
        if (onGrid(pos, 2)) sc += 1;
        if (onGrid(pos, c.beatsPerBar)) sc += 1;
        return { o, sc: sc + rand() * 0.6 };
      });
      scored.sort((x, y) => y.sc - x.sc);
      const acc = [];
      for (const { o } of scored) {
        if (acc.length >= target) break;
        const tt = o.beat * spb;
        // 最小間隔：速い曲でも、その難易度の主な音符（ノーマル＝8分など）は置けるようにする
        const gap = Math.min(D.minGap, D.grid * spb * 0.98);
        if (acc.some((x) => Math.abs(x.beat * spb - tt) < gap - 1e-6)) continue;
        acc.push(o);
      }
      acc.sort((x, y) => x.beat - y.beat);
      // レーン割り当て用：この区間の主旋律の音域
      s.__mids = acc.filter((o) => o.lead).map((o) => o.lead.midi).sort((x, y) => x - y);
      for (const o of acc) chosen.push({ o, s });
    }

    /* 2) レーン：音の高さに合わせる（高い音ほど右）。同じレーンの速い連続は避ける */
    const laneFree = [0, 0, 0, 0]; // 長押しが終わる時刻
    const lastT = [-9, -9, -9, -9]; // レーンごとの直前のノーツの時刻
    let prev = null;
    let group = 0;
    const accentBeats = new Set(c.accents.map((x) => Math.round(x.beat * 48)));
    for (const { o, s } of chosen) {
      const t = o.beat * spb;
      let lane;
      let pitch = null;
      if (o.lead) {
        pitch = o.lead.midi;
        // 区間内の音の高さの順位で4等分（高い音ほど右、4レーンを均等に使う）
        const arr = s.__mids;
        let below = 0;
        let same = 0;
        for (const m of arr) {
          if (m < pitch) below++;
          else if (m === pitch) same++;
        }
        lane = Math.min(3, Math.floor(((below + same / 2) / arr.length) * 4));
      } else if (o.roles.has('chord') && o.chordTop) {
        pitch = o.chordTop;
        lane = 1 + (Math.round(o.beat * 2) % 2);
      } else if (o.roles.has('snare') || o.roles.has('clap')) lane = 2 + (Math.floor(o.beat / c.beatsPerBar) % 2);
      else if (o.roles.has('kick')) lane = Math.round(o.beat) % 2;
      else if (o.roles.has('bass')) lane = 0;
      else lane = 3 - (Math.round(o.beat * 4) % 2); // ハイハットなど高い音：右の2レーン

      const blocked = (l) => laneFree[l] > t - 0.05;
      const jack = (l) => t - lastT[l] < D.jack;
      if (blocked(lane) || jack(lane)) {
        // 音程の動く方向へずらす
        const dir = prev && prev.pitch !== null && pitch !== null && pitch < prev.pitch ? -1 : 1;
        const order = [lane + dir, lane - dir, lane + 2 * dir, lane - 2 * dir, lane + 3 * dir, lane - 3 * dir].filter((l) => l >= 0 && l < 4);
        const alt = order.find((l) => !blocked(l) && !jack(l));
        if (alt === undefined) continue;
        lane = alt;
      }
      // 長押しが続いている間に押す数の上限
      const activeHolds = laneFree.filter((x) => x > t).length;
      if (activeHolds + 1 > D.maxHand) continue;

      const n = { t, beat: o.beat, lane, type: 'tap', key: false, chord: null };
      // 長押し：伸ばすリード（11章）
      if (o.lead && o.lead.dur >= D.holdMin && o.lead.dur * spb >= 0.35) {
        n.type = 'hold';
        n.end = (o.beat + o.lead.dur - Math.min(0.25, o.lead.dur * 0.2)) * spb;
      }
      // 和音に「同時押し＋長押し」（ハード以上、長い和音）
      const padHold = (difficulty === 'hard' || difficulty === 'extra') && o.roles.has('chord') && !o.lead && o.chordDur >= 2;
      if (padHold) {
        n.type = 'hold';
        n.end = (o.beat + Math.min(o.chordDur, 4) - 0.25) * spb;
      }
      notes.push(n);
      lastT[lane] = t;
      if (n.type === 'hold') laneFree[lane] = n.end;

      // 同時押し：複数の音が重なる所・和音・ドロップ1拍目
      const isAccent = accentBeats.has(Math.round(o.beat * 48));
      const wantChord = padHold || (D.maxHand > 1 && (o.roles.size >= 2 || o.roles.has('chord')) && rand() < D.chord) || (isAccent && D.maxHand > 1);
      if (wantChord) {
        const used = new Set([lane]);
        const extra = D.maxHand >= 3 && (o.roles.size >= 3 || isAccent) ? 2 : 1;
        let added = 0;
        const cand = [3 - lane, lane > 1 ? lane - 2 : lane + 2, (lane + 1) % 4, (lane + 3) % 4];
        for (const l of cand) {
          if (added >= extra || used.has(l) || blocked(l) || jack(l)) continue;
          // 同時に押さえる数（この組のノーツ＋他のレーンで続いている長押し）が上限を超えない
          const otherHolds = laneFree.filter((x, i) => x > t && !used.has(i)).length;
          if (used.size + 1 + otherHolds > D.maxHand) break;
          const m = { t, beat: o.beat, lane: l, type: n.type, end: n.end, key: false, chord: null };
          notes.push(m);
          lastT[l] = t;
          if (m.type === 'hold') laneFree[l] = m.end;
          used.add(l);
          added++;
          m.chord = n.chord = ++group;
        }
        if (added) {
          for (const x of notes) if (x.chord === null && x.t === t && used.has(x.lane)) x.chord = group;
        }
      }
      prev = { t, lane, pitch };
    }

    /* 3) 連打：ビルドのスネア連打区間（11章） */
    for (const r of c.rolls) {
      const t = r.beat * spb;
      const end = (r.beat + r.dur) * spb;
      notes.push({ t, beat: r.beat, lane: 0, type: 'roll', end, key: false, chord: null, target: Math.max(4, Math.round(D.roll * (end - t))) });
    }

    /* 4) キーノーツ：ドロップの1拍目、8小節の区切りの最後の決め所 */
    for (const a of c.accents) {
      const at = notes.filter((n) => Math.abs(n.beat - a.beat) < 1e-3 && n.type !== 'roll');
      if (!at.length) {
        // 必ず置く
        const n = { t: a.beat * spb, beat: a.beat, lane: 1, type: 'tap', key: true, chord: null };
        notes.push(n);
      } else at.forEach((n) => (n.key = true));
    }
    const phrase = 8 * c.beatsPerBar;
    for (const s of c.sections.filter((x) => x.type === 'drop' || x.type === 'build')) {
      for (let p = s.startBeat; p < s.startBeat + s.beats; p += phrase) {
        const last2 = notes.filter((n) => n.type !== 'roll' && n.beat >= p + phrase - 2 * c.beatsPerBar && n.beat < p + phrase);
        if (!last2.length) continue;
        // 一番長く伸ばす音（なければ最後の強拍）を決め所にする
        last2.sort((x, y) => (y.end ? y.end - y.t : 0) - (x.end ? x.end - x.t : 0) || y.beat - x.beat);
        const best = last2[0];
        notes.filter((n) => n.beat === best.beat).forEach((n) => (n.key = true));
      }
    }

    notes.sort((a, b) => a.t - b.t || a.lane - b.lane);
    const stats = measure(notes, c);
    const manual = song.levels && song.levels[difficulty];
    const level = manual || levelOf(stats, difficulty);
    return { songId: song.id, difficulty, level, notes, stats, duration: c.duration, compiled: c };
  }

  /** 密度・複雑さの数値 */
  function measure(notes, c) {
    const playable = notes.filter((n) => n.type !== 'roll');
    const first = playable.length ? playable[0].t : 0;
    const last = playable.length ? playable[playable.length - 1].t : 1;
    const dur = Math.max(1, last - first);
    let peak = 0;
    let j = 0;
    for (let i = 0; i < playable.length; i++) {
      while (playable[i].t - playable[j].t > 5) j++;
      peak = Math.max(peak, (i - j + 1) / 5);
    }
    const chords = playable.filter((n) => n.chord !== null).length;
    const holds = playable.filter((n) => n.type === 'hold').length;
    return {
      count: notes.length,
      taps: playable.length - holds,
      holds,
      chords,
      rolls: notes.length - playable.length,
      keys: notes.filter((n) => n.key).length,
      nps: playable.length / dur,
      peak,
      chordRatio: chords / Math.max(1, playable.length),
      holdRatio: holds / Math.max(1, playable.length),
      bpm: c.bpm,
    };
  }

  /** 難易度の数字（1〜15）：密度・瞬間の最大密度・同時押し・長押しから計算（9-2） */
  // 難易度ごとの「複雑さの値」の想定幅 → 数字の範囲に写す
  const RAW_SPAN = { easy: [2, 5], normal: [5.5, 10], hard: [9, 15], extra: [13, 21] };
  function levelOf(s, difficulty) {
    const raw = s.nps * 0.95 + s.peak * 0.45 + s.chordRatio * 4 + s.holdRatio * 2 + (s.bpm >= 160 ? 0.4 : 0);
    const [a, b] = RAW_SPAN[difficulty];
    const [lo, hi] = LEVEL_RANGE[difficulty];
    const lv = Math.round(lo + ((raw - a) / (b - a)) * (hi - lo));
    return Math.max(lo, Math.min(hi, lv));
  }

  const cache = new Map();
  NLM.Chart = {
    DIFF,
    LEVEL_RANGE,
    /** 譜面を作る（同じ曲・難易度は使い回す） */
    generate(song, difficulty) {
      const k = song.id + '/' + difficulty;
      if (!cache.has(k)) cache.set(k, generate(song, difficulty));
      return cache.get(k);
    },
    _raw: generate,
  };
})();
