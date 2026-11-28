/* =========================================================
 * audio-engine.js … 音声・再生時計（spec.md 5-2 / 10章 / 12章）
 * フェーズ1：AudioContext、音量の系統（バス）、ゲーム用の時計
 * フェーズ2で：音声合成・OfflineAudioContextでの書き出し・曲再生を追加
 *
 * 【時計の考え方】
 *  ゲームの時刻はすべて「音声時刻（秒）」で扱う。
 *  - now()           … 今スピーカーから出ている音の音声時刻（描画・判定の基準）
 *  - perfToAudio(ts) … event.timeStamp / performance.now() を音声時刻に換算
 *  - scheduleTime()  … 音を予約するときに使う AudioContext.currentTime
 *  source.start(T) で予約した音は、now() が T になった瞬間に聞こえる。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  // 音量 0〜100 → ゲイン（耳の感じ方に合わせて2乗カーブ）
  const volToGain = (v) => Math.pow(Math.max(0, Math.min(100, v)) / 100, 2);

  const AudioEngine = {
    ctx: null,
    buses: {}, // master / bgm / drum / se / system

    // 時計：音声時刻 = performance時刻(秒) + offset
    _offset: null,
    _clockSamples: 0,

    get ready() {
      return !!this.ctx && this.ctx.state === 'running';
    },

    /** ユーザー操作（クリック・タップ・キー）の中で呼ぶ。2回目以降は再開のみ */
    init() {
      if (this.ctx) {
        if (this.ctx.state !== 'running') this.ctx.resume().catch(() => {});
        return this.ctx;
      }
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      const ctx = new AC({ latencyHint: 'interactive' });
      this.ctx = ctx;

      const master = ctx.createGain();
      // 最終段：ゆるやかな音割れ防止（遅れの出ない波形変換。0.85を超えた分だけ丸める）
      const shaper = ctx.createWaveShaper();
      const curve = new Float32Array(4097);
      for (let i = 0; i < curve.length; i++) {
        const x = (i / 2048) - 1;
        const ax = Math.abs(x);
        curve[i] = ax < 0.85 ? x : Math.sign(x) * (0.85 + 0.15 * Math.tanh((ax - 0.85) / 0.15));
      }
      shaper.curve = curve;
      master.connect(shaper);
      shaper.connect(ctx.destination);
      this.buses.master = master;
      for (const name of ['bgm', 'drum', 'se', 'system']) {
        const g = ctx.createGain();
        g.connect(master);
        this.buses[name] = g;
      }

      // iOSの古い版向け：無音を1回鳴らして音声を有効化
      try {
        const buf = ctx.createBuffer(1, 1, 22050);
        const src = ctx.createBufferSource();
        src.buffer = buf;
        src.connect(ctx.destination);
        src.start(0);
      } catch (e) {
        /* 無視 */
      }
      if (ctx.state !== 'running') ctx.resume().catch(() => {});
      // 効果音の作り置き（叩いた瞬間に音源1つを鳴らすだけにする）
      setTimeout(() => this.preloadSfx(), 0);

      // タブ復帰時に再開し、時計を取り直す
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden && this.ctx && this.ctx.state !== 'running') {
          this.ctx.resume().catch(() => {});
        }
        this._offset = null;
      });

      if (NLM.Save) this.applySettings(NLM.Save.data.settings);
      return ctx;
    },

    /** 設定の音量を即反映（12章） */
    applySettings(settings) {
      if (!this.ctx) return;
      const v = settings.volume;
      const t = this.ctx.currentTime;
      const set = (bus, val) => this.buses[bus].gain.setTargetAtTime(volToGain(val), t, 0.015);
      set('master', v.master);
      set('bgm', v.bgm);
      set('drum', v.drum);
      set('se', v.se);
      set('system', v.system);
    },

    /* ---------------- 時計 ---------------- */

    /** 時計のずれを測り直す（ゲームループが毎フレーム呼ぶ） */
    syncClock() {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      let sample = null;
      if (typeof ctx.getOutputTimestamp === 'function') {
        const o = ctx.getOutputTimestamp();
        if (o && o.performanceTime > 0 && o.contextTime > 0) {
          sample = o.contextTime - o.performanceTime / 1000;
        }
      }
      if (sample === null) {
        // getOutputTimestamp が無い環境：出力の遅れを差し引いて推定
        const lat = ctx.outputLatency || ctx.baseLatency || 0;
        sample = ctx.currentTime - lat - performance.now() / 1000;
      }
      // currentTimeは処理単位ごとにしか進まないため、なめらかにする
      if (this._offset === null || Math.abs(sample - this._offset) > 0.05) {
        this._offset = sample;
        this._clockSamples = 1;
      } else {
        const k = this._clockSamples < 30 ? 0.3 : 0.05;
        this._offset += (sample - this._offset) * k;
        this._clockSamples++;
      }
    },

    /** performance系の時刻（ミリ秒。event.timeStampなど）→ 音声時刻（秒） */
    perfToAudio(perfMs) {
      if (this._offset === null) this.syncClock();
      if (this._offset === null) return perfMs / 1000; // 音声未起動時
      return perfMs / 1000 + this._offset;
    },

    /** 今聞こえている音の音声時刻（秒） */
    now() {
      return this.perfToAudio(performance.now());
    },

    /** 音の予約に使う時刻 */
    scheduleTime() {
      return this.ctx ? this.ctx.currentTime : 0;
    },

    /* ---------------- 確認用の短い音 ----------------
     * フェーズ1では設定画面の音量確認と、時計確認画面のメトロノームに使う。
     * 本番の曲・効果音はフェーズ2・5で作る。 */

    /** バスごとの確認音 */
    playTest(bus) {
      const ctx = this.ctx;
      if (!ctx) return;
      const t = ctx.currentTime + 0.01;
      if (bus === 'drum') return this.kick(t, 'drum');
      if (bus === 'bgm') return this._tone(t, [261.63, 329.63, 392.0], 'triangle', 0.35, 0.18, 'bgm');
      if (bus === 'se') return this._tone(t, [1318.5], 'square', 0.06, 0.12, 'se');
      // master / system
      return this._tone(t, [880, 1760], 'sine', 0.12, 0.15, 'system');
    },

    /** キック（150Hz→50Hzへ0.1秒で下げるサイン波。10-4） */
    kick(t, bus, gain) {
      const ctx = this.ctx;
      if (!ctx) return;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(50, t + 0.1);
      const peak = gain === undefined ? 0.9 : gain;
      g.gain.setValueAtTime(peak, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.connect(g).connect(this.buses[bus || 'drum']);
      o.start(t);
      o.stop(t + 0.3);
    },

    /**
     * 効果音（13-4：すべて合成。打鍵音は短く、メニューはネオン風の電子音）
     * 効果音 → 「効果音」の音量、メニュー系 → 「システム音」の音量
     */
    sfx(name) {
      const ctx = this.ctx;
      if (!ctx || ctx.state !== 'running') return;
      if (name === 'tap') {
        // 打鍵音は設定で選ぶ（なしも選べる）
        const v = (NLM.Save && NLM.Save.data && NLM.Save.data.settings.tapSound) || 'kat';
        if (v === 'off') return;
        name = 'tap_' + v;
      }
      // 作り置きの音があれば、音源1つを鳴らすだけ（叩いた瞬間の処理を軽く・速く：フェーズ9のあと）
      const c = this._sfxCache[name];
      if (c) {
        const src = ctx.createBufferSource();
        src.buffer = c.buf;
        src.connect(this.buses[c.bus]);
        src.start();
        return;
      }
      this._voice(ctx, (bus) => this.buses[bus], ctx.currentTime + 0.003, name);
      this._prerender(name);
    },
    _sfxCache: {},
    _sfxPending: {},
    /** 効果音を前もって書き出しておく */
    _prerender(name) {
      const ctx = this.ctx;
      if (!ctx || this._sfxCache[name] || this._sfxPending[name] || this._sfxFailed || !window.OfflineAudioContext) return;
      this._sfxPending[name] = true;
      const sr = ctx.sampleRate;
      let off;
      try {
        off = new OfflineAudioContext(1, Math.round(sr * 1.4), sr);
      } catch (e) {
        this._sfxFailed = true;
        return;
      }
      let bus = 'se';
      this._voice(off, (b) => ((bus = b), off.destination), 0, name);
      off
        .startRendering()
        .then((buf) => (this._sfxCache[name] = { buf, bus }))
        .catch(() => {
          // 作り置きに失敗する端末では二度と試さない（叩くたびにやり直すと、叩いた瞬間に固まる）
          this._sfxFailed = true;
        });
    },
    /** よく使う効果音を作り置き（起動時） */
    preloadSfx() {
      ['tap_kat', 'tap_click', 'tap_drum', 'tap_clap', 'tap_bell', 'perfect', 'great', 'miss', 'key', 'combo', 'skill', 'attacked', 'warn', 'hurt', 'count', 'go', 'move', 'select', 'back'].forEach((n) => this._prerender(n));
    },
    /** 効果音の中身（bus：鳴らす系統の名前 → 出口） */
    _voice(ctx, busOf, t, name) {
      const tone = (bus, type, f0, f1, dur, gain, at) => {
        const s = t + (at || 0);
        const o = ctx.createOscillator();
        const gn = ctx.createGain();
        o.type = type;
        o.frequency.setValueAtTime(f0, s);
        if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(f1, s + dur);
        gn.gain.setValueAtTime(0.0001, s);
        gn.gain.exponentialRampToValueAtTime(gain, s + 0.004);
        gn.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        o.connect(gn).connect(busOf(bus));
        o.start(s);
        o.stop(s + dur + 0.02);
      };
      const hiss = (bus, hp, dur, gain, at) => {
        const s = t + (at || 0);
        const n = ctx.createBufferSource();
        if (!this._noise) {
          const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
          const d = b.getChannelData(0);
          for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
          this._noise = b;
        }
        n.buffer = this._noise;
        const f = ctx.createBiquadFilter();
        f.type = 'highpass';
        f.frequency.value = hp;
        const gn = ctx.createGain();
        gn.gain.setValueAtTime(gain, s);
        gn.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        n.connect(f).connect(gn).connect(busOf(bus));
        n.start(s);
        n.stop(s + dur + 0.02);
      };
      switch (name) {
        /* 打鍵音（設定で選ぶ） */
        case 'tap_kat': // カッ：はっきり大きく（監督の決定：大きく気持ちよく）
          hiss('se', 1800, 0.045, 0.5);
          tone('se', 'triangle', 1300, 650, 0.05, 0.3);
          tone('se', 'sine', 190, 90, 0.07, 0.35);
          break;
        case 'tap_click': // カチッ：短く高い
          hiss('se', 4000, 0.02, 0.45);
          tone('se', 'square', 2400, 2400, 0.02, 0.12);
          break;
        case 'tap_drum': // ドン：太鼓
          tone('se', 'sine', 150, 70, 0.13, 0.65);
          hiss('se', 600, 0.05, 0.18);
          break;
        case 'tap_clap': // パン：手拍子
          hiss('se', 1000, 0.08, 0.5);
          hiss('se', 1500, 0.03, 0.3, 0.012);
          break;
        case 'tap_bell': // チン：鈴
          tone('se', 'sine', 2093, 2093, 0.18, 0.25);
          tone('se', 'sine', 4186, 4186, 0.1, 0.08);
          break;
        case 'perfect': // パーフェクト：きらっと光る高い音
          tone('se', 'sine', 2637, 2637, 0.16, 0.22);
          tone('se', 'sine', 3951, 3951, 0.12, 0.12, 0.012);
          tone('se', 'triangle', 1319, 1319, 0.1, 0.16);
          break;
        case 'great': // グレイト：少し控えめな明るい音
          tone('se', 'sine', 1760, 1760, 0.1, 0.18);
          tone('se', 'triangle', 1175, 1175, 0.08, 0.12);
          break;
        case 'miss':
          tone('se', 'triangle', 110, 70, 0.12, 0.12);
          break;
        case 'key':
          tone('se', 'square', 1046, 1046, 0.06, 0.035);
          tone('se', 'square', 1568, 1568, 0.08, 0.03, 0.03);
          break;
        case 'combo':
          [1046, 1318, 1568, 2093].forEach((f, i) => tone('se', 'square', f, f, 0.07, 0.035, i * 0.045));
          break;
        case 'skill': // スキル発動：大きく派手に
          tone('se', 'sawtooth', 220, 1600, 0.35, 0.14);
          hiss('se', 1500, 0.45, 0.22);
          tone('se', 'sine', 60, 40, 0.4, 0.5);
          [1046, 1318, 1568, 2093].forEach((f, i) => tone('se', 'square', f, f, 0.12, 0.06, 0.25 + i * 0.05));
          break;
        case 'attacked': // 攻撃された：警報のような音
          tone('se', 'sawtooth', 880, 440, 0.18, 0.12);
          tone('se', 'sawtooth', 880, 440, 0.18, 0.12, 0.2);
          hiss('se', 800, 0.3, 0.12);
          break;
        case 'warn':
          tone('se', 'square', 1320, 1320, 0.05, 0.05);
          tone('se', 'square', 1320, 1320, 0.05, 0.05, 0.09);
          break;
        case 'hurt':
          hiss('se', 900, 0.2, 0.08);
          tone('se', 'sawtooth', 500, 120, 0.2, 0.04);
          break;
        case 'elim':
          tone('se', 'square', 700, 60, 0.7, 0.07);
          hiss('se', 400, 0.6, 0.08, 0.05);
          break;
        case 'win':
          [523, 659, 784, 1046, 1318].forEach((f, i) => tone('se', 'square', f, f, 0.16, 0.05, i * 0.09));
          tone('se', 'sawtooth', 1046, 1046, 0.6, 0.03, 0.45);
          break;
        case 'count':
          tone('system', 'square', 880, 880, 0.09, 0.06);
          break;
        case 'go':
          tone('system', 'square', 1760, 1760, 0.2, 0.06);
          break;
        case 'move':
          tone('system', 'sine', 1500, 1700, 0.03, 0.05);
          break;
        case 'select':
          tone('system', 'square', 880, 1760, 0.07, 0.05);
          hiss('system', 6000, 0.06, 0.05);
          break;
        case 'back':
          tone('system', 'square', 1320, 660, 0.07, 0.045);
          break;
        case 'start':
          [660, 880, 1320, 1760].forEach((f, i) => tone('system', 'square', f, f, 0.09, 0.05, i * 0.06));
          break;
      }
    },

    /** メトロノームのクリック（時計確認用） */
    click(t, accent) {
      this._tone(t, [accent ? 1760 : 1175], 'square', 0.03, accent ? 0.16 : 0.1, 'drum');
    },

    _tone(t, freqs, type, dur, gain, bus) {
      const ctx = this.ctx;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      g.connect(this.buses[bus]);
      for (const f of freqs) {
        const o = ctx.createOscillator();
        o.type = type;
        o.frequency.value = f;
        o.connect(g);
        o.start(t);
        o.stop(t + dur + 0.02);
      }
    },
  };

  /* =========================================================
   * 音声合成（10-4）
   * すべての音色は「ctx・出力先・時刻・長さ・MIDI番号・強さ」を受け取って鳴らす関数。
   * OfflineAudioContext（書き出し）と AudioContext（サウンドテスト）で同じ関数を使う。
   * ========================================================= */
  const M = () => NLM.Music;
  const noiseCache = new WeakMap();
  const irCache = new WeakMap();
  const pulseCache = new WeakMap();

  function noiseBuffer(ctx) {
    let b = noiseCache.get(ctx);
    if (!b) {
      const len = ctx.sampleRate * 2;
      b = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = b.getChannelData(0);
      let s = 12345;
      for (let i = 0; i < len; i++) {
        s = (s * 1103515245 + 12345) & 0x7fffffff;
        d[i] = s / 0x3fffffff - 1;
      }
      noiseCache.set(ctx, b);
    }
    return b;
  }

  /** 計算で作った残響データ（左右で別の揺らぎ） */
  function impulse(ctx) {
    let b = irCache.get(ctx);
    if (!b) {
      const sr = ctx.sampleRate;
      const len = Math.floor(sr * 1.8);
      b = ctx.createBuffer(2, len, sr);
      let s = 777;
      for (let ch = 0; ch < 2; ch++) {
        const d = b.getChannelData(ch);
        let lp = 0;
        for (let i = 0; i < len; i++) {
          s = (s * 1103515245 + 12345) & 0x7fffffff;
          const n = s / 0x3fffffff - 1;
          lp += (n - lp) * (0.55 - 0.4 * (i / len)); // 後ろほどこもる
          const pre = i < sr * 0.012 ? 0 : 1; // 初期反射までの短い間
          d[i] = lp * Math.pow(1 - i / len, 3.2) * pre;
        }
      }
      irCache.set(ctx, b);
    }
    return b;
  }

  /** パルス波（チップチューンの矩形波。duty＝山の割合） */
  function pulseWave(ctx, duty) {
    let m = pulseCache.get(ctx);
    if (!m) pulseCache.set(ctx, (m = {}));
    if (!m[duty]) {
      const N = 64;
      const re = new Float32Array(N);
      const im = new Float32Array(N);
      for (let n = 1; n < N; n++) re[n] = (2 / (n * Math.PI)) * Math.sin(n * Math.PI * duty);
      m[duty] = ctx.createPeriodicWave(re, im);
    }
    return m[duty];
  }

  /** 音量の時間変化（ADSR）。戻り値＝音が十分小さくなる時刻 */
  function adsr(param, t, dur, a, d, s, r, peak) {
    param.setValueAtTime(0.0001, t);
    param.linearRampToValueAtTime(peak, t + a);
    if (s < 1) param.setTargetAtTime(Math.max(0.0001, peak * s), t + a, Math.max(0.002, d / 3));
    const off = t + Math.max(dur, a);
    param.setTargetAtTime(0.0001, off, Math.max(0.002, r / 3));
    return off + r * 2.5 + 0.02;
  }

  function osc(ctx, type, freq, t, end, detune) {
    const o = ctx.createOscillator();
    if (type instanceof PeriodicWave) o.setPeriodicWave(type);
    else o.type = type;
    o.frequency.value = freq;
    if (detune) o.detune.value = detune;
    o.start(t);
    o.stop(end);
    return o;
  }

  let noiseSeed = 0; // 音の使い回し時に、ノイズの出だしを変えて機械的に聞こえないようにする
  function noise(ctx, t, end) {
    const s = ctx.createBufferSource();
    s.buffer = noiseBuffer(ctx);
    s.loop = true;
    s.start(t, (t * 7.31 + noiseSeed) % 1.5);
    s.stop(end);
    return s;
  }

  function filter(ctx, type, freq, q) {
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    if (q !== undefined) f.Q.value = q;
    return f;
  }

  function gainNode(ctx, v) {
    const g = ctx.createGain();
    g.gain.value = v;
    return g;
  }

  /** 歪み（波形をつぶす）の曲線 */
  const driveCache = new WeakMap();
  function drive(ctx, k) {
    let m = driveCache.get(ctx);
    if (!m) driveCache.set(ctx, (m = {}));
    if (!m[k]) {
      const c = new Float32Array(1024);
      for (let i = 0; i < c.length; i++) {
        const x = (i / 511.5) - 1;
        c[i] = Math.tanh(x * k) / Math.tanh(k);
      }
      m[k] = c;
    }
    return m[k];
  }

  /** 打楽器用：急に立ち上がって指数的に消える */
  function hitEnv(param, t, peak, decay) {
    param.setValueAtTime(peak, t);
    param.exponentialRampToValueAtTime(0.0005, t + decay);
    return t + decay + 0.02;
  }

  const hz = (m) => M().midiToFreq(m);

  const PRESETS = {
    /* ---------- 旋律・和音 ---------- */
    // スーパーソウ：のこぎり波7本を少しずつずらして重ねる
    supersaw(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const flt = filter(ctx, 'lowpass', inst.cutoff || 7000, 0.6);
      const amp = ctx.createGain();
      const pl = ctx.createStereoPanner();
      const pr = ctx.createStereoPanner();
      pl.pan.value = -0.55;
      pr.pan.value = 0.55;
      pl.connect(flt);
      pr.connect(flt);
      flt.connect(amp).connect(out);
      const e = inst.env || [0.006, 0.4, 0.75, 0.18];
      const end = adsr(amp.gain, t, dur, e[0], e[1], e[2], e[3], vel * 0.14);
      if (inst.fenv) {
        flt.frequency.setValueAtTime(inst.cutoff * inst.fenv, t);
        flt.frequency.setTargetAtTime(inst.cutoff, t, 0.08);
      }
      const spread = inst.detune || 22;
      for (let k = 0; k < 7; k++) {
        const o = osc(ctx, 'sawtooth', f, t + k * 0.0004, end, ((k - 3) / 3) * spread);
        o.connect(k === 3 ? pl : k % 2 ? pl : pr);
        if (k === 3) o.connect(pr);
      }
    },
    // プラック：短い音量変化＋フィルターの開閉
    pluck(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const flt = filter(ctx, 'lowpass', inst.cutHi || 5000, inst.q || 3);
      const amp = ctx.createGain();
      flt.connect(amp).connect(out);
      flt.frequency.setValueAtTime(inst.cutHi || 5000, t);
      flt.frequency.setTargetAtTime(inst.cutLo || 500, t, inst.fdecay || 0.06);
      const end = adsr(amp.gain, t, Math.min(dur, 0.05), 0.002, 0.25, 0, inst.release || 0.18, vel * 0.32);
      // のこぎり波2本（矩形波を使わず、ピコピコした音にしない）
      osc(ctx, 'sawtooth', f, t, end, -7).connect(flt);
      osc(ctx, 'sawtooth', f, t, end, 7).connect(flt);
    },
    // パッド：ゆっくり立ち上がる柔らかい和音
    pad(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const flt = filter(ctx, 'lowpass', inst.cutoff || 1600, 0.4);
      const amp = ctx.createGain();
      const pl = ctx.createStereoPanner();
      const pr = ctx.createStereoPanner();
      pl.pan.value = -0.7;
      pr.pan.value = 0.7;
      pl.connect(flt);
      pr.connect(flt);
      flt.connect(amp).connect(out);
      const end = adsr(amp.gain, t, dur, inst.attack || 0.35, 1, 0.8, inst.release || 0.7, vel * 0.09);
      [-14, -5, 5, 14].forEach((dt, k) => osc(ctx, 'sawtooth', f, t, end, dt).connect(k % 2 ? pl : pr));
    },
    // FM合成：ベル・金属的な音
    bell(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, 0.02, 0.002, inst.decay || 1.2, 0, inst.decay || 1.2, vel * 0.22);
      const car = osc(ctx, 'sine', f, t, end);
      const mod = osc(ctx, 'sine', f * (inst.ratio || 3.5), t, end);
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(f * (inst.index || 2.2), t);
      idx.gain.setTargetAtTime(f * 0.15, t, 0.25);
      mod.connect(idx).connect(car.frequency);
      car.connect(amp);
    },
    // パルス波（チップチューンのリード）
    pulse(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.002, 0.08, inst.sustain || 0.75, 0.03, vel * (inst.level || 0.2));
      const o = osc(ctx, pulseWave(ctx, inst.duty || 0.25), f, t, end);
      if (dur > 0.28 && inst.vibrato !== 0) {
        const lfo = osc(ctx, 'sine', 6, t, end);
        const d = ctx.createGain();
        d.gain.setValueAtTime(0, t);
        d.gain.setValueAtTime(0, t + 0.14);
        d.gain.linearRampToValueAtTime(inst.vibrato || 18, t + 0.3);
        lfo.connect(d).connect(o.detune);
      }
      o.connect(amp);
    },
    // 三角波（チップチューンのベース）
    tri(ctx, out, t, dur, midi, vel, inst) {
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.002, 0.05, 0.9, 0.02, vel * 0.5);
      osc(ctx, 'triangle', hz(midi), t, end).connect(amp);
    },
    // 声っぽいリード（のこぎり波を「あ」の母音の帯域に通す）
    vox(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.025, 0.25, 0.8, 0.14, vel * 0.5);
      const src = osc(ctx, 'sawtooth', f, t, end);
      const src2 = osc(ctx, 'sawtooth', f, t, end, 9);
      const lfo = osc(ctx, 'sine', 5.2, t, end);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.linearRampToValueAtTime(14, t + 0.35);
      lfo.connect(lg);
      lg.connect(src.detune);
      lg.connect(src2.detune);
      const mix = ctx.createGain();
      src.connect(mix);
      src2.connect(mix);
      [
        [750, 7, 1],
        [1150, 9, 0.6],
        [2800, 12, 0.25],
      ].forEach(([fr, q, g]) => {
        const b = filter(ctx, 'bandpass', fr, q);
        if (inst.wah) {
          // トークボックス風：口を閉じた「ウ」から開いた「ア」へ、音ごとに声の帯域を動かす
          b.frequency.setValueAtTime(fr * 0.4, t);
          b.frequency.setTargetAtTime(fr, t, inst.wah);
        }
        const bg = gainNode(ctx, g);
        mix.connect(b).connect(bg).connect(amp);
      });
    },

    /* ---------- ジャズ・ファンク系（エレピ・オルガン・サックス・ホーン・ギター） ---------- */
    // エレピ：FM合成。弾いた瞬間の「ガツッ」とした響き（bark）＋高い金属音（tine）、ゆっくり消える
    epiano(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const dec = inst.decay || 1.6;
      const pk = vel * 0.3;
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.linearRampToValueAtTime(pk, t + 0.004);
      amp.gain.setTargetAtTime(pk * 0.2, t + 0.004, dec / 2.5);
      const off = t + Math.max(dur, 0.05);
      amp.gain.setTargetAtTime(0.0001, off, 0.08);
      const end = off + 0.4;
      const car = osc(ctx, 'sine', f, t, end);
      const mod = osc(ctx, 'sine', f, t, end);
      if (inst.warble) {
        // テープの揺れ（ヴェイパーウェイヴ）：音程がゆっくり揺れる
        const w = gainNode(ctx, inst.warble);
        osc(ctx, 'sine', 0.6, t, end).connect(w);
        w.connect(car.detune);
        w.connect(mod.detune);
      }
      const idx = ctx.createGain();
      idx.gain.setValueAtTime(f * (inst.bark || 1.3), t);
      idx.gain.setTargetAtTime(f * 0.1, t, 0.2);
      mod.connect(idx).connect(car.frequency);
      const tg = ctx.createGain();
      tg.gain.setValueAtTime(0.05, t);
      tg.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
      osc(ctx, 'sine', f * 14, t, t + 0.1).connect(tg).connect(amp);
      if (inst.trem) {
        // 音量の揺れ（トレモロ）
        const tr = gainNode(ctx, 1);
        osc(ctx, 'sine', inst.trem, t, end).connect(gainNode(ctx, 0.25)).connect(tr.gain);
        car.connect(tr).connect(amp);
      } else car.connect(amp);
    },
    // オルガン：サイン波を倍音の位置に重ねる（ドローバー）＋揺れ＋鍵盤のクリック音
    organ(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.006, 0.05, 1, 0.06, vel * 0.08);
      const bars = inst.bars || [0.8, 1, 0.6, 0.5, 0, 0.3];
      const ratios = [0.5, 1, 1.5, 2, 3, 4];
      const vd = gainNode(ctx, inst.vib === undefined ? 7 : inst.vib);
      osc(ctx, 'sine', 6.2, t, end).connect(vd);
      bars.forEach((b, k) => {
        if (!b) return;
        const o = osc(ctx, 'sine', f * ratios[k], t, end);
        vd.connect(o.detune);
        o.connect(gainNode(ctx, b)).connect(amp);
      });
      const cg = ctx.createGain();
      cg.connect(out);
      hitEnv(cg.gain, t, vel * 0.04, 0.012);
      noise(ctx, t, t + 0.02).connect(filter(ctx, 'bandpass', 3000, 1)).connect(cg);
    },
    // サックス風のリード：のこぎり波＋矩形波、息の音、出だしの音程のしゃくり、遅れてかかる揺れ
    sax(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.03, 0.2, 0.85, 0.09, vel * 0.3);
      const cut = inst.cutoff || 2400;
      const flt = filter(ctx, 'lowpass', cut * 0.35, 1.4);
      flt.frequency.setValueAtTime(cut * 0.35, t);
      flt.frequency.linearRampToValueAtTime(cut, t + 0.07);
      const o1 = osc(ctx, 'sawtooth', f, t, end);
      const o2 = osc(ctx, 'square', f, t, end, 5);
      o1.detune.setValueAtTime(-50, t);
      o1.detune.linearRampToValueAtTime(0, t + 0.05);
      const lg = ctx.createGain();
      lg.gain.setValueAtTime(0, t);
      lg.gain.setValueAtTime(0, t + 0.18);
      lg.gain.linearRampToValueAtTime(inst.vibrato || 16, t + 0.45);
      osc(ctx, 'sine', 5.4, t, end).connect(lg);
      lg.connect(o1.detune);
      lg.connect(o2.detune);
      o1.connect(flt);
      o2.connect(gainNode(ctx, 0.45)).connect(flt);
      const body = filter(ctx, 'peaking', 1300, 1.2);
      body.gain.value = 6;
      flt.connect(body).connect(amp);
      const bg = gainNode(ctx, 0.05);
      bg.connect(amp);
      noise(ctx, t, end).connect(filter(ctx, 'bandpass', 2200, 1.5)).connect(bg);
    },
    // ホーン（金管の和音）：フィルターが一瞬で開いて少し閉じる
    horn(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.018, 0.15, 0.7, 0.08, vel * 0.11);
      const cut = inst.cutoff || 3200;
      const flt = filter(ctx, 'lowpass', 400, 1);
      flt.frequency.setValueAtTime(400, t);
      flt.frequency.linearRampToValueAtTime(cut, t + 0.04);
      flt.frequency.setTargetAtTime(cut * 0.6, t + 0.05, 0.15);
      osc(ctx, 'sawtooth', f, t, end, -6).connect(flt);
      osc(ctx, 'sawtooth', f, t, end, 6).connect(flt);
      flt.connect(amp);
    },
    // ギター（ファンクのカッティング）：mute:true で短く詰まった音
    gtr(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, Math.min(dur, inst.mute ? 0.06 : 0.6), 0.002, 0.12, inst.mute ? 0 : 0.35, 0.06, vel * 0.2);
      const lp = filter(ctx, 'lowpass', 6000, 0.7);
      lp.frequency.setTargetAtTime(1800, t, 0.05);
      osc(ctx, 'sawtooth', f, t, end).connect(lp);
      osc(ctx, 'square', f * 2, t, end, 3).connect(gainNode(ctx, 0.25)).connect(lp);
      if (inst.drive) {
        // 歪んだギター（ロック）：波形をつぶして、こもらないよう高めの帯域を残す
        const sh = ctx.createWaveShaper();
        sh.curve = drive(ctx, inst.drive);
        lp.frequency.cancelScheduledValues(t);
        lp.frequency.setValueAtTime(inst.tone ? inst.tone * 2 : 3200, t);
        lp.connect(sh).connect(filter(ctx, 'lowpass', 4200, 0.8)).connect(gainNode(ctx, 0.45)).connect(amp);
        return;
      }
      lp.connect(filter(ctx, 'bandpass', inst.tone || 1600, 0.9)).connect(amp);
      lp.connect(gainNode(ctx, 0.4)).connect(amp);
    },
    // ウッドベース・指弾きのベース（ウォーキングベース向け）：弾いた瞬間が強く、すぐ落ち着く
    wbass(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const pk = vel * 0.5;
      amp.gain.setValueAtTime(0.0001, t);
      amp.gain.linearRampToValueAtTime(pk, t + 0.006);
      amp.gain.setTargetAtTime(pk * 0.4, t + 0.006, 0.12);
      const off = t + Math.max(dur * 0.92, 0.06);
      amp.gain.setTargetAtTime(0.0001, off, 0.03);
      const end = off + 0.15;
      const cut = inst.cutoff || 900;
      const flt = filter(ctx, 'lowpass', cut * 2.2, 1.2);
      flt.frequency.setTargetAtTime(cut, t, 0.06);
      osc(ctx, 'triangle', f, t, end).connect(flt);
      osc(ctx, 'sawtooth', f, t, end).connect(gainNode(ctx, 0.22)).connect(flt);
      flt.connect(amp);
      osc(ctx, 'sine', f, t, end).connect(gainNode(ctx, 0.6)).connect(amp);
      const pg = ctx.createGain();
      pg.connect(out);
      hitEnv(pg.gain, t, vel * 0.1, 0.03);
      noise(ctx, t, t + 0.04).connect(filter(ctx, 'lowpass', 1200)).connect(pg);
    },

    /* ---------- ベース ---------- */
    // 跳ねるベース（フューチャーハウス）：フィルターの開閉＋同じ高さのサイン波
    fhbass(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const flt = filter(ctx, 'lowpass', 2600, 7);
      flt.frequency.setValueAtTime(inst.cutHi || 2600, t);
      flt.frequency.setTargetAtTime(inst.cutLo || 260, t, 0.045);
      const end = adsr(amp.gain, t, dur, 0.003, 0.18, 0.55, 0.05, vel * 0.42);
      osc(ctx, 'sawtooth', f, t, end).connect(flt);
      osc(ctx, 'square', f * 2, t, end, 4).connect(gainNode(ctx, 0.3)).connect(flt);
      flt.connect(amp);
      const sub = gainNode(ctx, 0.9);
      osc(ctx, 'sine', f, t, end).connect(sub).connect(amp);
    },
    // リースベース：のこぎり波2本をずらしてうねりを出す
    reese(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const flt = filter(ctx, 'lowpass', inst.cutoff || 650, 2.5);
      const end = adsr(amp.gain, t, dur, 0.01, 0.2, 0.9, 0.08, vel * 0.32);
      osc(ctx, 'sawtooth', f, t, end, -13).connect(flt);
      osc(ctx, 'sawtooth', f, t, end, 13).connect(flt);
      const lfo = osc(ctx, 'sine', inst.lfo || 0.35, t, end);
      const lg = gainNode(ctx, (inst.cutoff || 650) * 0.5);
      lfo.connect(lg).connect(flt.frequency);
      flt.connect(amp);
      osc(ctx, 'sine', f, t, end).connect(gainNode(ctx, 1.1)).connect(amp);
    },
    // のこぎり波のベース（シンセウェイヴ・トランスなど）：フィルターの開閉＋サイン波の低音
    sawbass(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const cut = inst.cutoff || 900;
      const flt = filter(ctx, 'lowpass', cut, inst.q || 4);
      flt.frequency.setValueAtTime(cut * 3, t);
      flt.frequency.setTargetAtTime(cut, t, 0.05);
      const end = adsr(amp.gain, t, dur, 0.003, 0.15, 0.7, 0.05, vel * 0.36);
      osc(ctx, 'sawtooth', f, t, end).connect(flt);
      flt.connect(amp);
      osc(ctx, 'sine', f, t, end).connect(gainNode(ctx, 0.8)).connect(amp);
    },
    // ワブルベース（ダブステップ）：フィルターを曲の拍に合わせて揺らす＋歪み
    wobble(ctx, out, t, dur, midi, vel, inst, ev, song) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.005, 0.1, 0.9, 0.05, vel * 0.3);
      const flt = filter(ctx, 'lowpass', inst.cutoff || 300, 10);
      const rate = ((song && song.bpm) || 140) / 60 * (inst.wob || 1); // 1拍に何回揺れるか
      const lfo = osc(ctx, 'triangle', rate, t, end);
      lfo.connect(gainNode(ctx, inst.depth || 1400)).connect(flt.frequency);
      const sh = ctx.createWaveShaper();
      sh.curve = drive(ctx, 3);
      osc(ctx, 'sawtooth', f, t, end).connect(flt);
      osc(ctx, 'square', f, t, end, -10).connect(gainNode(ctx, 0.6)).connect(flt);
      flt.connect(sh).connect(gainNode(ctx, 0.5)).connect(amp);
      osc(ctx, 'sine', f, t, end).connect(gainNode(ctx, 0.9)).connect(amp);
    },
    // 808ベース（トラップ）：音程が少し上から落ちる長いサイン波＋軽い歪み
    b808(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.004, 0.4, 0.8, 0.25, vel * 0.7);
      const o = osc(ctx, 'sine', f * 1.5, t, end);
      o.frequency.setValueAtTime(f * 1.5, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.05);
      const sh = ctx.createWaveShaper();
      sh.curve = drive(ctx, 1.6);
      o.connect(sh).connect(amp);
    },
    // アシッド（サイトランスなど）：のこぎり波＋強い共鳴のフィルターが一音ごとに閉じる
    acid(ctx, out, t, dur, midi, vel, inst) {
      const f = hz(midi);
      const amp = ctx.createGain();
      amp.connect(out);
      const flt = filter(ctx, 'lowpass', inst.cutHi || 2800, inst.q || 14);
      flt.frequency.setValueAtTime((inst.cutHi || 2800) * (vel > 0.9 ? 1.6 : 1), t);
      flt.frequency.setTargetAtTime(inst.cutLo || 350, t, inst.fdecay || 0.09);
      const end = adsr(amp.gain, t, dur, 0.003, 0.12, 0.6, 0.04, vel * 0.3);
      const sh = ctx.createWaveShaper();
      sh.curve = drive(ctx, 2);
      osc(ctx, 'sawtooth', f, t, end).connect(flt);
      flt.connect(sh).connect(amp);
    },
    sub(ctx, out, t, dur, midi, vel) {
      const amp = ctx.createGain();
      amp.connect(out);
      const end = adsr(amp.gain, t, dur, 0.005, 0.1, 1, 0.06, vel * 0.6);
      osc(ctx, 'sine', hz(midi), t, end).connect(amp);
    },

    /* ---------- ドラム ---------- */
    // キック：サイン波の音程を150Hz→50Hzへ0.1秒で下げる
    kick(ctx, out, t, dur, midi, vel, inst) {
      const tune = inst.tune || 1;
      const amp = ctx.createGain();
      amp.connect(out);
      const end = hitEnv(amp.gain, t, vel, inst.decay || 0.38);
      const o = osc(ctx, 'sine', 150 * tune, t, end);
      o.frequency.setValueAtTime(150 * tune, t);
      o.frequency.exponentialRampToValueAtTime(50 * tune, t + 0.1);
      o.connect(amp);
      const ca = ctx.createGain();
      ca.connect(out);
      hitEnv(ca.gain, t, vel * 0.25, 0.012);
      noise(ctx, t, t + 0.03).connect(filter(ctx, 'highpass', 2500)).connect(ca);
    },
    // ハードスタイルの歪んだキック
    hardkick(ctx, out, t, dur, midi, vel, inst) {
      const amp = ctx.createGain();
      amp.connect(out);
      const end = hitEnv(amp.gain, t, vel * 0.75, inst.decay || 0.5);
      const o = osc(ctx, 'sine', 210, t, end);
      o.frequency.setValueAtTime(210, t);
      o.frequency.exponentialRampToValueAtTime(52, t + 0.12);
      const sh = ctx.createWaveShaper();
      sh.curve = drive(ctx, 6);
      o.connect(sh).connect(filter(ctx, 'lowpass', 3500, 0.7)).connect(amp);
      const ca = ctx.createGain();
      ca.connect(out);
      hitEnv(ca.gain, t, vel * 0.35, 0.015);
      noise(ctx, t, t + 0.03).connect(filter(ctx, 'highpass', 2000)).connect(ca);
    },
    chipKick(ctx, out, t, dur, midi, vel) {
      const amp = ctx.createGain();
      amp.connect(out);
      const end = hitEnv(amp.gain, t, vel * 0.9, 0.16);
      const o = osc(ctx, 'triangle', 190, t, end);
      o.frequency.setValueAtTime(190, t);
      o.frequency.exponentialRampToValueAtTime(42, t + 0.07);
      o.connect(amp);
    },
    // スネア：ノイズ＋短い音程付きの音
    snare(ctx, out, t, dur, midi, vel, inst, ev) {
      const pf = Math.pow(2, ((ev && ev.pitch) || 0) / 12);
      const n = ctx.createGain();
      n.connect(out);
      const end = hitEnv(n.gain, t, vel * 0.75, inst.decay || 0.17);
      noise(ctx, t, end).connect(filter(ctx, 'bandpass', 1900 * pf, 0.8)).connect(n);
      const tg = ctx.createGain();
      tg.connect(out);
      hitEnv(tg.gain, t, vel * 0.55, 0.09);
      const o = osc(ctx, 'triangle', 190 * pf, t, t + 0.12);
      o.frequency.setValueAtTime(190 * pf, t);
      o.frequency.exponentialRampToValueAtTime(150 * pf, t + 0.08);
      o.connect(tg);
    },
    chipSnare(ctx, out, t, dur, midi, vel, inst, ev) {
      const pf = Math.pow(2, ((ev && ev.pitch) || 0) / 12);
      const n = ctx.createGain();
      n.connect(out);
      const end = hitEnv(n.gain, t, vel * 0.6, 0.11);
      noise(ctx, t, end).connect(filter(ctx, 'lowpass', 7000, 0.5)).connect(n);
      const tg = ctx.createGain();
      tg.connect(out);
      hitEnv(tg.gain, t, vel * 0.25, 0.045);
      osc(ctx, 'square', 230 * pf, t, t + 0.06).connect(tg);
    },
    clap(ctx, out, t, dur, midi, vel) {
      const g = ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(0.0005, t);
      for (let k = 0; k < 3; k++) {
        g.gain.setValueAtTime(vel * 2, t + k * 0.011);
        g.gain.exponentialRampToValueAtTime(vel * 0.25, t + k * 0.011 + 0.009);
      }
      g.gain.setValueAtTime(vel * 1.75, t + 0.033);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.25);
      noise(ctx, t, t + 0.27).connect(filter(ctx, 'bandpass', 1150, 1.3)).connect(g);
    },
    // ハイハット：高音域だけ通したノイズ
    hat(ctx, out, t, dur, midi, vel, inst) {
      const g = ctx.createGain();
      g.connect(out);
      const end = hitEnv(g.gain, t, vel * 0.9, inst.decay || 0.05);
      noise(ctx, t, end).connect(filter(ctx, 'highpass', inst.hp || 7500, 0.7)).connect(g);
    },
    chipHat(ctx, out, t, dur, midi, vel, inst) {
      const g = ctx.createGain();
      g.connect(out);
      const end = hitEnv(g.gain, t, vel * 0.7, inst.decay || 0.03);
      noise(ctx, t, end).connect(filter(ctx, 'highpass', 9500)).connect(g);
    },
    crash(ctx, out, t, dur, midi, vel) {
      const g = ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(vel * 0.5, t);
      g.gain.setTargetAtTime(0.0005, t + 0.02, 0.5);
      const end = t + 2.6;
      noise(ctx, t, end).connect(filter(ctx, 'highpass', 3800, 0.5)).connect(g);
      const g2 = ctx.createGain();
      g2.connect(out);
      hitEnv(g2.gain, t, vel * 0.25, 0.9);
      noise(ctx, t, t + 1).connect(filter(ctx, 'bandpass', 8200, 2)).connect(g2);
    },
    shaker(ctx, out, t, dur, midi, vel) {
      const g = ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(vel * 1.0, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.07);
      noise(ctx, t, t + 0.09).connect(filter(ctx, 'bandpass', 6500, 1.5)).connect(g);
    },
    tom(ctx, out, t, dur, midi, vel, inst) {
      const g = ctx.createGain();
      g.connect(out);
      const end = hitEnv(g.gain, t, vel * 0.7, 0.22);
      const f = inst.freq || 220;
      const o = osc(ctx, 'sine', f, t, end);
      o.frequency.setValueAtTime(f, t);
      o.frequency.exponentialRampToValueAtTime(f * 0.6, t + 0.15);
      o.connect(g);
    },

    // ライドシンバル（ジャズの刻み）：金属的な矩形波の重なり＋カップの「チーン」
    ride(ctx, out, t, dur, midi, vel, inst) {
      const g = ctx.createGain();
      g.connect(out);
      const end = hitEnv(g.gain, t, vel * 0.12, inst.decay || 0.9);
      const bp = filter(ctx, 'bandpass', inst.tone || 5200, 0.8);
      [263, 400, 421, 474, 587, 845].forEach((fr) => osc(ctx, 'square', fr * 2.1, t, end).connect(bp));
      bp.connect(filter(ctx, 'highpass', 3000, 0.7)).connect(g);
      const b = ctx.createGain();
      b.connect(out);
      hitEnv(b.gain, t, vel * 0.05, 0.5);
      osc(ctx, 'sine', inst.bell || 2950, t, t + 0.52).connect(b);
    },
    // ブラシ（スネアをこする音）
    brush(ctx, out, t, dur, midi, vel, inst) {
      const g = ctx.createGain();
      g.connect(out);
      const len = inst.decay || 0.18;
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(vel * 0.6, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0005, t + len);
      noise(ctx, t, t + len + 0.02).connect(filter(ctx, 'bandpass', inst.tone || 3200, 0.6)).connect(g);
    },
    // リムショット（スネアのふち）
    rim(ctx, out, t, dur, midi, vel) {
      const g = ctx.createGain();
      g.connect(out);
      const end = hitEnv(g.gain, t, vel * 0.5, 0.05);
      osc(ctx, 'triangle', 1750, t, end).connect(filter(ctx, 'highpass', 800)).connect(g);
      const n = ctx.createGain();
      n.connect(out);
      hitEnv(n.gain, t, vel * 0.4, 0.02);
      noise(ctx, t, t + 0.03).connect(filter(ctx, 'bandpass', 4000, 2)).connect(n);
    },
    // フィンガースナップ（指パッチン）
    snap(ctx, out, t, dur, midi, vel) {
      const g = ctx.createGain();
      g.connect(out);
      g.gain.setValueAtTime(0.0005, t);
      g.gain.linearRampToValueAtTime(vel * 1.4, t + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 0.09);
      noise(ctx, t, t + 0.1).connect(filter(ctx, 'bandpass', 2600, 2.2)).connect(g);
    },
    // コンガ（ラテンの太鼓）：inst.freq で高さ
    conga(ctx, out, t, dur, midi, vel, inst) {
      const g = ctx.createGain();
      g.connect(out);
      const f = inst.freq || 330;
      const end = hitEnv(g.gain, t, vel * 0.6, inst.decay || 0.18);
      const o = osc(ctx, 'sine', f * 1.3, t, end);
      o.frequency.setValueAtTime(f * 1.3, t);
      o.frequency.exponentialRampToValueAtTime(f, t + 0.02);
      o.connect(g);
      const sl = ctx.createGain();
      sl.connect(out);
      hitEnv(sl.gain, t, vel * 0.15, 0.015);
      noise(ctx, t, t + 0.02).connect(filter(ctx, 'bandpass', 2000, 1)).connect(sl);
    },

    /* ---------- 効果音（ビルドの上昇音・ドロップの衝撃音） ---------- */
    fx(ctx, out, t, dur, midi, vel, inst, ev, song) {
      const chip = song && song.fxStyle === 'chip';
      if (ev.kind === 'riser') {
        // ノイズの上昇音：帯域を低→高へ、音量も上げる
        const g = ctx.createGain();
        g.connect(out);
        g.gain.setValueAtTime(0.0005, t);
        g.gain.linearRampToValueAtTime(vel * 0.4, t + dur);
        g.gain.linearRampToValueAtTime(0.0005, t + dur + 0.04);
        const bp = filter(ctx, 'bandpass', 300, chip ? 1 : 2.5);
        bp.frequency.setValueAtTime(300, t);
        bp.frequency.exponentialRampToValueAtTime(chip ? 6000 : 9000, t + dur);
        noise(ctx, t, t + dur + 0.05).connect(bp).connect(g);
        // 音程の上昇（2オクターブ）
        const sg = ctx.createGain();
        sg.connect(out);
        sg.gain.setValueAtTime(0.0005, t);
        sg.gain.linearRampToValueAtTime(vel * (chip ? 0.07 : 0.05), t + dur);
        sg.gain.linearRampToValueAtTime(0.0005, t + dur + 0.04);
        const o = osc(ctx, chip ? pulseWave(ctx, 0.125) : 'sawtooth', hz(48), t, t + dur + 0.05);
        o.frequency.setValueAtTime(hz(48), t);
        o.frequency.exponentialRampToValueAtTime(hz(72), t + dur);
        o.connect(filter(ctx, 'lowpass', 3500)).connect(sg);
      } else if (ev.kind === 'impact') {
        const g = ctx.createGain();
        g.connect(out);
        hitEnv(g.gain, t, vel * 0.8, 1.3);
        const o = osc(ctx, chip ? 'triangle' : 'sine', 78, t, t + 1.4);
        o.frequency.setValueAtTime(78, t);
        o.frequency.exponentialRampToValueAtTime(30, t + 0.9);
        o.connect(g);
        const ng = ctx.createGain();
        ng.connect(out);
        hitEnv(ng.gain, t, vel * 0.3, 1.1);
        const lp = filter(ctx, 'lowpass', 8000, 0.5);
        lp.frequency.setValueAtTime(8000, t);
        lp.frequency.exponentialRampToValueAtTime(160, t + 1);
        noise(ctx, t, t + 1.2).connect(lp).connect(ng);
      }
    },
  };

  /* =========================================================
   * ミックス（10-4）
   * パート：音量 → サイドチェイン → ミュート → 左右の位置 → 系統（ドラム／ドラム以外）
   *          └→ 残響（リバーブ）・ディレイへの送り
   * 系統：（ドラム以外はローパスフィルター）→ コンプレッサー → リミッター
   * ========================================================= */
  function makeStemChain(ctx) {
    const input = ctx.createGain();
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -18;
    comp.knee.value = 8;
    comp.ratio.value = 3;
    comp.attack.value = 0.006;
    comp.release.value = 0.18;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -4;
    lim.knee.value = 0;
    lim.ratio.value = 20;
    lim.attack.value = 0.001;
    lim.release.value = 0.08;
    const out = ctx.createGain();
    out.gain.value = 0.62;
    input.connect(comp).connect(lim).connect(out);
    return { input, out };
  }

  function buildGraph(ctx, c, outs) {
    const g = { ctx, c, parts: {}, stems: {}, musicFilter: null };
    for (const stem of ['drum', 'music']) {
      if (!outs[stem]) continue;
      const ch = makeStemChain(ctx);
      ch.out.connect(outs[stem]);
      let entry = ch.input;
      if (stem === 'music') {
        const f = filter(ctx, 'lowpass', 20000, 0.7);
        f.connect(ch.input);
        entry = f;
        g.musicFilter = f;
      }
      const rev = ctx.createConvolver();
      rev.buffer = impulse(ctx);
      rev.channelCount = 1; // 入力をモノラルにして計算量を半分に（残響自体は左右で別）
      rev.channelCountMode = 'explicit';
      rev.connect(gainNode(ctx, 0.9)).connect(entry);
      const st = { entry, rev, delay: null };
      if (stem === 'music') {
        const d = ctx.createDelay(2);
        d.delayTime.value = 0.75 * c.spb; // 付点8分
        const fb = gainNode(ctx, 0.33);
        const lp = filter(ctx, 'lowpass', 3200, 0.5);
        d.connect(lp);
        lp.connect(fb).connect(d);
        lp.connect(gainNode(ctx, 0.8)).connect(entry);
        st.delay = d;
      }
      g.stems[stem] = st;
    }
    for (const p of Object.values(c.parts)) {
      const st = g.stems[p.stem];
      if (!st) continue;
      const inst = p.inst;
      const input = gainNode(ctx, inst.gain === undefined ? 0.5 : inst.gain);
      const duck = gainNode(ctx, 1);
      const mute = gainNode(ctx, 1);
      const pan = ctx.createStereoPanner();
      pan.pan.value = inst.pan || 0;
      input.connect(duck).connect(mute).connect(pan).connect(st.entry);
      if (inst.rev) pan.connect(gainNode(ctx, inst.rev)).connect(st.rev);
      if (inst.delay && st.delay) pan.connect(gainNode(ctx, inst.delay)).connect(st.delay);
      g.parts[p.name] = { input, duck, mute, inst };
    }
    return g;
  }

  /** フィルターの開閉とサイドチェインを予約する（fromBeat 以降） */
  function scheduleControl(g, c, timeOffset, fromBeat) {
    const T = (b) => Math.max(0, timeOffset + b * c.spb); // 計算誤差で負にならないように
    if (g.musicFilter) {
      const fp = g.musicFilter.frequency;
      let cur = 20000;
      for (const a of c.automation) {
        if (a.beat + a.dur <= fromBeat) cur = a.to;
        else if (a.beat < fromBeat) cur = a.from * Math.pow(a.to / a.from, (fromBeat - a.beat) / a.dur);
      }
      fp.setValueAtTime(cur, T(fromBeat));
      for (const a of c.automation) {
        const end = a.beat + a.dur;
        if (end <= fromBeat && a.dur > 0) continue;
        if (a.beat >= fromBeat) {
          fp.setValueAtTime(a.from, T(a.beat));
          if (a.dur > 0) fp.exponentialRampToValueAtTime(a.to, T(end));
        } else if (a.dur > 0) {
          fp.exponentialRampToValueAtTime(a.to, T(end));
        }
      }
    }
    // サイドチェイン：キックの瞬間に、指定したパートの音量を下げる
    const ducked = Object.values(g.parts).filter((p) => p.inst.duck);
    if (ducked.length) {
      const tau = c.spb * 0.13;
      for (const e of c.events) {
        if (e.part !== 'kick' || e.beat < fromBeat) continue;
        const t = T(e.beat);
        for (const p of ducked) {
          p.duck.gain.setValueAtTime(1 - p.inst.duck, t);
          p.duck.gain.setTargetAtTime(1, t + 0.015, tau);
        }
      }
    }
  }

  /** 出来事を時刻順に少しずつ予約する */
  function makeScheduler(g, c, timeOffset, fromBeat, minTime, cache) {
    const ev = c.events;
    let i = 0;
    while (i < ev.length && ev[i].beat < fromBeat - 1e-6) i++;
    return {
      until(tEnd) {
        while (i < ev.length) {
          const e = ev[i];
          const t = timeOffset + e.beat * c.spb;
          if (t >= tEnd) break;
          i++;
          const p = g.parts[e.part];
          if (!p) continue;
          if (minTime !== undefined && t < minTime()) continue; // 間に合わなかった音は鳴らさない
          const buf = cache && cache.get(e.key);
          if (buf) {
            // 使い回し：合成済みの音を鳴らし、強さだけ掛ける
            const s = g.ctx.createBufferSource();
            s.buffer = buf;
            const v = gainNode(g.ctx, e.vel);
            s.connect(v).connect(p.input);
            s.start(t);
            continue;
          }
          const fn = PRESETS[p.inst.preset];
          if (!fn) throw new Error('音色がありません: ' + p.inst.preset);
          fn(g.ctx, p.input, t, e.dur * c.spb, e.midi, e.vel, p.inst, e, c.song);
        }
        return i >= ev.length;
      },
    };
  }

  /* =========================================================
   * 書き出し（OfflineAudioContext）：ドラムとそれ以外を別々に
   * ========================================================= */
  const SAMPLE_RATE = 44100;
  const TAIL = 3; // 余韻の秒数
  const renderCache = new Map();
  let liveCache = null; // サウンドテストのリアルタイム再生用（直近の1曲）
  let chainLatency = null;

  /** コンプレッサーの先読みによる遅れを測る（ブラウザごとに違うため） */
  async function measureLatency() {
    if (chainLatency !== null) return chainLatency;
    const sr = SAMPLE_RATE;
    const ctx = new OfflineAudioContext(1, Math.floor(sr * 0.2), sr);
    const ch = makeStemChain(ctx);
    ch.out.connect(ctx.destination);
    const b = ctx.createBuffer(1, 1, sr);
    b.getChannelData(0)[0] = 0.5;
    const s = ctx.createBufferSource();
    s.buffer = b;
    s.connect(ch.input);
    s.start(0.05);
    const buf = await ctx.startRendering();
    const d = buf.getChannelData(0);
    let idx = 0;
    let max = 0;
    for (let i = 0; i < d.length; i++) {
      if (Math.abs(d[i]) > max) {
        max = Math.abs(d[i]);
        idx = i;
      }
    }
    chainLatency = Math.max(0, idx / sr - 0.05);
    return chainLatency;
  }

  /* ---------------------------------------------------------
   * 音の使い回し：曲の中の「同じ音（パート・高さ・長さが同じ）」は1回だけ合成する。
   * 合成は強さ1で行い、鳴らす時に強さを掛ける（音色はすべて強さに比例するため同じ音になる）。
   * --------------------------------------------------------- */
  const NOTE_TAIL = {
    supersaw: 0.8, pluck: 0.8, pad: 2.4, bell: 3.6, pulse: 0.2, tri: 0.15, vox: 0.6, fhbass: 0.35, reese: 0.4, sub: 0.3,
    sawbass: 0.3, wobble: 0.3, b808: 1.0, hardkick: 0.6, acid: 0.2,
    kick: 0.45, chipKick: 0.2, snare: 0.3, chipSnare: 0.2, clap: 0.3, hat: 0.4, chipHat: 0.1, crash: 2.8, shaker: 0.15, tom: 0.3,
    epiano: 0.5, organ: 0.2, sax: 0.4, horn: 0.4, gtr: 0.3, wbass: 0.2, ride: 1.2, brush: 0.2, rim: 0.1, snap: 0.15, conga: 0.25,
  };
  const STEREO_PRESETS = { supersaw: 1, pad: 1 };
  const NOISY_PRESETS = { hat: 1, chipHat: 1, shaker: 1, snare: 1, chipSnare: 1, clap: 1, brush: 1, snap: 1, rim: 1 };

  function assignNoteKeys(c) {
    const jobs = new Map();
    c.events.forEach((e, i) => {
      const p = c.parts[e.part];
      const pr = p.inst.preset;
      const variant = NOISY_PRESETS[pr] ? i % 3 : 0;
      const pitch = Math.round(e.pitch || 0);
      e.key = [e.part, e.midi === undefined ? '' : e.midi, Math.round(e.dur * c.spb * 1000), e.kind || '', pitch, variant].join('|');
      if (!jobs.has(e.key)) jobs.set(e.key, { p, e, variant, pitch });
    });
    return jobs;
  }

  async function buildNoteCache(c, sr, onProgress) {
    const jobs = [...assignNoteKeys(c).entries()];
    const cache = new Map();
    let done = 0;
    let next = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const [key, j] = jobs[next++];
        const pr = j.p.inst.preset;
        const dur = j.e.dur * c.spb;
        const tail = j.e.kind === 'impact' ? 1.6 : j.e.kind === 'riser' ? 0.15 : NOTE_TAIL[pr] || 0.6;
        const ctx = new OfflineAudioContext(STEREO_PRESETS[pr] ? 2 : 1, Math.ceil((dur + tail) * sr), sr);
        noiseSeed = j.variant * 0.37;
        const ev = Object.assign({}, j.e, { vel: 1, pitch: j.pitch });
        PRESETS[pr](ctx, ctx.destination, 0, dur, j.e.midi, 1, j.p.inst, ev, c.song);
        noiseSeed = 0;
        cache.set(key, await ctx.startRendering());
        done++;
        if (onProgress && done % 8 === 0) onProgress(done / jobs.length);
      }
    };
    await Promise.all([worker(), worker(), worker(), worker()]);
    return cache;
  }

  /* ---------------------------------------------------------
   * 区間に分けて同時に書き出す（端末のCPUを複数使う）
   * 各区間は「3秒前」から書き出し、その3秒は捨てる。
   * これで残響・ディレイ・コンプレッサーの状態がつながり、一続きで書いたのと同じ音になる。
   * --------------------------------------------------------- */
  const PREROLL = 3;

  function renderSegment(c, stem, cache, segStart, segEnd) {
    const sr = SAMPLE_RATE;
    const s0 = Math.max(0, segStart - PREROLL);
    const len = Math.ceil((segEnd - s0) * sr);
    const ctx = new OfflineAudioContext(2, len, sr);
    const g = buildGraph(ctx, c, { drum: stem === 'drum' ? ctx.destination : null, music: stem === 'music' ? ctx.destination : null });
    scheduleControl(g, c, -s0, s0 / c.spb);
    const lenSec = segEnd - s0;
    for (const e of c.events) {
      const p = g.parts[e.part];
      if (!p) continue;
      const t = e.beat * c.spb - s0;
      if (t >= lenSec) break;
      const buf = cache.get(e.key);
      if (t + buf.duration <= 0) continue;
      const src = ctx.createBufferSource();
      src.buffer = buf;
      src.connect(gainNode(ctx, e.vel)).connect(p.input);
      // 区間の前から鳴り続けている音は、途中から鳴らす
      src.start(Math.max(0, t), Math.max(0, -t));
    }
    return ctx.startRendering().then((b) => ({ buf: b, skip: Math.round((segStart - s0) * sr), at: Math.round(segStart * sr) }));
  }

  async function renderStems(c, cache, onProgress) {
    const total = c.duration + TAIL;
    const sr = SAMPLE_RATE;
    const n = Math.max(2, Math.min(8, Math.round(total / 20)));
    const jobs = [];
    for (const stem of ['drum', 'music']) for (let k = 0; k < n; k++) jobs.push({ stem, a: (total * k) / n, b: (total * (k + 1)) / n });
    const out = {
      drum: new AudioBuffer({ length: Math.ceil(total * sr), numberOfChannels: 2, sampleRate: sr }),
      music: new AudioBuffer({ length: Math.ceil(total * sr), numberOfChannels: 2, sampleRate: sr }),
    };
    const lanes = Math.max(2, Math.min(6, navigator.hardwareConcurrency || 4));
    let next = 0;
    let done = 0;
    const worker = async () => {
      while (next < jobs.length) {
        const j = jobs[next++];
        const r = await renderSegment(c, j.stem, cache, j.a, j.b);
        const dst = out[j.stem];
        const keep = Math.min(r.buf.length - r.skip, dst.length - r.at);
        for (let ch = 0; ch < 2; ch++) dst.copyToChannel(r.buf.getChannelData(ch).subarray(r.skip, r.skip + keep), ch, r.at);
        done++;
        onProgress && onProgress(done / jobs.length);
      }
    };
    const ws = [];
    for (let i = 0; i < lanes; i++) ws.push(worker());
    await Promise.all(ws);
    return out;
  }

  function analyse(drum, music) {
    let pd = 0;
    let pm = 0;
    let ps = 0;
    let sq = 0;
    let n = 0;
    for (let ch = 0; ch < 2; ch++) {
      const a = drum.getChannelData(ch);
      const b = music.getChannelData(ch);
      for (let i = 0; i < a.length; i++) {
        const x = a[i];
        const y = b[i];
        const s = x + y;
        const ax = x < 0 ? -x : x;
        const ay = y < 0 ? -y : y;
        const as = s < 0 ? -s : s;
        if (ax > pd) pd = ax;
        if (ay > pm) pm = ay;
        if (as > ps) ps = as;
        sq += s * s;
        n++;
      }
    }
    return { peakDrum: pd, peakMusic: pm, peakSum: ps, rms: Math.sqrt(sq / n) };
  }

  Object.assign(AudioEngine, {
    PRESETS,
    // 開発用（音量バランスの測定などに使う）
    _internal: { buildGraph, scheduleControl, makeScheduler, makeStemChain, buildNoteCache, SAMPLE_RATE },

    /**
     * 曲を書き出す。戻り値：{ drum, music（AudioBuffer）, compiled, latency, 音量の測定値 }
     * onProgress(0〜1, '説明')
     */
    async renderSong(song, onProgress) {
      if (renderCache.has(song.id)) return renderCache.get(song.id);
      const c = M().compile(song);
      const latency = await measureLatency();
      const t0 = performance.now();
      const p = (base, w, label) => (x) => onProgress && onProgress(base + x * w, label);
      p(0, 0.15, '音色を準備中')(0);
      const cache = await buildNoteCache(c, SAMPLE_RATE, p(0, 0.15, '音色を準備中'));
      p(0.15, 0.85, 'ドラムとそれ以外を書き出し中')(0);
      const { drum, music } = await renderStems(c, cache, p(0.15, 0.85, 'ドラムとそれ以外を書き出し中'));
      const r = Object.assign({ song, compiled: c, drum, music, latency, renderMs: performance.now() - t0, noteCount: cache.size }, analyse(drum, music));
      onProgress && onProgress(1, '完了');
      renderCache.clear(); // メモリ節約：保持するのは直近の1曲だけ
      renderCache.set(song.id, r);
      return r;
    },

    clearRenderCache() {
      renderCache.clear();
    },

    /**
     * 書き出した曲を再生する。when＝音声時刻（この時刻に offset 秒の位置が聞こえる）
     * ドラムは「ドラム」の音量、それ以外は「BGM」の音量で鳴る（12章）
     */
    playRendered(r, when, offset) {
      const ctx = this.ctx;
      offset = offset || 0;
      const srcs = [];
      for (const [stem, bus] of [
        ['drum', 'drum'],
        ['music', 'bgm'],
      ]) {
        const s = ctx.createBufferSource();
        s.buffer = r[stem];
        s.connect(this.buses[bus]);
        s.start(when, Math.max(0, offset + r.latency));
        srcs.push(s);
      }
      const self = this;
      const h = {
        when,
        offset,
        duration: r.compiled.duration,
        stop() {
          srcs.forEach((s) => {
            try {
              s.stop();
            } catch (e) {
              /* 停止済み */
            }
          });
        },
        /** 曲の中の現在位置（秒） */
        position() {
          return self.now() - when + offset;
        },
      };
      return h;
    },

    /**
     * リアルタイム再生（サウンドテスト用）。パートごとに音を消せる。
     * opts: { startBeat, muted: Set }
     */
    async startLive(song, opts, onProgress) {
      opts = opts || {};
      const ctx = this.ctx;
      const c = M().compile(song);
      // 音色の準備（同じ曲なら使い回す）
      if (!liveCache || liveCache.id !== song.id) liveCache = { id: song.id, cache: await buildNoteCache(c, ctx.sampleRate, onProgress) };
      else assignNoteKeys(c);
      const cache = liveCache.cache;
      const outD = ctx.createGain();
      const outM = ctx.createGain();
      outD.connect(this.buses.drum);
      outM.connect(this.buses.bgm);
      const g = buildGraph(ctx, c, { drum: outD, music: outM });
      if (opts.muted) for (const p of opts.muted) if (g.parts[p]) g.parts[p].mute.gain.value = 0;
      const startBeat = opts.startBeat || 0;
      const t0 = ctx.currentTime + 0.15;
      const timeOffset = t0 - startBeat * c.spb;
      scheduleControl(g, c, timeOffset, startBeat);
      const sched = makeScheduler(g, c, timeOffset, startBeat, () => ctx.currentTime, cache);
      sched.until(ctx.currentTime + 0.5);
      const timer = setInterval(() => sched.until(ctx.currentTime + 0.5), 40);
      const self = this;
      return {
        compiled: c,
        setMute(part, muted) {
          const p = g.parts[part];
          if (p) p.mute.gain.setTargetAtTime(muted ? 0 : 1, ctx.currentTime, 0.01);
        },
        /** 曲の中の現在位置（拍） */
        beat() {
          return (self.now() - timeOffset) / c.spb;
        },
        stop() {
          clearInterval(timer);
          const t = ctx.currentTime;
          outD.gain.setTargetAtTime(0, t, 0.02);
          outM.gain.setTargetAtTime(0, t, 0.02);
          setTimeout(() => {
            outD.disconnect();
            outM.disconnect();
          }, 200);
        },
      };
    },
  });

  NLM.AudioEngine = AudioEngine;
})();
