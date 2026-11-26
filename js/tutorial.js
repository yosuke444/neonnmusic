/* =========================================================
 * tutorial.js … チュートリアル（監督の決定：初回強制ではなく、メニューから選べるモード）
 * 専用の短い曲と、手作りの譜面で、ノーツの種類とスキルゲージを順番に説明しながら遊ぶ。
 * 曲は本編の50曲に含めない（proto 扱い。曲一覧・投票には出ない）。記録・解禁にも数えない。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;
  const BPM = 100;
  const SPB = 60 / BPM;
  const BAR = 4;

  /* ---------- 曲：わかりやすい4つ打ち（拍が取りやすい） ---------- */
  const R = (tok, n) => Array(n).fill(tok).join(' ');
  const song = {
    id: 'tutorial',
    no: 0,
    proto: true,
    tutorial: true,
    title: 'チュートリアル・ストリート',
    genre: 'ハウス（練習用）',
    bpm: BPM,
    key: 'C',
    mode: 'major',
    free: true,
    leadPart: 'lead',
    prog: ['I', 'vi', 'IV', 'V'],
    chordLen: 1,
    memo: 'チュートリアル用。拍がはっきり聞こえるよう、キックを4分で鳴らし続ける。',
    instruments: {
      kick: { preset: 'kick', gain: 0.9 },
      clap: { preset: 'clap', gain: 0.6, rev: 0.2 },
      hat: { preset: 'hat', gain: 0.35, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.32, base: 28, cutoff: 700, duck: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.3, low: 55, high: 72, rev: 0.4, duck: 0.3 },
      lead: { preset: 'bell', gain: 0.35, ratio: 1, index: 1, decay: 0.7, rev: 0.3 },
    },
    patterns: {
      k4: 'x . . . x . . . x . . . x . . .',
      s24: '. . . . x . . . . . . . x . . .',
      hOff: '. . x . . . x . . . x . . . x .',
      bass: '1 . . . 1 . . . 1 . . . 1 . . .',
      hold: R('x', 16),
      lead: 'C5 - - - E5 - - - G5 - - - E5 - - - | A4 - - - C5 - - - E5 - - - C5 - - - | F4 - - - A4 - - - C5 - - - A4 - - - | G4 - - - B4 - - - D5 - - - B4 - - -',
    },
    sections: [
      { name: 'はじめに', type: 'intro', bars: 2, parts: { kick: 'k4', pad: 'hold' } },
      { name: '通常ノーツ', type: 'drop', bars: 8, drop: true, impact: 'crash', parts: { kick: 'k4', hat: 'hOff', bass: 'bass', pad: 'hold' } },
      { name: '長押し', type: 'break', bars: 8, parts: { kick: 'k4', clap: 's24', bass: 'bass', pad: 'hold', lead: 'lead' } },
      { name: '同時押し', type: 'drop', bars: 6, drop: true, impact: 'crash', parts: { kick: 'k4', clap: 's24', hat: 'hOff', bass: 'bass', pad: 'hold' } },
      { name: '連打', type: 'build', bars: 4, build: true, gap: 0.5, parts: { kick: 'k4', pad: 'hold' } },
      { name: 'キーノーツ', type: 'drop', bars: 6, drop: true, parts: { kick: 'k4', clap: 's24', hat: 'hOff', bass: 'bass', pad: 'hold', lead: 'lead' } },
      { name: 'スキル', type: 'drop', bars: 8, drop: true, impact: 'crash', parts: { kick: 'k4', clap: 's24', hat: 'hOff', bass: 'bass', pad: 'hold' } },
      { name: 'しあげ', type: 'drop', bars: 4, drop: true, impact: 'crash', parts: { kick: 'k4', clap: 's24', hat: 'hOff', bass: 'bass', pad: 'hold', lead: 'lead' } },
      { name: 'おわり', type: 'outro', bars: 2, parts: { pad: 'hold' } },
    ],
  };
  NLM.Songs.register(song);

  /* ---------- 譜面（手作り）と説明の文 ---------- */
  const barT = (bar) => bar * BAR * SPB; // bar は0から
  const captions = [];
  const cap = (bar, title, text) => captions.push({ t: barT(bar) - 1.2, title, text });

  function build() {
    const list = [];
    const tap = (beat, lane, extra) => list.push(Object.assign({ t: beat * SPB, beat, lane, type: 'tap', key: false, chord: null }, extra || {}));
    let bar = 0;
    cap(0, 'ようこそ！', 'ノーツが白い線（判定ライン）に重なった瞬間に、そのレーンを叩きます。キーボードは F・G・H・J、スマホは下のボタン。');
    bar = 2;
    // 通常ノーツ：4分で左から右へ
    cap(bar, '通常ノーツ', '判定ラインに重なった瞬間に1回叩く。ぴったりなら PERFECT、少しずれると GREAT。');
    for (let b = 0; b < 8 * BAR; b += 1) if (b % 8 !== 7) tap(bar * BAR + b + 2, b % 4);
    bar += 8;
    // 長押し：2拍伸ばして、終わりの印で離す
    cap(bar, '長押しノーツ', '押したまま伸ばし、終わりの印（上向きの矢印）のところで離す。早く離してもミス。');
    for (let k = 0; k < 7; k++) {
      const beat = bar * BAR + k * 4 + 2;
      const lane = [0, 3, 1, 2][k % 4];
      list.push({ t: beat * SPB, beat, lane, type: 'hold', end: (beat + 2) * SPB, key: false, chord: null });
    }
    bar += 8;
    // 同時押し
    cap(bar, '同時押し', '横線でつながったノーツは、同時に2つ叩く。');
    let g = 100;
    for (let k = 0; k < 10; k++) {
      const beat = bar * BAR + k * 2 + 2;
      const pair = [
        [0, 3],
        [1, 2],
        [0, 2],
        [1, 3],
      ][k % 4];
      g++;
      for (const l of pair) tap(beat, l, { chord: g });
    }
    bar += 6;
    // 連打
    cap(bar, '連打', 'オレンジの区間は、どのレーンでもいいので何度も叩く。目標の回数を超えると PERFECT。');
    list.push({ t: (bar * BAR + 6) * SPB, beat: bar * BAR + 6, lane: 0, type: 'roll', end: (bar * BAR + 15) * SPB, key: false, chord: null, target: 16 });
    bar += 4;
    // キーノーツ
    cap(bar, 'キーノーツ（金色）', '曲の決め所。得点とスキルゲージが2倍。ミスするとHPも2倍減る。');
    for (let k = 0; k < 12; k++) tap(bar * BAR + k * 2, [1, 2, 0, 3][k % 4], { key: k % 3 === 0 });
    bar += 6;
    // スキル
    cap(bar, 'スキルゲージ', '叩くほど、レーンの区切り線が左から光っていく。全部光るとスキル発動！（キャラごとに効果が違う）');
    for (let b = 0; b < 8 * BAR; b += 1) tap(bar * BAR + b, [0, 1, 2, 3, 2, 1][b % 6]);
    bar += 8;
    cap(bar, 'しあげ', 'ここまでできたら本番へ！演争（対戦）では、相手のスキルで画面が隠されることもあります。');
    for (let b = 0; b < 4 * BAR - 2; b += 0.5) tap(bar * BAR + b, Math.floor(b * 2) % 4);
    // 長押しに離すノーツを付けて、時刻順に並べる
    const notes = list.slice();
    for (const n of list) if (n.type === 'hold') notes.push({ t: n.end, beat: n.end / SPB, lane: n.lane, type: 'release', key: false, chord: null });
    notes.sort((a, b) => a.t - b.t || (a.type === 'release' ? -1 : 0) - (b.type === 'release' ? -1 : 0) || a.lane - b.lane);
    notes.forEach((n) => {
      if (n.type === 'hold') n.tail = notes.findIndex((m) => m.type === 'release' && m.lane === n.lane && Math.abs(m.t - n.end) < 1e-6);
    });
    return notes;
  }

  let cached = null;
  NLM.Tutorial = {
    song,
    captions,
    /** チュートリアルの譜面（PlayScreen の chart と同じ形） */
    chart() {
      if (cached) return cached;
      const notes = build();
      const compiled = NLM.Music.compile(song);
      cached = {
        songId: song.id,
        difficulty: 'easy',
        level: 1,
        notes,
        stats: { count: notes.length, taps: 0, holds: 0, releases: 0, chords: 0, rolls: 1, keys: 0, nps: 1, peak: 1, chordRatio: 0, holdRatio: 0, bpm: BPM },
        duration: compiled.duration,
        compiled,
      };
      return cached;
    },
  };
})();
