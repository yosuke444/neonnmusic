/* =========================================================
 * songs/proto.js … 試作曲3曲（フェーズ2）
 * 音楽エンジンの確認用。ジャンル・テンポ・調・音色を互いに大きく変えてある。
 * 書き方は js/music.js の先頭の説明を参照。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;

  // 記号の繰り返し・伸ばしを短く書くための関数
  const R = (tok, n) => Array(n).fill(tok).join(' ');
  const held = (first, steps) => first + ' ' + R('-', steps - 1);

  /* ---------------------------------------------------------
   * 試作1：シグナル・ブルーム（フューチャーハウス）
   * --------------------------------------------------------- */
  // 1小節の動機 ×16小節：A A A B を3回、最後だけ A A A C（最高音はCの中で1回）
  const SEQ1 = [].concat(R('hookA hookA hookA hookB', 3).split(' '), ['hookA', 'hookA', 'hookA', 'hookC']);
  NLM.Songs.register({
    id: 'proto-01',
    proto: true,
    title: 'シグナル・ブルーム',
    genre: 'フューチャーハウス',
    bpm: 126,
    key: 'G',
    mode: 'minor',
    leadPart: 'lead',
    prog: ['i', 'bVI', 'bIII', 'bVII'], // Gm→E♭→B♭→F（B♭長調から見ると 六→四→一→五）
    chordLen: 1,
    memo: [
      '【雰囲気】夜の交差点で信号が一斉に灯る。跳ねるベースと明るいリードで踊れる4つ打ち。',
      '【構成】イントロ8（1〜8）→ビルド8（9〜16）→ドロップ16（17〜32）→ブレイク8（33〜40）→ビルド8（41〜48）→ドロップ2 16（49〜64）→アウトロ8（65〜72）',
      '【コード】一m→♭六→♭三→♭七（Gm→E♭→B♭→F）を1小節ずつ。',
      '【主旋律の動機】1小節。D-D-B♭（裏拍から伸ばす）-C-D-F-D-C。強拍は短い音にして、どのコードの上でも濁らない形。',
      '　ドロップは「A A A B ／ A A A C」。Cの最後で最高音C6を1回だけ使う。',
      '【パート】イントロ：キック・裏拍オープンハット・パッド・アルペジオ（フィルターが徐々に開く）',
      '　ビルド：キック・パッド・アルペジオ・プラックで動機の予告。スネア連打・上昇音・フィルター開放・直前1拍の無音。',
      '　ドロップ：キック・クラップ・ハット・跳ねるベース・スーパーソウ＋プラックの主旋律。キックでベースとリードを沈める（サイドチェイン）。',
      '　ドロップ2：ベースの動きを細かくし、裏拍の和音の刻みを追加。',
      '【決め所（キーノーツ候補）】17・49小節目の1拍目（ドロップ頭）、24・32・56・64小節目の主旋律の伸ばし。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.95 },
      clap: { preset: 'clap', gain: 0.9, rev: 0.18 },
      snare: { preset: 'snare', gain: 0.5 },
      hat: { preset: 'hat', gain: 0.42, pan: 0.2 },
      ohat: { preset: 'hat', gain: 0.24, decay: 0.22, hp: 7000, pan: -0.15 },
      bass: { preset: 'fhbass', gain: 0.44, base: 28, duck: 0.55 },
      lead: { preset: 'supersaw', gain: 0.42, rev: 0.22, delay: 0.12, duck: 0.3, cutoff: 6500 },
      pluck: { preset: 'pluck', type: 'melody', gain: 0.35, rev: 0.2, delay: 0.18, duck: 0.25, cutHi: 6000 },
      pad: { preset: 'pad', type: 'chord', gain: 0.5, low: 55, high: 72, rev: 0.35, duck: 0.5 },
      arp: { preset: 'pluck', type: 'arp', gain: 0.28, base: 67, pan: -0.25, rev: 0.25, delay: 0.25, duck: 0.3, cutHi: 3500 },
      stab: { preset: 'supersaw', type: 'chord', gain: 0.3, low: 58, high: 76, rev: 0.2, duck: 0.5, env: [0.003, 0.15, 0.3, 0.08], cutoff: 5000 },
    },
    patterns: {
      k4: 'x . . . x . . . x . . . x . . .',
      clap: '. . . . x . . . . . . . x . . .',
      hOff: '. . x . . . x . . . x . . . x .',
      h16: '. o . o . o . o . o . o . o . o',
      bassA: '1 . 8 . . . 8 . 1 . 8 . . . 8 5',
      bassB: '1 . 8 . 1 8 . 8 . . 8 . 1 8 5 8',
      bassOut: '1 - . . . . 8 . 1 - . . . . 8 .',
      hookA: 'D5 . D5 Bb4 - . C5 - D5 . F5 - D5 - C5 -',
      hookB: 'C5 . C5 A4 - . C5 - F5 . A5 - G5 - F5 -',
      hookC: 'C5 . C5 A4 - . C5 - F5 . A5 - C6 - - -',
      padBar: held('x', 16),
      arpA: '0 2 1 3 2 4 3 1 0 2 1 3 2 4 3 1',
      stabOff: '. . x - . . x - . . x - . . x -',
    },
    sections: [
      { name: 'イントロ', type: 'intro', bars: 8, filter: [500, 3500], parts: { kick: 'k4', ohat: 'hOff', pad: 'padBar', arp: 'arpA' } },
      { name: 'ビルド', type: 'build', bars: 8, build: true, gap: 1, parts: { kick: 'k4', pad: 'padBar', arp: 'arpA', pluck: ['hookA', 'hookA', 'hookA', 'hookB'] } },
      { name: 'ドロップ', type: 'drop', bars: 16, drop: true, parts: { kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bassA', lead: SEQ1, pluck: SEQ1 } },
      { name: 'ブレイク', type: 'break', bars: 8, parts: { pad: 'padBar', arp: 'arpA', ohat: 'hOff', pluck: ['hookA', 'hookA', 'hookA', 'hookB'] } },
      { name: 'ビルド2', type: 'build', bars: 8, build: true, gap: 1, parts: { kick: 'k4', pad: 'padBar', arp: 'arpA', pluck: ['hookA', 'hookA', 'hookA', 'hookB'] } },
      { name: 'ドロップ2', type: 'drop', bars: 16, drop: true, parts: { kick: 'k4', clap: 'clap', ohat: 'hOff', hat: 'h16', bass: 'bassB', lead: SEQ1, pluck: SEQ1, stab: 'stabOff' } },
      { name: 'アウトロ', type: 'outro', bars: 8, filter: [9000, 400], parts: { kick: 'k4', ohat: 'hOff', bass: 'bassOut', pad: 'padBar' } },
    ],
  });

  /* ---------------------------------------------------------
   * 試作2：アフターレイン・ハイウェイ（リキッド・ドラムンベース）
   * --------------------------------------------------------- */
  const SEQ2 = ['hookA', 'hookA', 'hookA', 'hookB', 'hookA', 'hookA', 'hookA', 'hookC'];
  NLM.Songs.register({
    id: 'proto-02',
    proto: true,
    title: 'アフターレイン・ハイウェイ',
    genre: 'ドラムンベース（リキッド）',
    bpm: 174,
    key: 'D',
    mode: 'major',
    leadPart: 'lead',
    prog: ['IVmaj9', 'V6', 'iii7', 'vi7'], // Gmaj9→A6→F#m7→Bm7（四→五→三→六）
    chordLen: 2,
    memo: [
      '【雰囲気】雨上がりの高速道路。濡れた路面に流れるテールランプ。速いビートの上に、ゆったり歌う声のようなリード。',
      '【構成】イントロ8（1〜8）→イントロ2 8（9〜16）→ビルド8（17〜24）→ドロップ16（25〜40）→ブレイク8（41〜48）→ブレイク2 8（49〜56）→ビルド8（57〜64）→ドロップ2 16（65〜80）→アウトロ8（81〜88）',
      '【コード】四maj9→五6→三m7→六m7（Gmaj9→A6→F#m7→Bm7）を2小節ずつ。7th・9th付きで柔らかく。',
      '【主旋律の動機】2小節。F#（長く）-E-A（長く）-F#-E ／ 休み-B-D-E-F#（長く）。',
      '　強拍の長い音は F# と A。4つのコードすべてに含まれるように和音を選んだ（Gmaj9・A6 にも F#・A がある）。',
      '　ドロップは「A A A B ／ A A A C」（1つが2小節）。Cの最後で最高音D6を1回だけ。',
      '【パート】イントロ：パッド・FMベルのアルペジオ（フィルターが開く）→イントロ2でハイハットと低いベース。',
      '　ビルド：主旋律を先に聴かせる。スネア連打・上昇音・フィルター開放・直前1拍の無音。',
      '　ドロップ：2ステップのドラム（キック1・2.5拍目、スネア2・4拍目＋ゴースト）、リースベース、声っぽいリード、パッド。',
      '　ブレイク：ドラムなし→ブレイク2でシェイカーと主旋律。ドロップ2：ドラムを細かく、ベースが動く、ベルが戻る。',
      '【決め所】25・65小節目の1拍目、32・40・72・80小節目の伸ばし（主旋律の最後）。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'kick', gain: 0.9, tune: 1.1, decay: 0.3 },
      snare: { preset: 'snare', gain: 1.0, rev: 0.15, decay: 0.2 },
      hat: { preset: 'hat', gain: 0.31, pan: 0.25 },
      shaker: { preset: 'shaker', gain: 0.5, pan: -0.3 },
      bass: { preset: 'reese', gain: 0.28, base: 28, duck: 0.4, cutoff: 700 },
      lead: { preset: 'vox', gain: 0.5, rev: 0.3, delay: 0.2, duck: 0.15 },
      pad: { preset: 'pad', type: 'chord', gain: 0.39, low: 52, high: 74, rev: 0.4, duck: 0.35, cutoff: 2200, attack: 0.6, release: 1.2 },
      arp: { preset: 'bell', type: 'arp', gain: 0.3, base: 62, pan: 0.3, rev: 0.35, delay: 0.3, duck: 0.15 },
    },
    patterns: {
      kD: 'x . . . . . . . . . x . . . . .',
      sD: '. . . . X . . o . o . . X . . .',
      h8: 'x . x . x . x . x . x . x . x .',
      h16: 'x o x o x o x o x o x o x o x o',
      shk: '. x . x . x . x . x . x . x . x',
      kD2: 'x . . . . . . . . . x . . . . . | x . . . . . . x . . x . . . . .',
      sD2: '. . . . X . . o . o . . X . . o | . . . . X . . o . . . o X . o .',
      bassA: `1 ${R('-', 9)} 1 ${R('-', 5)} | 1 ${R('-', 7)} 5 - - - 8 - - -`,
      bassB: '1 - - - - - 1 - . . 8 - - - 1 - | . . 1 - - - 5 - - - 8 - 7 - 5 -',
      bassLong: held('1', 32),
      hookA: 'F#5 - - - - - E5 - A5 - - - F#5 - E5 - | . . B4 - D5 - E5 - F#5 - - - - - . .',
      hookB: 'F#5 - - - - - E5 - A5 - - - B5 - A5 - | . . F#5 - A5 - B5 - A5 - - - - - . .',
      hookC: 'F#5 - - - - - E5 - A5 - - - B5 - A5 - | . . F#5 - A5 - B5 - D6 - - - - - - -',
      padLong: held('x', 32),
      arpBell: '0 . 2 . 1 . 3 . 2 . 4 . 3 . 1 .',
    },
    sections: [
      { name: 'イントロ', type: 'intro', bars: 8, filter: [400, 2500], parts: { pad: 'padLong', arp: 'arpBell' } },
      { name: 'イントロ2', type: 'intro', bars: 8, filter: [2500, 9000], parts: { pad: 'padLong', arp: 'arpBell', hat: 'h8', bass: 'bassLong' } },
      { name: 'ビルド', type: 'build', bars: 8, build: true, gap: 1, parts: { pad: 'padLong', arp: 'arpBell', lead: ['hookA', 'hookA', 'hookA', 'hookB'] } },
      { name: 'ドロップ', type: 'drop', bars: 16, drop: true, parts: { kick: 'kD', snare: 'sD', hat: 'h8', bass: 'bassA', lead: SEQ2, pad: 'padLong' } },
      { name: 'ブレイク', type: 'break', bars: 8, parts: { pad: 'padLong', arp: 'arpBell' } },
      { name: 'ブレイク2', type: 'break', bars: 8, parts: { pad: 'padLong', arp: 'arpBell', shaker: 'shk', lead: ['hookA', 'hookA', 'hookA', 'hookB'] } },
      { name: 'ビルド2', type: 'build', bars: 8, build: true, gap: 1, parts: { pad: 'padLong', arp: 'arpBell', shaker: 'shk' } },
      { name: 'ドロップ2', type: 'drop', bars: 16, drop: true, parts: { kick: 'kD2', snare: 'sD2', hat: 'h16', bass: 'bassB', lead: SEQ2, pad: 'padLong', arp: 'arpBell' } },
      { name: 'アウトロ', type: 'outro', bars: 8, filter: [9000, 500], parts: { pad: 'padLong', arp: 'arpBell', hat: 'h8' } },
    ],
  });

  /* ---------------------------------------------------------
   * 試作3：ピクセル・パレード（チップチューン）
   * --------------------------------------------------------- */
  // 1小節の動機 ×16小節：A A A B を3回、最後だけ A A A C（最高音はCの中で1回）
  const SEQ3 = [].concat(R('hookA hookA hookA hookB', 3).split(' '), ['hookA', 'hookA', 'hookA', 'hookC']);
  NLM.Songs.register({
    id: 'proto-03',
    proto: true,
    title: 'ピクセル・パレード',
    genre: 'チップチューン',
    bpm: 150,
    key: 'E',
    mode: 'major',
    fxStyle: 'chip',
    leadPart: 'lead',
    prog: ['I', 'V', 'vi7', 'IVadd9'], // E→B→C#m7→Aadd9（一→五→六→四）
    chordLen: 1,
    memo: [
      '【雰囲気】ゲームセンターの電飾が行進するような、元気で明るいピコピコ音。',
      '【構成】イントロ8（1〜8）→ビルド8（9〜16）→ドロップ16（17〜32）→ブレイク8（33〜40）→ビルド8（41〜48）→ドロップ2 16（49〜64、半音上に転調）→アウトロ8（65〜72）',
      '【コード】一→五→六m7→四add9（E→B→C#m7→Aadd9）。4つすべてに B の音が入る形にして、主旋律の B を「軸の音」にした。',
      '【主旋律の動機】1小節。B（短く）-B-G#-B-C#-B-G#-E。裏拍の B で跳ねる。',
      '　ドロップは「A A A B ／ A A A C」。Cで E-F#-A と駆け上がり、最高音を1回だけ。',
      '【パート】矩形波（25%）のリード、三角波のベース（オクターブで跳ねる）、32分音符の高速アルペジオ、細い矩形波の裏拍和音、ノイズのドラム。',
      '　ビルドの上昇音もチップ風（細い矩形波の上昇＋ノイズ）。',
      '　ドロップ2：半音上に転調（ゲーム音楽の定番）、ハイハットを16分に、ベースが5度・3度にも動く。',
      '【決め所】17・49小節目の1拍目、各4小節目3拍目の E（伸ばし）、32・64小節目の駆け上がり。',
    ].join('\n'),
    instruments: {
      kick: { preset: 'chipKick', gain: 1.2 },
      snare: { preset: 'chipSnare', gain: 1.2 },
      hat: { preset: 'chipHat', gain: 0.35 },
      bass: { preset: 'tri', gain: 0.39, base: 36 },
      lead: { preset: 'pulse', gain: 0.95, duty: 0.25, rev: 0.12, delay: 0.15 },
      chords: { preset: 'pulse', type: 'chord', gain: 0.62, duty: 0.125, low: 59, high: 76, sustain: 0.5, vibrato: 0, level: 0.12, pan: -0.2 },
      arp: { preset: 'pulse', type: 'arp', gain: 0.22, duty: 0.5, base: 64, pan: 0.2, vibrato: 0, level: 0.15, sustain: 0.6 },
    },
    patterns: {
      cK: 'x . . . . . . . x . x . . . . .',
      cS: '. . . . x . . . . . . . x . . .',
      cH: 'x . x . x . x . x . x . x . x .',
      cH16: 'x o x o x o x o x o x o x o x o',
      bassA: '1 . 8 . 1 . 8 . 1 . 8 . 1 . 8 .',
      bassB: '1 . 8 . 5 . 8 . 1 . 8 . 5 . 3 .',
      bassLong: held('1', 16),
      hookA: 'B5 - . B5 G#5 . B5 - C#6 . B5 . G#5 - E5 -',
      hookB: 'B5 - . B5 G#5 . B5 - E6 - - - C#6 - B5 -',
      hookC: 'B5 - . B5 G#5 . B5 - E6 - F#6 - A6 - - -',
      chOff: '. . x . . . x . . . x . . . x .',
      chLong: held('x', 16),
      arp32: { s: '0 1 2 3', div: 8 },
    },
    sections: [
      { name: 'イントロ', type: 'intro', bars: 8, parts: { arp: 'arp32', bass: 'bassA', hat: 'cH' } },
      { name: 'ビルド', type: 'build', bars: 8, build: true, gap: 1, parts: { arp: 'arp32', bass: 'bassA', chords: 'chOff', lead: ['hookA', 'hookA', 'hookA', 'hookB'] } },
      { name: 'ドロップ', type: 'drop', bars: 16, drop: true, parts: { kick: 'cK', snare: 'cS', hat: 'cH', bass: 'bassA', lead: SEQ3, chords: 'chOff', arp: 'arp32' } },
      { name: 'ブレイク', type: 'break', bars: 8, parts: { chords: 'chLong', arp: 'arp32', bass: 'bassLong' } },
      { name: 'ビルド2', type: 'build', bars: 8, build: true, gap: 1, parts: { arp: 'arp32', bass: 'bassA', chords: 'chOff' } },
      { name: 'ドロップ2', type: 'drop', bars: 16, drop: true, transpose: 1, parts: { kick: 'cK', snare: 'cS', hat: 'cH16', bass: 'bassB', lead: SEQ3, chords: 'chOff', arp: 'arp32' } },
      { name: 'アウトロ', type: 'outro', bars: 8, transpose: 1, filter: [12000, 600], parts: { arp: 'arp32', bass: 'bassA', hat: 'cH', chords: 'chLong' } },
    ],
  });
})();
