/* =========================================================
 * songs/songs-02.js … 11〜20曲目
 * 全体計画：docs/song-plan.md。解禁条件の判定はフェーズ7で実装。
 * チップチューン以外の曲では、矩形波を主旋律・ベースに使わない（20曲目だけがチップチューン）。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;
  const { R, held, dropSeq, teaseSeq, form, D } = NLM.SongLib;
  const reg = (o) => NLM.Songs.register(Object.assign({ leadPart: 'lead' }, o));

  /* ---------------------------------------------------------
   * 11. ルーフトップ・グルーヴ（ハウス 124）
   * --------------------------------------------------------- */
  reg({
    id: 's11',
    no: 11,
    title: 'ルーフトップ・グルーヴ',
    genre: 'ハウス',
    bpm: 124,
    key: 'G',
    mode: 'major',
    form: 'std',
    prog: ['I', 'iii7', 'IVmaj7', 'V'], // G→Bm7→Cmaj7→D
    chordLen: 1,
    unlock: { type: 'songClear', song: 's01' },
    memo: [
      '【雰囲気】ビルの屋上パーティ。ピアノのような和音の刻みと、気持ちよく跳ねるベース。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一→三m7→四maj7→五（G→Bm7→Cmaj7→D）。',
      '【主旋律の動機】1小節。B（長め）-D-B-G-A-B-D-E。軸の音は B（G・Bm7・Cmaj7 に共通）。',
      '　ドロップは A A A B ×3＋A A A C。CでA5（最高音）。',
      '【パート】4つ打ち、クラップ、裏拍のオープンハット、シェイカー、跳ねるベース、ピアノ風の和音の刻み（FMベル）、プラックの主旋律、パッド。',
      '【決め所】17・49小節目の1拍目、各4小節目のF#5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.85, rev: 0.25 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.32, decay: 0.22, hp: 7000, pan: -0.15 },
      shaker: { preset: 'shaker', gain: 0.4, pan: 0.3 },
      bass: { preset: 'sawbass', gain: 0.4, base: 28, duck: 0.5, cutoff: 700 },
      stab: { preset: 'bell', type: 'chord', gain: 0.24, low: 59, high: 76, rev: 0.25, ratio: 2, index: 1.2, decay: 0.6, duck: 0.3 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.62, rev: 0.25, delay: 0.22, cutHi: 4200, release: 0.3 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.4, duck: 0.3 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      shk: D.h16,
      bass: '1 . . 1 . . 1 . . 1 . . 8 . 5 .',
      stab: '. . x . . . x x . . x . . . x .',
      pad: held('x', 16),
      hookA: 'B4 - . D5 . B4 G4 . A4 - . B4 . D5 E5 .',
      hookB: 'A4 - . D5 . A4 F#4 . A4 - . D5 . F#5 E5 .',
      hookC: 'A4 - . D5 . A4 F#4 . A4 - . F#5 . A5 - -',
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

  /* ---------------------------------------------------------
   * 12. ブロークン・サイン（エレクトロニカ／IDM・7拍子 86）
   * 1小節＝8分音符7つ（3.5拍・2＋2＋3のまとまり）。1小節のマスは14。
   * --------------------------------------------------------- */
  reg({
    id: 's12',
    no: 12,
    title: 'ブロークン・サイン',
    genre: 'エレクトロニカ／IDM（7拍子）',
    bpm: 86,
    beatsPerBar: 3.5,
    strong: [0, 2],
    key: 'G#',
    mode: 'minor',
    form: 'short',
    prog: ['i', 'bVI', 'bVIIsus2', 'iv'], // G#m→E→F#sus2→C#m
    chordLen: 1,
    unlock: { type: 'perfect', n: 500 },
    memo: [
      '【雰囲気】壊れかけたネオン看板が不規則に瞬く。7拍子（2＋2＋3）のつまずくようなリズム。',
      '【構成（短い形）】イントロ8→ビルド4（9〜12）→ドロップ16（13〜28）→ブレイク8→ビルド4（37〜40）→ドロップ2 8（41〜48）→アウトロ4',
      '【コード】一m→♭六→♭七sus2→四m（G#m→E→F#sus2→C#m）。',
      '【主旋律の動機】1小節（7拍子）。FMベルで G#（長め）-D#-B-G#-F#-D#。軸の音は G#（4つのコードすべてに含まれるよう F# に sus2）。',
      '　ドロップは A A A B ×3＋A A A C。CでC#6（最高音）を伸ばす。',
      '【パート】7拍子のキック（1・4拍目の裏）とスネア、細かく刻むハイハット、低いのこぎり波ベース、ベルの主旋律、14マスのアルペジオ、パッド。',
      '【決め所】13・41小節目の1拍目、各4小節目のC#の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.05 },
      snare: { preset: 'snare', gain: 0.95, rev: 0.3 },
      hat: { preset: 'hat', gain: 0.45, pan: 0.25, decay: 0.035 },
      tom: { preset: 'tom', gain: 0.5, freq: 300, pan: -0.3 },
      bass: { preset: 'sawbass', gain: 0.4, base: 28, duck: 0.35, cutoff: 600 },
      lead: { preset: 'bell', type: 'melody', gain: 0.55, rev: 0.4, delay: 0.3, decay: 1.0 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.24, base: 68, pan: 0.3, rev: 0.3, delay: 0.25, cutHi: 3200 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 71, rev: 0.45 },
    },
    patterns: {
      k: 'x . . . . . x . . . . x . .',
      s: '. . . . x . . . . . . . x .',
      h: 'x x . x x . x x . x . x x .',
      tom: '. . . . . . . . . . . . x x',
      bass: '1 - - . . . 5 - . . . 8 . .',
      pad: held('x', 14),
      arp: '0 1 2 0 1 2 3 2 1 0 1 2 3 4',
      hookA: 'G#5 - - . D#5 . B4 . G#5 . F#5 D#5 . .',
      hookB: 'G#5 - - . E5 . C#5 . G#5 . F#5 E5 . .',
      hookC: 'G#5 - - . E5 . C#5 . C#6 - - - - .',
    },
    sections: form('short', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', arp: 'arp', hat: 'h' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', tom: 'tom', bass: 'bass', arp: 'arp', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp', hat: 'h' } },
      build2: { parts: { pad: 'pad', arp: 'arp' } },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp' } },
    }),
  });

  /* ---------------------------------------------------------
   * 13. アリーウェイ・トラップ（トラップ 145）
   * --------------------------------------------------------- */
  reg({
    id: 's13',
    no: 13,
    title: 'アリーウェイ・トラップ',
    genre: 'トラップ',
    bpm: 145,
    key: 'G',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bIII', 'bVIIsus4', 'iv'], // Gm→B♭→Fsus4→Cm
    chordLen: 1,
    unlock: { type: 'plays', n: 5 },
    memo: [
      '【雰囲気】路地裏のネオン。重い808ベースと、細かく転がるハイハット。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭三→♭七sus4→四m（Gm→B♭→Fsus4→Cm）。',
      '【主旋律の動機】1小節。B♭-B♭-D-G-F-D の短い音で刻む。軸の音は B♭。',
      '　ドロップは A A A B ×3＋A A A C。CでC6（最高音）。',
      '【パート】半分の速さのビート（キック・3拍目スネア）、8分のハイハット＋4小節ごとに32分・3連符の連打、808ベース、スーパーソウの主旋律、パッド。',
      '【決め所】17・49小節目の1拍目、ハイハットの連打、各4小節目のG5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 0.9 },
      snare: { preset: 'snare', gain: 1.5, rev: 0.25 },
      clap: { preset: 'clap', gain: 0.7, rev: 0.25 },
      hat: { preset: 'hat', gain: 0.55, pan: 0.25, decay: 0.035 },
      bass: { preset: 'b808', gain: 0.24, base: 31, duck: 0.2 },
      lead: { preset: 'supersaw', gain: 0.44, detune: 18, cutoff: 6000, rev: 0.3, delay: 0.2, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.45 },
    },
    patterns: {
      k: 'x . . . . . . . . . x . . . . .',
      s: D.halfS,
      h8: D.h8,
      roll32: { s: R('x', 32), div: 8 },
      trip: { s: R('x', 24), div: 6 },
      bass: '1 - - - - - - - . . 1 - - - 5 -',
      pad: held('x', 16),
      hookA: 'Bb4 . . Bb4 . . D5 . G5 . . F5 . D5 . .',
      hookB: 'C5 . . C5 . . Eb5 . G5 . . F5 . Eb5 . .',
      hookC: 'C5 . . C5 . . Eb5 . G5 - - - C6 - - -',
    },
    sections: form('std', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', hat: 'h8' } },
      build: { parts: (b) => ({ pad: 'pad', hat: 'h8', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: ['h8', 'h8', 'h8', 'roll32', 'h8', 'h8', 'h8', 'trip'], bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', bass: 'bass' } },
      build2: { parts: { pad: 'pad', hat: 'h8' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', clap: 's', hat: ['h8', 'trip', 'h8', 'roll32'], bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', hat: 'h8' } },
    }),
  });

  /* ---------------------------------------------------------
   * 14. トワイライト・ドライブイン（シティポップ 112）
   * --------------------------------------------------------- */
  reg({
    id: 's14',
    no: 14,
    title: 'トワイライト・ドライブイン',
    genre: 'シティポップ',
    bpm: 112,
    key: 'Ab',
    mode: 'major',
    free: true,
    prog: ['IVmaj7', 'IVmaj7', 'III7', 'III7', 'vi7', 'vi7', 'v7', 'I7'], // D♭maj7→C7→Fm7→E♭m7・A♭7（半小節ずつ）
    chordLen: 0.5,
    unlock: { type: 'songClear', song: 's03' },
    memo: [
      '【雰囲気】夕暮れのドライブインシアター。80年代の都会的な歌もの（シティポップ）を、歌の代わりに声っぽいシンセで。',
      '【構成（自由な構成・歌ものの形）】イントロ4→Aメロ8→Bメロ8→サビ16→間奏（ソロ）8→ラストサビ16→アウトロ4',
      '【コード】サビ：四maj7→三7→六m7→五m7・一7（D♭maj7→C7→Fm7→E♭m7・A♭7）。都会的な定番の進行。',
      '　Aメロ：一maj7→六m7→二m7→五7sus4。Bメロ：二m7→三m7→四maj7→五7sus4 で上っていく。',
      '【主旋律の動機】サビは4小節。C-A♭-B♭-C-E♭-D♭-C ／ B♭-G-E-G-B♭-C。ラストサビの最後だけ B♭5（最高音）。',
      '【パート】16ビートのドラム（キックは1拍目・2拍目の裏・3拍目、スネアに小さな装飾音）、オクターブで跳ねるベース、16分で刻むギター、ストリングス、ホーン、声っぽいリード。間奏はベルの音のソロ。',
      '【決め所】サビの1拍目（クラッシュのみ・衝撃音なし）、ラストサビの最後の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, decay: 0.26, tune: 1.1 },
      snare: { preset: 'snare', gain: 0.75, rev: 0.3, decay: 0.2 },
      hat: { preset: 'hat', gain: 0.4, pan: 0.25, decay: 0.035 },
      bass: { preset: 'wbass', gain: 0.38, base: 32, cutoff: 1500 },
      gtr: { preset: 'gtr', type: 'chord', gain: 1.0, low: 57, high: 72, mute: true, pan: -0.35, tone: 1900 },
      pad: { preset: 'pad', type: 'chord', gain: 0.35, low: 55, high: 74, cutoff: 2200, rev: 0.4 },
      horn: { preset: 'horn', type: 'chord', gain: 0.65, low: 60, high: 79, rev: 0.2, pan: 0.2 },
      lead: { preset: 'vox', gain: 0.75, rev: 0.3, delay: 0.2 },
      solo: { preset: 'bell', gain: 0.55, ratio: 1, index: 1.4, decay: 0.9, rev: 0.3, delay: 0.2, pan: 0.15 },
    },
    patterns: {
      kick: 'x . . . . . x . x . . . . . . .',
      kickB: 'x . . . . . x . x . . x . . . .',
      snare: '. . . . X . . o . . o . X . . .',
      h16: D.h16,
      hOff: D.hOff,
      bass: '1 . 8 . . 1 . 8 1 . 8 . . 1 . 8',
      bassV: '1 - - . . . 1 . 5 - - . . . 8 .',
      cut: '. x . x x . x . . x . x x . x .',
      cutV: '. . x . . . x . . . x . . . x .',
      hold: held('x', 8),
      horn: 'x - . . . . . . . . . . . . . . | . . . . . . . . . . . . x - - -',
      verse: '. . Eb4 - Ab4 - G4 - Eb4 - - - C4 - Eb4 - | F4 - - - . . Ab4 - C5 - - - Ab4 - G4 - | F4 - - - Db5 - C5 - Bb4 - - - Ab4 - F4 - | Ab4 - - - - - - - . . . . . . . .',
      pre: 'Db5 - - - C5 - Bb4 - F4 - - - Ab4 - Bb4 - | Eb5 - - - D5 - C5 - G4 - - - Bb4 - C5 - | F5 - - - Eb5 - Db5 - Ab4 - - - C5 - Db5 - | Eb5 - - - - - - - Db5 - - - - - . .',
      sabiA: 'C5 - - - Ab4 - Bb4 C5 - - Eb5 - Db5 - C5 - | Bb4 - - - G4 - - . E4 - G4 - Bb4 - C5 - | Ab4 - - - C5 - Eb5 - F5 - - - Eb5 - C5 - | Db5 - - - Bb4 - Gb4 - C5 - - - - - . .',
      sabiB: 'F5 - - - Eb5 - Db5 C5 - - Ab4 - C5 - Eb5 - | E5 - - - C5 - Bb4 - G4 - - - Bb4 - C5 - | Ab5 - - - G5 - F5 - Eb5 - - - C5 - Eb5 - | Db5 - - - Eb5 - - - Ab4 - - - - - - -',
      sabiC: 'F5 - - - Eb5 - Db5 C5 - - Ab4 - C5 - Eb5 - | E5 - - - C5 - Bb4 - G4 - - - Bb4 - C5 - | Ab5 - - - G5 - F5 - Eb5 - - - C5 - Eb5 - | Bb5 - - - - - Gb5 - Ab5 - - - - - - -',
      soloA: 'Ab5 F5 C5 Ab4 F5 C5 Ab4 F4 C5 - Db5 - Eb5 - F5 - | G5 - E5 - C5 - Bb4 - E5 - - - G5 - - - | Ab5 - G5 F5 Eb5 - C5 - F5 - - - Ab5 - - - | Gb5 - F5 Eb5 Db5 - Bb4 - C5 - Eb5 - Gb5 - - -',
      soloB: 'F5 - - - Ab5 - - - C5 - - - Db5 - C5 - | Bb4 - - - C5 - E5 - G5 - - - E5 - C5 - | C5 - Eb5 - F5 - Ab5 - F5 - Eb5 - C5 - - - | Db5 - Eb5 - Gb5 - - - Eb5 - - - C5 - - -',
    },
    sections: [
      { name: 'イントロ', type: 'intro', bars: 4, parts: { kick: 'kick', snare: 'snare', hat: 'h16', bass: 'bass', gtr: 'cut', horn: 'horn' } },
      { name: 'Aメロ', type: 'break', bars: 8, prog: ['Imaj7', 'vi7', 'ii7', 'V7sus4'], chordLen: 1, parts: { kick: 'kick', snare: 'snare', hat: 'hOff', bass: 'bassV', gtr: 'cutV', lead: 'verse' } },
      { name: 'Bメロ', type: 'build', bars: 8, prog: ['ii7', 'iii7', 'IVmaj7', 'V7sus4'], chordLen: 1, parts: { kick: 'kickB', snare: 'snare', hat: 'h16', bass: 'bassV', gtr: 'cut', pad: 'hold', lead: 'pre' } },
      { name: 'サビ', type: 'drop', bars: 16, drop: true, impact: 'crash', parts: { kick: 'kick', snare: 'snare', hat: 'h16', bass: 'bass', gtr: 'cut', pad: 'hold', horn: 'horn', lead: ['sabiA', 'sabiB'] } },
      { name: '間奏', type: 'break', bars: 8, parts: { kick: 'kick', snare: 'snare', hat: 'h16', bass: 'bass', gtr: 'cut', solo: ['soloA', 'soloB'] } },
      { name: 'ラストサビ', type: 'drop', bars: 16, drop: true, impact: 'crash', parts: { kick: 'kick', snare: 'snare', hat: 'h16', bass: 'bass', gtr: 'cut', pad: 'hold', horn: 'horn', lead: ['sabiA', 'sabiB', 'sabiA', 'sabiC'] } },
      { name: 'アウトロ', type: 'outro', bars: 4, filter: [8000, 700], parts: { kick: 'kick', hat: 'hOff', bass: 'bassV', gtr: 'cutV', pad: 'hold' } },
    ],
  });

  /* ---------------------------------------------------------
   * 15. フォトン・トンネル（サイトランス 145）
   * --------------------------------------------------------- */
  reg({
    id: 's15',
    no: 15,
    title: 'フォトン・トンネル',
    genre: 'サイトランス',
    bpm: 145,
    key: 'D',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'bVI', 'bIImaj7', 'i'], // Dm→B♭→E♭maj7→Dm（フリジアン風の♭二）
    chordLen: 2,
    unlock: { type: 'battleWins', n: 1 },
    memo: [
      '【雰囲気】光のトンネルを高速で抜ける。キックの後ろで転がるベースと、キュイキュイ鳴るアシッド。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→♭六→♭二maj7→一m（Dm→B♭→E♭maj7→Dm）を2小節ずつ。♭二で妖しい響きに。',
      '【主旋律の動機】2小節の16分。アシッドで D-D-A-D-F-D-A-C-D ／ D（伸ばし）-A-F-A。軸の音は D。',
      '　ドロップは A A A B A A A C。CでD6（最高音）。',
      '【パート】4つ打ち、キックの後ろの3つの16分で鳴るベース（サイトランスの転がり）、裏拍のハイハット、アシッドの主旋律、パッド。',
      '【決め所】17・49小節目の1拍目、各8小節目のD6の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0, tune: 1.05, decay: 0.28 },
      clap: { preset: 'clap', gain: 0.6, rev: 0.3 },
      snare: { preset: 'snare', gain: 0.7 },
      ohat: { preset: 'hat', gain: 0.34, decay: 0.18, hp: 7500, pan: -0.15 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.25 },
      bass: { preset: 'sawbass', gain: 0.4, base: 26, duck: 0.7, cutoff: 650 },
      lead: { preset: 'acid', type: 'melody', gain: 0.6, rev: 0.25, delay: 0.3, q: 15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 53, high: 70, rev: 0.45, duck: 0.4 },
    },
    patterns: {
      k4: D.k4,
      clap: D.s24,
      hOff: D.hOff,
      h16: D.hEA,
      bass: '1 1 1 1 . 1 1 1 . 1 1 1 . 1 1 1',
      pad: held('x', 32),
      hookA: 'D5 . D5 A4 . D5 F5 . D5 . A4 . C5 . D5 . | D5 - - - . . A4 . . . F4 . . . A4 .',
      hookB: 'D5 . D5 A4 . D5 F5 . D5 . A4 . C5 . D5 . | F5 - - - . . D5 . . . A4 . . . C5 .',
      hookC: 'D5 . D5 A4 . D5 F5 . D5 . A4 . C5 . D5 . | F5 - - - . . A5 - D6 - - - - - - -',
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
   * 16. ジャンプ・ストリート（ジャージークラブ 140）
   * --------------------------------------------------------- */
  reg({
    id: 's16',
    no: 16,
    title: 'ジャンプ・ストリート',
    genre: 'ジャージークラブ',
    bpm: 140,
    key: 'A',
    mode: 'major',
    form: 'std',
    prog: ['I', 'V', 'vi7', 'IV'], // A→E→F#m7→D（一→五→六→四）
    chordLen: 1,
    unlock: { type: 'coopPlays', n: 2 },
    memo: [
      '【雰囲気】跳ねる商店街。3つ続けて鳴るキックが特徴のジャージークラブ。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一→五→六m7→四（A→E→F#m7→D）。',
      '【主旋律の動機】1小節。声っぽい音で E-E-C#-E-E-B-A-B-C# の短い音。軸の音は E。',
      '　ドロップは A A A B ×3＋A A A C。CでA5（最高音）を伸ばす。',
      '【パート】ジャージークラブのキック（タタタン）、2・4拍のクラップ、16分のハイハット、サブベース、裏拍の和音（プラック）、声っぽいリード。',
      '【決め所】17・49小節目の1拍目、3連続のキック、各4小節目のA5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95, tune: 1.1, decay: 0.25 },
      clap: { preset: 'clap', gain: 1.0, rev: 0.2 },
      snare: { preset: 'snare', gain: 0.7 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.25 },
      bass: { preset: 'sub', type: 'bass', gain: 0.24, base: 33, duck: 0.3 },
      stab: { preset: 'pluck', type: 'chord', gain: 0.28, low: 59, high: 76, rev: 0.25, duck: 0.35, cutHi: 3200 },
      lead: { preset: 'vox', gain: 0.55, rev: 0.28, delay: 0.2, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 56, high: 73, rev: 0.4 },
    },
    patterns: {
      k: 'x . . x . . x . . . x . x . . .',
      clap: D.s24,
      h16: D.hEA,
      bass: '1 - - 1 - - 1 - - - 1 - 1 - - -',
      stab: '. . x . . . x . . . x . . . x .',
      pad: held('x', 16),
      hookA: 'E5 . E5 . C#5 . E5 E5 . B4 . A4 . B4 C#5 .',
      hookB: 'F#5 . F#5 . D5 . F#5 F#5 . E5 . D5 . A4 D5 .',
      hookC: 'F#5 . F#5 . D5 . F#5 F#5 . A5 - - - - - .',
    },
    sections: form('std', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', hat: 'h16', stab: 'stab' } },
      build: { parts: (b) => ({ pad: 'pad', stab: 'stab', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', clap: 'clap', hat: 'h16', bass: 'bass', stab: 'stab', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', stab: 'stab', hat: 'h16' } },
      build2: { parts: { pad: 'pad', stab: 'stab' } },
      drop2: { parts: (b) => ({ kick: 'k', clap: 'clap', hat: 'h16', bass: 'bass', stab: 'stab', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', kick: 'k', hat: 'h16' } },
    }),
  });

  /* ---------------------------------------------------------
   * 17. レインウィンドウ（リキッド・ドラムンベース 172）
   * --------------------------------------------------------- */
  reg({
    id: 's17',
    no: 17,
    title: 'レインウィンドウ',
    genre: 'リキッド・ドラムンベース',
    bpm: 172,
    key: 'F',
    mode: 'major',
    form: 'long',
    prog: ['Imaj7', 'vi7', 'ii7', 'V7sus4'], // Fmaj7→Dm7→Gm7→C7sus4
    chordLen: 2,
    unlock: { type: 'songClear', song: 's09' },
    memo: [
      '【雰囲気】雨の窓辺から見る夜景。速いビートの上で、やわらかく歌う。',
      '【構成（長い形）】イントロ16→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク16→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8',
      '【コード】一maj7→六m7→二m7→五7sus4（Fmaj7→Dm7→Gm7→C7sus4）を2小節ずつ。',
      '【主旋律の動機】2小節。F（長め）-E-C-A-C-D ／ A-C-F（伸ばし）。軸の音は F（4つのコードすべてに含まれる）。',
      '　ドロップは A A A B A A A C。CでB♭5（最高音）。',
      '【パート】2ステップのドラム＋シェイカー、サブベース、やわらかいスーパーソウの主旋律、maj7のパッド、FMベルのアルペジオ。',
      '【決め所】25・65小節目の1拍目、各8小節目のB♭5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 1.1, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.2, decay: 0.2 },
      hat: { preset: 'hat', gain: 0.32, pan: 0.25 },
      shaker: { preset: 'shaker', gain: 0.45, pan: -0.3 },
      bass: { preset: 'sub', type: 'bass', gain: 0.22, base: 29, duck: 0.35 },
      lead: { preset: 'supersaw', gain: 0.42, detune: 10, cutoff: 2600, rev: 0.4, delay: 0.3, env: [0.03, 0.4, 0.8, 0.3], duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.42, low: 53, high: 72, rev: 0.45, duck: 0.3, attack: 0.6, release: 1.2 },
      arp: { preset: 'bell', type: 'arp', gain: 0.26, base: 65, pan: 0.3, rev: 0.35, delay: 0.3 },
    },
    patterns: {
      k: D.dnbK,
      s: D.dnbS,
      h8: D.h8,
      shk: '. x . x . x . x . x . x . x . x',
      bass: `1 ${R('-', 9)} 1 ${R('-', 5)} | 1 ${R('-', 7)} 5 - - - 8 - - -`,
      bassLong: held('1', 32),
      pad: held('x', 32),
      arp: '0 . 2 . 1 . 3 . 2 . 4 . 3 . 1 .',
      hookA: 'F5 - - - - - E5 - C5 . A4 - C5 - D5 - | . . A4 - C5 - F5 - - - - - . . . .',
      hookB: 'F5 - - - - - G5 - C5 . Bb4 - C5 - D5 - | . . Bb4 - C5 - G5 - - - - - . . . .',
      hookC: 'F5 - - - - - G5 - C5 . Bb4 - C5 - D5 - | . . Bb4 - C5 - G5 - Bb5 - - - - - - -',
    },
    sections: form('long', {
      intro: { filter: [400, 4000], parts: { pad: 'pad', arp: 'arp' } },
      build: { parts: (b) => ({ pad: 'pad', arp: 'arp', bass: 'bassLong', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h8', shaker: 'shk', bass: 'bass', pad: 'pad', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', arp: 'arp', shaker: 'shk' } },
      build2: { parts: { pad: 'pad', arp: 'arp', bass: 'bassLong' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h8', shaker: 'shk', bass: 'bass', pad: 'pad', arp: 'arp', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', arp: 'arp', hat: 'h8' } },
    }),
  });

  /* ---------------------------------------------------------
   * 18. グリッチ・ロボ（グリッチホップ 104）
   * --------------------------------------------------------- */
  reg({
    id: 's18',
    no: 18,
    title: 'グリッチ・ロボ',
    genre: 'グリッチホップ',
    bpm: 104,
    key: 'C',
    mode: 'minor',
    form: 'mid',
    swing: 0.12,
    prog: ['i', 'bVIIadd9', 'bVI', 'V7'], // Cm→B♭add9→A♭→G7
    chordLen: 1,
    unlock: { type: 'clears', n: 5 },
    memo: [
      '【雰囲気】故障したロボットがぎこちなく踊る。音を切り刻んだような連打と、ゆっくりうなるベース。',
      '【構成（中くらい）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド4（41〜44）→ドロップ2 16（45〜60）→アウトロ4',
      '【コード】一m→♭七add9→♭六→五7（Cm→B♭add9→A♭→G7）。最後のG7で強く引き戻す。',
      '【主旋律の動機】1小節。C-C-C（切り刻み）-E♭-G-C-B♭-G-B♭。軸の音は C。',
      '　ドロップは A A A B ×3＋A A A C。CでB5（最高音）。',
      '【パート】跳ねたヒップホップのビート（キック1・3拍目の裏、スネア2・4拍）、ワブルベース（2拍に1回うなる）、プラックの主旋律、パッド。',
      '【決め所】17・45小節目の1拍目、各4小節目のG7。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.25, tune: 0.95 },
      snare: { preset: 'snare', gain: 1.1, rev: 0.25 },
      hat: { preset: 'hat', gain: 0.5, pan: 0.25 },
      bass: { preset: 'wobble', gain: 0.28, base: 28, cutoff: 260, depth: 1300, wob: 0.5, duck: 0.3 },
      lead: { preset: 'pluck', type: 'melody', gain: 0.6, rev: 0.25, delay: 0.25, cutHi: 4500 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 55, high: 72, rev: 0.45 },
    },
    patterns: {
      k: 'x . . . . . . . . . x . . . . .',
      s: D.s24,
      h: '. x . x . x x x . x . x . x x x',
      bass: '1 - - - - - - - 1 - - - 5 - 8 -',
      pad: held('x', 16),
      hookA: 'C5 C5 C5 . Eb5 . G5 . C5 - . Bb4 . G4 Bb4 .',
      hookB: 'B4 B4 B4 . D5 . F5 . B4 - . G4 . D5 F5 .',
      hookC: 'B4 B4 B4 . D5 . F5 . G5 - - - B5 - - .',
    },
    sections: form('mid', {
      intro: { filter: [600, 4000], parts: { pad: 'pad', hat: 'h' } },
      build: { parts: (b) => ({ pad: 'pad', hat: 'h', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { pad: 'pad', hat: 'h' } },
      build2: { parts: { pad: 'pad' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', pad: 'pad', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 500], parts: { pad: 'pad', hat: 'h' } },
    }),
  });

  /* ---------------------------------------------------------
   * 19. ディープアンダー（リディム 150）
   * --------------------------------------------------------- */
  reg({
    id: 's19',
    no: 19,
    title: 'ディープアンダー',
    genre: 'リディム',
    bpm: 150,
    key: 'Eb',
    mode: 'minor',
    form: 'std',
    prog: ['i', 'i', 'bVI', 'bVII'], // E♭m→E♭m→C♭→D♭
    chordLen: 2,
    unlock: { type: 'hardClears', n: 1 },
    memo: [
      '【雰囲気】重低音が鳴り続ける地下。音数をしぼり、同じベースの形を何度もくり返す。',
      '【構成（基本形）】イントロ8→ビルド8→ドロップ16（17〜32）→ブレイク8→ビルド8→ドロップ2 16（49〜64）→アウトロ8',
      '【コード】一m→一m→♭六→♭七（E♭m→E♭m→C♭→D♭）を2小節ずつ。',
      '【主旋律の動機】2小節。FMベルで E♭-G♭-E♭-B♭ ／ G♭（伸ばし）。間を大きく。軸の音は G♭（E♭m と C♭ に共通）。',
      '　ドロップは A A A B A A A C。CでA♭5（最高音）。',
      '【パート】半分の速さのビート、3連っぽく刻むワブルベース（1拍に1.5回）、サブベース、ベルの主旋律。ドロップ2はワブルが倍の速さ。',
      '【決め所】17・49小節目の1拍目、各8小節目のA♭5。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 1.0, tune: 0.9 },
      snare: { preset: 'snare', gain: 1.6, rev: 0.25 },
      hat: { preset: 'hat', gain: 0.4, pan: 0.2 },
      bass: { preset: 'wobble', gain: 0.42, base: 27, cutoff: 240, depth: 1500, wob: 1.5, duck: 0.3 },
      bass2: { preset: 'wobble', type: 'bass', gain: 0.42, base: 27, cutoff: 260, depth: 1900, wob: 3, duck: 0.3 },
      sub: { preset: 'sub', type: 'bass', gain: 0.22, base: 27, duck: 0.4 },
      lead: { preset: 'bell', type: 'melody', gain: 0.56, rev: 0.4, delay: 0.3, decay: 1.4, ratio: 1.5 },
      pad: { preset: 'pad', type: 'chord', gain: 0.45, low: 54, high: 70, rev: 0.45 },
    },
    patterns: {
      k: D.halfK,
      s: D.halfS,
      h: D.hOff,
      wob: '1 . . 1 . . 1 . . 1 . . 1 . 1 .',
      sub: held('1', 16),
      pad: held('x', 32),
      hookA: 'Eb5 . . . . . Gb5 . Eb5 . . . . . Bb4 . | Gb5 - - - . . . . . . . . . . . .',
      hookB: 'Db5 . . . . . F5 . Db5 . . . . . Ab4 . | F5 - - - . . . . . . . . . . . .',
      hookC: 'Db5 . . . . . F5 . Db5 . . . . . Ab4 . | F5 - - - . . . . Ab5 - - - - - - -',
    },
    sections: form('std', {
      intro: { filter: [400, 3000], parts: { pad: 'pad', hat: 'h' } },
      build: { parts: (b) => ({ pad: 'pad', sub: 'sub', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'wob', sub: 'sub', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: (b) => ({ pad: 'pad', lead: teaseSeq(b, 2, 'hookA', 'hookB') }) },
      build2: { parts: { pad: 'pad', sub: 'sub' } },
      drop2: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass2: 'wob', sub: 'sub', lead: dropSeq(b, 2, 'hookA', 'hookB', 'hookC') }) },
      outro: { filter: [8000, 400], parts: { pad: 'pad', hat: 'h' } },
    }),
  });

  /* ---------------------------------------------------------
   * 20. ドットナイト（チップチューン 92）
   * --------------------------------------------------------- */
  reg({
    id: 's20',
    no: 20,
    title: 'ドットナイト',
    genre: 'チップチューン',
    bpm: 92,
    key: 'G',
    mode: 'major',
    form: 'short',
    fxStyle: 'chip',
    prog: ['I', 'vi', 'ii7', 'V'], // G→Em→Am7→D（一→六→二→五）
    chordLen: 1,
    unlock: { type: 'charPlays', char: 'kirari', n: 3 },
    memo: [
      '【雰囲気】ドット絵で描いた夜の街。ゆったりしたテンポのピコピコ音。（50曲中、チップチューンは2曲だけ）',
      '【構成（短い形）】イントロ8→ビルド4（9〜12）→ドロップ16（13〜28）→ブレイク8→ビルド4（37〜40）→ドロップ2 8（41〜48、半音上に転調）→アウトロ4（転調したまま）',
      '【コード】一→六m→二m7→五（G→Em→Am7→D）。',
      '【主旋律の動機】1小節。矩形波で G（長め）-B-G-D-E-G-A-G。軸の音は G（Am に7thを付けて共通に）。',
      '　ドロップは A A A B ×3＋A A A C。CでD6（最高音）。ドロップ2は半音上（ゲーム音楽の定番の転調）。',
      '【パート】矩形波（25%）の主旋律、三角波のベース、32分の高速アルペジオ、細い矩形波の裏拍の和音、ノイズのドラム。',
      '【決め所】13・41小節目の1拍目、各4小節目のA5の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'chipKick', gain: 1.7 },
      snare: { preset: 'chipSnare', gain: 1.2 },
      hat: { preset: 'chipHat', gain: 0.7 },
      bass: { preset: 'tri', gain: 0.39, base: 36 },
      lead: { preset: 'pulse', gain: 0.95, duty: 0.25, rev: 0.12, delay: 0.15 },
      chords: { preset: 'pulse', type: 'chord', gain: 0.62, duty: 0.125, low: 59, high: 76, sustain: 0.5, vibrato: 0, level: 0.12, pan: -0.2 },
      arp: { preset: 'pulse', type: 'arp', gain: 0.22, duty: 0.5, base: 67, pan: 0.2, vibrato: 0, level: 0.15, sustain: 0.6 },
    },
    patterns: {
      k: 'x . . . . . . . x . x . . . . .',
      s: D.s24,
      h: D.h8,
      bass: '1 . 8 . 1 . 8 . 1 . 8 . 1 . 8 .',
      bassLong: held('1', 16),
      chOff: '. . x . . . x . . . x . . . x .',
      chLong: held('x', 16),
      arp32: { s: '0 1 2 3', div: 8 },
      hookA: 'G5 - . B5 . G5 D5 . E5 . G5 . A5 . G5 .',
      hookB: 'F#5 - . A5 . F#5 D5 . E5 . F#5 . A5 . F#5 .',
      hookC: 'F#5 - . A5 . F#5 D5 . A5 - - - D6 - - .',
    },
    sections: form('short', {
      intro: { parts: { arp: 'arp32', bass: 'bass', hat: 'h' } },
      build: { parts: (b) => ({ arp: 'arp32', bass: 'bass', chords: 'chOff', lead: teaseSeq(b, 1, 'hookA', 'hookB') }) },
      drop: { parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', chords: 'chOff', arp: 'arp32', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      brk: { parts: { chords: 'chLong', arp: 'arp32', bass: 'bassLong' } },
      build2: { parts: { arp: 'arp32', bass: 'bass', chords: 'chOff' } },
      drop2: { transpose: 1, parts: (b) => ({ kick: 'k', snare: 's', hat: 'h', bass: 'bass', chords: 'chOff', arp: 'arp32', lead: dropSeq(b, 1, 'hookA', 'hookB', 'hookC') }) },
      outro: { transpose: 1, filter: [12000, 600], parts: { arp: 'arp32', bass: 'bass', chords: 'chLong' } },
    }),
  });
})();
