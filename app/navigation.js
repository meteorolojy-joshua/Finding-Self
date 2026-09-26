/* Two independent stacks: visited full pages, and hierarchical entry contexts.
   Detached live DOM preserves typed values, selection, and element listeners. */
'use strict';
window.NAV = (() => {
  let view, bar, current=null, history=[], contexts=[], settings=null, restoring=false, pending=null;
  const copy = x => structuredClone(x);
  function state() {
    const session=copy(ENGINE.Session);
    const restores=[window.ROOM,window.SCENARIO_UI].filter(Boolean).map(m=>m.navSnapshot?.()).filter(Boolean);
    const ui={_ob:copy(UI._ob),_invQuery:UI._invQuery,_invOrigin:UI._invOrigin,_pendingInv:copy(UI._pendingInv)};
    return () => { Object.keys(ENGINE.Session).forEach(k=>delete ENGINE.Session[k]); Object.assign(ENGINE.Session,copy(session)); restores.forEach(f=>f()); Object.assign(UI,copy(ui)); };
  }
  function classify(root) {
    const card=root.querySelector('[data-page],.card,.xpage');
    const id=card?.dataset.page||card?.dataset.odId||'page';
    let group=card?.dataset.group;
    if(!group) {
      if(id==='home'||id==='longer-explorations'||id==='settings') group=id;
      else if(id==='scenario-list') group='scenario-list';
      else if(/scenario/.test(id)) group='scenario-editor';
      else if(/inventory|inv-|scope/.test(id)) group='inventory';
      else if(/room-practice/.test(id)) group='growth';
      else if(/room-belonging|room-proposal/.test(id)) group='community';
      else if(/room-small/.test(id)) group='small-practice';
      else if(/room-contrib/.test(id)) group='contribution';
      else if(/room-picker|room-gather/.test(id)) group='gather';
      else if(/room-arr|room-review|room-return/.test(id)) group='arrangement';
      else group='check-in';
    }
    const heading=[...root.querySelectorAll('.prompt,.node-title,h2')].map(x=>x.textContent).join('|');
    return {group,key:card?.dataset.page ? id : id+'|'+heading};
  }
  function capture() {
    if(!view||!current||settings) return;
    pending={...current,nodes:[...view.childNodes],restore:state(),contexts:contexts.slice(),scroll:window.scrollY};
  }
  function chrome() {
    if(!bar)return;
    bar.querySelector('[data-nav="back"]').hidden=!!settings;
    bar.querySelector('[data-nav="back"]').disabled=!history.length;
    bar.querySelector('[data-nav="exit"]').disabled=!settings&&current?.group==='home';
    bar.querySelector('[data-nav="settings"]').hidden=!!settings;
  }
  function restorePage(page) {
    if(!page)return;
    const old=current;
    restoring=true;
    page.restore?.();view.replaceChildren(...page.nodes);current={group:page.group,key:page.key};contexts=page.contexts.slice();pending=null;
    window.EXPLORATIONS?.refresh();
    restoring=false;chrome();window.scrollTo(0,page.scroll||0);
    view.querySelector('h1')?.focus({preventScroll:true});
    transition(old,current);
  }
  function transition(from,to){if(from?.key===to?.key)return;if(from?.key==='garden'&&to?.group!=='settings')window.EXPLORATIONS?.seenGrowth();window.dispatchEvent(new CustomEvent('finding-self-navigation',{detail:{from,to}}));}
  function back(){ if(settings)return closeSettings();const p=history.pop();if(p)restorePage(p); }
  function exit(){if(settings)return closeSettings();const ctx=contexts.at(-1);if(ctx){history=history.slice(0,ctx.historyLength);restorePage(ctx.page);}else if(current?.group!=='home'){UI.renderHome();}}
  function closeSettings(){const p=settings;settings=null;if(p)restorePage(p);}
  function init() {
    view=document.getElementById('view');
    const wrapper=view.parentElement;
    bar=document.createElement('header');bar.className='app-bar';
    bar.innerHTML='<span class="app-identity"><img src="assets/brand-icon.svg" alt=""><span>Finding Self,<br>Author of Worlds</span></span><nav aria-label="Page navigation"><button type="button" data-nav="back">Back</button><button type="button" data-nav="exit">Exit</button><button type="button" data-nav="help">Help</button><button type="button" data-nav="settings" aria-label="Settings"><img src="assets/settings-icon.svg" alt=""></button></nav>';
    wrapper.insertBefore(bar,view);
    const descriptor=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
    Object.defineProperty(view,'innerHTML',{get(){return descriptor.get.call(this);},set(html){
      if(restoring){descriptor.set.call(this,html);return;}
      const template=document.createElement('template');template.innerHTML=html;
      const next=classify(template.content);
      const before=pending|| (current?{...current,nodes:[...view.childNodes],restore:state(),contexts:contexts.slice(),scroll:window.scrollY}:null);
      if(next.group==='settings') {if(!settings)settings=before;}
      else {
        if(settings)settings=null;
        if(current&&next.key!==current.key&&before) {
          if(next.group!==current.group){
            contexts.push({group:next.group,page:before,historyLength:history.length});
          }
          history.push(before);
        }
        if(next.group==='home')contexts=[];
        current=next;
      }
      descriptor.set.call(this,html);pending=null;document.querySelectorAll('.scn-tip.on').forEach(el=>el.classList.remove('on'));chrome();transition(before,next);
    }});
    window.addEventListener('click',e=>{
      const n=e.target.closest('[data-nav]');
      if(n){e.preventDefault();e.stopImmediatePropagation();capture();if(n.dataset.nav==='back')back();if(n.dataset.nav==='exit')exit();if(n.dataset.nav==='settings')UI.renderSettings();if(n.dataset.nav==='help')UI.renderHelp();return;}
      if(e.target.closest('dialog,[role="dialog"]'))return;
      capture();
      const b=e.target.closest('button');
      // Legacy full-page Home/Exit controls now honor the group's entry context.
      if(b&&(b.dataset.act==='settings-exit'||((b.dataset.act==='home'||b.dataset.ract==='home'||b.dataset.nact==='home'||b.dataset.scact==='back-home')&&current?.group!=='home'))){e.preventDefault();e.stopImmediatePropagation();exit();}
    },true);
    window.addEventListener('keydown',e=>{if(e.key==='Escape'&&settings){e.preventDefault();e.stopImmediatePropagation();closeSettings();}},true);
  }
  return {init,back,exit,capture,bookmark(){return {...current,nodes:[...view.childNodes],restore:state(),contexts:contexts.slice(),scroll:window.scrollY};},origin(){return settings||this.bookmark();},restoreBookmark(p){settings=null;restorePage(p);},withoutHistory(fn){const was=restoring;restoring=true;try{fn();}finally{restoring=was;}},get debug(){return {current,history:history.map(p=>p.key),contexts:contexts.map(c=>c.group),settings:!!settings};}};
})();

