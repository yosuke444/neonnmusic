/* =========================================================
 * songs/songs-03.js … 21〜30曲目
 * 全体計画：docs/song-plan.md。複合ジャンルはドロップ1と2で片方ずつの特徴を強く出す。
 * チップチューン以外の曲では、矩形波を主旋律・ベースに使わない。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;
  const { R, held, dropSeq, teaseSeq, form, D } = NLM.SongLib;
  const reg = (o) => NLM.Songs.register(Object.assign({ leadPart: 'lead' }, o));

  /* ---------------------------------------------------------
   * 21. シグナル・ブレイクダウン（ブレイクコア 190）
   * --------------------------------------------------------- */
  reg({
    id: 's21',
    no: 21,
    title: 'シグナル・ブレイクダウン',
    genre: 'ブレイクコア',
    bpm: 190,
    key: 'F',
    mode: 'minor',
    form: 'long',
    prog: ['i', 'bIImaj7', 'bVIIsus2', 'iv'], // Fm→G♭maj7→E♭sus2→B♭m
    chordLen: 2,
    unlock: { type: 'maxCombo', n: 200 },
    memo: [
      '【雰囲気】信号が暴走して点滅しまくる街。細かく切り刻んだブレイクビーツを全力で叩く。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8',
      '【コード】一m→♭二maj7→♭七sus2→四m（Fm→G♭maj7→E♭sus2→B♭m）を2小節ずつ。',
      '【主旋律の動機】2小節。F（1拍）-A♭-G-F-C-E♭-F ／ C-F（伸ばし）-A♭-C。軸の音は F（4つのコードすべてに含まれる）。',
      '　ドロップは A A A B A A A C。CでB♭5（最高音）。',
      '【パート】切り刻んだブレイクビーツ（キックとスネアが不規則）、16分のハイハット、リースベース、スーパーソウの主旋律。ドロップ2はスネアが32分で崩れる。',
      '【決め所】25・65小節目の1拍目、各8小節目のB♭5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.15, decay: 0.22 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.12, decay: 0.15 },
      hat: { preset: 'hat', gain: 0.42, pan: 0.25, decay: 0.03 },
      bass: { preset: 'reese', gain: 0.28, base: 29, duck: 0.35, cutoff: 1000, lfo: 0.9 },
      lead: { preset: 'supersaw', gain: 0.44, detune: 28, cutoff: 8000, rev: 0.25, delay: 0.12, duck: 0.2 },
      pad: { preset: 'pad', type: 'chord', gain: 0.42, low: 53, high: 70, rev: 0.45 },
    },
    patterns: {
      k: 'x . . . . . x . . x . . . . . . | x . x . . . . . . x . . x . . .',
      s: '. . . . X . . o . . X . o . X o | . . . . X . o . X . . o . X X X',
      s32: { s: '. . . . . . . . X . . . X . o o . . X . X . X X X X X X X X X X | . . . . X . . o . . X . o . X o . . . . X . o . X o X o X X X X', div: 8 },
      h16: D.h16,
      bass: '1 - - - - - - - 1 - - - 8 - - - | 1 - - - - - - - 5 - - - 8 - 5 -',
      bassLong: held('1', 32),
      pad: held('x', 32),
      hookA: 'F5 - - - Ab5 . G5 . F5 . C5 . Eb5 . F5 . | C5 . . . F5 - - - . . . . Ab4 . C5 .',
      hookB: 'F5 - - - Ab5 . G5 . F5 . Db5 . F5 . Ab5 . | Bb4 . . . Db5 - - - . . . . F4 . Bb4 .',
      hookC: 'F5 - - - Ab5 . G5 . F5 . Db5 . F5 . Ab5 . | Bb4 . . . Db5 - - - Bb5 - - - - - - -',
    },
    sections: form('long', {
      intro: { filter: [500, 6000], parts: { pad: 'pad', hat: 'h16' } },
      build: { parts: (b) => ({ pad: 'pad', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h16', bass: 'bass', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', hat: 'h16', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', bass: 'bassLong' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's32', hat: 'h16', bass: 'bass', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 500], parts: { pad: 'pad', hat: 'h16' } },
    }),
  });

  /* ---------------------------------------------------------
   * 22. スターゲイザー（トランス×フューチャーベース 142）
   * --------------------------------------------------------- */
  reg({
    id: 's22',
    no: 22,
    title: 'スターゲイザー',
    genre: 'トランス×フューチャーベース',
    bpm: 142,
    key: 'F#',
    mode: 'major',
    form: 'std',
    prog: ['IVmaj7', 'Vsus4', 'vi7', 'Iadd9'], // Bmaj7→C#sus4→D#m7→F#add9
    chordLen: 1,
    unlock: { type: 'perfect', n: 2000 },
    memo: [
      '【雰囲気】屋上の展望台から見る満天の星。トランスの高揚感と、フューチャーベースのきらめく和音。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32：トランス）→ブレイク8→ビルド8→ドロップ2 16（49〜64：フューチャーベース）→アウトロ8',
      '【コード】四maj7→五sus4→六m7→一add9（Bmaj7→C#sus4→D#m7→F#add9）。',
      '【主旋律の動機】1小節。F#（長め）-A#-G#-F#-C#-D#-F#-G#。軸の音は F#。',
      '　ドロップは A A A B ×3＋A A A C。CでF#6（最高音）。',
      '【パート】ドロップ1：4つ打ち、転がるベース、広いスーパーソウ、16分のアルペジオ。ドロップ2：半分の速さのビート、スーパーソウの和音の刻み、サブベース。',
      '【決め所】17・49小節目の1拍目、各4小節目のC#6の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.75, rev: 0.3 },
      snare: { preset: 'snare', gain: 1.4, rev: 0.3 },
      ohat: { preset: 'hat', gain: 0.32, decay: 0.2, hp: 7000, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.55, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.36, base: 30, duck: 0.55, cutoff: 850 },
      sub: { preset: 'sub', type: 'bass', gain: 0.22, base: 30, duck: 0.4 },
      lead: { preset: 'supersaw', gain: 0.42, detune: 30, cutoff: 8000, rev: 0.35, delay: 0.25, duck: 0.25 },
      stab: { preset: 'supersaw', type: 'chord', gain: 0.32, low: 61, high: 78, rev: 0.3, duck: 0.65, env: [0.003, 0.2, 0.4, 0.1], cutoff: 6000 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.24, base: 66, pan: 0.25, rev: 0.3, delay: 0.3, cutHi: 4000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 56, high: 73, rev: 0.45, duck: 0.35 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      hk: D.halfK,
      hs: D.halfS,
      hh: 'x . x . x . x . x . x x x . x .',
      bass: '1 1 1 1 . 1 1 1 . 1 1 1 . 1 1 1',
      sub: '1 - - - - - - - - - 5 - - - - -',
      stab: 'x . . x . . x . . x . . x . x .',
      pad: held('x', 16),
      arp: '0 1 2 3 1 2 3 4 0 1 2 3 1 2 3 4',
      hookA: 'F#5 - . A#5 . G#5 F#5 . C#5 . D#5 . F#5 . G#5 .',
      hookB: 'F#5 - . A#5 . G#5 F#5 . C#5 . F#5 . G#5 . A#5 .',
      hookC: 'F#5 - . A#5 . G#5 F#5 . C#6 - - - F#6 - - .',
    },
    sections: form('std', {
      intro: { filter: [500, 5000], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp' } },
      build2: { parts: { pad: 'pad', arp: 'arp' } },
      drop2: { parts: (b) => ({ kick: 'hk', snare: 'hs', hat: 'hh', sub: 'sub', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 500], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 23. ミッドナイト・ダッシュ（ハードコア 180）
   * --------------------------------------------------------- */
  reg({
    id: 's23',
    no: 23,
    title: 'ミッドナイト・ダッシュ',
    genre: 'ハードコア',
    bpm: 180,
    key: 'A',
    mode: 'minor',
    form: 'long',
    prog: ['i', 'v', 'bVImaj7', 'bVII'], // Am→Em→Fmaj7→G
    chordLen: 1,
    unlock: { type: 'hardClears', n: 3 },
    memo: [
      '【雰囲気】深夜の大通りを全力疾走。速く歪んだキックと、叫ぶようなリード。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8',
      '【コード】一m→五m→♭六maj7→♭七（Am→Em→Fmaj7→G）。',
      '【主旋律の動機】1小節の8分の刻み。E-E-A-E-C-E-B-C。軸の音は E（F に maj7 を付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでD6（最高音）。',
      '【パート】歪んだ4つ打ちキック、クラップ、裏拍で鳴るベース、太いスーパーソウ。ドロップ2はハイハットが16分になる。',
      '【決め所】25・65小節目の1拍目、各4小節目のB5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'hardkick', gain: 0.9, decay: 0.35 },
      clap: { preset: 'clap', gain: 0.8, rev: 0.25 },
      snare: { preset: 'snare', gain: 0.8 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.2 },
      ohat: { preset: 'hat', gain: 0.28, decay: 0.18, hp: 7000, pan: -0.15 },
      bass: { preset: 'sawbass', gain: 0.34, base: 28, duck: 0.65, cutoff: 1300 },
      lead: { preset: 'supersaw', gain: 0.5, detune: 36, cutoff: 9500, rev: 0.28, delay: 0.1, duck: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 52, high: 69, rev: 0.45 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 . 1 . . 1 1 . . 1 1 . . 1 1 .',
      pad: held('x', 16),
      hookA: 'E5 . E5 . A5 . E5 . C5 . E5 . B4 . C5 .',
      hookB: 'D5 . D5 . G5 . D5 . B4 . D5 . A4 . B4 .',
      hookC: 'D5 . D5 . G5 . D5 . B5 - - - D6 - - -',
    },
    sections: form('long', {
      intro: { filter: [400, 5000], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', pad: 'pad' } },
    }),
  });

  /* ---------------------------------------------------------
   * 24. ミラーボール・ランデヴー（ニューディスコ 115）
   * --------------------------------------------------------- */
  reg({
    id: 's24',
    no: 24,
    title: 'ミラーボール・ランデヴー',
    genre: 'ニューディスコ',
    bpm: 115,
    key: 'D',
    mode: 'major',
    form: 'mid',
    prog: ['Imaj7', 'vi7', 'IVmaj7', 'V7sus4'], // Dmaj7→Bm7→Gmaj7→A7sus4
    chordLen: 1,
    unlock: { type: 'plays', n: 15 },
    memo: [
      '【雰囲気】ミラーボールの下で踊る。生っぽいディスコのノリを、シンセで今風に。',
      '【構成（中くらい）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド4（41〜44）→ドロップ2 16（45〜60）→アウトロ4',
      '【コード】一maj7→六m7→四maj7→五7sus4（Dmaj7→Bm7→Gmaj7→A7sus4）。',
      '【主旋律の動機】1小節。F#（長め）-A-F#-E-D-E-F#-A。軸の音は F#。',
      '　ドロップは A A A B ×3＋A A A C。CでD6（最高音）。',
      '【パート】4つ打ち、クラップ、裏拍のオープンハット、16分のシェイカー、オクターブで跳ねるベース、ギターのように細かく刻む和音、やわらかいスーパーソウ、ストリングス風のパッド。',
      '【決め所】17・45小節目の1拍目、各4小節目のG5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.85, rev: 0.25 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.32, decay: 0.22, hp: 7000, pan: -0.15 },
      shaker: { preset: 'shaker', gain: 0.4, pan: 0.3 },
      bass: { preset: 'sawbass', gain: 0.4, base: 26, duck: 0.45, cutoff: 950 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.22, low: 62, high: 79, pan: 0.2, rev: 0.2, duck: 0.35, cutHi: 3500, fdecay: 0.04 },
      lead: { preset: 'supersaw', gain: 0.42, detune: 8, cutoff: 3200, rev: 0.32, delay: 0.25, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 57, high: 74, rev: 0.4, attack: 0.12, duck: 0.3 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      shk: D.h16,
      bass: '1 . 8 . 1 . 8 1 . 1 8 . 1 . 8 .',
      stab: '. x . x x . x . . x . x x . x .',
      pad: held('x', 16),
      hookA: 'F#5 - - . A5 . F#5 E5 . D5 . E5 F#5 . A5 .',
      hookB: 'E5 - - . A5 . E5 D5 . A4 . D5 E5 . G5 .',
      hookC: 'E5 - - . A5 . E5 D5 . A4 . D5 E5 . D6 -',
    },
    sections: form('mid', {
      intro: { filter: [600, 4000], parts: { kick: 'k4', ohat: 'hOff', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', shaker: 'shk', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', stab: 'stab' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', shaker: 'shk', bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { kick: 'k4', ohat: 'hOff', stab: 'stab' } },
    }),
  });

  /* ---------------------------------------------------------
   * 25. ラストトレイン・ステップ（UKガラージ×ドラムンベース 165）
   * --------------------------------------------------------- */
  reg({
    id: 's25',
    no: 25,
    title: 'ラストトレイン・ステップ',
    genre: 'UKガラージ×ドラムンベース',
    bpm: 165,
    key: 'C',
    mode: 'minor',
    form: 'std',
    swing: 0.12,
    prog: ['i', 'bVI', 'iv', 'V7'], // Cm→A♭→Fm→G7
    chordLen: 1,
    unlock: { type: 'songClear', song: 's04' },
    memo: [
      '【雰囲気】終電を追いかけて駅の階段を駆け上がる。跳ねたガラージのノリを、ドラムンベースの速さで。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32：ガラージ）→ブレイク8→ビルド8→ドロップ2 16（49〜64：ドラムンベース）→アウトロ8',
      '【コード】一m→♭六→四m→五7（Cm→A♭→Fm→G7）。最後のG7で引き戻す。',
      '【主旋律の動機】1小節。声っぽい音で C-E♭-G（伸ばし）-F-E♭-C-B♭。軸の音は C。',
      '　ドロップは A A A B ×3＋A A A C。CでB5（最高音）。',
      '【パート】ドロップ1：2ステップのキックとスネア、スウィングしたハイハット、のこぎり波ベース。ドロップ2：ドラムンベースのビート、リースベース。',
      '【決め所】17・49小節目の1拍目、各4小節目のG7。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.08, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.2 },
      hat: { preset: 'hat', gain: 0.45, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.38, base: 24, duck: 0.45, cutoff: 420 },
      bass2: { preset: 'reese', type: 'bass', gain: 0.26, base: 24, duck: 0.4, cutoff: 800 },
      lead: { preset: 'vox', gain: 0.55, rev: 0.3, delay: 0.25, duck: 0.15 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.26, low: 58, high: 74, rev: 0.25, duck: 0.4, cutHi: 2600 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.4 },
    },
    patterns: {
      k: D.ukgK,
      s: D.s24,
      h: D.ukgH,
      dk: D.dnbK,
      ds: D.dnbS,
      h8: D.h8,
      bass: '1 . . 1 . . . . . . 5 . . 1 . .',
      bass2: `1 ${R('-', 9)} 1 ${R('-', 5)}`,
      stab: '. . x . . x . . . . x . . x . .',
      pad: held('x', 16),
      hookA: 'C5 . Eb5 . G5 - . F5 . Eb5 . C5 - . Bb4 .',
      hookB: 'B4 . D5 . G5 - . F5 . D5 . B4 - . G4 .',
      hookC: 'B4 . D5 . G5 - . F5 . B5 - - - - - .',
    },
    sections: form('std', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', hat: 'h', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', hat: 'h', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab' } },
      build2: { parts: { pad: 'pad', hat: 'h8' } },
      drop2: { parts: (b) => ({ kick: 'dk', snare: 'ds', hat: 'h8', bass2: 'bass2', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', hat: 'h' } },
    }),
  });

  /* ---------------------------------------------------------
   * 26. アイアンフレーム（ダブステップ×トラップ 150）
   * --------------------------------------------------------- */
  reg({
    id: 's26',
    no: 26,
    title: 'アイアンフレーム',
    genre: 'ダブステップ×トラップ',
    bpm: 150,
    key: 'D',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVIIsus2', 'bVI', 'v'], // Dm→Csus2→B♭→Am
    chordLen: 1,
    unlock: { type: 'battleWins', n: 3 },
    memo: [
      '【雰囲気】建設中の鉄骨の街。トラップの808と、ダブステップのうなるベースが交互に襲ってくる。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32：トラップ）→ブレイク8→ビルド8→ドロップ2 16（49〜64：ダブステップ）→アウトロ8',
      '【コード】一m→♭七sus2→♭六→五m（Dm→Csus2→B♭→Am）。',
      '【主旋律の動機】1小節。D（長め）-F-D-A-D-F-G。軸の音は D。',
      '　ドロップは A A A B ×3＋A A A C。CでA5（最高音）。',
      '【パート】ドロップ1：半分の速さのビート、8分＋32分・3連のハイハット、808ベース。ドロップ2：ワブルベース（1拍に2回）、サブベース。主旋律はアシッド。',
      '【決め所】17・49小節目の1拍目、各4小節目のE5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0, tune: 0.9 },
      snare: { preset: 'snare', gain: 1.6, rev: 0.25 },
      hat: { preset: 'hat', gain: 0.4, pan: 0.25, decay: 0.035 },
      bass: { preset: 'b808', gain: 0.24, base: 26, duck: 0.2 },
      bass2: { preset: 'wobble', type: 'bass', gain: 0.4, base: 26, cutoff: 260, depth: 1800, wob: 2, duck: 0.3 },
      sub: { preset: 'sub', type: 'bass', gain: 0.22, base: 26, duck: 0.4 },
      lead: { preset: 'acid', type: 'melody', gain: 0.6, rev: 0.25, delay: 0.25, q: 12, cutLo: 500 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 53, high: 70, rev: 0.45 },
    },
    patterns: {
      k: D.halfK,
      s: D.halfS,
      h8: D.h8,
      roll32: { s: R('x', 32), div: 8 },
      trip: { s: R('x', 24), div: 6 },
      bass: '1 - - - - - - - . . 1 - - - 5 -',
      wob: '1 - - 1 - - 1 - 1 - - 8 - - 1 -',
      sub: held('1', 16),
      pad: held('x', 16),
      hookA: 'D5 - . F5 . D5 . A4 D5 . . F5 . G5 . .',
      hookB: 'C5 - . E5 . C5 . A4 C5 . . E5 . G5 . .',
      hookC: 'C5 - . E5 . C5 . A4 E5 - - - A5 - - -',
    },
    sections: form('std', {
      intro: { filter: [500, 4000], parts: { pad: 'pad', hat: 'h8' } },
      build: { parts: (b) => ({ pad: 'pad', hat: 'h8', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: ['h8', 'h8', 'h8', 'roll32', 'h8', 'h8', 'h8', 'trip'], bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', sub: 'sub' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h8', bass2: 'wob', sub: 'sub', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 400], parts: { pad: 'pad', hat: 'h8' } },
    }),
  });

  /* ---------------------------------------------------------
   * 27. サインボード・アベニュー（フューチャーハウス 126）
   * --------------------------------------------------------- */
  reg({
    id: 's27',
    no: 27,
    title: 'サインボード・アベニュー',
    genre: 'フューチャーハウス',
    bpm: 126,
    key: 'Ab',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bIII', 'bVII6', 'iv'], // A♭m→C♭→G♭6→D♭m
    chordLen: 1,
    unlock: { type: 'coopPlays', n: 5 },
    memo: [
      '【雰囲気】看板だらけの大通り。金属っぽく跳ねるベースと、短く弾むリード。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭三→♭七6→四m（A♭m→C♭→G♭6→D♭m）。',
      '【主旋律の動機】1小節。E♭-E♭-G♭-E♭-D♭-E♭（伸ばし）-B♭-A♭-B♭。軸の音は E♭（G♭に6thを付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでD♭6（最高音）。',
      '【パート】4つ打ち、クラップ、裏拍のオープンハット、16分のハイハット、共鳴の強いのこぎり波ベース（跳ねる）、プラックの主旋律、パッド。',
      '【決め所】17・49小節目の1拍目、各4小節目のA♭5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0 },
      clap: { preset: 'clap', gain: 0.9, rev: 0.22 },
      snare: { preset: 'snare', gain: 0.7 },
      hat: { preset: 'hat', gain: 0.55, pan: 0.2 },
      ohat: { preset: 'hat', gain: 0.28, decay: 0.2, hp: 7000, pan: -0.15 },
      bass: { preset: 'sawbass', gain: 0.4, base: 28, duck: 0.55, cutoff: 900, q: 10 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.62, rev: 0.22, delay: 0.2, cutHi: 6000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 71, rev: 0.4, duck: 0.4 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 . 8 . . 8 . 1 . . 8 . 1 . 8 5',
      pad: held('x', 16),
      hookA: 'Eb5 . Eb5 Gb5 . Eb5 . Db5 Eb5 - . Bb4 . Ab4 Bb4 .',
      hookB: 'Db5 . Db5 Fb5 . Db5 . Cb5 Db5 - . Ab4 . Fb4 Ab4 .',
      hookC: 'Db5 . Db5 Fb5 . Db5 . Cb5 Ab5 - - - Db6 - - -',
    },
    sections: form('std', {
      intro: { filter: [500, 3500], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
    }),
  });

  /* ---------------------------------------------------------
   * 28. ネオンチューブ・ラン（シンセウェイヴ×ドラムンベース 170）
   * --------------------------------------------------------- */
  reg({
    id: 's28',
    no: 28,
    title: 'ネオンチューブ・ラン',
    genre: 'シンセウェイヴ×ドラムンベース',
    bpm: 170,
    key: 'B',
    mode: 'minor',
    form: 'long',
    prog: ['i', 'bVI', 'bVIIsus4', 'v'], // Bm→G→Asus4→F#m
    chordLen: 2,
    unlock: { type: 'songClear', song: 's17' },
    memo: [
      '【雰囲気】ネオン管が続くトンネルを走り抜ける。80年代風の音色を速いブレイクビーツに乗せる。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8',
      '【コード】一m→♭六→♭七sus4→五m（Bm→G→Asus4→F#m）を2小節ずつ。',
      '【主旋律の動機】2小節。D（1拍）-F#-E-D-B-A-B ／ D（1拍）-F#-E-D。軸の音は D。',
      '　ドロップは A A A B A A A C。CでA5（最高音）。',
      '【パート】ドラムンベースのビート、8分で刻むのこぎり波ベース、80年代風のスーパーソウ、パッド、残響の大きいスネア。',
      '【決め所】25・65小節目の1拍目、各8小節目のA5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 1.1, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.45, decay: 0.22 },
      hat: { preset: 'hat', gain: 0.35, pan: 0.25 },
      bass: { preset: 'sawbass', gain: 0.38, base: 28, duck: 0.4, cutoff: 750 },
      lead: { preset: 'supersaw', gain: 0.42, detune: 12, cutoff: 4200, rev: 0.35, delay: 0.25, duck: 0.2 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 71, rev: 0.45, duck: 0.3 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.22, base: 66, pan: -0.25, rev: 0.3, delay: 0.3, cutHi: 3000 },
    },
    patterns: {
      k: D.dnbK,
      s: D.dnbS,
      h8: D.h8,
      h16: D.h16,
      bass: '1 . 1 . 1 . 1 . 8 . 1 . 1 . 1 . | 1 . 1 . 5 . 1 . 8 . 1 . 5 . 1 .',
      bassLong: held('1', 32),
      pad: held('x', 32),
      arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 1 3 2',
      hookA: 'D5 - - - F#5 . E5 . D5 . B4 . A4 . B4 . | D5 - - - . . . . F#5 . E5 . D5 . . .',
      hookB: 'C#5 - - - E5 . D5 . C#5 . A4 . F#4 . A4 . | C#5 - - - . . . . E5 . C#5 . A4 . . .',
      hookC: 'C#5 - - - E5 . D5 . C#5 . A4 . F#4 . A4 . | C#5 - - - . . . . F#5 - - - A5 - - -',
    },
    sections: form('long', {
      intro: { filter: [400, 4500], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h8', bass: 'bass', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp', hat: 'h8' } },
      build2: { parts: { pad: 'pad', arp: 'arp', bass: 'bassLong' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h16', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 29. ナイトマーケット・トロピカル（ムーンバートン×トラップ 110）
   * --------------------------------------------------------- */
  reg({
    id: 's29',
    no: 29,
    title: 'ナイトマーケット・トロピカル',
    genre: 'ムーンバートン×トラップ',
    bpm: 110,
    key: 'C',
    mode: 'major',
    form: 'mid',
    prog: ['I', 'IV', 'vi', 'V'], // C→F→Am→G（一→四→六→五）
    chordLen: 1,
    unlock: { type: 'charPlays', char: 'pyonta', n: 3 },
    memo: [
      '【雰囲気】南国の夜市。デンボウのリズムにトラップの細かいハイハットと808を混ぜる。',
      '【構成（中くらい）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド4（41〜44）→ドロップ2 16（45〜60）→アウトロ4',
      '【コード】一→四→六m→五（C→F→Am→G）。',
      '【主旋律の動機】1小節。マリンバ風のFM音で C（長め）-E-G-E-C-D-E。軸の音は C（C・F・Am に共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでB5（最高音）。',
      '【パート】デンボウのキックとスネア、8分＋32分・3連のハイハット、808ベース（デンボウに合わせる）、マリンバ風の主旋律、裏拍の和音。',
      '【決め所】17・45小節目の1拍目、各4小節目のG5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 0.9 },
      snare: { preset: 'snare', gain: 0.85, rev: 0.2 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.25, decay: 0.035 },
      bass: { preset: 'b808', gain: 0.2, base: 31, duck: 0.2 },
      lead: { preset: 'bell', type: 'melody', gain: 0.6, rev: 0.3, delay: 0.2, ratio: 4, index: 1.2, decay: 0.5 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.26, low: 57, high: 72, rev: 0.25, duck: 0.35, cutHi: 3000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.4 },
    },
    patterns: {
      dk: D.dembK,
      ds: D.dembS,
      h8: D.h8,
      roll32: { s: R('x', 32), div: 8 },
      trip: { s: R('x', 24), div: 6 },
      bass: '1 - - 1 - - 8 - 1 - - 1 - - 5 -',
      stab: '. . x . . . x . . . x . . . x .',
      pad: held('x', 16),
      hookA: 'C5 - . E5 . G5 . E5 C5 . . D5 . E5 . .',
      hookB: 'B4 - . D5 . G5 . D5 B4 . . C5 . D5 . .',
      hookC: 'B4 - . D5 . G5 . D5 B5 - - - G5 - - -',
    },
    sections: form('mid', {
      intro: { filter: [500, 3500], parts: { pad: 'pad', stab: 'stab', hat: 'h8' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'dk', snare: 'ds', hat: ['h8', 'h8', 'h8', 'roll32', 'h8', 'h8', 'h8', 'trip'], bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab' } },
      build2: { parts: { pad: 'pad', hat: 'h8' } },
      drop2: { parts: (b) => ({ kick: 'dk', snare: 'ds', hat: ['h8', 'trip', 'h8', 'roll32'], bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', stab: 'stab', kick: 'dk' } },
    }),
  });

  /* ---------------------------------------------------------
   * 30. ハナビ・フェスティバル（ビッグルーム×ハードスタイル 150）
   * --------------------------------------------------------- */
  reg({
    id: 's30',
    no: 30,
    title: 'ハナビ・フェスティバル',
    genre: 'ビッグルーム×ハードスタイル',
    bpm: 150,
    key: 'G',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVI', 'iv', 'V'], // Gm→E♭→Cm→D
    chordLen: 1,
    unlock: { type: 'clears', n: 15 },
    memo: [
      '【雰囲気】川辺の花火大会のクライマックス。ビッグルームの歓声から、ハードスタイルの歪みへ。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32：ビッグルーム）→ブレイク8→ビルド8→ドロップ2 16（49〜64：ハードスタイル）→アウトロ8',
      '【コード】一m→♭六→四m→五（Gm→E♭→Cm→D）。五を長三和音にして強く戻る。',
      '【主旋律の動機】1小節。G-G（タタ）-D-G-B♭-A-G の短い音。軸の音は G（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでD6（最高音）。',
      '【パート】ドロップ1：4つ打ち、クラップ、のこぎり波ベース、太いスーパーソウ。ドロップ2：歪んだキックを重ね、裏拍のベース（ハードスタイル風）。',
      '【決め所】17・49小節目の1拍目、各4小節目のA5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0 },
      hkick: { preset: 'hardkick', type: 'drum', gain: 0.6 },
      clap: { preset: 'clap', gain: 0.9, rev: 0.25 },
      snare: { preset: 'snare', gain: 0.8 },
      ohat: { preset: 'hat', gain: 0.28, decay: 0.2, hp: 7000, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.38, base: 31, duck: 0.6, cutoff: 700 },
      bass2: { preset: 'sawbass', type: 'bass', gain: 0.34, base: 31, duck: 0.65, cutoff: 1300 },
      lead: { preset: 'supersaw', gain: 0.46, detune: 32, cutoff: 8500, rev: 0.3, delay: 0.12, duck: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.4, duck: 0.4 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 . 1 . . . 1 . . . 1 . . . 1 .',
      bass2: '1 . 1 1 . . 1 1 . . 1 1 . . 1 1',
      pad: held('x', 16),
      hookA: 'G5 . . G5 . . D5 . G5 . Bb5 . A5 . G5 .',
      hookB: 'F#5 . . F#5 . . D5 . F#5 . A5 . G5 . F#5 .',
      hookC: 'F#5 . . F#5 . . D5 . A5 - - - D6 - - -',
    },
    sections: form('std', {
      intro: { filter: [500, 3500], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'k4', hkick: 'k4', clap: 'clap', ohat: 'hOff', bass2: 'bass2', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', pad: 'pad' } },
    }),
  });
})();
