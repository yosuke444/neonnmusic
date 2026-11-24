/* =========================================================
 * characters.js … キャラデータ・スキル・特性・描画（spec.md 8章）
 * - 25体のデータ（名前・見た目・特性・スキル・解禁条件）
 * - 手書き風の描画（Canvas。線に小さな揺れ）。表情は 待機 idle / 発動 skill / 勝利 win / 脱落 lose
 *
 * スキル：{ name, text, meter（満タン量）, target, effects:[...], attack（攻撃系＝協奏では使えない）}
 *   target：self 自分 / random 生存者からランダムに1人 / others 自分以外の全員 / all 生存者全員
 *   effects の type：
 *     heal(value) 回復 / shield(value) ミスn回ダメージ無効 / auto(value) 次のnノーツ自動演奏
 *     fever(dur) スコア1.5倍＆ミスのダメージ半分 / allheal(value) 全員回復
 *     blind(lanes, dur) レーンを隠す / curtain(ratio, dur) レーンの上側を隠す
 *     fog(dur) ノーツを見えにくく / wobble(dur) ノーツを揺らす / rush(dur) ノーツ1.5倍速
 *   妨害の上限（8-2）：隠すのはレーンの50%まで、効果は最大4秒。
 * 特性 trait.mods：damage（ミスの減少倍率）greatScore perfectScore score meter（溜まりやすさ）comboHeal（50コンボごとの回復量）
 * ========================================================= */
