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
        startMatch([song.id], d.id);
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
      b.replaceChildren(el('img', { src: Chars.iconURL(c, 56), alt: '' }), el('span', { class: 'char-name', text: locked && !listMode ? '？？？' : c.name }));
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
        el('div', { class: 'char-line dim' }, [el('b', { text: '解禁　' }), c.unlockText])
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
    const songs = playableSongs();
    const need = Session.mode === 'battle' ? Math.max(1, Math.min(Session.songCount, songs.length)) : 1;
    const picked = [];
    const info = el('div', { class: 'diff-song' });
    const cards = songs.map((s, i) => {
      const badge = el('span', { class: 'pick-badge' });
      const b = button(s.title, () => {
        const k = picked.indexOf(s.id);
        if (k >= 0) picked.splice(k, 1);
        else if (need === 1) picked.splice(0, picked.length, s.id);
        else if (picked.length < need) picked.push(s.id);
        refresh();
      }, { className: 'btn-song', sub: `${s.genre}　BPM ${s.bpm}${s.proto ? '　［試作・開発中のみ］' : ''}`, color: LANE_COLORS[i % 4] });
      b.append(badge);
      b._badge = badge;
      b._id = s.id;
      return b;
    });
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
      info.textContent = need > 1 ? `演奏する順に${need}曲選んでください（${picked.length}/${need}）。全曲同じ難易度です` : '曲を1つ選んでください';
    }
    refresh();
    return {
      title: '曲・難易度選択',
      crumb: modeCrumb(),
      body: el('div', { class: 'song-select' }, [info, el('div', { class: 'song-grid' }, cards), el('div', { class: 'grid grid-4' }, diffs)]),
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
    const me = B.players.find((p) => p.local);
    const song = NLM.Songs.get(match.songs[match.index]);
    const diff = match.difficulty;
    const auto = match.auto;
    const chart = NLM.Chart.generate(song, diff);
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
    const laneWrap = el('div', { class: 'lane-wrap' }, [canvas, warnEl, deadEl, overlay]);
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
      order.forEach((p, i) => {
        const r = rows.get(p);
        r.row.style.order = i;
        if (mode === 'coop') {
          r.fill.style.width = (B.shared.hp || 0) + '%';
          r.pct.textContent = p.lastRes ? JUDGE_TEXT[p.lastRes] : '';
          r.pct.className = 'pl-pct j-' + (p.lastRes || '');
        } else {
          r.fill.style.width = Math.max(0, p.st.hp) + '%';
          r.pct.textContent = Math.ceil(p.st.hp) + '%';
          r.row.classList.toggle('is-out', !p.alive);
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
          if (e.p === me) {
            showSkill(`スキル発動！ ${e.skill.name}`);
            skillPose(e.skill);
          } else if (multi) {
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
    function skillPose(skill) {
      const r = laneWrap.getBoundingClientRect();
      const host = def.body.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const leftSpace = r.left - host.left;
      let sz = Math.min(240, Math.max(110, Math.min(innerWidth, innerHeight) * 0.24));
      const nameH = 46;
      // 横に余白がなければレーンの上の余白に収まる大きさまで縮める（レーンには重ねない）
      if (leftSpace <= sz * 0.9) sz = Math.max(56, Math.min(sz, r.top - host.top - nameH - 6));
      poseCv.width = poseCv.height = Math.round(sz * dpr);
      poseCv.style.width = poseCv.style.height = sz + 'px';
      const pg = poseCv.getContext('2d');
      pg.clearRect(0, 0, poseCv.width, poseCv.height);
      Chars.draw(pg, me.char, poseCv.width / 2, poseCv.height / 2, poseCv.width * 0.92, 'skill');
      poseName.textContent = skill.name;
      poseEl.style.setProperty('--c', me.char.color);
      // レーンには重ねない：横に余白があれば左、なければレーンの上の余白
      if (leftSpace > sz * 0.9) {
        poseEl.style.left = Math.max(0, r.left - host.left - sz - 12) + 'px';
        poseEl.style.top = r.top - host.top + r.height * 0.2 + 'px';
      } else {
        poseEl.style.left = r.left - host.left + r.width / 2 - sz / 2 + 'px';
        poseEl.style.top = Math.max(0, r.top - host.top - sz - nameH - 4) + 'px';
      }
      poseEl.classList.remove('show');
      void poseEl.offsetWidth;
      poseEl.classList.add('show');
      City.tint = me.char.color;
      City.tintUntil = performance.now() + 600;
      AE.sfx('skill');
      const pc = FX.center(poseEl);
      FX.ring(pc.x, pc.y, me.char.color, sz * 1.2, 0.5, 8);
      FX.burst(pc.x, pc.y, me.char.color, 50, 500, 0);
      meterEl.classList.add('full');
      setTimeout(() => meterEl.classList.remove('full'), 300);
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
        if (res !== 'miss') FX.burst(r.left + r.width / 2, r.top + r.height * 0.5, '#ffa53a', 30, 420, 0);
        return;
      }
      const { r, lw, x, y } = laneGeo(e.lane);
      const col = n.key ? '#ffcf3a' : LANE_COLORS[e.lane];
      const side = e.lane < 2 ? -1 : 1;
      const edgeX = side < 0 ? r.left : r.right;
      if (res === 'perfect' || res === 'auto') {
        FX.ring(x, y, col, lw * 2.2, 0.32, 6); // 光の輪（レーンの外へ広がる）
        FX.ring(x, y, '#ffffff', lw * 1.4, 0.22, 3);
        FX.burst(edgeX, y, col, 16, 520, side); // 火花（レーンの外側へ）
        AE.sfx('perfect');
      } else if (res === 'great') {
        FX.ring(x, y, col, lw * 1.4, 0.26, 4);
        FX.burst(edgeX, y, col, 6, 360, side);
      } else {
        AE.sfx('miss');
        hpTrailAt = lastT + 0.35;
      }
      if (n.key && res !== 'miss') {
        // キーノーツ：背景の看板が一斉に点灯＋画面（背景）が拍に合わせて揺れる
        City.litUntil = performance.now() + 380;
        FX.shake(10, 0.3);
        FX.burst(r.left, y, '#ffcf3a', 24, 600, -1);
        FX.burst(r.right, y, '#ffcf3a', 24, 600, 1);
        FX.ring(r.left + r.width / 2, y, '#ffcf3a', r.width * 1.3, 0.45, 8);
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
        const p = FX.center(comboEl);
        FX.burst(p.x, p.y, '#ffe94a', 40, 380, 0);
        AE.sfx('combo');
      }
    }
    function handleEvents(evs) {
      if (!evs.length) return;
      for (const e of evs) {
        if (e.type === 'judge') {
          showJudge(e.result);
          me.lastRes = e.result;
          if (e.note.type !== 'roll') {
            flashAt[e.lane] = lastT;
            flashRes[e.lane] = e.result;
          }
          hitFx(e);
          if (e.result !== 'miss') comboFx();
        } else if (e.type === 'holdBreak') {
          showJudge('miss');
          flashAt[e.lane] = lastT;
          flashRes[e.lane] = 'miss';
          AE.sfx('miss');
          hpTrailAt = lastT + 0.35;
        }
      }
      battleEvents(B.onLocal(me, evs, lastT));
      updateHud();
    }
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
      const fx = B.activeEffects(me, t);
      const has = (ty) => fx.filter((e) => e.type === ty);
      const pxs = H * 0.12 * speed * (has('rush').length ? 1.5 : 1);
      const fog = has('fog').length > 0;
      const wob = has('wobble').length > 0;
      const nh = Math.max(8, H * 0.02);
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
      g.fillStyle = 'rgba(255,255,255,0.12)';
      for (let i = 1; i < 4; i++) g.fillRect(i * lw - 1, 0, 2, H);
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
        if (n.type !== 'hold' || (n.done && !n.holding)) continue;
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
        if (n.key) {
          const h = nh * 1.6;
          if (n.t - t < 1.6) {
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
        if (ok(mine) && B.players.every((p) => p.local || ok(p.results[i]))) {
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
      // 演争：生存者が複数いて次の曲がある → 次の曲へ（HPは引き継ぐ）
      if (mode === 'battle' && !B.over && B.alive().length > 1 && match.index < match.songs.length - 1) {
        match.index++;
        Nav.replace('play', {});
        return;
      }
      recordMatch(match);
      Nav.go('result', {});
    }

    const def = {
      head: false,
      body: el('div', { class: 'play2' + (auto ? ' is-auto' : '') + (multi ? ' is-multi' : '') }, [
        el('div', { class: 'hud-left' }, multi ? [plist] : [judgeEl, comboEl]),
        laneWrap,
        el('div', { class: 'hud-right' }, [
          el('div', { class: 'hud-info' }, [
            el('div', { class: 'hud-title', text: song.title }),
            el('div', { class: 'hud-diff', text: `${diffName}　Lv ${chart.level}${match.songs.length > 1 ? `　${match.index + 1}/${match.songs.length}曲` : ''}${auto ? '　自動演奏' : ''}` }),
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
            when = AE.now() + 3.2; // 3秒のカウントダウン
            audio = AE.playRendered(r, when, 0);
            overlay.classList.add('count');
            // 背景の看板が曲の拍に合わせて点滅（13-1）
            City.clock = () => (AE.now() - when) / chart.compiled.spb;
            City._bps = chart.compiled.bpm / 60;
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
          if (t < 0) {
            const c = Math.ceil(-t);
            overlayText.textContent = String(c);
            if (c !== lastCount && c <= 3) {
              lastCount = c;
              AE.sfx('count');
            }
          } else if (!overlay.hidden) {
            overlay.hidden = true;
            AE.sfx('go');
          }
          if (me.alive) handleEvents(ses.update(t));
          battleEvents(B.tick(t));
          coopCheck(t);
          updateWarn(t);
          draw(t);
          if (performance.now() - plistAt > 100) {
            plistAt = performance.now();
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

  /** 記録：自己ベスト（独奏）と、解禁条件用の累計（試作曲・自動演奏は数えない） */
  function recordMatch(match) {
    if (match.recorded || match.auto) return;
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
      match.newBest = { score: st.score > cur.score, maxCombo: st.maxCombo > cur.maxCombo, perfect: st.counts.perfect > cur.perfect };
      b[diff] = { score: Math.max(cur.score, st.score), maxCombo: Math.max(cur.maxCombo, st.maxCombo), perfect: Math.max(cur.perfect, st.counts.perfect) };
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
      if (match.mode === 'battle' && B.players.length > 1 && B.standings()[0].p === me) T.battleWins++;
      if (match.mode === 'solo' && !st.gameOver) {
        T.clears++;
        if (match.difficulty === 'hard' || match.difficulty === 'extra') T.hardClears++;
        if (match.difficulty === 'extra') T.extraClears++;
      }
    }
    Save.save();
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
    if (match.preview) foot = [button('サウンドテストへ', () => Nav.goWithStack([{ id: 'menu' }, { id: 'settings' }], 'soundTest'), { variant: 'primary', className: 'btn-next' })];
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
      const ranks = B.standings();
      const win = ranks[0].p;
      winner = win;
      body = el('div', { class: 'result result-battle' }, [
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
      const status = match.auto ? '自動演奏（記録なし）' : st.gameOver ? 'GAME OVER' : 'CLEAR';
      body = el('div', { class: 'result' }, [
        el('div', { class: 'res-song', text: `${song.title}　${d.name} Lv ${NLM.Chart.generate(song, match.difficulty).level}` }),
        el('div', { class: 'res-head' }, [
          el('img', { class: 'res-char', src: Chars.iconURL(me.char, 96, st.gameOver ? 'lose' : 'win'), alt: '' }),
          el('div', { class: 'res-status ' + (st.gameOver ? 'is-over' : 'is-clear'), text: status }),
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
      onBack: () => Nav.reset('menu'),
      onEnter() {
        const FX = NLM.FX;
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
