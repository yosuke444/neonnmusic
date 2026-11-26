/* =========================================================
 * room.js … フレンド対戦の部屋（spec.md 7章・14章）
 * 部屋の状態（参加者・キャラ・ホストの設定・投票・試合の中身）はホストが決めて全員に配る。
 * ゲストは「キャラを変えたい」「この曲に投票」などの希望をホストに送るだけ。
 *
 * 進み方（phase）：
 *   lobby（参加・キャラ選択・設定）→ songVote → songResult（同票はルーレット）
 *   → diffVote → diffResult → play（試合）→ result → lobby（演争）／ songVote（協奏）
 * 試合中のやりとり（状態・スキル・脱落・同時開始）は main.js の演奏画面が行う。
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});
  const Net = () => NLM.Net;

  const VOTE_MS = 20000; // 投票の制限時間（7-1）
  const RESULT_MS = 3600; // 投票結果（ルーレット）を見せる時間
  const MAX_PLAYERS = 32;

  const Room = {
    state: null,
    listeners: new Set(),
    timers: [],
    ballots: {}, // ホスト：投票 { 接続ID: [選んだもの…] }
    error: null,

    get me() {
      return Net().myId;
    },
    get isHost() {
      return Net().isHost;
    },
    get active() {
      return !!this.state && Net().active;
    },
    member(id) {
      return this.state && this.state.members.find((m) => m.id === id);
    },
    onChange(fn) {
      this.listeners.add(fn);
      return () => this.listeners.delete(fn);
    },
    notify(why) {
      for (const fn of [...this.listeners]) fn(this.state, why);
    },

    /* ---------------- 部屋を作る・入る・抜ける ---------------- */
    async create(mode, charId, name) {
      this.reset();
      const code = await Net().host();
      this.state = {
        code,
        mode,
        settings: { max: 8, cpu: 0, songs: 3, free: false, strength: 'normal' },
        members: [{ id: 'host', num: 1, charId, name: cleanName(name, 1) }],
        phase: 'lobby',
        vote: null,
        match: null,
        seq: 0,
      };
      this._listen();
      this.notify('create');
      return code;
    },
    async join(code, charId, name) {
      this.reset();
      await Net().join(code);
      this._listen();
      Net().send({ t: 'hello', charId, name });
      // 部屋の状態が届くまで待つ
      await new Promise((resolve, reject) => {
        const off = this.onChange((s, why) => {
          if (why === 'room') {
            off();
            resolve();
          } else if (why === 'reject') {
            off();
            reject(new Error(this.error));
          }
        });
        setTimeout(() => {
          off();
          if (!this.state) reject(new Error('部屋の情報が届きませんでした'));
        }, 10000);
      });
    },
    leave() {
      if (Net().isHost && this.state) Net().broadcast({ t: 'bye' }, { self: false });
      setTimeout(() => Net().close(), 60);
      this.reset();
    },
    reset() {
      this.timers.forEach(clearTimeout);
      this.timers = [];
      this.state = null;
      this.ballots = {};
      this.error = null;
    },

    /* ---------------- 希望を出す（ゲストもホストも同じ口） ---------------- */
    setChar(charId) {
      Net().send({ t: 'char', charId });
    },
    vote(picks) {
      Net().send({ t: 'vote', kind: this.state.vote && this.state.vote.kind, picks });
    },
    // ホストだけ
    setSettings(patch) {
      if (!this.isHost) return;
      Object.assign(this.state.settings, patch);
      this._clampSettings();
      this._broadcast();
    },
    startVote() {
      if (!this.isHost) return;
      this._songVote();
    },
    backToLobby() {
      if (!this.isHost) return;
      this.state.vote = null;
      this.state.match = null;
      this._phase('lobby');
    },

    /* ---------------- 受け取り ---------------- */
    _listen() {
      Net().on((msg, from) => this._recv(msg, from));
    },
    _recv(msg, from) {
      const host = this.isHost;
      switch (msg.t) {
        case 'room':
          if (host) return;
          this.state = msg.s;
          this.notify('room');
          return;
        case 'reject':
          this.error = msg.why;
          this.notify('reject');
          return;
        case 'bye':
        case '_hostLost':
          if (host) return;
          this.error = 'ホストとの接続が切れました';
          this.notify('lost');
          return;
      }
      if (!host || !this.state) return;
      const S = this.state;
      switch (msg.t) {
        case '_join':
          return;
        case 'hello': {
          if (S.phase !== 'lobby') return this._reject(from, '試合中のため入れません。終わるまで待ってください');
          if (S.members.length + S.settings.cpu >= S.settings.max || S.members.length >= MAX_PLAYERS)
            return this._reject(from, '部屋が満員です');
          if (this.member(from)) return;
          const num = Math.max(0, ...S.members.map((m) => m.num)) + 1;
          S.members.push({ id: from, num, charId: msg.charId, name: uniqueName(cleanName(msg.name, num), S.members) });
          this._broadcast();
          return;
        }
        case '_leave': {
          const i = S.members.findIndex((m) => m.id === from);
          if (i < 0) return;
          S.members.splice(i, 1);
          delete this.ballots[from];
          this._clampSettings();
          this._broadcast();
          this.notify('leave:' + from);
          if (S.vote && !S.vote.result) this._maybeCloseVote();
          return;
        }
        case 'char': {
          const m = this.member(from);
          if (m && S.phase === 'lobby' && NLM.Characters.get(msg.charId)) {
            m.charId = msg.charId;
            this._broadcast();
          }
          return;
        }
        case 'vote': {
          const v = S.vote;
          if (!v || v.result || msg.kind !== v.kind || !this.member(from)) return;
          const picks = (Array.isArray(msg.picks) ? msg.picks : []).filter((x) => v.cands.includes(x)).slice(0, v.pick);
          this.ballots[from] = [...new Set(picks)];
          v.voted = Object.keys(this.ballots).length;
          this._broadcast();
          this._maybeCloseVote();
          return;
        }
      }
    },
    _reject(id, why) {
      Net().sendTo(id, { t: 'reject', why });
      setTimeout(() => Net().kick(id), 500);
    },
    _clampSettings() {
      const s = this.state.settings;
      const humans = this.state.members.length;
      s.max = Math.max(Math.max(2, humans), Math.min(MAX_PLAYERS, s.max | 0));
      s.cpu = Math.max(0, Math.min(s.max - humans, s.cpu | 0));
      s.songs = Math.max(1, Math.min(10, s.songs | 0));
    },
    _broadcast() {
      this.state.seq++;
      Net().broadcast({ t: 'room', s: this.state }, { self: false });
      this.notify('room');
    },
    _phase(p) {
      this.state.phase = p;
      this._broadcast();
    },
    _later(fn, ms) {
      this.timers.push(setTimeout(fn, ms));
    },

    /* ---------------- 投票（7-1・7-2） ---------------- */
    _playable() {
      const un = new Set(NLM.Save.data.unlocked.songs);
      return NLM.Songs.all()
        .filter((s) => !s.proto && un.has(s.id))
        .sort((a, b) => a.no - b.no)
        .map((s) => s.id);
    },
    _songVote() {
      const S = this.state;
      const all = this._playable();
      let cands;
      let pick;
      if (S.mode === 'battle') {
        // 演争：ホストの解禁済みの曲から「曲数×2」をランダムに候補に
        pick = Math.min(S.settings.songs, all.length);
        cands = shuffle(all).slice(0, Math.min(all.length, pick * 2));
      } else {
        // 協奏：ホストの解禁済みの全曲から1曲
        pick = 1;
        cands = all;
      }
      this._startVote('song', cands, pick);
    },
    _diffVote() {
      this._startVote('diff', NLM.Songs.DIFFICULTIES.map((d) => d.id), 1);
    },
    _startVote(kind, cands, pick) {
      const S = this.state;
      this.ballots = {};
      S.vote = { kind, cands, pick, endsAt: Net().hostNow() + VOTE_MS, voted: 0, total: S.members.length, result: null };
      S.phase = kind === 'song' ? 'songVote' : 'diffVote';
      this._broadcast();
      const id = ++this._voteId;
      this._later(() => id === this._voteId && this._closeVote(), VOTE_MS + 200);
    },
    _voteId: 0,
    _maybeCloseVote() {
      const v = this.state.vote;
      if (v && !v.result && this.state.members.every((m) => this.ballots[m.id])) this._closeVote();
    },
    _closeVote() {
      const S = this.state;
      const v = S.vote;
      if (!v || v.result) return;
      this._voteId++;
      const count = {};
      v.cands.forEach((c) => (count[c] = 0));
      let any = false;
      for (const picks of Object.values(this.ballots)) for (const c of picks) {
        count[c]++;
        any = true;
      }
      // 得票の多い順。同票はルーレット（ランダム）。全員棄権ならランダム（7-1）
      const tiebreak = {};
      v.cands.forEach((c) => (tiebreak[c] = Math.random()));
      const order = v.cands.slice().sort((a, b) => count[b] - count[a] || tiebreak[a] - tiebreak[b]);
      const chosen = order.slice(0, v.pick);
      // ルーレットの演出：採用の境目で同票になった候補
      const edge = count[chosen[chosen.length - 1]];
      const tied = order.filter((c) => count[c] === edge);
      const roulette = tied.length > chosen.filter((c) => count[c] === edge).length || (!any && v.pick === 1) ? { cands: tied, won: chosen.filter((c) => count[c] === edge) } : null;
      v.result = { chosen, count, roulette, abstain: !any };
      S.phase = v.kind === 'song' ? 'songResult' : 'diffResult';
      this._broadcast();
      this._later(() => (v.kind === 'song' ? this._afterSong(chosen) : this._afterDiff(chosen[0])), RESULT_MS + (roulette ? 1600 : 0));
    },
    _afterSong(chosen) {
      this.state.pendingSongs = chosen;
      this._diffVote();
    },
    _afterDiff(diff) {
      const S = this.state;
      const players = S.members.map((m) => ({ name: m.name || 'P' + m.num, charId: m.charId, netId: m.id }));
      const used = {};
      for (let i = 0; i < S.settings.cpu; i++) {
        const c = NLM.Characters.list[Math.floor(Math.random() * NLM.Characters.list.length)];
        used[c.id] = (used[c.id] || 0) + 1;
        players.push({ name: c.name + (used[c.id] > 1 ? used[c.id] : ''), charId: c.id, cpu: true, strength: S.settings.strength });
      }
      S.match = { id: Date.now() % 1e9, mode: S.mode, songs: S.pendingSongs, difficulty: diff, players, seed: Math.floor(Math.random() * 1e9) };
      S.vote = null;
      S.phase = 'play';
      this._broadcast();
    },
  };

  /** 名前：最大8文字。空なら「P番号」 */
  function cleanName(n, num) {
    const s = String(n || '')
      .replace(/[\u0000-\u001f<>]/g, '')
      .trim()
      .slice(0, 8);
    return s || 'P' + num;
  }
  /** 同じ名前の人がいたら番号を付けて見分けられるように */
  function uniqueName(n, members) {
    if (!members.some((m) => m.name === n)) return n;
    for (let k = 2; k < 40; k++) if (!members.some((m) => m.name === n + k)) return n + k;
    return n;
  }

  function shuffle(a) {
    a = a.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  Room.cleanName = cleanName;
  NLM.Room = Room;
})();
