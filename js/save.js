/* =========================================================
 * save.js … セーブ（spec.md 15章）
 * - localStorage に1つのキーで保存
 * - バージョン番号付き。古いデータは migrations で順に変換し、
 *   さらに初期値と合成して「後から増えた項目」を補う
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const STORAGE_KEY = 'neonlight-musics.save';
  const SAVE_VERSION = 3;
  // 最初から解禁されているキャラ（8-1）と曲（9-2：1〜10曲目）
  const INITIAL_CHARS = ['neonyan', 'signa', 'kirari'];
  const INITIAL_SONGS = ['s01', 's02', 's03', 's04', 's05', 's06', 's07', 's08', 's09', 's10'];

  /** 保存データの初期値。項目を増やすときはここに足すだけでよい */
  function defaults() {
    return {
      version: SAVE_VERSION,
      settings: {
        noteSpeed: 5.0, // 1.0〜10.0、0.5刻み（12章）
        showFps: false, // 処理速度の表示（設定の奥：スマホでの動作確認用）
        volume: {
          master: 80, // 全体
          bgm: 80, // BGM（ドラム以外）
          drum: 80, // ドラム
          se: 80, // 効果音
          system: 70, // システム音
        },
      },
      // 解禁状況（キャラ・曲のIDの配列）
      unlocked: { characters: INITIAL_CHARS.slice(), songs: INITIAL_SONGS.slice() },
      // 自己ベスト：bests[曲ID][難易度] = { score, maxCombo, perfect }
      bests: {},
      // 解禁条件の進み具合：progress[条件ID] = 数値など
      progress: {},
      // 累計記録
      totals: {
        plays: 0,
        perfect: 0,
        great: 0,
        miss: 0,
        battleWins: 0,
        clears: 0, // 独奏でクリア
        hardClears: 0, // ハード以上をクリア
        extraClears: 0, // エクストラをクリア
        coopPlays: 0, // 協奏で遊んだ曲数
        maxCombo: 0,
        charPlays: {}, // キャラごとに遊んだ曲数
      },
    };
  }

  /**
   * バージョンごとの変換。
   * 例）バージョン2で項目名を変えた場合：
   *   2: (d) => { d.settings.foo = d.settings.oldFoo; delete d.settings.oldFoo; return d; }
   * キーは「変換後のバージョン」。
   */
  const migrations = {
    // バージョン2：最初の3体を解禁（バージョン1ではキャラが未実装で空だった）
    2: (d) => {
      d.unlocked = d.unlocked || {};
      const cur = Array.isArray(d.unlocked.characters) ? d.unlocked.characters : [];
      d.unlocked.characters = [...new Set(INITIAL_CHARS.concat(cur))];
      return d;
    },
    // バージョン3：最初の10曲を解禁
    3: (d) => {
      d.unlocked = d.unlocked || {};
      const cur = Array.isArray(d.unlocked.songs) ? d.unlocked.songs : [];
      d.unlocked.songs = [...new Set(INITIAL_SONGS.concat(cur))];
      return d;
    },
  };

  /** 初期値(base)に保存データ(src)を重ねる。型が違う値は初期値を採用 */
  function mergeDefaults(base, src) {
    if (src === undefined || src === null) return base;
    if (Array.isArray(base)) return Array.isArray(src) ? src.slice() : base;
    if (typeof base === 'object' && base !== null) {
      if (typeof src !== 'object' || Array.isArray(src)) return base;
      const out = {};
      // 初期値にあるキー
      for (const k of Object.keys(base)) out[k] = mergeDefaults(base[k], src[k]);
      // 初期値が空オブジェクト（bests/progressなど自由なキー）の場合は保存側のキーも残す
      for (const k of Object.keys(src)) if (!(k in out)) out[k] = src[k];
      return out;
    }
    return typeof src === typeof base ? src : base;
  }

  function clamp(v, lo, hi) {
    return Math.min(hi, Math.max(lo, v));
  }

  /** 設定値を有効範囲に収める（壊れたデータ対策） */
  function sanitize(d) {
    const s = d.settings;
    s.noteSpeed = clamp(Math.round(Number(s.noteSpeed) * 2) / 2 || 5, 1, 10);
    for (const k of Object.keys(s.volume)) {
      s.volume[k] = clamp(Math.round(Number(s.volume[k]) || 0), 0, 100);
    }
    d.version = SAVE_VERSION;
    return d;
  }

  function migrate(d) {
    let v = Number(d.version) || 0;
    while (v < SAVE_VERSION) {
      v += 1;
      if (migrations[v]) d = migrations[v](d) || d;
    }
    return d;
  }

  let storageOK = true;

  const Save = {
    VERSION: SAVE_VERSION,
    data: defaults(),

    load() {
      let raw = null;
      try {
        raw = localStorage.getItem(STORAGE_KEY);
      } catch (e) {
        storageOK = false; // プライベートモード等
      }
      let parsed = null;
      if (raw) {
        try {
          parsed = JSON.parse(raw);
        } catch (e) {
          parsed = null; // 壊れていたら初期値
        }
      }
      if (parsed && typeof parsed === 'object') {
        // 未来のバージョン（新しい版で保存→古い版で開く）でも読める範囲で読む
        parsed = migrate(parsed);
        this.data = sanitize(mergeDefaults(defaults(), parsed));
      } else {
        this.data = defaults();
      }
      return this.data;
    },

    save() {
      if (!storageOK) return false;
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.data));
        return true;
      } catch (e) {
        storageOK = false;
        return false;
      }
    },

    /** 全データを消して初期状態に戻す */
    reset() {
      this.data = defaults();
      this.save();
    },

    get storageAvailable() {
      return storageOK;
    },

    // テストや将来の画面で使う
    _defaults: defaults,
  };

  NLM.Save = Save;
})();
