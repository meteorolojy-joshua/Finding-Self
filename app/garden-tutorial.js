/* Interactive tutorial for the garden page ("What is the Self that You Want to Grow?").
   Walks the user through touching a bud, titling the leaf, swiping to flip it,
   writing words (the leaf grows), picking a theme, and finishing. */
'use strict';
window.GARDEN_TUTORIAL = (() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  let ov = null;
  let observer = null;
  let cleanups = [];
  let slotId = null;
  let initialFilled = new Set();
  let stepIndex = 0;
  let done = false;

  function clearHighlights() {
    $$('.tut-target').forEach(el => el.classList.remove('tut-target'));
  }

  function highlight(targets) {
    clearHighlights();
    (Array.isArray(targets) ? targets : [targets]).forEach(t => {
      const el = typeof t === 'string' ? $(t) : t;
      if (el && el.isConnected) el.classList.add('tut-target');
    });
  }

  function stopWatching() {
    if (observer) { observer.disconnect(); observer = null; }
    cleanups.forEach(fn => { try { fn(); } catch (e) { /* ignore */ } });
    cleanups = [];
  }

  function exit() {
    done = true;
    stopWatching();
    clearHighlights();
    if (ov) { ov.remove(); ov = null; }
  }

  function positionBox(targets) {
    const box = ov.querySelector('.tut-box');
    const arrow = ov.querySelector('.tut-arrow');
    const els = (Array.isArray(targets) ? targets : [targets])
      .map(t => typeof t === 'string' ? $(t) : t)
      .filter(el => el && el.isConnected);
    if (!els.length) {
      box.classList.add('tut-box-center');
      arrow.style.display = 'none';
      return;
    }
    const rects = els.map(el => el.getBoundingClientRect());
    const r = {
      top: Math.min(...rects.map(x => x.top)),
      bottom: Math.max(...rects.map(x => x.bottom)),
      left: Math.min(...rects.map(x => x.left)),
      right: Math.max(...rects.map(x => x.right))
    };
    r.width = r.right - r.left;
    r.height = r.bottom - r.top;
    const bw = Math.min(340, window.innerWidth - 24);
    box.style.width = bw + 'px';
    const bh = box.offsetHeight;
    const spaceAbove = r.top, spaceBelow = window.innerHeight - r.bottom;
    let top, dir;
    if (spaceAbove >= bh + 26 || spaceAbove >= spaceBelow) {
      top = Math.max(8, r.top - bh - 16); dir = 'down';
    } else {
      top = Math.min(window.innerHeight - bh - 8, r.bottom + 16); dir = 'up';
    }
    const cx = r.left + r.width / 2;
    const left = Math.max(8, Math.min(window.innerWidth - bw - 8, Math.round(cx - bw / 2)));
    box.style.left = left + 'px';
    box.style.top = Math.max(8, top) + 'px';
    const ax = Math.max(22, Math.min(bw - 22, cx - left));
    arrow.style.left = ax + 'px';
    arrow.classList.add(dir === 'down' ? 'tut-arrow-down' : 'tut-arrow-up');
  }

  function showStep(step) {
    stopWatching();
    if (done) return;
    const targets = step.getTargets ? step.getTargets() : [];
    highlight(targets);
    ov.innerHTML = `
      <div class="tut-box" role="dialog" aria-label="${esc(step.title)}">
        <p class="muted small">Garden tutorial · ${stepIndex + 1}</p>
        <h2 class="prompt">${esc(step.title)}</h2>
        ${step.intro ? step.text.split(/\n\s*\n/).map(p => `<p class="support">${esc(p)}</p>`).join('') : `<p class="support">${esc(step.text)}</p>`}
        <div class="btnrow">
          ${step.showNext ? '<button class="btn2 bw94" type="button" data-gtut="next">Next</button>' : ''}
          ${step.showDone ? '<button class="btn bw94" type="button" data-gtut="done">Done</button>' : ''}
          <button class="note-act bw94" type="button" data-gtut="exit">Exit tutorial</button>
        </div>
        <span class="tut-arrow" aria-hidden="true"></span>
      </div>`;
    const firstEl = (Array.isArray(targets) ? targets : [targets])
      .map(t => typeof t === 'string' ? $(t) : t)
      .find(el => el && el.isConnected);
    if (firstEl && firstEl.scrollIntoView) {
      try { firstEl.scrollIntoView({ block: 'center', behavior: 'auto' }); } catch (e) { /* ignore */ }
    }
    requestAnimationFrame(() => positionBox(targets));
    if (step.watch) step.watch(goTo, stepIndex);
  }

  function goTo(i) {
    if (done) return;
    stepIndex = i;
    showStep(steps[i]);
  }

  function inlineLeaf() { return $('.inplace-leaf'); }
  function languageDialog() { return $('dialog.language-dialog'); }

  const baseSteps = [
    { // Part 1: touch a bud
      title: 'Grow a leaf',
      text: 'Touch a bud on the plant to grow a leaf where it sits.',
      getTargets: () => {
        const bud = $('.growing-leaf.bud') || $('.bud-btn');
        return bud ? [bud] : [];
      },
      watch: (go) => {
        const check = () => { if (inlineLeaf()) go(stepOffset + 1); };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        check();
      }
    },
    { // Part 2: title the leaf on its front
      title: 'Name it',
      text: 'Give your leaf a short title on its front. Then swipe across the leaf to flip it over.',
      showNext: true,
      getTargets: () => {
        const t = inlineLeaf()?.querySelector('.il-title');
        return t ? [t] : [];
      },
      watch: (go) => {
        const check = () => {
          const il = inlineLeaf();
          if (!il) { go(stepOffset); return; } // closed; back to part 1
          if (il.querySelector('.il-flip.flipped')) go(stepOffset + 2);
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
        check();
      }
    },
    { // Part 3: write words on the back — the leaf grows
      title: 'Write, and watch it grow',
      text: 'Write what you want to grow on the back of the leaf. The leaf grows as you write.',
      getTargets: () => {
        const ta = inlineLeaf()?.querySelector('textarea[name="words"]');
        return ta ? [ta] : [];
      },
      watch: (go) => {
        const ta = inlineLeaf()?.querySelector('textarea[name="words"]');
        if (!ta) {
          const check = () => { if (!inlineLeaf()) go(stepOffset); };
          observer = new MutationObserver(check);
          observer.observe(document.body, { childList: true, subtree: true });
          return;
        }
        if (ta.value.trim()) { go(stepOffset + 3); return; }
        const onInput = () => { if (ta.value.trim()) go(stepOffset + 3); };
        ta.addEventListener('input', onInput);
        cleanups.push(() => ta.removeEventListener('input', onInput));
        const check = () => { if (!inlineLeaf()) go(stepOffset); };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    },
    { // Part 4: pick a theme
      title: 'Choose a theme',
      text: 'Pick a theme for your leaf below. The leaf takes its shape.',
      showNext: true,
      getTargets: () => [...document.querySelectorAll('.il-theme')].slice(0, 4),
      watch: (go) => {
        const check = () => { if (!inlineLeaf()) go(stepOffset); };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        check();
      }
    },
    { // Part 5: done — the leaf stays on the plant
      title: 'There it stays',
      text: 'Tap “Done” and your leaf stays on the plant, where it grew. Touch it any time to write more.',
      getTargets: () => {
        const b = inlineLeaf()?.querySelector('[data-il-done]');
        return b ? [b] : [];
      },
      watch: (go) => {
        const check = () => {
          if (!inlineLeaf()) {
            setTimeout(() => {
              const fresh = $$('.growing-leaf.filled').find(el => !initialFilled.has(el.dataset.id));
              if (fresh) { slotId = fresh.dataset.id; go(stepOffset + 5); }
              else go(stepOffset);
            }, 300);
          }
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    },
    { // Part 6: the placed leaf
      title: 'There it is',
      text: 'There is your new leaf on the plant. You can grow more whenever you like.',
      showDone: true,
      getTargets: () => {
        const el = slotId
          ? document.querySelector(`.growing-leaf.filled[data-id="${slotId}"]`)
          : $('.growing-leaf.filled');
        return el ? [el] : [];
      }
    }
  ];

  let steps = baseSteps;
  let stepOffset = 0;

  function start(intro) {
    if (ov) exit();
    done = false;
    if (document.querySelector('#view .card')?.dataset.page !== 'garden') return false;
    stepOffset = intro ? 1 : 0;
    steps = intro ? [{ title: intro.title || 'About this page', text: intro.text, intro: true, showNext: true, getTargets: () => [] }, ...baseSteps] : baseSteps;
    initialFilled = new Set($$('.growing-leaf.filled').map(el => el.dataset.id));
    ov = document.createElement('div');
    ov.className = 'tut-spot';
    ov.setAttribute('data-od-id', 'garden-tutorial');
    document.body.appendChild(ov);
    ov.addEventListener('click', (e) => {
      const b = e.target.closest('[data-gtut]');
      if (!b) return;
      const a = b.getAttribute('data-gtut');
      if (a === 'next') {
        // From "Name it", Next skips ahead to writing.
        if (stepIndex === 1 + stepOffset) goTo(2 + stepOffset);
        // From "Choose a theme", Next goes to Done.
        else if (stepIndex === 3 + stepOffset) goTo(4 + stepOffset);
        else if (intro && stepIndex === 0) goTo(1);
      } else {
        exit();
      }
    });
    const onResize = () => { if (ov && !done) positionBox(steps[stepIndex].getTargets ? steps[stepIndex].getTargets() : []); };
    window.addEventListener('resize', onResize);
    cleanups.push(() => window.removeEventListener('resize', onResize));
    stepIndex = 0;
    showStep(steps[0]);
    return true;
  }

  return { start, exit };
})();
