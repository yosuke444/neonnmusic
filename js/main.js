/* =========================================================
 * main.js … 画面遷移・ゲームループ（spec.md 3章 / 4章 / 5-2 / 12章）
 * ========================================================= */
(function () {
  'use strict';
  const NLM = window.NLM;
  const { UI, Save, AudioEngine: AE } = NLM;
  const { el, button, placeholder } = UI;

  /* ---------------- 定数 ---------------- */
  const MODES = {
    battle: { name: '演争モード', en: 'BATTLE', color: 'var(--neon-pink)' },
    coop: { name: '協奏モード', en: 'SESSION', color: 'var(--neon-cyan)' },
    solo: { name: '独奏モード', en: 'SOLO', color: 'var(--neon-yellow)' },
    tutorial: { name: 'チュートリアル', en: 'TUTORIAL', color: 'var(--neon-green)' },
  };
  const LANE_KEYS = ['KeyF', 'KeyG', 'KeyH', 'KeyJ']; // 4章：F・G・H・J
  const LANE_LABELS = ['F', 'G', 'H', 'J'];
  const DIFF_COLORS = ['var(--neon-green)', 'var(--neon-cyan)', 'var(--neon-pink)', 'var(--neon-purple)'];

  /** 今回の遊びの選択内容 */
  const Session = {
    mode: null, // battle / coop / solo
    opponent: null, // friend / cpu
    role: null, // host / guest
    difficulty: null,
    songId: null,
    charId: 'neonyan',
    cpuCount: 7,
    strength: 'normal',
    songCount: 3,
    songCountFree: false,
    match: null,
  };

  /* =========================================================
   * ゲームループ（音声の時計が基準）
   * 毎フレーム AE.syncClock() で時計を合わせ、AE.now()（音声時刻）を渡す。
   * 描画のタイミングではなく、音声時刻で進行を決める。
   * ========================================================= */
  const GameLoop = {
    _raf: 0,
    _fn: null,
    _last: 0,
    running: false,
    start(fn) {
      this.stop();
      this._fn = fn;
      this.running = true;
      AE.syncClock();
      this._last = AE.now();
      const tick = () => {
        if (!this.running) return;
        AE.syncClock();
        const t = AE.now();
        const dt = Math.max(0, t - this._last);
        this._last = t;
        this._fn(t, dt);
        this._raf = requestAnimationFrame(tick);
      };
      this._raf = requestAnimationFrame(tick);
    },
    stop() {
      this.running = false;
      cancelAnimationFrame(this._raf);
      this._fn = null;
    },
  };

  /* =========================================================
   * 画面遷移
   * ========================================================= */
  const app = document.getElementById('app');

  const Nav = {
    stack: [],
    cur: null, // { id, params, def }

    go(id, params) {
      if (this.cur) this.stack.push({ id: this.cur.id, params: this.cur.params });
      this._show(id, params || {});
    },
    back() {
      if (this.cur && this.cur.def.onBack) return this.cur.def.onBack();
      const prev = this.stack.pop();
      if (prev) this._show(prev.id, prev.params);
    },
    /** 履歴を指定して移動（もう一度遊ぶ・別の画面へ戻る など） */
    goWithStack(stack, id, params) {
      this.stack = stack.map((x) => ({ id: x.id, params: x.params || {} }));
      this._show(id, params || {});
    },
    /** 今の画面を置き換える（履歴は増やさない） */
    replace(id, params) {
      this._show(id, params || {});
    },
    /** 履歴を消して移動（メニューを土台にする） */
    reset(id, params) {
      this.stack = id === 'title' || id === 'menu' ? [] : [{ id: 'menu', params: {} }];
      this._show(id, params || {});
    },
    _show(id, params) {
      if (this.cur && this.cur.def.onLeave) this.cur.def.onLeave();
      const C = NLM.FX && NLM.FX.City;
      if (C) {
        C.clock = null;
        C.allLit = false;
        C.dimTarget = 0;
        C.tint = null;
      }
      const def = Screens[id](params);
      this.cur = { id, params, def };
      if (NLM._setTouchGuard) NLM._setTouchGuard(id !== 'play' && id !== 'calib'); // 演奏中はタッチを止める処理を外す

      const head =
        def.head === false
          ? null
          : el('header', { class: 'screen-head' }, [
              def.back === false ? el('span', { class: 'head-spacer' }) : button('◀ 戻る', () => Nav.back(), { variant: 'back' }),
              el('div', { class: 'head-titles' }, [
                def.crumb ? el('div', { class: 'crumb', text: def.crumb }) : null,
                el('h1', { class: 'neon-title', text: def.title, style: def.color ? { '--c': def.color } : undefined }),
              ]),
              el('span', { class: 'head-spacer' }),
            ]);

      const screen = el('section', { class: 'screen screen-' + id }, [
        head,
        el('div', { class: 'screen-body' }, def.body),
        def.foot ? el('footer', { class: 'screen-foot' }, def.foot) : null,
      ]);
      app.replaceChildren(screen);
      app.dataset.screen = id;
      UI.focusFirst(screen);
      if (def.onEnter) def.onEnter(screen);
    },
  };

  /* ---------------- キー操作 ---------------- */
  document.addEventListener('keydown', (e) => {
    const cur = Nav.cur;
    if (!cur) return;
    // 解禁の演出などの重なった画面：Escで閉じる。ほかのキーは画面の切り替えに使わない
    if (UI.modalClose) {
      if (e.key === 'Escape') {
        e.preventDefault();
        UI.modalClose();
      }
      return;
    }
    if (cur.def.onKey && cur.def.onKey(e) === true) {
      e.preventDefault();
      return;
    }
    const active = document.activeElement;
    const isRange = active && active.type === 'range';
    switch (e.key) {
      case 'ArrowUp':
        e.preventDefault();
        UI.moveFocus('up', app);
        break;
      case 'ArrowDown':
        e.preventDefault();
        UI.moveFocus('down', app);
        break;
      case 'ArrowLeft':
        if (isRange) return; // スライダーは左右で値を変える
        e.preventDefault();
        UI.moveFocus('left', app);
        break;
      case 'ArrowRight':
        if (isRange) return;
        e.preventDefault();
        UI.moveFocus('right', app);
        break;
      case 'Escape':
      case 'Backspace':
        if (e.key === 'Backspace' && active && active.tagName === 'INPUT' && active.type === 'text') return;
        e.preventDefault();
        Nav.back();
        break;
    }
  });
  document.addEventListener('keyup', (e) => {
    const cur = Nav.cur;
    if (cur && cur.def.onKeyUp) cur.def.onKeyUp(e);
  });

  /* ---------------- 共通部品 ---------------- */
  function crumb(...parts) {
    return parts.filter(Boolean).join(' › ');
  }
  function modeCrumb() {
    const m = MODES[Session.mode];
    const opp = Session.opponent === 'friend' ? 'フレンド' : Session.opponent === 'cpu' ? 'CPU' : null;
    return crumb(m && m.name, opp);
  }
  function nextButton(label, onClick) {
    return button(label, onClick, { variant: 'primary', className: 'btn-next' });
  }
  function difficultyButtons(onPick) {
    return el(
      'div',
      { class: 'grid grid-4' },
      NLM.Songs.DIFFICULTIES.map((d, i) =>
        button(d.name, () => {
          Session.difficulty = d.id;
          onPick(d);
        }, { color: DIFF_COLORS[i], className: 'btn-diff' })
      )
    );
  }

  /* =========================================================
   * 画面の定義（3章）
   * 各画面は { title, body, foot, onEnter, onLeave, onKey, onBack ... } を返す
   * ========================================================= */
  const Screens = {
    /* ---------- タイトル ---------- */
    title() {
      const start = () => {
        AE.init(); // 音声はユーザー操作の中で起動する必要がある
        setTimeout(() => AE.sfx('start'), 30);
        Nav.reset('menu');
      };
      return {
        head: false,
        body: [
          el('div', { class: 'logo' }, [
            el('div', { class: 'logo-star', text: '⭐︎' }),
            el('div', { class: 'logo-ja neon-title', text: 'ネオンライト・ミュージックズ' }),
            el('div', { class: 'logo-en', text: 'NEON LIGHT MUSICS' }),
          ]),
          button('START', start, { variant: 'primary', sub: 'タップ / クリック / Enter', className: 'btn-start' }),
        ],
        onKey(e) {
          if (e.repeat || ['Shift', 'Control', 'Alt', 'Meta', 'Tab'].includes(e.key)) return false;
          start();
          return true;
        },
        onBack() {},
      };
    },

    /* ---------- メインメニュー ---------- */
    menu() {
      Session.mode = Session.opponent = Session.role = Session.difficulty = null;
      if (NLM.Room && NLM.Room.active) NLM.Room.leave(); // 部屋に入ったままメニューに戻った時は抜ける
      const modeBtn = (id, sub, next) =>
        button(MODES[id].name, () => {
          Session.mode = id;
          Nav.go(next);
        }, { variant: 'primary', sub, color: MODES[id].color, className: 'btn-mode', en: MODES[id].en });
      return {
        title: 'メインメニュー',
        body: el('div', { class: 'menu-layout' }, [
          el('div', { class: 'menu-modes' }, [
            modeBtn('battle', '最後の一人まで残れ（2〜32人）', 'opponent'),
            modeBtn('coop', 'みんなで1曲を奏でる（2〜32人）', 'opponent'),
            modeBtn('solo', 'ひとりで腕を磨く', 'charSelect'),
            button(MODES.tutorial.name, () => startTutorial(), { variant: 'primary', sub: '遊び方を順番に覚える', color: MODES.tutorial.color, className: 'btn-mode btn-mode-tut', en: MODES.tutorial.en }),
          ]),
          el('div', { class: 'menu-sub' }, [
            button('キャラ一覧', () => Nav.go('charList'), { variant: 'sub' }),
            button('曲一覧', () => Nav.go('songList'), { variant: 'sub' }),
            button('設定', () => Nav.go('settings'), { variant: 'sub' }),
          ]),
        ]),
        onBack: () => Nav.reset('title'),
      };
    },

    /* ---------- 相手選択（演争・協奏） ---------- */
    opponent() {
      const m = MODES[Session.mode];
      return {
        title: '相手を選ぶ',
        crumb: m.name,
        color: m.color,
        body: el('div', { class: 'grid grid-2 big-choice' }, [
          button('フレンド', () => {
            Session.opponent = 'friend';
            Nav.go('room');
          }, { variant: 'primary', sub: '部屋を作る・部屋に入る', color: 'var(--neon-cyan)' }),
          button('CPU', () => {
            Session.opponent = 'cpu';
            Nav.go('cpuRules');
          }, { variant: 'primary', sub: 'CPUと遊ぶ', color: 'var(--neon-purple)' }),
        ]),
      };
    },

    /* ---------- 部屋を作る / 部屋に入る（フレンド） ---------- */
    room() {
      return RoomScreen();
    },

    /* ---------- ロビー（フレンド） ---------- */
    lobby() {
      return LobbyScreen();
    },

    /* ---------- 投票（フレンド：曲・難易度） ---------- */
    vote() {
      return VoteScreen();
    },

    /* ---------- ルール設定（演争・CPU） ---------- */
    cpuRules() {
      return RulesScreen();
    },

    /* ---------- キャラ選択（演争CPU・独奏） ---------- */
    charSelect() {
      return CharScreen(false);
    },

    /* ---------- 曲・難易度選択（CPU戦：本人が直接選ぶ） ---------- */
    songDiffSelect() {
      return MatchSongScreen();
    },

    /* ---------- 曲選択（独奏） ---------- */
    songSelect() {
      return SongSelectScreen();
    },

    /* ---------- 練習（独奏：区間・速さを選ぶ） ---------- */
    practice() {
      return PracticeScreen();
    },

    /* ---------- 難易度選択（独奏） ---------- */
    diffSelect() {
      return DiffSelectScreen();
    },

    /* ---------- バトル / 演奏 ---------- */
    play(params) {
      return PlayScreen(params);
    },

    /* ---------- リザルト ---------- */
    result(params) {
      return ResultScreen(params);
    },

    /* ---------- キャラ一覧 ---------- */
    charList() {
      return CharScreen(true);
    },

    /* ---------- 曲一覧（9章） ---------- */
    songList() {
      return SongListScreen();
    },


    /* ---------- 設定（12章） ---------- */
    settings() {
      return SettingsScreen();
    },

    /* ---------- タイミング調整（拍に合わせて叩いて測る） ---------- */
    calib() {
      return CalibScreen();
    },

    /* ---------- サウンドテスト（設定の奥・10-5） ---------- */
    soundTest() {
      return SoundTestScreen();
    },
  };

  /* =========================================================
   * 設定画面（12章）：変更はすぐ反映し、端末に保存する
   * ========================================================= */
  function SettingsScreen() {
    const s = Save.data.settings;
    const commit = () => {
      Save.save();
      AE.applySettings(s);
    };

    // ノーツの速度：1.0〜10.0、0.5刻み
    const speedVal = el('span', { class: 'set-value set-value-big' });
    const showSpeed = () => (speedVal.textContent = s.noteSpeed.toFixed(1));
    showSpeed();
    const stepSpeed = (d) => {
      s.noteSpeed = Math.min(10, Math.max(1, Math.round((s.noteSpeed + d) * 2) / 2));
      showSpeed();
      commit();
    };
    const speedRow = el('div', { class: 'set-row' }, [
      el('label', { class: 'set-label', text: 'ノーツの速度' }),
      el('div', { class: 'set-control stepper' }, [
        button('−', () => stepSpeed(-0.5), { className: 'btn-step', id: 'speed-down' }),
        speedVal,
        button('＋', () => stepSpeed(0.5), { className: 'btn-step', id: 'speed-up' }),
      ]),
    ]);

    // 打鍵音の選択（なしも選べる）
    const TAPS = [
      ['kat', 'カッ'],
      ['click', 'カチッ'],
      ['drum', 'ドン'],
      ['clap', 'パン'],
      ['bell', 'チン'],
      ['off', 'なし'],
    ];
    const tapBtns = TAPS.map(([v, label]) => {
      const b = button(label, () => {
        s.tapSound = v;
        commit();
        syncTap();
        AE.sfx('tap'); // 選んだ音を試しに鳴らす
      }, { className: 'btn-toggle' });
      b.dataset.v = v;
      return b;
    });
    const syncTap = () => tapBtns.forEach((b) => b.classList.toggle('is-on', b.dataset.v === s.tapSound));
    syncTap();
    const tapRow = el('div', { class: 'set-row set-row-wide' }, [el('label', { class: 'set-label', text: '打鍵音' }), el('div', { class: 'set-control toggles' }, tapBtns)]);

    // タイミング調整（音と判定・音と表示のずれ）
    const offRow = (label, key, id) => {
      const val = el('span', { class: 'set-value' });
      const show = () => (val.textContent = (s[key] > 0 ? '+' : '') + s[key] + 'ms');
      show();
      const step = (d) => {
        s[key] = Math.max(-300, Math.min(300, s[key] + d));
        show();
        commit();
      };
      return el('div', { class: 'set-row' }, [
        el('label', { class: 'set-label', text: label }),
        el('div', { class: 'set-control stepper' }, [
          button('−10', () => step(-10), { className: 'btn-step btn-step5' }),
          button('−', () => step(-1), { className: 'btn-step', id: id + '-down' }),
          val,
          button('＋', () => step(1), { className: 'btn-step', id: id + '-up' }),
          button('＋10', () => step(10), { className: 'btn-step btn-step5' }),
        ]),
      ]);
    };
    const judgeRow = offRow('音と判定のずれ', 'judgeOffset', 'joff');
    const visRow = offRow('音と表示のずれ', 'visualOffset', 'voff');

    // 音量
    const VOLS = [
      ['master', '全体'],
      ['bgm', 'BGM（ドラム以外）'],
      ['drum', 'ドラム'],
      ['se', '効果音'],
      ['system', 'システム音'],
    ];
    const volRows = VOLS.map(([key, label]) => {
      const val = el('span', { class: 'set-value', text: s.volume[key] + '%' });
      const input = el('input', {
        type: 'range',
        min: 0,
        max: 100,
        step: 1,
        value: s.volume[key],
        class: 'slider',
        'aria-label': label,
        dataset: { vol: key },
      });
      const sync = () => {
        s.volume[key] = Number(input.value);
        val.textContent = s.volume[key] + '%';
        input.style.setProperty('--p', s.volume[key] + '%');
      };
      sync();
      input.addEventListener('input', () => {
        sync();
        commit();
      });
      // 指を離した時・キー操作の時に確認音（その音量の系統で鳴らす）
      input.addEventListener('change', () => AE.playTest(key));
      return el('div', { class: 'set-row' }, [
        el('label', { class: 'set-label', text: label }),
        el('div', { class: 'set-control' }, [input]),
        val,
      ]);
    });

    // 処理速度の表示（確認用）：画面の左上に FPS などを出す（16-2・フェーズ9）
    const fpsBtn = button('', () => {
      s.showFps = !s.showFps;
      commit();
      NLM.FX.Perf.show(s.showFps);
      fpsLabel();
    }, { variant: 'sub', id: 'to-fps' });
    const fpsLabel = () => (fpsBtn.querySelector('.btn-label').textContent = `処理速度の表示：${s.showFps ? 'オン' : 'オフ'}`);
    fpsLabel();

    const note = Save.storageAvailable
      ? null
      : el('p', { class: 'warn', text: 'この端末では保存できません（プライベートモード等）。設定は再読み込みで元に戻ります。' });

    return {
      title: '設定',
      body: el('div', { class: 'settings-panel settings-scroll' }, [
        speedRow,
        tapRow,
        el('div', { class: 'set-sep' }),
        judgeRow,
        visRow,
        el('div', { class: 'set-hint', text: '叩いた音や判定が遅れて感じる時は「タイミング調整」で自動で測れます' }),
        el('div', { class: 'set-sep' }),
        ...volRows,
        note,
      ]),
      foot: el('div', { class: 'foot-row' }, [
        button('タイミング調整', () => Nav.go('calib'), { variant: 'primary', id: 'to-calib' }),
        button('サウンドテスト（開発用）', () => Nav.go('soundTest'), { variant: 'sub', id: 'to-soundtest' }),
        fpsBtn,
      ]),
    };
  }

  /* =========================================================
   * タイミング調整：メトロノームに合わせて叩き、ずれの中央値を「音と判定のずれ」にする
   * ========================================================= */
  function CalibScreen() {
    const BPM = 100;
    const SPB = 60 / BPM;
    const BEATS = 24; // 最初の4拍は慣らし
    const s = Save.data.settings;
    let start = null; // 1拍目の音声時刻
    let diffs = [];
    let ended = false;
    const pad = el('div', { class: 'calib-pad' }, [el('div', { class: 'calib-ring' }), el('div', { class: 'calib-dot' })]);
    const info = el('div', { class: 'calib-info', text: '「スタート」を押し、音に合わせて大きな丸（またはキー）を叩いてください' });
    const result = el('div', { class: 'calib-result' });
    const cur = el('div', { class: 'calib-cur' });
    const applyBtn = button('この値にする', () => {
      s.judgeOffset = Math.max(-300, Math.min(300, median()));
      Save.save();
      cur.textContent = `今の設定：音と判定のずれ ${fmt(s.judgeOffset)}`;
      AE.sfx('key');
    }, { variant: 'primary', className: 'btn-next' });
    applyBtn.disabled = true;
    const fmt = (v) => (v > 0 ? '+' : '') + Math.round(v) + 'ms';
    cur.textContent = `今の設定：音と判定のずれ ${fmt(s.judgeOffset)}`;
    function median() {
      const a = diffs.slice().sort((x, y) => x - y);
      return a.length ? Math.round(a[a.length >> 1]) : 0;
    }
    function begin() {
      AE.init();
      diffs = [];
      applyBtn.disabled = true;
      result.textContent = '';
      start = AE.now() + 1.0;
      for (let i = 0; i < BEATS; i++) AE.click(start + i * SPB, i % 4 === 0);
      info.textContent = '音に合わせて叩いてください（最初の4拍は慣らし）';
    }
    function tap(ts) {
      if (start === null) return;
      const at = AE.perfToAudio(ts);
      const k = Math.round((at - start) / SPB);
      if (k < 4 || k >= BEATS) return;
      const d = (at - (start + k * SPB)) * 1000;
      if (Math.abs(d) > 250) return; // 大きく外れた叩きは数えない
      diffs.push(d);
      pad.classList.remove('hit');
      void pad.offsetWidth;
      pad.classList.add('hit');
      result.textContent = `${diffs.length}回　ずれの中央値 ${fmt(median())}（＋は遅め）`;
      if (diffs.length >= 8) applyBtn.disabled = false;
    }
    pad.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      tap(e.timeStamp);
    });
    return {
      title: 'タイミング調整',
      crumb: '設定',
      color: 'var(--neon-cyan)',
      body: el('div', { class: 'calib' }, [info, pad, result, cur]),
      foot: el('div', { class: 'foot-row' }, [button('スタート', begin, { variant: 'primary', id: 'calib-start' }), applyBtn]),
      onEnter() {
        GameLoop.start((now) => {
          if (start === null || ended) return;
          const b = (now - start) / SPB;
          const ph = b >= 0 && b < BEATS ? b - Math.floor(b) : 1;
          pad.style.setProperty('--ph', Math.max(0, 1 - ph * 3).toFixed(3)); // 拍の瞬間に光る
          if (b >= BEATS + 0.5 && start !== null) {
            start = null;
            info.textContent = diffs.length >= 8 ? `測定おわり：「この値にする」で ${fmt(median())} に設定します` : '叩いた回数が少なすぎます。もう一度「スタート」';
          }
        });
      },
      onLeave() {
        ended = true;
        GameLoop.stop();
      },
      onKey(e) {
        if (e.repeat || e.key === 'Escape' || e.key === 'Tab' || e.key === 'Enter') return false;
        if (start === null) return false;
        tap(e.timeStamp);
        return true;
      },
    };
  }

  /* =========================================================
   * サウンドテスト（10-5）：全曲の再生・パートごとの消音・自動チェック
   * - 「再生」：その場で音を合成して鳴らす（パートごとに消せる）
   * - 「書き出して再生」：本番と同じく OfflineAudioContext で書き出した音を鳴らす
   *   （ドラムは「ドラム」、それ以外は「BGM」の音量で鳴る）
   * ========================================================= */
  const PART_JA = {
    kick: 'キック',
    snare: 'スネア',
    clap: 'クラップ',
    hat: 'ハイハット',
    ohat: 'オープンハット',
    shaker: 'シェイカー',
    roll: 'スネア連打',
    crash: 'クラッシュ',
    bass: 'ベース',
    lead: 'リード',
    pluck: 'プラック',
    pad: 'パッド',
    arp: 'アルペジオ',
    stab: '和音の刻み',
    chords: '和音',
    fx: '上昇音・衝撃音',
  };

  function SoundTestScreen() {
    const songs = NLM.Songs.all();
    const Music = NLM.Music;
    let idx = 0;
    let compiled = null;
    let player = null; // { kind:'live'|'render', h }
    let rendered = null;
    let busy = false;
    let tab = 'parts';
    let lastSec = -1;
    const muted = new Set();

    const titleEl = el('div', { class: 'st-title' });
    const metaEl = el('div', { class: 'st-meta' });
    const posEl = el('div', { class: 'st-pos', text: '停止中' });
    const statusEl = el('div', { class: 'st-status' });
    const secRow = el('div', { class: 'st-sections' });
    const chartRow = el('div', { class: 'st-charts' });
    const panel = el('div', { class: 'st-panel' });

    const playBtn = button('▶ 再生', () => playLive(0), { variant: 'primary', sub: 'パート別に消せる', id: 'st-play' });
    const renderBtn = button('書き出して再生', () => playRender(0), { sub: '本番と同じ音', id: 'st-render', color: 'var(--neon-yellow)' });
    const stopBtn = button('■ 停止', () => stop(), { variant: 'sub', id: 'st-stop' });

    const tabs = {};
    const tabRow = el(
      'div',
      { class: 'st-tabs' },
      [
        ['parts', 'パート'],
        ['check', '自動チェック'],
        ['memo', '設計メモ'],
      ].map(([id, label]) => {
        tabs[id] = button(label, () => {
          tab = id;
          drawPanel();
        }, { className: 'btn-tab', id: 'tab-' + id });
        return tabs[id];
      })
    );

    const song = () => songs[idx];

    function stop() {
      if (player) player.h.stop();
      player = null;
      posEl.textContent = '停止中';
      lastSec = -1;
      if (compiled) drawSections();
    }

    async function playLive(startBeat) {
      if (busy) return;
      AE.init();
      stop();
      busy = true;
      setBusy();
      const forIdx = idx;
      let h;
      try {
        h = await AE.startLive(song(), { startBeat, muted }, (p) => {
          statusEl.textContent = `音色を準備中… ${Math.round(p * 100)}%`;
        });
      } catch (e) {
        statusEl.textContent = '再生できませんでした：' + e.message;
      }
      busy = false;
      setBusy();
      if (!h) return;
      if (forIdx !== idx || Nav.cur.id !== 'soundTest') {
        h.stop(); // 準備中に曲や画面が変わった
        return;
      }
      player = { kind: 'live', h };
      statusEl.textContent = 'リアルタイム再生中（パートのボタンで音を消せます）';
    }

    async function playRender(startBeat) {
      if (busy) return;
      AE.init();
      stop();
      busy = true;
      setBusy();
      try {
        rendered = await AE.renderSong(song(), (p, label) => {
          statusEl.textContent = `${label}… ${Math.round(p * 100)}%`;
        });
      } catch (e) {
        statusEl.textContent = '書き出しに失敗しました：' + e.message;
        busy = false;
        setBusy();
        return;
      }
      busy = false;
      setBusy();
      statusEl.textContent = `書き出し版を再生中（書き出し ${(rendered.renderMs / 1000).toFixed(1)}秒）。パート別の消音はリアルタイム再生で`;
      const offset = startBeat * compiled.spb;
      player = { kind: 'render', h: AE.playRendered(rendered, AE.now() + 0.15, offset) };
      if (tab === 'check') drawPanel();
    }

    function seek(startBeat) {
      if (player && player.kind === 'render') {
        player.h.stop();
        player = { kind: 'render', h: AE.playRendered(rendered, AE.now() + 0.1, startBeat * compiled.spb) };
      } else playLive(startBeat);
    }

    function setBusy() {
      [playBtn, renderBtn, stopBtn].forEach((b) => (b.disabled = busy));
    }

    function currentBeat() {
      if (!player) return null;
      return player.kind === 'live' ? player.h.beat() : player.h.position() / compiled.spb;
    }

    function selectSong(i) {
      stop();
      idx = (i + songs.length) % songs.length;
      compiled = Music.compile(song());
      rendered = null;
      muted.clear();
      const d = Music.describe(compiled);
      titleEl.textContent = `${idx + 1}/${songs.length}　${d.title}`;
      metaEl.textContent = `${d.genre}　BPM ${d.bpm}　${d.key}　${d.duration}`;
      statusEl.textContent = '';
      // 譜面確認（11章）：譜面を自動演奏で再生
      chartRow.replaceChildren(
        el('span', { class: 'st-hint', text: '譜面確認（自動演奏）' }),
        ...NLM.Songs.DIFFICULTIES.map((d, i) => {
          const ch = NLM.Chart.generate(song(), d.id);
          return button(`${d.name} Lv${ch.level}`, () => Nav.go('play', { songId: song().id, difficulty: d.id, auto: true, preview: true }), {
            className: 'btn-sec',
            color: DIFF_COLORS[i],
            id: 'chart-' + d.id,
          });
        })
      );
      drawSections();
      drawPanel();
    }

    function drawSections() {
      const cur = currentBeat();
      secRow.replaceChildren(
        ...compiled.sections.map((s) => {
          const on = cur !== null && cur >= s.startBeat && cur < s.startBeat + s.beats;
          return button(s.name, () => seek(s.startBeat), {
            className: 'btn-sec' + (on ? ' is-on' : ''),
            color: SEC_COLOR[s.type],
          });
        })
      );
    }

    function drawPanel() {
      Object.entries(tabs).forEach(([id, b]) => b.classList.toggle('is-on', id === tab));
      if (tab === 'parts') {
        const parts = Object.values(compiled.parts).sort((a, b) => (a.stem === b.stem ? 0 : a.stem === 'drum' ? -1 : 1));
        const grid = el(
          'div',
          { class: 'st-parts' },
          parts.map((p) => {
            const b = button(PART_JA[p.name] || p.name, () => {
              if (muted.has(p.name)) muted.delete(p.name);
              else muted.add(p.name);
              b.classList.toggle('is-muted', muted.has(p.name));
              if (player && player.kind === 'live') player.h.setMute(p.name, muted.has(p.name));
            }, { className: 'btn-part' + (muted.has(p.name) ? ' is-muted' : ''), sub: p.stem === 'drum' ? 'ドラム' : 'ドラム以外', color: p.stem === 'drum' ? 'var(--neon-pink)' : 'var(--neon-cyan)' });
            return b;
          })
        );
        const allOn = button('全部オン', () => {
          muted.clear();
          if (player && player.kind === 'live') parts.forEach((p) => player.h.setMute(p.name, false));
          drawPanel();
        }, { variant: 'sub', className: 'btn-small' });
        panel.replaceChildren(grid, el('div', { class: 'st-panel-foot' }, [allOn, el('span', { class: 'st-hint', text: '押すと消音（暗くなる）。もう一度押すと戻る' })]));
      } else if (tab === 'check') {
        const res = Music.check(compiled, rendered).concat(Music.checkAgainst(song(), NLM.Songs.all()));
        const icon = { ok: '○', warn: '△', ng: '×' };
        panel.replaceChildren(
          el(
            'ul',
            { class: 'st-checks' },
            res.map((r) => el('li', { class: 'lv-' + r.level }, [el('span', { class: 'lv-icon', text: icon[r.level] }), el('b', { text: r.item }), ' ', r.msg]))
          )
        );
      } else {
        const d = Music.describe(compiled);
        panel.replaceChildren(
          el('div', { class: 'st-memo' }, [
            el('p', { text: `コード進行（ドロップ）：${d.prog}` }),
            el('p', { text: `構成：${d.structure}` }),
            el('p', { text: '譜面：' }),
            el(
              'ul',
              { class: 'st-chartstats' },
              NLM.Songs.DIFFICULTIES.map((x) => {
                const s2 = NLM.Chart.generate(song(), x.id).stats;
                return el('li', {
                  text: `${x.name} Lv${NLM.Chart.generate(song(), x.id).level}：ノーツ ${s2.count}（1秒あたり ${s2.nps.toFixed(1)}、最大 ${s2.peak.toFixed(1)}）同時押し ${s2.chords} 長押し ${s2.holds} 連打 ${s2.rolls} キーノーツ ${s2.keys}`,
                });
              })
            ),
            el('pre', { text: song().memo || '（メモなし）' }),
          ])
        );
      }
    }

    selectSong(0);

    return {
      title: 'サウンドテスト',
      crumb: '設定',
      color: 'var(--neon-yellow)',
      body: el('div', { class: 'st' }, [
        el('div', { class: 'st-top' }, [
          button('◀', () => selectSong(idx - 1), { className: 'btn-arrow', id: 'st-prev' }),
          el('div', { class: 'st-head' }, [titleEl, metaEl]),
          button('▶', () => selectSong(idx + 1), { className: 'btn-arrow', id: 'st-next' }),
        ]),
        el('div', { class: 'st-transport' }, [playBtn, renderBtn, stopBtn, posEl]),
        statusEl,
        secRow,
        chartRow,
        tabRow,
        panel,
      ]),
      onEnter() {
        GameLoop.start(() => {
          if (!player) return;
          const b = currentBeat();
          const sec = b * compiled.spb;
          if (sec > compiled.duration + 2.5) {
            stop();
            return;
          }
          const bar = Math.max(1, Math.floor(b / compiled.beatsPerBar) + 1);
          const s = compiled.sections.find((x) => b >= x.startBeat && b < x.startBeat + x.beats);
          posEl.textContent = `${Music.fmtTime(Math.max(0, sec))} / ${Music.fmtTime(compiled.duration)}　${bar}小節目`;
          const si = s ? compiled.sections.indexOf(s) : -1;
          if (si !== lastSec) {
            lastSec = si;
            drawSections();
          }
        });
      },
      onLeave() {
        GameLoop.stop();
        stop();
      },
    };
  }

  const SEC_COLOR = {
    intro: 'var(--neon-purple)',
    build: 'var(--neon-yellow)',
    drop: 'var(--neon-pink)',
    break: 'var(--neon-cyan)',
    outro: 'var(--neon-purple)',
  };

  /* =========================================================
   * 曲の一覧（独奏・演争CPUで共通）
   * ========================================================= */
  function playableSongs() {
    const all = NLM.Songs.all();
    const unlocked = Save.data.unlocked.songs;
    const real = all.filter((s) => !s.proto && unlocked.includes(s.id));
    // 本編の曲ができるまでは、開発確認用に試作曲を出す（試作曲は本編では遊べない）
    return real.length ? real : all.filter((s) => s.proto);
  }
  /** ランクの表示（大きな文字＋フルコンボ・オールパーフェクトの印） */
  function rankBadge(rk, isNew) {
    return el('div', { class: 'rank-badge r-' + rk.rank }, [
      el('span', { class: 'rank-letter', text: rk.rank }),
      rk.ap ? el('span', { class: 'rank-mark is-ap', text: 'ALL PERFECT' }) : rk.fc ? el('span', { class: 'rank-mark is-fc', text: 'FULL COMBO' }) : null,
      isNew ? el('span', { class: 'res-new', text: 'ランク更新！' }) : null,
    ]);
  }
  /** 自己ベストのランクの小さな表示 */
  function rankChip(b) {
    if (!b || !b.rank) return null;
    return el('span', { class: 'rank-chip r-' + b.rank }, [b.rank, b.ap ? el('i', { text: 'AP' }) : b.fc ? el('i', { text: 'FC' }) : null]);
  }
  function bestOf(songId, diff) {
    const b = Save.data.bests[songId];
    return (b && b[diff]) || null;
  }
  const LANE_COLORS = ['#ff3ea5', '#2de2e6', '#ffe94a', '#b26bff'];

  /** 曲選択に並べる曲：本編の全曲（未解禁も暗く表示する）。本編の曲がなければ試作曲 */
  function listedSongs() {
    const real = NLM.Songs.all()
      .filter((s) => !s.proto)
      .sort((a, b) => a.no - b.no);
    return real.length ? real : NLM.Songs.all().filter((s) => s.proto);
  }
  const isSongLocked = (s) => !s.proto && !Save.data.unlocked.songs.includes(s.id);
  /** 曲のボタン。未解禁はキャラと同じく暗くしてロックを付け、押すと解禁条件を見せる */
  function songButton(s, i, sub, onPick) {
    const locked = isSongLocked(s);
    const b = button(s.title, () => (locked ? showSongLock(s) : onPick()), {
      className: 'btn-song' + (locked ? ' is-locked' : ''),
      sub: locked ? `未解禁　${s.genre}` : sub,
      color: LANE_COLORS[i % 4],
    });
    if (locked) b.append(el('span', { class: 'song-lock', text: '🔒' }));
    return b;
  }
  function showSongLock(s) {
    showDialog(`🔒 ${s.title}`, el('div', { class: 'lock-body' }, [el('div', { class: 'char-motif', text: `${s.genre}　BPM ${s.bpm}` }), progressLine(s.unlock, true)]), [['閉じる', null, true]]);
  }

  function SongSelectScreen() {
    const songs = listedSongs();
    const PER = 6;
    let page = Math.floor(Math.max(0, songs.findIndex((s) => s.id === Session.songId)) / PER);
    const grid = el('div', { class: 'song-grid' });
    const pageEl = el('div', { class: 'page-info' });
    const prevB = button('◀', () => {
      page--;
      draw();
    }, { className: 'btn-arrow' });
    const nextB = button('▶', () => {
      page++;
      draw();
    }, { className: 'btn-arrow' });
    function draw() {
      const pages = Math.max(1, Math.ceil(songs.length / PER));
      page = (page + pages) % pages;
      grid.replaceChildren(
        ...songs.slice(page * PER, page * PER + PER).map((s, i) => {
          const bests = NLM.Songs.DIFFICULTIES.map((d) => bestOf(s.id, d.id)).filter(Boolean);
          const top = bests.length ? Math.max(...bests.map((b) => b.score)) : null;
          const sub = `${s.genre}　BPM ${s.bpm}${top !== null ? '　ベスト ' + top.toLocaleString() : ''}${s.proto ? '　［試作・開発中のみ］' : ''}`;
          return songButton(s, page * PER + i, sub, () => {
            Session.songId = s.id;
            Nav.go('diffSelect');
          });
        })
      );
      pageEl.textContent = pages > 1 ? `${page + 1} / ${pages}` : '';
      prevB.style.visibility = nextB.style.visibility = pages > 1 ? 'visible' : 'hidden';
    }
    draw();
    return {
      title: '曲選択',
      crumb: modeCrumb(),
      color: MODES.solo.color,
      body: songs.length
        ? el('div', { class: 'song-select' }, [el('div', { class: 'song-page' }, [prevB, grid, nextB]), pageEl])
        : placeholder('遊べる曲がありません'),
    };
  }

  function DiffSelectScreen() {
    const song = NLM.Songs.get(Session.songId) || playableSongs()[0];
    Session.songId = song.id;
    const btns = NLM.Songs.DIFFICULTIES.map((d, i) => {
      const ch = NLM.Chart.generate(song, d.id);
      const b = bestOf(song.id, d.id);
      const btn = button(d.name, () => {
        Session.difficulty = d.id;
        startMatch([song.id], d.id);
      }, { className: 'btn-diff btn-diff2', color: DIFF_COLORS[i], sub: `ノーツ ${ch.stats.count}${b ? '　ベスト ' + b.score.toLocaleString() : ''}`, id: 'diff-' + d.id });
      btn.prepend(el('span', { class: 'diff-lv', text: ch.level }));
      const chip = rankChip(b);
      if (chip) btn.append(chip);
      return btn;
    });
    return {
      title: '難易度選択',
      crumb: crumb(modeCrumb(), song.title),
      color: MODES.solo.color,
      body: [el('div', { class: 'diff-song', text: `${song.title}　／　${song.genre}　BPM ${song.bpm}` }), el('div', { class: 'grid grid-4' }, btns)],
      foot: button('練習する（区間・速さを選ぶ）', () => Nav.go('practice'), { variant: 'sub', id: 'to-practice' }),
    };
  }

  /* =========================================================
   * ルール設定（CPU戦）：CPUの人数・強さ・曲数（7-1）
   * ========================================================= */
  function RulesScreen() {
    const battle = Session.mode === 'battle';
    const avail = playableSongs().length;
    const stepper = (label, get, set, lo, hi, id) => {
      const val = el('span', { class: 'set-value set-value-big' });
      const show = () => (val.textContent = get());
      show();
      const step = (d) => {
        set(Math.max(lo, Math.min(hi, get() + d)));
        show();
        refresh();
      };
      return el('div', { class: 'set-row' }, [
        el('label', { class: 'set-label', text: label }),
        el('div', { class: 'set-control stepper' }, [
          button('−5', () => step(-5), { className: 'btn-step btn-step5' }),
          button('−', () => step(-1), { className: 'btn-step', id: id + '-down' }),
          val,
          button('＋', () => step(1), { className: 'btn-step', id: id + '-up' }),
          button('＋5', () => step(5), { className: 'btn-step btn-step5' }),
        ]),
      ]);
    };
    const toggles = (label, items, get, set) => {
      const bs = items.map(([v, t]) =>
        button(t, () => {
          set(v);
          refresh();
        }, { className: 'btn-toggle', dataset: { v } })
      );
      bs.forEach((b, i) => (b.dataset.v = items[i][0]));
      const row = el('div', { class: 'set-row' }, [el('label', { class: 'set-label', text: label }), el('div', { class: 'set-control toggles' }, bs)]);
      row._sync = () => bs.forEach((b) => b.classList.toggle('is-on', String(get()) === b.dataset.v));
      return row;
    };
    const total = el('div', { class: 'rules-total' });
    const strengthRow = toggles(
      'CPUの強さ',
      Object.entries(NLM.Battle.STRENGTH).map(([k, v]) => [k, v.name]),
      () => Session.strength,
      (v) => (Session.strength = v)
    );
    const rows = [stepper('CPUの人数', () => Session.cpuCount, (v) => (Session.cpuCount = v), 1, 31, 'cpu'), strengthRow];
    let countRow = null;
    let freeRow = null;
    if (battle) {
      countRow = toggles(
        '曲数',
        [
          ['3', '3曲'],
          ['5', '5曲'],
          ['free', '自由'],
        ],
        () => (Session.songCountFree ? 'free' : Session.songCount),
        (v) => {
          if (v === 'free') Session.songCountFree = true;
          else {
            Session.songCountFree = false;
            Session.songCount = Number(v);
          }
        }
      );
      freeRow = stepper('自由な曲数', () => Session.songCount, (v) => (Session.songCount = v), 1, 10, 'songs');
      rows.push(countRow, freeRow);
    }
    function refresh() {
      strengthRow._sync();
      if (countRow) {
        countRow._sync();
        freeRow.hidden = !Session.songCountFree;
      }
      const n = Session.cpuCount + 1;
      const songs = battle ? Math.min(Session.songCount, avail) : 1;
      total.textContent = `参加 ${n}人（あなた＋CPU ${Session.cpuCount}人）${battle ? `　曲数 ${songs}曲` : ''}${battle && Session.songCount > avail ? `（遊べる曲が${avail}曲のため）` : ''}`;
    }
    refresh();
    return {
      title: battle ? 'ルール設定' : 'ロビー',
      crumb: modeCrumb(),
      body: el('div', { class: 'settings-panel rules-panel' }, rows.concat([total])),
      foot: nextButton('決定 → キャラ選択へ', () => Nav.go('charSelect')),
    };
  }

  /* =========================================================
   * キャラ選択・キャラ一覧（8章）
   * listMode=true：メニューの「キャラ一覧」（選ぶボタンなし）
   * ========================================================= */
  /** 未解禁の絵を影絵にする（描いた形の上だけを塗る） */
  function silhouette(g, w, h) {
    g.save();
    g.globalCompositeOperation = 'source-atop';
    g.fillStyle = '#1c1440';
    g.fillRect(0, 0, w, h);
    g.restore();
  }

  /** 解禁条件と進み具合の行（9-2：例「パーフェクト 640 / 1000」） */
  function progressLine(u, locked) {
    if (!locked) return el('div', { class: 'char-line dim' }, [el('b', { text: '解禁　' }), u ? '解禁済み' : '最初から使える']);
    const pr = NLM.Unlock.progress(u);
    return el('div', { class: 'unlock-prog' }, [
      el('div', { class: 'char-line' }, [el('b', { text: '解禁条件　' }), pr.text]),
      el('div', { class: 'prog-row' }, [el('div', { class: 'prog-bar' }, [el('div', { class: 'prog-fill', style: { width: Math.round(pr.ratio * 100) + '%' } })]), el('span', { class: 'prog-label', text: pr.label })]),
    ]);
  }

  function CharScreen(listMode) {
    const Chars = NLM.Characters;
    const unlocked = new Set(Save.data.unlocked.characters);
    let sel = Chars.get(Session.charId) && (listMode || unlocked.has(Session.charId)) ? Chars.get(Session.charId) : Chars.get(Save.data.unlocked.characters[0]) || Chars.list[0];
    const big = el('canvas', { class: 'char-big' });
    const small = ['skill', 'win', 'lose'].map(() => el('canvas', { class: 'char-small' }));
    const info = el('div', { class: 'char-info' });
    const okBtn = button('このキャラで決定', () => {
      Session.charId = sel.id;
      Nav.go(Session.mode === 'solo' ? 'songSelect' : 'songDiffSelect');
    }, { variant: 'primary', className: 'btn-next', id: 'char-ok' });
    const cells = Chars.list.map((c) => {
      const locked = !unlocked.has(c.id);
      const b = button('', () => pick(c), { className: 'btn-char' + (locked ? ' is-locked' : ''), color: c.color, id: 'char-' + c.id });
      b.replaceChildren(el('img', { src: Chars.iconURL(c, 56), alt: '' }), el('span', { class: 'char-name', text: c.name }));
      b.addEventListener('focus', () => pick(c));
      return b;
    });
    function paintSmall() {
      ['skill', 'win', 'lose'].forEach((ex, i) => {
        const cv = small[i];
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = Math.max(1, r.width * dpr);
        cv.height = Math.max(1, r.height * dpr);
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        const sz = Math.min(cv.width, cv.height);
        Chars.draw(g, sel, cv.width / 2, cv.height / 2, sz * 0.9, ex);
        if (!unlocked.has(sel.id)) silhouette(g, cv.width, cv.height);
      });
    }
    function pick(c) {
      sel = c;
      cells.forEach((b, i) => b.classList.toggle('is-sel', Chars.list[i] === c));
      const locked = !unlocked.has(c.id);
      const sk = c.skill;
      const coopNote = c.coopOK ? '' : '（協奏ではスキルなし）';
      info.replaceChildren(
        el('div', { class: 'char-title' }, [el('span', { class: 'char-no', text: 'No.' + c.no }), el('span', { text: c.name }), locked ? el('span', { class: 'char-lock', text: '未解禁' }) : null]),
        el('div', { class: 'char-motif', text: c.motif }),
        el('div', { class: 'char-line' }, [el('b', { text: '特性　' }), c.trait.text]),
        el('div', { class: 'char-line' }, [el('b', { text: 'スキル　' }), `${sk.name}：${sk.text}`]),
        el('div', { class: 'char-line dim' }, [`メーター満タン ${sk.meter}　対象：${NLM.Characters.TARGET_JA[sk.target]}`, el('span', { class: 'char-coop', text: coopNote })]),
        progressLine(c.unlock, locked)
      );
      okBtn.disabled = locked;
      if (Nav.cur && Nav.cur.def === def) paintSmall();
    }
    const def = {
      title: listMode ? 'キャラ一覧' : 'キャラ選択',
      crumb: listMode ? null : modeCrumb(),
      body: el('div', { class: 'char-layout' }, [
        el('div', { class: 'char-grid' }, cells),
        el('div', { class: 'char-detail' }, [el('div', { class: 'char-stage' }, [big, el('div', { class: 'char-smalls' }, small)]), info]),
      ]),
      foot: listMode ? null : okBtn,
      onEnter(screen) {
        pick(sel);
        const target = cells[Chars.list.indexOf(sel)];
        if (target) target.focus({ preventScroll: true });
        paintSmall();
        GameLoop.start(() => {
          const r = big.getBoundingClientRect();
          const dpr = Math.min(2, window.devicePixelRatio || 1);
          if (big.width !== Math.round(r.width * dpr)) {
            big.width = Math.round(r.width * dpr);
            big.height = Math.round(r.height * dpr);
          }
          const g = big.getContext('2d');
          g.clearRect(0, 0, big.width, big.height);
          const sz = Math.min(big.width, big.height);
          // 待機の表情（線が少しずつ揺れる）
          Chars.draw(g, sel, big.width / 2, big.height / 2 + Math.sin(performance.now() / 400) * sz * 0.02, sz * 0.86, 'idle', { boil: true });
          if (!unlocked.has(sel.id)) silhouette(g, big.width, big.height); // 未解禁：影絵
        });
      },
      onLeave() {
        GameLoop.stop();
      },
    };
    return def;
  }

  /* =========================================================
   * 曲・難易度選択（CPU戦）：演争は曲数ぶん順番に選ぶ／協奏は1曲（7-1）
   * ========================================================= */
  function MatchSongScreen() {
    const songs = listedSongs();
    const avail = songs.filter((s) => !isSongLocked(s)).length;
    const need = Session.mode === 'battle' ? Math.max(1, Math.min(Session.songCount, avail)) : 1;
    const picked = [];
    const info = el('div', { class: 'diff-song' });
    const PER = 6;
    let page = 0;
    const grid = el('div', { class: 'song-grid' });
    const pageEl = el('div', { class: 'page-info' });
    const prevB = button('◀', () => {
      page--;
      draw();
    }, { className: 'btn-arrow' });
    const nextB = button('▶', () => {
      page++;
      draw();
    }, { className: 'btn-arrow' });
    let cards = [];
    function draw() {
      const pages = Math.max(1, Math.ceil(songs.length / PER));
      page = (page + pages) % pages;
      cards = songs.slice(page * PER, page * PER + PER).map((s, i) => {
        const badge = el('span', { class: 'pick-badge' });
        const b = songButton(s, page * PER + i, `${s.genre}　BPM ${s.bpm}${s.proto ? '　［試作・開発中のみ］' : ''}`, () => {
          const k = picked.indexOf(s.id);
          if (k >= 0) picked.splice(k, 1);
          else if (need === 1) picked.splice(0, picked.length, s.id);
          else if (picked.length < need) picked.push(s.id);
          refresh();
        });
        b.append(badge);
        b._badge = badge;
        b._id = s.id;
        return b;
      });
      grid.replaceChildren(...cards);
      pageEl.textContent = pages > 1 ? `${page + 1} / ${pages}` : '';
      prevB.style.visibility = nextB.style.visibility = pages > 1 ? 'visible' : 'hidden';
      refresh();
    }
    const diffs = NLM.Songs.DIFFICULTIES.map((d, i) =>
      button(d.name, () => {
        Session.difficulty = d.id;
        startMatch(picked.slice(), d.id);
      }, { className: 'btn-diff', color: DIFF_COLORS[i], id: 'mdiff-' + d.id })
    );
    function refresh() {
      cards.forEach((b) => {
        const k = picked.indexOf(b._id);
        b.classList.toggle('is-on', k >= 0);
        b._badge.textContent = k >= 0 ? (need > 1 ? String(k + 1) : '✓') : '';
      });
      const ready = picked.length === need;
      diffs.forEach((b) => (b.disabled = !ready));
      const names = picked.map((id) => NLM.Songs.get(id).title).join(' → ');
      info.textContent = (need > 1 ? `演奏する順に${need}曲選んでください（${picked.length}/${need}）。全曲同じ難易度です` : '曲を1つ選んでください') + (names ? `　選択中：${names}` : '');
    }
    draw();
    return {
      title: '曲・難易度選択',
      crumb: modeCrumb(),
      body: el('div', { class: 'song-select' }, [info, el('div', { class: 'song-page' }, [prevB, grid, nextB]), pageEl, el('div', { class: 'grid grid-4' }, diffs)]),
    };
  }

  /**
   * 練習用の譜面：元の曲の譜面から区間 [from, to) を切り出し、速さに合わせて時刻を伸ばす（ノーツの並びは本番と同じ）
   */
  function practiceChart(orig, pr, slowSong) {
    const r = pr.rate;
    const keep = new Set();
    orig.notes.forEach((n, i) => {
      if (n.type === 'release') return;
      if (n.t >= pr.from - 1e-6 && n.t < pr.to - 1e-6) {
        keep.add(i);
        if (n.type === 'hold' && n.tail !== undefined) keep.add(n.tail);
      }
    });
    const idx = [...keep].sort((a, b) => a - b);
    const map = new Map(idx.map((i, k) => [i, k]));
    const notes = idx.map((i) => {
      const n = Object.assign({}, orig.notes[i]);
      n.t /= r;
      if (n.end !== undefined) n.end /= r;
      if (n.tail !== undefined) n.tail = map.get(n.tail);
      if (n.type === 'roll' && n.target) n.target = Math.max(4, Math.round(n.target * r));
      return n;
    });
    const compiled = NLM.Music.compile(slowSong);
    return Object.assign({}, orig, { notes, compiled, duration: pr.to / r + 1 });
  }

  /** チュートリアルを始める（メニューから選ぶモード） */
  function startTutorial() {
    AE.init();
    Session.mode = 'solo';
    Session.match = {
      mode: 'solo',
      difficulty: 'easy',
      songs: ['tutorial'],
      index: 0,
      played: [],
      auto: false,
      preview: false,
      tutorial: true,
      battle: NLM.Battle.create({ mode: 'solo', players: [{ name: 'あなた', charId: Session.charId || 'neonyan', local: true }], seed: 1 }),
      recorded: false,
    };
    Nav.goWithStack([{ id: 'menu' }], 'play', {});
  }

  /** 練習を始める：opts = { songId, difficulty, from, to（秒）, rate } */
  function startPractice(opts) {
    const base = NLM.Songs.get(opts.songId);
    const slow = opts.rate === 1 ? base : Object.assign({}, base, { id: base.id + '@' + opts.rate, bpm: base.bpm * opts.rate, chartSeed: base.id });
    Session.mode = 'solo';
    Session.match = {
      mode: 'solo',
      difficulty: opts.difficulty,
      songs: [base.id],
      index: 0,
      played: [],
      auto: false,
      preview: false,
      practice: { songId: base.id, from: opts.from, to: opts.to, rate: opts.rate, label: opts.label },
      songObj: slow,
      battle: NLM.Battle.create({ mode: 'solo', players: [{ name: 'あなた', charId: Session.charId || 'neonyan', local: true }], seed: 1 }),
      recorded: false,
    };
    Nav.goWithStack([{ id: 'menu' }, { id: 'charSelect' }, { id: 'songSelect' }, { id: 'diffSelect' }, { id: 'practice' }], 'play', {});
  }

  /* 練習の設定：難易度・区間・速さ */
  function PracticeScreen() {
    const song = NLM.Songs.get(Session.songId) || playableSongs()[0];
    const c = NLM.Music.compile(song);
    const P = (Session.practiceOpts = Session.practiceOpts && Session.practiceOpts.songId === song.id ? Session.practiceOpts : { songId: song.id, difficulty: Session.difficulty || 'normal', sec: -1, rate: 1 });
    const toggles = (items, get, set) => {
      const bs = items.map(([v, t]) => {
        const b = button(t, () => {
          set(v);
          sync();
        }, { className: 'btn-toggle' });
        b.dataset.v = v;
        return b;
      });
      const box = el('div', { class: 'set-control toggles' }, bs);
      box._sync = () => bs.forEach((b) => b.classList.toggle('is-on', String(get()) === b.dataset.v));
      return box;
    };
    const diffT = toggles(NLM.Songs.DIFFICULTIES.map((d) => [d.id, d.name]), () => P.difficulty, (v) => (P.difficulty = v));
    const secs = [[-1, '曲の全体']].concat(c.sections.map((x, i) => [i, `${x.name}（${x.bars}小節）`]));
    const secT = toggles(secs, () => P.sec, (v) => (P.sec = Number(v)));
    const rateT = toggles(
      [
        [1, '1倍'],
        [0.75, '0.75倍'],
        [0.5, '0.5倍'],
      ],
      () => P.rate,
      (v) => (P.rate = Number(v))
    );
    function sync() {
      diffT._sync();
      secT._sync();
      rateT._sync();
    }
    sync();
    const go = () => {
      let from = 0;
      let to = c.duration + 1;
      let label = '曲の全体';
      if (P.sec >= 0) {
        const x = c.sections[P.sec];
        from = x.startBeat * c.spb;
        to = (x.startBeat + x.beats) * c.spb;
        label = x.name;
      }
      Session.difficulty = P.difficulty;
      startPractice({ songId: song.id, difficulty: P.difficulty, from, to, rate: P.rate, label });
    };
    return {
      title: '練習',
      crumb: crumb(modeCrumb(), song.title),
      color: MODES.solo.color,
      body: el('div', { class: 'settings-panel practice-panel' }, [
        el('div', { class: 'diff-song', text: `${song.title}　／　練習は記録・解禁に数えません` }),
        el('div', { class: 'set-row set-row-wide' }, [el('label', { class: 'set-label', text: '難易度' }), diffT]),
        el('div', { class: 'set-row set-row-wide' }, [el('label', { class: 'set-label', text: '区間' }), secT]),
        el('div', { class: 'set-row set-row-wide' }, [el('label', { class: 'set-label', text: '速さ' }), rateT]),
      ]),
      foot: nextButton('練習を始める', go),
    };
  }

  /** 試合を始める（独奏も1人の試合として扱う） */
  function startMatch(songIds, difficulty, opts) {
    opts = opts || {};
    const mode = Session.mode || 'solo';
    const players = [{ name: 'あなた', charId: Session.charId || 'neonyan', local: true }];
    if (mode !== 'solo') {
      const used = {};
      for (let i = 0; i < Session.cpuCount; i++) {
        const c = NLM.Characters.list[Math.floor(Math.random() * NLM.Characters.list.length)];
        used[c.id] = (used[c.id] || 0) + 1;
        players.push({ name: c.name + (used[c.id] > 1 ? used[c.id] : ''), charId: c.id, cpu: true, strength: Session.strength });
      }
    }
    Session.match = {
      mode,
      difficulty,
      songs: songIds,
      index: 0,
      played: [],
      auto: !!opts.auto,
      preview: !!opts.preview,
      battle: NLM.Battle.create({ mode, players, seed: Math.floor(Math.random() * 1e9) }),
      recorded: false,
    };
    if (opts.preview) {
      Nav.go('play', {});
      return;
    }
    const stack =
      mode === 'solo'
        ? [{ id: 'menu' }, { id: 'charSelect' }, { id: 'songSelect' }, { id: 'diffSelect' }]
        : [{ id: 'menu' }, { id: 'opponent' }, { id: 'cpuRules' }, { id: 'charSelect' }, { id: 'songDiffSelect' }];
    Nav.goWithStack(stack, 'play', {});
  }

  /* =========================================================
   * フレンド対戦（7章・14章）：部屋を作る・入る、ロビー、投票
   * 部屋の状態は room.js（ホストが決めて全員に配る）。画面はその状態を表示し、希望を送るだけ。
   * ========================================================= */
  const Room = NLM.Room;
  const Net = NLM.Net;
  const STRENGTH_NAMES = () => Object.entries(NLM.Battle.STRENGTH).map(([k, v]) => [k, v.name]);

  function myChars() {
    return NLM.Characters.list.filter((c) => Save.data.unlocked.characters.includes(c.id));
  }
  function defaultChar() {
    const ok = myChars();
    return ok.some((c) => c.id === Session.charId) ? Session.charId : ok[0].id;
  }

  /** 確認・お知らせの小窓。buttons: [[文字, 押した時の処理, 主ボタンか]] */
  function showDialog(title, text, buttons) {
    if (UI.modalClose) UI.modalClose();
    let closed = false;
    const close = () => {
      if (closed) return;
      closed = true;
      ov.remove();
      UI.modalClose = null;
    };
    const bs = buttons.map(([label, fn, primary]) =>
      button(label, () => {
        close();
        if (fn) fn();
      }, { variant: primary ? 'primary' : 'sub', className: primary ? 'btn-next' : '' })
    );
    const ov = el('div', { class: 'unlock-ov dialog-ov' }, [
      el('div', { class: 'unlock-card dialog-card', style: { '--c': 'var(--neon-cyan)' } }, [
        el('div', { class: 'unlock-name', text: title }),
        text ? el('div', { class: 'unlock-desc' }, text) : null,
        el('div', { class: 'foot-row' }, bs),
      ]),
    ]);
    document.body.append(ov);
    UI.modalClose = close;
    bs[0].focus();
  }

  /** 部屋から抜ける（確認あり） */
  function confirmLeave() {
    const host = Room.isHost;
    showDialog(host ? '部屋を閉じますか？' : '部屋から抜けますか？', host ? 'ホストが抜けると、部屋は解散します。' : '', [
      ['抜ける', () => leaveRoom(), true],
      ['やめる', null],
    ]);
  }
  function leaveRoom() {
    Room.leave();
    Session.match = null;
    Nav.reset('menu');
  }

  /* 部屋の進み方に合わせて、全員の画面を切り替える（ホストが決めた phase に従う） */
  Room.onChange((S, why) => {
    if (why === 'lost') {
      Session.match = null;
      Net.close();
      Room.reset();
      Nav.reset('menu');
      showDialog('ホストとの接続が切れました', '試合を終了しました。メニューに戻ります。', [['OK', null, true]]);
      return;
    }
    if (!S || !Nav.cur) return;
    const at = Nav.cur.id;
    const base = [{ id: 'menu' }, { id: 'opponent' }, { id: 'room' }];
    if (S.phase === 'lobby' && at !== 'lobby' && at !== 'room') Nav.goWithStack(base, 'lobby');
    else if (/Vote|Result/.test(S.phase) && at !== 'vote') Nav.goWithStack(base.concat([{ id: 'lobby' }]), 'vote');
    else if (S.phase === 'play' && S.match && (!Session.match || Session.match.netId !== S.match.id)) startNetMatch(S.match);
  });

  /* ---------- 部屋を作る / 部屋に入る ---------- */
  function RoomScreen() {
    const msg = el('div', { class: 'room-msg', role: 'status' });
    const input = el('input', {
      class: 'room-input',
      type: 'text',
      maxlength: '5',
      placeholder: 'ABCDE',
      autocomplete: 'off',
      autocapitalize: 'characters',
      spellcheck: 'false',
      'aria-label': '部屋番号',
    });
    // 名前（フレンド対戦で表示・端末に保存）
    const nameIn = el('input', { class: 'room-name', type: 'text', maxlength: '8', placeholder: '名前（8文字まで）', autocomplete: 'nickname', 'aria-label': '名前' });
    nameIn.value = Save.data.settings.name || '';
    const saveName = () => {
      Save.data.settings.name = nameIn.value.trim().slice(0, 8);
      Save.save();
    };
    nameIn.addEventListener('change', saveName);
    nameIn.addEventListener('keydown', (e) => e.stopPropagation());
    let busy = false;
    const setMsg = (text, err) => {
      msg.textContent = text || '';
      msg.classList.toggle('is-err', !!err);
    };
    const create = async () => {
      if (busy) return;
      saveName();
      busy = true;
      setMsg('部屋を作っています…');
      try {
        await Room.create(Session.mode, defaultChar(), Save.data.settings.name);
        Session.role = 'host';
        busy = false;
        Nav.go('lobby');
      } catch (e) {
        Room.leave();
        setMsg(e.message, true);
      }
      busy = false;
    };
    const join = async () => {
      if (busy) return;
      const code = input.value.trim().toUpperCase();
      if (code.length !== 5) {
        setMsg('部屋番号（5文字）を入れてください', true);
        return;
      }
      saveName();
      busy = true;
      setMsg('部屋につないでいます…');
      try {
        await Room.join(code, defaultChar(), Save.data.settings.name);
        if (Room.state.mode !== Session.mode) {
          Session.mode = Room.state.mode; // 部屋のモード（演争・協奏）に合わせる
        }
        Session.role = 'guest';
        busy = false;
        Nav.go('lobby');
      } catch (e) {
        Room.leave();
        setMsg(e.message, true);
      }
      busy = false;
    };
    input.addEventListener('keydown', (e) => {
      e.stopPropagation(); // 文字の入力中は画面のキー操作に回さない
      if (e.key === 'Enter') {
        e.preventDefault();
        join();
      } else if (e.key === 'Escape') input.blur();
    });
    input.addEventListener('input', () => {
      input.value = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5);
    });
    return {
      title: 'フレンド',
      crumb: modeCrumb(),
      body: [
        el('div', { class: 'room-name-row' }, [el('label', { class: 'set-label', text: 'あなたの名前' }), nameIn]),
        el('div', { class: 'grid grid-2 big-choice room-choice' }, [
          button('部屋を作る', create, { variant: 'primary', sub: 'ホストになって部屋番号を友達に伝える', color: 'var(--neon-pink)' }),
          el('div', { class: 'room-join', style: { '--c': 'var(--neon-cyan)' } }, [
            el('label', { class: 'set-label', text: '部屋番号を入れて参加' }),
            input,
            button('部屋に入る', join, { variant: 'primary', color: 'var(--neon-cyan)', className: 'btn-join' }),
          ]),
        ]),
        msg,
        el('p', { class: 'room-note', text: '同じ部屋番号を入れた人どうしでつながります（2〜32人）。ログインは要りません。' }),
      ],
      onLeave() {
        if (busy) Room.leave();
      },
    };
  }

  /* ---------- ロビー：参加者・キャラ選択・ホストの設定 ---------- */
  function LobbyScreen() {
    const S0 = Room.state;
    if (!S0) return { title: 'ロビー', body: placeholder('部屋がありません'), onEnter: () => setTimeout(() => Nav.reset('menu')) };
    const battle = S0.mode === 'battle';
    const Chars = NLM.Characters;
    const codeEl = el('div', { class: 'room-code' });
    const listEl = el('div', { class: 'lobby-list' });
    const infoEl = el('div', { class: 'rules-total' });
    const startBtn = button('投票を始める', () => Room.startVote(), { variant: 'primary', className: 'btn-next' });
    const waitEl = el('div', { class: 'lobby-wait', text: 'ホストが始めるのを待っています…' });
    let off = null;

    // キャラ選択（自分の解禁済みのキャラから）
    const charBtns = myChars().map((c) => {
      const b = button('', () => {
        Session.charId = c.id;
        Room.setChar(c.id);
      }, { className: 'lobby-char' });
      b.dataset.id = c.id;
      b.replaceChildren(el('img', { src: Chars.iconURL(c, 56), alt: '' }), el('span', { class: 'lobby-char-n', text: c.name }));
      b.style.setProperty('--c', c.color);
      if (!battle && c.skill.attack) b.append(el('span', { class: 'lobby-char-note', text: 'スキルなし' }));
      return b;
    });
    const charInfo = el('div', { class: 'lobby-char-info' });

    // ホストの設定（ゲストは見るだけ）
    const ctl = [];
    const stepRow = (label, key, lo, hi) => {
      const val = el('span', { class: 'set-value set-value-big' });
      const step = (d) => Room.setSettings({ [key]: Math.max(lo(), Math.min(hi(), Room.state.settings[key] + d)) });
      const bs = [button('−', () => step(-1), { className: 'btn-step' }), button('＋', () => step(1), { className: 'btn-step' })];
      ctl.push(...bs);
      const row = el('div', { class: 'set-row' }, [el('label', { class: 'set-label', text: label }), el('div', { class: 'set-control stepper' }, [bs[0], val, bs[1]])]);
      row._sync = () => (val.textContent = Room.state.settings[key]);
      return row;
    };
    const toggleRow = (label, items, get, set) => {
      const bs = items.map(([v, t]) => {
        const b = button(t, () => set(v), { className: 'btn-toggle' });
        b.dataset.v = v;
        return b;
      });
      ctl.push(...bs);
      const row = el('div', { class: 'set-row' }, [el('label', { class: 'set-label', text: label }), el('div', { class: 'set-control toggles' }, bs)]);
      row._sync = () => bs.forEach((b) => b.classList.toggle('is-on', String(get()) === b.dataset.v));
      return row;
    };
    const S = () => Room.state.settings;
    const rows = [
      stepRow('最大人数', 'max', () => Math.max(2, Room.state.members.length), () => 32),
      stepRow('CPUで補う人数', 'cpu', () => 0, () => S().max - Room.state.members.length),
      toggleRow('CPUの強さ', STRENGTH_NAMES(), () => S().strength, (v) => Room.setSettings({ strength: v })),
    ];
    let freeRow = null;
    if (battle) {
      rows.push(
        toggleRow(
          '曲数',
          [
            ['3', '3曲'],
            ['5', '5曲'],
            ['free', '自由'],
          ],
          () => (S().free ? 'free' : S().songs),
          (v) => Room.setSettings(v === 'free' ? { free: true } : { free: false, songs: Number(v) })
        )
      );
      freeRow = stepRow('自由な曲数', 'songs', () => 1, () => 10);
      rows.push(freeRow);
    }

    function draw() {
      const R = Room.state;
      if (!R) return;
      codeEl.replaceChildren(el('span', { class: 'room-code-k', text: '部屋番号' }), el('span', { class: 'room-code-v', text: R.code }));
      const rowsEl = R.members.map((m) => {
        const c = Chars.get(m.charId) || Chars.list[0];
        const me = m.id === Room.me;
        const r = el('div', { class: 'lobby-row' + (me ? ' is-me' : '') }, [
          el('img', { src: Chars.iconURL(c, 40), alt: '' }),
          el('span', { class: 'lobby-name', text: `${m.name || 'P' + m.num}${m.id === 'host' ? '（ホスト）' : ''}${me ? '　あなた' : ''}` }),
          el('span', { class: 'lobby-cname', text: c.name }),
        ]);
        r.style.setProperty('--c', c.color);
        return r;
      });
      if (R.settings.cpu) rowsEl.push(el('div', { class: 'lobby-row is-cpu' }, [el('span', { class: 'lobby-name', text: `CPU ×${R.settings.cpu}（${NLM.Battle.STRENGTH[R.settings.strength].name}）` })]));
      listEl.replaceChildren(...rowsEl);
      const meM = Room.member(Room.me);
      charBtns.forEach((b) => b.classList.toggle('is-on', !!meM && b.dataset.id === meM.charId));
      const mc = meM && Chars.get(meM.charId);
      if (mc) charInfo.textContent = `${mc.name}：スキル「${mc.skill.name}」${mc.skill.text}${!battle && mc.skill.attack ? '（協奏ではスキルなし）' : ''}`;
      rows.forEach((r) => r._sync());
      if (freeRow) freeRow.hidden = !R.settings.free;
      ctl.forEach((b) => (b.disabled = !Room.isHost));
      const total = R.members.length + R.settings.cpu;
      infoEl.textContent = `参加 ${total}人（フレンド ${R.members.length}人＋CPU ${R.settings.cpu}人${R.settings.cpu ? `・${NLM.Battle.STRENGTH[R.settings.strength].name}` : ''}）／最大 ${R.settings.max}人${battle ? `　曲数 ${R.settings.songs}曲` : ''}`;
      startBtn.disabled = total < 2;
      startBtn.hidden = !Room.isHost;
      waitEl.hidden = Room.isHost && total >= 2;
      waitEl.textContent = Room.isHost ? '友達の参加を待つか、CPUで補ってください（2人以上）' : 'ホストが始めるのを待っています…';
    }
    return {
      title: battle ? 'ロビー（演争）' : 'ロビー（協奏）',
      crumb: modeCrumb(),
      color: MODES[S0.mode].color,
      body: el('div', { class: 'lobby' }, [
        codeEl,
        el('div', { class: 'lobby-cols' }, [
          el('div', { class: 'lobby-col' }, [
            el('h2', { class: 'lobby-h', text: '参加者' }),
            listEl,
            Room.isHost ? el('h2', { class: 'lobby-h', text: 'ホストの設定' }) : null,
            Room.isHost ? el('div', { class: 'settings-panel lobby-settings' }, rows) : null,
          ]),
          el('div', { class: 'lobby-col' }, [el('h2', { class: 'lobby-h', text: 'キャラ選択' }), el('div', { class: 'lobby-chars' }, charBtns), charInfo]),
        ]),
        infoEl,
      ]),
      foot: el('div', { class: 'foot-row' }, [startBtn, waitEl]),
      onEnter(screen) {
        off = Room.onChange(() => draw());
        draw();
        // スマホの縦画面：最初は参加者の一覧から見えるように
        const cols = screen.querySelector('.lobby-cols');
        if (cols) cols.scrollTop = 0;
      },
      onLeave() {
        if (off) off();
      },
      onBack: confirmLeave,
    };
  }

  /* ---------- 投票：曲（演争は曲数ぶん・協奏は1曲）→ 難易度。制限時間20秒・同票はルーレット ---------- */
  function VoteScreen() {
    const timerEl = el('div', { class: 'vote-timer' });
    const headEl = el('div', { class: 'vote-head' });
    const listEl = el('div', { class: 'vote-list' });
    const resultEl = el('div', { class: 'vote-result' });
    let off = null;
    let tick = null;
    let shownKey = null;
    let picks = [];
    let rouletteTimer = null;
    const songName = (id) => {
      const s = NLM.Songs.get(id);
      return s ? s.title : id;
    };
    const diffName = (id) => NLM.Songs.DIFFICULTIES.find((d) => d.id === id).name;

    function buildChoices(v) {
      picks = [];
      if (v.kind === 'diff') {
        return NLM.Songs.DIFFICULTIES.map((d, i) => {
          const b = button(d.name, () => choose(v, d.id), { color: DIFF_COLORS[i], className: 'btn-diff vote-btn' });
          b.dataset.v = d.id;
          return b;
        });
      }
      return v.cands.map((id, i) => {
        const s = NLM.Songs.get(id);
        const b = button(s.title, () => choose(v, id), {
          className: 'vote-btn vote-song',
          sub: `${s.genre}　BPM ${s.bpm}`,
        });
        b.dataset.v = id;
        b.style.setProperty('--c', LANE_COLORS[(s.no || i) % 4]);
        return b;
      });
    }
    function choose(v, id) {
      if (v.result) return;
      if (v.pick === 1) picks = [id];
      else if (picks.includes(id)) picks = picks.filter((x) => x !== id);
      else if (picks.length < v.pick) picks = picks.concat(id);
      else picks = picks.slice(1).concat(id); // 上限を超えたら一番古い選択を外す
      Room.vote(picks);
      syncPicks();
    }
    function syncPicks() {
      listEl.querySelectorAll('.vote-btn').forEach((b) => {
        const k = picks.indexOf(b.dataset.v);
        b.classList.toggle('is-on', k >= 0);
        b.dataset.order = k >= 0 && Room.state.vote.pick > 1 ? k + 1 : '';
      });
    }
    function draw() {
      const R = Room.state;
      if (!R || !R.vote) return;
      const v = R.vote;
      const key = R.phase.replace('Result', 'Vote') + ':' + v.endsAt;
      if (key !== shownKey) {
        shownKey = key;
        listEl.replaceChildren(...buildChoices(v));
        listEl.classList.toggle('is-many', v.cands.length > 12);
        resultEl.replaceChildren();
        clearInterval(rouletteTimer);
        UI.focusFirst(listEl);
      }
      const what = v.kind === 'song' ? (v.pick > 1 ? `曲を${v.pick}曲まで選んでください（多い順に演奏）` : '曲を1曲選んでください') : '難易度を選んでください';
      headEl.textContent = v.result ? (v.kind === 'song' ? '曲が決まりました' : '難易度が決まりました') : `${what}　投票 ${v.voted}/${v.total}`;
      listEl.classList.toggle('is-closed', !!v.result);
      if (v.result && !resultEl.childNodes.length) showResult(v);
    }
    function showResult(v) {
      const name = v.kind === 'song' ? songName : diffName;
      const lines = v.result.chosen.map((id, i) => el('div', { class: 'vote-res-row' }, [el('span', { class: 'vote-res-no', text: v.kind === 'song' && v.pick > 1 ? `${i + 1}曲目` : '決定' }), el('span', { class: 'vote-res-name', text: name(id) }), el('span', { class: 'vote-res-n', text: `${v.result.count[id]}票` })]));
      resultEl.replaceChildren(...lines);
      // 得票数を候補の上にも出す
      listEl.querySelectorAll('.vote-btn').forEach((b) => {
        b.dataset.votes = `${v.result.count[b.dataset.v] || 0}票`;
        b.classList.toggle('is-won', v.result.chosen.includes(b.dataset.v));
      });
      const rl = v.result.roulette;
      if (rl && rl.cands.length > 1) {
        // 同票：ルーレット（候補の間を光が回り、だんだん遅くなって止まる）
        resultEl.prepend(el('div', { class: 'vote-roulette', text: v.result.abstain ? '全員棄権のためランダムで決定！' : '同票のためルーレット！' }));
        const btns = rl.cands.map((id) => listEl.querySelector(`.vote-btn[data-v="${id}"]`)).filter(Boolean);
        btns.forEach((b) => b.classList.remove('is-won'));
        let k = 0;
        let delay = 60;
        const spin = () => {
          btns.forEach((b, i) => b.classList.toggle('is-spin', i === k % btns.length));
          AE.sfx('move');
          k++;
          delay *= 1.12;
          if (delay < 420) rouletteTimer = setTimeout(spin, delay);
          else {
            btns.forEach((b) => b.classList.remove('is-spin'));
            btns.forEach((b) => b.classList.toggle('is-won', rl.won.includes(b.dataset.v)));
            AE.sfx('key');
          }
        };
        spin();
      } else AE.sfx('key');
    }
    function updateTimer() {
      const v = Room.state && Room.state.vote;
      if (!v) return;
      const left = Math.max(0, Math.ceil((Net.toLocal(v.endsAt) - performance.now()) / 1000));
      timerEl.textContent = v.result ? '' : `あと ${left} 秒`;
      timerEl.classList.toggle('is-hurry', !v.result && left <= 5);
    }
    return {
      title: '投票',
      crumb: modeCrumb(),
      back: true,
      body: el('div', { class: 'vote' }, [el('div', { class: 'vote-top' }, [headEl, timerEl]), listEl, resultEl]),
      onEnter() {
        off = Room.onChange(() => draw());
        draw();
        tick = setInterval(updateTimer, 200);
        updateTimer();
      },
      onLeave() {
        if (off) off();
        clearInterval(tick);
        clearTimeout(rouletteTimer);
      },
      onBack: confirmLeave,
    };
  }

  /** ホストが決めた試合を、各端末で始める */
  function startNetMatch(m) {
    const meId = Room.me;
    const players = m.players.map((p) => Object.assign({}, p, { local: p.netId === meId }));
    Session.mode = m.mode;
    Session.difficulty = m.difficulty;
    const me = players.find((p) => p.local);
    if (me) Session.charId = me.charId;
    Session.match = {
      mode: m.mode,
      difficulty: m.difficulty,
      songs: m.songs.slice(),
      index: 0,
      played: [],
      auto: false,
      preview: false,
      battle: NLM.Battle.create({ mode: m.mode, players, seed: m.seed, net: { host: Room.isHost } }),
      recorded: false,
      net: true,
      netId: m.id,
    };
    Nav.goWithStack([{ id: 'menu' }, { id: 'opponent' }, { id: 'room' }, { id: 'lobby' }], 'play', {});
  }

  /* =========================================================
   * 演奏画面（5・6・7章、13-2）
   * - 判定は judge.js、スキル・CPU・脱落は battle.js
   * - HPはレーンの裏にバーと%（協奏は共通HP）
   * - 妨害：レーンを隠す・上を隠す・見えにくく・揺らす・1.5倍速。0.5秒前に予告
   * ========================================================= */
  const JUDGE_TEXT = { perfect: 'PERFECT', great: 'GREAT', miss: 'MISS', auto: 'AUTO' };
  const EFFECT_JA = { blind: 'レーン隠し', curtain: '上が見えない', fog: 'ノーツが見えにくい', wobble: 'ノーツが揺れる', rush: '1.5倍速' };

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function PlayScreen(params) {
    params = params || {};
    if (params.auto) {
      // 譜面確認（サウンドテストから）：1人・自動演奏
      Session.mode = 'solo';
      Session.match = null;
      startMatchPreview(params);
    }
    let match = Session.match;
    if (!match) {
      const s0 = NLM.Songs.get(params.songId || Session.songId) || playableSongs()[0];
      Session.mode = Session.mode || 'solo';
      startMatchSilently([s0.id], params.difficulty || Session.difficulty || 'normal');
      match = Session.match;
    }
    const mode = match.mode;
    const B = match.battle;
    const net = !!match.net; // フレンド対戦（14章）
    const me = B.players.find((p) => p.local);
    const practice = match.practice || null; // 練習：{ songId, from, to（元の曲の秒）, rate }
    const song = match.songObj || NLM.Songs.get(match.songs[match.index]); // 練習の遅い版は match.songObj
    const diff = match.difficulty;
    const auto = match.auto;
    const chart = match.tutorial ? NLM.Tutorial.chart() : practice ? practiceChart(NLM.Chart.generate(NLM.Songs.get(practice.songId), diff), practice, song) : NLM.Chart.generate(song, diff);
    // 練習：区間の2秒前から始める（その前の3秒はカウントダウン中に流れる）
    const t0 = practice ? Math.max(0, practice.from / practice.rate - 2) : 0;
    const Judge = NLM.Judge;
    const st = me.st;
    const ses = Judge.createSession(chart, st, { auto });
    const speed = Save.data.settings.noteSpeed;
    const diffName = NLM.Songs.DIFFICULTIES.find((d) => d.id === diff).name;
    const multi = B.players.length > 1;
    const Chars = NLM.Characters;

    let when = null;
    let audio = null;
    let ended = false;
    let ro = null;
    let lastT = -3;
    let overAt = null;
    let plistAt = 0;
    let lastFlash = -9;
    const keyIdx = chart.notes.map((n, i) => (n.key ? i : -1)).filter((i) => i >= 0);
    let keyPtr = 0;
    const down = [false, false, false, false];
    const flashAt = [-9, -9, -9, -9];
    const flashRes = ['', '', '', ''];
    const FX = NLM.FX;
    const City = FX.City;
    let hpTrail = 100; // HPバーが削れる演出用（遅れて追いつく）
    let hpTrailAt = 0;
    let lastCount = 4;
    let warnShown = null;
    let cracks = null; // 脱落：レーンの割れ目

    const canvas = el('canvas', { class: 'play-canvas' });
    const g = canvas.getContext('2d');
    const judgeEl = el('div', { class: 'hud-judge' });
    const comboEl = el('div', { class: 'hud-combo' });
    const scoreEl = el('div', { class: 'hud-score', text: '0' });
    const meterFill = el('div', { class: 'meter-fill' });
    const meterEl = el('div', { class: 'hud-meter' }, [el('div', { class: 'meter-label', text: `SKILL　${me.char.skill.name}` }), el('div', { class: 'meter-bar' }, [meterFill])]);
    // スキル発動の瞬間：キャラの発動ポーズ（レーンの横に大きく・0.6秒）
    const poseCv = el('canvas', {});
    const poseName = el('div', { class: 'sp-name' });
    const poseEl = el('div', { class: 'skill-pose' }, [poseCv, poseName]);
    if (me.noSkill) meterEl.hidden = true; // 協奏：攻撃系のキャラはメーターを出さない（7-2）
    const skillEl = el('div', { class: 'hud-skill' });
    const logEl = el('div', { class: 'hud-log' });
    const warnEl = el('div', { class: 'play-warn' });
    const deadEl = el('div', { class: 'play-dead', text: '脱落… 観戦中' });
    deadEl.hidden = true;
    const flashEl = el('div', { class: 'coop-flash' });
    const overlayText = el('div', { class: 'ov-text', text: '読み込み中…' });
    const overlayBar = el('div', { class: 'ov-bar-fill' });
    const overlay = el('div', { class: 'play-overlay' }, [
      multi && B.songIndex === 0 && match.index > 0 ? null : null,
      el('div', { class: 'ov-song', text: `${match.songs.length > 1 ? `${match.index + 1}曲目／${match.songs.length}曲　` : ''}${song.title}` }),
      overlayText,
      el('div', { class: 'ov-bar' }, [overlayBar]),
    ]);
    const cutEl = el('div', { class: 'cutin' });
    // チュートリアルの説明文（レーンの上の方に出す）
    const capEl = el('div', { class: 'tut-cap' });
    capEl.hidden = true;
    let capIdx = -1;
    if (match.tutorial) st.meterMax = 24; // スキルゲージの説明のため、早めに溜まるように
    const laneWrap = el('div', { class: 'lane-wrap' }, [canvas, capEl, cutEl, warnEl, deadEl, overlay]);
    // 判定・コンボは叩いた位置（レーンの上）に出すので、横の表示は使わない
    judgeEl.hidden = true;
    comboEl.hidden = true;
    const zones = [0, 1, 2, 3].map((i) => el('div', { class: 'touch-zone', style: { '--c': `var(--lane-${i})` } }));
    const quitBtn = button('中断', () => Nav.back(), { variant: 'sub', className: 'btn-quit' });

    /* ---------- 参加者一覧（13-2：HPの順・32人でも1画面） ---------- */
    const plist = el('div', { class: 'plist' });
    const rows = new Map();
    if (multi) {
      const cols = B.players.length > 12 ? 2 : 1;
      plist.style.setProperty('--n', B.players.length);
      plist.style.setProperty('--cols', cols);
      plist.style.setProperty('--rows', Math.max(4, Math.ceil(B.players.length / cols)));
      plist.classList.toggle('is-many', B.players.length > 12);
      for (const p of B.players) {
        const fill = el('div', { class: 'pl-fill' });
        const pct = el('span', { class: 'pl-pct' });
        const row = el('div', { class: 'pl-row' + (p.local ? ' is-me' : '') }, [
          el('img', { class: 'pl-icon', src: Chars.iconURL(p.char, 40), alt: '' }),
          el('span', { class: 'pl-name', text: p.name }),
          el('div', { class: 'pl-bar' }, [fill]),
          pct,
        ]);
        row.style.setProperty('--c', p.char.color);
        rows.set(p, { row, fill, pct });
        plist.append(row);
      }
    }
    function updatePlist() {
      if (!multi) return;
      const order = mode === 'coop' ? B.players : B.standings().map((x) => x.p);
      // 変化があった所だけ書き換える（32人でも軽く：16-2）
      const set = (r, k, v, fn) => {
        if (r.last[k] === v) return;
        r.last[k] = v;
        fn(v);
      };
      order.forEach((p, i) => {
        const r = rows.get(p);
        r.last = r.last || {};
        set(r, 'order', i, (v) => (r.row.style.order = v));
        if (mode === 'coop') {
          set(r, 'w', Math.round(B.shared.hp || 0), (v) => (r.fill.style.width = v + '%'));
          set(r, 'res', p.lastRes || '', (v) => {
            r.pct.textContent = v ? JUDGE_TEXT[v] : '';
            r.pct.className = 'pl-pct j-' + v;
          });
        } else {
          set(r, 'w', Math.max(0, Math.round(p.st.hp * 2) / 2), (v) => (r.fill.style.width = v + '%'));
          set(r, 'pct', Math.ceil(p.st.hp), (v) => (r.pct.textContent = v + '%'));
          set(r, 'out', !p.alive, (v) => r.row.classList.toggle('is-out', v));
        }
      });
    }
    function flashRow(p) {
      const r = rows.get(p);
      if (!r) return;
      r.row.classList.remove('is-skill');
      void r.row.offsetWidth;
      r.row.classList.add('is-skill');
    }
    function log(text) {
      const line = el('div', { class: 'log-line', text });
      logEl.prepend(line);
      while (logEl.childNodes.length > 3) logEl.lastChild.remove();
    }

    // タイミング調整（設定）：判定は jo 秒、表示は vo 秒ずらす
    const jo = (Save.data.settings.judgeOffset || 0) / 1000;
    const vo = (Save.data.settings.visualOffset || 0) / 1000;
    const songTime = (ts) => AE.perfToAudio(ts) - when - jo;

    function showJudge(res) {
      judgeEl.textContent = JUDGE_TEXT[res];
      judgeEl.className = 'hud-judge j-' + res;
      void judgeEl.offsetWidth;
      judgeEl.classList.add('pop');
    }
    function updateHud() {
      scoreEl.textContent = st.score.toLocaleString();
      comboEl.textContent = st.combo >= 2 ? `${st.combo} COMBO` : '';
      const r = st.meter / st.meterMax;
      meterFill.style.setProperty('--m', Math.min(1, r));
      meterEl.classList.toggle('near', r >= 0.85); // 予告：満タン直前に脈打つ
    }
    function showSkill(text) {
      skillEl.textContent = text;
      skillEl.classList.remove('show');
      void skillEl.offsetWidth;
      skillEl.classList.add('show');
    }
    function battleEvents(out) {
      for (const e of out) {
        if (e.type === 'skill') {
          flashRow(e.p);
          if (e.p === me) cutIn('self', e);
          else if (e.skill.attack && e.targets.includes(me)) cutIn('hit', e);
          if (e.p !== me && multi) {
            const tg = e.targets.includes(me) && e.skill.target !== 'self' ? ' → あなた' : '';
            log(`${e.p.name}「${e.skill.name}」${tg}`);
          }
          skillBeams(e);
        } else if (e.type === 'elim') {
          log(`${e.p.name} 脱落`);
          const rr = rows.get(e.p);
          if (rr) {
            const c = FX.center(rr.row);
            FX.burst(c.x, c.y, '#ff4b5c', 20, 240, 0);
          }
          if (e.p === me) {
            deadEl.hidden = false;
            laneWrap.classList.add('is-dead');
            City.dimTarget = 1; // ネオンが消える
            AE.sfx('elim');
            const r = laneWrap.getBoundingClientRect();
            FX.burst(r.left + r.width / 2, r.top + r.height * 0.5, '#9aa0b8', 50, 300, 0);
            makeCracks();
          } else AE.sfx('hurt');
        } else if (e.type === 'over') {
          overAt = lastT;
        } else if (e.type === 'judge') {
          e.p.lastRes = e.result;
        }
      }
    }
    /* ---------- スキル：発動の瞬間（ポーズ・スキル名・効果音・街の色） ---------- */
    /* =========================================================
     * カットイン（監督の決定：レーンの上に大きく出す）
     * self：自分のスキル発動（ポーズ・スキル名・効果・誰に効いたか）
     * hit ：攻撃された（攻撃した人のマスコット・名前・スキル名・効果）
     * ========================================================= */
    let cutTimer = null;
    function targetText(e) {
      const sk = e.skill;
      if (sk.target === 'self' || mode === 'solo') return mode === 'solo' && sk.attack ? '独奏：スコア1.5倍に変化！' : '自分に効果！';
      const others = e.targets.filter((q) => q !== me);
      if (!others.length) return '対象がいません';
      if (sk.target === 'all') return `全員に！（${others.length + (e.targets.includes(me) ? 1 : 0)}人）`;
      const names = others.slice(0, 3).map((q) => q.name);
      return `→ ${names.join('・')}${others.length > 3 ? ` ほか${others.length - 3}人` : ''} に${sk.attack ? '攻撃！' : '効果！'}`;
    }
    function cutIn(kind, e) {
      const who = e.p;
      const sk = e.skill;
      const self = kind === 'self';
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const cv = el('canvas', { class: 'ci-pose' });
      const sz = 220;
      cv.width = cv.height = Math.round(sz * dpr);
      Chars.draw(cv.getContext('2d'), who.char, cv.width / 2, cv.height / 2, cv.width * 0.92, self ? 'skill' : 'win');
      const desc = mode === 'solo' && sk.attack ? 'ひとりの時は、スコアが一定時間1.5倍になります' : sk.text;
      cutEl.replaceChildren(
        el('div', { class: 'ci-band' }),
        cv,
        el('div', { class: 'ci-text' }, [
          el('div', { class: 'ci-who', text: self ? 'スキル発動！' : `${who.name} の攻撃！` }),
          el('div', { class: 'ci-skill', text: sk.name }),
          el('div', { class: 'ci-desc', text: desc }),
          el('div', { class: 'ci-target', text: self ? targetText(e) : `あなたに：${EFFECT_JA[(sk.effects.find((x) => EFFECT_JA[x.type]) || {}).type] || sk.name}` }),
        ]),
      );
      cutEl.className = 'cutin ' + (self ? 'is-self' : 'is-hit');
      cutEl.style.setProperty('--c', who.char.color);
      void cutEl.offsetWidth;
      cutEl.classList.add('show');
      clearTimeout(cutTimer);
      cutTimer = setTimeout(() => cutEl.classList.remove('show'), self ? 1500 : 1900);
      City.tint = who.char.color;
      City.tintUntil = performance.now() + 700;
      if (self) {
        skillFlashAt = lastT;
        AE.sfx('skill');
        FX.shake(8, 0.25);
      } else {
        AE.sfx('attacked');
        FX.shake(12, 0.3);
      }
    }
    /** 誰かがスキルを使った時：その人の欄から対象者へ光の線（13-2） */
    function skillBeams(e) {
      if (!multi) return;
      const from = rows.get(e.p);
      if (!from) return;
      const a = FX.center(from.row);
      for (const q of e.targets) {
        if (q === e.p) continue;
        const to = q === me ? FX.center(laneWrap) : rows.get(q) && FX.center(rows.get(q).row);
        if (to) FX.beam(a.x, a.y, to.x, to.y, e.p.char.color, 0.5);
      }
      if (e.p !== me && e.targets.includes(me) && e.skill.target !== 'self') AE.sfx('warn');
    }
    function makeCracks() {
      cracks = [];
      for (let k = 0; k < 7; k++) {
        const pts = [[Math.random(), Math.random() * 0.8]];
        for (let i = 0; i < 6; i++) {
          const p = pts[pts.length - 1];
          pts.push([p[0] + (Math.random() - 0.5) * 0.25, p[1] + Math.random() * 0.12]);
        }
        cracks.push(pts);
      }
    }

    /* ---------- 叩いた時の演出（13-3）：派手なものはレーンの外側・背景・レーンの裏で ---------- */
    function laneGeo(lane) {
      const r = laneWrap.getBoundingClientRect();
      const lw = r.width / 4;
      return { r, lw, x: r.left + lw * (lane + 0.5), y: r.top + r.height * 0.86 };
    }
    function hitFx(e) {
      const res = e.result;
      const n = e.note;
      if (n.type === 'roll') {
        const { r } = laneGeo(0);
        if (res !== 'miss') hits.push({ lane: -1, res, at: lastT, key: false });
        return;
      }
      const { r, y } = laneGeo(e.lane);
      // 光はレーンの上（叩いた位置）に描く（監督の決定）
      hits.push({ lane: e.lane, res, at: lastT, key: n.key });
      if (res === 'perfect' || res === 'auto') AE.sfx('perfect');
      else if (res === 'great') AE.sfx('great');
      else {
        AE.sfx('miss');
        hpTrailAt = lastT + 0.35;
      }
      if (n.key && res !== 'miss') {
        // キーノーツ：背景の看板が一斉に点灯＋画面（背景）が揺れる＋レーンの両脇に火花
        City.litUntil = performance.now() + 380;
        FX.shake(10, 0.3);
        FX.burst(r.left, y, '#ffcf3a', 24, 600, -1);
        FX.burst(r.right, y, '#ffcf3a', 24, 600, 1);
        hits.push({ lane: -1, res, at: lastT, key: true });
        AE.sfx('key');
      }
    }
    function comboFx() {
      const c = st.combo;
      if (c >= 50 && (c === 50 || c % 100 === 0)) {
        // コンボ50・100・200…：街全体が明るくなる
        City.bright = 1;
        comboEl.classList.remove('milestone');
        void comboEl.offsetWidth;
        comboEl.classList.add('milestone');
        const lr = laneWrap.getBoundingClientRect();
        FX.burst(lr.left, lr.top + lr.height * 0.6, '#ffe94a', 30, 420, -1);
        FX.burst(lr.right, lr.top + lr.height * 0.6, '#ffe94a', 30, 420, 1);
        AE.sfx('combo');
      }
    }
    function handleEvents(evs) {
      if (!evs.length) return;
      for (const e of evs) {
        if (e.type === 'judge') {
          if (e.result === 'miss' && B.activeEffects(me, lastT).length) me.stats.missUnder++; // 振り返り：妨害中のミス
          // 判定とコンボは叩いたレーンの上に出す（監督の決定）
          // 文字が重なって読めなくならないよう、出すのは最新の1つだけ
          pops.length = 0;
          pops.push({ lane: e.note.type === 'roll' ? -1 : e.lane, res: e.result, combo: st.combo, at: lastT, key: e.note.key });
          me.lastRes = e.result;
          if (e.note.type !== 'roll') {
            flashAt[e.lane] = lastT;
            flashRes[e.lane] = e.result;
          }
          hitFx(e);
          if (e.result !== 'miss') comboFx();
        } else if (e.type === 'holdBreak') {
          pops.length = 0;
          pops.push({ lane: e.lane, res: 'miss', combo: 0, at: lastT });
          flashAt[e.lane] = lastT;
          flashRes[e.lane] = 'miss';
          AE.sfx('miss');
          hpTrailAt = lastT + 0.35;
        }
      }
      battleEvents(relay(B.onLocal(me, evs, lastT)));
      hudDirty = true; // 画面の数字はまとめて次のフレームで書き換える（叩いた瞬間の処理を軽く）
    }
    let hudDirty = false;
    const canPlay = () => !auto && when !== null && !ended && me.alive;
    function press(lane, ts) {
      if (down[lane]) return;
      down[lane] = true;
      if (!canPlay()) return;
      AE.sfx('tap'); // 打鍵音
      const t = songTime(ts);
      lastT = Math.max(lastT, t);
      handleEvents(ses.press(lane, t));
    }
    function release(lane, ts) {
      if (!down[lane]) return;
      down[lane] = false;
      if (!canPlay()) return;
      handleEvents(ses.release(lane, songTime(ts)));
    }
    zones.forEach((z, i) => {
      z.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try {
          z.setPointerCapture(e.pointerId);
        } catch (_) {}
        press(i, e.timeStamp);
      });
      const up = (e) => release(i, e.timeStamp);
      z.addEventListener('pointerup', up);
      z.addEventListener('pointercancel', up);
      z.addEventListener('lostpointercapture', up);
    });

    let lowRes = false;
    function resize() {
      const r = laneWrap.getBoundingClientRect();
      lowRes = NLM.FX.budget < 1; // 重い時は少しだけ解像度を下げる（ノーツの形・位置は変わらない）
      const dpr = Math.min(2, window.devicePixelRatio || 1) * (lowRes ? 0.75 : 1);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    }
    function rr(x, y, w, h, r) {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    }

    /* ---------- 描画 ---------- */
    function draw(t) {
      const W = canvas.width;
      const H = canvas.height;
      const lw = W / 4;
      const jy = H * 0.86;
      const fx = B.activeEffects(me, t);
      const has = (ty) => fx.filter((e) => e.type === ty);
      const pxs = H * 0.12 * speed * (has('rush').length ? 1.5 : 1);
      const fog = has('fog').length > 0;
      const wob = has('wobble').length > 0;
      const nh = Math.max(10, H * 0.026); // ノーツの厚み（角ばった横長：監督の決定）
      const Y = (tt) => jy - (tt - t) * pxs;
      const X = (n) => (wob ? Math.sin(t * 7 + n.t * 5) * lw * 0.22 : 0);
      g.clearRect(0, 0, W, H);
      for (let i = 0; i < 4; i++) {
        g.fillStyle = hexA(LANE_COLORS[i], 0.05);
        g.fillRect(i * lw, 0, lw, H);
      }
      // HP（レーンの裏・5-3）：30%以下で赤く点滅（1秒に2回）
      const hp = B.shared ? B.shared.hp : st.hp;
      const low = hp <= 30;
      const blink = low && Math.floor(performance.now() / 250) % 2 === 0;
      g.globalAlpha = blink ? 0.32 : 0.22;
      g.fillStyle = low ? '#ff3b4f' : '#2de2e6';
      g.fillRect(0, H * (1 - hp / 100), W, (H * hp) / 100);
      // HPバーが削れる演出：減った分が白→赤で残り、少し遅れて消える
      if (t > hpTrailAt) hpTrail += (hp - hpTrail) * 0.12;
      if (hp > hpTrail) hpTrail = hp;
      if (hpTrail - hp > 0.3) {
        g.globalAlpha = 0.55;
        g.fillStyle = '#ffffff';
        g.fillRect(0, H * (1 - hpTrail / 100), W, (H * (hpTrail - hp)) / 100);
      }
      g.globalAlpha = 0.25;
      g.fillStyle = low ? '#ff8090' : '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `900 ${Math.round(W * 0.06)}px sans-serif`;
      g.fillText(B.shared ? 'みんなのHP' : 'HP', W / 2, H * 0.32);
      g.font = `900 ${Math.round(W * 0.17)}px sans-serif`;
      g.fillText(Math.ceil(hp) + '%', W / 2, H * 0.32 + W * 0.13);
      g.globalAlpha = 1;
      drawMeterField(t, W, H, lw, jy);
      // レーンの裏の光（ノーツより先に描く＝ノーツの上には重ねない）
      for (let i = 0; i < 4; i++) {
        const age = t - flashAt[i];
        if (age < 0 || age > 0.25) continue;
        const k = 1 - age / 0.25;
        const res = flashRes[i];
        const col = res === 'miss' ? '#ff2b45' : LANE_COLORS[i];
        const top = jy - H * (res === 'perfect' || res === 'auto' ? 0.75 : 0.45);
        const gr = g.createLinearGradient(0, jy, 0, top);
        gr.addColorStop(0, hexA(col, (res === 'miss' ? 0.45 : res === 'great' ? 0.22 : 0.35) * k));
        gr.addColorStop(1, hexA(col, 0));
        g.fillStyle = gr;
        g.fillRect(i * lw, top, lw, jy - top);
      }
      for (let i = 0; i < 4; i++) {
        const fl = t - flashAt[i] < 0.15 && flashRes[i] !== 'miss';
        g.fillStyle = hexA(LANE_COLORS[i], down[i] ? 0.5 : fl ? 0.4 : 0.12);
        g.fillRect(i * lw + 3, jy + 5, lw - 6, H - jy - 8);
        g.fillStyle = hexA(LANE_COLORS[i], 0.9);
        g.font = `900 ${Math.round(Math.min(lw * 0.3, (H - jy) * 0.45))}px sans-serif`;
        g.fillText(LANE_LABELS[i], i * lw + lw / 2, jy + (H - jy) / 2 + 2);
      }
      g.fillStyle = '#ffffff';
      g.fillRect(0, jy - 2, W, 4);
      drawMeterLine(W, jy);

      const horizon = t + (jy + nh * 3) / pxs;
      const notes = ses.notes;
      const alphaAt = (y) => (fog && y < jy - H * 0.15 ? 0.16 : 1);
      for (const n of notes) {
        if (n.t > horizon) break;
        if (n.type !== 'roll' || n.done) continue;
        const y1 = Math.min(Y(n.t), jy);
        const y2 = Math.max(Y(n.end), -10);
        if (y1 <= y2) continue;
        g.fillStyle = 'rgba(255,140,40,0.22)';
        g.fillRect(0, y2, W, y1 - y2);
        g.save();
        g.beginPath();
        g.rect(0, y2, W, y1 - y2);
        g.clip();
        g.strokeStyle = 'rgba(255,190,90,0.35)';
        g.lineWidth = nh * 0.6;
        const off = (t * pxs) % (nh * 4);
        for (let x = -H; x < W + H; x += nh * 4) {
          g.beginPath();
          g.moveTo(x + off, y1);
          g.lineTo(x + off + (y1 - y2), y2);
          g.stroke();
        }
        g.restore();
        g.fillStyle = '#ffa53a';
        g.fillRect(0, Y(n.t) - nh * 0.4, W, nh * 0.8);
        g.fillStyle = '#ffffff';
        g.font = `900 ${Math.round(nh * 1.7)}px sans-serif`;
        g.fillText(`連打！ ${n.hits} / ${n.target}`, W / 2, Math.max(y2 + nh * 2, Math.min(y1 - nh * 2, (y1 + y2) / 2)));
      }
      for (const n of notes) {
        if (n.t > horizon) break;
        if (n.type !== 'hold' || (n.done && !n.holding && n.result !== 'miss') || (n.tailNote && n.tailNote.done)) continue;
        const y1 = n.holding ? jy : Y(n.t);
        const y2 = Math.max(-10, Y(n.end));
        if (y1 <= y2) continue;
        const bw = lw * 0.44;
        const x = n.lane * lw + (lw - bw) / 2 + X(n);
        const col = n.result === 'miss' ? '#777777' : n.key ? '#ffcf3a' : LANE_COLORS[n.lane];
        g.globalAlpha = fog ? 0.3 : 1;
        g.fillStyle = hexA(col, n.holding ? 0.75 : 0.45);
        g.fillRect(x, y2, bw, y1 - y2);
        g.fillStyle = hexA(col, 0.95);
        g.fillRect(x - 3, y2 - 3, bw + 6, 6);
        g.globalAlpha = 1;
      }
      const groups = {};
      for (const n of notes) {
        if (n.t > horizon) break;
        if (n.chord === null || n.done || n.headDone) continue;
        const gx = groups[n.chord] || (groups[n.chord] = { a: 9, b: -1, y: Y(n.t), off: X(n) });
        gx.a = Math.min(gx.a, n.lane);
        gx.b = Math.max(gx.b, n.lane);
      }
      for (const k in groups) {
        const gx = groups[k];
        g.fillStyle = `rgba(255,255,255,${0.75 * alphaAt(gx.y)})`;
        if (gx.b > gx.a) g.fillRect(gx.a * lw + lw / 2 + gx.off, gx.y - 2, (gx.b - gx.a) * lw, 4);
      }
      for (const n of notes) {
        if (n.t > horizon) break;
        if (n.type === 'roll' || n.done || n.headDone) continue;
        const y = Y(n.t);
        if (y < -nh * 3) continue;
        g.globalAlpha = alphaAt(y);
        const pad = lw * 0.07;
        const x = n.lane * lw + pad + X(n);
        const w = lw - pad * 2;
        if (n.type === 'release') {
          // 長押しの終点（離すノーツ）：中が抜けた枠＋上向きの矢印。始点をミスした時は灰色
          const head = n.headNote;
          const dead = head && (head.result === 'miss' || head.broken);
          const col = dead ? '#777777' : head && head.key ? '#ffcf3a' : LANE_COLORS[n.lane];
          g.fillStyle = 'rgba(10,8,28,0.85)';
          rr(x, y - nh / 2, w, nh, 0);
          g.fill();
          g.strokeStyle = col;
          g.lineWidth = Math.max(3, nh * 0.22);
          g.stroke();
          g.strokeStyle = dead ? '#999999' : '#ffffff';
          g.lineWidth = Math.max(2, nh * 0.16);
          for (const cx of [x + w * 0.3, x + w * 0.7]) {
            g.beginPath();
            g.moveTo(cx - nh * 0.42, y + nh * 0.2);
            g.lineTo(cx, y - nh * 0.22);
            g.lineTo(cx + nh * 0.42, y + nh * 0.2);
            g.stroke();
          }
          g.globalAlpha = 1;
          continue;
        }
        if (n.key) {
          const h = nh * 1.6;
          if (n.t - t < 1.6) {
            g.fillStyle = `rgba(255,207,58,${0.18 + 0.14 * Math.sin(performance.now() / 90)})`;
            rr(x - 6, y - h / 2 - 6, w + 12, h + 12, 0);
            g.fill();
          }
          g.fillStyle = '#ffcf3a';
          rr(x - 2, y - h / 2, w + 4, h, 0);
          g.fill();
          g.strokeStyle = '#ffffff';
          g.lineWidth = 2;
          g.stroke();
          g.fillStyle = '#ffffff';
          for (const cx of [x + 2, x + w - 2]) {
            g.beginPath();
            g.moveTo(cx, y - h * 0.38);
            g.lineTo(cx + h * 0.3, y);
            g.lineTo(cx, y + h * 0.38);
            g.lineTo(cx - h * 0.3, y);
            g.closePath();
            g.fill();
          }
        } else {
          g.fillStyle = LANE_COLORS[n.lane];
          g.fillRect(x, y - nh / 2, w, nh);
          g.fillStyle = 'rgba(255,255,255,0.9)';
          g.fillRect(x, y - nh / 2, w, Math.max(2, nh * 0.22));
          g.strokeStyle = 'rgba(255,255,255,0.65)';
          g.lineWidth = Math.max(1.5, nh * 0.08);
          g.strokeRect(x, y - nh / 2, w, nh);
        }
        if (n.type === 'hold') {
          g.fillStyle = 'rgba(10,8,28,0.8)';
          g.beginPath();
          g.moveTo(x + w / 2 - nh * 0.5, y - nh * 0.2);
          g.lineTo(x + w / 2 + nh * 0.5, y - nh * 0.2);
          g.lineTo(x + w / 2, y + nh * 0.35);
          g.closePath();
          g.fill();
        }
        g.globalAlpha = 1;
      }

      /* 妨害の覆い（8-2：一度に隠せるのはレーンの50%まで） */
      const blindLanes = [];
      for (const e of has('blind')) for (const l of e.laneList) if (!blindLanes.includes(l) && blindLanes.length < 2) blindLanes.push(l);
      const coverH = jy - H * 0.18; // 判定ラインの手前は見える（遊べなくはしない）
      let used = (blindLanes.length / 4) * (coverH / jy);
      const cover = (x, y, w, h, from) => {
        g.fillStyle = 'rgba(12,8,30,0.97)';
        g.fillRect(x, y, w, h);
        g.strokeStyle = hexA(from.char.color, 0.55);
        g.lineWidth = 3;
        for (let k = -h; k < w; k += 22) {
          g.beginPath();
          g.moveTo(x + k, y + h);
          g.lineTo(x + k + h * 0.4, y);
          g.stroke();
        }
        const ic = Chars.icon(from.char, 40);
        const s = Math.min(w, h, lw) * 0.5;
        g.globalAlpha = 0.85;
        g.drawImage(ic, x + w / 2 - s / 2, y + h / 2 - s / 2, s, s);
        g.globalAlpha = 1;
      };
      // 脱落：レーンの割れ目
      if (cracks) {
        g.strokeStyle = 'rgba(220,225,255,0.55)';
        g.lineWidth = 2;
        for (const pts of cracks) {
          g.beginPath();
          pts.forEach(([px, py], i) => (i ? g.lineTo(px * W, py * H) : g.moveTo(px * W, py * H)));
          g.stroke();
        }
      }
      const firstBlind = has('blind')[0];
      for (const l of blindLanes) cover(l * lw, 0, lw, coverH, firstBlind.from);
      const cur = has('curtain')[0];
      if (cur) {
        const free = 4 - blindLanes.length;
        const maxRatio = free > 0 ? Math.max(0, ((0.5 - used) * 4) / free) : 0;
        const ratio = Math.min(cur.ratio, maxRatio);
        if (ratio > 0.02)
          for (let l = 0; l < 4; l++) {
            if (blindLanes.includes(l)) continue;
            cover(l * lw, 0, lw, jy * ratio, cur.from);
          }
      }
      drawHitFx(t, W, H, lw, jy);
    }

    /* =========================================================
     * スキルゲージ＝演奏画面そのもの（監督の決定）
     * 溜まった割合だけ、レーンの区切り線・判定ライン・背景が左から右へ光る。全部光るとスキル発動。
     * ========================================================= */
    let skillFlashAt = -9;
    function meterRatio() {
      if (me.noSkill || !st.meterMax) return 0;
      return Math.max(0, Math.min(1, st.meter / st.meterMax));
    }
    function drawMeterField(t, W, H, lw, jy) {
      const col = me.char.color;
      const r = meterRatio();
      const Lx = r * W;
      const near = r >= 0.85;
      const pulse = near ? 0.5 + 0.5 * Math.sin(performance.now() / 70) : 0;
      // 溜まった部分の背景
      if (Lx > 0) {
        g.fillStyle = hexA(col, 0.07 + pulse * 0.08);
        g.fillRect(0, 0, Lx, H);
      }
      // 区切り線（両端を含む5本）：溜まった所まで光る
      const dpr = W / Math.max(1, canvas.clientWidth || W);
      for (let i = 0; i <= 4; i++) {
        const x = Math.min(W - 1.5 * dpr, Math.max(1.5 * dpr, i * lw));
        const lit = i * lw <= Lx + 0.5;
        if (lit && r > 0) {
          g.fillStyle = hexA(col, 0.28 + pulse * 0.2);
          g.fillRect(x - 6 * dpr, 0, 12 * dpr, H);
          g.fillStyle = hexA(col, 0.95);
          g.fillRect(x - 1.5 * dpr, 0, 3 * dpr, H);
          g.fillStyle = 'rgba(255,255,255,0.7)';
          g.fillRect(x - 0.5 * dpr, 0, 1 * dpr, H);
        } else if (i > 0 && i < 4) {
          g.fillStyle = 'rgba(255,255,255,0.12)';
          g.fillRect(x - 1, 0, 2, H);
        }
      }
      // 光の先頭（左から右へ進んでいく）
      if (r > 0 && r < 1) {
        const gr = g.createLinearGradient(Lx - lw * 0.5, 0, Lx, 0);
        gr.addColorStop(0, hexA(col, 0));
        gr.addColorStop(1, hexA(col, 0.35 + pulse * 0.25));
        g.fillStyle = gr;
        g.fillRect(Lx - lw * 0.5, 0, lw * 0.5, H);
        g.fillStyle = 'rgba(255,255,255,0.85)';
        g.fillRect(Lx - 1 * dpr, 0, 2 * dpr, H);
      }
      // 発動の瞬間：画面全体が光って、左から右へ光が走る
      const age = t - skillFlashAt;
      if (age >= 0 && age < 0.7) {
        const k = 1 - age / 0.7;
        g.fillStyle = hexA(col, 0.45 * k);
        g.fillRect(0, 0, W, H);
        const sx = (age / 0.35) * W;
        g.fillStyle = `rgba(255,255,255,${0.7 * k})`;
        g.fillRect(sx - lw * 0.15, 0, lw * 0.3, H);
      }
    }
    function drawMeterLine(W, jy) {
      const r = meterRatio();
      if (r <= 0) return;
      const col = me.char.color;
      const dpr = W / Math.max(1, canvas.clientWidth || W);
      g.fillStyle = hexA(col, 0.5);
      g.fillRect(0, jy - 7 * dpr, r * W, 14 * dpr);
      g.fillStyle = hexA(col, 1);
      g.fillRect(0, jy - 3 * dpr, r * W, 6 * dpr);
      g.fillStyle = '#ffffff';
      g.fillRect(0, jy - 1 * dpr, r * W, 2 * dpr);
    }

    /* =========================================================
     * 叩いた時の表示（監督の決定：叩いた位置に、判定・コンボ・光をレーンの上に出す）
     * ========================================================= */
    const pops = []; // { lane, res, combo, at, key }
    const hits = []; // { lane, res, at, key }
    const POP_COL = { perfect: '#ffe94a', auto: '#5dff8f', great: '#2de2e6', miss: '#ff4b5c' };
    function drawHitFx(t, W, H, lw, jy) {
      const dpr = W / Math.max(1, canvas.clientWidth || W);
      // 光：判定ラインの上で輪が広がり、光の筋が上へ伸びる
      for (let i = hits.length - 1; i >= 0; i--) {
        const h = hits[i];
        const age = t - h.at;
        if (age > 0.4 || age < -0.1) {
          hits.splice(i, 1);
          continue;
        }
        const k = Math.max(0, age) / 0.4;
        const cx = h.lane < 0 ? W / 2 : h.lane * lw + lw / 2;
        const col = h.res === 'miss' ? '#ff2b45' : h.key ? '#ffcf3a' : LANE_COLORS[Math.max(0, h.lane)];
        const big = h.res === 'perfect' || h.res === 'auto' ? 1 : h.res === 'great' ? 0.75 : 0.5;
        g.globalAlpha = (1 - k) * 0.9;
        g.strokeStyle = col;
        g.lineWidth = (h.key ? 8 : 5) * dpr * (1 - k * 0.6);
        g.beginPath();
        g.arc(cx, jy, lw * (0.2 + k * (h.key ? 1.2 : 0.75) * big), 0, Math.PI * 2);
        g.stroke();
        if (h.res !== 'miss') {
          // 光の筋：色ごとに1回だけ描いた絵を使い回す（毎回グラデーションを作らない）
          const ww = (h.lane < 0 ? W : lw) * (0.9 - k * 0.4);
          g.globalAlpha = 0.55 * (1 - k);
          g.drawImage(columnGlow(col), cx - ww / 2, jy - H * 0.35 * big, ww, H * 0.35 * big);
          g.globalAlpha = (1 - k) * 0.9;
          // 火花
          g.fillStyle = '#ffffff';
          for (let s = 0; s < 8; s++) {
            const a = (s / 8) * Math.PI * 2 + h.at * 3;
            const d = lw * (0.25 + k * 0.7) * big;
            const sz = 4 * dpr * (1 - k);
            g.fillRect(cx + Math.cos(a) * d - sz / 2, jy + Math.sin(a) * d * 0.6 - sz / 2, sz, sz);
          }
        }
        g.globalAlpha = 1;
      }
      // 判定の文字とコンボ数：叩いたレーンの判定ラインのすぐ上に
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      for (let i = pops.length - 1; i >= 0; i--) {
        const p = pops[i];
        const age = t - p.at;
        if (age > 0.55 || age < -0.1) {
          pops.splice(i, 1);
          continue;
        }
        const k = Math.max(0, age);
        const sc = k < 0.08 ? 1.5 - (k / 0.08) * 0.5 : 1; // 出た瞬間に大きく
        const alpha = age < 0.4 ? 1 : 1 - (age - 0.4) / 0.15;
        const fs = Math.min(lw * 0.36, 34 * dpr) * sc * (p.key ? 1.25 : 1);
        let cx = p.lane < 0 ? W / 2 : p.lane * lw + lw / 2;
        const label = JUDGE_TEXT[p.res];
        g.font = `900 ${Math.round(fs)}px 'Russo One', 'Orbitron', sans-serif`;
        const tw = g.measureText(label).width;
        cx = Math.max(tw / 2 + 4, Math.min(W - tw / 2 - 4, cx)); // 画面の外にはみ出さない
        const y = jy - nhOf(H) * 2.2 - k * 30 * dpr;
        g.globalAlpha = alpha;
        g.lineWidth = Math.max(3, fs * 0.16);
        g.strokeStyle = 'rgba(0,0,0,0.85)';
        g.strokeText(label, cx, y);
        g.fillStyle = POP_COL[p.res] || '#ffffff';
        g.fillText(label, cx, y);
        if (p.combo >= 2 && p.res !== 'miss') {
          const cs = fs * 0.72;
          g.font = `900 ${Math.round(cs)}px 'Russo One', 'Orbitron', sans-serif`;
          const ct = `${p.combo} COMBO`;
          const cw = g.measureText(ct).width;
          const ccx = Math.max(cw / 2 + 4, Math.min(W - cw / 2 - 4, cx));
          g.strokeText(ct, ccx, y - fs * 0.95);
          g.fillStyle = '#ffffff';
          g.fillText(ct, ccx, y - fs * 0.95);
        }
        g.globalAlpha = 1;
      }
    }
    const nhOf = (H) => Math.max(10, H * 0.026);
    const colCache = {};
    function columnGlow(col) {
      if (colCache[col]) return colCache[col];
      const c = document.createElement('canvas');
      c.width = 8;
      c.height = 128;
      const cg = c.getContext('2d');
      const gr = cg.createLinearGradient(0, 128, 0, 0);
      gr.addColorStop(0, hexA(col, 1));
      gr.addColorStop(1, hexA(col, 0));
      cg.fillStyle = gr;
      cg.fillRect(0, 0, 8, 128);
      return (colCache[col] = c);
    }

    /* ---------- 0.5秒前の予告（誰から・何が来るか） ---------- */
    function updateWarn(t) {
      const w = B.warnings(me, t)[0];
      if (w) {
        if (warnEl._fx !== w) {
          warnEl._fx = w;
          warnEl.replaceChildren(el('img', { src: Chars.iconURL(w.from.char, 40), alt: '' }), el('span', { text: `${w.from.name}「${w.skill.name}」${EFFECT_JA[w.type]}` }));
        }
        warnEl.classList.add('show');
      } else warnEl.classList.remove('show');
    }

    /* ---------- 協奏：全員のパーフェクトが重なった瞬間（キーノーツ）に画面全体が光る ---------- */
    function coopCheck(t) {
      if (mode !== 'coop') return;
      while (keyPtr < keyIdx.length && chart.notes[keyIdx[keyPtr]].t + 0.15 < t) {
        const i = keyIdx[keyPtr++];
        const mine = ses.notes[i].result;
        const ok = (r) => r === 'perfect' || r === 'auto';
        if (ok(mine) && B.players.every((p) => p.local || p.gone || ok(p.results[i] || (net ? p.lastRes : undefined)))) {
          if (t - lastFlash > 0.4) {
            lastFlash = t;
            flashEl.classList.remove('go');
            void flashEl.offsetWidth;
            flashEl.classList.add('go');
          }
        }
      }
    }

    function finish() {
      if (ended) return;
      ended = true;
      GameLoop.stop();
      if (audio) audio.stop();
      match.played.push(song.id);
      if (net) {
        // フレンド対戦：全員の演奏が終わるのを待ち、次の曲・結果はホストが決める
        overlay.hidden = false;
        overlay.classList.remove('count');
        overlayText.textContent = 'ほかの人の演奏が終わるのを待っています…';
        sendState();
        Net.send({ t: 'done', i: match.index, m: match.netId });
        // ホスト：演奏が終わらない人がいても、20秒待ったら先へ進む
        if (Net.isHost) goTimer = setTimeout(() => hostMaybeNext(true), 20000);
        return;
      }
      // 演争：生存者が複数いて次の曲がある → 次の曲へ（HPは引き継ぐ）
      if (mode === 'battle' && !B.over && B.alive().length > 1 && match.index < match.songs.length - 1) {
        match.index++;
        Nav.replace('play', {});
        return;
      }
      recordMatch(match);
      Nav.go('result', {});
    }

    /* ---------- 演奏の開始（音を鳴らす時刻 w は音声の時計） ---------- */
    let rendered = null;
    function begin(w) {
      if (when !== null || !rendered || ended) return;
      when = w;
      const startAt = Math.max(w, AE.now() + 0.12);
      // 開始の合図が遅れて届いた時は、曲の途中から鳴らして全員と合わせる
      audio = AE.playRendered(rendered, startAt, startAt - w);
      overlay.classList.add('count');
      // 背景の看板が曲の拍に合わせて点滅（13-1）
      City.clock = () => (AE.now() - when) / chart.compiled.spb;
      City._bps = chart.compiled.bpm / 60;
    }

    /* =========================================================
     * フレンド対戦の通信（14章）
     * 状態：1秒に10回。出来事（スキル・脱落）：すぐ。ホストが中継し、CPUはホストが計算する。
     * ========================================================= */
    let offNet = null;
    let goTimer = null;
    let lastGo = null;
    const readySet = new Set();
    const doneSet = new Set();
    const byNet = new Map(B.players.filter((p) => p.netId).map((p) => [p.netId, p]));
    const humansLeft = () => B.players.filter((p) => p.netId && !p.gone).map((p) => p.netId);
    const sendOut = (msg) => (Net.isHost ? Net.broadcast(msg, { self: false }) : Net.send(msg));
    /** 自分（ホストならCPUも）のスキル・脱落を全員に送る */
    function relay(out) {
      if (!net) return out;
      for (const e of out) {
        if (!e.mine) continue;
        if (e.type === 'skill') sendOut({ t: 'sk', i: e.p.idx, tg: e.targets.map((q) => q.idx), at: e.t, ln: e.lanes });
        else if (e.type === 'elim') sendOut({ t: 'el', i: e.p.idx, seq: e.p.elim.seq, song: e.p.elim.song, at: e.p.elim.t });
      }
      return out;
    }
    const stateOf = (p) => [p.idx, Math.round(p.st.hp * 10) / 10, p.st.score, p.st.combo, Math.round(p.st.meter * 10) / 10, p.lastRes || '', p.st.maxCombo, Math.round(p.sharedDelta * 10) / 10];
    const fromState = (a) => ({ hp: a[1], score: a[2], combo: a[3], meter: a[4], res: a[5] || undefined, maxCombo: a[6], sd: a[7] });
    function sendState() {
      if (Net.isHost) {
        const shp = B.shared ? B.recomputeShared() : undefined;
        Net.broadcast({ t: 'sts', m: match.netId, a: B.players.filter((p) => !p.gone).map(stateOf), shp }, { self: false });
      } else Net.send({ t: 'st', m: match.netId, a: stateOf(me), c: me.st.counts });
    }
    function finalStates() {
      return B.players.map((p) => ({ i: p.idx, a: stateOf(p), c: p.st.counts }));
    }
    function hostGo() {
      if (lastGo) return;
      clearTimeout(goTimer);
      lastGo = { t: 'go', i: match.index, m: match.netId, at: Net.hostNow() + 3500 };
      Net.broadcast(lastGo);
    }
    function hostMaybeNext(force) {
      if (!force && !humansLeft().every((id) => doneSet.has(id))) return;
      if (doneSet.has('_sent')) return;
      doneSet.add('_sent');
      if (mode === 'battle' && !B.over && B.alive().length > 1 && match.index < match.songs.length - 1) Net.broadcast({ t: 'next', i: match.index + 1, m: match.netId });
      else Net.broadcast({ t: 'final', m: match.netId, order: B.standings().map((x) => x.p.idx), s: finalStates() });
    }
    function onNet(msg, from) {
      if (msg.m !== undefined && msg.m !== match.netId) return;
      const host = Net.isHost;
      const P = (i) => B.players[i];
      switch (msg.t) {
        /* ---- ホストが受け取る ---- */
        case 'ready':
          if (!host || msg.i !== match.index) return;
          readySet.add(from);
          if (lastGo) Net.sendTo(from, lastGo); // 遅れて準備ができた人にも開始時刻を送る
          else if (humansLeft().every((id) => readySet.has(id))) hostGo();
          else if (!goTimer) goTimer = setTimeout(hostGo, 40000); // 準備に時間がかかる人がいても40秒で始める
          return;
        case 'st': {
          if (!host) return;
          const p = byNet.get(from);
          if (!p) return;
          B.remoteState(p, Object.assign(fromState(msg.a), { counts: msg.c }));
          return;
        }
        case 'done':
          if (!host || msg.i !== match.index) return;
          doneSet.add(from);
          hostMaybeNext();
          return;
        case '_leave': {
          if (!host) return;
          const p = byNet.get(from);
          if (!p || p.gone) return;
          battleEvents(B.drop(p, lastT));
          log(`${p.name} の接続が切れました`);
          Net.broadcast({ t: 'gone', i: p.idx, at: lastT, m: match.netId }, { self: false });
          if (readySet.size && !lastGo && humansLeft().every((id) => readySet.has(id))) hostGo();
          if (ended) hostMaybeNext();
          return;
        }
        /* ---- 全員が受け取る（ホストは中継もする） ---- */
        case 'sk':
        case 'el': {
          const p = P(msg.i);
          if (!p || B.owns(p)) return;
          if (host) Net.broadcast(msg, { except: from, self: false });
          if (msg.t === 'sk') battleEvents(B.remoteSkill(p, msg.tg, msg.at, msg.ln));
          else battleEvents(B.remoteElim(p, { seq: msg.seq, song: msg.song, t: msg.at }));
          updatePlist();
          return;
        }
        case 'sts':
          if (host) return;
          for (const a of msg.a) {
            const p = P(a[0]);
            if (p && !B.owns(p)) B.remoteState(p, fromState(a));
          }
          if (msg.shp !== undefined) B.setShared(msg.shp);
          return;
        case 'gone': {
          const p = P(msg.i);
          if (p && !p.gone) {
            battleEvents(B.drop(p, msg.at));
            log(`${p.name} の接続が切れました`);
          }
          return;
        }
        case 'go':
          if (msg.i !== match.index) return;
          begin(AE.now() + (Net.toLocal(msg.at) - performance.now()) / 1000);
          return;
        case 'next':
          match.index = msg.i;
          ended = true;
          Nav.replace('play', {});
          return;
        case 'final':
          for (const x of msg.s) {
            const p = P(x.i);
            if (!p || p.local) continue;
            p.st.hp = x.a[1];
            p.st.score = x.a[2];
            p.st.maxCombo = x.a[6];
            if (x.c) Object.assign(p.st.counts, x.c);
          }
          match.finalOrder = msg.order;
          ended = true;
          recordMatch(match);
          Nav.go('result', {});
          return;
      }
    }

    const def = {
      head: false,
      body: el('div', { class: 'play2' + (auto ? ' is-auto' : '') + (multi ? ' is-multi' : '') }, [
        el('div', { class: 'hud-left' }, multi ? [plist] : [judgeEl, comboEl]),
        laneWrap,
        el('div', { class: 'hud-right' }, [
          el('div', { class: 'hud-info' }, [
            el('div', { class: 'hud-title', text: song.title }),
            el('div', { class: 'hud-diff', text: `${diffName}　Lv ${chart.level}${match.songs.length > 1 ? `　${match.index + 1}/${match.songs.length}曲` : ''}${auto ? '　自動演奏' : ''}${practice ? `　練習：${practice.label} ${practice.rate}倍` : ''}` }),
          ]),
          multi ? el('div', { class: 'hud-jc' }, [judgeEl, comboEl]) : null,
          el('div', { class: 'hud-score-wrap' }, [el('div', { class: 'hud-label', text: 'SCORE' }), scoreEl]),
          meterEl,
          skillEl,
          multi ? logEl : null,
          quitBtn,
        ]),
        el('div', { class: 'touch-zones' }, zones),
        flashEl,
        poseEl,
      ]),
      onEnter() {
        AE.init();
        if (net) offNet = Net.on(onNet);
        NLM._play = { ses, st, chart, match, when: () => when };
        ro = new ResizeObserver(() => {
          resize();
          draw(lastT);
        });
        ro.observe(laneWrap);
        resize();
        updateHud();
        updatePlist();
        B.startSong(chart, match.index);
        AE.renderSong(song, (p) => {
          overlayText.textContent = `読み込み中… ${Math.round(p * 100)}%`;
          overlayBar.style.width = p * 100 + '%';
        })
          .then((r) => {
            if (ended || Nav.cur.def !== def) return;
            rendered = r;
            if (net) {
              // 全員の準備ができたら、ホストが「この時刻に開始」と送ってくる（14章）
              overlayText.textContent = 'ほかの人の準備を待っています…';
              Net.send({ t: 'ready', i: match.index, m: match.netId });
              return;
            }
            begin(AE.now() + 3.2 - t0); // 3秒のカウントダウン（練習は区間の手前から）
          })
          .catch((e) => {
            overlayText.textContent = '読み込みに失敗しました：' + e.message;
          });
        GameLoop.start((now) => {
          if (when === null) {
            draw(-3);
            return;
          }
          const t = now - when;
          lastT = t;
          if (t < t0) {
            const c = Math.ceil(t0 - t);
            overlayText.textContent = String(c);
            if (c !== lastCount && c <= 3) {
              lastCount = c;
              AE.sfx('count');
            }
          } else if (!overlay.hidden) {
            overlay.hidden = true;
            AE.sfx('go');
          }
          if (me.alive) handleEvents(ses.update(t - jo));
          if (match.tutorial) {
            // 説明文：その場面になったら出し、次の説明まで出し続ける
            const caps = NLM.Tutorial.captions;
            let k = -1;
            for (let i = 0; i < caps.length; i++) if (t >= caps[i].t) k = i;
            if (k !== capIdx) {
              capIdx = k;
              capEl.hidden = k < 0;
              if (k >= 0) {
                capEl.replaceChildren(el('div', { class: 'tut-step', text: `${k + 1} / ${caps.length}` }), el('div', { class: 'tut-title', text: caps[k].title }), el('div', { class: 'tut-text', text: caps[k].text }));
                capEl.classList.remove('show');
                void capEl.offsetWidth;
                capEl.classList.add('show');
              }
            }
          }
          if (hudDirty) {
            hudDirty = false;
            updateHud();
          }
          battleEvents(relay(B.tick(t)));
          coopCheck(t);
          updateWarn(t);
          if ((NLM.FX.budget < 1) !== lowRes) resize();
          draw(t - vo);
          if (performance.now() - plistAt > 100) {
            plistAt = performance.now();
            if (net) sendState();
            updatePlist();
            if (B.shared) updateHud();
          }
          // 最後の一人になったら曲の途中でも止める（7-1）
          if (overAt !== null && t - overAt > 1.2) finish();
          if (t > Math.min(chart.duration + 1, ses.lastTime() + 2.5)) finish();
        });
      },
      onLeave() {
        ended = true;
        GameLoop.stop();
        if (audio) audio.stop();
        if (ro) ro.disconnect();
        if (offNet) offNet();
        clearTimeout(goTimer);
      },
      onBack: net ? confirmLeave : undefined,
      onKey(e) {
        if (e.key === 'Escape') {
          Nav.back();
          return true;
        }
        const lane = LANE_KEYS.indexOf(e.code);
        if (lane < 0) return false;
        if (!e.repeat) press(lane, e.timeStamp); // キーリピートは無視（4章）
        return true;
      },
      onKeyUp(e) {
        const lane = LANE_KEYS.indexOf(e.code);
        if (lane >= 0) release(lane, e.timeStamp);
      },
    };
    return def;
  }

  function startMatchSilently(songIds, difficulty, opts) {
    const keep = Nav.goWithStack;
    Nav.goWithStack = () => {};
    const keepGo = Nav.go;
    Nav.go = () => {};
    try {
      startMatch(songIds, difficulty, opts);
    } finally {
      Nav.goWithStack = keep;
      Nav.go = keepGo;
    }
  }
  function startMatchPreview(params) {
    const keepChar = Session.charId;
    Session.charId = 'neonyan';
    startMatchSilently([params.songId], params.difficulty, { auto: true, preview: true });
    Session.charId = keepChar;
  }

  /**
   * 対戦後の振り返り（演争）：攻撃した・された回数などの注目の項目
   */
  function reviewBlock(B, me) {
    const ps = B.players;
    if (ps.length < 2) return null;
    const top = (f) => {
      let best = null;
      for (const p of ps) if (f(p) > 0 && (!best || f(p) > f(best))) best = p;
      return best;
    };
    const items = [];
    const add = (label, p, val) => p && items.push(el('div', { class: 'rv-item', style: { '--c': p.char.color } }, [el('span', { class: 'rv-k', text: label }), el('img', { src: NLM.Characters.iconURL(p.char, 32), alt: '' }), el('span', { class: 'rv-name', text: p.name }), el('span', { class: 'rv-v', text: val })]));
    const atk = top((p) => p.stats.attacksOut);
    add('一番攻撃した', atk, atk && `のべ${atk.stats.attacksOut}人`);
    const tgt = top((p) => p.stats.attacksIn);
    add('一番狙われた', tgt, tgt && `${tgt.stats.attacksIn}回`);
    const sk = top((p) => p.stats.skills);
    add('スキルを一番使った', sk, sk && `${sk.stats.skills}回`);
    if (me) {
      const byIdx = Object.entries(me.stats.hitBy).sort((a, b) => b[1] - a[1])[0];
      if (byIdx) add('あなたを一番攻撃した', ps[byIdx[0]], `${byIdx[1]}回`);
      const toIdx = Object.entries(me.stats.hitTo).sort((a, b) => b[1] - a[1])[0];
      if (toIdx) add('あなたが一番攻撃した', ps[toIdx[0]], `${toIdx[1]}回`);
      if (me.stats.attacksIn) items.push(el('div', { class: 'rv-item rv-me' }, [el('span', { class: 'rv-k', text: 'あなたが受けた攻撃' }), el('span', { class: 'rv-v', text: `${me.stats.attacksIn}回（妨害中のミス ${me.stats.missUnder}回）` })]));
    }
    if (!items.length) items.push(el('div', { class: 'rv-item' }, [el('span', { class: 'rv-k', text: '今回は攻撃がありませんでした' })]));
    return el('div', { class: 'review' }, [el('div', { class: 'rv-title', text: '振り返り' }), el('div', { class: 'rv-grid' }, items)]);
  }

  /** 順位：フレンド対戦はホストが決めた順（全員の画面で同じ順位にする） */
  function rankingOf(match) {
    const B = match.battle;
    if (match.finalOrder) return match.finalOrder.map((i, k) => ({ rank: k + 1, p: B.players[i] }));
    return B.standings();
  }

  /** 記録：自己ベスト（独奏）と、解禁条件用の累計（試作曲・自動演奏は数えない） */
  function recordMatch(match) {
    if (match.recorded || match.auto || match.practice || match.tutorial) return; // 練習・チュートリアルは記録しない
    match.recorded = true;
    const B = match.battle;
    const me = B.players.find((p) => p.local);
    const st = me.st;
    const T = Save.data.totals;
    if (match.mode === 'solo') {
      const sid = match.songs[0];
      const diff = match.difficulty;
      const b = (Save.data.bests[sid] = Save.data.bests[sid] || {});
      const cur = b[diff] || { score: 0, maxCombo: 0, perfect: 0 };
      const rk = NLM.Judge.rankOf(st);
      const bestRank = NLM.Judge.betterRank(cur.rank, rk.rank);
      match.newBest = { score: st.score > cur.score, maxCombo: st.maxCombo > cur.maxCombo, perfect: st.counts.perfect > cur.perfect, rank: bestRank !== cur.rank };
      b[diff] = {
        score: Math.max(cur.score, st.score),
        maxCombo: Math.max(cur.maxCombo, st.maxCombo),
        perfect: Math.max(cur.perfect, st.counts.perfect),
        rank: bestRank,
        fc: !!(cur.fc || rk.fc),
        ap: !!(cur.ap || rk.ap),
      };
    }
    const real = match.played.filter((id) => !NLM.Songs.get(id).proto).length;
    if (real) {
      T.plays += real;
      T.perfect += st.counts.perfect;
      T.great += st.counts.great;
      T.miss += st.counts.miss;
      T.maxCombo = Math.max(T.maxCombo, st.maxCombo);
      T.charPlays[me.char.id] = (T.charPlays[me.char.id] || 0) + real;
      if (match.mode === 'coop') T.coopPlays += real;
      if (match.mode === 'battle' && B.players.length > 1 && rankingOf(match)[0].p === me) T.battleWins++;
      if (match.mode === 'solo' && !st.gameOver) {
        T.clears++;
        if (match.difficulty === 'hard' || match.difficulty === 'extra') T.hardClears++;
        if (match.difficulty === 'extra') T.extraClears++;
        // 「独奏で特定の曲をクリア」の解禁条件用
        const P = Save.data.progress;
        P.songClears = P.songClears || {};
        P.songClears[match.songs[0]] = (P.songClears[match.songs[0]] || 0) + 1;
      }
    }
    Save.save();
    // 解禁の判定（9章）：新しく解禁したものは結果画面で演出する
    const fresh = NLM.Unlock.check();
    if (fresh.length) Session.unlockQueue = (Session.unlockQueue || []).concat(fresh);
  }

  /* =========================================================
   * 曲一覧（9章）：解禁状況・難易度ごとの数字・自己ベスト・解禁条件と進み具合
   * ========================================================= */
  function SongListScreen() {
    const songs = NLM.Songs.all()
      .filter((s) => !s.proto)
      .sort((a, b) => a.no - b.no);
    const unlocked = new Set(Save.data.unlocked.songs);
    const PER = 10;
    let page = 0;
    const list = el('div', { class: 'slist' });
    const detail = el('div', { class: 'char-detail song-detail' });
    const pageEl = el('div', { class: 'page-info' });
    const prevB = button('◀', () => {
      page--;
      drawList(true);
    }, { className: 'btn-arrow' });
    const nextB = button('▶', () => {
      page++;
      drawList(true);
    }, { className: 'btn-arrow' });
    const pages = Math.max(1, Math.ceil(songs.length / PER));
    function drawList(focus) {
      page = (page + pages) % pages;
      const rows = songs.slice(page * PER, page * PER + PER).map((s, i) => {
        const locked = !unlocked.has(s.id);
        const b = button(`${s.no}. ${s.title}`, () => pick(s), {
          className: 'btn-srow' + (locked ? ' is-locked' : ''),
          sub: locked ? '未解禁　' + s.genre : s.genre,
          color: LANE_COLORS[(page * PER + i) % 4],
          id: 'song-' + s.id,
        });
        if (locked) b.append(el('span', { class: 'song-lock', text: '🔒' }));
        b.addEventListener('focus', () => pick(s));
        return b;
      });
      list.replaceChildren(...rows);
      pageEl.textContent = `${page + 1} / ${pages}`;
      if (focus && rows[0]) rows[0].focus();
      pick(songs[page * PER]);
    }
    function pick(s) {
      const locked = !unlocked.has(s.id);
      list.querySelectorAll('.btn-srow').forEach((b) => b.classList.toggle('is-sel', b.dataset.id === 'song-' + s.id));
      const lv = NLM.Songs.DIFFICULTIES.map((d, i) => {
        const ch = NLM.Chart.generate(s, d.id);
        const b = bestOf(s.id, d.id);
        return el('div', { class: 'lv-box', style: { '--c': DIFF_COLORS[i] } }, [
          el('div', { class: 'lv-name', text: d.name }),
          el('div', { class: 'lv-num', text: ch.level }),
          el('div', { class: 'lv-best' }, [b ? `ベスト ${b.score.toLocaleString()}` : 'ベスト －', rankChip(b)]),
          el('div', { class: 'lv-sub', text: b ? `最大コンボ ${b.maxCombo}　P ${b.perfect}` : `ノーツ ${ch.stats.count}` }),
        ]);
      });
      const key = `${s.key.replace('b', '♭')} ${s.mode === 'minor' ? 'マイナー' : 'メジャー'}`;
      detail.replaceChildren(
        el('div', { class: 'char-title' }, [el('span', { class: 'char-no', text: 'No.' + s.no }), el('span', { text: s.title }), locked ? el('span', { class: 'char-lock', text: '未解禁' }) : null]),
        el('div', { class: 'char-motif', text: `${s.genre}　BPM ${s.bpm}　${key}` }),
        el('div', { class: 'lv-grid' }, lv),
        progressLine(s.unlock, locked)
      );
    }
    drawList(false);
    return {
      title: '曲一覧',
      body: el('div', { class: 'char-layout song-layout' }, [
        el('div', { class: 'slist-wrap' }, [el('div', { class: 'song-page' }, [prevB, list, nextB]), pageEl]),
        detail,
      ]),
    };
  }

  /* =========================================================
   * 解禁の演出（9-2）：画面中央に大きく。キャラは発動ポーズ、曲はサビ（ドロップ）の一部を流す
   * ========================================================= */
  function showUnlocks(queue, done) {
    if (!queue || !queue.length) {
      done && done();
      return;
    }
    const item = queue.shift();
    const isChar = item.kind === 'char';
    const it = item.item;
    let raf = 0;
    let live = null;
    let liveTimer = null;
    let closed = false;
    const cv = el('canvas', { class: 'unlock-cv' });
    const okBtn = button('OK', () => close(), { variant: 'primary', className: 'btn-next', id: 'unlock-ok' });
    const card = el('div', { class: 'unlock-card', style: { '--c': isChar ? it.color : LANE_COLORS[it.no % 4] } }, [
      el('div', { class: 'unlock-kind', text: isChar ? 'NEW CHARACTER' : 'NEW SONG' }),
      el('div', { class: 'unlock-title neon-title', text: '解禁！' }),
      isChar ? cv : el('div', { class: 'unlock-eq' }, [0, 1, 2, 3, 4, 5, 6].map((i) => el('span', { style: { '--i': i } }))),
      el('div', { class: 'unlock-name', text: it.title || it.name }),
      el('div', {
        class: 'unlock-desc',
        text: isChar ? `スキル「${it.skill.name}」：${it.skill.text}` : `${it.genre}　BPM ${it.bpm}　独奏・演争・協奏で遊べます`,
      }),
      okBtn,
    ]);
    const ov = el('div', { class: 'unlock-ov' }, [card]);
    document.body.append(ov);
    okBtn.focus();
    UI.modalClose = close;
    // 演出：花火・街の一斉点灯・効果音
    const FX = NLM.FX;
    FX.City.litUntil = performance.now() + 1200;
    AE.sfx('win');
    const col = isChar ? it.color : '#ffe94a';
    for (let k = 0; k < 5; k++) setTimeout(() => !closed && FX.firework(innerWidth * (0.15 + Math.random() * 0.7), innerHeight * (0.15 + Math.random() * 0.3), k % 2 ? col : '#ffffff'), k * 260);
    if (isChar) {
      const loop = () => {
        const r = cv.getBoundingClientRect();
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        if (cv.width !== Math.round(r.width * dpr)) {
          cv.width = Math.round(r.width * dpr);
          cv.height = Math.round(r.height * dpr);
        }
        const g = cv.getContext('2d');
        g.clearRect(0, 0, cv.width, cv.height);
        const sz = Math.min(cv.width, cv.height);
        NLM.Characters.draw(g, it, cv.width / 2, cv.height / 2 + Math.sin(performance.now() / 220) * sz * 0.03, sz * 0.86, 'skill', { boil: true });
        raf = requestAnimationFrame(loop);
      };
      raf = requestAnimationFrame(loop);
    } else {
      // 曲：ドロップの頭から約10秒
      const c = NLM.Music.compile(it);
      const drop = c.sections.find((x) => x.type === 'drop');
      AE.init();
      AE.startLive(it, { startBeat: drop ? drop.startBeat : 0 }).then((h) => {
        if (closed) h.stop();
        else {
          live = h;
          liveTimer = setTimeout(() => live && live.stop(), 10000);
        }
      });
    }
    function close() {
      if (closed) return;
      closed = true;
      cancelAnimationFrame(raf);
      clearTimeout(liveTimer);
      if (live) live.stop();
      ov.remove();
      UI.modalClose = null;
      showUnlocks(queue, done);
    }
  }

  /* =========================================================
   * リザルト（独奏・演争・協奏）
   * ========================================================= */
  function ResultScreen() {
    const match = Session.match;
    if (!match) return { title: 'リザルト', body: placeholder('結果がありません'), onBack: () => Nav.reset('menu') };
    const B = match.battle;
    const me = B.players.find((p) => p.local);
    const st = me.st;
    const mode = match.mode;
    const song = NLM.Songs.get(match.songs[0]);
    const d = NLM.Songs.DIFFICULTIES.find((x) => x.id === match.difficulty) || { name: '' };
    const Chars = NLM.Characters;
    const c = st.counts;
    const again = () => {
      Session.mode = mode;
      startMatch(match.songs.slice(), match.difficulty);
    };
    let foot;
    if (match.tutorial) {
      foot = [button('もう一度', () => startTutorial(), { variant: 'primary', className: 'btn-next' }), button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' })];
    } else if (match.practice) {
      const pr = match.practice;
      foot = [
        button('もう一度', () => startPractice({ songId: pr.songId, difficulty: match.difficulty, from: pr.from, to: pr.to, rate: pr.rate, label: pr.label }), { variant: 'primary', className: 'btn-next' }),
        button('練習の設定へ', () => Nav.goWithStack([{ id: 'menu' }, { id: 'charSelect' }, { id: 'songSelect' }, { id: 'diffSelect' }], 'practice'), { variant: 'sub' }),
        button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' }),
      ];
    } else if (match.net) {
      // フレンド対戦：次へ進めるのはホスト。ゲストはホストの操作を待つ
      const R = NLM.Room;
      const leave = button('部屋を抜ける', confirmLeave, { variant: 'sub' });
      if (!R.active) foot = [button('メニューへ', () => Nav.reset('menu'), { variant: 'primary', className: 'btn-next' })];
      else if (R.isHost)
        foot = [
          mode === 'coop'
            ? button('次の曲を選ぶ', () => R.startVote(), { variant: 'primary', className: 'btn-next' })
            : button('ロビーへ戻る', () => R.backToLobby(), { variant: 'primary', className: 'btn-next' }),
          leave,
        ];
      else foot = [el('div', { class: 'lobby-wait', text: mode === 'coop' ? 'ホストが次の曲を選ぶのを待っています…' : 'ホストがロビーに戻るのを待っています…' }), leave];
    } else if (match.preview) foot = [button('サウンドテストへ', () => Nav.goWithStack([{ id: 'menu' }, { id: 'settings' }], 'soundTest'), { variant: 'primary', className: 'btn-next' })];
    else if (mode === 'coop')
      foot = [
        button('次の曲を選ぶ', () => Nav.goWithStack([{ id: 'menu' }, { id: 'opponent' }, { id: 'cpuRules' }, { id: 'charSelect' }], 'songDiffSelect'), { variant: 'primary', className: 'btn-next' }),
        button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' }),
      ];
    else if (mode === 'battle')
      foot = [button('もう一度', again, { variant: 'primary', className: 'btn-next' }), button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' })];
    else
      foot = [
        button('もう一度', again, { variant: 'primary', className: 'btn-next' }),
        button('曲選択へ', () => Nav.goWithStack([{ id: 'menu' }, { id: 'charSelect' }], 'songSelect'), { variant: 'sub' }),
        button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' }),
      ];
    const stat = (label, val, cls, isNew) => el('div', { class: 'res-stat ' + (cls || '') }, [el('span', { class: 'res-k', text: label }), el('span', { class: 'res-v', text: val }), isNew ? el('span', { class: 'res-new', text: 'NEW' }) : null]);
    const nb = match.newBest || {};
    let body;
    let winner = null;
    const winCv = el('canvas', { class: 'win-cv' });
    if (mode === 'battle') {
      const ranks = rankingOf(match);
      const win = ranks[0].p;
      winner = win;
      body = el('div', { class: 'result result-battle' }, [
        reviewBlock(B, me),
        el('div', { class: 'res-song', text: `${match.songs.map((id) => NLM.Songs.get(id).title).join(' → ')}　${d.name}` }),
        el('div', { class: 'res-winner' }, [
          winCv,
          el('div', {}, [el('div', { class: 'res-k', text: 'WINNER' }), el('div', { class: 'res-status is-clear', text: win.name, style: { '--c': win.char.color } })]),
        ]),
        el(
          'div',
          { class: 'rank-list', style: { '--n': ranks.length, '--cols': ranks.length > 12 ? 2 : 1, '--rows': Math.max(4, Math.ceil(ranks.length / (ranks.length > 12 ? 2 : 1))) } },
          ranks.map(({ rank, p }) =>
            el('div', { class: 'rank-row' + (p.local ? ' is-me' : '') + (p.alive ? '' : ' is-out') }, [
              el('span', { class: 'rank-no', text: rank }),
              el('img', { src: Chars.iconURL(p.char, 40, p.alive ? (rank === 1 ? 'win' : 'idle') : 'lose'), alt: '' }),
              el('span', { class: 'rank-name', text: p.name }),
              el('span', { class: 'rank-st', text: p.alive ? `生存 HP ${Math.ceil(p.st.hp)}%` : `脱落（${p.elim.song + 1}曲目）` }),
              el('span', { class: 'rank-score', text: p.st.score.toLocaleString() }),
            ])
          )
        ),
      ]);
    } else if (mode === 'coop') {
      let good = 0;
      let all = 0;
      for (const p of B.players) {
        const k = p.st.counts;
        good += k.perfect + k.auto;
        all += k.perfect + k.auto + k.great + k.miss;
      }
      const harmony = all ? (good / all) * 100 : 0;
      body = el('div', { class: 'result result-battle' }, [
        el('div', { class: 'res-song', text: `${song.title}　${d.name}` }),
        el('div', { class: 'res-status ' + (st.gameOver ? 'is-over' : 'is-clear'), text: st.gameOver ? 'GAME OVER' : 'CLEAR' }),
        el('div', { class: 'res-score' }, [el('span', { class: 'res-k', text: '合奏度' }), el('span', { class: 'res-big', text: harmony.toFixed(1) + '%' })]),
        el(
          'div',
          { class: 'rank-list', style: { '--n': B.players.length, '--cols': B.players.length > 12 ? 2 : 1, '--rows': Math.max(4, Math.ceil(B.players.length / (B.players.length > 12 ? 2 : 1))) } },
          B.players.map((p) =>
            el('div', { class: 'rank-row' + (p.local ? ' is-me' : '') }, [
              el('img', { src: Chars.iconURL(p.char, 40, st.gameOver ? 'lose' : 'win'), alt: '' }),
              el('span', { class: 'rank-name', text: p.name }),
              el('span', { class: 'rank-st', text: `P ${p.st.counts.perfect + p.st.counts.auto}　G ${p.st.counts.great}　M ${p.st.counts.miss}` }),
              el('span', { class: 'rank-score', text: p.st.score.toLocaleString() }),
            ])
          )
        ),
      ]);
    } else {
      const status = match.tutorial ? 'チュートリアル完了！' : match.auto ? '自動演奏（記録なし）' : match.practice ? `練習：${match.practice.label} ${match.practice.rate}倍（記録なし）` : st.gameOver ? 'GAME OVER' : 'CLEAR';
      body = el('div', { class: 'result' }, [
        el('div', { class: 'res-song', text: `${song.title}　${d.name} Lv ${NLM.Chart.generate(song, match.difficulty).level}` }),
        el('div', { class: 'res-head' }, [
          el('img', { class: 'res-char', src: Chars.iconURL(me.char, 96, st.gameOver ? 'lose' : 'win'), alt: '' }),
          el('div', { class: 'res-status ' + (st.gameOver ? 'is-over' : 'is-clear'), text: status }),
          match.auto ? null : rankBadge(NLM.Judge.rankOf(st), nb.rank),
        ]),
        el('div', { class: 'res-score' }, [el('span', { class: 'res-k', text: 'SCORE' }), el('span', { class: 'res-big', text: st.score.toLocaleString() }), nb.score ? el('span', { class: 'res-new', text: '自己ベスト更新！' }) : null]),
        el('div', { class: 'res-grid' }, [
          stat('PERFECT', c.perfect, 'c-perfect', nb.perfect),
          stat('GREAT', c.great, 'c-great'),
          stat('MISS', c.miss, 'c-miss'),
          stat('AUTO', c.auto, 'c-auto'),
          stat('最大コンボ', st.maxCombo, '', nb.maxCombo),
          stat('達成率', (NLM.Judge.accuracy(st) * 100).toFixed(1) + '%'),
        ]),
      ]);
    }
    let fwTimer = null;
    return {
      title: mode === 'battle' ? '演争の結果' : mode === 'coop' ? '協奏の結果' : 'リザルト',
      crumb: modeCrumb(),
      back: false,
      body,
      foot: el('div', { class: 'foot-row' }, foot),
      onBack: match.net && NLM.Room.active ? confirmLeave : () => Nav.reset('menu'),
      onEnter() {
        const FX = NLM.FX;
        // 新しく解禁したものがあれば、勝利の演出のあとに順番に見せる
        setTimeout(() => {
          if (Nav.cur && Nav.cur.id === 'result' && Session.unlockQueue && Session.unlockQueue.length) {
            const q = Session.unlockQueue;
            Session.unlockQueue = [];
            showUnlocks(q, () => UI.focusFirst(app));
          }
        }, 1600);
        const celebrate = mode === 'battle' || (!st.gameOver && !match.auto);
        if (celebrate) {
          // 勝利：街中のネオンが点灯＋花火
          FX.City.allLit = true;
          AE.sfx('win');
          const cols = ['#ff3ea5', '#2de2e6', '#ffe94a', '#b26bff', '#5dff8f'];
          let k = 0;
          fwTimer = setInterval(() => {
            FX.firework(innerWidth * (0.12 + Math.random() * 0.76), innerHeight * (0.12 + Math.random() * 0.35), cols[k % cols.length]);
            if (++k > 16) clearInterval(fwTimer);
          }, 280);
        } else FX.City.dimTarget = 0.6;
        if (winner) {
          // 勝者のキャラを大きく（勝利の表情・手書きの揺れ）
          GameLoop.start(() => {
            const r = winCv.getBoundingClientRect();
            const dpr = Math.min(2, window.devicePixelRatio || 1);
            if (winCv.width !== Math.round(r.width * dpr)) {
              winCv.width = Math.round(r.width * dpr);
              winCv.height = Math.round(r.height * dpr);
            }
            const g = winCv.getContext('2d');
            g.clearRect(0, 0, winCv.width, winCv.height);
            const sz = Math.min(winCv.width, winCv.height);
            const bounce = Math.abs(Math.sin(performance.now() / 260)) * sz * 0.06;
            Chars.draw(g, winner.char, winCv.width / 2, winCv.height / 2 + sz * 0.04 - bounce, sz * 0.86, 'win', { boil: true });
          });
        }
      },
      onLeave() {
        clearInterval(fwTimer);
        GameLoop.stop();
      },
    };
  }

  /* =========================================================
   * 起動
   * ========================================================= */
  Save.load();
  NLM.FX.start();
  NLM.FX.Perf.show(Save.data.settings.showFps);
  // 長押しメニュー・ダブルタップ拡大を抑える
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.touch-zone, .lane')) e.preventDefault();
  });
  // スマホ：ダブルタップ・2本指でつまんで拡大しないようにする（iOSは user-scalable=no が効かないため）
  // 【軽量化】画面全体のタッチを毎回止めて確認する処理は、スマホではタッチのたびに描画の手が空くのを待つため
  // 「叩いた瞬間に固まる」原因になる。演奏画面では使わず、CSS（touch-action）で拡大を止める。
  // メニューなどの画面だけ、2回目の素早いタップで拡大しないよう、タップを打ち消してボタンを押し直す。
  let lastTouchEnd = 0;
  const onTouchEnd = (e) => {
    const now = performance.now();
    const quick = now - lastTouchEnd < 350;
    lastTouchEnd = now;
    if (!quick || e.target.closest('input, textarea')) return;
    e.preventDefault(); // 2回目のタップで拡大させない
    const btn = e.target.closest('button');
    if (btn && !btn.disabled) btn.click(); // 打ち消したクリックの代わり（ボタンの連打は効くように）
  };
  let touchGuard = false;
  NLM._setTouchGuard = (on) => {
    if (on === touchGuard) return;
    touchGuard = on;
    if (on) document.addEventListener('touchend', onTouchEnd, { passive: false });
    else document.removeEventListener('touchend', onTouchEnd, { passive: false });
  };
  NLM._setTouchGuard(true);
  document.addEventListener('dblclick', (e) => e.preventDefault());
  // iOSの2本指でつまむ拡大（タッチの流れとは別の出来事なので、演奏の邪魔をしない）
  for (const ev of ['gesturestart', 'gesturechange']) document.addEventListener(ev, (e) => e.preventDefault(), { passive: false });
  Nav.reset('title');

  // 確認・デバッグ用
  NLM.Nav = Nav;
  NLM.Session = Session;
  NLM.GameLoop = GameLoop;
  NLM._showUnlocks = showUnlocks; // 開発用：解禁の演出の確認
})();
