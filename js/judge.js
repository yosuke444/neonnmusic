/* =========================================================
 * judge.js … 判定・HP・スコア・スキルメーター（spec.md 5章）
 * 独奏・CPU・フレンドのすべてで共有する（二重実装によるズレを防ぐ）。
 * フェーズ1では定数のみ。処理はフェーズ3で実装する。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  NLM.Judge = {
    // 判定の幅（秒）5-2
    WINDOW: { perfect: 0.045, great: 0.1 },
    // HP 5-3
    HP_MAX: 100,
    MISS_DAMAGE: { normal: 3, hold: 3, roll: 3, key: 6 },
    // スコア 5-4
    SCORE: { perfect: 100, auto: 100, great: 50, miss: 0 },
    // スキルメーター 5-5
    METER_GAIN: { perfect: 1.0, auto: 0, great: 0.5, miss: 0 },
    KEY_NOTE_MULTIPLIER: 2,
  };
})();
