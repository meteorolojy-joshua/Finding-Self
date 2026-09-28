/* September 23 design decisions, composed with the existing exploration engine. */
'use strict';
window.ITERATION=(()=>{
  const $=s=>document.querySelector(s),E=()=>EXPLORATIONS;
  const livingRoomAbout='Use each item to explore and assert yourself in different ways and aspects. Some are more introspective, while others help you recognize how you truly feel about things around you and the practical actions you may want to take for yourself.';
  const spacesAbout='Use this as a mental map of the spaces that welcome you as you are. These could be relationships, communities, places, activities, expectations, and the conditions that make room for you - wherever you find yourself stepping out in full and letting your guard down.\n\nLet this map help you feel where you want to go.';
  const plantAbout='This plant can hold all the things that feel like ‘you’. Note them down and see where your writing goes. Revisit it when you need a reminder.';
  const normalize=s=>s.replace(/[‘’]/g,"'").replace(/[“”]/g,'"').replace(/\s+/g,' ').trim();
  function dialog(title,body){const focus=document.activeElement,d=document.createElement('dialog');d.className='illustrated-dialog plain-dialog';d.setAttribute('aria-label',title);d.innerHTML=`<div class="dialog-surface"><h2>${E().esc(title)}</h2>${body}<div class="btnrow"><button class="btn2" data-dismiss>Close</button></div></div>`;document.body.append(d);d.showModal();const close=()=>{d.close();d.remove();if(focus?.isConnected)focus.focus();};d.addEventListener('cancel',e=>{e.preventDefault();close();});d.addEventListener('click',e=>{if(e.target===d||e.target.closest('[data-dismiss]'))close();});return {node:d,close};}
  let currentAbout=null;
  function setPageAbout(text,title){currentAbout={text,title:title||'About this exploration'};}
  function openPageAbout(){if(!currentAbout)return false;const {text,title}=currentAbout;const body=text.split(/\n\s*\n/).map(paragraph=>`<p>${E().esc(paragraph)}</p>`).join('')+`<div class="btnrow"><button class="btn2" type="button" data-page-tutorial>View tutorial for this page</button></div>`;const d=dialog(title,body);d.node.addEventListener('click',e=>{if(!e.target.closest('[data-page-tutorial]'))return;e.preventDefault();d.close();if(window.UI&&typeof window.UI.startPageTutorial==='function')window.UI.startPageTutorial();});return true;}
  function getShovels(){const s=E().data.contributions._shovels;return Array.isArray(s)&&s.length===4?s.slice():[null,null,null,null];}
  function labelForContribution(key){const it=ITERATION_DATA.contributions.find(x=>x.key===key);return it?it.label:key;}
  function placeShovel(si,key){
    const shovels=getShovels();
    shovels.forEach((k,j)=>{if(j!==si&&k===key)shovels[j]=null;});
    shovels[si]=key;
    if(!E().commit('contributions','_shovels',shovels))return;
    E().redraw(contributions);
    E().notify('Shovel leaned on '+labelForContribution(key)+'.');
  }
  function takeShovelDown(si){
    const shovels=getShovels();shovels[si]=null;
    if(!E().commit('contributions','_shovels',shovels))return;
    E().redraw(contributions);
    E().notify('Shovel back on the wall.');
  }
  function dropTargetAt(x,y){
    const el=document.elementFromPoint(x,y);
    if(!el)return null;
    return el.closest('.contribution-slot')||el.closest('.shovel-bracket');
  }
  function startShovelDrag(e,si){
    e.preventDefault();
    const fromItem=getShovels()[si];
    const startX=e.clientX,startY=e.clientY;
    let ghost=null,dragging=false;
    const move=ev=>{
      if(!dragging){
        if(Math.hypot(ev.clientX-startX,ev.clientY-startY)<7)return;
        dragging=true;
        ghost=document.createElement('div');
        ghost.className='shovel-ghost';
        ghost.innerHTML='<img src="assets/current/shovel.svg" alt="">';
        document.body.appendChild(ghost);
        document.querySelectorAll('[data-shovel="'+si+'"]').forEach(o=>o.classList.add('shovel-dragging-src'));
      }
      ghost.style.transform='translate('+ev.clientX+'px,'+ev.clientY+'px)';
      document.querySelectorAll('.drop-hint').forEach(x=>x.classList.remove('drop-hint'));
      const t=dropTargetAt(ev.clientX,ev.clientY);
      if(t)t.classList.add('drop-hint');
    };
    const up=ev=>{
      window.removeEventListener('pointermove',move);
      window.removeEventListener('pointerup',up);
      window.removeEventListener('pointercancel',up);
      if(ghost)ghost.remove();
      document.querySelectorAll('.drop-hint').forEach(x=>x.classList.remove('drop-hint'));
      document.querySelectorAll('.shovel-dragging-src').forEach(x=>x.classList.remove('shovel-dragging-src'));
      if(!dragging){if(fromItem!==null)takeShovelDown(si);return;}
      const t=dropTargetAt(ev.clientX,ev.clientY);
      if(!t)return;
      if(t.classList.contains('contribution-slot'))placeShovel(si,t.dataset.item);
      else takeShovelDown(si);
    };
    window.addEventListener('pointermove',move);
    window.addEventListener('pointerup',up);
    window.addEventListener('pointercancel',up);
  }
  function wireShovels(){
    document.querySelectorAll('.wall-shovel,.placed-shovel').forEach(el=>{
      el.addEventListener('pointerdown',e=>startShovelDrag(e,Number(el.dataset.shovel)));
    });
  }
  function contributions(){
    const shovels=getShovels();
    E().page('contributions','contribution','Ways I Want to Contribute','Drag a shovel from the wall onto something you’d like to contribute to — or open any object to write about what you’d bring.',`<div class="shovel-wall" id="shovel-wall">
      <p class="shovel-wall-caption">Four shovels hang on the wall. Drag one onto something you’d like to contribute to.</p>
      <div class="shovel-plank">${[0,1,2,3].map(i=>`
        <div class="shovel-bracket" data-bracket="${i}">${shovels[i]===null?`
          <button type="button" class="wall-shovel" data-shovel="${i}" aria-label="Shovel ${i+1} — drag it onto something you’d like to contribute to">${E().asset('current/shovel')}</button>`
          :`<span class="shovel-bracket-empty" aria-hidden="true"></span>`}
        </div>`).join('')}
      </div>
    </div>
    <div class="contribution-objects">${ITERATION_DATA.contributions.map(item=>{const b=item.key==='notebook'?[49,64,110,64]:item.box,w=item.key==='others'?428:204,h=item.key==='others'?100:180;const si=shovels.indexOf(item.key);return `<div class="contribution-slot" data-item="${item.key}"><button class="contribution-object ${item.key==='others'?'wide':''}" data-iteration="contribution" data-id="${item.key}" aria-label="${E().esc(item.label)}"><span class="contribution-art">${E().asset('current/contribution-'+item.key)}<span class="contribution-preview ${E().data.contributions[item.key]?'has-words':''}" style="left:${b[0]/w*100}%;top:${b[1]/h*100}%;width:${b[2]/w*100}%;height:${b[3]/h*100}%">${E().esc(E().data.contributions[item.key]||item.cue)}</span></span><span class="contribution-label">${E().esc(item.label)}</span></button>${si!==-1?`<span class="placed-shovel" data-shovel="${si}" title="Shovel ${si+1} on ${E().esc(item.label)} — drag to move it, or tap to take it down"><img src="assets/current/shovel.svg" alt="" draggable="false"></span>`:''}</div>`;}).join('')}</div><p class="note-hint" id="contribution-status">One object is enough. You can return and change your words.</p><button class="btn" data-iteration="keep-contributions">Keep these contributions</button>`);
    wireShovels();
    enhance();
    setTimeout(()=>{
      const sup=document.querySelector('#view [data-page="contributions"] .support');
      if(sup)sup.textContent='Drag a shovel from the wall onto something you\u2019d like to contribute to \u2014 or open any object to write about what you\u2019d bring.';
      if(window.ITERATION&&typeof window.ITERATION.setPageAbout==='function')window.ITERATION.setPageAbout('What would you enjoy bringing into the lives and places around you? Four shovels hang on the wall \u2014 drag one onto anything you\u2019d like to contribute to. Open any object to jot down a thought. The pictures are starting points; write whatever feels like yours.','About contributing');
    },0);
  }
  function editContribution(id){
    const item=ITERATION_DATA.contributions.find(x=>x.key===id);if(!item)return;
    const shovels=getShovels();
    const onThis=shovels.indexOf(id);
    const wallFree=shovels.indexOf(null);
    const shovelBtn=onThis!==-1
      ?`<button type="button" class="btn2" id="shovel-dialog-btn">Take the shovel down</button>`
      :wallFree!==-1
        ?`<button type="button" class="btn2" id="shovel-dialog-btn">Lean a shovel here</button>`
        :`<p class="note-hint">All four shovels are already leaning on other things.</p>`;
    E().openModal('contribution-dialog',E().esc(item.label),`<p>What would your own version look like? A few words, a wish, or an unfinished thought.</p>${E().field('My words',E().data.contributions[id]||'','words','Jot down a thought\u2026')}<div class="btnrow">${shovelBtn}</div>`,v=>{if(!E().commit('contributions',id,v.words))return false;E().closeModal();E().redraw(contributions);$(`[data-iteration="contribution"][data-id="${id}"]`)?.focus();E().notify('Your words are kept on this device.');});
    const sb=document.getElementById('shovel-dialog-btn');
    if(sb)sb.addEventListener('click',()=>{
      E().closeModal();
      if(onThis!==-1)takeShovelDown(onThis);else if(wallFree!==-1)placeShovel(wallFree,id);
    });
  }
  function enhance(){const card=$('#view .card');if(!card)return;const id=card.dataset.page||card.dataset.odId;
    currentAbout=null;
    const major={garden:plantAbout, 'longer-explorations':livingRoomAbout, 'spaces':spacesAbout};
    let intro=card.querySelector('.support');
    if(major[id]){if(id==='longer-explorations'&&intro)intro.textContent='Choose an object to explore, or simply look around.';setPageAbout(major[id]);}
    else {
      const frames={spaces:'244:1260',gems:'14:810','story-shelf':'14:959','story-book':'122:575',influences:'122:595',contracts:'122:395',contributions:'122:495','exploration-archive':'379:2161','room-proposal':'122:475','room-small-keep':'122:675','room-return':'122:775','room-gather':'122:795','room-review':'122:735','room-review-after':'122:755','room-gather-p':'122:833','room-gather-r':'122:853','room-notice':'122:933'};
      const legacyFrame=card.querySelector('#room-q2')?'14:487':card.querySelector('#room-q4')?'125:991':card.querySelector('#room-b3a')?'122:435':card.querySelector('#room-sf-opens')?'122:615':card.querySelector('#room-sf-share')?'122:655':id==='room-small'&&/repair/i.test(card.querySelector('h1,h2')?.textContent||'')&&card.querySelector('#room-s1')?'125:1071':null;const item=ITERATION_DATA.introductions.find(x=>x.frame===(legacyFrame||frames[id]))||ITERATION_DATA.introductions.find(x=>[...card.querySelectorAll('.support,p')].some(p=>normalize(p.textContent)===normalize(x.original)));
      if(item){if(!frames[id]&&!legacyFrame)intro=[...card.querySelectorAll('.support,p')].find(p=>normalize(p.textContent)===normalize(item.original));if(intro){intro.textContent=item.summary;setPageAbout(item.original+(item.frame==='122:595'?"\n\n*the background objects on this page are just for inspiration - what you write doesn't have to match them":''));}}
    }
    card.querySelectorAll('.relationship-art img').forEach(img=>{const key=img.src.match(/relationships-(\w+)\.svg/)?.[1];if(key)img.src=`assets/current/relationship-${key}.svg`;});
    if(id==='influences'&&!card.dataset.currentArt){card.dataset.currentArt='true';const geometry={book:[[22.2,63.61,68.66,65.63],[118.13,63.61,68.66,65.63]],music:[[40,107,103,36]],sport:[[64.61,78.75,82.78,51.48]],place:[[118,84.22,80,56]],person:[[56,153.44,96,30]],mentor:[[48.45,56.53,110.05,53.5]]};card.querySelectorAll('.influence-object').forEach((el,i)=>{const key=DESIGN['influence-writing-objects'].items[i].key;el.dataset.kind=key;el.querySelectorAll('textarea').forEach((t,j)=>{const [x,y,w,h]=geometry[key][j];t.style.cssText=`left:${x/2.08}%;top:${y/1.85786}%;width:${w/2.08}%;height:${h/1.85786}%`;});});}
    if(id==='settings'&&!card.querySelector('.helper-settings')){card.insertAdjacentHTML('beforeend','<section class="helper-settings"><h2>AI helper · coming soon</h2><p>Helpers are not available yet, so there is nothing to turn on. Nothing here sends your words anywhere.</p></section>');}
    // The supplied notebook has two independently operable page controls.
    const book=card.querySelector('.book-shape');if(book&&!book.dataset.currentArt){book.dataset.currentArt='true';book.classList.add('current-notebook');}
    window.HELPER?.enhance();
  }
  function init(){document.addEventListener('click',e=>{const b=e.target.closest('[data-iteration]');if(!b)return;e.preventDefault();e.stopImmediatePropagation();if(b.dataset.iteration==='contribution')editContribution(b.dataset.id);if(b.dataset.iteration==='keep-contributions'){if(E().save(E().data)){const n=$('#contribution-status');if(n)n.textContent='Kept. You can return whenever you like.';E().notify('Kept. You can return whenever you like.');}}},true);new MutationObserver(enhance).observe($('#view'),{childList:true});new MutationObserver(()=>{const d=$('dialog.contract-dialog .dialog-surface');if(d&&!d.querySelector('.scroll-art')){d.insertAdjacentHTML('afterbegin','<div class="scroll-art" aria-hidden="true"><div class="scroll-top"><img src="assets/current/scroll-top.svg" alt=""></div><div class="scroll-middle"><img src="assets/current/scroll-middle.svg" alt=""></div><div class="scroll-bottom"><img src="assets/current/scroll-bottom.svg" alt=""></div></div>');}}).observe(document.body,{childList:true});enhance();}
  return {init,enhance,contributions,dialog,setPageAbout,openPageAbout};
})();
