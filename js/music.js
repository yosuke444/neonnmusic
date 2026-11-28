/* =========================================================
 * music.js … 楽譜データの読み取り・音楽理論・自動チェック（spec.md 10章）
 * 音を出さない処理だけをまとめる（譜面生成 chart.js からも使う）。
 *
 * ---------------------------------------------------------
 * 【楽譜データの形式】
 * {
 *   id, title, genre, bpm, key: 'G', mode: 'minor', beatsPerBar: 4, swing: 0,
 *   memo: '設計メモ（10-6）',
 *   leadPart: 'lead',                  // 主旋律のパート名（チェック用）
 *   instruments: {                     // パート名 → 音色と音量・定位など
 *     lead: { preset:'supersaw', gain:0.3, pan:0, rev:0.2, delay:0.1, duck:0.3, octave:0 },
 *     bass: { preset:'fhbass', base:28 },   // base：ベース/和音/アルペジオの最低音（MIDI番号）
 *     pad:  { preset:'pad', type:'chord', low:53, high:74 },
 *     kick: { preset:'kick' }, ...
 *   },
 *   patterns: {                        // 1マス＝16分音符（div:4）。'|' は読みやすさ用で無視
 *     k4:    'x . . . x . . . x . . . x . . .',        // ドラム：X強 x普通 o弱 .休み
 *     hookA: 'D5 . D5 Bb4 - . C5 - ...',                // 旋律：音名、- 伸ばす、. 休み、C5! 強
 *     bassA: '1 . 8 . 5 . 3 -',                          // ベース：コードの 1根音 3 5 7 8(1の1オクターブ上) 9
 *     stab:  '. . x - . . x -',                          // 和音：x でコード全体
 *     arp:   { s:'0 1 2 3', div:8 },                     // アルペジオ：コード構成音の番号、div:8 で32分
 *   },
 *   sections: [
 *     { name:'イントロ', type:'intro', bars:8, prog:['i','bVI','bIII','bVII'], chordLen:1,
 *       filter:[600, 4000], transpose:0,
 *       parts:{ kick:'k4', lead:['hookA','hookA','hookA','hookB'] } },  // 配列は順番に繰り返す
 *     { type:'build', build:true, gap:1, ... },   // スネア連打・上昇音・フィルター開放・直前の無音を自動で入れる
 *     { type:'drop',  drop:true, ... },           // 1拍目にクラッシュと衝撃音を自動で入れる
 *   ]
 * }
 * コード記号は「キーの根音から見た度数」をローマ数字で書く。
 *   大文字＝長三和音、小文字＝短三和音、b/# で半音上下（短調の ♭六 は 'bVI'）。
 *   末尾：7 maj7 9 maj9 add9 6 sus2 sus4 7sus4 dim aug
 *         ジャズ系：7b5（小文字でハーフディミニッシュ）dim7 11 13 69 7b9 7#9 maj7#11　ロック：5（パワーコード）
 * 【ジャズ系の書き方】
 *   swing8: 0〜1   8分の裏を後ろにずらす（1で3連符のはね）。swing は16分のはね。
 *   ベースの記号 < > ：次のコードの根音の半音下・半音上（ウォーキングベースの経過音）
 *   ベースの記号 2 b3 b7 b9：根音から見た音程
 * 【自由な構成】free: true … 企画書の構成（イントロ→ビルド→ドロップ…）を土台にしつつ自由に並べる（監督の決定）。
 *   区間の impact: false … ドロップの1拍目の衝撃音・クラッシュを鳴らさない（決め所のキーノーツは残す）。'crash' … クラッシュだけ鳴らす。
 *   type:'build' でも build:true を付けなければ、スネア連打・上昇音・無音は入らない（歌ものの「Bメロ」など）。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  /* ---------------- 音名・周波数 ---------------- */
  const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function noteToMidi(s) {
    const m = /^([A-G])(#|b)?(-?\d)$/.exec(s);
    if (!m) return null;
    const pc = NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
    return (parseInt(m[3], 10) + 1) * 12 + pc;
  }
  function pcOfName(s) {
    const m = /^([A-G])(#|b)?$/.exec(s);
    if (!m) throw new Error('キーが読めません: ' + s);
    return (NOTE_PC[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0) + 12) % 12;
  }
  const mod12 = (n) => ((n % 12) + 12) % 12;
  const midiToName = (n) => NAMES[mod12(n)] + (Math.floor(n / 12) - 1);
  const midiToFreq = (m) => 440 * Math.pow(2, (m - 69) / 12);

  /* ---------------- コード ---------------- */
  const DEG = { I: 0, II: 2, III: 4, IV: 5, V: 7, VI: 9, VII: 11 };
  const KANJI = { I: '一', II: '二', III: '三', IV: '四', V: '五', VI: '六', VII: '七' };

  function parseChord(sym, keyPc) {
    const m = /^(b|#)?(VII|VI|IV|V|III|II|I|vii|vi|iv|v|iii|ii|i)(.*)$/.exec(sym);
    if (!m) throw new Error('コード記号が読めません: ' + sym);
    const up = m[2].toUpperCase();
    const minor = m[2] !== up;
    const acc = m[1] === 'b' ? -1 : m[1] === '#' ? 1 : 0;
    const rootPc = mod12(keyPc + DEG[up] + acc);
    const suf = m[3];
    const t = minor ? 3 : 4;
    const TABLE = {
      '': [0, t, 7],
      7: [0, t, 7, 10],
      maj7: [0, t, 7, 11],
      9: [0, t, 7, 10, 14],
      maj9: [0, t, 7, 11, 14],
      add9: [0, t, 7, 14],
      6: [0, t, 7, 9],
      sus2: [0, 2, 7],
      sus4: [0, 5, 7],
      '7sus4': [0, 5, 7, 10],
      dim: [0, 3, 6],
      aug: [0, 4, 8],
      '7b5': [0, t, 6, 10],
      dim7: [0, 3, 6, 9],
      11: [0, t, 7, 10, 14, 17],
      13: [0, t, 7, 10, 14, 21],
      69: [0, t, 7, 9, 14],
      '7b9': [0, t, 7, 10, 13],
      '7#9': [0, t, 7, 10, 15],
      'maj7#11': [0, t, 7, 11, 18],
      5: [0, 7, 12], // パワーコード（ロックのギター）
    };
    const intervals = TABLE[suf];
    if (!intervals) throw new Error('コードの種類が読めません: ' + sym);
    const noM = suf === 'dim' || suf === 'dim7';
    const kanji = (acc < 0 ? '♭' : acc > 0 ? '♯' : '') + KANJI[up] + (minor && !noM ? 'm' : '') + suf;
    return {
      sym,
      rootPc,
      intervals,
      pcs: [...new Set(intervals.map((i) => mod12(rootPc + i)))],
      kanji,
      name: NAMES[rootPc] + (minor && !noM ? 'm' : '') + suf,
    };
  }

  /** ベースの記号（1 3 5 7 8 9 など）→ MIDI番号 */
  function bassNote(tok, chord, base, next) {
    const root = base + mod12(chord.rootPc - base);
    if ((tok === '<' || tok === '>') && next) {
      // 次のコードの根音へ半音でつなぐ（今の根音に近い高さを選ぶ）
      let n = base + mod12(next.rootPc - base) + (tok === '<' ? -1 : 1);
      if (n - root > 7) n -= 12;
      if (root - n > 7) n += 12;
      return n;
    }
    const iv = chord.intervals;
    const has = (x) => iv.includes(x);
    switch (tok) {
      case '1':
        return root;
      case '8':
        return root + 12;
      case '3':
        return root + (has(3) ? 3 : has(4) ? 4 : has(2) ? 2 : 5);
      case '5':
        return root + (has(7) ? 7 : has(6) ? 6 : has(8) ? 8 : 7);
      case '7':
        return root + (has(11) ? 11 : 10);
      case '9':
        return root + 14;
      case '4':
        return root + 5;
      case '6':
        return root + 9;
      case '2':
        return root + 2;
      case 'b3':
        return root + 3;
      case 'b7':
        return root + 10;
      case 'b9':
        return root + 13;
      default:
        return null;
    }
  }

  /** 和音の並べ方：前の和音から指の動きが少なくなる転回形を選ぶ */
  function voiceChord(chord, low, high, prev) {
    const pcs = chord.pcs;
    const cands = [];
    for (let k = 0; k < pcs.length; k++) {
      const order = pcs.slice(k).concat(pcs.slice(0, k));
      const notes = [];
      let n = low + mod12(order[0] - low);
      notes.push(n);
      for (let j = 1; j < order.length; j++) {
        const d = mod12(order[j] - n);
        n += d === 0 ? 12 : d;
        notes.push(n);
      }
      // 上限を超えたら全体を1オクターブ下げる（下限を割らない範囲で）
      while (notes[notes.length - 1] > high && notes[0] - 12 >= low - 5) for (let j = 0; j < notes.length; j++) notes[j] -= 12;
      cands.push(notes);
    }
    const center = (low + high) / 2;
    let best = cands[0];
    let bestScore = Infinity;
    for (const c of cands) {
      let score;
      if (prev && prev.length) {
        score = 0;
        for (const n of c) score += Math.min(...prev.map((p) => Math.abs(p - n)));
      } else {
        score = Math.abs(c.reduce((a, b) => a + b, 0) / c.length - center);
      }
      if (c[c.length - 1] > high) score += 50;
      if (score < bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best;
  }

  /* ---------------- パターン ---------------- */
  function parsePattern(p, name) {
    if (p === undefined) throw new Error('パターンがありません: ' + name);
    const src = typeof p === 'string' ? { s: p } : p;
    const div = src.div || 4;
    const tokens = src.s
      .trim()
      .split(/\s+/)
      .filter((t) => t !== '|');
    return { tokens, div, beats: tokens.length / div };
  }

  const DRUM_PARTS = ['kick', 'snare', 'clap', 'hat', 'ohat', 'crash', 'ride', 'perc', 'tom', 'rim', 'roll', 'shaker', 'brush', 'snap', 'conga'];
  function partType(name, inst) {
    if (inst && inst.type) return inst.type;
    if (DRUM_PARTS.includes(name)) return 'drum';
    if (name === 'fx') return 'fx';
    if (/^bass|^sub/.test(name)) return 'bass';
    if (/^arp/.test(name)) return 'arp';
    if (/^pad|^chord|^stab/.test(name)) return 'chord';
    return 'melody';
  }
  const isDrumType = (t) => t === 'drum';

  /* 自動で使う補助パートの既定値 */
  const IMPLICIT = {
    roll: { preset: 'snare', gain: 0.5 },
    crash: { preset: 'crash', gain: 0.35, rev: 0.2 },
    fx: { preset: 'fx', gain: 0.5, rev: 0.3 },
  };
  function instrumentsOf(song) {
    const out = Object.assign({}, song.instruments);
    if (!out.roll) out.roll = Object.assign({}, IMPLICIT.roll, { preset: (song.instruments.snare || {}).preset || 'snare' });
    if (!out.crash) out.crash = Object.assign({}, IMPLICIT.crash);
    if (!out.fx) out.fx = Object.assign({}, IMPLICIT.fx);
    return out;
  }

  /* =========================================================
   * 楽譜データ → 音の出来事の一覧（拍単位）
   * ========================================================= */
  function compile(song) {
    const bpb = song.beatsPerBar || 4;
    const spb = 60 / song.bpm;
    const keyPc = pcOfName(song.key);
    const instruments = instrumentsOf(song);
    const events = [];
    const chords = [];
    const sections = [];
    const automation = []; // { beat, dur, from, to }（ドラム以外のローパスフィルター）
    const gaps = [];
    const rolls = []; // 連打区間（譜面生成用）
    const accents = []; // ドロップ1拍目など（譜面のキーノーツ用）
    let cursor = 0;

    for (const sec of song.sections) {
      const start = cursor;
      const beats = sec.bars * bpb;
      const tr = sec.transpose || 0;
      const prog = sec.prog || song.prog;
      const chordBeats = (sec.chordLen || song.chordLen || 1) * bpb;
      const info = { name: sec.name, type: sec.type, startBeat: start, beats, bars: sec.bars, transpose: tr, seq: {}, flags: sec };
      sections.push(info);

      // コード進行
      const secChords = [];
      for (let k = 0; k * chordBeats < beats; k++) {
        const c = { beat: start + k * chordBeats, len: Math.min(chordBeats, beats - k * chordBeats), chord: parseChord(prog[k % prog.length], keyPc + tr) };
        secChords.push(c);
        chords.push(c);
      }
      const chordAt = (b) => {
        let c = secChords[0];
        for (const x of secChords) if (x.beat <= b + 1e-6) c = x;
        return c.chord;
      };
      // 次のコード（区間の最後なら、次の区間の最初のコード）
      const nextChordAfter = (b) => {
        const x = secChords.find((y) => y.beat > b + 1e-6);
        if (x) return x.chord;
        const ni = song.sections.indexOf(sec) + 1;
        const ns = song.sections[ni];
        if (!ns) return secChords[0].chord;
        return parseChord((ns.prog || song.prog)[0], keyPc + (ns.transpose || 0));
      };

      // パート
      for (const [part, spec] of Object.entries(sec.parts || {})) {
        const inst = instruments[part];
        if (!inst) throw new Error(`音色が決まっていないパート: ${part}`);
        const type = partType(part, inst);
        const list = Array.isArray(spec) ? spec : [spec];
        info.seq[part] = [];
        let pos = 0;
        let idx = 0;
        let prevVoicing = null;
        while (pos < beats - 1e-6) {
          const pname = list[idx % list.length];
          const pat = parsePattern(song.patterns[pname], pname);
          info.seq[part].push(pname);
          const stepB = 1 / pat.div;
          let last = null; // 伸ばし中の音（和音は配列）
          pat.tokens.forEach((tok, i) => {
            let b = pos + i * stepB;
            if (b >= beats - 1e-6) return;
            const g = start + b; // はねる前の位置（譜面のマス目に使う）
            if (song.swing && pat.div === 4 && i % 2 === 1) b += song.swing * stepB;
            if (song.swing8 && pat.div === 4 && i % 4 === 2) b += song.swing8 / 6;
            if (song.swing8 && pat.div === 4 && i % 4 === 3) b += song.swing8 / 12;
            const abs = start + b;
            if (tok === '-') {
              if (last) [].concat(last).forEach((e) => (e.dur += stepB));
              return;
            }
            if (tok === '.') {
              last = null;
              return;
            }
            if (type === 'drum') {
              const vel = tok === 'X' ? 1 : tok === 'o' ? 0.45 : 0.8;
              events.push({ part, beat: abs, g, dur: stepB, vel, drum: true });
              last = null;
              return;
            }
            const accent = tok.endsWith('!');
            const t = accent ? tok.slice(0, -1) : tok;
            const vel = accent ? 1 : 0.8;
            const chord = chordAt(abs);
            if (type === 'chord') {
              const v = voiceChord(chord, inst.low || 55, inst.high || 76, prevVoicing);
              prevVoicing = v;
              last = v.map((m) => {
                const e = { part, beat: abs, g, dur: stepB, midi: m + (inst.octave || 0) * 12, vel };
                events.push(e);
                return e;
              });
              return;
            }
            let midi = noteToMidi(t);
            if (midi !== null) midi += tr;
            else if (type === 'bass') midi = bassNote(t, chord, inst.base || 28, nextChordAfter(abs));
            else if (type === 'arp') {
              const n = parseInt(t, 10);
              if (!isNaN(n)) {
                const base = inst.base || 60;
                const root = base + mod12(chord.rootPc - base);
                const iv = chord.intervals.slice().sort((a, b) => a - b);
                midi = root + iv[n % iv.length] + 12 * Math.floor(n / iv.length);
              }
            }
            if (midi === null || midi === undefined) throw new Error(`読めない記号「${tok}」（パート ${part}・パターン ${pname}）`);
            const e = { part, beat: abs, g, dur: stepB, midi: midi + (inst.octave || 0) * 12, vel };
            events.push(e);
            last = e;
          });
          pos += pat.beats;
          idx++;
        }
      }

      // フィルター（ドラム以外）
      if (sec.build) {
        automation.push({ beat: start, dur: beats - (sec.gap || 0), from: sec.filterFrom || 350, to: 20000 });
      } else if (sec.filter) {
        automation.push({ beat: start, dur: beats, from: sec.filter[0], to: sec.filter[1] });
      } else {
        automation.push({ beat: start, dur: 0, from: 20000, to: 20000 });
      }

      // ビルド：スネア連打（4分→8分→16分→32分）＋上昇音＋直前の無音（10-4）
      if (sec.build) {
        const gap = sec.gap === undefined ? 1 : sec.gap;
        const rollEnd = beats - gap;
        const quarter = beats / 4;
        const subdiv = [1, 2, 4, 8];
        for (let q = 0; q < 4; q++) {
          const step = 1 / subdiv[q];
          for (let b = q * quarter; b < (q + 1) * quarter - 1e-6 && b < rollEnd - 1e-6; b += step) {
            const prog01 = b / rollEnd;
            events.push({ part: 'roll', beat: start + b, dur: step, vel: 0.35 + 0.6 * prog01, drum: true, pitch: prog01 * 7 });
          }
        }
        rolls.push({ beat: start + beats / 2, dur: rollEnd - beats / 2 });
        events.push({ part: 'fx', beat: start, dur: rollEnd, kind: 'riser', vel: 1 });
        if (gap > 0) gaps.push({ beat: start + beats - gap, dur: gap });
      }
      // ドロップ：1拍目にクラッシュ＋衝撃音
      if (sec.drop) {
        if (sec.impact !== false) events.push({ part: 'crash', beat: start, dur: 1, vel: 1, drum: true });
        if (sec.impact !== false && sec.impact !== 'crash') events.push({ part: 'fx', beat: start, dur: 4, kind: 'impact', vel: 1 });
        accents.push({ beat: start, kind: 'drop' });
      }
      cursor += beats;
    }

    // 無音区間：始まる音を消し、かかる音を短くする
    let out = events;
    for (const g of gaps) {
      const end = g.beat + g.dur;
      out = out.filter((e) => !(e.beat >= g.beat - 1e-6 && e.beat < end - 1e-6));
      for (const e of out) if (e.beat < g.beat && e.beat + e.dur > g.beat) e.dur = Math.max(0.05, g.beat - e.beat);
    }
    out.sort((a, b) => a.beat - b.beat);

    const totalBeats = cursor;
    const partNames = [...new Set(out.map((e) => e.part))];
    const parts = {};
    for (const p of partNames) {
      const t = partType(p, instruments[p]);
      parts[p] = { name: p, type: t, stem: isDrumType(t) ? 'drum' : 'music', inst: instruments[p] };
    }
    return {
      song,
      bpm: song.bpm,
      spb,
      beatsPerBar: bpb,
      keyPc,
      totalBeats,
      duration: totalBeats * spb,
      sections,
      chords,
      events: out,
      automation,
      gaps,
      rolls,
      accents,
      parts,
      instruments,
    };
  }

  /* =========================================================
   * 自動チェック（10-5 と 10-4 の構成ルール）
   * 結果：{ level: 'ok' | 'warn' | 'ng', item, msg }
   * ========================================================= */
  const RANGE = { melody: [48, 96], bass: [24, 60], chord: [45, 86], arp: [48, 100] };

  function check(c, render) {
    const res = [];
    const add = (level, item, msg) => res.push({ level, item, msg });
    const song = c.song;
    const bpb = c.beatsPerBar;
    const lead = song.leadPart || 'lead';
    const chordAt = (b) => {
      let x = c.chords[0];
      for (const k of c.chords) if (k.beat <= b + 1e-6) x = k;
      return x.chord;
    };
    const where = (b) => {
      const bar = Math.floor(b / bpb) + 1;
      const beat = Math.round((b - (bar - 1) * bpb) * 100) / 100 + 1;
      return `${bar}小節${beat}拍`;
    };

    // 1) 不協和：強拍（1拍目・3拍目）で0.5拍より長く鳴るコード外の音
    let diss = 0;
    const melodic = c.events.filter((e) => e.midi !== undefined && (c.parts[e.part].type === 'melody' || c.parts[e.part].type === 'bass'));
    // 強拍：ふつうは1拍目と3拍目。変拍子の曲は song.strong で小節内の位置（拍）を指定
    const strongAt = [];
    for (let bar0 = 0; bar0 < c.totalBeats - 1e-6; bar0 += bpb) for (const o of song.strong || [0, bpb / 2]) strongAt.push(bar0 + o);
    for (const b of strongAt) {
      const ch = chordAt(b);
      for (const e of melodic) {
        if (e.beat <= b + 1e-6 && e.beat + e.dur - b > 0.5 + 1e-6) {
          if (!ch.pcs.includes(mod12(e.midi))) {
            diss++;
            if (diss <= 12) add('warn', '不協和', `${where(b)}　${e.part} の ${midiToName(e.midi)} がコード ${ch.name}（${ch.kanji}）に含まれない`);
          }
        }
      }
    }
    if (diss > 12) add('warn', '不協和', `ほか ${diss - 12} か所`);
    if (!diss) add('ok', '不協和', '強拍で長く鳴るコード外の音なし');

    // 2) 音域
    let rangeNg = 0;
    for (const e of c.events) {
      if (e.midi === undefined) continue;
      const p = c.parts[e.part];
      const r = (p.inst && p.inst.range) || RANGE[p.type];
      if (!r) continue;
      if (e.midi < r[0] || e.midi > r[1]) {
        rangeNg++;
        if (rangeNg <= 6) add('ng', '音域', `${where(e.beat)}　${e.part} の ${midiToName(e.midi)} が範囲（${midiToName(r[0])}〜${midiToName(r[1])}）の外`);
      }
    }
    if (!rangeNg) add('ok', '音域', 'すべてのパートが音域内');

    // 3) 音量（書き出し後のみ）
    if (render) {
      const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-∞');
      const lvl = render.peakSum > 1 ? 'ng' : render.peakSum > 0.97 ? 'warn' : 'ok';
      add(lvl, '音量', `最大音量 ${db(render.peakSum)}dB（ドラム ${db(render.peakDrum)}dB／ドラム以外 ${db(render.peakMusic)}dB）${lvl === 'ok' ? '' : '：音割れの恐れ'}`);
      add('ok', '音量', `平均音量（RMS）${db(render.rms)}dB`);
    } else {
      add('warn', '音量', '書き出すと音割れの確認ができます');
    }

    // パターンの長さ：小節の長さの倍数でないと、くり返すうちにリズムがずれる
    const badPat = [];
    for (const [name, p] of Object.entries(song.patterns)) {
      const pp = parsePattern(p, name);
      const perBar = bpb * pp.div;
      if (Math.abs(pp.tokens.length / perBar - Math.round(pp.tokens.length / perBar)) > 1e-6 && pp.tokens.length % perBar !== 0) {
        // 小節より短いくり返し（アルペジオの 0 1 2 3 など）は、小節の長さを割り切れればよい
        if (perBar % pp.tokens.length !== 0) badPat.push(`${name}（${pp.tokens.length}マス）`);
      }
    }
    add(badPat.length ? 'ng' : 'ok', 'パターン', badPat.length ? `小節の長さ（${bpb * 4}マス）と合わない：${badPat.join('、')}` : 'すべて小節の長さに合っている');

    // 4) 長さ（1分30秒〜2分30秒）
    const d = c.duration;
    add(d >= 90 && d <= 150 ? 'ok' : 'ng', '長さ', `${fmtTime(d)}（${c.totalBeats / bpb}小節）`);

    // 5) 構成：8小節単位、基本形
    // 遅い曲（中くらい・短い形）は4小節の区間を認める（docs/song-plan.md）
    const shortOK = song.form === 'mid' || song.form === 'short' || song.free;
    const odd = c.sections.filter((s) => s.bars % 8 !== 0 && !(shortOK && s.bars % 4 === 0));
    add(odd.length ? 'warn' : 'ok', '構成', odd.length ? `8小節単位でない区間：${odd.map((s) => s.name).join('、')}` : shortOK ? '8小節単位（遅い曲のため一部4小節）' : 'すべて8小節単位');
    const typeSeq = c.sections.map((s) => s.type).filter((t, i, a) => t !== a[i - 1]);
    const basic = ['intro', 'build', 'drop', 'break', 'build', 'drop', 'outro'];
    const flowOk = typeSeq.join() === basic.join() || (song.free && typeSeq.includes('drop'));
    add(flowOk ? 'ok' : 'warn', '構成', `流れ：${c.sections.map((s) => s.name).join('→')}${song.free ? '（自由な構成）' : ''}`);

    // 6) ドロップの主旋律「同じ・同じ・同じ・変化」
    for (const s of c.sections.filter((x) => x.type === 'drop')) {
      const seq = s.seq[lead] || [];
      let ok = seq.length >= 4;
      for (let i = 0; i + 3 < seq.length; i += 4) {
        if (!(seq[i] === seq[i + 1] && seq[i] === seq[i + 2] && seq[i + 3] !== seq[i])) ok = false;
      }
      // パターン名を出てきた順に A B C … に置き換えて表示
      const letter = {};
      const short = seq.map((n) => (letter[n] = letter[n] || String.fromCharCode(65 + Object.keys(letter).length)));
      if (song.free) add('ok', '主旋律', `${s.name}：${short.join(' ') || '（主旋律なし）'}（自由な構成のため並びは問わない）`);
      else add(ok ? 'ok' : 'warn', '主旋律', `${s.name}：${short.join(' ') || '（主旋律なし）'}${ok ? '' : '　→「同じ・同じ・同じ・変化」になっていない'}`);
      // 1拍目にキック・クラッシュ・ベース・リード
      const at0 = new Set(c.events.filter((e) => Math.abs(e.beat - s.startBeat) < 1e-6).map((e) => c.parts[e.part].type === 'bass' ? 'bass' : e.part));
      const need = s.flags.impact === false ? ['bass'] : ['kick', 'crash', 'bass', lead]; // 衝撃音なしの区間（ソロなど）はベースだけ
      const miss = need.filter((n) => !at0.has(n));
      add(miss.length ? 'warn' : 'ok', 'ドロップ', `${s.name}の1拍目：${miss.length ? miss.join('・') + ' が鳴っていない' : 'キック・クラッシュ・ベース・リードが同時'}`);
    }

    // 7) ビルド：連打・上昇音・フィルター・直前の無音
    for (const s of c.sections.filter((x) => x.type === 'build')) {
      const f = s.flags;
      const gap = f.gap === undefined ? 1 : f.gap;
      const ok = f.build && gap >= 0.5 && gap <= 1;
      if (song.free && !f.build) {
        add('ok', 'ビルド', `${s.name}：連打・上昇音なし（自由な構成）`);
        continue;
      }
      add(ok ? 'ok' : 'warn', 'ビルド', `${s.name}：スネア連打${f.build ? '○' : '×'} 上昇音${f.build ? '○' : '×'} フィルター${f.build ? '○' : '×'} 無音${gap}拍`);
    }

    // 8) 最高音はドロップ中に1〜2回
    const leadEv = c.events.filter((e) => e.part === lead && e.midi !== undefined);
    if (leadEv.length) {
      const top = Math.max(...leadEv.map((e) => e.midi));
      const tops = leadEv.filter((e) => e.midi === top);
      const inDrop = tops.every((e) => {
        const s = c.sections.find((x) => e.beat >= x.startBeat && e.beat < x.startBeat + x.beats);
        return s && s.type === 'drop';
      });
      const ok = tops.length <= 2 && inDrop;
      add(ok ? 'ok' : 'warn', '最高音', `${midiToName(top)} が ${tops.length}回（${tops.map((e) => where(e.beat)).join('、')}）${inDrop ? '' : '：ドロップ以外にある'}`);
    }
    return res;
  }

  const TYPE_JA = { intro: 'イントロ', build: 'ビルド', drop: 'ドロップ', break: 'ブレイク', outro: 'アウトロ' };

  function fmtTime(sec) {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${String(s).padStart(2, '0')}`;
  }

  /** 一覧表示用のまとめ */
  function describe(c) {
    const s = c.song;
    const drop = c.sections.find((x) => x.type === 'drop');
    const dropChords = drop ? drop.flags.prog || s.prog : s.prog;
    return {
      title: s.title,
      genre: s.genre,
      bpm: s.bpm,
      key: `${s.key} ${s.mode === 'minor' ? 'マイナー' : s.mode === 'major' ? 'メジャー' : s.mode}`,
      prog: dropChords.map((x) => parseChord(x, c.keyPc).kanji).join('→'),
      structure: c.sections.map((x) => `${x.name}（${x.bars}）`).join(' → '),
      duration: fmtTime(c.duration),
    };
  }

  /**
   * 曲どうしの重複チェック（10-6：コード進行・主旋律の動機・BPM・キーの組み合わせ）
   * 試作曲は数えない。結果は check() と同じ形
   */
  function checkAgainst(song, others) {
    const res = [];
    const add = (level, item, msg) => res.push({ level, item, msg });
    const sig = (s) => {
      const drop = s.sections.find((x) => x.type === 'drop') || {};
      const prog = (drop.prog || s.prog).join(',');
      const leadSeq = drop.parts && drop.parts[s.leadPart || 'lead'];
      const first = Array.isArray(leadSeq) ? leadSeq[0] : leadSeq;
      const hook = first && s.patterns[first] ? String(s.patterns[first].s || s.patterns[first]) : '';
      // 主旋律の動機は音の高さを除いた「動き」で比べる（移調しても同じなら重複）
      const toks = hook.split(/\s+/).filter((t) => t !== '|');
      const mids = toks.map((t) => noteToMidi(t.replace('!', '')));
      const first0 = mids.find((m) => m !== null);
      const shape = toks.map((t, i) => (mids[i] !== null ? String(mids[i] - first0) : t)).join(' ');
      return { key: pcOfName(s.key) + s.mode, prog, bpm: s.bpm, shape }; // キーは音の高さで比べる（G# と A♭ は同じ）
    };
    const me = sig(song);
    let dup = 0;
    for (const o of others) {
      if (o === song || o.proto) continue;
      const x = sig(o);
      if (x.key === me.key && x.prog === me.prog) {
        dup++;
        add('warn', '重複', `「${o.title}」とキーとコード進行が同じ`);
      }
      if (x.bpm === me.bpm && x.key === me.key) {
        dup++;
        add('warn', '重複', `「${o.title}」とBPMとキーが同じ`);
      }
      if (x.shape && x.shape === me.shape) {
        dup++;
        add('warn', '重複', `「${o.title}」と主旋律の動機が同じ`);
      }
    }
    if (!dup) add('ok', '重複', 'ほかの曲とコード進行・動機・BPM・キーの組み合わせが重ならない');
    return res;
  }

  NLM.Music = {
    checkAgainst,
    noteToMidi,
    midiToName,
    midiToFreq,
    parseChord,
    parsePattern,
    compile,
    check,
    describe,
    fmtTime,
    TYPE_JA,
  };
})();
