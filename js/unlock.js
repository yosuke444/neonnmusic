/* =========================================================
 * unlock.js … 解禁の判定と進み具合（spec.md 8-1・9章）
 * 条件の種類：
 *   plays 合計曲数 / perfect 累計パーフェクト / clears 独奏のクリア回数 / battleWins 演争の1位
 *   maxCombo 最大コンボ / coopPlays 協奏の曲数 / charPlays そのキャラで遊んだ曲数
 *   hardClears ハード以上のクリア / extraClears エクストラのクリア
 *   songClear 独奏で特定の曲をクリア / unlockedChars 解禁したキャラ数 / unlockedSongs 解禁した曲数
 * 試作曲・自動演奏は記録に数えない（main.js の recordMatch）。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  function value(u) {
    const S = NLM.Save.data;
    const T = S.totals;
    const P = S.progress;
    switch (u.type) {
      case 'plays':
        return T.plays;
      case 'perfect':
        return T.perfect;
      case 'clears':
        return T.clears;
      case 'battleWins':
        return T.battleWins;
      case 'maxCombo':
        return T.maxCombo;
      case 'coopPlays':
        return T.coopPlays;
      case 'charPlays':
        return T.charPlays[u.char] || 0;
      case 'hardClears':
        return T.hardClears;
      case 'extraClears':
        return T.extraClears;
      case 'unlockedChars':
        return S.unlocked.characters.length;
      case 'unlockedSongs':
        return S.unlocked.songs.length;
      case 'songClear':
        return P.songClears && P.songClears[u.song] ? 1 : 0;
    }
    return 0;
  }

  /** 条件の文章 */
  function textOf(u) {
    const n = (x) => Number(x).toLocaleString();
    switch (u.type) {
      case 'plays':
        return `どのモードでも合計${n(u.n)}曲遊ぶ`;
      case 'perfect':
        return `パーフェクトを累計${n(u.n)}回`;
      case 'clears':
        return `独奏で${n(u.n)}回クリア`;
      case 'battleWins':
        return `演争で${n(u.n)}回1位`;
      case 'maxCombo':
        return `最大コンボ${n(u.n)}以上`;
      case 'coopPlays':
        return `協奏で${n(u.n)}曲遊ぶ`;
      case 'charPlays': {
        const c = NLM.Characters.get(u.char);
        return `${c ? c.name : u.char}で${n(u.n)}曲遊ぶ`;
      }
      case 'hardClears':
        return `ハード以上を${n(u.n)}回クリア`;
      case 'extraClears':
        return `エクストラを${n(u.n)}回クリア`;
      case 'unlockedChars':
        return `キャラを${n(u.n)}体解禁する`;
      case 'unlockedSongs':
        return `曲を${n(u.n)}曲解禁する`;
      case 'songClear': {
        const s = NLM.Songs.get(u.song);
        return `独奏で「${s ? s.title : u.song}」をクリア`;
      }
    }
    return '';
  }

  /** 進み具合：{ cur, need, done, text, label, ratio } */
  function progress(u) {
    if (!u) return { cur: 1, need: 1, done: true, text: '最初から遊べる', label: '', ratio: 1 };
    const need = u.type === 'songClear' ? 1 : u.n;
    const v = value(u);
    const cur = Math.min(v, need);
    const label = u.type === 'songClear' ? (v ? 'クリア済み' : '未クリア') : `${cur.toLocaleString()} / ${need.toLocaleString()}`;
    return { cur, need, done: v >= need, text: textOf(u), label, ratio: need ? cur / need : 1 };
  }

  /**
   * 解禁の判定。新しく解禁したものの一覧を返す：[{ kind:'char'|'song', item }]
   * 「キャラを20体解禁」のように他の解禁に左右される条件があるので、変化がなくなるまでくり返す。
   */
  function check() {
    const S = NLM.Save.data;
    const fresh = [];
    let changed = true;
    while (changed) {
      changed = false;
      for (const c of NLM.Characters.list) {
        if (S.unlocked.characters.includes(c.id) || !c.unlock) continue;
        if (progress(c.unlock).done) {
          S.unlocked.characters.push(c.id);
          fresh.push({ kind: 'char', item: c });
          changed = true;
        }
      }
      for (const s of NLM.Songs.all()) {
        if (s.proto || S.unlocked.songs.includes(s.id) || !s.unlock) continue;
        if (progress(s.unlock).done) {
          S.unlocked.songs.push(s.id);
          fresh.push({ kind: 'song', item: s });
          changed = true;
        }
      }
    }
    if (fresh.length) NLM.Save.save();
    return fresh;
  }

  NLM.Unlock = { value, textOf, progress, check };
})();
