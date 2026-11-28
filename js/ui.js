/* =========================================================
 * ui.js … 画面の部品・メニュー操作（spec.md 4章 / 13章）
 * フェーズ1：画面の枠、ボタン、キーボードでのメニュー操作
 * フェーズ5で：背景・演出を追加
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  /** 要素を作る小さな関数。el('div', {class:'a', onclick:fn}, [子, '文字']) */
  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (v === undefined || v === null || v === false) continue;
        if (k === 'class') node.className = v;
        else if (k === 'text') node.textContent = v;
        else if (k === 'style' && typeof v === 'object') {
          // CSS変数（--c など）は setProperty でないと入らない
          for (const [sk, sv] of Object.entries(v)) {
            if (sv === undefined || sv === null) continue;
            if (sk.startsWith('--')) node.style.setProperty(sk, sv);
            else node.style[sk] = sv;
          }
        }
        else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
        else if (k === 'dataset') Object.assign(node.dataset, v);
        else node.setAttribute(k, v === true ? '' : v);
      }
    }
    if (children !== undefined) append(node, children);
    return node;
  }

  function append(node, children) {
    if (children === null || children === undefined || children === false) return;
    if (Array.isArray(children)) children.forEach((c) => append(node, c));
    else if (children instanceof Node) node.appendChild(children);
    else node.appendChild(document.createTextNode(String(children)));
  }

  /**
   * ボタン
   * opts.variant: 'primary'（最重要・大きく）| 'sub'（控えめ）
   * opts.sub: 下段の小さい説明文
   * opts.color: ネオン色（CSS変数 --c に入る）
   */
  function button(label, onClick, opts) {
    opts = opts || {};
    const cls = ['btn'];
    if (opts.variant) cls.push('btn-' + opts.variant);
    if (opts.className) cls.push(opts.className);
    const b = el(
      'button',
      {
        type: 'button',
        class: cls.join(' '),
        style: opts.color ? { '--c': opts.color } : undefined,
        disabled: opts.disabled,
        dataset: opts.id ? { id: opts.id } : undefined,
        'data-en': opts.en,
      },
      [el('span', { class: 'btn-label', text: label }), opts.sub ? el('span', { class: 'btn-note', text: opts.sub }) : null]
    );
    b.addEventListener('click', (e) => {
      if (b.disabled) return;
      pressFx(b, opts.variant === 'back' ? 'back' : 'select');
      onClick && onClick(e);
    });
    return b;
  }

  /** ボタンを押した時：強く光ってはじける＋効果音（13-1） */
  function pressFx(b, sound) {
    b.classList.remove('pop');
    void b.offsetWidth;
    b.classList.add('pop');
    if (NLM.AudioEngine) NLM.AudioEngine.sfx(sound);
    if (NLM.FX && NLM.FX.cv) {
      const r = b.getBoundingClientRect();
      const col = toHex(getComputedStyle(b).borderTopColor);
      const x = r.left + r.width / 2;
      const y = r.top + r.height / 2;
      NLM.FX.ring(x, y, col, Math.max(r.width, r.height) * 0.9, 0.35, 4);
      NLM.FX.burst(x, y, col, 16, 320, 0);
    }
  }
  /** 'rgb(r, g, b)' → '#rrggbb' */
  function toHex(c) {
    const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(c || '');
    if (!m) return '#ffffff';
    return '#' + [m[1], m[2], m[3]].map((x) => Number(x).toString(16).padStart(2, '0')).join('');
  }

  /** 仮表示の枠（フェーズ1用） */
  function placeholder(lines) {
    return el(
      'div',
      { class: 'placeholder' },
      [].concat(lines).map((t) => el('p', { text: t }))
    );
  }

  /* ---------------- キーボードでのメニュー操作 ----------------
   * 矢印キー：画面上の位置関係で一番近いボタンへ移動
   * Enter：決定（ボタンの標準動作）
   * Escape：戻る（main.js が処理）
   */
  function focusables(root) {
    return Array.from(
      (root || document).querySelectorAll('button:not([disabled]), input:not([disabled]), [data-focusable]')
    ).filter((n) => n.offsetParent !== null);
  }

  function moveFocus(dir, root) {
    const items = focusables(root);
    if (!items.length) return;
    const cur = document.activeElement;
    if (!items.includes(cur)) {
      items[0].focus();
      return;
    }
    const r = cur.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    let best = null;
    let bestScore = Infinity;
    for (const it of items) {
      if (it === cur) continue;
      const q = it.getBoundingClientRect();
      const dx = q.left + q.width / 2 - cx;
      const dy = q.top + q.height / 2 - cy;
      const vertical = dir === 'up' || dir === 'down';
      const main = dir === 'down' ? dy : dir === 'up' ? -dy : dir === 'right' ? dx : -dx;
      if (main <= 4) continue;
      const cross = vertical ? Math.abs(dx) : Math.abs(dy);
      const score = main + cross * 2;
      if (score < bestScore) {
        bestScore = score;
        best = it;
      }
    }
    if (!best) {
      // 端まで来たら反対側へ回り込む（上下のみ）
      if (dir === 'down') best = items[0];
      else if (dir === 'up') best = items[items.length - 1];
    }
    if (best && best !== cur) {
      best.focus();
      if (NLM.AudioEngine) NLM.AudioEngine.sfx('move');
    }
  }

  /** 画面表示直後に、最初のボタン（または data-autofocus）へフォーカス */
  function focusFirst(root) {
    const pref = root.querySelector('[data-autofocus]');
    const body = root.querySelector('.screen-body');
    // 「戻る」より本文の最初のボタンを優先する
    const target = pref || (body && focusables(body)[0]) || focusables(root)[0];
    if (target) target.focus({ preventScroll: true });
  }

  NLM.UI = { el, button, placeholder, focusables, moveFocus, focusFirst, toHex, pressFx };
})();

