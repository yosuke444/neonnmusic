/* =========================================================
 * songs/registry.js … 曲データの登録口（spec.md 10章 / 16-1）
 * 曲データは10曲ずつ別ファイル（songs-01.js 〜 songs-05.js）に分け、
 * 各ファイルから NLM.Songs.register({...}) で登録する。
 * フェーズ2で楽譜データの形式を決め、フェーズ6で50曲を追加する。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const list = [];
  const byId = {};

  NLM.Songs = {
    TOTAL: 50, // 全50曲（9-1）
    INITIAL_UNLOCKED: 10, // 最初に解禁されている曲（9-2）
    DIFFICULTIES: [
      { id: 'easy', name: 'イージー' },
      { id: 'normal', name: 'ノーマル' },
      { id: 'hard', name: 'ハード' },
      { id: 'extra', name: 'エクストラ' },
    ],
    register(song) {
      if (!song || !song.id || byId[song.id]) return;
      byId[song.id] = song;
      list.push(song);
    },
    get(id) {
      return byId[id] || null;
    },
    all() {
      return list.slice();
    },
  };
})();
