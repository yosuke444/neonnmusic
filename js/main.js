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
    /** 履歴を消して移動（メニューを土台にする） */
    reset(id, params) {
      this.stack = id === 'title' || id === 'menu' ? [] : [{ id: 'menu', params: {} }];
      this._show(id, params || {});
    },
    _show(id, params) {
      if (this.cur && this.cur.def.onLeave) this.cur.def.onLeave();
      const def = Screens[id](params);
      this.cur = { id, params, def };

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
      const modeBtn = (id, sub, next) =>
        button(MODES[id].name, () => {
          Session.mode = id;
          Nav.go(next);
        }, { variant: 'primary', sub, color: MODES[id].color, className: 'btn-mode' });
      return {
        title: 'メインメニュー',
        body: el('div', { class: 'menu-layout' }, [
          el('div', { class: 'menu-modes' }, [
            modeBtn('battle', '最後の一人まで残れ（2〜32人）', 'opponent'),
            modeBtn('coop', 'みんなで1曲を奏でる（2〜32人）', 'opponent'),
            modeBtn('solo', 'ひとりで腕を磨く', 'charSelect'),
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
            Nav.go(Session.mode === 'battle' ? 'cpuRules' : 'lobby');
          }, { variant: 'primary', sub: 'CPUと遊ぶ', color: 'var(--neon-purple)' }),
        ]),
      };
    },

    /* ---------- 部屋を作る / 部屋に入る（フレンド） ---------- */
    room() {
      return {
        title: 'フレンド',
        crumb: modeCrumb(),
        body: [
          el('div', { class: 'grid grid-2 big-choice' }, [
            button('部屋を作る', () => {
              Session.role = 'host';
              Nav.go('lobby');
            }, { variant: 'primary', sub: 'ホストになる', color: 'var(--neon-pink)' }),
            button('部屋に入る', () => {
              Session.role = 'guest';
              Nav.go('lobby');
            }, { variant: 'primary', sub: '部屋番号を入力', color: 'var(--neon-cyan)' }),
          ]),
          placeholder('（仮表示）部屋番号での合流はフェーズ8で実装'),
        ],
      };
    },

    /* ---------- ロビー ---------- */
    lobby() {
      const friend = Session.opponent === 'friend';
      const lines = friend
        ? [
            Session.role === 'host' ? '部屋番号：----（あなたがホスト）' : '部屋番号：----（参加者）',
            '参加者一覧・キャラ選択・ホストの設定',
            '（仮表示）フェーズ4・8で実装',
          ]
        : ['参加するCPU・キャラ選択', '（仮表示）フェーズ4で実装'];
      return {
        title: Session.mode === 'battle' ? 'ロビー（キャラ選択）' : 'ロビー',
        crumb: modeCrumb(),
        body: placeholder(lines),
        foot: nextButton('準備OK → 曲投票へ', () => Nav.go('songVote')),
      };
    },

    /* ---------- 曲投票 ---------- */
    songVote() {
      const lines =
        Session.mode === 'battle'
          ? ['候補の曲から多数決で演奏順を決める', '制限時間20秒・同票はルーレット', '（仮表示）フェーズ8で実装']
          : ['解禁済みの全曲から多数決', '制限時間20秒・1位が複数ならルーレット', '（仮表示）フェーズ4・8で実装'];
      return {
        title: '曲投票',
        crumb: modeCrumb(),
        body: placeholder(lines),
        foot: nextButton('投票を締め切る → 難易度投票へ', () => Nav.go('diffVote')),
      };
    },

    /* ---------- 難易度投票 ---------- */
    diffVote() {
      return {
        title: '難易度投票',
        crumb: modeCrumb(),
        body: [
          placeholder('多数決で難易度を決める（同票はルーレット）'),
          difficultyButtons(() => Nav.go('play')),
        ],
      };
    },

    /* ---------- ルール設定（演争・CPU） ---------- */
    cpuRules() {
      return {
        title: 'ルール設定',
        crumb: modeCrumb(),
        body: placeholder(['CPUの人数（1〜31人）・CPUの強さ', '（仮表示）フェーズ4で実装']),
        foot: nextButton('決定 → キャラ選択へ', () => Nav.go('charSelect')),
      };
    },

    /* ---------- キャラ選択（演争CPU・独奏） ---------- */
    charSelect() {
      const m = MODES[Session.mode];
      return {
        title: 'キャラ選択',
        crumb: modeCrumb(),
        color: m && m.color,
        body: placeholder(['解禁済みのキャラから選ぶ', '（仮表示）フェーズ4で実装']),
        foot: nextButton('決定 → 曲選択へ', () => Nav.go(Session.mode === 'battle' ? 'songDiffSelect' : 'songSelect')),
      };
    },

    /* ---------- 曲・難易度選択（演争CPU）：独奏と同じ選び方（フェーズ4で調整） ---------- */
    songDiffSelect() {
      return SongSelectScreen();
    },

    /* ---------- 曲選択（独奏） ---------- */
    songSelect() {
      return SongSelectScreen();
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
      return {
        title: 'キャラ一覧',
        body: placeholder([
          `全${NLM.Characters.TOTAL}体（最初は${NLM.Characters.INITIAL_UNLOCKED}体が解禁済み）`,
          '解禁状況・特性・スキル・解禁条件と進み具合',
          '（仮表示）フェーズ4・7で実装',
        ]),
      };
    },

    /* ---------- 曲一覧 ---------- */
    songList() {
      return {
        title: '曲一覧',
        body: placeholder([
          `全${NLM.Songs.TOTAL}曲（最初は${NLM.Songs.INITIAL_UNLOCKED}曲が解禁済み）`,
          '解禁状況・難易度ごとの数字・自己ベスト・解禁条件と進み具合',
          '（仮表示）フェーズ6・7で実装',
        ]),
      };
    },

    /* ---------- 設定（12章） ---------- */
    settings() {
      return SettingsScreen();
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

    const note = Save.storageAvailable
      ? null
      : el('p', { class: 'warn', text: 'この端末では保存できません（プライベートモード等）。設定は再読み込みで元に戻ります。' });

    return {
      title: '設定',
      body: el('div', { class: 'settings-panel' }, [speedRow, el('div', { class: 'set-sep' }), ...volRows, note]),
      foot: button('サウンドテスト（開発用）', () => Nav.go('soundTest'), { variant: 'sub', id: 'to-soundtest' }),
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
        const res = Music.check(compiled, rendered);
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
  function bestOf(songId, diff) {
    const b = Save.data.bests[songId];
    return (b && b[diff]) || null;
  }
  const LANE_COLORS = ['#ff3ea5', '#2de2e6', '#ffe94a', '#b26bff'];

  function SongSelectScreen() {
    const songs = playableSongs();
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
          return button(s.title, () => {
            Session.songId = s.id;
            Nav.go('diffSelect');
          }, { className: 'btn-song', sub, color: LANE_COLORS[(page * PER + i) % 4] });
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
        Nav.go('play', { songId: song.id, difficulty: d.id });
      }, { className: 'btn-diff btn-diff2', color: DIFF_COLORS[i], sub: `ノーツ ${ch.stats.count}${b ? '　ベスト ' + b.score.toLocaleString() : ''}`, id: 'diff-' + d.id });
      btn.prepend(el('span', { class: 'diff-lv', text: ch.level }));
      return btn;
    });
    return {
      title: '難易度選択',
      crumb: crumb(modeCrumb(), song.title),
      color: MODES.solo.color,
      body: [el('div', { class: 'diff-song', text: `${song.title}　／　${song.genre}　BPM ${song.bpm}` }), el('div', { class: 'grid grid-4' }, btns)],
    };
  }

  /* =========================================================
   * 演奏画面（5・6章、7-3）
   * - 判定はすべて judge.js、時刻は音声時刻（AE.now / event.timeStamp）
   * - HPはレーンの裏にバーと%（5-3）
   * - フェーズ3：スキルは仮で「HP回復」のみ。演出は最小限（フェーズ5で仕上げ）
   * ========================================================= */
  const JUDGE_TEXT = { perfect: 'PERFECT', great: 'GREAT', miss: 'MISS', auto: 'AUTO' };
  const PROVISIONAL_HEAL = 15;

  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  }

  function PlayScreen(params) {
    params = params || {};
    const song = NLM.Songs.get(params.songId || Session.songId) || playableSongs()[0];
    const diff = params.difficulty || Session.difficulty || 'normal';
    const auto = !!params.auto;
    const chart = NLM.Chart.generate(song, diff);
    const Judge = NLM.Judge;
    const st = Judge.createState({ mode: 'solo' });
    const ses = Judge.createSession(chart, st, { auto });
    const speed = Save.data.settings.noteSpeed;
    const diffName = NLM.Songs.DIFFICULTIES.find((d) => d.id === diff).name;

    let when = null;
    let audio = null;
    let ended = false;
    let ro = null;
    let lastT = -3;
    const down = [false, false, false, false];
    const flashAt = [-9, -9, -9, -9];
    const flashRes = ['', '', '', ''];

    const canvas = el('canvas', { class: 'play-canvas' });
    const g = canvas.getContext('2d');
    const judgeEl = el('div', { class: 'hud-judge' });
    const comboEl = el('div', { class: 'hud-combo' });
    const scoreEl = el('div', { class: 'hud-score', text: '0' });
    const meterFill = el('div', { class: 'meter-fill' });
    const meterEl = el('div', { class: 'hud-meter' }, [el('div', { class: 'meter-label', text: 'SKILL' }), el('div', { class: 'meter-bar' }, [meterFill])]);
    const skillEl = el('div', { class: 'hud-skill' });
    const overlayText = el('div', { class: 'ov-text', text: '読み込み中…' });
    const overlayBar = el('div', { class: 'ov-bar-fill' });
    const overlay = el('div', { class: 'play-overlay' }, [overlayText, el('div', { class: 'ov-bar' }, [overlayBar])]);
    const laneWrap = el('div', { class: 'lane-wrap' }, [canvas, overlay]);
    const zones = [0, 1, 2, 3].map((i) => el('div', { class: 'touch-zone', style: { '--c': `var(--lane-${i})` } }));
    const quitBtn = button('中断', () => Nav.back(), { variant: 'sub', className: 'btn-quit' });

    const songTime = (ts) => AE.perfToAudio(ts) - when;

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
    function doSkill() {
      // フェーズ3の仮スキル：HP回復
      st.hp = Math.min(Judge.HP_MAX, st.hp + PROVISIONAL_HEAL);
      skillEl.textContent = `スキル発動！ HP回復 +${PROVISIONAL_HEAL}`;
      skillEl.classList.remove('show');
      void skillEl.offsetWidth;
      skillEl.classList.add('show');
    }
    function handleEvents(evs) {
      if (!evs.length) return;
      for (const e of evs) {
        if (e.type === 'judge') {
          showJudge(e.result);
          if (e.note.type !== 'roll') {
            flashAt[e.lane] = lastT;
            flashRes[e.lane] = e.result;
          }
        } else if (e.type === 'holdBreak') showJudge('miss');
        else if (e.type === 'skill') doSkill();
      }
      updateHud();
    }
    function press(lane, ts) {
      if (down[lane]) return;
      down[lane] = true;
      if (auto || when === null || ended) return;
      handleEvents(ses.press(lane, songTime(ts)));
    }
    function release(lane, ts) {
      if (!down[lane]) return;
      down[lane] = false;
      if (auto || when === null || ended) return;
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

    function resize() {
      const r = laneWrap.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
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
      const pxs = H * 0.12 * speed;
      const nh = Math.max(8, H * 0.02);
      const Y = (tt) => jy - (tt - t) * pxs;
      g.clearRect(0, 0, W, H);
      // レーン
      for (let i = 0; i < 4; i++) {
        g.fillStyle = hexA(LANE_COLORS[i], 0.05);
        g.fillRect(i * lw, 0, lw, H);
      }
      // HP（レーンの裏・5-3）：30%以下で赤く点滅（1秒に2回）
      const hp = st.hp;
      const low = hp <= 30;
      const blink = low && Math.floor(performance.now() / 250) % 2 === 0;
      g.globalAlpha = blink ? 0.32 : 0.22;
      g.fillStyle = low ? '#ff3b4f' : '#2de2e6';
      g.fillRect(0, H * (1 - hp / 100), W, (H * hp) / 100);
      g.globalAlpha = 0.25;
      g.fillStyle = low ? '#ff8090' : '#ffffff';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.font = `900 ${Math.round(W * 0.06)}px sans-serif`;
      g.fillText('HP', W / 2, H * 0.32);
      g.font = `900 ${Math.round(W * 0.17)}px sans-serif`;
      g.fillText(Math.ceil(hp) + '%', W / 2, H * 0.32 + W * 0.13);
      g.globalAlpha = 1;
      // 区切り線
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 1; i < 4; i++) g.fillRect(i * lw - 1, 0, 2, H);
      // 判定ラインの下（押した場所）
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

      const horizon = t + (jy + nh * 3) / pxs;
      const notes = ses.notes;
      // 連打（全レーン幅・しま模様）
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
      // 長押しの胴体
      for (const n of notes) {
        if (n.t > horizon) break;
        if (n.type !== 'hold' || (n.done && !n.holding)) continue;
        const y1 = n.holding ? jy : Y(n.t);
        const y2 = Math.max(-10, Y(n.end));
        if (y1 <= y2) continue;
        const bw = lw * 0.44;
        const x = n.lane * lw + (lw - bw) / 2;
        const col = n.result === 'miss' ? '#777777' : n.key ? '#ffcf3a' : LANE_COLORS[n.lane];
        g.fillStyle = hexA(col, n.holding ? 0.75 : 0.45);
        g.fillRect(x, y2, bw, y1 - y2);
        g.fillStyle = hexA(col, 0.95);
        g.fillRect(x - 3, y2 - 3, bw + 6, 6); // 終点
      }
      // 同時押しの線
      const groups = {};
      for (const n of notes) {
        if (n.t > horizon) break;
        if (n.chord === null || n.done || n.headDone) continue;
        const gx = groups[n.chord] || (groups[n.chord] = { a: 9, b: -1, y: Y(n.t) });
        gx.a = Math.min(gx.a, n.lane);
        gx.b = Math.max(gx.b, n.lane);
      }
      g.fillStyle = 'rgba(255,255,255,0.75)';
      for (const k in groups) {
        const gx = groups[k];
        if (gx.b > gx.a) g.fillRect(gx.a * lw + lw / 2, gx.y - 2, (gx.b - gx.a) * lw, 4);
      }
      // ノーツの頭
      for (const n of notes) {
        if (n.t > horizon) break;
        if (n.type === 'roll' || n.done || n.headDone) continue;
        const y = Y(n.t);
        if (y < -nh * 3) continue;
        const pad = lw * 0.07;
        const x = n.lane * lw + pad;
        const w = lw - pad * 2;
        if (n.key) {
          // キーノーツ：大きく金色、近づくと予告の光（6-2）
          const h = nh * 1.6;
          const lead = n.t - t;
          if (lead < 1.6) {
            g.fillStyle = `rgba(255,207,58,${0.18 + 0.14 * Math.sin(performance.now() / 90)})`;
            rr(x - 6, y - h / 2 - 6, w + 12, h + 12, 10);
            g.fill();
          }
          g.fillStyle = '#ffcf3a';
          rr(x - 2, y - h / 2, w + 4, h, 6);
          g.fill();
          g.strokeStyle = '#ffffff';
          g.lineWidth = 2;
          g.stroke();
          // 両端のひし形
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
          rr(x, y - nh / 2, w, nh, 5);
          g.fill();
          g.fillStyle = 'rgba(255,255,255,0.85)';
          g.fillRect(x + 4, y - nh / 2 + 2, w - 8, Math.max(2, nh * 0.2));
        }
        if (n.type === 'hold') {
          // 長押しの頭：下向きの山印
          g.fillStyle = 'rgba(10,8,28,0.8)';
          g.beginPath();
          g.moveTo(x + w / 2 - nh * 0.5, y - nh * 0.2);
          g.lineTo(x + w / 2 + nh * 0.5, y - nh * 0.2);
          g.lineTo(x + w / 2, y + nh * 0.35);
          g.closePath();
          g.fill();
        }
      }
    }

    function finish() {
      if (ended) return;
      ended = true;
      GameLoop.stop();
      if (audio) audio.stop();
      const res = {
        songId: song.id,
        difficulty: diff,
        level: chart.level,
        auto,
        preview: !!params.preview,
        score: st.score,
        maxCombo: st.maxCombo,
        counts: Object.assign({}, st.counts),
        gameOver: st.gameOver,
        accuracy: Judge.accuracy(st),
        total: chart.notes.length,
        newBest: {},
      };
      if (!auto) {
        // 自己ベスト（スコア・最大コンボ・パーフェクト数）を曲×難易度ごとに保存（7-3）
        const b = (Save.data.bests[song.id] = Save.data.bests[song.id] || {});
        const cur = b[diff] || { score: 0, maxCombo: 0, perfect: 0 };
        res.newBest = { score: res.score > cur.score, maxCombo: res.maxCombo > cur.maxCombo, perfect: res.counts.perfect > cur.perfect };
        res.prevBest = cur.score;
        b[diff] = { score: Math.max(cur.score, res.score), maxCombo: Math.max(cur.maxCombo, res.maxCombo), perfect: Math.max(cur.perfect, res.counts.perfect) };
        if (!song.proto) {
          const T = Save.data.totals;
          T.plays++;
          T.perfect += res.counts.perfect;
          T.great += res.counts.great;
          T.miss += res.counts.miss;
        }
        Save.save();
      }
      Nav.go('result', res);
    }

    const def = {
      head: false,
      body: el('div', { class: 'play2' + (auto ? ' is-auto' : '') }, [
        el('div', { class: 'hud-left' }, [judgeEl, comboEl]),
        laneWrap,
        el('div', { class: 'hud-right' }, [
          el('div', { class: 'hud-info' }, [el('div', { class: 'hud-title', text: song.title }), el('div', { class: 'hud-diff', text: `${diffName}　Lv ${chart.level}${auto ? '　自動演奏' : ''}` })]),
          el('div', { class: 'hud-score-wrap' }, [el('div', { class: 'hud-label', text: 'SCORE' }), scoreEl]),
          meterEl,
          skillEl,
          quitBtn,
        ]),
        el('div', { class: 'touch-zones' }, zones),
      ]),
      onEnter() {
        AE.init();
        // 開発用：自動テストから判定の状態を見るため
        NLM._play = { ses, st, chart, when: () => when };
        ro = new ResizeObserver(() => {
          resize();
          draw(lastT);
        });
        ro.observe(laneWrap);
        resize();
        updateHud();
        AE.renderSong(song, (p, label) => {
          overlayText.textContent = `読み込み中… ${Math.round(p * 100)}%`;
          overlayBar.style.width = p * 100 + '%';
        })
          .then((r) => {
            if (ended || Nav.cur.def !== def) return;
            when = AE.now() + 3.2; // 3秒のカウントダウン
            audio = AE.playRendered(r, when, 0);
            overlay.classList.add('count');
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
          if (t < 0) overlayText.textContent = String(Math.ceil(-t));
          else if (!overlay.hidden) overlay.hidden = true;
          handleEvents(ses.update(t));
          draw(t);
          if (t > Math.min(chart.duration + 1, ses.lastTime() + 2.5)) finish();
        });
      },
      onLeave() {
        ended = true;
        GameLoop.stop();
        if (audio) audio.stop();
        if (ro) ro.disconnect();
      },
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

  /* =========================================================
   * リザルト（独奏）
   * ========================================================= */
  function ResultScreen(r) {
    r = r || {};
    const song = NLM.Songs.get(r.songId);
    const mode = Session.mode;
    const d = NLM.Songs.DIFFICULTIES.find((x) => x.id === r.difficulty) || { name: '' };
    const c = r.counts || { perfect: 0, great: 0, miss: 0, auto: 0 };
    const again = () => Nav.goWithStack([{ id: 'menu' }, { id: 'songSelect' }, { id: 'diffSelect' }], 'play', { songId: r.songId, difficulty: r.difficulty });
    let foot;
    if (r.preview) foot = [button('サウンドテストへ', () => Nav.goWithStack([{ id: 'menu' }, { id: 'settings' }], 'soundTest'), { variant: 'primary', className: 'btn-next' })];
    else if (mode === 'coop')
      foot = [button('次の曲へ（曲投票）', () => Nav.reset('songVote'), { variant: 'primary', className: 'btn-next' }), button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' })];
    else if (mode === 'battle') foot = [button('メニューへ', () => Nav.reset('menu'), { variant: 'primary', className: 'btn-next' })];
    else
      foot = [
        button('もう一度', again, { variant: 'primary', className: 'btn-next' }),
        button('曲選択へ', () => Nav.reset('songSelect'), { variant: 'sub' }),
        button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' }),
      ];
    const status = r.auto ? '自動演奏（記録なし）' : r.gameOver ? 'GAME OVER' : 'CLEAR';
    const stat = (label, val, cls, isNew) => el('div', { class: 'res-stat ' + (cls || '') }, [el('span', { class: 'res-k', text: label }), el('span', { class: 'res-v', text: val }), isNew ? el('span', { class: 'res-new', text: 'NEW' }) : null]);
    return {
      title: 'リザルト',
      crumb: crumb(modeCrumb(), song && song.title),
      back: false,
      body: el('div', { class: 'result' }, [
        el('div', { class: 'res-song', text: `${song ? song.title : ''}　${d.name} Lv ${r.level || '-'}` }),
        el('div', { class: 'res-status ' + (r.gameOver ? 'is-over' : 'is-clear'), text: status }),
        el('div', { class: 'res-score' }, [el('span', { class: 'res-k', text: 'SCORE' }), el('span', { class: 'res-big', text: (r.score || 0).toLocaleString() }), r.newBest && r.newBest.score ? el('span', { class: 'res-new', text: '自己ベスト更新！' }) : null]),
        el('div', { class: 'res-grid' }, [
          stat('PERFECT', c.perfect, 'c-perfect', r.newBest && r.newBest.perfect),
          stat('GREAT', c.great, 'c-great'),
          stat('MISS', c.miss, 'c-miss'),
          stat('AUTO', c.auto, 'c-auto'),
          stat('最大コンボ', r.maxCombo || 0, '', r.newBest && r.newBest.maxCombo),
          stat('達成率', ((r.accuracy || 0) * 100).toFixed(1) + '%'),
        ]),
      ]),
      foot: el('div', { class: 'foot-row' }, foot),
      onBack: () => Nav.reset('menu'),
    };
  }

  /* =========================================================
   * 起動
   * ========================================================= */
  Save.load();
  // 長押しメニュー・ダブルタップ拡大を抑える
  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('.touch-zone, .lane')) e.preventDefault();
  });
  Nav.reset('title');

  // 確認・デバッグ用
  NLM.Nav = Nav;
  NLM.Session = Session;
  NLM.GameLoop = GameLoop;
})();
