/* =========================================================
 * songs/songs-05.js … 41〜50曲目
 * 全体計画：docs/song-plan.md。チップチューン以外の曲では、矩形波を主旋律・ベースに使わない。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;
  const { R, held, dropSeq, teaseSeq, form, D } = NLM.SongLib;
  const reg = (o) => NLM.Songs.register(Object.assign({ leadPart: 'lead' }, o));

  /* ---------------------------------------------------------
   * 41. フォレスト・レイブ（サイトランス 142）
   * --------------------------------------------------------- */
  reg({
    id: 's41',
    no: 41,
    title: 'フォレスト・レイブ',
    genre: 'サイトランス',
    bpm: 142,
    key: 'G#',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVIIsus2', 'bVI', 'bVII'], // G#m→F#sus2→E→F#
    chordLen: 2,
    unlock: { type: 'songClear', song: 's15' },
    memo: [
      '【雰囲気】街はずれの森で開かれる真夜中のレイブ。転がるベースと、うねるアシッド。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭七sus2→♭六→♭七（G#m→F#sus2→E→F#）を2小節ずつ。',
      '【主旋律の動機】2小節の16分。アシッドで G#-B-G#-D#-G#-F#-D#-C#-D# ／ G#（1拍）-B-D#-F#。軸の音は G#。',
      '　ドロップは A A A B A A A C。CでF#6（最高音）。',
      '【パート】4つ打ち、キックの後ろで転がるベース、裏拍のハイハット、アシッドの主旋律、パッド。',
      '【決め所】17・49小節目の1拍目、各8小節目のF#6の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0, tune: 1.05, decay: 0.28 },
      clap: { preset: 'clap', gain: 0.6, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.34, decay: 0.18, hp: 7500, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.25 },
      bass: { preset: 'sawbass', gain: 0.4, base: 32, duck: 0.7, cutoff: 650 },
      lead: { preset: 'acid', type: 'melody', gain: 0.6, rev: 0.28, delay: 0.3, q: 16, cutHi: 3200 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 71, rev: 0.45, duck: 0.4 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 1 1 1 . 1 1 1 . 1 1 1 . 1 1 1',
      pad: held('x', 32),
      hookA: 'G#5 . B5 . G#5 D#5 . G#5 F#5 . D#5 . C#5 . D#5 . | G#5 - - - . . B4 . . . D#5 . . . F#5 .',
      hookB: 'F#5 . A#5 . F#5 C#5 . F#5 E5 . C#5 . A#4 . C#5 . | F#5 - - - . . A#4 . . . C#5 . . . E5 .',
      hookC: 'F#5 . A#5 . F#5 C#5 . F#5 E5 . C#5 . A#4 . C#5 . | F#5 - - - . . C#5 - F#6 - - - - - - -',
    },
    sections: form('std', {
      intro: { filter: [300, 5000], parts: { kick: 'k4', ohat: 'hOff', bass: 'bass' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', bass: 'bass', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', ohat: 'hOff', hat: 'h16', bass: 'bass', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', ohat: 'hOff' } },
      build2: { parts: { pad: 'pad', kick: 'k4', bass: 'bass' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', bass: 'bass' } },
    }),
  });

  /* ---------------------------------------------------------
   * 42. アンダーラボ（ニューロファンク 175）
   * --------------------------------------------------------- */
  reg({
    id: 's42',
    no: 42,
    title: 'アンダーラボ',
    genre: 'ニューロファンク',
    bpm: 175,
    key: 'C',
    mode: 'minor',
    form: 'long',
    prog: ['i', 'bVI', 'bIImaj7', 'v'], // Cm→A♭→D♭maj7→Gm
    chordLen: 2,
    unlock: { type: 'extraClears', n: 5 },
    memo: [
      '【雰囲気】地下の研究所で機械が暴れ出す。金属的なベルと、うなるリースベース。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8',
      '【コード】一m→♭六→♭二maj7→五m（Cm→A♭→D♭maj7→Gm）を2小節ずつ。',
      '【主旋律の動機】2小節。金属的なFMベルで C（1拍）-E♭-G-F-E♭ ／ C-A♭（1拍）-C。軸の音は C（D♭にmaj7を付けて共通に）。',
      '　ドロップは A A A B A A A C。CでD6（最高音）。',
      '【パート】2ステップのドラム（ドロップ2は細かく）、リースベース（速いうなり）、金属的なベル、パッド。',
      '【決め所】25・65小節目の1拍目、各8小節目のD6。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 1.1, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.15, decay: 0.2 },
      hat: { preset: 'hat', gain: 0.34, pan: 0.25 },
      bass: { preset: 'reese', gain: 0.28, base: 24, duck: 0.4, cutoff: 1100, lfo: 1.4 },
      lead: { preset: 'bell', type: 'melody', gain: 0.72, rev: 0.3, delay: 0.25, decay: 0.7, ratio: 7, index: 3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.42, low: 53, high: 70, rev: 0.45, duck: 0.3 },
    },
    patterns: {
      k: D.dnbK,
      s: D.dnbS,
      k2: 'x . . . . . . x . . x . . . . . | x . . . . . . . . . x . . x . .',
      s2: '. . . . X . . o . . o . X . . o | . . o . X . . o . o . . X . X o',
      h8: D.h8,
      h16: D.h16,
      bass: '1 - - - 1 - - - . . 8 - - - 1 - | 1 - - - 5 - - - 1 - . . 8 - - -',
      bassLong: held('1', 32),
      pad: held('x', 32),
      hookA: 'C5 - - - . . Eb5 . G5 . . F5 . Eb5 . . | C5 . . . Ab4 - - - . . C5 . . . . .',
      hookB: 'D5 - - - . . F5 . G5 . . F5 . D5 . . | Bb4 . . . G4 - - - . . Bb4 . . . . .',
      hookC: 'D5 - - - . . F5 . G5 . . F5 . D5 . . | Bb4 . . . G4 - - - D6 - - - - - - -',
    },
    sections: form('long', {
      intro: { filter: [400, 5000], parts: { pad: 'pad', hat: 'h8' } },
      build: { parts: (b) => ({ pad: 'pad', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h8', bass: 'bass', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', hat: 'h8', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', bass: 'bassLong' } },
      drop2: { parts: (b) => ({ kick: 'k2', snare: 's2', hat: 'h16', bass: 'bass', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 500], parts: { pad: 'pad', hat: 'h8' } },
    }),
  });

  /* ---------------------------------------------------------
   * 43. ウィークエンド・サンセット（フューチャーファンク 112）
   * --------------------------------------------------------- */
  reg({
    id: 's43',
    no: 43,
    title: 'ウィークエンド・サンセット',
    genre: 'フューチャーファンク',
    bpm: 112,
    key: 'Db',
    mode: 'major',
    form: 'mid',
    prog: ['Imaj7', 'vi7', 'ii7', 'V7'], // D♭maj7→B♭m7→E♭m7→A♭7
    chordLen: 1,
    unlock: { type: 'plays', n: 40 },
    memo: [
      '【雰囲気】週末の夕焼けの海沿い。80年代のポップスを切り貼りしたような、明るく跳ねる音。',
      '【構成（中くらい）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド4（41〜44）→ドロップ2 16（45〜60）→アウトロ4',
      '【コード】一maj7→六m7→二m7→五7（D♭maj7→B♭m7→E♭m7→A♭7）。',
      '【主旋律の動機】1小節。声っぽい音で D♭（長め）-F-A♭-F-E♭-D♭-B♭-D♭。軸の音は D♭（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでC6（最高音）。',
      '【パート】4つ打ち、クラップ、裏拍のオープンハット、シェイカー、オクターブで跳ねるベース、裏拍の和音、声っぽいリード、パッド。',
      '【決め所】17・45小節目の1拍目、各4小節目のG♭5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.85, rev: 0.25 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.3, decay: 0.22, hp: 7000, pan: -0.15 },
      shaker: { preset: 'shaker', gain: 0.38, pan: 0.3 },
      bass: { preset: 'sawbass', gain: 0.4, base: 25, duck: 0.5, cutoff: 900 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.28, low: 58, high: 75, rev: 0.25, duck: 0.45, cutHi: 3000, fdecay: 0.1 },
      lead: { preset: 'vox', gain: 0.6, rev: 0.3, delay: 0.25, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 56, high: 73, rev: 0.4, attack: 0.15, duck: 0.3 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      shk: D.h16,
      bass: '1 . 8 . 1 . 8 . 1 . 8 . 1 . 8 .',
      stab: '. . x . . . x . . . x . . . x .',
      pad: held('x', 16),
      hookA: 'Db5 - . F5 . Ab5 . F5 Eb5 . Db5 . Bb4 . Db5 .',
      hookB: 'C5 - . Eb5 . Ab5 . Eb5 Db5 . C5 . Ab4 . C5 .',
      hookC: 'C5 - . Eb5 . Ab5 . Eb5 Gb5 - - - C6 - - .',
    },
    sections: form('mid', {
      intro: { filter: [500, 3500], parts: { kick: 'k4', ohat: 'hOff', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', shaker: 'shk', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', stab: 'stab' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', shaker: 'shk', bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { kick: 'k4', ohat: 'hOff', stab: 'stab' } },
    }),
  });

  /* ---------------------------------------------------------
   * 44. ジャイアント・ステップ（リディム×ダブステップ 140）
   * --------------------------------------------------------- */
  reg({
    id: 's44',
    no: 44,
    title: 'ジャイアント・ステップ',
    genre: 'リディム×ダブステップ',
    bpm: 140,
    key: 'A',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'iv', 'bVI', 'v'], // Am→Dm→F→Em
    chordLen: 2,
    unlock: { type: 'songClear', song: 's19' },
    memo: [
      '【雰囲気】巨大ロボットがビルの間を歩く足音。リディムのくり返しから、ダブステップの大きなうなりへ。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32：リディム）→ブレイク8→ビルド8→ドロップ2 16（49〜64：ダブステップ）→アウトロ8',
      '【コード】一m→四m→♭六→五m（Am→Dm→F→Em）を2小節ずつ。',
      '【主旋律の動機】2小節。FMベルで A-C-E-D ／ A（伸ばし）。間を大きく。軸の音は A（はじめの3つのコードに共通）。',
      '　ドロップは A A A B A A A C。CでG5（最高音）。',
      '【パート】半分の速さのビート、ドロップ1：3連っぽく刻むワブル（1拍に1.5回）、ドロップ2：大きくうなるワブル（1拍に1回）、サブベース、ベルの主旋律。',
      '【決め所】17・49小節目の1拍目、スネアの3拍目、各8小節目のG5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0, tune: 0.9 },
      snare: { preset: 'snare', gain: 1.6, rev: 0.25 },
      hat: { preset: 'hat', gain: 0.4, pan: 0.2 },
      bass: { preset: 'wobble', gain: 0.42, base: 28, cutoff: 240, depth: 1500, wob: 1.5, duck: 0.3 },
      bass2: { preset: 'wobble', type: 'bass', gain: 0.42, base: 28, cutoff: 250, depth: 1800, wob: 1, duck: 0.3 },
      sub: { preset: 'sub', type: 'bass', gain: 0.22, base: 28, duck: 0.4 },
      lead: { preset: 'bell', type: 'melody', gain: 0.56, rev: 0.4, delay: 0.3, decay: 1.4, ratio: 2.5 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 53, high: 70, rev: 0.45 },
    },
    patterns: {
      k: D.halfK,
      s: D.halfS,
      h: D.hOff,
      wob: '1 . . 1 . . 1 . . 1 . . 1 . 8 .',
      wob2: '1 - - - - - - - 1 - - . 8 - . . | 1 - - - 5 - - - 1 - . 1 - . . .',
      sub: held('1', 16),
      pad: held('x', 32),
      hookA: 'A4 . . . . . C5 . E5 . . . . . D5 . | A4 - - - . . . . . . . . . . . .',
      hookB: 'G4 . . . . . B4 . E5 . . . . . D5 . | B4 - - - . . . . . . . . . . . .',
      hookC: 'G4 . . . . . B4 . E5 . . . . . D5 . | B4 - - - . . . . E5 - - - G5 - - -',
    },
    sections: form('std', {
      intro: { filter: [400, 3000], parts: { pad: 'pad', hat: 'h' } },
      build: { parts: (b) => ({ pad: 'pad', sub: 'sub', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'wob', sub: 'sub', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', sub: 'sub' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass2: 'wob2', sub: 'sub', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 400], parts: { pad: 'pad', hat: 'h' } },
    }),
  });

  /* ---------------------------------------------------------
   * 45. エレクトリック・ボード（エレクトロハウス 130）
   * --------------------------------------------------------- */
  reg({
    id: 's45',
    no: 45,
    title: 'エレクトリック・ボード',
    genre: 'エレクトロハウス',
    bpm: 130,
    key: 'E',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'v', 'bVII6', 'iv'], // Em→Bm→D6→Am
    chordLen: 1,
    unlock: { type: 'battleWins', n: 8 },
    memo: [
      '【雰囲気】駅の電光掲示板の文字が流れる。ギザギザした太いベースと、跳ねるリード。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→五m→♭七6→四m（Em→Bm→D6→Am）。',
      '【主旋律の動機】1小節。B-B-E-B-D-B-A-G の短い音。軸の音は B（Dに6thを付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでC6（最高音）。',
      '【パート】4つ打ち、クラップ、16分のハイハット、共鳴の強いのこぎり波ベース（うねり）、太いスーパーソウ、パッド。',
      '【決め所】17・49小節目の1拍目、各4小節目のA5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0 },
      clap: { preset: 'clap', gain: 0.9, rev: 0.22 },
      snare: { preset: 'snare', gain: 0.7 },
      hat: { preset: 'hat', gain: 0.6, pan: 0.2 },
      ohat: { preset: 'hat', gain: 0.28, decay: 0.2, hp: 7000, pan: -0.15 },
      bass: { preset: 'sawbass', gain: 0.4, base: 28, duck: 0.55, cutoff: 800, q: 10 },
      lead: { preset: 'supersaw', gain: 0.46, detune: 34, cutoff: 7500, rev: 0.28, delay: 0.15, duck: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 52, high: 69, rev: 0.4, duck: 0.4 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      h16: D.hEA,
      hOff: D.hOff,
      bass: '1 8 . 1 . 8 1 . 1 8 . 1 . 8 1 .',
      pad: held('x', 16),
      hookA: 'B4 . B4 . E5 . B4 . D5 - . B4 . A4 . G4',
      hookB: 'C5 . C5 . E5 . C5 . A4 - . C5 . E5 . G5',
      hookC: 'C5 . C5 . E5 . C5 . A5 - - - C6 - - -',
    },
    sections: form('std', {
      intro: { filter: [500, 3500], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', hat: 'h16', ohat: 'hOff', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      outro: { filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
    }),
  });

  /* ---------------------------------------------------------
   * 46. モーニング・スロープ（UKガラージ・スピードガラージ 135）
   * --------------------------------------------------------- */
  reg({
    id: 's46',
    no: 46,
    title: 'モーニング・スロープ',
    genre: 'UKガラージ（スピード）',
    bpm: 135,
    key: 'G',
    mode: 'major',
    form: 'std',
    swing: 0.14,
    prog: ['IVadd9', 'V', 'iii', 'vi'], // Cadd9→D→Bm→Em（四→五→三→六）
    chordLen: 1,
    unlock: { type: 'coopPlays', n: 15 },
    memo: [
      '【雰囲気】朝帰りの坂道。4つ打ちに跳ねたハイハットと、うなるベースのスピードガラージ。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】四add9→五→三m→六m（Cadd9→D→Bm→Em）。',
      '【主旋律の動機】1小節。D（長め）-B-D-E-F#-D-A-B。軸の音は D（Cにadd9を付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでE6（最高音）。',
      '【パート】4つ打ち、2・4拍のスネア、スウィングしたハイハット、リースベース（うなり）、プラックの主旋律、裏拍の和音。',
      '【決め所】17・49小節目の1拍目、各4小節目のB5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.2 },
      hat: { preset: 'hat', gain: 0.35, pan: 0.2 },
      bass: { preset: 'reese', gain: 0.26, base: 28, duck: 0.5, cutoff: 750, lfo: 0.5 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.62, rev: 0.25, delay: 0.22, cutHi: 4800 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.26, low: 59, high: 76, rev: 0.25, duck: 0.4, cutHi: 2600 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.4 },
    },
    patterns: {
      k4: D.k4,
      s: D.s24,
      h: D.ukgH,
      bass: '1 - - 1 - - . . 1 - . 1 - . 5 -',
      stab: '. . x . . x . . . . x . . x . .',
      pad: held('x', 16),
      hookA: 'D5 - . B4 . D5 . E5 F#5 . D5 . A4 . B4 .',
      hookB: 'E5 - . B4 . E5 . F#5 G5 . E5 . B4 . D5 .',
      hookC: 'E5 - . B4 . E5 . F#5 B5 - - - E6 - - .',
    },
    sections: form('std', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', hat: 'h', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', hat: 'h', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', snare: 's', hat: 'h', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', hat: 'h' } },
      build2: { parts: { pad: 'pad', hat: 'h' } },
      drop2: { parts: (b) => ({ kick: 'k4', snare: 's', hat: 'h', bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', hat: 'h', kick: 'k4' } },
    }),
  });

  /* ---------------------------------------------------------
   * 47. キャンディタウン（フューチャーベース・カワイイ 160）
   * --------------------------------------------------------- */
  reg({
    id: 's47',
    no: 47,
    title: 'キャンディタウン',
    genre: 'フューチャーベース（カワイイ）',
    bpm: 160,
    key: 'F',
    mode: 'major',
    form: 'std',
    prog: ['I', 'iii', 'IVmaj7', 'V'], // F→Am→B♭maj7→C
    chordLen: 1,
    unlock: { type: 'perfect', n: 8000 },
    memo: [
      '【雰囲気】お菓子でできた街。かわいいベルの音と、ふわっと広がる和音。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一→三m→四maj7→五（F→Am→B♭maj7→C）。',
      '【主旋律の動機】1小節。かわいいベルで A-C-A-F-A（長め）-G-F。軸の音は A（B♭にmaj7を付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでE6（最高音）。',
      '【パート】半分の速さのビート、スーパーソウの和音の刻み、サブベース、ベルの主旋律、ベルのアルペジオ、声っぽい合いの手（ドロップ2）。',
      '【決め所】17・49小節目の1拍目、各4小節目のG5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      snare: { preset: 'snare', gain: 1.5, rev: 0.3 },
      clap: { preset: 'clap', gain: 0.6, rev: 0.3 },
      hat: { preset: 'hat', gain: 0.45, pan: 0.2 },
      bass: { preset: 'sub', type: 'bass', gain: 0.24, base: 29, duck: 0.4 },
      stab: { preset: 'supersaw', type: 'chord', gain: 0.26, low: 60, high: 77, rev: 0.3, duck: 0.65, env: [0.003, 0.2, 0.4, 0.1], cutoff: 6500 },
      lead: { preset: 'bell', type: 'melody', gain: 0.85, rev: 0.32, delay: 0.25, ratio: 2, index: 1.5, decay: 0.7 },
      vox: { preset: 'vox', type: 'melody', gain: 0.35, rev: 0.3, delay: 0.2 },
      arp: { preset: 'bell', type: 'arp', gain: 0.22, base: 72, pan: 0.3, rev: 0.35, delay: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.45 },
    },
    patterns: {
      k: D.halfK,
      s: D.halfS,
      h: 'x . x . x . x . x . x x x . x .',
      bass: '1 - - - - - - - - - 5 - - - - -',
      stab: 'x . . x . . x . . x . . x . x .',
      pad: held('x', 16),
      arp: '0 . 2 . 1 . 3 . 2 . 1 . 3 . 2 .',
      vox: '. . . . . . . . . . . . F5 . A5 .',
      hookA: 'A5 . C6 . A5 . F5 . A5 - - . G5 . F5 .',
      hookB: 'G5 . C6 . G5 . E5 . G5 - - . F5 . E5 .',
      hookC: 'G5 . C6 . G5 . E5 . G5 - - . E6 - - -',
    },
    sections: form('std', {
      intro: { filter: [600, 4500], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp', bass: 'bass' } },
      build2: { parts: { pad: 'pad', arp: 'arp' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', clap: 's', hat: 'h', bass: 'bass', stab: 'stab', arp: 'arp', vox: 'vox', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 48. ファイナルステージ（ハードコア×ブレイクコア 200）
   * --------------------------------------------------------- */
  reg({
    id: 's48',
    no: 48,
    title: 'ファイナルステージ',
    genre: 'ハードコア×ブレイクコア',
    bpm: 200,
    key: 'B',
    mode: 'minor',
    form: 'long',
    prog: ['i', 'bVI', 'iv', 'V'], // Bm→G→Em→F#
    chordLen: 1,
    unlock: { type: 'extraClears', n: 10 },
    memo: [
      '【雰囲気】最終ステージ。歪んだ4つ打ちで押し、後半は崩れたブレイクビーツで畳みかける。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40：ハードコア）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80：ブレイクコア）→アウトロ8',
      '【コード】一m→♭六→四m→五（Bm→G→Em→F#）。五を長三和音にして強く戻る。',
      '【主旋律の動機】1小節の8分。B-F#-D-B-A-F#-D-E。軸の音は B（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでF#6（最高音）。',
      '【パート】ドロップ1：歪んだ4つ打ちキック、裏拍のベース、太いスーパーソウ。ドロップ2：切り刻んだブレイクビーツ＋歪んだキック。',
      '【決め所】25・65小節目の1拍目、各4小節目のC#6の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'hardkick', gain: 0.9, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.12, decay: 0.15 },
      clap: { preset: 'clap', gain: 0.8, rev: 0.25 },
      ohat: { preset: 'hat', gain: 0.28, decay: 0.18, hp: 7000, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.42, pan: 0.25, decay: 0.03 },
      bass: { preset: 'sawbass', gain: 0.34, base: 30, duck: 0.65, cutoff: 1300 },
      lead: { preset: 'supersaw', gain: 0.5, detune: 36, cutoff: 9500, rev: 0.28, delay: 0.1, duck: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 71, rev: 0.45 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      bk: 'x . . . . . x . . x . . x . . . | x . x . . . . . . x . . x . x .',
      bs: '. . . . X . . o . . X . o . X o | . . . . X . o . X . X o . X X X',
      h16: D.h16,
      bass: '1 . 1 . . 1 1 . . 1 1 . . 1 1 .',
      pad: held('x', 16),
      hookA: 'B5 . F#5 . D5 . B5 . A5 . F#5 . D5 . E5 .',
      hookB: 'A#5 . F#5 . C#5 . A#5 . G#5 . F#5 . C#5 . E5 .',
      hookC: 'A#5 . F#5 . C#5 . A#5 . C#6 - - - F#6 - - -',
    },
    sections: form('long', {
      intro: { filter: [400, 5000], parts: { kick: 'k4', ohat: 'hOff', pad: 'pad' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', hat: 'h16', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'bk', snare: 'bs', hat: 'h16', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', pad: 'pad' } },
    }),
  });

  /* ---------------------------------------------------------
   * 49. フォグ・ハイウェイ（シンセウェイヴ・ダーク 88）
   * --------------------------------------------------------- */
  reg({
    id: 's49',
    no: 49,
    title: 'フォグ・ハイウェイ',
    genre: 'シンセウェイヴ（ダーク）',
    bpm: 88,
    key: 'C',
    mode: 'minor',
    form: 'short',
    prog: ['i', 'bVI', 'bVIIsus2', 'v'], // Cm→A♭→B♭sus2→Gm
    chordLen: 1,
    unlock: { type: 'maxCombo', n: 500 },
    memo: [
      '【雰囲気】霧の深夜の高速道路。重く暗いシンセと、ゆっくり進む大きなビート。',
      '【構成（短い形）】イントロ8→ビルド4（9〜12）→ドロップ16（13〜28）→ブレイク8→ビルド4（37〜40）→ドロップ2 8（41〜48）→アウトロ4',
      '【コード】一m→♭六→♭七sus2→五m（Cm→A♭→B♭sus2→Gm）。',
      '【主旋律の動機】1小節。C（1拍）-E♭-D-C（長め）-G-B♭。軸の音は C（B♭にsus2を付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでB♭5（最高音）。',
      '【パート】ゆっくりの4つ打ち、残響の大きいスネア、8分で刻む暗いのこぎり波ベース、低めのスーパーソウ、暗いパッド、アルペジオ。',
      '【決め所】13・41小節目の1拍目、各4小節目のG5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0, tune: 0.9 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.6, decay: 0.28 },
      hat: { preset: 'hat', gain: 0.4, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.32, base: 24, duck: 0.4, cutoff: 500 },
      lead: { preset: 'supersaw', gain: 0.44, detune: 14, cutoff: 3000, rev: 0.4, delay: 0.3, duck: 0.2 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 51, high: 68, rev: 0.5, duck: 0.3, cutoff: 1200 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.24, base: 60, pan: -0.25, rev: 0.35, delay: 0.3, cutHi: 2400 },
    },
    patterns: {
      k4: D.k4,
      s24: D.s24,
      h8: D.h8,
      bass: '1 1 1 1 1 1 8 1 1 1 1 1 1 1 8 1',
      pad: held('x', 16),
      arp: '0 2 1 2 0 2 1 3 0 2 1 2 0 2 3 2',
      hookA: 'C5 - - - Eb5 . D5 . C5 - - . G4 . Bb4 .',
      hookB: 'Bb4 - - - D5 . C5 . Bb4 - - . G4 . A4 .',
      hookC: 'Bb4 - - - D5 . C5 . G5 - - - Bb5 - - -',
    },
    sections: form('short', {
      intro: { filter: [500, 3500], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', snare: 's24', hat: 'h8', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp' } },
      build2: { parts: { pad: 'pad', arp: 'arp', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'k4', snare: 's24', hat: 'h8', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [7000, 400], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 50. ドーンブレイク（トランス・エピック 140）
   * --------------------------------------------------------- */
  reg({
    id: 's50',
    no: 50,
    title: 'ドーンブレイク',
    genre: 'トランス（エピック）',
    bpm: 140,
    key: 'E',
    mode: 'major',
    form: 'std',
    prog: ['vi', 'IV', 'I', 'V'], // C#m→A→E→B（六→四→一→五）
    chordLen: 1,
    unlock: { type: 'unlockedSongs', n: 45 },
    memo: [
      '【雰囲気】長い夜が明ける瞬間。ネオンが消え、朝日がビルを照らす。シリーズの締めくくり。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64、半音上に転調）→アウトロ8（転調したまま）',
      '【コード】六m→四→一→五（C#m→A→E→B）。設計書のよく使う進行「六→四→一→五」を長調で。',
      '【主旋律の動機】1小節。E（長め）-G#-B-E（長め）-F#-G#。軸の音は E（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。ドロップ2は半音上に上がり、最後のCでG6（全曲の最高音）。',
      '【パート】4つ打ち、クラップ、裏拍のオープンハット、16分で転がるベース、広いスーパーソウ、16分のアルペジオ、パッド。',
      '【決め所】17・49小節目の1拍目（49小節目は転調の瞬間）、各4小節目のD#6の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.75, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.3, decay: 0.2, hp: 7000, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.55, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.36, base: 28, duck: 0.55, cutoff: 850 },
      lead: { preset: 'supersaw', gain: 0.44, detune: 32, cutoff: 8500, rev: 0.4, delay: 0.28, duck: 0.25 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.24, base: 68, pan: 0.25, rev: 0.3, delay: 0.3, cutHi: 4000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 56, high: 73, rev: 0.45, duck: 0.35 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 1 1 1 . 1 1 1 . 1 1 1 . 1 1 1',
      pad: held('x', 16),
      arp: '0 1 2 3 2 1 2 3 0 1 2 3 4 3 2 1',
      hookA: 'E5 - - . G#5 . B5 . E5 - - . F#5 . G#5 .',
      hookB: 'D#5 - - . F#5 . B5 . D#5 - - . E5 . F#5 .',
      hookC: 'D#5 - - . F#5 . B5 . D#6 - - - F#6 - - -',
    },
    sections: form('std', {
      intro: { filter: [400, 5000], parts: { kick: 'k4', ohat: 'hOff', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', arp: 'arp', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', arp: 'arp', bass: 'bass' } },
      drop2: { transpose: 1, parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { transpose: 1, filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', arp: 'arp', pad: 'pad' } },
    }),
  });
})();
