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

    /* ---------- 曲・難易度選択（演争CPU） ---------- */
    songDiffSelect() {
      return {
        title: '曲・難易度選択',
        crumb: modeCrumb(),
        body: [placeholder(['曲を選ぶ（仮表示）フェーズ6で曲を追加']), difficultyButtons(() => Nav.go('play'))],
      };
    },

    /* ---------- 曲選択（独奏） ---------- */
    songSelect() {
      return {
        title: '曲選択',
        crumb: modeCrumb(),
        color: MODES.solo.color,
        body: placeholder(['解禁済みの曲から選ぶ', '（仮表示）フェーズ6で曲を追加']),
        foot: nextButton('決定 → 難易度選択へ', () => Nav.go('diffSelect')),
      };
    },

    /* ---------- 難易度選択（独奏） ---------- */
    diffSelect() {
      return {
        title: '難易度選択',
        crumb: modeCrumb(),
        color: MODES.solo.color,
        body: [placeholder('難易度ごとの数字はフェーズ3で表示'), difficultyButtons(() => Nav.go('play'))],
      };
    },

    /* ---------- バトル / 演奏（フェーズ1：音声時計の確認画面） ---------- */
    play() {
      return PlayScreen();
    },

    /* ---------- リザルト ---------- */
    result() {
      const mode = Session.mode;
      const foot =
        mode === 'coop'
          ? [
              button('次の曲へ（曲投票）', () => Nav.reset('songVote'), { variant: 'primary', className: 'btn-next' }),
              button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' }),
            ]
          : mode === 'solo'
          ? [
              button('曲選択へ', () => Nav.reset('songSelect'), { variant: 'primary', className: 'btn-next' }),
              button('メニューへ', () => Nav.reset('menu'), { variant: 'sub' }),
            ]
          : [button('メニューへ', () => Nav.reset('menu'), { variant: 'primary', className: 'btn-next' })];
      return {
        title: 'リザルト',
        crumb: modeCrumb(),
        back: false,
        body: placeholder(['（仮表示）成績の表示はフェーズ3・4で実装']),
        foot: el('div', { class: 'foot-row' }, foot),
        onBack: () => Nav.reset('menu'),
      };
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
    };
  }

  /* =========================================================
   * 演奏画面（フェーズ1の仮）：音声の時計で動くゲームループの確認
   * - 120BPMのクリックを音声時刻で予約して鳴らす
   * - F・G・H・J（スマホは下部のタップエリア）の入力を、
   *   event.timeStamp → 音声時刻に換算して「拍とのずれ」を表示
   * - キーリピートは無視（4章）
   * ========================================================= */
  function PlayScreen() {
    const BPM = 120;
    const SPB = 60 / BPM;
    const COUNT_IN = 3; // 3秒のカウントダウン
    let start = null; // 音声時刻での開始時刻
    let scheduledBeat = 0;
    let lastBeat = -1;
    const pressed = [false, false, false, false];

    const timeEl = el('div', { class: 'clock-big', text: '--' });
    const beatEl = el('div', { class: 'clock-beat' });
    const hitEl = el('div', { class: 'clock-hit', text: 'F・G・H・J を押す（スマホは下のエリアをタップ）' });
    const infoEl = el('div', { class: 'clock-info-small' });

    const lanes = LANE_LABELS.map((k, i) =>
      el('div', { class: 'lane', style: { '--c': `var(--lane-${i})` } }, [el('div', { class: 'lane-key', text: k })])
    );
    const zones = LANE_LABELS.map((k, i) => el('div', { class: 'touch-zone', style: { '--c': `var(--lane-${i})` }, dataset: { lane: i } }));

    const press = (lane, ts) => {
      if (pressed[lane]) return;
      pressed[lane] = true;
      lanes[lane].classList.add('pressed');
      if (start === null) return;
      const at = AE.perfToAudio(ts);
      const songT = at - start;
      const off = (songT - Math.round(songT / SPB) * SPB) * 1000;
      hitEl.textContent = `レーン ${LANE_LABELS[lane]}　音声時刻 ${at.toFixed(3)}秒　拍とのずれ ${off >= 0 ? '+' : ''}${off.toFixed(0)}ms`;
    };
    const release = (lane) => {
      pressed[lane] = false;
      lanes[lane].classList.remove('pressed');
    };

    // スマホ：複数指の同時タッチ（Pointer Events）
    zones.forEach((z, i) => {
      z.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try {
          z.setPointerCapture(e.pointerId);
        } catch (_) {}
        press(i, e.timeStamp);
      });
      const up = () => release(i);
      z.addEventListener('pointerup', up);
      z.addEventListener('pointercancel', up);
      z.addEventListener('lostpointercapture', up);
    });

    const isMode = MODES[Session.mode] || MODES.solo;

    return {
      title: Session.mode === 'battle' ? 'バトル' : '演奏',
      crumb: modeCrumb(),
      color: isMode.color,
      body: el('div', { class: 'play-wrap' }, [
        el('div', { class: 'play-info' }, [
          el('div', { class: 'clock-label', text: '音声の時計（120BPM のクリック）' }),
          timeEl,
          beatEl,
          hitEl,
          infoEl,
          placeholder('（仮表示）ノーツ・判定はフェーズ3で実装'),
        ]),
        el('div', { class: 'lanes' }, lanes),
        el('div', { class: 'touch-zones' }, zones),
      ]),
      foot: button('終了 → リザルトへ（仮）', () => Nav.go('result'), { variant: 'sub' }),
      onEnter() {
        AE.init();
        GameLoop.start((t) => {
          if (start === null) start = t + COUNT_IN;
          // クリック音を少し先まで予約（AE.now() が予約時刻になった瞬間に聞こえる）
          if (AE.ready) {
            const horizon = AE.scheduleTime() + 0.2;
            while (start + scheduledBeat * SPB < horizon) {
              const bt = start + scheduledBeat * SPB;
              if (bt > AE.scheduleTime()) AE.click(bt, scheduledBeat % 4 === 0);
              scheduledBeat++;
            }
          }
          const songT = t - start;
          if (songT < 0) {
            timeEl.textContent = String(Math.ceil(-songT));
          } else {
            timeEl.textContent = songT.toFixed(2) + ' 秒';
            const b = Math.floor(songT / SPB);
            if (b !== lastBeat) {
              lastBeat = b;
              beatEl.textContent = `${Math.floor(b / 4) + 1} 小節　${(b % 4) + 1} 拍目`;
              lanes.forEach((l) => {
                l.classList.remove('beat');
                void l.offsetWidth;
                l.classList.add('beat');
              });
            }
          }
          const ctx = AE.ctx;
          infoEl.textContent = ctx
            ? `音声：${ctx.state}　出力の遅れ：${Math.round((ctx.outputLatency || ctx.baseLatency || 0) * 1000)}ms`
            : '音声：未起動';
        });
      },
      onLeave() {
        GameLoop.stop();
      },
      onKey(e) {
        const lane = LANE_KEYS.indexOf(e.code);
        if (lane < 0) return false;
        if (e.repeat) return true; // キーリピートは無視
        press(lane, e.timeStamp);
        return true;
      },
      onKeyUp(e) {
        const lane = LANE_KEYS.indexOf(e.code);
        if (lane >= 0) release(lane);
      },
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
