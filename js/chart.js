/* =========================================================
 * chart.js … 譜面生成（spec.md 11章＋監督の決定）
 * 曲の楽譜データ（music.js で読み取ったもの）＋難易度 → ノーツの配列。
 * 曲IDと難易度から毎回同じ譜面ができる（乱数も曲IDから作る）。
 *
 * 【監督の決定】
 * - 譜面は低い難易度から作り、上の難易度は前の難易度の譜面に「足していく」。
 *   イージーのノーツは、ノーマル以上でも同じ時刻・同じレーンに残る。
 * - 長押しの終点には「離す」ノーツ（type:'release'）を付け、タイミングよく離すと判定。
 * - 譜面ごとに個性を付ける：区間ごとに「譜面の性格（STYLES）」を決める。
 *     melody 主旋律の上がり下がりにレーンが付いていく
 *     drums  ドラムセット型（キックは左、スネアは右、ハイハットは右端）
 *     stream 階段状に流れる（アルペジオ・刻み）
 *     bass   ベースの重い音を同時押しで叩く
 *     chord  和音の刻みを同時押しで叩く
 *   曲データの chartStyle で区間ごとに指定できる（なければジャンル名から決める）。
 *
 * ノーツ：{ t（秒）, beat, lane(0〜3), type:'tap'|'hold'|'release'|'roll', end（秒）, key, chord（同時押しの組番号）,
 *          tail（長押しの終点ノーツの番号）, target（連打の目標回数） }
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const ORDER = ['easy', 'normal', 'hard', 'extra'];
  /* 難易度ごとの目安（11章の表）。数値は調整用 */
  const DIFF = {
    easy: { grid: 1, nps: 2.0, minGap: 0.34, chord: 0, holdMin: 2, maxHand: 1, roll: 4, jack: 0.6 },
    normal: { grid: 0.5, nps: 4.0, minGap: 0.19, chord: 0.07, holdMin: 1, maxHand: 2, roll: 6, jack: 0.34 },
    hard: { grid: 0.25, nps: 6.6, minGap: 0.11, chord: 0.16, holdMin: 0.75, maxHand: 2, roll: 8, jack: 0.2 },
    extra: { grid: 0.25, nps: 10, minGap: 0.07, chord: 0.26, holdMin: 0.5, maxHand: 3, roll: 10, jack: 0.13 },
  };
  // 区間ごとの密度の倍率（ドロップを一番濃く）
  const SECTION_FACTOR = { intro: 0.55, build: 0.85, drop: 1.15, break: 0.6, outro: 0.5 };

  /* 譜面の性格：どの音を優先するか（w）、レーンの決め方、同時押し・長押しの多さ、密度 */
  const STYLES = {
    melody: { w: { lead: 10, snare: 5, clap: 5, kick: 5, chord: 4, bass: 3, arp: 2, hat: 1 }, lanes: 'contour', chord: 0.8, hold: 1.3, dens: 1.0 },
    drums: { w: { snare: 10, clap: 10, kick: 9, hat: 5, lead: 5, chord: 3, bass: 4, arp: 1 }, lanes: 'kit', chord: 1.0, hold: 0.4, dens: 1.05 },
    stream: { w: { arp: 10, lead: 7, hat: 6, kick: 6, snare: 6, bass: 5, chord: 3 }, lanes: 'stairs', chord: 0.5, hold: 0.4, dens: 1.15 },
    bass: { w: { bass: 10, snare: 8, clap: 8, kick: 7, lead: 5, chord: 4, hat: 1, arp: 1 }, lanes: 'rank', chord: 1.6, hold: 1.0, dens: 0.9 },
    chord: { w: { chord: 10, lead: 7, snare: 7, clap: 7, kick: 6, bass: 4, arp: 3, hat: 1 }, lanes: 'contour', chord: 2.0, hold: 0.8, dens: 0.95 },
  };
  // 難易度の数字の範囲（9-2）
  const LEVEL_RANGE = { easy: [1, 4], normal: [4, 8], hard: [8, 12], extra: [11, 15] };

  function hashStr(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0 || 1;
  }
  function rng(seed) {
    let s = seed;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return (s >>> 0) / 4294967296;
    };
  }
  const onGrid = (beat, grid) => Math.abs(beat / grid - Math.round(beat / grid)) < 1e-3;

  /** ジャンル名から区間ごとの譜面の性格を決める（曲データの chartStyle が優先） */
  function guessStyle(song, R) {
    if (song.chartStyle) return song.chartStyle;
    const pick = (a) => a[Math.floor(R() * a.length)];
    const g = song.genre;
    const has = (k) => g.includes(k);
    let drop = 'melody';
    let drop2 = 'drums';
    if (has('トランス') || has('IDM') || has('エレクトロニカ') || has('チップ')) [drop, drop2] = ['stream', 'melody'];
    if (has('ダブステップ') || has('リディム') || has('ニューロ')) [drop, drop2] = ['bass', 'drums'];
    if (has('フューチャーベース')) [drop, drop2] = ['chord', 'melody'];
    if (has('ドラムンベース') || has('ブレイクコア') || has('ガラージ') || has('ジャージー')) [drop, drop2] = ['drums', 'melody'];
    if (has('トラップ')) [drop, drop2] = ['drums', 'bass'];
    if (has('ハードスタイル') || has('ハードコア') || has('ビッグルーム')) [drop, drop2] = ['melody', 'chord'];
    if (has('ディスコ') || has('ファンク') || has('ハウス')) [drop, drop2] = ['bass', 'melody'];
    if (has('シンセウェイヴ')) [drop, drop2] = ['melody', 'stream'];
    if (has('シティポップ') || has('AOR')) [drop, drop2] = ['chord', 'bass'];
    if (has('ジャズ') || has('スウィング')) [drop, drop2] = ['melody', 'chord'];
    if (has('サイバー') || has('インダストリアル') || has('ミッドテンポ')) [drop, drop2] = ['drums', 'bass'];
    if (has('ラテン') || has('サンバ') || has('サルサ')) [drop, drop2] = ['drums', 'stream'];
    // 曲ごとに、ドロップ以外の区間の性格も変える（主役の性格を多めに使う）
    if (R() < 0.35) drop2 = drop;
    return {
      intro: pick([drop, 'stream', 'melody', 'chord']),
      build: pick([drop, 'drums', 'drums', 'stream']),
      drop,
      break: pick(['melody', 'chord', drop]),
      drop2,
      outro: pick([drop, 'stream', 'melody']),
    };
  }

  function roleOf(c, e) {
    const p = c.parts[e.part];
    if (!p || e.part === 'roll' || e.part === 'crash' || e.part === 'fx') return null;
    if (p.type === 'drum') {
      if (/kick/.test(e.part)) return 'kick';
      if (/snare|clap|tom|rim|snap|conga|brush/.test(e.part)) return 'snare';
      if (/hat|shaker|ride/.test(e.part)) return 'hat';
      return null;
    }
    if (p.type === 'melody') return e.part === (c.song.leadPart || 'lead') ? 'lead' : 'lead2';
    if (p.type === 'chord') return 'chord';
    if (p.type === 'bass') return 'bass';
    if (p.type === 'arp') return 'arp';
    return null;
  }

  /** 同じ拍に鳴る音をまとめた「候補」の一覧 */
  function onsets(c) {
    const map = new Map();
    for (const e of c.events) {
      const role = roleOf(c, e);
      if (!role) continue;
      const k = Math.round(e.beat * 48);
      let o = map.get(k);
      // gbeat：はねる前の位置（スウィングの曲でも譜面のマス目で選べるように）
      if (!o) map.set(k, (o = { key: k, beat: k / 48, gbeat: e.g !== undefined ? Math.round(e.g * 48) / 48 : k / 48, roles: new Set(), pitch: {}, dur: {}, vel: 0 }));
      const r = role === 'lead2' ? 'lead' : role;
      o.roles.add(r);
      o.vel = Math.max(o.vel, e.vel || 0.8);
      if (e.midi !== undefined && (o.pitch[r] === undefined || role === 'lead' || r === 'chord')) o.pitch[r] = r === 'chord' ? Math.max(o.pitch[r] || 0, e.midi) : e.midi;
      o.dur[r] = Math.max(o.dur[r] || 0, e.dur);
    }
    return [...map.values()].sort((a, b) => a.beat - b.beat);
  }

  /* =========================================================
   * 譜面を4難易度まとめて作る（下から積み上げる）
   * ========================================================= */
  function buildAll(song) {
    const c = NLM.Music.compile(song);
    const spb = c.spb;
    const bpb = c.beatsPerBar;
    const seed = hashStr(song.id);
    const R0 = rng(seed);
    const styleMap = guessStyle(song, R0);
    // 曲ごとの個性：密度の揺らぎ、左右反転、階段の形
    const songDens = 0.88 + R0() * 0.24;
    // 曲ごとの癖：裏拍の好み、長押し・同時押しの多さ
    const flavor = { sync: R0() * 2.4 - 0.8, hold: 0.6 + R0() * 1.2, chord: 0.6 + R0() * 1.0 };
    const mirror = R0() < 0.5;
    const STAIRS = [
      [0, 1, 2, 3],
      [3, 2, 1, 0],
      [0, 2, 1, 3],
      [0, 1, 2, 3, 2, 1],
      [1, 2, 0, 3],
      [0, 3, 1, 2],
    ];
    const stairs = STAIRS[Math.floor(R0() * STAIRS.length)];
    // ドラムセット型の並び（キック・スネア・ハイハットをどのレーンに置くか）も曲ごとに変える
    const KITS = [
      { kick: [0, 1], snare: [2, 3], hat: [3, 2] },
      { kick: [1, 2], snare: [0, 3], hat: [3, 0] },
      { kick: [0, 3], snare: [1, 2], hat: [2, 1] },
    ];
    const kit = KITS[Math.floor(R0() * KITS.length)];
    const M = (l) => (mirror ? 3 - l : l);

    const all = onsets(c);
    const rollRanges = c.rolls.map((r) => [r.beat - 0.5, r.beat + r.dur + 0.01]);
    const inRoll = (b) => rollRanges.some(([a, z]) => b >= a && b < z);
    const accentSet = new Set(c.accents.map((x) => Math.round(x.beat * 48)));

    // 区間（ドロップ2を区別するため、2つ目のドロップに drop2 を割り当てる）
    let dropCount = 0;
    const secs = c.sections.map((s) => {
      const kind = s.type === 'drop' ? (dropCount++ === 0 ? 'drop' : 'drop2') : s.type;
      const st = STYLES[styleMap[kind] || 'melody'];
      return { s, kind, st, a: s.startBeat, z: s.startBeat + s.beats };
    });
    const secOf = (b) => secs.find((x) => b >= x.a - 1e-6 && b < x.z - 1e-6) || secs[secs.length - 1];

    /* 1) 候補の重要度（性格ごとの重み＋拍の強さ＋曲ごとの小さな揺らぎ） */
    for (const o of all) {
      const sc = secOf(o.beat);
      const pos = o.gbeat - sc.a;
      let w = 0;
      for (const r of o.roles) w = Math.max(w, sc.st.w[r] || 0);
      w += o.roles.size * 0.6;
      if (onGrid(pos, 1)) w += 1.5;
      else w += flavor.sync;
      if (onGrid(pos, 2)) w += 0.8;
      if (onGrid(pos, bpb)) w += 0.8;
      if (accentSet.has(o.key)) w += 20;
      o.score = w + R0() * 0.5;
      o.sec = sc;
    }

    /* 2) 下の難易度から順に、選ぶ音を足していく */
    const chosen = new Set(); // 選んだ候補（難易度をまたいで累積）
    const perDiff = {};
    for (const d of ORDER) {
      const D = DIFF[d];
      for (const sc of secs) {
        const secSec = (sc.z - sc.a) * spb;
        const target = Math.round(D.nps * (SECTION_FACTOR[sc.s.type] || 0.8) * sc.st.dens * songDens * secSec);
        const inSec = all.filter((o) => o.sec === sc && !inRoll(o.beat));
        const have = inSec.filter((o) => chosen.has(o));
        const gap = Math.min(D.minGap, D.grid * spb * 0.98);
        const cands = inSec.filter((o) => !chosen.has(o) && onGrid(o.gbeat, D.grid) && (d === 'extra' || o.score > 1.2)).sort((x, y) => y.score - x.score);
        let n = have.length;
        const times = have.map((o) => o.beat * spb).sort((x, y) => x - y);
        for (const o of cands) {
          if (n >= target) break;
          const t = o.beat * spb;
          if (times.some((x) => Math.abs(x - t) < gap - 1e-6)) continue;
          chosen.add(o);
          times.push(t);
          n++;
        }
      }
      perDiff[d] = new Set(chosen);
    }

    /* 3) ノーツにする（レーンは一度決めたら上の難易度でも変えない） */
    const noteOf = new Map(); // 候補 → 本体のノーツ
    const partners = new Map(); // 候補 → 同時押しの相方ノーツ（複数）
    const results = {};
    let group = 0;
    let counter = 0;
    const R = rng(seed ^ 0x9e3779b9);

    for (const d of ORDER) {
      const D = DIFF[d];
      // その難易度で使うノーツ一覧（下の難易度から引き継ぐ）
      const occ = [[], [], [], []]; // レーンごとの {t, end}
      const live = [];
      const addOcc = (n) => occ[n.lane].push({ t: n.t, end: n.type === 'hold' ? n.end : n.t });
      const conflict = (l, t, end) =>
        occ[l].some((x) => {
          if (t >= x.t - D.jack && t <= x.end + D.jack) return true;
          if (end && x.t >= t - 1e-6 && x.t <= end + D.jack) return true;
          return false;
        });
      const handsAt = (t) => {
        let k = 0;
        for (let l = 0; l < 4; l++) if (occ[l].some((x) => t >= x.t - 1e-3 && t <= x.end + 1e-3)) k++;
        return k;
      };
      // 引き継ぎ
      for (const o of perDiff[d]) {
        if (!noteOf.has(o)) continue;
        const n = noteOf.get(o);
        live.push(n);
        addOcc(n);
        for (const pn of partners.get(o) || []) {
          live.push(pn);
          addOcc(pn);
        }
      }
      // 長押しへの格上げ（この難易度の基準で長く伸ばす音。レーンが空いている時だけ）
      for (const o of perDiff[d]) {
        const n = noteOf.get(o);
        if (!n || n.type !== 'tap') continue;
        const len = holdLen(o, D, o.sec.st, flavor);
        if (!len) continue;
        const end = (o.beat + len) * spb;
        const others = occ[n.lane].filter((x) => x.t !== n.t);
        if (others.some((x) => x.t > n.t && x.t <= end + D.jack)) continue;
        n.type = 'hold';
        n.end = end;
        const me = occ[n.lane].find((x) => x.t === n.t);
        if (me) me.end = end;
      }
      // 新しく足す音
      const fresh = [...perDiff[d]].filter((o) => !noteOf.has(o)).sort((a, b) => a.beat - b.beat);
      for (const o of fresh) {
        const t = o.beat * spb;
        if (handsAt(t) >= D.maxHand) continue;
        const len = holdLen(o, D, o.sec.st, flavor);
        const end = len ? (o.beat + len) * spb : 0;
        const prefs = lanePrefs(o, t, live, o.sec, stairs, M, kit);
        let lane = prefs.find((l) => !conflict(l, t, end));
        let type = len ? 'hold' : 'tap';
        if (lane === undefined && len) {
          lane = prefs.find((l) => !conflict(l, t, 0));
          type = 'tap';
        }
        if (lane === undefined) continue;
        const n = { id: counter++, t, beat: o.beat, lane, type, end: type === 'hold' ? end : undefined, key: false, chord: null, pitch: pitchOf(o), roles: o.roles };
        noteOf.set(o, n);
        live.push(n);
        addOcc(n);
      }
      // 同時押し：重なる音・和音・アクセント（上の難易度で相方を足す）
      for (const o of perDiff[d]) {
        const n = noteOf.get(o);
        if (!n || D.maxHand < 2) continue;
        const have = partners.get(o) || [];
        const want = accentSet.has(o.key) ? (D.maxHand >= 3 ? 2 : 1) : (o.roles.has('chord') || o.roles.size >= 2 || (o.sec.st.lanes === 'rank' && o.vel >= 0.95)) && R() < D.chord * o.sec.st.chord * flavor.chord ? (D.maxHand >= 3 && o.roles.size >= 3 ? 2 : 1) : 0;
        if (have.length >= want) continue;
        const cand = [3 - n.lane, n.lane > 1 ? n.lane - 2 : n.lane + 2, (n.lane + 1) % 4, (n.lane + 3) % 4];
        for (const l of cand) {
          if ((partners.get(o) || []).length >= want) break;
          if (l === n.lane || (partners.get(o) || []).some((p) => p.lane === l)) continue;
          if (handsAt(n.t) >= D.maxHand) break;
          const end = n.type === 'hold' ? n.end : 0;
          if (conflict(l, n.t, end)) continue;
          const m = { id: counter++, t: n.t, beat: n.beat, lane: l, type: n.type, end: n.type === 'hold' ? n.end : undefined, key: false, chord: null };
          const list = partners.get(o) || [];
          list.push(m);
          partners.set(o, list);
          live.push(m);
          addOcc(m);
        }
        const list = partners.get(o);
        if (list && list.length) {
          if (n.chord === null) n.chord = ++group;
          list.forEach((m) => (m.chord = n.chord));
        }
      }

      // この難易度の譜面を書き出す（ノーツはコピー。長押しは終点の「離す」ノーツを付ける）
      const out = [];
      for (const n of live) out.push(Object.assign({}, n, { roles: undefined, pitch: undefined, id: undefined }));
      // 連打（ビルドのスネア連打区間）
      for (const r of c.rolls) {
        const t = r.beat * spb;
        const end = (r.beat + r.dur) * spb;
        out.push({ t, beat: r.beat, lane: 0, type: 'roll', end, key: false, chord: null, target: Math.max(4, Math.round(D.roll * (end - t))) });
      }
      // キーノーツ：ドロップの1拍目、8小節の区切りの最後の決め所
      for (const a of c.accents) out.filter((n) => Math.abs(n.beat - a.beat) < 1e-3 && n.type !== 'roll').forEach((n) => (n.key = true));
      const phrase = 8 * bpb;
      for (const sc of secs.filter((x) => x.s.type === 'drop' || x.s.type === 'build')) {
        for (let p = sc.a; p < sc.z; p += phrase) {
          const last2 = out.filter((n) => n.type !== 'roll' && n.beat >= p + phrase - 2 * bpb && n.beat < p + phrase);
          if (!last2.length) continue;
          last2.sort((x, y) => (y.end ? y.end - y.t : 0) - (x.end ? x.end - x.t : 0) || y.beat - x.beat);
          const best = last2[0];
          out.filter((n) => n.beat === best.beat).forEach((n) => (n.key = true));
        }
      }
      out.sort((a, b) => a.t - b.t || a.lane - b.lane);
      // 長押しの終点に「離す」ノーツ
      const final = [];
      for (const n of out) final.push(n);
      for (const n of out) {
        if (n.type !== 'hold') continue;
        final.push({ t: n.end, beat: n.end / spb, lane: n.lane, type: 'release', key: false, chord: null });
      }
      final.sort((a, b) => a.t - b.t || (a.type === 'release' ? -1 : 0) - (b.type === 'release' ? -1 : 0) || a.lane - b.lane);
      // 始点と終点をつなぐ
      final.forEach((n, i) => {
        if (n.type !== 'hold') return;
        const k = final.findIndex((m) => m.type === 'release' && m.lane === n.lane && Math.abs(m.t - n.end) < 1e-6);
        n.tail = k;
      });
      results[d] = final;
    }

    const charts = {};
    for (const d of ORDER) {
      const stats = measure(results[d], c);
      const manual = song.levels && song.levels[d];
      charts[d] = { songId: song.id, difficulty: d, level: manual || levelOf(stats, d), notes: results[d], stats, duration: c.duration, compiled: c, style: styleMap };
    }
    return charts;
  }

  /** 長押しにする長さ（拍）。0＝長押しにしない */
  function holdLen(o, D, st, flavor) {
    const r = o.roles.has('lead') ? 'lead' : o.roles.has('chord') ? 'chord' : o.roles.has('bass') && st.lanes === 'rank' ? 'bass' : null;
    if (!r) return 0;
    const dur = o.dur[r] || 0;
    const min = D.holdMin / (st.hold * flavor.hold);
    if (dur < min) return 0;
    const len = Math.min(dur, 4) - Math.min(0.25, dur * 0.2);
    return len * 4 >= 1 ? Math.round(len * 4) / 4 : 0;
  }

  function pitchOf(o) {
    return o.pitch.lead !== undefined ? o.pitch.lead : o.pitch.chord !== undefined ? o.pitch.chord : o.pitch.bass !== undefined ? o.pitch.bass : o.pitch.arp;
  }

  /** レーンの希望順（性格ごとの決め方） */
  function lanePrefs(o, t, live, sc, stairs, M, kit) {
    const st = sc.st;
    const p = pitchOf(o);
    const near = (l) => [l, l + 1, l - 1, l + 2, l - 2, l + 3, l - 3].filter((x) => x >= 0 && x < 4);
    let lane;
    const drumOnly = !o.roles.has('lead') && !o.roles.has('chord') && !o.roles.has('arp') && !o.roles.has('bass');
    if (st.lanes === 'kit' || (drumOnly && st.lanes !== 'stairs')) {
      // ドラムセット型：キック・スネア・ハイハットを決まったレーンに（小節ごとに交互）
      const bar = Math.floor((o.beat - sc.a) / 4);
      if (o.roles.has('snare')) lane = kit.snare[bar % 2];
      else if (o.roles.has('kick')) lane = kit.kick[Math.round(o.gbeat) % 2];
      else if (o.roles.has('hat')) lane = kit.hat[Math.round(o.gbeat * 4) % 2];
      else lane = kit.kick[1];
      lane = M(lane);
    } else if (st.lanes === 'stairs') {
      // 階段：直前のノーツの次の段へ流れる（決まった形をくり返す）
      let prev = null;
      for (const n of live) if (n.t < t && n.chord === null && (!prev || n.t > prev.t)) prev = n;
      // 下の難易度のノーツの間に足す音は、前後のノーツをつなぐ形にする（階段・折り返し）
      let next = null;
      for (const n of live) if (n.t > t && n.chord === null && (!next || n.t < next.t)) next = n;
      const linked = prev && next && t - prev.t < 1.2 && next.t - t < 1.2;
      if (!prev || t - prev.t > 2.5) lane = M(stairs[0]);
      else if (linked) {
        const a = prev.lane;
        const z = next.lane;
        const dir = Math.sign(z - a) || (a < 2 ? 1 : -1);
        if (Math.abs(z - a) >= 2) lane = a + dir;
        else if (Math.abs(z - a) === 1) lane = a - dir >= 0 && a - dir <= 3 ? a - dir : z + dir;
        else lane = a + dir;
      } else {
        const pos = stairs.indexOf(M(prev.lane));
        // 同じ段が複数ある形（往復）は、さらに1つ前を見て向きを決める
        let i = pos;
        if (stairs.lastIndexOf(M(prev.lane)) !== pos) {
          let pp = null;
          for (const n of live) if (n.t < prev.t && n.chord === null && (!pp || n.t > pp.t)) pp = n;
          const j = stairs.lastIndexOf(M(prev.lane));
          i = pp && stairs[(j + stairs.length - 1) % stairs.length] === M(pp.lane) ? j : pos;
        }
        lane = M(stairs[(i + 1) % stairs.length]);
      }
    } else if (st.lanes === 'contour' && p !== undefined) {
      // 主旋律の動き：直前の音より高ければ右、低ければ左、同じなら同じレーン
      let prev = null;
      for (let i = live.length - 1; i >= 0; i--) {
        const n = live[i];
        if (n.t < t && n.pitch !== undefined && n.chord === null) {
          if (!prev || n.t > prev.t) prev = n;
        }
      }
      if (!prev || t - prev.t > 2.5) lane = M(Math.max(0, Math.min(3, Math.floor(((p % 12) / 12) * 4))));
      else {
        const diff = p - prev.pitch;
        const step = diff === 0 ? 0 : Math.sign(diff) * (Math.abs(diff) >= 5 ? 2 : 1);
        lane = prev.lane + (mirrorSign(M) * step);
        if (lane > 3) lane = 3 - (lane - 3);
        if (lane < 0) lane = -lane;
      }
    } else {
      // 音の高さの順位（ベース・和音）
      lane = M(p !== undefined ? Math.min(3, Math.floor((((p - 24) % 24) + 24) % 24 / 6)) : 1);
    }
    // 片寄り防止：直前4秒で使ったレーンの回数を見て、少ないレーンへ少し寄せる
    lane = Math.max(0, Math.min(3, lane));
    const use = [0, 0, 0, 0];
    for (const n of live) if (n.t < t && n.t > t - 8) use[n.lane]++;
    const lo = Math.min(...use);
    const score = (l) => Math.abs(l - lane) + (use[l] - lo) * 0.35;
    return near(lane).sort((a, b) => score(a) - score(b));
  }
  const mirrorSign = (M) => (M(0) === 0 ? 1 : -1);

  /** 密度・複雑さの数値 */
  function measure(notes, c) {
    const playable = notes.filter((n) => n.type !== 'roll');
    const heads = playable.filter((n) => n.type !== 'release');
    const first = heads.length ? heads[0].t : 0;
    const last = heads.length ? heads[heads.length - 1].t : 1;
    const dur = Math.max(1, last - first);
    let peak = 0;
    let j = 0;
    for (let i = 0; i < playable.length; i++) {
      while (playable[i].t - playable[j].t > 5) j++;
      peak = Math.max(peak, (i - j + 1) / 5);
    }
    const chords = heads.filter((n) => n.chord !== null).length;
    const holds = heads.filter((n) => n.type === 'hold').length;
    return {
      count: notes.length,
      taps: heads.length - holds,
      holds,
      releases: holds,
      chords,
      rolls: notes.length - playable.length,
      keys: notes.filter((n) => n.key).length,
      nps: playable.length / dur,
      peak,
      chordRatio: chords / Math.max(1, heads.length),
      holdRatio: holds / Math.max(1, heads.length),
      bpm: c.bpm,
    };
  }

  // 難易度ごとの「複雑さの値」の想定幅 → 数字の範囲に写す（50曲の実際の値で合わせる）
  const RAW_SPAN = { easy: [1.5, 4], normal: [3.9, 8], hard: [5.8, 14], extra: [7.3, 20] };
  function rawOf(s) {
    return s.nps * 0.95 + s.peak * 0.45 + s.chordRatio * 4 + s.holdRatio * 2 + (s.bpm >= 160 ? 0.4 : 0);
  }
  function levelOf(s, difficulty) {
    const raw = rawOf(s);
    const [a, b] = RAW_SPAN[difficulty];
    const [lo, hi] = LEVEL_RANGE[difficulty];
    const lv = Math.round(lo + ((raw - a) / (b - a)) * (hi - lo));
    return Math.max(lo, Math.min(hi, lv));
  }

  const cache = new Map();
  function all(song) {
    if (!cache.has(song.id)) cache.set(song.id, buildAll(song));
    return cache.get(song.id);
  }
  NLM.Chart = {
    DIFF,
    STYLES,
    LEVEL_RANGE,
    RAW_SPAN,
    rawOf,
    /** 譜面を作る（同じ曲は4難易度まとめて作って使い回す） */
    generate(song, difficulty) {
      return all(song)[difficulty];
    },
    _raw: (song, d) => buildAll(song)[d],
  };
})();
