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
      master.connect(ctx.destination);
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

  NLM.AudioEngine = AudioEngine;
})();