/* =========================================================
 * 演出（spec.md 13章）：背景の夜のネオン街＋演出用の層
 * - 背景（#bg）：ビル群が奥・中・手前の3層で流れ、看板のネオンが拍に合わせて点滅、
 *   濡れた路面に光が映り込む。ビルと看板は最初に描いた画像を使い回す（16-2）
 * - 演出用の層（#fx）：火花・光の輪・光の線・花火。
 *   画面の部品より奥にあるため、レーン（判定ライン・ノーツ）の上には重ならない（13-3）
 * - 点滅は1秒に3回以下、画面全体のフラッシュは0.1秒以内（13-3）
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const NEON = ['#ff3ea5', '#2de2e6', '#ffe94a', '#b26bff', '#5dff8f', '#ff7a3d', '#3d8bff'];
  const WORDS = ['NEON', 'BAR', '24H', 'CLUB', 'カラオケ', 'ラーメン', 'ゲーム', 'HOTEL', 'CAFE', 'DJ', 'ARCADE', 'LIVE', '夜', '♪', 'OPEN', 'ネオン', 'BEAT', 'ダンス'];

  function rng(seed) {
    let s = seed;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647;
    };
  }
  const mk = (w, h) => {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(w));
    c.height = Math.max(1, Math.ceil(h));
    return c;
  };

  /* ---------- 光のにじみの画像（色ごとに1回だけ作る） ---------- */
  const glowCache = {};
  function glow(color) {
    if (!glowCache[color]) {
      const c = mk(64, 64);
      const g = c.getContext('2d');
      const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      gr.addColorStop(0, color);
      gr.addColorStop(0.35, color + '88');
      gr.addColorStop(1, color + '00');
      g.fillStyle = gr;
      g.fillRect(0, 0, 64, 64);
      glowCache[color] = c;
    }
    return glowCache[color];
  }

  /* ---------- 看板1枚の画像（にじみ込みで1回だけ描く） ---------- */
  function signSprite(kind, word, color, R) {
    const vertical = kind === 'v';
    const fs = vertical ? 15 + R() * 6 : 14 + R() * 10;
    const chars = [...word];
    const tw = vertical ? fs * 1.3 : fs * 0.95 * chars.length + fs;
    const th = vertical ? fs * 1.15 * chars.length + fs * 0.8 : fs * 1.8;
    const pad = 16;
    const c = mk(tw + pad * 2, th + pad * 2);
    const g = c.getContext('2d');
    g.translate(pad, pad);
    // 看板の枠（ネオン管）
    g.shadowColor = color;
    g.shadowBlur = 12;
    g.strokeStyle = color;
    g.lineWidth = 2.5;
    g.fillStyle = 'rgba(10,6,24,0.85)';
    g.beginPath();
    g.roundRect ? g.roundRect(0, 0, tw, th, 6) : g.rect(0, 0, tw, th);
    g.fill();
    g.stroke();
    // 文字
    g.font = `900 ${fs}px 'M PLUS Rounded 1c','Hiragino Maru Gothic ProN',sans-serif`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.shadowBlur = 14;
    g.fillStyle = color;
    if (vertical) chars.forEach((ch, i) => g.fillText(ch, tw / 2, fs * 0.9 + i * fs * 1.15));
    else g.fillText(word, tw / 2, th / 2 + 1);
    g.shadowBlur = 0;
    g.fillStyle = 'rgba(255,255,255,0.85)';
    g.font = `900 ${fs * 0.92}px 'M PLUS Rounded 1c','Hiragino Maru Gothic ProN',sans-serif`;
    if (vertical) chars.forEach((ch, i) => g.fillText(ch, tw / 2, fs * 0.9 + i * fs * 1.15));
    else g.fillText(word, tw / 2, th / 2 + 1);
    return c;
  }

  /* =========================================================
   * 背景の街
   * ========================================================= */
  const City = {
    cv: null,
    g: null,
    W: 0,
    H: 0,
    layers: [],
    signs: [],
    rain: [],
    scroll: 0,
    last: 0,
    // 演出の状態
    bright: 0, // コンボ到達などで一時的に明るく
    litUntil: 0, // 看板が一斉に点灯
    tint: null, // スキル：ネオンをキャラの色に
    tintStart: 0,
    tintUntil: 0,
    dim: 0, // 脱落：ネオンが消える（0〜1）
    dimTarget: 0,
    allLit: false, // 勝利：街中のネオンが点灯
    clock: null, // () => 現在の拍（小数）。なければ120BPM相当

    init() {
      this.cv = document.getElementById('bg');
      this.g = this.cv.getContext('2d');
      window.addEventListener('resize', () => this.build());
      this.build();
    },

    build() {
      const W = Math.max(320, window.innerWidth);
      const H = Math.max(320, window.innerHeight);
      this.W = W;
      this.H = H;
      this.cv.width = W;
      this.cv.height = H;
      const R = rng(4242);
      const horizon = H * 0.76;
      this.horizon = horizon;
      this.signs = [];
      const defs = [
        { color: '#1a1240', hi: [0.3, 0.62], bw: [36, 90], speed: 5, win: 0.22, winCol: ['#6b5cff', '#ff6bd6'], signs: 0 },
        { color: '#110c2c', hi: [0.22, 0.48], bw: [56, 130], speed: 12, win: 0.3, winCol: ['#ffd36b', '#62e6ff', '#ff79c6'], signs: 6 },
        { color: '#08061a', hi: [0.12, 0.34], bw: [80, 180], speed: 26, win: 0.2, winCol: ['#ffcf6b', '#7cf8ff'], signs: 7 },
      ];
      this.layers = defs.map((d, li) => {
        const c = mk(W, H);
        const g = c.getContext('2d');
        const blds = [];
        let x = 0;
        while (x < W) {
          const bw = d.bw[0] + R() * (d.bw[1] - d.bw[0]);
          const bh = H * (d.hi[0] + R() * (d.hi[1] - d.hi[0]));
          blds.push({ x, w: bw, h: bh });
          x += bw + R() * 8;
        }
        for (const b of blds) {
          for (const off of [0, -W]) {
            const bx = b.x + off;
            const by = horizon - b.h;
            g.fillStyle = d.color;
            g.fillRect(bx, by, b.w, b.h);
            // 屋上の段・アンテナ
            if (R() < 0.4) g.fillRect(bx + b.w * 0.2, by - 10, b.w * 0.5, 10);
            if (R() < 0.3) {
              g.fillRect(bx + b.w * 0.6, by - 26, 2, 26);
              g.fillStyle = '#ff3b5c';
              g.fillRect(bx + b.w * 0.6 - 1, by - 28, 4, 3);
            }
            // 窓
            const R2 = rng(Math.floor(b.x * 13 + li * 1000) + 7);
            for (let wy = by + 8; wy < horizon - 10; wy += 9) {
              for (let wx = bx + 5; wx < bx + b.w - 6; wx += 8) {
                if (R2() < d.win) {
                  g.fillStyle = d.winCol[Math.floor(R2() * d.winCol.length)];
                  g.globalAlpha = 0.25 + R2() * 0.45;
                  g.fillRect(wx, wy, 4, 5);
                  g.globalAlpha = 1;
                }
              }
            }
            // 輪郭にうすいネオンの縁
            g.fillStyle = 'rgba(178,107,255,0.18)';
            g.fillRect(bx, by, b.w, 1.5);
          }
        }
        // 看板（この層の上に動的に描く）
        for (let k = 0; k < d.signs; k++) {
          const b = blds[Math.floor(R() * blds.length)];
          const color = NEON[Math.floor(R() * NEON.length)];
          const kind = R() < 0.45 ? 'v' : 'h';
          const word = WORDS[Math.floor(R() * WORDS.length)];
          const sp = signSprite(kind, kind === 'v' ? word.slice(0, 4) : word, color, R);
          const sc = li === 1 ? 0.75 : 1;
          this.signs.push({
            layer: li,
            x: b.x + R() * Math.max(1, b.w - sp.width * sc * 0.6),
            y: horizon - b.h + 14 + R() * Math.max(1, b.h * 0.5 - sp.height * sc),
            sp,
            sc,
            color,
            mode: R() < 0.45 ? 'beat' : R() < 0.5 ? 'alt' : 'steady',
            phase: Math.floor(R() * 2),
          });
        }
        return { c, speed: d.speed };
      });
      this.rain = [];
      for (let i = 0; i < 70; i++) this.rain.push({ x: R() * W, y: R() * H, v: 500 + R() * 400 });
      // 空（1回だけ描く）
      const sky = mk(W, H);
      const sg = sky.getContext('2d');
      const gr = sg.createLinearGradient(0, 0, 0, horizon);
      gr.addColorStop(0, '#04030b');
      gr.addColorStop(0.55, '#0d0726');
      gr.addColorStop(1, '#2a0d3d');
      sg.fillStyle = gr;
      sg.fillRect(0, 0, W, H);
      for (let i = 0; i < 90; i++) {
        sg.fillStyle = `rgba(255,255,255,${0.15 + R() * 0.5})`;
        sg.fillRect(R() * W, R() * horizon * 0.6, 1.2, 1.2);
      }
      // 月
      const mg = sg.createRadialGradient(W * 0.82, H * 0.14, 0, W * 0.82, H * 0.14, H * 0.12);
      mg.addColorStop(0, 'rgba(255,240,220,0.95)');
      mg.addColorStop(0.25, 'rgba(255,200,240,0.5)');
      mg.addColorStop(1, 'rgba(255,120,220,0)');
      sg.fillStyle = mg;
      sg.fillRect(0, 0, W, H);
      // 地平線のにじみ
      const hg = sg.createLinearGradient(0, horizon - H * 0.25, 0, horizon);
      hg.addColorStop(0, 'rgba(255,62,165,0)');
      hg.addColorStop(1, 'rgba(255,62,165,0.25)');
      sg.fillStyle = hg;
      sg.fillRect(0, horizon - H * 0.25, W, H * 0.25);
      this.sky = sky;
    },

    beat(now) {
      return this.clock ? this.clock() : now / 500;
    },

    frame(now) {
      const g = this.g;
      const W = this.W;
      const H = this.H;
      const dt = Math.min(0.1, (now - (this.last || now)) / 1000);
      this.last = now;
      this.scroll += dt;
      this.bright = Math.max(0, this.bright - dt * 0.9);
      this.dim += (this.dimTarget - this.dim) * Math.min(1, dt * 3);
      const horizon = this.horizon;
      g.drawImage(this.sky, 0, 0);
      const b = this.beat(now);
      // 拍の点滅：1秒に3回を超える速さなら2拍に1回（13-3）
      const bpsGuess = this._bps || 2;
      const div = bpsGuess > 3 ? 2 : 1;
      const beatOn = ((b / div) % 1 + 1) % 1 < 0.5;
      const beatIdx = Math.floor(b / div);
      const lit = this.allLit || now < this.litUntil;
      let tintA = 0;
      if (this.tint) {
        if (now < this.tintUntil) tintA = 1;
        else if (now < this.tintUntil + 500) tintA = 1 - (now - this.tintUntil) / 500; // 名残り：0.5秒で消える
        else this.tint = null;
      }
      for (let li = 0; li < this.layers.length; li++) {
        const L = this.layers[li];
        const off = (this.scroll * L.speed) % W;
        g.drawImage(L.c, -off, 0);
        g.drawImage(L.c, W - off, 0);
        // 看板
        for (const s of this.signs) {
          if (s.layer !== li) continue;
          let on = 1;
          if (s.mode === 'beat') on = beatOn ? 1 : 0.35;
          else if (s.mode === 'alt') on = (beatIdx + s.phase) % 2 ? 1 : 0.35;
          let a = (0.45 + 0.55 * on) * (0.75 + this.bright * 0.5);
          if (lit) a = 1;
          a *= 1 - this.dim * 0.88;
          let x = s.x - off;
          if (x + s.sp.width * s.sc < 0) x += W;
          const w = s.sp.width * s.sc;
          const h = s.sp.height * s.sc;
          g.globalAlpha = Math.min(1, a);
          g.drawImage(s.sp, x, s.y, w, h);
          if (tintA > 0) {
            g.globalAlpha = tintA * 0.8;
            g.drawImage(glow(this.tint), x - w * 0.3, s.y - h * 0.3, w * 1.6, h * 1.6);
          }
          // 濡れた路面への映り込み
          if (li > 0) {
            g.globalAlpha = Math.min(1, a) * 0.22;
            g.save();
            // 地平線を軸に上下反転して少しつぶす
            g.translate(0, horizon);
            g.scale(1, -0.55);
            g.translate(0, -horizon);
            g.drawImage(s.sp, x, s.y, w, h);
            g.restore();
          }
          g.globalAlpha = 1;
        }
      }
      // 路面
      const rg = g.createLinearGradient(0, horizon, 0, H);
      rg.addColorStop(0, 'rgba(20,10,40,0.55)');
      rg.addColorStop(1, 'rgba(4,3,10,0.92)');
      g.fillStyle = rg;
      g.fillRect(0, horizon, W, H - horizon);
      g.fillStyle = 'rgba(255,62,165,0.5)';
      g.fillRect(0, horizon, W, 2);
      // 路面の光の筋（濡れた道）
      g.fillStyle = 'rgba(45,226,230,0.18)';
      const dash = (this.scroll * 60) % 80;
      for (let x = -dash; x < W; x += 80) g.fillRect(x, horizon + (H - horizon) * 0.55, 40, 3);
      // 雨
      g.strokeStyle = 'rgba(170,200,255,0.16)';
      g.lineWidth = 1;
      g.beginPath();
      for (const r of this.rain) {
        r.y += r.v * dt;
        r.x -= r.v * dt * 0.18;
        if (r.y > H) {
          r.y = -20;
          r.x = Math.random() * W * 1.2;
        }
        g.moveTo(r.x, r.y);
        g.lineTo(r.x - 3, r.y + 14);
      }
      g.stroke();
      // 街全体の明るさ（コンボ到達・一斉点灯）
      if (this.bright > 0 || lit) {
        g.globalAlpha = lit ? 0.12 : this.bright * 0.14;
        g.fillStyle = '#ff9ee8';
        g.fillRect(0, 0, W, horizon);
        g.globalAlpha = 1;
      }
      if (this.dim > 0.01) {
        g.fillStyle = `rgba(0,0,0,${this.dim * 0.5})`;
        g.fillRect(0, 0, W, H);
      }
    },
  };

  /* =========================================================
   * 演出用の層（火花・光の輪・光の線・花火）
   * 粒は使い回す（作っては捨てない：16-2）。重い時は自動で数を減らす。
   * ========================================================= */
  /* 粒をまとめた絵（色と向きごとに1回だけ描いて使い回す） */
  const spriteCache = {};
  function dotField(size, color, dots) {
    const c = mk(size, size);
    const g = c.getContext('2d');
    g.globalCompositeOperation = 'lighter';
    const gl = glow(color);
    for (const [dx, dy, s] of dots) g.drawImage(gl, size / 2 + dx * size * 0.45 - s * 3, size / 2 + dy * size * 0.45 - s * 3, s * 6, s * 6);
    return c;
  }
  function burstSprite(color, dir) {
    const key = 'b' + color + dir;
    if (spriteCache[key]) return spriteCache[key];
    const R = rng(color.length * 31 + dir * 7 + 3);
    const dots = [];
    for (let i = 0; i < 16; i++) {
      let a = R() * Math.PI * 2;
      if (dir) a = (dir > 0 ? 0 : Math.PI) + (R() - 0.5) * 1.6;
      const d = 0.35 + R() * 0.65;
      dots.push([Math.cos(a) * d, Math.sin(a) * d, 2 + R() * 2.5]);
    }
    return (spriteCache[key] = dotField(128, color, dots));
  }
  function fireworkSprite(color) {
    const key = 'f' + color;
    if (spriteCache[key]) return spriteCache[key];
    const dots = [];
    for (let i = 0; i < 28; i++) {
      const a = (i / 28) * Math.PI * 2;
      dots.push([Math.cos(a) * 0.95, Math.sin(a) * 0.95, 2.6]);
      if (i % 2) dots.push([Math.cos(a) * 0.6, Math.sin(a) * 0.6, 1.8]);
    }
    return (spriteCache[key] = dotField(160, color, dots));
  }

  const MAXP = 700;
  const FX = {
    cv: null,
    g: null,
    dpr: 1,
    parts: [],
    sprites: [], // 粒をまとめた絵（火花・花火）
    free: [],
    rings: [],
    beams: [],
    shakeUntil: 0,
    shakeAmp: 0,
    budget: 1, // 1 → 重い時は 0.5 / 0.25
    slowFrames: 0,

    init() {
      this.cv = document.getElementById('fx');
      this.g = this.cv.getContext('2d');
      for (let i = 0; i < MAXP; i++) this.free.push({ x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, color: '#fff', size: 2, grav: 0 });
      const rs = () => {
        // 重い時（budget < 1）は解像度を下げる。光のにじみなので見た目の差はほとんどない
        this.dpr = this.budget < 1 ? 1 : Math.min(1.5, window.devicePixelRatio || 1);
        this.cv.width = Math.round(window.innerWidth * this.dpr);
        this.cv.height = Math.round(window.innerHeight * this.dpr);
        this.dirty = true;
      };
      this.resize = rs;
      window.addEventListener('resize', rs);
      rs();
    },

    spark(x, y, vx, vy, color, life, size, grav) {
      const p = this.free.pop();
      if (!p) return;
      Object.assign(p, { x, y, vx, vy, color, life, max: life, size, grav: grav || 0 });
      this.parts.push(p);
    },
    /**
     * 火花。dir：飛ぶ向き（-1 左、1 右、0 全方向）
     * 軽量化：たくさんの粒を1つずつ動かさず、粒をまとめて描いた1枚の絵を広げて消す（1回の描画で済む）
     */
    burst(x, y, color, count, speed, dir) {
      if (this.budget < 0.5 && count < 20) return; // 重い時は小さな火花を省く
      const scale = Math.min(1.6, 0.6 + count / 40);
      this.sprites.push({ x, y, img: burstSprite(color, dir || 0), r: speed * 0.55 * scale, life: 0.5, t: 0, grav: 160 });
      this.dirty = true;
    },
    ring(x, y, color, r, dur, width) {
      this.rings.push({ x, y, color, r, dur, width: width || 4, t: 0 });
    },
    beam(x1, y1, x2, y2, color, dur) {
      this.beams.push({ x1, y1, x2, y2, color, dur: dur || 0.45, t: 0 });
    },
    firework(x, y, color) {
      // 花火も1枚の絵（輪に並んだ光の粒）を広げて落とす
      this.sprites.push({ x, y, img: fireworkSprite(color), r: 190, life: 1.3, t: 0, grav: 60 });
      this.ring(x, y, color, 120, 0.5, 3);
      this.dirty = true;
    },
    /** 画面の揺れ（背景と演出の層だけを揺らす。レーンは揺らさない） */
    shake(amp, dur) {
      this.shakeAmp = amp;
      this.shakeUntil = performance.now() + dur * 1000;
    },

    frame(now, dt) {
      const g = this.g;
      const d = this.dpr;
      // 何も飛んでいない時は描き直さない（画面に送る絵が変わらないので軽い：16-2）
      const busy = this.parts.length || this.rings.length || this.beams.length || this.sprites.length;
      if (!busy && !this.dirty) return;
      this.dirty = !!busy;
      g.setTransform(d, 0, 0, d, 0, 0);
      g.clearRect(0, 0, this.cv.width, this.cv.height);
      g.globalCompositeOperation = 'lighter';
      // 光の線
      this.beams = this.beams.filter((b) => (b.t += dt) < b.dur);
      for (const b of this.beams) {
        const k = b.t / b.dur;
        const hx = b.x1 + (b.x2 - b.x1) * Math.min(1, k * 1.6);
        const hy = b.y1 + (b.y2 - b.y1) * Math.min(1, k * 1.6);
        g.strokeStyle = b.color;
        g.globalAlpha = 1 - k;
        g.lineWidth = 5;
        g.beginPath();
        g.moveTo(b.x1, b.y1);
        g.lineTo(hx, hy);
        g.stroke();
        g.lineWidth = 14;
        g.globalAlpha = (1 - k) * 0.25;
        g.stroke();
        g.globalAlpha = 1;
        g.drawImage(glow(b.color), hx - 24, hy - 24, 48, 48);
      }
      // 光の輪
      this.rings = this.rings.filter((r) => (r.t += dt) < r.dur);
      for (const r of this.rings) {
        const k = r.t / r.dur;
        g.globalAlpha = 1 - k;
        g.strokeStyle = r.color;
        g.lineWidth = r.width * (1 - k * 0.6);
        g.beginPath();
        g.arc(r.x, r.y, r.r * (0.25 + k * 0.75), 0, Math.PI * 2);
        g.stroke();
      }
      g.globalAlpha = 1;
      // 火花・花火（粒をまとめた1枚の絵）
      for (let i = this.sprites.length - 1; i >= 0; i--) {
        const sp = this.sprites[i];
        sp.t += dt;
        if (sp.t >= sp.life) {
          this.sprites[i] = this.sprites[this.sprites.length - 1];
          this.sprites.pop();
          continue;
        }
        const k = sp.t / sp.life;
        const ease = 1 - (1 - k) * (1 - k);
        const rr = Math.max(4, sp.r * (0.25 + ease * 0.75));
        g.globalAlpha = 1 - k * k;
        g.drawImage(sp.img, sp.x - rr, sp.y - rr + sp.grav * sp.t * sp.t, rr * 2, rr * 2);
      }
      g.globalAlpha = 1;
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.parts[i] = this.parts[this.parts.length - 1];
          this.parts.pop();
          this.free.push(p);
          continue;
        }
        p.vy += p.grav * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const a = p.life / p.max;
        g.globalAlpha = a;
        const s = p.size * (0.6 + a);
        g.drawImage(glow(p.color), p.x - s * 3, p.y - s * 3, s * 6, s * 6);
      }
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    },
  };

  /* ---------- 処理速度の表示（設定の奥：スマホでの動作確認用・16-2） ---------- */
  const Perf = {
    el: null,
    on: false,
    frames: 0,
    acc: 0,
    worst: 0,
    lastShow: 0,
    show(on) {
      this.on = !!on;
      if (!this.el) {
        this.el = document.createElement('div');
        this.el.className = 'perf-hud';
        document.body.append(this.el);
      }
      this.el.hidden = !this.on;
    },
    tick(now, dt) {
      if (!this.on) return;
      this.frames++;
      this.acc += dt;
      this.worst = Math.max(this.worst, dt);
      if (now - this.lastShow < 500) return;
      this.lastShow = now;
      const fps = this.frames / Math.max(0.001, this.acc);
      this.el.textContent = `${fps.toFixed(0)} FPS　最大 ${(this.worst * 1000).toFixed(0)}ms　粒 ${FX.parts.length}　演出 ${Math.round(FX.budget * 100)}%`;
      this.el.classList.toggle('is-slow', fps < 45);
      this.frames = 0;
      this.acc = 0;
      this.worst = 0;
    },
  };

  /* ---------- 1つのループで背景と演出を動かす ---------- */
  let last = 0;
  let avg = 16;
  let frameNo = 0;
  function loop(now) {
    const dt = Math.min(0.1, (now - (last || now)) / 1000);
    last = now;
    // 重い時は粒を減らす（見た目の印象は保つ：16-2）
    avg = avg * 0.95 + dt * 1000 * 0.05;
    // 60fps＝1フレーム約16.7ms。22msを超えたら減らし、18msを下回ったら戻す（行ったり来たりしないよう差を付ける）
    const low = FX.budget < 1 ? avg > 18 : avg > 22;
    const nb = !low ? 1 : avg > 28 ? 0.35 : 0.6;
    if ((nb < 1) !== (FX.budget < 1)) {
      FX.budget = nb;
      FX.resize();
    } else FX.budget = nb;
    Perf.tick(now, dt);
    // 重い時は背景の街を1フレームおきに描く（ゆっくり動くので見た目はほぼ変わらない）
    if (FX.budget >= 1 || (frameNo++ & 1) === 0) City.frame(now);
    FX.frame(now, dt);
    // 揺れ
    const sh = now < FX.shakeUntil ? FX.shakeAmp * ((FX.shakeUntil - now) / 300) : 0;
    const tr = sh > 0.3 ? `translate(${(Math.random() - 0.5) * sh}px, ${(Math.random() - 0.5) * sh}px)` : '';
    City.cv.style.transform = tr;
    requestAnimationFrame(loop);
  }

  NLM.FX = Object.assign(FX, {
    City,
    Perf,
    glow,
    start() {
      City.init();
      FX.init();
      requestAnimationFrame(loop);
    },
    /** 画面上の要素の中心 */
    center(elm) {
      const r = elm.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    },
  });
})();
