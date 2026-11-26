/* =========================================================
 * net.js … 通信（spec.md 14章）
 * - PeerJS（js/vendor/peerjs.min.js）で端末どうしを直接つなぐ。仲介はPeerJSの無料サーバー。
 * - ホストを中心に全員がつながる形。ゲストどうしは直接つながず、ホストが中継する。
 * - 部屋番号（5文字）で合流する。ログイン不要。
 * - 時計合わせ：ゲストはホストに「いま何時？」を何度も聞き、往復が一番速かった答えでずれを決める。
 *
 * 送る内容はすべて JSON の小さなオブジェクト { t:'種類', ... }。
 * テスト用：URLに ?peer=localhost:9000 を付けると、その仲介サーバーを使う。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const PREFIX = 'neonlightmusics-v1-'; // 仲介サーバー上で他のアプリと名前がぶつからないように
  const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 見間違えやすい 0 O 1 I は使わない
  const now = () => performance.now();

  function peerOptions() {
    const q = new URLSearchParams(location.search).get('peer');
    const opts = { debug: 0 };
    if (q) {
      const [host, port] = q.split(':');
      Object.assign(opts, { host, port: Number(port) || 9000, path: '/', secure: false });
    }
    return opts;
  }
  function randomCode() {
    let s = '';
    for (let i = 0; i < 5; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    return s;
  }
  const ERR_JA = {
    'peer-unavailable': 'その部屋番号の部屋が見つかりません',
    network: '通信できません（インターネットの接続を確認してください）',
    'server-error': '仲介サーバーにつながりません',
    'socket-error': '仲介サーバーにつながりません',
    'socket-closed': '仲介サーバーとの接続が切れました',
    'browser-incompatible': 'このブラウザは対戦に対応していません',
    disconnected: '仲介サーバーとの接続が切れました',
  };

  const Net = {
    role: null, // 'host' | 'guest' | null
    code: null,
    myId: null, // 自分の接続ID（ホストは 'host'）
    peer: null,
    conns: new Map(), // ホスト：ゲストID → 接続
    hostConn: null, // ゲスト：ホストへの接続
    offset: 0, // ゲスト：ホストの時計 − 自分の時計（ミリ秒）
    bestRtt: Infinity,
    rtt: 0,
    handlers: new Set(),
    pingTimer: null,
    watchTimer: null,
    lastSeen: new Map(), // 相手ごとの最後に受け取った時刻（ホストはゲストごと、ゲストは 'host'）
    TIMEOUT: 8000, // これだけ連絡がない相手は切断扱い（ブラウザを閉じた・スリープした時など）
    closing: false,

    get active() {
      return !!this.role;
    },
    get isHost() {
      return this.role === 'host';
    },
    /** ホストの時計（ミリ秒）。ホスト自身は自分の時計 */
    hostNow() {
      return now() + (this.isHost ? 0 : this.offset);
    },
    /** ホストの時計の時刻 → 自分の performance.now() の時刻 */
    toLocal(hostMs) {
      return hostMs - (this.isHost ? 0 : this.offset);
    },

    /** 受け取り：fn(msg, fromId)。戻り値で登録を外せる */
    on(fn) {
      this.handlers.add(fn);
      return () => this.handlers.delete(fn);
    },
    emit(msg, from) {
      for (const fn of [...this.handlers]) {
        try {
          fn(msg, from);
        } catch (e) {
          console.error(e);
        }
      }
    },

    /** 部屋を作る（ホスト）。戻り値：部屋番号 */
    host() {
      this.close();
      if (!window.Peer) return Promise.reject(new Error('通信の部品を読み込めませんでした'));
      this.closing = false;
      return new Promise((resolve, reject) => {
        let tries = 0;
        const attempt = () => {
          const code = randomCode();
          const peer = new window.Peer(PREFIX + code, peerOptions());
          let opened = false;
          peer.on('open', () => {
            opened = true;
            this.peer = peer;
            this.role = 'host';
            this.code = code;
            this.myId = 'host';
            this._watch();
            resolve(code);
          });
          peer.on('connection', (conn) => this._accept(conn));
          peer.on('error', (err) => {
            if (!opened && err.type === 'unavailable-id' && tries++ < 5) {
              peer.destroy();
              attempt();
              return;
            }
            if (!opened) {
              peer.destroy();
              reject(new Error(ERR_JA[err.type] || '部屋を作れませんでした（' + err.type + '）'));
            } else if (err.type === 'network' || err.type === 'disconnected' || err.type === 'socket-closed') {
              // 仲介サーバーとの接続が切れても、つながっている相手との通信は続く。新しい参加だけ受け付けられない
              try {
                peer.reconnect();
              } catch (e) {}
            }
          });
          peer.on('disconnected', () => {
            if (!this.closing) {
              try {
                peer.reconnect();
              } catch (e) {}
            }
          });
        };
        attempt();
      });
    },

    _accept(conn) {
      conn.on('open', () => {
        this.conns.set(conn.peer, conn);
        this.lastSeen.set(conn.peer, now());
        this.emit({ t: '_join' }, conn.peer);
      });
      conn.on('data', (msg) => {
        if (!msg || typeof msg !== 'object') return;
        this.lastSeen.set(conn.peer, now());
        if (msg.t === 'ping') {
          conn.send({ t: 'pong', c: msg.c, h: now() });
          return;
        }
        this.emit(msg, conn.peer);
      });
      const gone = () => {
        if (!this.conns.has(conn.peer)) return;
        this.conns.delete(conn.peer);
        this.lastSeen.delete(conn.peer);
        this.emit({ t: '_leave' }, conn.peer);
        try {
          conn.close();
        } catch (e) {}
      };
      conn._gone = gone;
      conn.on('close', gone);
      conn.on('error', gone);
      // 応答がない相手は切断扱い（スマホがスリープした時など）
      conn.on('iceStateChanged', (s) => {
        if (s === 'failed' || s === 'closed') gone();
      });
    },

    /** 部屋に入る（ゲスト） */
    join(code) {
      this.close();
      if (!window.Peer) return Promise.reject(new Error('通信の部品を読み込めませんでした'));
      this.closing = false;
      code = String(code || '')
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '');
      return new Promise((resolve, reject) => {
        const peer = new window.Peer(undefined, peerOptions());
        let done = false;
        const fail = (msg) => {
          if (done) return;
          done = true;
          peer.destroy();
          reject(new Error(msg));
        };
        const timer = setTimeout(() => fail('部屋につながりませんでした（時間切れ）'), 15000);
        peer.on('open', (id) => {
          const conn = peer.connect(PREFIX + code, { reliable: true, serialization: 'json' });
          conn.on('open', () => {
            if (done) return;
            done = true;
            clearTimeout(timer);
            this.peer = peer;
            this.hostConn = conn;
            this.role = 'guest';
            this.code = code;
            this.myId = id;
            this.bestRtt = Infinity;
            this.lastSeen.set('host', now());
            this._startPing();
            this._watch();
            resolve(id);
          });
          conn.on('data', (msg) => {
            if (!msg || typeof msg !== 'object') return;
            this.lastSeen.set('host', now());
            if (msg.t === 'pong') {
              this._onPong(msg);
              return;
            }
            this.emit(msg, 'host');
          });
          const lost = () => {
            if (this.role !== 'guest' || this.closing || this._lostSent) return;
            this._lostSent = true;
            this.emit({ t: '_hostLost' }, 'host');
          };
          this._lost = lost;
          this._lostSent = false;
          conn.on('close', lost);
          conn.on('error', lost);
          conn.on('iceStateChanged', (s) => {
            if (s === 'failed' || s === 'closed') lost();
          });
        });
        peer.on('error', (err) => {
          if (!done) fail(ERR_JA[err.type] || '部屋につながりませんでした（' + err.type + '）');
        });
      });
    },

    /** 生存確認：ゲストは2秒ごとにホストへ問い合わせる。ホストは届いた時刻を見て、途絶えた相手を切断扱いにする */
    _watch() {
      clearInterval(this.watchTimer);
      this.watchTimer = setInterval(() => {
        const t = now();
        if (this.isHost) {
          for (const [id, c] of [...this.conns]) if (t - (this.lastSeen.get(id) || t) > this.TIMEOUT && c._gone) c._gone();
        } else if (this.role === 'guest' && t - (this.lastSeen.get('host') || t) > this.TIMEOUT && this._lost) this._lost();
      }, 1000);
    },
    _startPing() {
      clearInterval(this.pingTimer);
      let n = 0;
      const ping = () => {
        if (this.hostConn && this.hostConn.open) this.hostConn.send({ t: 'ping', c: now() });
        // 最初は細かく、その後は2秒ごと
        if (++n === 8) {
          clearInterval(this.pingTimer);
          this.pingTimer = setInterval(ping, 2000);
        }
      };
      this.pingTimer = setInterval(ping, 150);
      ping();
    },
    _onPong(m) {
      const t = now();
      const rtt = t - m.c;
      this.rtt = rtt;
      // 往復が速かった答えほど正確。古い値は少しずつ信用を下げる
      this.bestRtt = Math.min(this.bestRtt * 1.02 + 0.5, Infinity);
      if (rtt <= this.bestRtt) {
        this.bestRtt = rtt;
        this.offset = m.h + rtt / 2 - t;
      }
    },

    /** ゲスト → ホスト。ホストが呼んだ場合は自分あての受け取りとして扱う */
    send(msg) {
      if (this.isHost) {
        this.emit(msg, 'host');
        return;
      }
      if (this.hostConn && this.hostConn.open) this.hostConn.send(msg);
    },
    /** ホスト → 全員（except の相手を除く）。ホスト自身にも届ける（self:false で除く） */
    broadcast(msg, opts) {
      opts = opts || {};
      if (!this.isHost) return;
      for (const [id, c] of this.conns) if (id !== opts.except && c.open) c.send(msg);
      if (opts.self !== false) this.emit(msg, 'host');
    },
    /** ホスト → 特定の相手 */
    sendTo(id, msg) {
      if (id === 'host') {
        this.emit(msg, 'host');
        return;
      }
      const c = this.conns.get(id);
      if (c && c.open) c.send(msg);
    },
    kick(id) {
      const c = this.conns.get(id);
      if (c) c.close();
    },

    close() {
      this.closing = true;
      clearInterval(this.pingTimer);
      clearInterval(this.watchTimer);
      this.pingTimer = null;
      this.watchTimer = null;
      this.lastSeen.clear();
      this._lost = null;
      for (const c of this.conns.values()) {
        try {
          c.close();
        } catch (e) {}
      }
      this.conns.clear();
      if (this.hostConn) {
        try {
          this.hostConn.close();
        } catch (e) {}
      }
      this.hostConn = null;
      if (this.peer) {
        try {
          this.peer.destroy();
        } catch (e) {}
      }
      this.peer = null;
      this.role = null;
      this.code = null;
      this.myId = null;
      this.handlers.clear();
    },
  };

  NLM.Net = Net;
})();