(function () {
  'use strict';
  const NLM = (window.NLM = window.NLM || {});

  const C = (o) => o;
  const LIST = [
    /* ---------- 最初から使える3体（操作が単純で、役割が違う） ---------- */
    C({
      id: 'neonyan', name: 'ネオにゃん', color: '#ff4fb5', accent: '#ffd1ec', body: 'round', feats: ['cat'],
      motif: '路地裏のネオン看板から抜け出した猫',
      trait: { mods: { perfectScore: 1.1 }, text: 'パーフェクトの得点 +10%' },
      skill: { name: 'ネオンヒール', meter: 45, target: 'self', effects: [{ type: 'heal', value: 8 }] },
    }),
    C({
      id: 'signa', name: 'シグナ', color: '#4a5266', accent: '#ff4b5c', body: 'tall', feats: ['signal'], face: [0, 27, 0.72],
      motif: '交差点の信号機',
      trait: { mods: { damage: 0.85 }, text: 'ミスのHP減少 −15%' },
      skill: { name: '赤信号', meter: 30, target: 'random', attack: true, effects: [{ type: 'blind', lanes: 2, dur: 3.5 }] },
    }),
    C({
      id: 'kirari', name: 'キラリ', color: '#ffd93d', accent: '#fff6c2', body: 'star', feats: [],
      motif: 'ビルの屋上で光る星のオブジェ',
      trait: { mods: { greatScore: 1.2 }, text: 'グレイトの得点 +20%' },
      skill: { name: 'キラキラタイム', meter: 51, target: 'self', effects: [{ type: 'fever', dur: 10 }] },
    }),
    /* ---------- 解禁していくキャラ（後半ほど条件が難しい） ---------- */
    C({
      id: 'ramune', name: 'ラムネ', color: '#4fd8ff', accent: '#e4fbff', body: 'drop', feats: ['marble'],
      motif: '自販機のラムネのしずく',
      trait: { mods: { comboHeal: 3 }, text: '50コンボごとにHP +3' },
      skill: { name: 'しゅわっと回復', meter: 55, target: 'self', effects: [{ type: 'heal', value: 10 }] },
      unlock: { type: 'plays', n: 3 },
    }),
    C({
      id: 'taxi', name: 'タクシ', color: '#ff9f1c', accent: '#1d1d1d', body: 'square', feats: ['taxi'],
      motif: '深夜のタクシー',
      trait: { mods: { perfectScore: 1.1 }, text: 'パーフェクトの得点 +10%' },
      skill: { name: '回送中', meter: 54, target: 'self', effects: [{ type: 'shield', value: 3 }] },
      unlock: { type: 'perfect', n: 300 },
    }),
    C({
      id: 'jihanki', name: 'ジハンキ', color: '#ff3b3b', accent: '#ffe0e0', body: 'tall', feats: ['vending'], face: [0, 27, 0.72],
      motif: '路地で光る自動販売機',
      trait: { mods: { meter: 1.08 }, text: 'スキルメーターが8%溜まりやすい' },
      skill: { name: 'おまかせ一本', meter: 35, target: 'self', effects: [{ type: 'auto', value: 24 }] },
      unlock: { type: 'clears', n: 2 },
    }),
    C({
      id: 'luna', name: 'ルナ', color: '#c3a6ff', accent: '#fff5c2', body: 'round', feats: ['crescent'],
      motif: 'ビルの谷間にのぼる月',
      trait: { mods: { perfectScore: 1.1 }, text: 'パーフェクトの得点 +10%' },
      skill: { name: 'ムーンライト', meter: 35, target: 'self', effects: [{ type: 'heal', value: 6 }] },
      unlock: { type: 'plays', n: 8 },
    }),
    C({
      id: 'crow', name: 'クロウ', color: '#3d4bd6', accent: '#ffd23f', body: 'tri', feats: ['beak'],
      motif: '電線にとまる夜のカラス',
      trait: { mods: { damage: 0.85 }, text: 'ミスのHP減少 −15%' },
      skill: { name: '夜のとばり', meter: 26, target: 'random', attack: true, effects: [{ type: 'curtain', ratio: 0.45, dur: 4 }] },
      unlock: { type: 'battleWins', n: 1 },
    }),
    C({
      id: 'bolt', name: 'ボルト', color: '#d4ff3a', accent: '#3a2c00', body: 'spiky', feats: ['bolt'],
      motif: '変電所の電気のかたまり',
      trait: { mods: { damage: 0.85 }, text: 'ミスのHP減少 −15%' },
      skill: { name: 'スパーク', meter: 58, target: 'all', attack: true, effects: [{ type: 'rush', dur: 4 }, { type: 'guard', dur: 4 }] },
      unlock: { type: 'maxCombo', n: 100 },
    }),
    C({
      id: 'pyonta', name: 'ピョンタ', color: '#9effd8', accent: '#ff8fc7', body: 'round', feats: ['bunny'],
      motif: 'ゲームセンターの景品のうさぎ',
      trait: { mods: { meter: 1.1 }, text: 'スキルメーターが10%溜まりやすい' },
      skill: { name: 'ぴょんぴょん', meter: 27, target: 'self', effects: [{ type: 'auto', value: 20 }] },
      unlock: { type: 'coopPlays', n: 3 },
    }),
    C({
      id: 'shitoshito', name: 'シトシト', color: '#5b9bff', accent: '#dceaff', body: 'cloud', feats: ['rain'],
      motif: '街に雨を降らせる雲',
      trait: { mods: { damage: 0.9 }, text: 'ミスのHP減少 −10%' },
      skill: { name: 'にわか雨', meter: 48, target: 'others', attack: true, effects: [{ type: 'fog', dur: 2.5 }] },
      unlock: { type: 'perfect', n: 1500 },
    }),
    C({
      id: 'zururu', name: 'ズルル', color: '#ecc98b', accent: '#ff6f61', body: 'bowl', feats: ['steam'], face: [0, 16, 0.85],
      motif: '屋台のラーメン',
      trait: { mods: { comboHeal: 3 }, text: '50コンボごとにHP +3' },
      skill: { name: 'おかわり', meter: 38, target: 'self', effects: [{ type: 'shield', value: 2 }] },
      unlock: { type: 'charPlays', char: 'neonyan', n: 5 },
    }),
    C({
      id: 'scratch', name: 'スクラッチ', color: '#a64dff', accent: '#2a2a2a', body: 'round', feats: ['headphones'],
      motif: 'クラブのDJ',
      trait: { mods: { damage: 0.85 }, text: 'ミスのHP減少 −15%' },
      skill: { name: 'スクラッチ', meter: 24, target: 'random', attack: true, effects: [{ type: 'wobble', dur: 4 }] },
      unlock: { type: 'clears', n: 5 },
    }),
    C({
      id: 'hikaridake', name: 'ヒカリダケ', color: '#00e5c0', accent: '#fffbe0', body: 'mushroom', feats: ['spots'], face: [0, 24, 0.7],
      motif: '公園の植え込みで光るキノコ',
      trait: { mods: { damage: 0.9 }, text: 'ミスのHP減少 −10%' },
      skill: { name: '胞子の光', meter: 38, target: 'all', effects: [{ type: 'allheal', value: 4, self: 9 }] },
      unlock: { type: 'coopPlays', n: 8 },
    }),
    C({
      id: 'hanabi', name: 'ハナビ', color: '#ff2e63', accent: '#ffe066', body: 'burst', feats: ['fuse'],
      motif: '川辺の打ち上げ花火',
      trait: { mods: { score: 1.1 }, text: 'すべての得点 +10%' },
      skill: { name: 'スターマイン', meter: 54, target: 'self', effects: [{ type: 'fever', dur: 12 }] },
      unlock: { type: 'hardClears', n: 3 },
    }),
    C({
      id: 'fuwari', name: 'フワリ', color: '#f4f0ff', accent: '#b9a7ff', body: 'ghost', feats: ['wisp'],
      motif: '終電後の駅にただよう幽霊',
      trait: { mods: { damage: 0.9 }, text: 'ミスのHP減少 −10%' },
      skill: { name: 'うらめしや', meter: 43, target: 'others', attack: true, effects: [{ type: 'curtain', ratio: 0.3, dur: 3 }] },
      unlock: { type: 'battleWins', n: 3 },
    }),
    C({
      id: 'gear', name: 'ギア', color: '#8a9bb0', accent: '#3dfcff', body: 'hex', feats: ['antenna', 'bolts'],
      motif: '工場夜景のロボット',
      trait: { mods: { meter: 1.05 }, text: 'スキルメーターが5%溜まりやすい' },
      skill: { name: 'オートパイロット', meter: 50, target: 'self', effects: [{ type: 'auto', value: 30 }] },
      unlock: { type: 'perfect', n: 4000 },
    }),
    C({
      id: 'draco', name: 'ドラコ', color: '#7fae2a', accent: '#ffcf3a', body: 'round', feats: ['wings', 'horns'],
      motif: '中華街の龍の飾り',
      trait: { mods: { damage: 0.85 }, text: 'ミスのHP減少 −15%' },
      skill: { name: 'ドラゴンダッシュ', meter: 57, target: 'all', attack: true, effects: [{ type: 'rush', dur: 4 }, { type: 'guard', dur: 4 }] },
      unlock: { type: 'maxCombo', n: 300 },
    }),
    C({
      id: 'penta', name: 'ペンタ', color: '#2c3a5c', accent: '#ffb02e', body: 'bean', feats: ['belly', 'flippers'], face: [0, -8, 0.85],
      motif: '水族館のナイトツアーのペンギン',
      trait: { mods: { greatScore: 1.15 }, text: 'グレイトの得点 +15%' },
      skill: { name: 'ペンギンガード', meter: 55, target: 'self', effects: [{ type: 'shield', value: 3 }] },
      unlock: { type: 'plays', n: 40 },
    }),
    C({
      id: 'yurari', name: 'ユラリ', color: '#ffa8e8', accent: '#fff0fb', body: 'dome', feats: ['tentacles'],
      motif: '港の夜の海に浮かぶクラゲ',
      trait: { mods: { damage: 0.85 }, text: 'ミスのHP減少 −15%' },
      skill: { name: 'ゆらゆら', meter: 24, target: 'random', attack: true, effects: [{ type: 'fog', dur: 4 }] },
      unlock: { type: 'battleWins', n: 5 },
    }),
    C({
      id: 'tube', name: 'チューブ', color: '#2fe07a', accent: '#eafff2', body: 'capsule', feats: ['electrodes'],
      motif: '看板のネオン管',
      trait: { mods: { damage: 0.9 }, text: 'ミスのHP減少 −10%' },
      skill: { name: 'ショート', meter: 42, target: 'others', attack: true, effects: [{ type: 'blind', lanes: 1, dur: 2.5 }] },
      unlock: { type: 'charPlays', char: 'signa', n: 10 },
    }),
    C({
      id: 'hoho', name: 'ホーホ', color: '#b8863b', accent: '#ffe9b0', body: 'round', feats: ['tufts', 'owlbelly'],
      motif: '時計台にすむフクロウ',
      trait: { mods: { comboHeal: 3 }, text: '50コンボごとにHP +3' },
      skill: { name: '夜ふかし', meter: 53, target: 'self', effects: [{ type: 'heal', value: 9 }] },
      unlock: { type: 'extraClears', n: 3 },
    }),
    C({
      id: 'tape', name: 'テープ', color: '#e040fb', accent: '#2b1a33', body: 'wide', feats: ['reels'], face: [0, -2, 0.7],
      motif: '古いラジカセのカセットテープ',
      trait: { mods: { perfectScore: 1.15 }, text: 'パーフェクトの得点 +15%' },
      skill: { name: 'リピート再生', meter: 54, target: 'self', effects: [{ type: 'fever', dur: 10 }] },
      unlock: { type: 'perfect', n: 10000 },
    }),
    C({
      id: 'girari', name: 'ギラリ', color: '#dfe7f0', accent: '#7cf8ff', body: 'round', feats: ['mirror', 'string'],
      motif: 'ディスコのミラーボール',
      trait: { mods: { damage: 0.85 }, text: 'ミスのHP減少 −15%' },
      skill: { name: 'ミラーフラッシュ', meter: 36, target: 'random', attack: true, effects: [{ type: 'blind', lanes: 2, dur: 4 }] },
      unlock: { type: 'battleWins', n: 10 },
    }),
    C({
      id: 'yume', name: 'ユメ', color: '#fff2a8', accent: '#ff7ad9', body: 'round', feats: ['halo', 'crown'],
      motif: '夜明け前の夢の王さま',
      trait: { mods: { score: 1.1, meter: 1.05 }, text: 'すべての得点 +10%、スキルメーターが5%溜まりやすい' },
      skill: { name: '夢見ごこち', meter: 46, target: 'self', effects: [{ type: 'heal', value: 5 }, { type: 'shield', value: 1 }] },
      unlock: { type: 'unlockedChars', n: 20 },
    }),
  ];

  /* ---------- 文章（一文で説明できること：8-3） ---------- */
  const TARGET_JA = { self: '自分', random: 'ランダムな1人', others: '自分以外の全員', all: '生存者全員' };
  function effectText(e, target) {
    const who = TARGET_JA[target];
    switch (e.type) {
      case 'heal':
        return `HPを${e.value}回復`;
      case 'shield':
        return `次のミス${e.value}回はHPが減らない`;
      case 'auto':
        return `次のノーツ${e.value}個を自動演奏`;
      case 'fever':
        return `${e.dur}秒間スコア1.5倍＆ミスのダメージ半分`;
      case 'allheal':
        return `${who}のHPを${e.value}回復（自分は${e.self || e.value}）`;
      case 'blind':
        return `${who}のレーン${e.lanes}本を${e.dur}秒隠す`;
      case 'curtain':
        return `${who}のレーンの上${Math.round(e.ratio * 100)}%を${e.dur}秒隠す`;
      case 'fog':
        return `${who}のノーツを${e.dur}秒見えにくくする`;
      case 'wobble':
        return `${who}のノーツを${e.dur}秒ゆらす`;
      case 'rush':
        return `${who}のノーツが${e.dur}秒間1.5倍速`;
      case 'guard':
        return `その間、自分はミスのダメージ半分`;
    }
    return '';
  }
  const UNLOCK_JA = {
    plays: (u) => `どのモードでも合計${u.n}曲遊ぶ`,
    perfect: (u) => `パーフェクトを累計${u.n.toLocaleString()}回`,
    clears: (u) => `独奏で${u.n}回クリア`,
    battleWins: (u) => `演争で${u.n}回1位`,
    maxCombo: (u) => `最大コンボ${u.n}以上`,
    coopPlays: (u) => `協奏で${u.n}曲遊ぶ`,
    charPlays: (u) => `${byId[u.char].name}で${u.n}曲遊ぶ`,
    hardClears: (u) => `ハード以上を${u.n}回クリア`,
    extraClears: (u) => `エクストラを${u.n}回クリア`,
    unlockedChars: (u) => `キャラを${u.n}体解禁する`,
  };

  const byId = {};
  LIST.forEach((c, i) => {
    c.no = i + 1;
    byId[c.id] = c;
    c.seed = 1000 + i * 7919;
  });
  LIST.forEach((c) => {
    c.skill.text = c.skill.effects.map((e) => effectText(e, c.skill.target)).join('＋');
    if (c.skill.target === 'self' && c.skill.effects.length) c.skill.text = '自分の' + c.skill.text;
    c.coopOK = !c.skill.attack;
    c.unlockText = c.unlock ? UNLOCK_JA[c.unlock.type](c.unlock) : '最初から使える';
  });

  /* =========================================================
   * 手書き風の描画
   * 100×100の箱（中心0,0・下向きが+y）で描き、size に合わせて拡大する。
   * ========================================================= */
  function rng(seed) {
    let s = seed % 2147483647 || 1;
    return () => {
      s = (s * 16807) % 2147483647;
      return s / 2147483647 - 0.5;
    };
  }
  function ell(cx, cy, rx, ry, n) {
    n = n || 36;
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      p.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
    }
    return p;
  }
  function rrect(x, y, w, h, r) {
    const p = [];
    const corner = (cx, cy, a0) => {
      for (let i = 0; i <= 5; i++) {
        const a = a0 + (i / 5) * (Math.PI / 2);
        p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    corner(x + w - r, y + r, -Math.PI / 2);
    corner(x + w - r, y + h - r, 0);
    corner(x + r, y + h - r, Math.PI / 2);
    corner(x + r, y + r, Math.PI);
    return p;
  }
  function starPts(cx, cy, ro, ri, n) {
    const p = [];
    for (let i = 0; i < n * 2; i++) {
      const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? ri : ro;
      p.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
    return p;
  }
  function poly(cx, cy, r, n, rot) {
    const p = [];
    for (let i = 0; i < n; i++) {
      const a = rot + (i / n) * Math.PI * 2;
      for (let k = 0; k < 4; k++) {
        const a2 = rot + ((i + 1) / n) * Math.PI * 2;
        const f = k / 4;
        p.push([cx + (Math.cos(a) * (1 - f) + Math.cos(a2) * f) * r, cy + (Math.sin(a) * (1 - f) + Math.sin(a2) * f) * r]);
      }
    }
    return p;
  }
  const BODY = {
    round: () => ell(0, 6, 38, 36),
    tall: () => rrect(-25, -42, 50, 88, 14),
    star: () => starPts(0, 8, 48, 26, 5),
    burst: () => starPts(0, 6, 44, 30, 9),
    drop: () => {
      const p = [];
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const r = 32;
        const y = Math.sin(a) * r;
        const x = Math.cos(a) * r * (a > Math.PI ? 1 - (Math.sin(a - Math.PI) * 0.85) * 0.7 : 1);
        p.push([x, (a > Math.PI ? y * 1.65 : y) + 14]);
      }
      return p;
    },
    square: () => rrect(-40, -20, 80, 62, 14),
    tri: () => {
      const p = [];
      const v = [
        [0, -40],
        [42, 40],
        [-42, 40],
      ];
      for (let i = 0; i < 3; i++)
        for (let k = 0; k < 10; k++) {
          const a = v[i];
          const b = v[(i + 1) % 3];
          const f = k / 10;
          p.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
        }
      return p;
    },
    spiky: () => {
      const p = [];
      for (let i = 0; i < 16; i++) {
        const a = (i / 16) * Math.PI * 2;
        const r = i % 2 ? 31 : 44;
        p.push([Math.cos(a) * r, Math.sin(a) * r * 0.95 + 6]);
      }
      return p;
    },
    cloud: () => {
      const p = [];
      for (let i = 0; i < 48; i++) {
        const a = (i / 48) * Math.PI * 2;
        const r = 33 + 7 * Math.abs(Math.sin(a * 3.5));
        p.push([Math.cos(a) * r * 1.22, Math.sin(a) * r * 0.82 + 4]);
      }
      return p;
    },
    bowl: () => {
      const p = [];
      for (let i = 0; i <= 20; i++) {
        const a = (i / 20) * Math.PI;
        p.push([Math.cos(a) * 44, Math.sin(a) * 40 + 2]);
      }
      p.push([-46, -2], [46, -2]);
      return p;
    },
    ghost: () => {
      const p = [];
      for (let i = 0; i <= 18; i++) {
        const a = Math.PI + (i / 18) * Math.PI;
        p.push([Math.cos(a) * 34, Math.sin(a) * 34 - 6]);
      }
      for (let i = 0; i <= 24; i++) {
        const x = 34 - (i / 24) * 68;
        p.push([x, 40 + Math.sin((i / 24) * Math.PI * 4) * 5]);
      }
      return p;
    },
    hex: () => poly(0, 6, 40, 6, Math.PI / 6),
    bean: () => ell(0, 6, 30, 41),
    dome: () => {
      const p = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI + (i / 24) * Math.PI;
        p.push([Math.cos(a) * 40, Math.sin(a) * 36 + 10]);
      }
      p.push([36, 16], [-36, 16]);
      return p;
    },
    capsule: () => rrect(-46, -14, 92, 46, 23),
    wide: () => rrect(-46, -22, 92, 60, 8),
    mushroom: () => {
      const p = [];
      for (let i = 0; i <= 24; i++) {
        const a = Math.PI + (i / 24) * Math.PI;
        p.push([Math.cos(a) * 46, Math.sin(a) * 38 + 4]);
      }
      p.push([20, 6], [20, 44], [-20, 44], [-20, 6]);
      return p;
    },
  };
  const FACE = {
    round: [0, 8, 1],
    tall: [0, 27, 0.72],
    star: [0, 12, 0.85],
    burst: [0, 8, 0.9],
    drop: [0, 22, 0.9],
    square: [0, 12, 1],
    tri: [0, 18, 0.9],
    spiky: [0, 8, 0.9],
    cloud: [0, 6, 1],
    bowl: [0, 16, 0.85],
    ghost: [0, -4, 1],
    hex: [0, 6, 0.95],
    bean: [0, -6, 0.85],
    dome: [0, -2, 0.95],
    capsule: [0, 9, 0.8],
    wide: [0, -2, 0.7],
    mushroom: [0, 24, 0.7],
  };

  function jitter(pts, R, amt) {
    return pts.map(([x, y]) => [x + R() * amt, y + R() * amt]);
  }
  function smooth(g, pts) {
    const n = pts.length;
    const mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    g.beginPath();
    const m0 = mid(pts[n - 1], pts[0]);
    g.moveTo(m0[0], m0[1]);
    for (let i = 0; i < n; i++) {
      const p = pts[i];
      const m = mid(p, pts[(i + 1) % n]);
      g.quadraticCurveTo(p[0], p[1], m[0], m[1]);
    }
    g.closePath();
  }
  /** 揺れた線（手書き風） */
  function wline(g, pts, R, amt) {
    g.beginPath();
    pts.forEach(([x, y], i) => {
      const jx = x + R() * (amt || 1);
      const jy = y + R() * (amt || 1);
      if (i) g.lineTo(jx, jy);
      else g.moveTo(jx, jy);
    });
  }
  const INK = '#170d2b';
  function shape(g, pts, R, fill, lw) {
    smooth(g, jitter(pts, R, 1.6));
    if (fill) {
      g.fillStyle = fill;
      g.fill();
    }
    g.lineWidth = lw || 3.6;
    g.strokeStyle = INK;
    g.stroke();
  }
  function shade(hex, f) {
    const n = parseInt(hex.slice(1), 16);
    let r = (n >> 16) & 255;
    let gg = (n >> 8) & 255;
    let b = n & 255;
    if (f < 0) {
      r *= 1 + f;
      gg *= 1 + f;
      b *= 1 + f;
    } else {
      r += (255 - r) * f;
      gg += (255 - gg) * f;
      b += (255 - b) * f;
    }
    return `rgb(${r | 0},${gg | 0},${b | 0})`;
  }
  function gray(hex) {
    const n = parseInt(hex.slice(1), 16);
    const v = (((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.55 + (n & 255) * 0.15) * 0.7;
    const h = Math.round(v).toString(16).padStart(2, '0');
    return '#' + h + h + h;
  }

  /* ---------- 飾り（後ろに描くもの・前に描くもの） ---------- */
  const BACK = {
    cat(g, c, R, col) {
      shape(g, [[-34, -14], [-30, -46], [-8, -26]], R, col);
      shape(g, [[34, -14], [30, -46], [8, -26]], R, col);
      shape(g, [[-29, -20], [-27, -38], [-15, -26]], R, c.accent, 2);
      shape(g, [[29, -20], [27, -38], [15, -26]], R, c.accent, 2);
    },
    bunny(g, c, R, col) {
      shape(g, ell(-15, -38, 9, 22, 20), R, col);
      shape(g, ell(15, -40, 9, 22, 20).map(([x, y]) => [x + (y + 40) * 0.15, y]), R, col);
      shape(g, ell(-15, -38, 4, 15, 16), R, c.accent, 2);
    },
    wings(g, c, R, col) {
      shape(g, [[-30, 0], [-56, -22], [-50, 4], [-56, 18], [-30, 18]], R, shade(col, -0.25));
      shape(g, [[30, 0], [56, -22], [50, 4], [56, 18], [30, 18]], R, shade(col, -0.25));
    },
    tentacles(g, c, R, col) {
      g.lineWidth = 4;
      g.strokeStyle = shade(col, -0.15);
      for (let i = -3; i <= 3; i++) {
        const x = i * 10;
        const pts = [];
        for (let k = 0; k <= 8; k++) pts.push([x + Math.sin(k * 0.9 + i) * 4, 16 + k * 4]);
        wline(g, pts, R, 0.8);
        g.stroke();
      }
    },
    halo(g, c, R) {
      g.lineWidth = 4;
      g.strokeStyle = '#ffe066';
      smooth(g, jitter(ell(0, -58, 16, 4.5, 24), R, 0.6));
      g.stroke();
    },
    string(g, c, R) {
      g.lineWidth = 2;
      g.strokeStyle = '#bbb';
      wline(g, [[0, -50], [0, -30]], R);
      g.stroke();
    },
    steam(g, c, R) {
      g.lineWidth = 3;
      g.strokeStyle = 'rgba(255,255,255,0.8)';
      for (const x of [-16, 0, 16]) {
        const pts = [];
        for (let k = 0; k <= 6; k++) pts.push([x + Math.sin(k * 1.2) * 4, -8 - k * 6]);
        wline(g, pts, R, 0.6);
        g.stroke();
      }
    },
  };
  const FRONT = {
    signal(g, c, R, col, expr) {
      const on = expr === 'skill' ? 0 : expr === 'lose' ? -1 : expr === 'win' ? 2 : 2;
      ['#ff4b5c', '#ffd23f', '#38f07f'].forEach((lc, i) => {
        const y = -28 + i * 19;
        shape(g, ell(0, y, 9, 9, 16), R, i === on ? lc : shade(lc, -0.6), 2.5);
      });
    },
    vending(g, c, R) {
      shape(g, rrect(-18, -34, 36, 30, 4), R, '#e9f6ff', 2.5);
      ['#4fd8ff', '#ffd23f', '#38f07f', '#ff8fc7'].forEach((dc, i) => {
        g.fillStyle = dc;
        g.fillRect(-14 + i * 8, -28, 5, 12);
      });
      g.fillStyle = INK;
      g.fillRect(-14, 4, 28, 5);
    },
    marble(g, c, R) {
      shape(g, ell(0, -6, 7, 7, 14), R, 'rgba(255,255,255,0.85)', 2);
    },
    taxi(g, c, R) {
      shape(g, rrect(-14, -34, 28, 12, 3), R, '#fff6a0', 2.5);
      g.fillStyle = INK;
      g.font = '900 9px sans-serif';
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      g.fillText('TAXI', 0, -27.5);
      for (let i = 0; i < 8; i++) {
        g.fillStyle = i % 2 ? '#1d1d1d' : '#ffffff';
        g.fillRect(-38 + i * 9.5, 30, 9.5, 6);
      }
    },
    crescent(g, c, R) {
      // 三日月：円Aから円Bを切り抜く
      g.save();
      g.beginPath();
      g.rect(-100, -100, 200, 200);
      g.arc(30, -35, 10, 0, Math.PI * 2);
      g.clip('evenodd');
      smooth(g, jitter(ell(24, -30, 12, 12, 20), R, 0.6));
      g.fillStyle = '#fff5c2';
      g.fill();
      g.lineWidth = 2.5;
      g.strokeStyle = INK;
      g.stroke();
      g.restore();
    },
    beak(g, c, R) {
      shape(g, [[-7, 12], [7, 12], [0, 22]], R, '#ffd23f', 2.5);
    },
    bolt(g, c, R) {
      shape(g, [[4, 20], [-6, 32], [0, 32], [-6, 44], [10, 28], [3, 28]], R, '#ffffff', 2);
    },
    rain(g, c, R) {
      g.strokeStyle = '#8fd0ff';
      g.lineWidth = 3;
      for (const x of [-24, -8, 10, 26]) {
        wline(g, [[x, 40], [x - 3, 48]], R, 0.6);
        g.stroke();
      }
    },
    headphones(g, c, R) {
      g.lineWidth = 6;
      g.strokeStyle = '#2a2a2a';
      g.beginPath();
      g.arc(0, 4, 42, Math.PI * 1.08, Math.PI * 1.92);
      g.stroke();
      shape(g, rrect(-48, -4, 14, 24, 6), R, '#2a2a2a', 2.5);
      shape(g, rrect(34, -4, 14, 24, 6), R, '#2a2a2a', 2.5);
      g.fillStyle = '#3dfcff';
      g.fillRect(-45, 4, 8, 8);
      g.fillRect(37, 4, 8, 8);
    },
    spots(g, c, R) {
      for (const [x, y, r] of [[-24, -14, 7], [4, -24, 6], [26, -10, 6], [-6, -6, 4]]) shape(g, ell(x, y, r, r, 12), R, '#fffbe0', 2);
    },
    fuse(g, c, R) {
      g.strokeStyle = INK;
      g.lineWidth = 3;
      wline(g, [[0, -38], [4, -46], [0, -50]], R, 0.6);
      g.stroke();
      shape(g, starPts(0, -52, 6, 2.5, 4), R, '#ffe066', 1.5);
    },
    wisp(g, c, R) {
      shape(g, [[26, -36], [32, -48], [36, -34], [31, -28]], R, '#b9a7ff', 2);
    },
    antenna(g, c, R) {
      g.strokeStyle = INK;
      g.lineWidth = 3;
      wline(g, [[0, -30], [0, -46]], R, 0.5);
      g.stroke();
      shape(g, ell(0, -48, 5, 5, 12), R, '#3dfcff', 2);
    },
    bolts(g, c, R) {
      for (const x of [-30, 30]) shape(g, ell(x, 8, 4, 4, 10), R, '#c8d4e0', 2);
    },
    horns(g, c, R) {
      shape(g, [[-22, -22], [-30, -46], [-10, -28]], R, '#ffe9b0', 2.5);
      shape(g, [[22, -22], [30, -46], [10, -28]], R, '#ffe9b0', 2.5);
    },
    belly(g, c, R) {
      shape(g, ell(0, 14, 20, 28, 24), R, '#f4f4f4', 2.5);
      shape(g, [[-6, -2], [6, -2], [0, 6]], R, '#ffb02e', 2);
    },
    flippers(g, c, R, col) {
      shape(g, [[-28, 0], [-42, 22], [-28, 22]], R, shade(col, -0.2), 2.5);
      shape(g, [[28, 0], [42, 22], [28, 22]], R, shade(col, -0.2), 2.5);
    },
    electrodes(g, c, R) {
      shape(g, rrect(-52, 2, 8, 12, 2), R, '#9aa', 2);
      shape(g, rrect(44, 2, 8, 12, 2), R, '#9aa', 2);
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 3;
      wline(g, [[-34, 0], [34, 0]], R, 0.5);
      g.stroke();
    },
    tufts(g, c, R, col) {
      shape(g, [[-30, -18], [-34, -40], [-14, -26]], R, shade(col, -0.2), 2.5);
      shape(g, [[30, -18], [34, -40], [14, -26]], R, shade(col, -0.2), 2.5);
    },
    owlbelly(g, c, R) {
      shape(g, ell(0, 26, 18, 14, 20), R, '#ffe9b0', 2);
      g.strokeStyle = '#b8863b';
      g.lineWidth = 2;
      for (const [x, y] of [[-6, 22], [6, 22], [0, 30]]) {
        wline(g, [[x - 3, y], [x, y + 3], [x + 3, y]], R, 0.3);
        g.stroke();
      }
    },
    reels(g, c, R) {
      shape(g, rrect(-36, -14, 72, 26, 6), R, '#fff2fb', 2.5);
      for (const x of [-18, 18]) shape(g, ell(x, -2, 9, 9, 16), R, '#2b1a33', 2);
      g.fillStyle = INK;
      g.fillRect(-20, 22, 40, 8);
    },
    mirror(g, c, R) {
      g.save();
      smooth(g, ell(0, 6, 38, 36));
      g.clip();
      g.strokeStyle = 'rgba(80,100,130,0.5)';
      g.lineWidth = 1.5;
      for (let x = -40; x <= 40; x += 10) {
        g.beginPath();
        g.moveTo(x, -40);
        g.lineTo(x, 50);
        g.stroke();
      }
      for (let y = -30; y <= 50; y += 10) {
        g.beginPath();
        g.moveTo(-40, y);
        g.lineTo(40, y);
        g.stroke();
      }
      ['#7cf8ff', '#ff7ad9', '#ffe066'].forEach((sc, i) => {
        g.fillStyle = sc;
        g.fillRect(-30 + i * 22, -20 + i * 8, 9, 9);
      });
      g.restore();
    },
    crown(g, c, R) {
      shape(g, [[-18, -28], [-20, -46], [-9, -36], [0, -50], [9, -36], [20, -46], [18, -28]], R, '#ffd23f', 2.5);
      shape(g, ell(0, -38, 3, 3, 8), R, '#ff7ad9', 1.5);
    },
  };

  /* ---------- 顔・表情 ---------- */
  function drawFace(g, fx, fy, fs, expr, c, R, reels) {
    g.save();
    g.translate(fx, fy);
    g.scale(fs, fs);
    const ex = reels ? 18 : 13;
    g.lineCap = 'round';
    g.lineWidth = 3.4;
    g.strokeStyle = INK;
    g.fillStyle = INK;
    const eyeCol = reels ? '#fff' : INK;
    if (expr === 'idle') {
      for (const s of [-1, 1]) {
        smooth(g, jitter(ell(s * ex, -4, 4.2, 5.4, 14), R, 0.4));
        g.fillStyle = eyeCol;
        g.fill();
        g.fillStyle = '#fff';
        g.fillRect(s * ex - 1.5, -7, 2.2, 2.2);
      }
      wline(g, [[-6, 6], [-3, 9], [0, 7], [3, 9], [6, 6]], R, 0.3);
      g.stroke();
    } else if (expr === 'skill') {
      // 発動：きりっとした目＋大きく開いた口
      for (const s of [-1, 1]) {
        wline(g, [[s * (ex + 6), -9], [s * (ex - 4), -4], [s * (ex + 6), 0]], R, 0.3);
        g.strokeStyle = reels ? '#fff' : INK;
        g.stroke();
      }
      g.strokeStyle = INK;
      smooth(g, [[-8, 4], [8, 4], [6, 13], [0, 15], [-6, 13]]);
      g.fillStyle = '#7a1030';
      g.fill();
      g.stroke();
    } else if (expr === 'win') {
      for (const s of [-1, 1]) {
        wline(g, [[s * ex - 5, -3], [s * ex, -8], [s * ex + 5, -3]], R, 0.3);
        g.strokeStyle = reels ? '#fff' : INK;
        g.stroke();
      }
      g.strokeStyle = INK;
      smooth(g, [[-10, 3], [10, 3], [7, 13], [0, 16], [-7, 13]]);
      g.fillStyle = '#7a1030';
      g.fill();
      g.stroke();
      smooth(g, ell(0, 12, 4, 2.5, 10));
      g.fillStyle = '#ff7a9a';
      g.fill();
    } else {
      // 脱落：バツの目＋波の口
      for (const s of [-1, 1]) {
        wline(g, [[s * ex - 4, -8], [s * ex + 4, 0]], R, 0.2);
        g.strokeStyle = reels ? '#fff' : INK;
        g.stroke();
        wline(g, [[s * ex + 4, -8], [s * ex - 4, 0]], R, 0.2);
        g.stroke();
      }
      g.strokeStyle = INK;
      wline(g, [[-8, 9], [-4, 6], [0, 9], [4, 6], [8, 9]], R, 0.2);
      g.stroke();
    }
    if (expr !== 'lose' && !reels) {
      g.fillStyle = 'rgba(255,110,150,0.45)';
      for (const s of [-1, 1]) {
        smooth(g, ell(s * (ex + 9), 4, 5, 3, 10));
        g.fill();
      }
    }
    g.restore();
  }

  function sparkle(g, x, y, r, col) {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(x, y - r);
    g.lineTo(x + r * 0.28, y - r * 0.28);
    g.lineTo(x + r, y);
    g.lineTo(x + r * 0.28, y + r * 0.28);
    g.lineTo(x, y + r);
    g.lineTo(x - r * 0.28, y + r * 0.28);
    g.lineTo(x - r, y);
    g.lineTo(x - r * 0.28, y - r * 0.28);
    g.closePath();
    g.fill();
  }

  /**
   * キャラを描く。(cx, cy) は中心、size は1辺の大きさ（px）。
   * opts.boil: true で線の揺れを少しずつ動かす（手書きアニメ風）
   */
  function draw(g, c, cx, cy, size, expr, opts) {
    opts = opts || {};
    expr = expr || 'idle';
    const frame = opts.boil ? Math.floor(performance.now() / 140) % 3 : 0;
    const R = rng(c.seed + frame * 131);
    const col = expr === 'lose' ? gray(c.color) : c.color;
    g.save();
    g.translate(cx, cy);
    const k = size / 100;
    g.scale(k, k);
    if (expr === 'win') g.translate(0, -4);
    g.lineJoin = 'round';
    for (const f of c.feats) if (BACK[f]) BACK[f](g, c, R, col, expr);
    const pts = BODY[c.body]();
    // ネオンのにじみ（体の外側にうすく）
    if (expr !== 'lose') {
      smooth(g, pts);
      g.lineWidth = 9;
      g.strokeStyle = 'rgba(255,255,255,0.18)';
      g.stroke();
    }
    shape(g, pts, R, col, 4);
    // ハイライト
    g.save();
    smooth(g, pts);
    g.clip();
    g.fillStyle = 'rgba(255,255,255,0.22)';
    g.beginPath();
    g.ellipse(-16, -14, 16, 8, -0.5, 0, Math.PI * 2);
    g.fill();
    g.restore();
    for (const f of c.feats) if (FRONT[f]) FRONT[f](g, c, R, col, expr);
    const fc = c.face || FACE[c.body];
    drawFace(g, fc[0], fc[1], fc[2], expr, c, R, c.feats.includes('reels'));
    // 表情ごとの小物
    if (expr === 'skill') {
      sparkle(g, -44, -30, 8, c.accent === INK ? '#fff' : '#ffffff');
      sparkle(g, 44, -22, 6, '#ffe066');
      sparkle(g, 40, 36, 5, '#ffffff');
    } else if (expr === 'win') {
      ['#ff4fb5', '#2de2e6', '#ffe94a', '#b26bff'].forEach((cc, i) => {
        g.fillStyle = cc;
        g.fillRect(-46 + i * 28, -46 + (i % 2) * 8, 6, 6);
      });
    } else if (expr === 'lose') {
      smooth(g, [[38, -14], [42, -4], [38, 0], [34, -4]]);
      g.fillStyle = '#8fd0ff';
      g.fill();
    }
    g.restore();
  }

  /** 顔アイコン（一覧・HP表示用）。キャンバスを使い回す */
  const iconCache = new Map();
  function icon(c, px, expr) {
    expr = expr || 'idle';
    const key = c.id + '/' + px + '/' + expr;
    let cv = iconCache.get(key);
    if (!cv) {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv = document.createElement('canvas');
      cv.width = cv.height = Math.round(px * dpr);
      const g = cv.getContext('2d');
      g.scale(dpr, dpr);
      draw(g, c, px / 2, px / 2 + px * 0.04, px * 0.92, expr);
      iconCache.set(key, cv);
    }
    return cv;
  }
  function iconURL(c, px, expr) {
    const key = 'url/' + c.id + '/' + px + '/' + (expr || 'idle');
    if (!iconCache.has(key)) iconCache.set(key, icon(c, px, expr).toDataURL());
    return iconCache.get(key);
  }

  NLM.Characters = {
    TOTAL: 25,
    INITIAL_UNLOCKED: 3,
    INITIAL_IDS: ['neonyan', 'signa', 'kirari'],
    list: LIST,
    get: (id) => byId[id] || null,
    draw,
    icon,
    iconURL,
    effectText,
    TARGET_JA,
  };
})();
