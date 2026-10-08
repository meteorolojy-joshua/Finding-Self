/* Interactive tutorial for the garden page ("What is the Self that You Want to Grow?").
   Walks the user through placing a leaf, writing words, optionally using
   "Help me find language", confirming, and finding their placed leaf. */
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
    // Frame all targets: use the bounding box around them.
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
    // Scroll the first target into view, then position.
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

  function leafDialog() { return $('.leaf-dialog'); }
  function creationPanel() { return $('.creation-panel'); }
  function leafEditor() { return $('.leaf-editor'); }
  function languageDialog() { return $('dialog.language-dialog'); }

  const baseSteps = [
    { // Part 1: tap a dotted slot
      title: 'Grow a leaf',
      text: 'Tap a dotted leaf slot on the plant to grow a new leaf.',
      getTargets: () => {
        const slot = $('.growing-leaf:not(.filled)');
        return slot ? [slot] : [];
      },
      watch: (go) => {
        const check = () => { if ($('.creation-panel')) go(stepOffset + 1); };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        check();
      }
    },
    { // Part 2: choose a theme from the tray
      title: 'Choose a theme',
      text: 'Pick a theme for your leaf from the tray — tap one that fits.',
      getTargets: () => [...document.querySelectorAll('.tray-pile')],
      watch: (go) => {
        const check = () => {
          const panel = $('.creation-panel');
          if (!panel) { go(stepOffset); return; } // closed; back to part 1
          const fields = panel.querySelector('.creation-fields');
          if (fields && !fields.hidden) go(stepOffset + 2);
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden'] });
        check();
      }
    },
    { // Part 2: write in the box
      title: 'Write your words',
      text: 'Write in the box — a word, a phrase, whatever feels like you.',
      getTargets: () => {
        const ta = leafEditor()?.querySelector('textarea[name="words"]');
        return ta ? [ta] : [];
      },
      watch: (go) => {
        const ta = leafEditor()?.querySelector('textarea[name="words"]');
        if (!ta) { // dialog closed; back to part 1
          const check = () => { if (!leafEditor()) go(stepOffset); else if (leafEditor()?.querySelector('textarea[name="words"]')) go(stepOffset + 2); };
          observer = new MutationObserver(check);
          observer.observe(document.body, { childList: true, subtree: true });
          return;
        }
        if (ta.value.trim()) { go(stepOffset + 3); return; }
        const onInput = () => { if (ta.value.trim()) go(stepOffset + 3); };
        ta.addEventListener('input', onInput);
        cleanups.push(() => ta.removeEventListener('input', onInput));
        // If the dialog is closed without writing, back to part 1.
        const check = () => { if (!leafEditor()) go(stepOffset); };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    },
    { // Part 3: help me find language
      title: 'Need help with words?',
      text: 'If you would like help finding the right words, tap "Help me find language". Otherwise, tap Next to continue.',
      showNext: true,
      getTargets: () => {
        const b = leafEditor()?.querySelector('[data-new="garden-language"]');
        return b ? [b] : [];
      },
      watch: (go) => {
        const check = () => {
          if (languageDialog()) { go(stepOffset + 4); return; }
          if (!leafEditor()) go(stepOffset);
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        check();
      }
    },
    { // Part 4: language picker suggestions
      title: 'Try some words',
      text: 'Tap any suggestion to try its words in the box below. When you like what you see, tap "Use these words" to bring them back to your leaf.',
      getTargets: () => {
        const d = languageDialog();
        if (!d) return [];
        const sugs = [...d.querySelectorAll('[data-suggestion]')].slice(0, 3);
        return sugs.length ? sugs : [];
      },
      watch: (go) => {
        const check = () => {
          if (!languageDialog() && leafEditor()) { go(stepOffset + 5); return; }
          if (!languageDialog() && !leafEditor()) go(stepOffset);
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
        check();
      }
    },
    { // Part 5: confirm the leaf
      title: 'Place your leaf',
      text: 'When your words feel right, tap “Grow this leaf” to place your leaf on the plant.',
      getTargets: () => {
        const b = leafEditor()?.querySelector('button[type="submit"]');
        return b ? [b] : [];
      },
      watch: (go) => {
        // Remember which slot we're filling so we can point at it later.
        const check = () => {
          const dlg = leafEditor();
          if (!dlg) {
            // Dialog closed — did a NEW leaf get placed?
            setTimeout(() => {
              const fresh = $$('.growing-leaf.filled').find(el => !initialFilled.has(el.dataset.id));
              if (fresh) { slotId = fresh.dataset.id; go(stepOffset + 6); }
              else go(stepOffset);
            }, 300);
            return;
          }
        };
        observer = new MutationObserver(check);
        observer.observe(document.body, { childList: true, subtree: true });
      }
    },
    { // Part 6: the placed leaf
      title: 'There it is',
      text: 'There is your new leaf on the plant — and the title you gave it on it. You can add more leaves whenever you like.',
      showDone: true,
      getTargets: () => {
        const el = slotId
          ? document.querySelector(`.growing-leaf.filled[data-id="${slotId}"]`)
          : $('.growing-leaf.filled');
        return el ? [el] : [];
      }
    }
  ];

  // When launched from a Tutorials popup, the popup's former body text is prepended
  // as the first tutorial page; the original steps shift by stepOffset.
  let steps = baseSteps;
  let stepOffset = 0;

  function start(intro) {
    if (ov) exit();
    done = false;
    // Must be on the garden page.
    if (document.querySelector('#view .card')?.dataset.page !== 'garden') return false;
    // Prepend the Tutorials popup's former body text as the first tutorial page.
    stepOffset = intro ? 1 : 0;
    steps = intro ? [{ title: intro.title || 'About this page', text: intro.text, intro: true, showNext: true, getTargets: () => [] }, ...baseSteps] : baseSteps;
    // Snapshot already-filled slots so we can spot the new leaf later.
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
        if (intro && stepIndex === 0) goTo(1);
        // From part 3 (help me find language), Next skips to Confirm.
        else if (stepIndex === 2 + stepOffset) goTo(4 + stepOffset);
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
