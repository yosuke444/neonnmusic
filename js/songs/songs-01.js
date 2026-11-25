/* =========================================================
 * songs/songs-01.js … 1〜10曲目（最初から解禁される10曲）
 * 全体計画：docs/song-plan.md。書き方：js/music.js の先頭の説明。
 * チップチューン以外の曲では、矩形波を主旋律・ベースに使わない。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;
  const L = NLM.SongLib;
  const { R, held, dropSeq, teaseSeq, form, D } = L;
  const reg = (o) => NLM.Songs.register(Object.assign({ leadPart: 'lead', unlock: null }, o));

  /* ---------------------------------------------------------
   * 1. ミッドナイト・コーストライン（シンセウェイヴ 100）
   * --------------------------------------------------------- */
  reg({
    id: 's01',
    no: 1,
    title: 'ミッドナイト・コーストライン',
    genre: 'シンセウェイヴ',
    bpm: 100,
    key: 'A',
    mode: 'minor',
    form: 'short',
    prog: ['i', 'bVI', 'bIII', 'bVII'], // Am→F→C→G（C長調から見ると 六→四→一→五）
    chordLen: 1,
    memo: [
      '【雰囲気】夜の海岸線をオープンカーで走る。80年代風のやわらかいシンセと、残響の大きいスネア。',
      '【構成（短い形）】イントロ8（1〜8）→ビルド4（9〜12）→ドロップ16（13〜28）→ブレイク8（29〜36）→ビルド4（37〜40）→ドロップ2 8（41〜48）→アウトロ4（49〜52）',
      '【コード】一m→♭六→♭三→♭七（Am→F→C→G）を1小節ずつ。',
      '【主旋律の動機】1小節。C（長め）-E-D-C-C-A-G-A。軸の音は C（Am・F・C の3つに共通）。',
      '　ドロップは A A A B を3回＋A A A C。CでG5まで上がり、最高音は各ドロップで1回。',
      '【パート】ドロップ：4つ打ちのキック、残響の大きいスネア（2・4拍）、8分のハイハット、8分で刻むのこぎり波ベース、スーパーソウ（少しずらしの少ない80年代風）、パッド、16分のアルペジオ。',
      '【決め所】13・41小節目の1拍目、各4小節目の B（伸ばし）。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9 },
      snare: { preset: 'snare', gain: 0.95, rev: 0.55, decay: 0.26 },
      hat: { preset: 'hat', gain: 0.4, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.42, base: 28, duck: 0.4, cutoff: 700 },
      lead: { preset: 'supersaw', gain: 0.4, detune: 12, cutoff: 3800, rev: 0.32, delay: 0.25, duck: 0.2 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 57, high: 72, rev: 0.4, duck: 0.3 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.24, base: 69, pan: -0.25, rev: 0.3, delay: 0.3, cutHi: 3000 },
    },
    patterns: {
      k4: D.k4,
      s24: D.s24,
      h8: D.h8,
      hOff: D.hOff,
      bass: '1 . 1 . 1 . 8 . 1 . 1 . 1 . 8 .',
      bassLong: held('1', 16),
      pad: held('x', 16),
      arp: '0 1 2 1 3 2 1 2 0 1 2 1 3 2 1 2',
      hookA: 'C5 - - . E5 - D5 C5 C5 - A4 . G4 - A4 -',
      hookB: 'B4 - - . D5 - C5 B4 B4 - G4 . D5 - - -',
      hookC: 'B4 - - . D5 - C5 B4 B4 - D5 . G5 - - -',
    },
    sections: form('short', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', arp: 'arp', hat: 'hOff' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', snare: 's24', hat: 'h8', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp', bass: 'bassLong', hat: 'hOff' } },
      build2: { parts: { pad: 'pad', arp: 'arp', kick: 'k4' } },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 2. ヤタイ・フエゴ（ムーンバートン 108）
   * --------------------------------------------------------- */
  reg({
    id: 's02',
    no: 2,
    title: 'ヤタイ・フエゴ',
    genre: 'ムーンバートン',
    bpm: 108,
    key: 'F#',
    mode: 'minor',
    form: 'mid',
    prog: ['i', 'iv', 'bVIIadd9', 'bIII'], // F#m→Bm→Eadd9→A（A長調から見ると 六→二→五→一）
    chordLen: 2,
    memo: [
      '【雰囲気】屋台街の熱気。レゲトン系の「ドン・チキ・ドン・チキ」のリズム（デンボウ）で腰を揺らす。',
      '【構成（中くらい）】イントロ8（1〜8）→ビルド8（9〜16）→ドロップ16（17〜32）→ブレイク8（33〜40）→ビルド4（41〜44）→ドロップ2 16（45〜60）→アウトロ4（61〜64）',
      '【コード】一m→四m→♭七add9→♭三（F#m→Bm→Eadd9→A）を2小節ずつ。',
      '【主旋律の動機】2小節。F#（長め）-C#-E-F#-E-C#-B-C# ／ A-B-C#。軸の音は F#（Eにadd9を付けて3つのコードに共通にした）。',
      '　ドロップは A A A B A A A C（1つが2小節）。BとCは A のコードの上。Cの最後でA5（最高音）。',
      '【パート】ドロップ：4つ打ちのキック＋デンボウのスネア、シェイカー、のこぎり波ベース（デンボウに合わせる）、プラックの主旋律、裏拍の和音。',
      '【決め所】17・45小節目の1拍目、各8小節目のA5への伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 0.9 },
      snare: { preset: 'snare', gain: 0.8, rev: 0.2 },
      shaker: { preset: 'shaker', gain: 0.45, pan: -0.25 },
      tom: { preset: 'tom', gain: 0.5, freq: 260, pan: 0.3 },
      bass: { preset: 'sawbass', gain: 0.42, base: 30, duck: 0.45, cutoff: 500 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.75, rev: 0.25, delay: 0.2, cutHi: 5200, release: 0.25 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.26, low: 57, high: 72, rev: 0.25, duck: 0.4, cutHi: 3000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 70, rev: 0.4 },
    },
    patterns: {
      dk: D.dembK,
      ds: D.dembS,
      shk: '. x . x . x . x . x . x . x . x',
      tom: '. . . . . . . . . . . . . . x x',
      bass: '1 . . 1 . . 8 . 1 . . 1 . . 5 . | 1 . . 1 . . 8 . 1 . . 1 . 5 8 .',
      bassLong: held('1', 32),
      stab: 'x . . x . . x . . . x . . x . .',
      pad: held('x', 32),
      hookA: 'F#5 - - . C#5 . E5 - F#5 . E5 C#5 . B4 C#5 - | . . A4 . B4 . C#5 - - - . . . . . .',
      hookB: 'E5 - - . C#5 . E5 - C#5 . E5 C#5 . B4 C#5 - | . . A4 . C#5 . E5 - - - . . . . . .',
      hookC: 'E5 - - . C#5 . E5 - C#5 . E5 C#5 . B4 C#5 - | . . C#5 . E5 . A5 - - - - - - - . .',
    },
    sections: form('mid', {
      intro: { filter: [500, 3000], parts: { pad: 'pad', shaker: 'shk', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', shaker: 'shk', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'dk', snare: 'ds', shaker: 'shk', tom: 'tom', bass: 'bass', stab: 'stab', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', shaker: 'shk', bass: 'bassLong' } },
      outro: { filter: [8000, 600], parts: { pad: 'pad', shaker: 'shk', kick: 'dk' } },
    }),
  });

  /* ---------------------------------------------------------
   * 3. クロスロード・ルミナス（ビッグルーム 128）
   * --------------------------------------------------------- */
  reg({
    id: 's03',
    no: 3,
    title: 'クロスロード・ルミナス',
    genre: 'ビッグルーム',
    bpm: 128,
    key: 'F',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVIIsus2', 'bVI', 'bVII'], // Fm→E♭sus2→D♭→E♭（同主長調から借りた ♭七・♭六）
    chordLen: 1,
    memo: [
      '【雰囲気】スクランブル交差点に集まった人の大歓声。太いリードと大きな4つ打ち。',
      '【構成（基本形）】イントロ8（1〜8）→ビルド8（9〜16）→ドロップ16（17〜32）→ブレイク8（33〜40）→ビルド8（41〜48）→ドロップ2 16（49〜64）→アウトロ8（65〜72）',
      '【コード】一m→♭七sus2→♭六→♭七（Fm→E♭sus2→D♭→E♭）。♭七と♭六で劇的に。',
      '【主旋律の動機】1小節。F-F-F（タタタ）-C（伸ばし）-C-A♭。短い音で刻む決め打ちの動機。軸の音は F。',
      '　ドロップは A A A B ×3＋A A A C。CでB♭5（最高音）まで跳ね上がる。',
      '【パート】ドロップ：4つ打ち、2・4拍のクラップ、裏拍のオープンハット、のこぎり波ベース、スーパーソウ（太く広く）＋プラックの重ね。',
      '【決め所】17・49小節目の1拍目、各4小節目のE♭の連打。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0 },
      clap: { preset: 'clap', gain: 0.9, rev: 0.25 },
      snare: { preset: 'snare', gain: 0.7 },
      hat: { preset: 'hat', gain: 0.68, pan: 0.2 },
      ohat: { preset: 'hat', gain: 0.26, decay: 0.22, hp: 7000, pan: -0.15 },
      bass: { preset: 'sawbass', gain: 0.4, base: 29, duck: 0.6, cutoff: 600 },
      lead: { preset: 'supersaw', gain: 0.44, detune: 26, cutoff: 7000, rev: 0.3, delay: 0.12, duck: 0.3 },
      pluck: { preset: 'pluck', type: 'melody', gain: 0.32, rev: 0.2, cutHi: 6000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 53, high: 70, rev: 0.4, duck: 0.4 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 . 1 . . . 1 . . . 1 . . . 1 .',
      pad: held('x', 16),
      hookA: 'F5 . . F5 . . F5 . C5 - . C5 . Ab4 . .',
      hookB: 'Eb5 . . Eb5 . . Eb5 . Bb4 - . Bb4 . G4 . .',
      hookC: 'Eb5 . . Eb5 . . Eb5 . Bb4 - . Bb5 - - - .',
    },
    sections: form('std', {
      intro: { filter: [500, 3500], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', pluck: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: {
        parts: (b) => {
          const s = dropSeq(b, 1, 'hookA', 'hookB', 'hookC');
          return { kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', lead: s, pluck: s };
        },
      },
      brk: { parts: (b) => ({ pad: 'pad', pluck: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      outro: { filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
    }),
  });

  /* ---------------------------------------------------------
   * 4. アフターレイン・ステップ（UKガラージ 132）
   * --------------------------------------------------------- */
  reg({
    id: 's04',
    no: 4,
    title: 'アフターレイン・ステップ',
    genre: 'UKガラージ',
    bpm: 132,
    key: 'Eb',
    mode: 'major',
    form: 'std',
    swing: 0.16,
    prog: ['ii7', 'V7sus4', 'Imaj7', 'vi7'], // Fm7→B♭7sus4→E♭maj7→Cm7（二→五→一→六）
    chordLen: 1,
    memo: [
      '【雰囲気】雨上がりのクラブ帰り。跳ねたハイハット（スウィング）と抜けたキックの2ステップ。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】二m7→五7sus4→一maj7→六m7（Fm7→B♭7sus4→E♭maj7→Cm7）。7thで大人っぽく。',
      '【主旋律の動機】1小節。声っぽい音で E♭-B♭-C-E♭-F-E♭-C。軸の音は E♭（4つのコードすべてに含まれる）。',
      '　ドロップは A A A B ×3＋A A A C。CでB♭5（最高音）。',
      '【パート】2ステップのキック（1拍目と3拍目の裏）、2・4拍のスネア、スウィングした16分のハイハット、低いのこぎり波ベース、オルガン風の和音の刻み、声っぽいリード。',
      '【決め所】17・49小節目の1拍目、各4小節目のG→E♭。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.05 },
      snare: { preset: 'snare', gain: 1.2, rev: 0.2 },
      hat: { preset: 'hat', gain: 0.42, pan: 0.2 },
      shaker: { preset: 'shaker', gain: 0.35, pan: -0.3 },
      bass: { preset: 'sawbass', gain: 0.42, base: 27, duck: 0.45, cutoff: 420 },
      lead: { preset: 'vox', gain: 0.52, rev: 0.3, delay: 0.25, duck: 0.15 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.3, low: 58, high: 74, rev: 0.25, duck: 0.4, cutHi: 2600, fdecay: 0.12 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.4 },
    },
    patterns: {
      k: D.ukgK,
      s: D.s24,
      h: D.ukgH,
      shk: '. x . x . x . x . x . x . x . x',
      bass: '1 . . 1 . . . . . . 5 . . 1 . .',
      stab: '. . x . . x . . . . x . . x . .',
      pad: held('x', 16),
      hookA: 'Eb5 - . Bb4 . C5 . Eb5 . . F5 - Eb5 . C5 .',
      hookB: 'Eb5 - . Bb4 . C5 . Eb5 . . G5 - Eb5 . C5 .',
      hookC: 'Eb5 - . Bb4 . C5 . Eb5 . . G5 - Bb5 - - .',
    },
    sections: form('std', {
      intro: { filter: [700, 4000], parts: { pad: 'pad', hat: 'h', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', hat: 'h', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', hat: 'h' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', shaker: 'shk', bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', hat: 'h', kick: 'k' } },
    }),
  });

  /* ---------------------------------------------------------
   * 5. ドーン・ハイウェイ（トランス 138）
   * --------------------------------------------------------- */
  reg({
    id: 's05',
    no: 5,
    title: 'ドーン・ハイウェイ',
    genre: 'トランス',
    bpm: 138,
    key: 'B',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'v', 'bVImaj7', 'bVII'], // Bm→F#m→Gmaj7→A
    chordLen: 1,
    memo: [
      '【雰囲気】夜明け前の高架道路を加速していく高揚感。長いビルドと転がるベース。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→五m→♭六maj7→♭七（Bm→F#m→Gmaj7→A）。',
      '【主旋律の動機】1小節の16分の刻み。F#-F#-D-B-F#-E-D-C#-D。軸の音は F#（Gにmaj7を付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。Cの3拍目からA5（最高音）を伸ばす。',
      '【パート】4つ打ち、クラップ、裏拍のオープンハット、16分で転がるのこぎり波ベース（裏から）、広いスーパーソウ、16分のアルペジオ、パッド。',
      '【決め所】17・49小節目の1拍目、各16小節目のA5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.75, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.3, decay: 0.2, hp: 7000, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.64, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.36, base: 28, duck: 0.55, cutoff: 850 },
      lead: { preset: 'supersaw', gain: 0.4, detune: 30, cutoff: 8000, rev: 0.35, delay: 0.25, duck: 0.25 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.24, base: 71, pan: 0.25, rev: 0.3, delay: 0.3, cutHi: 4000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 54, high: 71, rev: 0.45, duck: 0.35 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 1 1 1 . 1 1 1 . 1 1 1 . 1 1 1',
      pad: held('x', 16),
      arp: '0 1 2 1 0 1 2 3 0 1 2 1 0 1 3 2',
      hookA: 'F#5 . F#5 D5 . B4 F#5 . E5 . D5 . C#5 . D5 .',
      hookB: 'E5 . E5 C#5 . A4 E5 . F#5 . E5 . C#5 . A4 .',
      hookC: 'E5 . E5 C#5 . A4 E5 . A5 - - - - - - .',
    },
    sections: form('std', {
      intro: { filter: [400, 5000], parts: { kick: 'k4', ohat: 'hOff', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp' } },
      build2: { parts: { pad: 'pad', arp: 'arp', bass: 'bass' } },
      outro: { filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 6. サブウェイ・クエイク（ダブステップ 140）
   * --------------------------------------------------------- */
  reg({
    id: 's06',
    no: 6,
    title: 'サブウェイ・クエイク',
    genre: 'ダブステップ',
    bpm: 140,
    key: 'E',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVI', 'iv', 'v'], // Em→C→Am→Bm
    chordLen: 2,
    memo: [
      '【雰囲気】深夜の地下鉄が通過する振動。半分の速さに聞こえる重いビートと、うなるベース。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭六→四m→五m（Em→C→Am→Bm）を2小節ずつ。',
      '【主旋律の動機】2小節。FMベルで E-G-E-B-D ／ E（伸ばし）。間（ま）を大きく取る。軸の音は E。',
      '　ドロップは A A A B A A A C。CでB5（最高音）を伸ばす。',
      '【パート】ドロップ：キック1拍目、スネア3拍目（半分の速さ）、ワブルベース（1拍に1回うなる）、サブベース。ドロップ2はワブルが1拍に2回（変化）。',
      '【決め所】17・49小節目の1拍目、スネアの3拍目、各8小節目のB5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0, tune: 0.95 },
      snare: { preset: 'snare', gain: 1.6, rev: 0.25, decay: 0.22 },
      hat: { preset: 'hat', gain: 0.34, pan: 0.2 },
      bass: { preset: 'wobble', gain: 0.42, base: 28, cutoff: 250, depth: 1600, wob: 1, duck: 0.3 },
      bass2: { preset: 'wobble', type: 'bass', gain: 0.42, base: 28, cutoff: 280, depth: 2000, wob: 2, duck: 0.3 },
      sub: { preset: 'sub', type: 'bass', gain: 0.23, base: 28, duck: 0.4 },
      lead: { preset: 'bell', type: 'melody', gain: 0.56, rev: 0.4, delay: 0.3, decay: 1.4 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 52, high: 69, rev: 0.45 },
    },
    patterns: {
      k: 'x . . . . . . . . . x . . . . .',
      s: D.halfS,
      h: D.hOff,
      wob: '1 - - - - - - - 1 - - . 8 - . . | 1 - - - 5 - - - 1 - . 1 - . . .',
      sub: held('1', 16),
      pad: held('x', 32),
      hookA: 'E5 . . . G5 . . E5 . . B4 . . . D5 . | E5 - - - . . . . . . . . . . . .',
      hookB: 'D5 . . . F#5 . . D5 . . B4 . . . A4 . | B4 - - - . . . . . . . . . . . .',
      hookC: 'D5 . . . F#5 . . D5 . . B4 . . . A4 . | F#5 - - - . . . . B5 - - - - - - -',
    },
    sections: form('std', {
      intro: { filter: [400, 3000], parts: { pad: 'pad', hat: 'h' } },
      build: { parts: (b) => ({ pad: 'pad', sub: 'sub', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'wob', sub: 'sub', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', sub: 'sub' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass2: 'wob', sub: 'sub', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 400], parts: { pad: 'pad', hat: 'h', kick: 'k' } },
    }),
  });

  /* ---------------------------------------------------------
   * 7. ネオンブロッサム（フューチャーベース 150）
   * --------------------------------------------------------- */
  reg({
    id: 's07',
    no: 7,
    title: 'ネオンブロッサム',
    genre: 'フューチャーベース',
    bpm: 150,
    key: 'C',
    mode: 'major',
    form: 'std',
    prog: ['IVmaj7', 'V6', 'iii7', 'vi7'], // Fmaj7→G6→Em7→Am7（四→五→三→六）
    chordLen: 1,
    memo: [
      '【雰囲気】ネオン管の花が一斉に咲く。和音をスーパーソウで刻み、声を切り刻んだようなリード。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】四maj7→五6→三m7→六m7（Fmaj7→G6→Em7→Am7）。',
      '【主旋律の動機】1小節。E（伸ばし）-G-E-D-C-E-D。軸の音は E（Gに6thを付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。Cの最後でC6（最高音）。',
      '【パート】ドロップ：半分の速さのビート（キック・3拍目スネア）、スーパーソウの和音の刻み（キックで大きく沈む）、サブベース、声っぽいリード、ベルのアルペジオ。',
      '【決め所】17・49小節目の1拍目、和音の刻みの頭、各4小節目のA5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      snare: { preset: 'snare', gain: 1.6, rev: 0.3 },
      clap: { preset: 'clap', gain: 0.6, rev: 0.3 },
      hat: { preset: 'hat', gain: 0.36, pan: 0.2 },
      bass: { preset: 'sub', type: 'bass', gain: 0.22, base: 36, duck: 0.4 },
      stab: { preset: 'supersaw', type: 'chord', gain: 0.34, low: 60, high: 77, rev: 0.3, duck: 0.65, env: [0.003, 0.2, 0.4, 0.1], cutoff: 6000 },
      lead: { preset: 'vox', gain: 0.55, rev: 0.32, delay: 0.25, duck: 0.15 },
      arp: { preset: 'bell', type: 'arp', gain: 0.26, base: 72, pan: 0.3, rev: 0.35, delay: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 55, high: 72, rev: 0.45 },
    },
    patterns: {
      k: D.halfK,
      s: D.halfS,
      h: 'x . x . x . x . x . x x x . x .',
      bass: '1 - - - - - - - - - 5 - - - - -',
      stab: 'x . . x . . x . . x . . x . x .',
      pad: held('x', 16),
      arp: '0 . 2 . 1 . 3 . 2 . 1 . 3 . 2 .',
      hookA: 'E5 - . G5 . E5 D5 . C5 . . E5 - . D5 .',
      hookB: 'E5 - . G5 . E5 D5 . C5 . . A5 - . G5 .',
      hookC: 'E5 - . G5 . E5 D5 . C5 . . A5 - . C6 -',
    },
    sections: form('std', {
      intro: { filter: [600, 4500], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp', bass: 'bass' } },
      build2: { parts: { pad: 'pad', arp: 'arp' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', clap: 's', hat: 'h', bass: 'bass', stab: 'stab', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 8. ファクトリー・ブレイズ（ハードスタイル 155）
   * --------------------------------------------------------- */
  reg({
    id: 's08',
    no: 8,
    title: 'ファクトリー・ブレイズ',
    genre: 'ハードスタイル',
    bpm: 155,
    key: 'C#',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVIIsus4', 'bVI', 'v'], // C#m→Bsus4→A→G#m
    chordLen: 1,
    memo: [
      '【雰囲気】工場夜景の炎。歪んだキックと全力のリードで押し切る。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭七sus4→♭六→五m（C#m→Bsus4→A→G#m）。',
      '【主旋律の動機】1小節の8分の刻み。E-E-C#-E-G#-F#-E-C#。軸の音は E（Bにsus4を付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでB5（最高音）。',
      '【パート】ドロップ：歪んだ4つ打ちキック、クラップ、裏で鳴るのこぎり波ベース（リバースベース風）、太いスーパーソウ。',
      '【決め所】17・49小節目の1拍目、各4小節目のG#5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'hardkick', gain: 0.9 },
      clap: { preset: 'clap', gain: 0.8, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.8 },
      hat: { preset: 'hat', gain: 0.36, pan: 0.2 },
      ohat: { preset: 'hat', gain: 0.28, decay: 0.2, hp: 7000, pan: -0.15 },
      bass: { preset: 'sawbass', gain: 0.36, base: 30, duck: 0.65, cutoff: 1200 },
      lead: { preset: 'supersaw', gain: 0.55, detune: 35, cutoff: 9000, rev: 0.32, delay: 0.1, duck: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 54, high: 71, rev: 0.45 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h8: D.h8,
      bass: '1 . 1 1 . . 1 1 . . 1 1 . . 1 1',
      pad: held('x', 16),
      hookA: 'E5 . E5 . C#5 . E5 . G#5 . F#5 . E5 . C#5 .',
      hookB: 'D#5 . D#5 . B4 . D#5 . G#5 . F#5 . D#5 . B4 .',
      hookC: 'D#5 . D#5 . B4 . D#5 . G#5 - - - B5 - - -',
    },
    sections: form('std', {
      intro: { filter: [500, 4000], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h8', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', pad: 'pad' } },
    }),
  });

  /* ---------------------------------------------------------
   * 9. シュトコウ・チェイス（ニューロファンク 174）
   * --------------------------------------------------------- */
  reg({
    id: 's09',
    no: 9,
    title: 'シュトコウ・チェイス',
    genre: 'ニューロファンク',
    bpm: 174,
    key: 'Bb',
    mode: 'minor',
    form: 'long',
    prog: ['i', 'iv', 'i', 'bVI'], // B♭m→E♭m→B♭m→G♭
    chordLen: 2,
    memo: [
      '【雰囲気】首都高のカーチェイス。速いブレイクビーツと、うねるリースベース。',
      '【構成（長い形）】イントロ16（1〜16）→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16（41〜56）→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8（81〜88）',
      '【コード】一m→四m→一m→♭六（B♭m→E♭m→B♭m→G♭）を2小節ずつ。',
      '【主旋律の動機】2小節。B♭（長め）-D♭-B♭-F-E♭ ／ D♭-B♭（伸ばし）。軸の音は B♭（4つのコードすべてに含まれる）。',
      '　ドロップは A A A B A A A C。CでB♭5（最高音）。',
      '【パート】ドロップ：2ステップのドラム（キック1・2.5拍目、スネア2・4拍目）、リースベース（うなり）、プラックの主旋律。ドロップ2はハイハット16分、ベースが動く。',
      '【決め所】25・65小節目の1拍目、スネアの2・4拍目。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 1.1, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.15, decay: 0.2 },
      hat: { preset: 'hat', gain: 0.32, pan: 0.25 },
      bass: { preset: 'reese', gain: 0.3, base: 28, duck: 0.4, cutoff: 900, lfo: 0.6 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.63, rev: 0.25, delay: 0.3, cutHi: 4500, release: 0.25 },
      pad: { preset: 'pad', type: 'chord', gain: 0.42, low: 53, high: 70, rev: 0.45, duck: 0.3 },
    },
    patterns: {
      k: D.dnbK,
      s: D.dnbS,
      k2: 'x . . . . . . . . . x . . x . . | x . . . . . . x . . x . . . . .',
      s2: '. . . . X . . o . o . . X . . o | . . . . X . . o . . . o X . o .',
      h8: D.h8,
      h16: D.h16,
      bass: `1 ${R('-', 9)} 1 ${R('-', 5)} | 1 ${R('-', 7)} 5 - - - 8 - - -`,
      bass2: '1 - - - - - 1 - . . 8 - - - 1 - | . . 1 - - - 5 - - - 8 - 7 - 5 -',
      bassLong: held('1', 32),
      pad: held('x', 32),
      hookA: 'Bb4 - - . Db5 . . Bb4 . . F5 . . . Eb5 . | Db5 . . . Bb4 - - - . . . . . . . .',
      hookB: 'Bb4 - - . Db5 . . Bb4 . . Gb5 . . . F5 . | Db5 . . . Bb4 - - - . . . . . . . .',
      hookC: 'Bb4 - - . Db5 . . Bb4 . . Gb5 . . . F5 . | Db5 . . . Gb5 - - - Bb5 - - - - - - -',
    },
    sections: form('long', {
      intro: { filter: [400, 5000], parts: { pad: 'pad', hat: 'h8' } },
      build: { parts: (b) => ({ pad: 'pad', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h8', bass: 'bass', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', hat: 'h8', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', bass: 'bassLong' } },
      drop2: { parts: (b) => ({ kick: 'k2', snare: 's2', hat: 'h16', bass: 'bass2', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 500], parts: { pad: 'pad', hat: 'h8' } },
    }),
  });

  /* ---------------------------------------------------------
   * 10. シティライト・ディスコ（フューチャーファンク×ハウス 118）
   * --------------------------------------------------------- */
  reg({
    id: 's10',
    no: 10,
    title: 'シティライト・ディスコ',
    genre: 'フューチャーファンク×ハウス',
    bpm: 118,
    key: 'E',
    mode: 'major',
    form: 'std',
    prog: ['IVmaj7', 'iii7', 'vi7', 'V7sus4'], // Amaj7→G#m7→C#m7→B7sus4
    chordLen: 1,
    memo: [
      '【雰囲気】80年代の夢の街。ディスコのオクターブベースと、声を切り貼りしたようなリード。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】四maj7→三m7→六m7→五7sus4（Amaj7→G#m7→C#m7→B7sus4）。',
      '【主旋律の動機】1小節。G#（長め）-E-F#-G#-B-G#-E-F#。軸の音は G#（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでE6（最高音）。',
      '【パート】ドロップ：4つ打ち、クラップ、裏拍のオープンハット、シェイカー、オクターブで跳ねるのこぎり波ベース、フィルターをかけた裏拍の和音、声っぽいリード、ストリングス風のパッド。',
      '【決め所】17・49小節目の1拍目、各4小節目のB5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.85, rev: 0.25 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.3, decay: 0.22, hp: 7000, pan: -0.15 },
      shaker: { preset: 'shaker', gain: 0.38, pan: 0.3 },
      bass: { preset: 'sawbass', gain: 0.4, base: 28, duck: 0.5, cutoff: 900 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.3, low: 59, high: 76, rev: 0.25, duck: 0.45, cutHi: 3000, fdecay: 0.1 },
      lead: { preset: 'vox', gain: 0.52, rev: 0.3, delay: 0.25, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 56, high: 74, rev: 0.4, attack: 0.15, duck: 0.3 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      shk: D.h16,
      bass: '1 . 8 . 1 . 8 . 1 . 8 . 1 . 8 .',
      stab: '. . x . . . x . . . x . . . x .',
      pad: held('x', 16),
      hookA: 'G#5 - . E5 . F#5 G#5 . B5 . G#5 - . E5 F#5 .',
      hookB: 'F#5 - . E5 . F#5 A5 . B5 . A5 - . F#5 E5 .',
      hookC: 'F#5 - . E5 . F#5 A5 . B5 - - - E6 - - .',
    },
    sections: form('std', {
      intro: { filter: [500, 3500], parts: { kick: 'k4', ohat: 'hOff', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', shaker: 'shk', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', stab: 'stab' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', shaker: 'shk', bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { kick: 'k4', ohat: 'hOff', stab: 'stab' } },
    }),
  });
})();
