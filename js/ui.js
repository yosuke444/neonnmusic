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
      },
      [el('span', { class: 'btn-label', text: label }), opts.sub ? el('span', { class: 'btn-note', text: opts.sub }) : null]
    );
    b.addEventListener('click', (e) => {
      if (b.disabled) return;
      onClick && onClick(e);
    });
    return b;
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
    if (best) best.focus();
  }

  /** 画面表示直後に、最初のボタン（または data-autofocus）へフォーカス */
  function focusFirst(root) {
    const pref = root.querySelector('[data-autofocus]');
    const body = root.querySelector('.screen-body');
    // 「戻る」より本文の最初のボタンを優先する
    const target = pref || (body && focusables(body)[0]) || focusables(root)[0];
    if (target) target.focus({ preventScroll: true });
  }

  NLM.UI = { el, button, placeholder, focusables, moveFocus, focusFirst };
})();
