/* =========================================================
 * songs/songs-04.js … 31〜40曲目
 * 全体計画：docs/song-plan.md。
 * チップチューンの要素は34曲目（チップチューン×フューチャーベース）だけ。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;
  const { R, held, dropSeq, teaseSeq, form, D } = NLM.SongLib;
  const reg = (o) => NLM.Songs.register(Object.assign({ leadPart: 'lead' }, o));

  /* ---------------------------------------------------------
   * 31. クロックタワー・ファイブ（エレクトロニカ・5拍子 96）
   * 1小節＝8分音符5つ（2.5拍・2＋3のまとまり）。1小節のマスは10。
   * --------------------------------------------------------- */
  reg({
    id: 's31',
    no: 31,
    title: 'クロックタワー・ファイブ',
    genre: 'エレクトロニカ（5拍子）',
    bpm: 96,
    beatsPerBar: 2.5,
    strong: [0, 1],
    key: 'E',
    mode: 'major',
    form: 'std',
    prog: ['Imaj7', 'IVadd9', 'vi7', 'V6'], // Emaj7→Aadd9→C#m7→B6
    chordLen: 1,
    unlock: { type: 'extraClears', n: 1 },
    memo: [
      '【雰囲気】不思議な時計台。5拍子（2＋3）の歯車がかみ合うような、きらきらした音。',
      '【構成（基本形・5拍子）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8（1小節が短いので基本形で約1分53秒）',
      '【コード】一maj7→四add9→六m7→五6（Emaj7→Aadd9→C#m7→B6）。',
      '【主旋律の動機】1小節（5拍子）。FMベルで B（長め）-G#-E-F#-G#。軸の音は B（4つのコードすべてに含まれる）。',
      '　ドロップは A A A B ×3＋A A A C。CでD#6（最高音）。',
      '【パート】5拍子のキックとスネア、細かいハイハット、のこぎり波ベース、ベルの主旋律、10マスのアルペジオ、パッド。',
      '【決め所】17・49小節目の1拍目、各4小節目のD#6・F#5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.05 },
      snare: { preset: 'snare', gain: 0.9, rev: 0.3 },
      hat: { preset: 'hat', gain: 0.45, pan: 0.25, decay: 0.035 },
      bass: { preset: 'sawbass', gain: 0.38, base: 28, duck: 0.35, cutoff: 650 },
      lead: { preset: 'bell', type: 'melody', gain: 0.55, rev: 0.4, delay: 0.3, decay: 1.0, ratio: 3 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.24, base: 64, pan: 0.3, rev: 0.3, delay: 0.25, cutHi: 3500 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 56, high: 73, rev: 0.45 },
    },
    patterns: {
      k: 'x . . . . . x . . .',
      s: '. . . . x . . . . x',
      h: 'x o x o x x o x o x',
      bass: '1 - - . . . 5 - . .',
      pad: held('x', 10),
      arp: '0 1 2 3 2 1 0 1 2 3',
      hookA: 'B5 - - . G#5 E5 . F#5 G#5 .',
      hookB: 'B5 - - . F#5 D#5 . E5 F#5 .',
      hookC: 'B5 - - . F#5 D#5 . F#5 D#6 -',
    },
    sections: form('std', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', hat: 'h', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp' } },
      build2: { parts: { pad: 'pad', arp: 'arp', hat: 'h' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', arp: 'arp', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 32. ブロークン・レディオ（グリッチホップ×フューチャーファンク 106）
   * --------------------------------------------------------- */
  reg({
    id: 's32',
    no: 32,
    title: 'ブロークン・レディオ',
    genre: 'グリッチホップ×フューチャーファンク',
    bpm: 106,
    key: 'Bb',
    mode: 'major',
    form: 'mid',
    swing: 0.14,
    prog: ['ii7', 'V7', 'iii7', 'vi7'], // Cm7→F7→Dm7→Gm7
    chordLen: 1,
    unlock: { type: 'songClear', song: 's18' },
    memo: [
      '【雰囲気】壊れたラジオから流れる昔のポップス。音が飛ぶような切り刻みと、跳ねるディスコのベース。',
      '【構成（中くらい）】イントロ8→ビルド8→ドロップ16（17〜32：フューチャーファンク）→ブレイク8→ビルド4→ドロップ2 16（45〜60：グリッチホップ）→アウトロ4',
      '【コード】二m7→五7→三m7→六m7（Cm7→F7→Dm7→Gm7）。',
      '【主旋律の動機】1小節。声っぽい音で C-C（切り刻み）-E♭-D-C-A-C-F-E♭。軸の音は C。',
      '　ドロップは A A A B ×3＋A A A C。CでB♭5（最高音）。',
      '【パート】ドロップ1：4つ打ち、オクターブのベース、裏拍の和音。ドロップ2：跳ねたヒップホップのビート、ワブルベース（2拍に1回）。',
      '【決め所】17・45小節目の1拍目、各4小節目のG5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0 },
      clap: { preset: 'clap', gain: 0.85, rev: 0.25 },
      snare: { preset: 'snare', gain: 1.1, rev: 0.25 },
      ohat: { preset: 'hat', gain: 0.3, decay: 0.2, hp: 7000, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.25 },
      bass: { preset: 'sawbass', gain: 0.4, base: 28, duck: 0.45, cutoff: 900 },
      bass2: { preset: 'wobble', type: 'bass', gain: 0.3, base: 28, cutoff: 260, depth: 1300, wob: 0.5, duck: 0.3 },
      lead: { preset: 'vox', gain: 0.78, rev: 0.28, delay: 0.22, duck: 0.15 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.28, low: 58, high: 75, rev: 0.25, duck: 0.4, cutHi: 3000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 56, high: 72, rev: 0.4 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      gk: 'x . . . . . . . . . x . . . . .',
      gs: D.s24,
      gh: '. x . x . x x x . x . x . x x x',
      bass: '1 . 8 . 1 . 8 . 1 . 8 . 1 . 8 .',
      bass2: '1 - - - - - - - 1 - - - 5 - 8 -',
      stab: '. . x . . . x . . . x . . . x .',
      pad: held('x', 16),
      hookA: 'C5 C5 . Eb5 . D5 C5 . A4 - . C5 . F5 Eb5 .',
      hookB: 'Bb4 Bb4 . D5 . C5 Bb4 . G4 - . Bb4 . F5 D5 .',
      hookC: 'Bb4 Bb4 . D5 . C5 Bb4 . G5 - - - Bb5 - - .',
    },
    sections: form('mid', {
      intro: { filter: [500, 3500], parts: { pad: 'pad', stab: 'stab', ohat: 'hOff' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab' } },
      build2: { parts: { pad: 'pad', hat: 'gh' } },
      drop2: { parts: (b) => ({ kick: 'gk', snare: 'gs', hat: 'gh', bass2: 'bass2', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', stab: 'stab' } },
    }),
  });

  /* ---------------------------------------------------------
   * 33. フィルター・ブールバール（フレンチハウス 123）
   * --------------------------------------------------------- */
  reg({
    id: 's33',
    no: 33,
    title: 'フィルター・ブールバール',
    genre: 'フレンチハウス',
    bpm: 123,
    key: 'F',
    mode: 'major',
    free: true,
    prog: ['IVmaj7', 'iii7', 'ii7', 'I'], // B♭maj7→Am7→Gm7→F（下っていくディスコの進行）
    chordLen: 1,
    unlock: { type: 'plays', n: 25 },
    memo: [
      '【雰囲気】ネオンの並木道を流すオープンカー。古いディスコのレコードをループして、こもらせたり開いたりする（フィルター）。',
      '【構成（自由な構成）】イントロ16（ループがだんだん開いていく）→ドロップ16→ブレイク8（こもった音）→ビルド8→ドロップ2 16→アウトロ8（だんだん閉じる）',
      '【コード】四maj7→三m7→二m7→一（B♭maj7→Am7→Gm7→F）を1小節ずつ。1音ずつ下っていく。',
      '【主旋律の動機】声っぽいリードの短い切れ端（ボーカルチョップ風）。F-F-D-F-A-F-D を、コードに合わせて1音ずつ下へずらしてくり返す。',
      '　ドロップ2の最後だけ C6（最高音）へ上がる。',
      '【パート】4つ打ちのキックで他の音をすべて大きく沈ませる（強いポンピング）。オクターブで跳ねるディスコのベース、ギターの刻み、ストリングス、裏拍の開いたハイハット。',
      '【決め所】ドロップの1拍目、4小節ごとの伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, decay: 0.34, tune: 0.95 },
      clap: { preset: 'clap', gain: 0.7, rev: 0.2 },
      hat: { preset: 'hat', gain: 0.5, decay: 0.14, pan: 0.2 },
      shaker: { preset: 'shaker', gain: 0.35, pan: -0.2 },
      bass: { preset: 'sawbass', gain: 0.4, base: 29, cutoff: 650, duck: 0.6 },
      gtr: { preset: 'gtr', type: 'chord', gain: 0.9, low: 57, high: 72, tone: 1400, pan: -0.3, duck: 0.6 },
      strings: { preset: 'pad', type: 'chord', gain: 0.4, low: 57, high: 76, cutoff: 2600, rev: 0.3, duck: 0.65 },
      lead: { preset: 'vox', gain: 0.7, rev: 0.25, delay: 0.3, duck: 0.5 },
    },
    patterns: {
      k4: D.k4,
      s24: D.s24,
      hOff: D.hOff,
      shk: D.h16,
      bass: '1 . 8 . 1 . 8 . 1 . 8 . 1 . 8 .',
      bassL: held('1', 16),
      gtr: '. . x . . x . . . . x . . x . .',
      hold: held('x', 16),
      hookA: 'F5 . F5 . D5 - F5 . . A5 - . F5 . D5 . | E5 . E5 . C5 - E5 . . G5 - . E5 . C5 . | D5 . D5 . Bb4 - D5 . . F5 - . D5 . Bb4 . | C5 - - - A4 - C5 - F5 - - - - - . .',
      hookB: 'F5 . F5 . D5 - F5 . . A5 - . F5 . D5 . | E5 . E5 . C5 - E5 . . G5 - . E5 . C5 . | D5 . D5 . Bb4 - D5 . . F5 - . D5 . Bb4 . | C5 - - - A4 - C5 - A5 - - - G5 - F5 -',
      hookC: 'F5 . F5 . D5 - F5 . . A5 - . F5 . D5 . | E5 . E5 . C5 - E5 . . G5 - . E5 . C5 . | D5 . D5 . Bb4 - D5 . . F5 - . D5 . Bb4 . | C5 - - - F5 - A5 - C6 - - - - - - -',
    },
    sections: [
      { name: 'イントロ', type: 'intro', bars: 16, filter: [250, 4500], parts: { kick: 'k4', hat: 'hOff', bass: 'bass', gtr: 'gtr', strings: 'hold' } },
      { name: 'ドロップ', type: 'drop', bars: 16, drop: true, impact: 'crash', parts: { kick: 'k4', clap: 's24', hat: 'hOff', shaker: 'shk', bass: 'bass', gtr: 'gtr', strings: 'hold', lead: ['hookA', 'hookB'] } },
      { name: 'ブレイク', type: 'break', bars: 8, filter: [600, 600], parts: { bass: 'bassL', strings: 'hold', lead: 'hookA' } },
      { name: 'ビルド', type: 'build', bars: 8, build: true, gap: 1, parts: { kick: 'k4', bass: 'bass', gtr: 'gtr', strings: 'hold', hat: 'hOff' } },
      { name: 'ドロップ2', type: 'drop', bars: 16, drop: true, parts: { kick: 'k4', clap: 's24', hat: 'hOff', shaker: 'shk', bass: 'bass', gtr: 'gtr', strings: 'hold', lead: ['hookA', 'hookB', 'hookA', 'hookC'] } },
      { name: 'アウトロ', type: 'outro', bars: 8, filter: [5000, 250], parts: { kick: 'k4', hat: 'hOff', bass: 'bass', gtr: 'gtr' } },
    ],
  });

  /* ---------------------------------------------------------
   * 34. クロージングタイム・アーケード（チップチューン×フューチャーベース 160）
   * --------------------------------------------------------- */
  reg({
    id: 's34',
    no: 34,
    title: 'クロージングタイム・アーケード',
    genre: 'チップチューン×フューチャーベース',
    bpm: 160,
    key: 'A',
    mode: 'major',
    form: 'std',
    fxStyle: 'chip',
    prog: ['IV', 'I', 'Vsus4', 'vi'], // D→A→Esus4→F#m
    chordLen: 1,
    unlock: { type: 'songClear', song: 's20' },
    memo: [
      '【雰囲気】閉店間際のゲームセンター。ピコピコ音の主旋律を、フューチャーベースの分厚い和音が包む。（50曲中、チップチューンの要素は2曲だけ）',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】四→一→五sus4→六m（D→A→Esus4→F#m）。',
      '【主旋律の動機】1小節。矩形波で A（長め）-E-F#-A-C#-B-A-E。軸の音は A（Eにsus4を付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでE6（最高音）。',
      '【パート】矩形波の主旋律とアルペジオ（チップチューン）、スーパーソウの和音の刻み・サブベース・半分の速さのビート（フューチャーベース）。',
      '【決め所】17・49小節目の1拍目、各4小節目のF#5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      snare: { preset: 'chipSnare', gain: 1.4 },
      clap: { preset: 'clap', gain: 0.6, rev: 0.25 },
      hat: { preset: 'chipHat', gain: 0.6 },
      bass: { preset: 'sub', type: 'bass', gain: 0.24, base: 33, duck: 0.4 },
      stab: { preset: 'supersaw', type: 'chord', gain: 0.32, low: 61, high: 78, rev: 0.3, duck: 0.65, env: [0.003, 0.2, 0.4, 0.1], cutoff: 6000 },
      lead: { preset: 'pulse', gain: 0.9, duty: 0.25, rev: 0.15, delay: 0.2 },
      arp: { preset: 'pulse', type: 'arp', gain: 0.2, duty: 0.5, base: 69, pan: 0.2, vibrato: 0, level: 0.15, sustain: 0.6 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 57, high: 74, rev: 0.45 },
    },
    patterns: {
      k: D.halfK,
      s: D.halfS,
      h: D.h8,
      bass: '1 - - - - - - - - - 5 - - - - -',
      stab: 'x . . x . . x . . x . . x . x .',
      pad: held('x', 16),
      arp32: { s: '0 1 2 3', div: 8 },
      hookA: 'A5 - . E5 . F#5 A5 . C#6 . B5 . A5 . E5 .',
      hookB: 'A5 - . E5 . F#5 A5 . C#6 . A5 . F#5 . C#5 .',
      hookC: 'A5 - . E5 . F#5 A5 . F#5 - - - E6 - - .',
    },
    sections: form('std', {
      intro: { filter: [600, 5000], parts: { pad: 'pad', arp: 'arp32' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp32', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', stab: 'stab', arp: 'arp32', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp32' } },
      build2: { parts: { pad: 'pad', arp: 'arp32' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', clap: 's', hat: 'h', bass: 'bass', stab: 'stab', arp: 'arp32', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 500], parts: { pad: 'pad', arp: 'arp32' } },
    }),
  });

  /* ---------------------------------------------------------
   * 35. リバーサイド・ドーン（リキッド・ドラムンベース 176）
   * --------------------------------------------------------- */
  reg({
    id: 's35',
    no: 35,
    title: 'リバーサイド・ドーン',
    genre: 'リキッド・ドラムンベース',
    bpm: 176,
    key: 'Eb',
    mode: 'major',
    form: 'long',
    prog: ['vi7', 'IVmaj7', 'Imaj7', 'V'], // Cm7→A♭maj7→E♭maj7→B♭
    chordLen: 2,
    unlock: { type: 'perfect', n: 5000 },
    memo: [
      '【雰囲気】夜明けの川辺。水面に朝日が差す。速いビートと、ゆったり歌う声。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8',
      '【コード】六m7→四maj7→一maj7→五（Cm7→A♭maj7→E♭maj7→B♭）を2小節ずつ。',
      '【主旋律の動機】2小節。声っぽい音で G（長め）-F-E♭（1拍）-B♭-C ／ B♭-E♭-G（伸ばし）。軸の音は G と E♭（はじめの3つのコードに共通）。',
      '　ドロップは A A A B A A A C。CでB♭5（最高音）。',
      '【パート】2ステップのドラム＋シェイカー、リースベース（おだやか）、maj7のパッド、FMベルのアルペジオ、声っぽいリード。',
      '【決め所】25・65小節目の1拍目、各8小節目のB♭5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 1.1, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.2, decay: 0.2 },
      hat: { preset: 'hat', gain: 0.32, pan: 0.25 },
      shaker: { preset: 'shaker', gain: 0.45, pan: -0.3 },
      bass: { preset: 'reese', gain: 0.24, base: 27, duck: 0.35, cutoff: 600, lfo: 0.3 },
      lead: { preset: 'vox', gain: 0.55, rev: 0.32, delay: 0.25, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.42, low: 53, high: 72, rev: 0.45, duck: 0.3, attack: 0.6, release: 1.2 },
      arp: { preset: 'bell', type: 'arp', gain: 0.26, base: 63, pan: 0.3, rev: 0.35, delay: 0.3 },
    },
    patterns: {
      k: D.dnbK,
      s: D.dnbS,
      h8: D.h8,
      h16: D.h16,
      shk: '. x . x . x . x . x . x . x . x',
      bass: `1 ${R('-', 9)} 1 ${R('-', 5)} | 1 ${R('-', 7)} 5 - - - 8 - - -`,
      bassLong: held('1', 32),
      pad: held('x', 32),
      arp: '0 . 2 . 1 . 3 . 2 . 4 . 3 . 1 .',
      hookA: 'G5 - - - - - F5 - Eb5 - - - Bb4 - C5 - | . . Bb4 - Eb5 - G5 - - - - - . . . .',
      hookB: 'F5 - - - - - Eb5 - D5 - - - Bb4 - C5 - | . . Bb4 - D5 - F5 - - - - - . . . .',
      hookC: 'F5 - - - - - Eb5 - D5 - - - Bb4 - C5 - | . . Bb4 - D5 - F5 - Bb5 - - - - - - -',
    },
    sections: form('long', {
      intro: { filter: [400, 4000], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h8', shaker: 'shk', bass: 'bass', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', arp: 'arp', bass: 'bassLong' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h16', shaker: 'shk', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp', hat: 'h8' } },
    }),
  });

  /* ---------------------------------------------------------
   * 36. ハーバーライト・ボッサ（シティポップ×ボサノヴァ 132）
   * --------------------------------------------------------- */
  reg({
    id: 's36',
    no: 36,
    title: 'ハーバーライト・ボッサ',
    genre: 'シティポップ×ボサノヴァ',
    bpm: 132,
    key: 'F#',
    mode: 'minor',
    free: true,
    prog: ['i7', 'IV7', 'bIIImaj7', 'V7b9'], // F#m7→B7→Amaj7→C#7b9
    chordLen: 1,
    unlock: { type: 'coopPlays', n: 10 },
    memo: [
      '【雰囲気】港の灯りが映る夜の海辺のカフェ。ボサノヴァのギターとささやくような歌（声っぽいシンセ）から、サビで4つ打ちのハウスに変わる。',
      '【構成（自由な構成・歌ものの形）】イントロ8（ボサノヴァ）→Aメロ8→サビ16→間奏8（ビブラフォンのソロ）→ビルド8→ラストサビ16→アウトロ8（ボサノヴァに戻る）',
      '【コード】一m7→四7→♭三maj7→五7♭9（F#m7→B7→Amaj7→C#7♭9）を1小節ずつ。四7（明るいB7）がボサノヴァらしい響き。',
      '【主旋律の動機】サビは4小節。C#-E-A-G#-E ／ F#-D#-B-A ／ G#-E-C#-E-A-C# ／ D-B-G#-E#。',
      '　ラストサビの最後だけ3小節目で C#6（最高音）へ上がって伸ばす。',
      '【パート】ボサノヴァ：ガットギター風の和音（シンコペーション）、リムのクラーベ（2小節で一回りするリズム）、シェイカー、ベースは1拍目と3拍目。サビ：4つ打ちのキックと裏拍のハイハットを足す。',
      '【決め所】サビの1拍目（クラッシュのみ）、4小節ごとの伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.85, decay: 0.3 },
      rim: { preset: 'rim', gain: 0.5, pan: 0.2, rev: 0.2 },
      shaker: { preset: 'shaker', gain: 0.35, pan: -0.25 },
      hat: { preset: 'hat', gain: 0.4, decay: 0.1, pan: 0.25 },
      clap: { preset: 'clap', gain: 0.55, rev: 0.3 },
      bass: { preset: 'wbass', gain: 0.38, base: 30, duck: 0.2 },
      gtr: { preset: 'gtr', type: 'chord', gain: 1.0, low: 52, high: 69, tone: 900, pan: -0.25 },
      pad: { preset: 'pad', type: 'chord', gain: 0.3, low: 57, high: 76, cutoff: 1800, rev: 0.4, duck: 0.3 },
      vibe: { preset: 'bell', gain: 0.4, ratio: 4, index: 0.6, decay: 1.4, rev: 0.35, delay: 0.2, pan: 0.2 },
      lead: { preset: 'vox', gain: 0.75, rev: 0.35, delay: 0.2 },
    },
    patterns: {
      k4: D.k4,
      kSoft: 'o . . . . . . . o . . . . . . .',
      s24: D.s24,
      hOff: D.hOff,
      clave: 'x . . x . . x . . . x . . x . . | . . x . . x . . . . x . . x . .',
      shk: 'x o o x x o o x x o o x x o o x',
      bass: '1 - - - - - 5 - 1 - - - - - 5 -',
      gtr: 'x . . x . . x . . . x . . x . . | . . x . . x . . x . . x . . x .',
      hold: held('x', 16),
      verse: '. . A4 - C#5 - . A4 F#4 - - - E4 - F#4 - | A4 - - - . . F#4 - D#4 - - - . . . . | . . C#5 - E5 - . C#5 A4 - - - G#4 - A4 - | B4 - - - . . G#4 - E#4 - - - . . . .',
      hookA: 'C#5 - - . E5 . A5 - - . G#5 . E5 - - . | F#5 - - . D#5 . B4 - A4 - - - . . . . | G#5 - - . E5 . C#5 - E5 - - . A4 . C#5 . | D5 - - . B4 . G#4 - E#4 - - - - - . .',
      hookB: 'C#5 - - . E5 . A5 - - . G#5 . E5 - - . | F#5 - - . D#5 . B4 - A4 - - - . . . . | G#5 - - . E5 . C#5 - E5 - - . A4 . C#5 . | D5 - - . E#5 . G#5 - - - - - . . . .',
      hookC: 'C#5 - - . E5 . A5 - - . G#5 . E5 - - . | F#5 - - . D#5 . B4 - A4 - - - . . . . | G#5 - - . A5 . C#6 - - - - - . . . . | D5 - - . E#5 . G#5 - - - - - . . . .',
      vibe: 'A5 - E5 - C#5 - A4 - C#5 - E5 - A5 - G#5 - | F#5 - D#5 - B4 - A4 - B4 - D#5 - F#5 - - - | E5 - G#5 - C#6 - B5 - A5 - - - E5 - - - | D5 - B4 - G#4 - E#4 - G#4 - - - - - - -',
    },
    sections: [
      { name: 'イントロ（ボサノヴァ）', type: 'intro', bars: 8, parts: { kick: 'kSoft', rim: 'clave', shaker: 'shk', bass: 'bass', gtr: 'gtr' } },
      { name: 'Aメロ', type: 'break', bars: 8, parts: { kick: 'kSoft', rim: 'clave', shaker: 'shk', bass: 'bass', gtr: 'gtr', lead: 'verse' } },
      { name: 'サビ', type: 'drop', bars: 16, drop: true, impact: 'crash', parts: { kick: 'k4', clap: 's24', hat: 'hOff', rim: 'clave', shaker: 'shk', bass: 'bass', gtr: 'gtr', pad: 'hold', lead: ['hookA', 'hookB'] } },
      { name: '間奏（ビブラフォン）', type: 'break', bars: 8, parts: { kick: 'kSoft', rim: 'clave', shaker: 'shk', bass: 'bass', gtr: 'gtr', vibe: 'vibe' } },
      { name: 'ビルド', type: 'build', bars: 8, build: true, gap: 1, parts: { kick: 'k4', rim: 'clave', shaker: 'shk', bass: 'bass', gtr: 'gtr', pad: 'hold' } },
      { name: 'ラストサビ', type: 'drop', bars: 16, drop: true, impact: 'crash', parts: { kick: 'k4', clap: 's24', hat: 'hOff', rim: 'clave', shaker: 'shk', bass: 'bass', gtr: 'gtr', pad: 'hold', lead: ['hookA', 'hookB', 'hookA', 'hookC'] } },
      { name: 'アウトロ（ボサノヴァ）', type: 'outro', bars: 8, filter: [8000, 900], parts: { kick: 'kSoft', rim: 'clave', shaker: 'shk', bass: 'bass', gtr: 'gtr' } },
    ],
  });

  /* ---------------------------------------------------------
   * 37. ネオン・ディストピア（ダークシンセ 130）
   * --------------------------------------------------------- */
  reg({
    id: 's37',
    no: 37,
    title: 'ネオン・ディストピア',
    genre: 'ダークシンセ',
    bpm: 130,
    key: 'G#',
    mode: 'minor',
    free: true,
    prog: ['i', 'bVII', 'bVI', 'V'], // G#m→F#→E→D#（下っていくアンダルシア進行）
    chordLen: 1,
    unlock: { type: 'hardClears', n: 5 },
    memo: [
      '【雰囲気】巨大企業に支配されたネオン都市の悪夢。80年代のホラー映画のようなシンセと、歪んだ低音で押しつぶす。',
      '【構成（自由な構成）】イントロ8→ドロップ16（ビルドなしでいきなり）→ブレイク8→ビルド8→ドロップ2 16→ハーフタイム8（ドラムが半分の速さ）→アウトロ4',
      '【コード】一m→♭七→♭六→五（G#m→F#→E→D#）を1小節ずつ。1音ずつ下ってから、明るい五（D#）で緊張させる。',
      '【主旋律の動機】4小節。D#-B-G#-B-D# を、コードに合わせて1音ずつ下へずらす。五（D#）の上では G（和音の3番目の音）で不気味に。',
      '　ドロップ2の最後だけ A#5（最高音）へ上がって伸ばす。',
      '【パート】4つ打ちのキック、残響の大きいスネア（2・4拍）、16分で刻む歪んだのこぎり波ベース、歪んだシンセの主旋律、オルガンの和音、16分のアルペジオ。',
      '【決め所】ドロップの1拍目、4小節ごとの最後の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 0.9, decay: 0.32 },
      snare: { preset: 'snare', gain: 0.95, rev: 0.6, decay: 0.3 },
      hat: { preset: 'hat', gain: 0.4, pan: 0.2 },
      tom: { preset: 'tom', gain: 0.6, freq: 120, rev: 0.3 },
      bass: { preset: 'sawbass', gain: 0.36, base: 32, cutoff: 900, q: 6, duck: 0.35 },
      organ: { preset: 'organ', type: 'chord', gain: 0.35, low: 51, high: 68, bars: [1, 0.8, 0.3, 0.6, 0, 0.2], vib: 4, rev: 0.4, duck: 0.3 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.25, base: 68, cutHi: 3500, rev: 0.3, delay: 0.3, pan: -0.25 },
      lead: { preset: 'gtr', gain: 2.4, drive: 4, tone: 1800, rev: 0.3, delay: 0.2 },
    },
    patterns: {
      k4: D.k4,
      s24: D.s24,
      half: '. . . . . . . . X . . . . . . .',
      kHalf: 'x . . . . . . . . . x . . . . .',
      h8: D.h8,
      tom: '. . . . . . . . . . . . x . x x',
      bass: '1 1 8 1 1 1 8 1 1 1 8 1 1 1 8 1',
      bassL: held('1', 16),
      hold: held('x', 16),
      arp: '0 1 2 3 2 1 0 1 2 3 4 3 2 1 2 3',
      hookA: 'D#5 - - . D#5 . B4 - G#4 - - . B4 . D#5 . | C#5 - - . C#5 . A#4 - F#4 - - - A#4 - C#5 - | B4 - - . B4 . G#4 - E4 - - . G#4 . B4 . | A#4 - - . G4 . D#4 - G4 - - - A#4 - - -',
      hookB: 'G#5 - - . F#5 . D#5 - B4 - - . D#5 . G#5 . | F#5 - - . E5 . C#5 - A#4 - - . C#5 . F#5 . | E5 - - . D#5 . B4 - G#4 - - . B4 . E5 . | D#5 - - - - - . . G5 - - - - - - -',
      hookC: 'G#5 - - . F#5 . D#5 - B4 - - . D#5 . G#5 . | F#5 - - . E5 . C#5 - A#4 - - . C#5 . F#5 . | E5 - - . D#5 . B4 - G#4 - - . B4 . E5 . | D#5 - - . G5 . A#5 - - - - - - - - -',
    },
    sections: [
      { name: 'イントロ', type: 'intro', bars: 8, filter: [400, 5000], parts: { organ: 'hold', arp: 'arp', hat: 'h8' } },
      { name: 'ドロップ', type: 'drop', bars: 16, drop: true, parts: { kick: 'k4', snare: 's24', hat: 'h8', tom: 'tom', bass: 'bass', organ: 'hold', arp: 'arp', lead: ['hookA', 'hookB'] } },
      { name: 'ブレイク', type: 'break', bars: 8, parts: { organ: 'hold', bass: 'bassL', lead: 'hookA' } },
      { name: 'ビルド', type: 'build', bars: 8, build: true, gap: 1, parts: { organ: 'hold', arp: 'arp', kick: 'k4', bass: 'bass' } },
      { name: 'ドロップ2', type: 'drop', bars: 16, drop: true, parts: { kick: 'k4', snare: 's24', hat: 'h8', tom: 'tom', bass: 'bass', organ: 'hold', arp: 'arp', lead: ['hookA', 'hookB', 'hookA', 'hookC'] } },
      { name: 'ハーフタイム', type: 'drop', bars: 8, drop: true, impact: false, parts: { kick: 'kHalf', snare: 'half', hat: 'h8', bass: 'bassL', organ: 'hold', arp: 'arp', lead: 'hookB' } },
      { name: 'アウトロ', type: 'outro', bars: 4, filter: [5000, 300], parts: { organ: 'hold', arp: 'arp' } },
    ],
  });

  /* ---------------------------------------------------------
   * 38. アフターアワーズ（トラップ×ジャズ 144）
   * --------------------------------------------------------- */
  reg({
    id: 's38',
    no: 38,
    title: 'アフターアワーズ',
    genre: 'トラップ×ジャズ',
    bpm: 144,
    key: 'C#',
    mode: 'minor',
    free: true,
    prog: ['i9', 'iv9', 'bVImaj7', 'V7#9'], // C#m9→F#m9→Amaj7→G#7#9（2小節ずつ）
    chordLen: 2,
    unlock: { type: 'battleWins', n: 5 },
    memo: [
      '【雰囲気】閉店後のバーの屋上。ゆったりしたエレピのジャズの和音に、トラップの重い808と細かいハイハットを合わせる（EDM×ジャズ）。',
      '【構成（自由な構成）】イントロ8→ビルド8→ドロップ16→ブレイク8（ローファイ風・鼻歌のような旋律）→ビルド4→ドロップ2 16→アウトロ8',
      '【コード】一m9→四m9→♭六maj7→五7#9（C#m9→F#m9→Amaj7→G#7#9）を2小節ずつ。9の音を足した柔らかい響き。',
      '【主旋律の動機】エレピで弾く。2小節。G#-B-C#-D#-E ／ D#-B-G#。和音ごとに少しずつ上へ。',
      '　ドロップ2の最後だけ B5（最高音）へ跳ね上がる。',
      '【パート】ドロップ：キックと3拍目のクラップ（半分の速さ）、32分の連打を混ぜたハイハット、808ベース、テープのように揺れるエレピの和音、エレピの主旋律。ブレイクはブーンバップ風のドラム。',
      '【決め所】ドロップの1拍目、8小節ごとの最後の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 0.8, decay: 0.25 },
      clap: { preset: 'clap', gain: 0.75, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.7, rev: 0.2, decay: 0.15 },
      snap: { preset: 'snap', gain: 0.4, rev: 0.3, pan: 0.2 },
      hat: { preset: 'hat', gain: 0.4, decay: 0.03, pan: 0.25 },
      rim: { preset: 'rim', gain: 0.4, pan: -0.2, rev: 0.2 },
      bass: { preset: 'b808', gain: 0.24, base: 30, duck: 0.2 },
      keys: { preset: 'epiano', type: 'chord', gain: 0.3, low: 55, high: 74, trem: 3, warble: 8, rev: 0.3, duck: 0.15 },
      lead: { preset: 'epiano', gain: 0.6, bark: 2, rev: 0.3, delay: 0.25 },
      hum: { preset: 'vox', gain: 0.6, rev: 0.4, delay: 0.2 },
    },
    patterns: {
      kick: 'x . . . . . . . . . x . . . . . | x . . . . . . x . . x . . . . .',
      clap: '. . . . . . . . X . . . . . . .',
      hat: { s: 'x . . . x . . . x . x . x . . . x . . . x . x x x x x . x . x . | x . . . x . . . x . . . x . x . x . x x x x . . x . . . x x x x', div: 8 },
      boomK: 'x . . . . . . x . . x . . . . .',
      s24: D.s24,
      rim: '. . . . x . . . . . . . x . . x',
      bass: '1 - - - - - - . . . 1 - - - - - | 1 - - . . . 8 - - - . . 5 - - -',
      hold: held('x', 32),
      comp: 'x - - - - - . . . . x - - . . . | . . . . x - - - . . . . x - . .',
      hookA: 'G#4 - - . B4 - . C#5 - - . D#5 - E5 - - | D#5 - - . B4 - . G#4 - - - - - . . . | A4 - - . C#5 - . E5 - - . F#5 - G#5 - - | E5 - - . C#5 - . A4 - - - - - . . . | G#4 - - . A4 - . C#5 - - . E5 - G#5 - - | E5 - - . C#5 - . A4 - - - - - . . . | F#5 - - . D#5 - . C5 - - . B4 - G#4 - - | B4 - - . C5 - . D#5 - - - - - . . .',
      hookB: 'G#4 - - . B4 - . C#5 - - . D#5 - E5 - - | D#5 - - . B4 - . G#4 - - - - - . . . | A4 - - . C#5 - . E5 - - . F#5 - G#5 - - | E5 - - . C#5 - . A4 - - - - - . . . | G#4 - - . A4 - . C#5 - - . E5 - G#5 - - | E5 - - . C#5 - . A4 - - - - - . . . | F#5 - - . D#5 - . C5 - - . B4 - G#4 - - | B4 - - . D#5 - . F#5 - - . B5 - - - -',
      hum: 'G#3 - - . B3 - . C#4 - - . D#4 - E4 - - | D#4 - - . B3 - . G#3 - - - - - . . . | A3 - - . C#4 - . E4 - - . F#4 - G#4 - - | E4 - - . C#4 - . A3 - - - - - . . . | G#3 - - . A3 - . C#4 - - . E4 - G#4 - - | E4 - - . C#4 - . A3 - - - - - . . . | F#4 - - . D#4 - . C4 - - . B3 - G#3 - - | B3 - - . C4 - . D#4 - - - - - . . .',
    },
    sections: [
      { name: 'イントロ', type: 'intro', bars: 8, filter: [900, 7000], parts: { keys: 'hold', rim: 'rim', snap: 'clap' } },
      { name: 'ビルド', type: 'build', bars: 8, build: true, gap: 1, parts: { keys: 'comp', hat: 'hat', bass: 'bass', lead: 'hookA' } },
      { name: 'ドロップ', type: 'drop', bars: 16, drop: true, parts: { kick: 'kick', clap: 'clap', hat: 'hat', bass: 'bass', keys: 'comp', lead: 'hookA' } },
      { name: 'ブレイク（ローファイ）', type: 'break', bars: 8, parts: { kick: 'boomK', snare: 's24', rim: 'rim', keys: 'hold', hum: 'hum' } },
      { name: 'ビルド2', type: 'build', bars: 4, build: true, gap: 1, prog: ['bVImaj7', 'V7#9'], parts: { keys: 'comp', hat: 'hat', bass: 'bass' } },
      { name: 'ドロップ2', type: 'drop', bars: 16, drop: true, parts: { kick: 'kick', clap: 'clap', snap: 'clap', hat: 'hat', bass: 'bass', keys: 'comp', lead: ['hookA', 'hookB'] } },
      { name: 'アウトロ', type: 'outro', bars: 8, filter: [7000, 700], parts: { keys: 'hold', rim: 'rim' } },
    ],
  });

  /* ---------------------------------------------------------
   * 39. サイバーメイズ（ブレイクコア×IDM 196）
   * --------------------------------------------------------- */
  reg({
    id: 's39',
    no: 39,
    title: 'サイバーメイズ',
    genre: 'ブレイクコア×IDM',
    bpm: 196,
    key: 'D',
    mode: 'minor',
    form: 'long',
    prog: ['i', 'bIIadd9', 'bVI', 'v'], // Dm→E♭add9→B♭→Am
    chordLen: 2,
    unlock: { type: 'extraClears', n: 3 },
    memo: [
      '【雰囲気】電脳の迷路。崩れたブレイクビーツと、不規則に光るベルの音。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8',
      '【コード】一m→♭二add9→♭六→五m（Dm→E♭add9→B♭→Am）を2小節ずつ。',
      '【主旋律の動機】2小節。FMベルで F（長め）-A-F-D-E-F-A ／ F-A（伸ばし）-D-F。軸の音は F（E♭にadd9を付けて共通に）。',
      '　ドロップは A A A B A A A C。CでC6（最高音）。',
      '【パート】切り刻んだブレイクビーツ（ドロップ2は32分で崩れる）、16分のハイハット、リースベース、ベルの主旋律、パッド。',
      '【決め所】25・65小節目の1拍目、各8小節目のC6。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.15, decay: 0.22 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.12, decay: 0.15 },
      hat: { preset: 'hat', gain: 0.42, pan: 0.25, decay: 0.03 },
      tom: { preset: 'tom', gain: 0.3, freq: 320, pan: -0.3 },
      bass: { preset: 'reese', gain: 0.26, base: 26, duck: 0.35, cutoff: 1000, lfo: 1.2 },
      lead: { preset: 'bell', type: 'melody', gain: 0.58, rev: 0.35, delay: 0.25, decay: 0.8, ratio: 3.5 },
      pad: { preset: 'pad', type: 'chord', gain: 0.42, low: 53, high: 70, rev: 0.45 },
    },
    patterns: {
      k: 'x . . x . . . . . . x . . . . . | x . . . . . x . x . . . . x . .',
      s: '. . . . X . . . . o . . X . o . | . . . . X . . o . . X . . X o X',
      s32: { s: '. . . . . . . . X . . . . . o . . . X . X . . . X . X X X X X X | . . . . X . . . . . X . o . X . . . X . X . X . X X . X X X X X', div: 8 },
      h16: D.h16,
      tom: '. . . . . . . . . . . . . . x x | . . . . . . . . . . . . x x x x',
      bass: '1 - - - - - - - 5 - - - 8 - - - | 1 - - - - - - - 1 - - - 8 - 5 -',
      bassLong: held('1', 32),
      pad: held('x', 32),
      hookA: 'F5 - - . A5 . F5 . D5 . E5 F5 . A4 . . | F5 . . . . . A4 - - - . . D5 . F5 .',
      hookB: 'E5 - - . A5 . E5 . C5 . D5 E5 . A4 . . | E5 . . . . . A4 - - - . . C5 . E5 .',
      hookC: 'E5 - - . A5 . E5 . C5 . D5 E5 . A4 . . | E5 . . . . . A4 - C6 - - - - - - -',
    },
    sections: form('long', {
      intro: { filter: [500, 6000], parts: { pad: 'pad', hat: 'h16' } },
      build: { parts: (b) => ({ pad: 'pad', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h16', tom: 'tom', bass: 'bass', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', hat: 'h16', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', bass: 'bassLong' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's32', hat: 'h16', tom: 'tom', bass: 'bass', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 500], parts: { pad: 'pad', hat: 'h16' } },
    }),
  });

  /* ---------------------------------------------------------
   * 40. レイニー・ミュージアム（ディープハウス 120）
   * --------------------------------------------------------- */
  reg({
    id: 's40',
    no: 40,
    title: 'レイニー・ミュージアム',
    genre: 'ディープハウス',
    bpm: 120,
    key: 'F',
    mode: 'minor',
    form: 'std',
    prog: ['i7', 'iv7', 'bIIImaj7', 'bVII'], // Fm7→B♭m7→A♭maj7→E♭
    chordLen: 1,
    unlock: { type: 'charPlays', char: 'luna', n: 5 },
    memo: [
      '【雰囲気】雨の夜の美術館。落ち着いた4つ打ちと、エレクトリックピアノのようなやわらかい和音。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m7→四m7→♭三maj7→♭七（Fm7→B♭m7→A♭maj7→E♭）。',
      '【主旋律の動機】1小節。A♭（長め）-C-E♭-C-B♭-A♭。軸の音は A♭（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでG5（最高音）。',
      '【パート】4つ打ち、クラップ、シェイカー、深く低いベース、エレピ風の和音（FMベル）、やわらかいプラックの主旋律、パッド。',
      '【決め所】17・49小節目の1拍目、各4小節目のG5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 0.95 },
      clap: { preset: 'clap', gain: 0.7, rev: 0.35 },
      snare: { preset: 'snare', gain: 0.7 },
      shaker: { preset: 'shaker', gain: 0.4, pan: 0.3 },
      ohat: { preset: 'hat', gain: 0.26, decay: 0.2, hp: 7000, pan: -0.15 },
      bass: { preset: 'sawbass', gain: 0.56, base: 29, duck: 0.45, cutoff: 380 },
      stab: { preset: 'bell', type: 'chord', gain: 0.24, low: 56, high: 74, rev: 0.35, ratio: 1, index: 0.8, decay: 0.8, duck: 0.3 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.6, rev: 0.35, delay: 0.3, cutHi: 3000, release: 0.4 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 53, high: 70, rev: 0.45, duck: 0.3 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      shk: D.h16,
      hOff: D.hOff,
      bass: '1 . . . . . 1 . . 1 . . . . . .',
      stab: '. . x - . . . . . . x - . . . .',
      pad: held('x', 16),
      hookA: 'Ab4 - - . C5 . Eb5 - . C5 . Bb4 . Ab4 . .',
      hookB: 'G4 - - . Bb4 . Eb5 - . Bb4 . G4 . F4 . .',
      hookC: 'G4 - - . Bb4 . Eb5 - . G5 - - - - - .',
    },
    sections: form('std', {
      intro: { filter: [500, 3000], parts: { kick: 'k4', shaker: 'shk', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', shaker: 'shk', ohat: 'hOff', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', stab: 'stab' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', shaker: 'shk', ohat: 'hOff', bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { kick: 'k4', shaker: 'shk', stab: 'stab' } },
    }),
  });
})();
