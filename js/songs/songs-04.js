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
   * 33. ハーバー・ドーン（プログレッシブハウス 128）
   * --------------------------------------------------------- */
  reg({
    id: 's33',
    no: 33,
    title: 'ハーバー・ドーン',
    genre: 'プログレッシブハウス',
    bpm: 128,
    key: 'F#',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bIII', 'bVII6', 'iv7'], // F#m→A→E6→Bm7
    chordLen: 1,
    unlock: { type: 'plays', n: 25 },
    memo: [
      '【雰囲気】夜明け前の港。少しずつ音が重なって、ゆっくり明るくなっていく。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭三→♭七6→四m7（F#m→A→E6→Bm7）。',
      '【主旋律の動機】1小節。C#（1拍）-E-F#-C#-B-A-B。軸の音は C#（Eに6thを付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでD6（最高音）。',
      '【パート】4つ打ち、クラップ、裏拍のオープンハット、転がるのこぎり波ベース、余韻の長いプラック、パッド、アルペジオ。',
      '【決め所】17・49小節目の1拍目、各4小節目のB5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.75, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.3, decay: 0.22, hp: 7000, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.2 },
      bass: { preset: 'sawbass', gain: 0.38, base: 30, duck: 0.5, cutoff: 750 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.62, rev: 0.4, delay: 0.32, cutHi: 4500, release: 0.45 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.22, base: 66, pan: 0.25, rev: 0.3, delay: 0.3, cutHi: 2800 },
      pad: { preset: 'pad', type: 'chord', gain: 0.48, low: 54, high: 71, rev: 0.45, duck: 0.35 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 . 1 1 . 1 1 . 1 . 1 1 . 1 1 .',
      pad: held('x', 16),
      arp: '0 2 1 3 0 2 1 3 0 2 1 3 2 1 0 1',
      hookA: 'C#5 - - - E5 . F#5 . C#5 . B4 . A4 . B4 .',
      hookB: 'D5 - - - F#5 . A5 . D5 . C#5 . B4 . A4 .',
      hookC: 'D5 - - - F#5 . A5 . B5 - - - D6 - - -',
    },
    sections: form('std', {
      intro: { filter: [400, 3000], parts: { kick: 'k4', ohat: 'hOff', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp' } },
      build2: { parts: { pad: 'pad', arp: 'arp', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', arp: 'arp' } },
    }),
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
   * 36. ハラジュク・ナイト（ジャージークラブ×フューチャーベース 140）
   * --------------------------------------------------------- */
  reg({
    id: 's36',
    no: 36,
    title: 'ハラジュク・ナイト',
    genre: 'ジャージークラブ×フューチャーベース',
    bpm: 140,
    key: 'B',
    mode: 'major',
    form: 'std',
    prog: ['I', 'iii', 'vi', 'IV'], // B→D#m→G#m→E
    chordLen: 1,
    unlock: { type: 'coopPlays', n: 10 },
    memo: [
      '【雰囲気】夜の原宿のにぎわい。跳ねるジャージークラブのキックに、フューチャーベースのきらめく和音。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32：ジャージークラブ）→ブレイク8→ビルド8→ドロップ2 16（49〜64：フューチャーベース）→アウトロ8',
      '【コード】一→三m→六m→四（B→D#m→G#m→E）。',
      '【主旋律の動機】1小節。声っぽい音で D#-D#-F#-D#-D#-C#-B-C#-D# の短い音。軸の音は D#。',
      '　ドロップは A A A B ×3＋A A A C。CでB5（最高音）を伸ばす。',
      '【パート】ドロップ1：3連続のキック、クラップ、サブベース、裏拍の和音。ドロップ2：半分の速さのビート、スーパーソウの和音の刻み。',
      '【決め所】17・49小節目の1拍目、3連続のキック、各4小節目のB5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.1, decay: 0.25 },
      clap: { preset: 'clap', gain: 1.0, rev: 0.2 },
      snare: { preset: 'snare', gain: 1.4, rev: 0.3 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.25 },
      bass: { preset: 'sub', type: 'bass', gain: 0.24, base: 28, duck: 0.35 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.26, low: 59, high: 76, rev: 0.25, duck: 0.35, cutHi: 3200 },
      stab2: { preset: 'supersaw', type: 'chord', gain: 0.32, low: 61, high: 78, rev: 0.3, duck: 0.65, env: [0.003, 0.2, 0.4, 0.1], cutoff: 6000 },
      lead: { preset: 'vox', gain: 0.55, rev: 0.28, delay: 0.2, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 56, high: 73, rev: 0.4 },
    },
    patterns: {
      jk: 'x . . x . . x . . . x . x . . .',
      clap: D.s24,
      h16: D.hEA,
      hk: D.halfK,
      hs: D.halfS,
      bass: '1 - - 1 - - 1 - - - 1 - 1 - - -',
      bass2: '1 - - - - - - - - - 5 - - - - -',
      stab: '. . x . . . x . . . x . . . x .',
      stab2: 'x . . x . . x . . x . . x . x .',
      pad: held('x', 16),
      hookA: 'D#5 . D#5 . F#5 . D#5 D#5 . C#5 . B4 . C#5 D#5 .',
      hookB: 'E5 . E5 . G#5 . E5 E5 . D#5 . B4 . C#5 E5 .',
      hookC: 'E5 . E5 . G#5 . E5 E5 . B5 - - - - - .',
    },
    sections: form('std', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', hat: 'h16', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'jk', clap: 'clap', hat: 'h16', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab' } },
      build2: { parts: { pad: 'pad', stab: 'stab' } },
      drop2: { parts: (b) => ({ kick: 'hk', snare: 'hs', hat: 'h16', bass: 'bass2', stab2: 'stab2', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', kick: 'jk', hat: 'h16' } },
    }),
  });

  /* ---------------------------------------------------------
   * 37. ラストステージ・ユーフォリア（ハードスタイル・ユーフォリック 150）
   * --------------------------------------------------------- */
  reg({
    id: 's37',
    no: 37,
    title: 'ラストステージ・ユーフォリア',
    genre: 'ハードスタイル（ユーフォリック）',
    bpm: 150,
    key: 'E',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVImaj7', 'bIII6', 'bVII'], // Em→Cmaj7→G6→D
    chordLen: 1,
    unlock: { type: 'hardClears', n: 5 },
    memo: [
      '【雰囲気】野外フェスの最後のステージ。歪んだキックの上で、泣きのメロディを大きく歌う。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭六maj7→♭三6→♭七（Em→Cmaj7→G6→D）。',
      '【主旋律の動機】1小節。長い音で E（1拍）-G-B-E（1拍）-D-B。軸の音は E（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでD6（最高音）を2拍伸ばす。',
      '【パート】歪んだ4つ打ちキック、クラップ、裏拍で鳴るベース、太いスーパーソウ、パッド。',
      '【決め所】17・49小節目の1拍目、各4小節目の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'hardkick', gain: 0.9 },
      clap: { preset: 'clap', gain: 0.8, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.8 },
      ohat: { preset: 'hat', gain: 0.28, decay: 0.2, hp: 7000, pan: -0.15 },
      bass: { preset: 'sawbass', gain: 0.34, base: 28, duck: 0.65, cutoff: 1200 },
      lead: { preset: 'supersaw', gain: 0.5, detune: 34, cutoff: 8500, rev: 0.4, delay: 0.2, duck: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.48, low: 52, high: 69, rev: 0.45, duck: 0.35 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      bass: '1 . 1 1 . . 1 1 . . 1 1 . . 1 1',
      pad: held('x', 16),
      hookA: 'E5 - - - G5 - B5 - E5 - - - D5 - B4 -',
      hookB: 'D5 - - - F#5 - A5 - D5 - - - A4 - F#4 -',
      hookC: 'D5 - - - F#5 - A5 - D6 - - - - - - -',
    },
    sections: form('std', {
      intro: { filter: [400, 4000], parts: { pad: 'pad', kick: 'k4' } },
      build: { parts: (b) => ({ pad: 'pad', kick: 'k4', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', kick: 'k4' } },
      drop2: { parts: (b) => ({ kick: 'k4', clap: 'clap', ohat: 'hOff', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [9000, 400], parts: { kick: 'k4', pad: 'pad' } },
    }),
  });

  /* ---------------------------------------------------------
   * 38. バックステージ（トラップ・フェスティバル 148）
   * --------------------------------------------------------- */
  reg({
    id: 's38',
    no: 38,
    title: 'バックステージ',
    genre: 'トラップ（フェスティバル）',
    bpm: 148,
    key: 'C#',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVI', 'bIII', 'v'], // C#m→A→E→G#m
    chordLen: 1,
    unlock: { type: 'battleWins', n: 5 },
    memo: [
      '【雰囲気】フェスのステージ裏。出番直前の緊張と興奮。大きなリードと重い808。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭六→♭三→五m（C#m→A→E→G#m）。',
      '【主旋律の動機】1小節。C#-E-G#-E-C#-B の短い音で駆け上がって戻る。軸の音は E（はじめの3つのコードに共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでD#6（最高音）。',
      '【パート】半分の速さのビート、8分＋32分・3連のハイハット、808ベース、太いスーパーソウ、パッド。',
      '【決め所】17・49小節目の1拍目、ハイハットの連打、各4小節目のB5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 0.9 },
      snare: { preset: 'snare', gain: 1.5, rev: 0.25 },
      clap: { preset: 'clap', gain: 0.8, rev: 0.25 },
      hat: { preset: 'hat', gain: 0.45, pan: 0.25, decay: 0.035 },
      bass: { preset: 'b808', gain: 0.22, base: 30, duck: 0.2 },
      lead: { preset: 'supersaw', gain: 0.48, detune: 30, cutoff: 8000, rev: 0.3, delay: 0.18, duck: 0.2 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 71, rev: 0.45 },
    },
    patterns: {
      k: 'x . . . . . . . . . x . . . . .',
      s: D.halfS,
      h8: D.h8,
      roll32: { s: R('x', 32), div: 8 },
      trip: { s: R('x', 24), div: 6 },
      bass: '1 - - - - - - - . . 1 - - - 5 -',
      pad: held('x', 16),
      hookA: 'C#5 . . E5 . . G#5 . E5 . . C#5 . B4 . .',
      hookB: 'B4 . . D#5 . . G#5 . D#5 . . B4 . A#4 . .',
      hookC: 'B4 . . D#5 . . G#5 . B5 - - - D#6 - - -',
    },
    sections: form('std', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', hat: 'h8' } },
      build: { parts: (b) => ({ pad: 'pad', hat: 'h8', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: ['h8', 'h8', 'h8', 'roll32', 'h8', 'h8', 'h8', 'trip'], bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', hat: 'h8' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', clap: 's', hat: ['h8', 'trip', 'h8', 'roll32'], bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', hat: 'h8' } },
    }),
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
