/* =========================================================
 * songs/lib.js … 曲データを書くための共通部品
 * - 記号の繰り返し、主旋律の並び（同じ・同じ・同じ・変化）
 * - 構成の形（BPMによって長さを変える：docs/song-plan.md）
 * - よく使うドラムのパターン
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const R = (tok, n) => Array(n).fill(tok).join(' ');
  const held = (first, steps) => first + ' ' + R('-', steps - 1);

  /**
   * ドロップの主旋律の並び（10-4：同じ・同じ・同じ・変化）
   * bars：区間の小節数、len：動機の長さ（小節）。4つずつ A A A B、最後のまとまりだけ A A A C（最高音はCの中）
   */
  function dropSeq(bars, len, A, B, C) {
    const n = Math.max(1, Math.round(bars / (len || 1)));
    const out = [];
    for (let i = 0; i < n; i++) {
      const last = i >= n - 4;
      out.push(i % 4 === 3 ? (last ? C : B) : A);
    }
    return out;
  }
  /** ビルド・ブレイクの予告用（Cを使わない） */
  function teaseSeq(bars, len, A, B) {
    const n = Math.max(1, Math.round(bars / (len || 1)));
    const out = [];
    for (let i = 0; i < n; i++) out.push(i % 4 === 3 ? B : A);
    return out;
  }

  /* 構成の形（小節数）：イントロ・ビルド・ドロップ・ブレイク・ビルド2・ドロップ2・アウトロ */
  const FORMS = {
    std: [8, 8, 16, 8, 8, 16, 8],
    mid: [8, 8, 16, 8, 4, 16, 4],
    short: [8, 4, 16, 8, 4, 8, 4],
    long: [16, 8, 16, 16, 8, 16, 8],
  };
  const KEYS = ['intro', 'build', 'drop', 'brk', 'build2', 'drop2', 'outro'];
  const NAMES = ['イントロ', 'ビルド', 'ドロップ', 'ブレイク', 'ビルド2', 'ドロップ2', 'アウトロ'];
  const TYPES = ['intro', 'build', 'drop', 'break', 'build', 'drop', 'outro'];

  /** P = { intro:{parts,...}, build:{...}, drop:{...}, brk, build2, drop2, outro } */
  function form(kind, P) {
    const bars = FORMS[kind];
    return KEYS.map((k, i) => {
      const src = P[k] || (k === 'build2' ? P.build : k === 'drop2' ? P.drop : {});
      const sec = Object.assign({ name: NAMES[i], type: TYPES[i], bars: bars[i] }, src);
      if (TYPES[i] === 'build') {
        sec.build = true;
        if (sec.gap === undefined) sec.gap = 1;
      }
      if (TYPES[i] === 'drop') sec.drop = true;
      if (typeof sec.parts === 'function') sec.parts = sec.parts(bars[i]);
      return sec;
    });
  }

  /* よく使うドラム（1マス＝16分） */
  const D = {
    k4: 'x . . . x . . . x . . . x . . .',
    k13: 'x . . . . . . . x . . . . . . .',
    s24: '. . . . x . . . . . . . x . . .',
    hOff: '. . x . . . x . . . x . . . x .',
    h8: 'x . x . x . x . x . x . x . x .',
    h16: 'x o x o x o x o x o x o x o x o',
    hEA: '. o . o . o . o . o . o . o . o',
    dnbK: 'x . . . . . . . . . x . . . . .',
    dnbS: '. . . . X . . o . o . . X . . .',
    halfK: 'x . . . . . . x . . x . . . . .',
    halfS: '. . . . . . . . X . . . . . . .',
    ukgK: 'x . . . . . . . . . x . . . . .',
    ukgH: 'o x o x x o x o o x o x x o x o',
    dembK: 'x . . . x . . . x . . . x . . .',
    dembS: '. . . x . . x . . . . x . . x .',
  };

  NLM.SongLib = { R, held, dropSeq, teaseSeq, form, FORMS, D };
})();
