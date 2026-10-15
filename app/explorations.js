/* Runtime implementations of the fuller interaction contracts recorded with Figma. */
'use strict';
window.EXPLORATIONS = (() => {
  const KEY='fsaw.updated.v1';
  const empty=()=>({version:2,contributions:{},appearance:"portrait-original",growthIntroSeen:false,roomState:null,garden:{},spaces:{},gems:{},stories:[],contracts:{},influences:{},attachments:[],pocket:[]});
  let data;try{data={...empty(),...JSON.parse(localStorage.getItem(KEY)||'null')};}catch{data=empty();}
  for(const entry of Object.values(data.spaces)) if(entry.name==null) entry.name='';
  if(Object.keys(data.garden).length) data.growthIntroSeen=true;
  let pendingStoryReview=false,leafDraft=null,shelfScroll=0;
  let storyDraft=null,storyIndex=0,influenceDraft=null,activeContract='1';
  let torch={x:170,y:570},modal=null,returnFocus=null;
  const $=s=>document.querySelector(s), view=()=>$('#view');
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto.randomUUID();
  const asset=(name,cls='',alt='')=>`<img class="${cls}" src="assets/${name}.svg" alt="${esc(alt)}" draggable="false">`;
  // A folded paper star: the same five-point star shape on paper, with fold
  // lines from the center to each point, used for the community jar.
  const paperStarSVG=()=>`<svg viewBox="0 0 64 64" aria-hidden="true" focusable="false"><path d="M32 5l8 18 19 2-15 13 5 20-17-10-17 10 5-20L5 25l19-2Z" fill="#f7f0de" stroke="#b39b62" stroke-width="1.6" stroke-linejoin="round"/><path d="M32 32V5M32 32l27-7M32 32l17 26M32 32l-17 26M32 32L5 25" stroke="#d9c69c" stroke-width="1.1" fill="none" opacity=".85"/></svg>`;
  const btn=(action,label,cls='btn',extra='')=>`<button type="button" class="${cls}" data-new="${action}" ${extra}>${label}</button>`;
  const field=(label,value='',name=label,placeholder='',required=false,hideLabel=false)=>`<label class="new-field"><span${hideLabel?' class="sr-only"':''}>${esc(label)}</span><textarea name="${esc(name)}" rows="2" placeholder="${esc(placeholder)}" ${required?'required':''}>${esc(value)}</textarea></label>`;
  function notify(words){let n=$('#app-notice');if(!n){n=document.createElement('div');n.id='app-notice';n.setAttribute('role','status');document.body.append(n);}n.textContent=words;clearTimeout(notify.timer);notify.timer=setTimeout(()=>{n.textContent='';},3500);}
  function save(next){try{localStorage.setItem(KEY,JSON.stringify(next));data=next;return true;}catch{if(modal?.querySelector('.dialog-error'))modal.querySelector('.dialog-error').textContent='Not saved. Your draft is still here. Please try again.';notify('There is not enough storage to keep this. Export your data or free some space, then try again.');return false;}}
  function commit(collection,id,value){const next=structuredClone(data);next[collection][id]=value;return save(next);}
  function remove(collection,id){const next=structuredClone(data);delete next[collection][id];return save(next);}
  function page(id,group,title,support,body){view().innerHTML=`<section class="card updated-page" data-page="${id}" data-group="${group}"><h1 class="prompt" tabindex="-1">${title}</h1>${support?`<p class="support">${support}</p>`:''}${body}</section>`;view().querySelector('h1')?.focus({preventScroll:true});}
  function redraw(fn){NAV.withoutHistory(fn);}
  function openModal(kind,title,body,onSave,onDelete=null){
    closeModal();returnFocus=document.activeElement;
    const d=document.createElement('dialog');d.className='illustrated-dialog '+kind;d.setAttribute('aria-labelledby','dialog-title');
    d.innerHTML=`<form class="dialog-surface"><h2 id="dialog-title">${title}</h2>${body}<p class="dialog-error" role="alert"></p><div class="btnrow"><button type="submit" class="${kind==='contract-dialog'?'btn bw165':kind==='leaf-dialog'?'btn bw64 bwtrim':'btn bw165'}">${kind==='contract-dialog'?'Confirm':kind==='leaf-dialog'?'Confirm':'Keep these words'}</button>${btn('close-modal','Cancel','btn2')}${onDelete?'<button type="button" class="btn2" data-modal-delete>Delete</button>':''}</div></form>`;
    document.body.append(d);modal=d;d.showModal();
    d.addEventListener('cancel',e=>{e.preventDefault();closeModal();});
    d.addEventListener('click',e=>{if(e.target===d){const r=d.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeModal();}});
    d.querySelector('form').addEventListener('submit',e=>{e.preventDefault();const values=Object.fromEntries(new FormData(e.target));if(onSave(values)!==false)closeModal();});
    if(onDelete){d.querySelector('[data-modal-delete]').addEventListener('click',()=>{
      const row=d.querySelector('form > .btnrow');
      row.innerHTML=`<span class="dialog-confirm-text">Delete this leaf?</span><button type="button" class="btn bw165" data-modal-delete-yes>Yes, delete</button><button type="button" class="btn2 bw64 bwtrim" data-modal-delete-no>Keep it</button>`;
      row.querySelector('[data-modal-delete-yes]').addEventListener('click',()=>{onDelete();});
      row.querySelector('[data-modal-delete-no]').addEventListener('click',()=>{closeModal();});
    });}
    d.querySelector('textarea,input,button')?.focus();
  }
  function closeModal(){if(!modal)return;const d=modal;modal=null;d.close();d.remove();if(returnFocus?.isConnected)returnFocus.focus({preventScroll:true});returnFocus=null;}
  function filledLabel(entry,fallback){return entry?.title||entry?.words||entry?.aspect||fallback;}
  // A gemstone's caption is its title when it has one, otherwise its aspect.
  function gemCaption(g){const t=(g?.title||'').trim();return t||g?.aspect||'';}
  // Merge pending PhotoBody changes into an entry's stored photos.
  function mergePhotos(existing,container,names){const next=Object.assign({},existing||{});names.forEach(n=>{const p=PhotoBody.get(container,n);if(p===null)delete next[n];else if(p!==undefined)next[n]=p;});return next;}
  // The photo currently in force for a body field: pending change wins, else stored.
  function bodyPhoto(entry,container,name){const p=PhotoBody.get(container,name);if(p===null)return null;if(p!==undefined)return p;return (entry.photos||{})[name]||null;}
  // A leaf's caption is its title when it has one, otherwise its words.
  function leafCaption(g){const t=(g?.title||'').trim();return t||g?.words||'';}

  // Six independent room entries. Confirmation is the only completion transition.
  function spaces(){
    const appearance=data.appearance||'portrait-original';
    page('spaces','spaces','In what spaces can you be yourself?','Explore the spaces where you feel free to be yourself.',
      `<div class="spaces-map spatial-scene">${asset('spaces-map-ground','scene-ground')}${appearance==='none'?'':asset('current/'+(appearance==='leaf'?'leaf-places':appearance),'map-person')}${btn('appearance','Change my appearance','btn2 appearance-button')}${DESIGN['spaces-map'].slots.map((s,i)=>`<button class="map-house" data-new="space" data-id="${s.key}" style="left:${s.x/4.28}%;top:${s.y/5.5}%" title="${esc(data.spaces[s.key]?.name||'')}" aria-label="${esc(data.spaces[s.key]?(data.spaces[s.key].name||'Unnamed space'):`Space ${i+1}: add words`)}">${asset('current/house-'+(i+1)+(data.spaces[s.key]?'':'-outline'))}<span>${esc(data.spaces[s.key]?(data.spaces[s.key].name||'Unnamed space'):'')}</span></button>`).join('')}</div><p class="note-hint">Revisit a house whenever you like. Each holds its own words.</p>${btn('keep-spaces','Keep this collection')}`);
  }
  function editSpace(id){const entry=data.spaces[id]||{};openModal('room-dialog','A space for my self',`<label class="new-field"><span>Place name (optional)</span><input type="text" name="name" maxlength="60" value="${esc(entry.name||'')}" placeholder="A name for this space…"></label>`+PhotoBody.field('words','What makes room for you here?',entry.words,(entry.photos||{}).words,{placeholder:'A place, person, condition, or arrangement…'}),values=>{if(!values.words.trim()&&!values.name.trim()&&!bodyPhoto(entry,modal,'words')){modal.querySelector('.dialog-error').textContent='Add a place name or a few words to keep this space.';return false;}if(!commit('spaces',id,{...entry,name:(values.name||'').trim(),words:values.words,photos:mergePhotos(entry.photos,modal,['words'])}))return false;redraw(spaces);returnFocus=view().querySelector(`[data-new="space"][data-id="${id}"]`);notify('Your words are kept on this device.');});PhotoBody.bind(modal);}
  function appearance(){
    openModal('appearance-dialog','Choose how you appear',`<div class="appearance-grid">${[['portrait-original','Original person'],['leaf','Leaf'],['star','Star'],['portrait-short','Short hair'],['portrait-silver','Silver hair'],['stickman','Stickman'],['stickman-backpack','Walking stickman with backpack'],['person-full-body','Full-body person'],['person-backpack','Walking person with backpack'],['none','No figure']].map(([id,label])=>btn('appearance-choice',`${id==='none'?'<span class="no-figure">—</span>':asset('current/'+(id==='leaf'?'leaf-places':id))}<span>${label}</span>`,'appearance-choice',`data-id="${id}" aria-pressed="${data.appearance===id}"`)).join('')}</div>`,()=>false);
    modal.querySelector('[type="submit"]').remove();
  }

  // Torch and beam are the canonical paired Figma vectors. Hit-testing uses the
  // same beam polygon in their 170x150 coordinate system, including edge overlap.
  const beamPolygon=[[29,123],[52,136],[157,58],[45,0]];
  function intersects(a,b){for(const p of [a,b])for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length],n=[-(q[1]-p[i][1]),q[0]-p[i][0]];const aa=a.map(v=>v[0]*n[0]+v[1]*n[1]),bb=b.map(v=>v[0]*n[0]+v[1]*n[1]);if(Math.max(...aa)<Math.min(...bb)||Math.max(...bb)<Math.min(...aa))return false;}return true;}
  function gemLit(i){const [x,y]=DESIGN['gemstone-exploration'].positions[i];const poly=beamPolygon.map(([a,b])=>[a+torch.x-12,b+torch.y-100.5]);return intersects(poly,[[x,y],[x+114,y],[x+114,y+104],[x,y+104]]);}
  function gems(){
    page('gems','gems','Aspects of My Self to Explore','Things about yourself that you are curious to look into more or are thinking about. It need not be about a problem or have a clear answer.',
      `<p class="scene-instruction">Drag the torch to shine on a gemstone. Press and hold a lit gemstone to kindle it and open it.</p><div class="gem-scene spatial-scene"><div class="torch-beam" aria-hidden="true">${asset('gemstone-torch-beam')}</div>${DESIGN['gemstone-exploration'].positions.map(([x,y],i)=>`<button class="gem-target" data-new="gem" data-id="${i+1}" style="left:${x/4.28}%;top:${y/6.5}%" aria-label="${esc(filledLabel(data.gems[i+1],`Gemstone ${i+1}: empty`))}">${asset('current/gem-'+(i+1)+(data.gems[i+1]?'':'-outline'))}<span>${esc(gemCaption(data.gems[i+1]))}</span></button>`).join('')}<button class="movable-torch" aria-label="Move torch. Drag, or use arrow keys; hold Shift for larger steps." type="button">${asset('current/torch')}</button></div><p class="note-hint" id="torch-status" role="status"></p><p class="note-hint">Keyboard: focus the torch and use the arrow keys. Then Tab to an illuminated gemstone and press Enter.</p><div class="btnrow">${btn('keep-gems','Keep this exploration')}${btn('exit','Not now','note-act')}</div>`);
    const handle=$('.movable-torch');let drag=null;
    handle.addEventListener('pointerdown',e=>{e.preventDefault();const r=$('.gem-scene').getBoundingClientRect();drag={x:e.clientX,y:e.clientY,tx:torch.x,ty:torch.y,scale:428/r.width};handle.setPointerCapture(e.pointerId);});
    handle.addEventListener('pointermove',e=>{if(!drag)return;torch.x=Math.max(0,Math.min(378,drag.tx+(e.clientX-drag.x)*drag.scale));torch.y=Math.max(0,Math.min(625,drag.ty+(e.clientY-drag.y)*drag.scale));updateTorch();});
    const end=()=>drag=null;handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    handle.addEventListener('keydown',e=>{const step=e.shiftKey?30:8;const moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(!moves[e.key])return;e.preventDefault();torch.x=Math.max(0,Math.min(378,torch.x+moves[e.key][0]));torch.y=Math.max(0,Math.min(625,torch.y+moves[e.key][1]));updateTorch();});
    // Press-and-hold to kindle: a lit gemstone opens only after a sustained hold.
    const KINDLE_MS=900;
    view().querySelectorAll('.gem-target').forEach(el=>{
      const gid=()=>Number(el.dataset.id);
      let raf=null,start=0;
      const stop=()=>{if(raf)cancelAnimationFrame(raf);raf=null;el.classList.remove('kindling');el.style.removeProperty('--kindle');};
      el.addEventListener('pointerdown',e=>{
        if(!gemLit(gid()-1))return;
        start=performance.now();el.classList.add('kindling');
        const tick=()=>{const k=Math.min(1,(performance.now()-start)/KINDLE_MS);el.style.setProperty('--kindle',k.toFixed(2));if(k>=1){el.dataset.kindled=String(Date.now());stop();return;}raf=requestAnimationFrame(tick);};
        raf=requestAnimationFrame(tick);
      });
      el.addEventListener('pointerup',stop);
      el.addEventListener('pointercancel',stop);
      el.addEventListener('lostpointercapture',stop);
      el.addEventListener('keydown',e=>{
        if((e.key==='Enter'||e.key===' ')&&gemLit(gid()-1)){el.dataset.kindled=String(Date.now());}
      });
    });
    updateTorch();
  }
  function updateTorch(){const h=$('.movable-torch'),b=$('.torch-beam');if(!h||!b)return;h.style.left=(torch.x-10)/4.28+'%';h.style.top=(torch.y-10)/6.5+'%';b.style.left=(torch.x-12)/4.28+'%';b.style.top=(torch.y-100.5)/6.5+'%';const lit=[];view().querySelectorAll('.gem-target').forEach((el,i)=>{const on=gemLit(i);el.classList.toggle('lit',on);el.setAttribute('aria-disabled',String(!on));if(on)lit.push(i+1);});$('#torch-status').textContent=lit.length?'Illuminated: gemstone '+lit.join(', ')+'.':'Move the torch to illuminate a gemstone.';}
  function editGem(id){if(!gemLit(Number(id)-1))return;const entry=data.gems[id]||{};openModal('gem-dialog','A part/aspect of my self',`<label class="new-field"><span>Title</span><input type="text" name="title" maxlength="60" value="${esc(entry.title||'')}" placeholder="A short title for this gemstone…"></label>`+PhotoBody.field('aspect','A part/aspect of my self',entry.aspect,(entry.photos||{}).aspect,{placeholder:'What are you curious about?',required:true,hideLabel:true})+field('What draws me to it (optional)',entry.draws,'draws'),v=>{if(!v.aspect.trim()&&!bodyPhoto(entry,modal,'aspect')){modal.querySelector('.dialog-error').textContent='Write a few words or add a photo for this gemstone.';return false;}if(!commit('gems',id,{aspect:v.aspect.trim(),draws:v.draws.trim(),title:(v.title||'').trim(),photos:mergePhotos(entry.photos,modal,['aspect'])}))return false;redraw(gems);returnFocus=view().querySelector(`[data-new="gem"][data-id="${id}"]`);notify('This gemstone now holds your words.');});PhotoBody.bind(modal);modal.querySelector('.dialog-surface').style.backgroundImage=`url('assets/current/gem-popup-${id}.svg')`;}

  // Stable story IDs; internal page turns never become application history stops.
  const blankStory=()=>({id:uid(),source:'',words:'',bookmark:null});
  function ensureStories(){if(!storyDraft)storyDraft=data.stories.length?structuredClone(data.stories):[blankStory(),blankStory(),blankStory()];storyDraft.forEach(s=>{if(s.bookmark==='Release')s.bookmark='Discard';});}
  function story(){ensureStories();const s=storyDraft[storyIndex];
    page('story-book','stories','An inherited story','Something handed to you — by family, culture, a hometown, a time. You can keep, discard, change, or leave it undecided.',
      `<p class="story-identity">${esc(s.source||"Story "+(storyIndex+1))}</p><div class="story-book" style="--cover-color:${["#9caa91","#b77d68","#91a7b3"][storyIndex%3]}" data-book-drop>${asset('story-book-current','book-art')}<div class="story-source"><h2>A story I inherited</h2>${field('Where did it come from?',s.source,'source','A person, place, culture, or time…')}</div><div class="story-writing">${PhotoBody.field('words','The story in my words',s.words,s.photo,{placeholder:'Write as little or as much as you like…'})}<div class="placed-bookmark ${s.bookmark||''}">${s.bookmark?asset('current/bookmark-'+s.bookmark.toLowerCase(),'',''+s.bookmark):'No bookmark yet'}</div></div></div><p class="note-hint">Drag a bookmark onto the book, or choose one below. Discard is a bookmark; it does not delete the story.</p><div class="bookmark-stacks">${['Keep','Discard','Change','Undecided'].map(k=>btn('bookmark',asset('current/bookmark-'+k.toLowerCase()),'bookmark-stack '+k.toLowerCase(),`data-value="${k}" aria-label="${k} bookmark" aria-pressed="${s.bookmark===k}"`)).join('')}</div>${btn('bookmark-remove','Remove bookmark','note-act')}<nav class="story-pages" aria-label="Story pages">${btn('story-prev','← Previous','btn2',storyIndex===0?'disabled':'')}<span>Story ${storyIndex+1} of ${storyDraft.length}</span>${btn('story-next','Next →','btn2',storyIndex===storyDraft.length-1?'disabled':'')}</nav><div class="btnrow">${btn('story-add','Add a story','btn2')}${btn('story-shelf','View bookshelf','btn2')}${btn('story-save','Keep my stories')}</div><p class="note-hint">Page turns keep your draft. “Keep my stories” saves it on this device.</p>`);
    view().querySelectorAll('.story-book textarea').forEach(el=>el.addEventListener('input',()=>s[el.name]=el.value));
    PhotoBody.reset(view());PhotoBody.bind(view(),(name,url)=>{const cur=storyDraft[storyIndex];if(cur)cur.photo=url;});
    view().querySelectorAll('[data-new="bookmark"]').forEach(el=>dragTo(el,'[data-book-drop]',()=>{s.bookmark=el.dataset.value;redraw(story);}));
  }
  function shelf(){ensureStories();
    const cover=(s,i,cls='')=>`<button type="button" class="story-cover ${cls}" data-new="story-open" data-id="${i}">${asset('current/story-'+(i%3+1))}<span><b>${esc(s.source||'Story '+(i+1))}</b><em>${esc(s.words||'A story you inherited\u2026')}</em></span></button>`;
    // The shelf is the processing space: Undecided, Change, Discard.
    // Kept stories live in "My stories" as single holdable books.
    const level=(bm)=>{const books=storyDraft.map((s,i)=>({s,i})).filter(({s})=>(s.bookmark||'Undecided')===bm);
      return `<div class="shelf-level" data-level="${bm.toLowerCase()}" role="group" aria-label="${bm} shelf"><div class="shelf-books">${books.map(({s,i})=>cover(s,i,'shelf-book')).join('')}</div><span class="level-tag">${bm}</span></div>`;};
    const addBook=`<button type="button" class="story-add-book has-cursor-tip" data-new="story-add" data-tip="Add a new story" aria-label="Add a story"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>add story</span></button>`;
    const discarded=storyDraft.map((s,i)=>({s,i})).filter(({s})=>s.bookmark==='Discard');
    page('story-shelf','stories','What narratives have you inherited? Which ones do you want to discard, keep, change, or remain undecided about?','Each book holds a story you inherited. Open one to revisit its words, or drag it to another shelf — or the bin — to change its bookmark. New stories arrive on the trolley.',
      `<div class="shelf-wrap"><div class="shelf-art"><h2 class="shelf-title">My bookshelf</h2><div class="shelf-art-frame">${asset('current/story-bookshelf','shelf-art-img')}<div class="shelf-levels">${level('Undecided')}${level('Change')}</div></div></div><div class="shelf-my-stories"><button type="button" class="btn2" data-new="my-stories">My stories — the ones I keep</button></div><div class="shelf-side"><div class="book-trolley">${asset('current/story-trolley','trolley-art')}${addBook}</div><div class="trash-bin-wrap"><div class="trash-bin"><div class="bin-body">${asset('current/story-trash-can','bin-body-img')}</div><div class="bin-mouth">${discarded.length?discarded.map(({s,i})=>cover(s,i,'bin-book')).join(''):'<p class="bin-empty">Nothing discarded yet.</p>'}</div><button type="button" class="bin-lid has-cursor-tip" data-tip="tap to open and view discarded stories" aria-label="Trash bin lid. Tap to open and view discarded stories.">${asset('current/story-trash-can','bin-lid-img')}</button></div><p class="bin-caption"><span class="bin-label">discarded stories</span></p></div></div></div>`);
    bindBinLid();bindBookDrag();
  }
  // My stories: the ones I identify with. Single holdable books, title on
  // the cover, pocketable. No clutter, no moving parts.
  function myStories(){
    ensureStories();
    // Use saved stories if available, else the draft.
    const all=(data.stories&&data.stories.length?data.stories:storyDraft)||[];
    const mine=all.filter(s=>(s.bookmark||'')==='Keep');
    const books=mine.map(s=>{
      const title=(s.source||'').trim()||'My story';
      return `<div class="my-story-book" data-my-story="${esc(s.id)}">
        <button type="button" class="my-story-cover" data-my-story-open="${esc(s.id)}" aria-label="Open ${esc(title)}">
          ${asset('story-book-current','book-art')}
          <span class="my-story-title">${esc(title)}</span>
        </button>
        <button type="button" class="btn2" data-my-story-pocket="${esc(s.id)}">Put in pocket</button>
      </div>`;
    }).join('');
    page('my-stories','stories','My stories','The stories you identify with — single books to hold onto, not to sort through.',
      mine.length
        ? `<div class="my-stories-grid">${books}</div><p class="note-hint">Tap a book to read it. Put one in your pocket to hold it close.</p>`
        : `<p>You haven't kept any stories yet. When a story feels like yours, give it the Keep bookmark — it will live here as a book.</p>`
    );
    view().querySelectorAll('[data-my-story-pocket]').forEach(b=>b.addEventListener('click',e=>{
      e.stopPropagation();
      addToPocket('story',b.dataset.myStoryPocket);
    }));
    view().querySelectorAll('[data-my-story-open]').forEach(b=>b.addEventListener('click',()=>{
      const s=all.find(x=>x.id===b.dataset.myStoryOpen);
      if(!s)return;
      openModal('my-story-dialog',esc((s.source||'').trim()||'My story'),
        `<p class="my-story-words">${esc((s.words||'').trim()||'No words written yet.')}</p>`,
        ()=>true);
    }));
  }
  function addBracelet(name=''){
    openModal('bracelet-add-dialog','Make a bracelet',
      `<label class="new-field"><span>Who is this bracelet for?</span><input type="text" name="bracelet-name" maxlength="40" value="${esc(name)}" placeholder="A name…"></label>`,
      v=>{
        const n=(v['bracelet-name']||'').trim();
        if(!n){modal.querySelector('.dialog-error').textContent='Give the bracelet a name.';return false;}
        const next=structuredClone(data);
        next.bracelets=next.bracelets||[];
        next.bracelets.push({id:uid(),name:n});
        if(!save(next))return false;
        redraw(myPeople);
        notify('Bracelet made for '+n+'.');
        return true;
      });
  }
  // My people: relationships I identify with. Single holdable bracelets,
  // name on the bracelet, pocketable. No clutter.
  function myPeople(){
    const all=(data.bracelets||[]);
    const items=all.map(b=>{
      const name=(b.name||'').trim()||'Someone';
      return `<div class="bracelet-item" data-bracelet="${esc(b.id)}">
        <button type="button" class="bracelet-cover" data-bracelet-open="${esc(b.id)}" aria-label="Hold ${esc(name)}">
          <img src="assets/current/bracelet-placeholder.svg" alt="" draggable="false">
          <span class="bracelet-name">${esc(name)}</span>
        </button>
        <button type="button" class="btn2" data-bracelet-pocket="${esc(b.id)}">Put in pocket</button>
      </div>`;
    }).join('');
    page('my-people','connections','My people','The relationships you identify with — single bracelets to hold onto.',
      all.length
        ? `<div class="bracelets-grid">${items}</div><div class="btnrow"><button type="button" class="btn2" data-bracelet-add>Add a bracelet</button></div><p class="note-hint">Tap a bracelet to hold it. Put one in your pocket to keep them close.</p>`
        : `<p>No bracelets yet. When a relationship feels like one of yours, make a bracelet for them.</p><div class="btnrow"><button type="button" class="btn2" data-bracelet-add>Make a bracelet</button></div>`
    );
    view().querySelector('[data-bracelet-add]')?.addEventListener('click',()=>addBracelet());
    view().querySelectorAll('[data-bracelet-pocket]').forEach(btn=>btn.addEventListener('click',e=>{
      e.stopPropagation();
      addToPocket('bracelet',btn.dataset.braceletPocket);
    }));
    view().querySelectorAll('[data-bracelet-open]').forEach(btn=>btn.addEventListener('click',()=>{
      const b=all.find(x=>x.id===btn.dataset.braceletOpen);
      if(!b)return;
      const name=(b.name||'').trim()||'Someone';
      // The bracelet is the holdable selfhood object. Inside it (on zoom)
      // live the four "let me have a think" options, secondary to the bracelet.
      const opts=['keep','gain','develop','repair'].map(k=>
        `<button type="button" class="bracelet-opt" data-bracelet-opt="${k}" data-bracelet-id="${esc(b.id)}">
          <img src="assets/relationships-${k}.svg" alt="" draggable="false">
          <span>${k[0].toUpperCase()+k.slice(1)}</span>
        </button>`
      ).join('');
      openModal('bracelet-dialog',esc(name),
        `<div class="bracelet-hold"><img src="assets/current/bracelet-placeholder.svg" alt="" draggable="false"><p>Holding ${esc(name)} close.</p></div><div class="bracelet-opts"><p class="note-hint">What do you want for this relationship?</p><div class="bracelet-opts-grid">${opts}</div></div>`,
        ()=>true);
      modal.querySelectorAll('[data-bracelet-opt]').forEach(ob=>ob.addEventListener('click',()=>{
        const bid=ob.dataset.braceletId, opt=ob.dataset.braceletOpt;
        const next=structuredClone(data);
        const br=(next.bracelets||[]).find(x=>x.id===bid);
        if(br){br.intent=opt;save(next);}
        notify(`${name} — ${opt}.`);
        closeModal();
      }));
    }));
  }
  function bindBookDrag(){
    const bmFor=t=>t.classList.contains('trash-bin')?'Discard':{keep:'Keep',undecided:'Undecided',change:'Change'}[t.dataset.level];
    view().querySelectorAll('.story-cover.shelf-book,.story-cover.bin-book').forEach(book=>{
      book.setAttribute('aria-label',(book.querySelector('b')?.textContent||'Story')+'. Drag to another shelf or the bin to change its bookmark, or open it to revisit its words.');
      dragTo(book,'.shelf-level,.trash-bin',target=>{
        const nb=bmFor(target),i=Number(book.dataset.id);
        if(nb&&storyDraft[i]&&storyDraft[i].bookmark!==nb){storyDraft[i].bookmark=nb;notify('Book moved. Its bookmark now reads '+nb+'.');}
        redraw(shelf);
      },null,'book-drag');
    });
  }
  function bindBinLid(){
    const lid=view().querySelector('.bin-lid');if(!lid)return;
    const wrap=lid.closest('.trash-bin-wrap');
    const OPEN_ANGLE=90,SNAP=45;let dragging=false,moved=false,suppressClick=false,startY=0,startAngle=0,angle=0,open=false;
    const setAngle=(a,animate)=>{angle=Math.max(0,Math.min(OPEN_ANGLE,a));lid.style.transition=animate?'transform .3s ease':'none';lid.style.transform=`rotate(${-angle}deg)`;};
    const setOpen=o=>{open=o;wrap.classList.toggle('lid-open',o);document.querySelector('.scn-tip')?.classList.remove('on');lid.dataset.tip=o?'tap to close':'tap to open and view discarded stories';lid.setAttribute('aria-label',o?'Trash bin lid. Tap to close.':'Trash bin lid. Tap to open and view discarded stories.');setAngle(o?OPEN_ANGLE:0,true);};
    lid.addEventListener('pointerdown',e=>{dragging=true;moved=false;startY=e.clientY;startAngle=angle;wrap.classList.add('lid-moving');try{lid.setPointerCapture(e.pointerId);}catch(_){}});
    lid.addEventListener('pointermove',e=>{if(!dragging)return;if(Math.abs(e.clientY-startY)>6)moved=true;setAngle(startAngle+(startY-e.clientY)*0.7,false);});
    const finish=()=>{if(!dragging)return;dragging=false;wrap.classList.remove('lid-moving');if(moved){suppressClick=true;setOpen(angle>SNAP);}else setOpen(open);};
    lid.addEventListener('pointerup',finish);lid.addEventListener('pointercancel',finish);
    lid.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}setOpen(!open);});
    lid.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();setOpen(!open);}});
  }
  function keepStories(){const next=structuredClone(data);next.stories=structuredClone(storyDraft);if(save(next)){notify('Your stories and bookmarks are kept.');return true;}return false;}

  // A category drag creates one leaf; help edits the same unsaved slot.
  function garden(){const slots=Array.from({length:Math.max(4,...Object.keys(data.garden).map(Number).filter(Number.isFinite))+1},(_,i)=>String(i+1));
    const anchors=[[151.65,156.98],[214,114.87],[153.1,72.76],[218,41.8]];
    page('garden','growth','What is the Self that You Want to Grow?','Touch a bud on the plant to grow a leaf where it sits. Write on the leaf — it grows as you write — and swipe across it to flip it over.',
      `<div class="growth-plant">${asset('current/stem','current-stem')}${asset('current/pot','current-pot')}${slots.slice(0,4).map((id,i)=>{
        const g=data.garden[id];
        const photo=g&&g.photos&&g.photos.title;
        const titleText=g?((g.title||'').trim()||g.words||''):'';
        const shape=g?(g.shape||g.category):null;
        const hue=g&&g.hue?` style="filter:hue-rotate(${g.hue}deg)"`:'';
        const leafImg=g?`<img class="saved-leaf" src="assets/current/leaf-${shape}.svg" alt="" draggable="false"${hue}>`:asset('current/leaf-bud','bud-art');
        return `<button class="growing-leaf ${i%2?'right':'left'} ${g?'filled':'bud'}" style="left:${(anchors[i][0]-8)/4.28}%;top:${(anchors[i][1]-8)/3}%;" data-new="garden-slot" data-id="${id}" ${g?'':`title="Grow a leaf"`} aria-label="${esc(g?(leafCaption(g)||'Leaf'):'Grow a leaf')}">${leafImg}${photo?`<span class="leaf-photo" style="-webkit-mask-image:url('assets/current/leaf-${shape}.svg');mask-image:url('assets/current/leaf-${shape}.svg')" aria-hidden="true"><img src="${photo}" alt=""></span>`:''}${g?(titleText?`<span class="leaf-title">${esc(titleText)}</span>`:''):''}</button>`;
      }).join('')}</div>${Object.keys(data.garden).length>=4?'<div class="extra-leaves">'+slots.slice(4).map(id=>{const g=data.garden[id];return g?btn('garden-slot',esc(leafCaption(g)||'Leaf'),'btn2',`data-id="${id}"`):`<button type="button" class="btn2 bud-btn" data-new="garden-slot" data-id="${id}">+ Grow a leaf</button>`;}).join('')+'</div>':''}<p class="note-hint">Keep these words save each leaf on this device.</p><div class="btnrow">${data.growthIntroSeen?btn('exit','Done for now')+btn('growth-continue','Continue guided exploration','btn2'):btn('growth-continue','Continue')+btn('growth-continue','Skip this','note-act')+btn('keep-garden','Keep this collection','btn2')}</div>`);
    // Drag filled leaves to the pocket
    view().querySelectorAll('.growing-leaf.filled').forEach(el=>{
      dragTo(el,'.pocket-btn',target=>{
        if(target.classList.contains('pocket-btn'))addToPocket('leaf',el.dataset.id);
      });
    });
  }
  // Base hues of the leaf artwork, measured from the SVGs (for Appearance tinting).
  const LEAF_HUES={people:182,places:115,interests:37,feelings:352,memories:18,activities:210,traits:262,others:217};
  const SHORT_LABELS={people:'People',places:'Places',interests:'Interests',feelings:'Feelings',memories:'Memories',activities:'Activities',traits:'Traits',others:'Others'};
  function hexHue(hex){
    const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255;
    const mx=Math.max(r,g,b),mn=Math.min(r,g,b);
    if(mx===mn)return 0;
    let h;
    if(mx===r)h=((g-b)/(mx-mn))%6;else if(mx===g)h=(b-r)/(mx-mn)+2;else h=(r-g)/(mx-mn)+4;
    return (h*60+360)%360;
  }
  function hueFor(shapeKey,colorKey){
    const target=hexHue(ITERATION_DATA.leafColors[colorKey]);
    const base=LEAF_HUES[shapeKey]??0;
    let d=Math.round(target-base);
    if(d>180)d-=360;if(d<-180)d+=360;
    return d;
  }
  function leafShape(g){return (g&&(g.shape||g.category))||'people';}
  function leafHue(g){return (g&&g.hue)||0;}

  // ---- Garden leaves: object-centric, in place ----
  // Buds on the plant open into a small writing leaf where they sit. The leaf
  // grows as the user writes; a finger swipe across the leaf flips it to its
  // back (words, photo, theme). Nothing flies anywhere; the hand does it all.
  function editLeaf(id,leafBtn=null){
    if(inlineLeaf)return; // an editor is already open
    openLeafInline(id,leafBtn);
  }
  let inlineLeaf=null;
  // The open leaf editor's root element (for the language helper).
  function editorRoot(){return (inlineLeaf&&inlineLeaf.root)||modal;}
  // Leaf size follows the words: it grows while the user writes.
  function leafGrowthScale(words){
    const n=(words||'').length;
    return 0.62+0.58*Math.min(n/280,1);
  }
  function openLeafInline(id,leafBtn){
    const old=data.garden[id]||null;
    const wasNew=!old;
    const cats=DESIGN['growth-categories'].categories;
    const entry={
      category:(old&&old.category)||'others',
      shape:(old&&(old.shape||old.category))||'others',
      hue:(old&&old.hue)||0,
      words:(old&&old.words)||'',
      title:(old&&old.title)||'',
      photos:Object.assign({},old&&old.photos)
    };
    const catOf=k=>cats.find(c=>c.key===k)||cats.find(c=>c.key==='others');
    leafDraft={id,category:catOf(entry.category),words:entry.words};
    // Anchor the leaf where the bud (or leaf) sits.
    const lr=leafBtn?leafBtn.getBoundingClientRect():{left:innerWidth/2-140,top:innerHeight/2-160,width:280,height:200};
    const W=Math.min(300,innerWidth*0.86),H=Math.min(340,innerHeight*0.7);
    const cx=lr.left+lr.width/2,cy=lr.top+lr.height/2;
    const root=document.createElement('div');
    root.className='inplace-leaf';
    root.style.left=Math.max(8,Math.min(innerWidth-W-8,cx-W/2))+'px';
    root.style.top=Math.max(8,Math.min(innerHeight-H-8,cy-H/2))+'px';
    root.style.width=W+'px';
    const artSrc=k=>`assets/current/leaf-${k}.svg`;
    const hueStyle=()=>` style="filter:${entry.hue?`hue-rotate(${entry.hue}deg) `:``}brightness(0.55)"`;
    const titlePhoto=(entry.photos&&entry.photos.title)||null;
    // The leaf itself is the surface: no card. Front holds the title written
    // on the leaf; the back (mirrored leaf) holds the growing words and theme.
    root.innerHTML=`
      <div class="il-scale">
      <div class="il-flip" tabindex="0" role="group" aria-label="Leaf. Swipe across it, or press the left and right arrow keys, to flip it over.">
        <div class="il-face il-front">
          <img class="il-art" src="${artSrc(entry.shape)}" alt="" draggable="false"${hueStyle()}>
          ${titlePhoto?`<img class="il-title-photo" src="${titlePhoto}" alt="Title photo">`:''}
          <input class="il-title" type="text" maxlength="60" value="${esc(entry.title)}"
            placeholder="A short title…" aria-label="Leaf title — write it on the leaf">
          <span class="il-flip-hint" aria-hidden="true">swipe to flip →</span>
        </div>
        <div class="il-face il-back">
          <img class="il-art" src="${artSrc(entry.shape)}" alt="" draggable="false"${hueStyle()}>
          <div class="il-back-fields">
            ${PhotoBody.field('words','What I want to grow',entry.words,entry.photos.words,{placeholder:'Your own words…'})}
            <p class="il-cap">Theme</p>
            <div class="il-themes" role="group" aria-label="Leaf theme">
              ${cats.map(c=>`<button type="button" class="il-theme${c.key===entry.category?' picked':''}" data-theme="${c.key}" aria-label="${esc(c.label)}" aria-pressed="${c.key===entry.category}"><img src="${artSrc(c.key)}" alt="" draggable="false"></button>`).join('')}
            </div>
            <p class="il-theme-name" data-theme-name>${esc((cats.find(c=>c.key===entry.category)||{}).label||'')}</p>
          </div>
        </div>
      </div>
      </div>
      <div class="il-verbs">
        <button type="button" class="btn2" data-new="garden-language" data-id="${entry.category}">Help me find language</button>
        <button type="button" class="btn2" data-il-done>Done</button>
        <button type="button" class="btn2" data-il-pocket>Put in pocket</button>
        <button type="button" class="note-act" data-il-remove>Remove</button>
      </div>
      <div class="il-verbs-confirm" hidden>
        <span>Remove this leaf?</span>
        <button type="button" class="btn2" data-il-remove-yes>Yes, remove</button>
        <button type="button" class="btn2" data-il-remove-no>Keep it</button>
      </div>`;
    document.body.append(root);
    PhotoBody.bind(root);
    const scaleEl=root.querySelector('.il-scale'),
          flipEl=root.querySelector('.il-flip'),
          titleEl=root.querySelector('.il-title'),
          wordsEl=()=>root.querySelector('textarea[name="words"]');
    if(leafBtn)leafBtn.classList.add('leaf-inline-src');
    const prevOverflow=document.body.style.overflow;
    document.body.style.overflow='hidden';
    inlineLeaf={root,id,wasNew,leafBtn,prevOverflow,closing:false};
    const applyGrowth=()=>{scaleEl.style.transform=`scale(${leafGrowthScale(wordsEl()?.value||entry.words).toFixed(3)})`;};
    applyGrowth();
    let saveTimer=null;
    const collect=()=>{
      const w=wordsEl();
      return {
        category:entry.category,shape:entry.shape,hue:entry.hue,
        color:(catOf(entry.category).color),
        words:w?w.value:entry.words,
        title:titleEl.value.trim(),
        photos:mergePhotos(entry.photos,root,['words'])
      };
    };
    const saveNow=()=>{const e=collect();Object.assign(entry,e);return commit('garden',id,e);};
    const queueSave=()=>{clearTimeout(saveTimer);saveTimer=setTimeout(()=>{saveNow();applyGrowth();},800);};
    titleEl.addEventListener('input',queueSave);
    root.addEventListener('input',e=>{if(e.target.name==='words'){applyGrowth();queueSave();}});
    root.addEventListener('change',e=>{if(e.target.name==='words')queueSave();});
    // Theme swatches: the leaf takes the theme's shape, immediately.
    root.querySelectorAll('.il-theme').forEach(b=>b.addEventListener('click',()=>{
      const key=b.dataset.theme,c=catOf(key);
      entry.category=key;entry.shape=key;leafDraft.category=c;
      const langBtn=root.querySelector('[data-new="garden-language"]');if(langBtn)langBtn.dataset.id=key;
      root.querySelectorAll('.il-theme').forEach(x=>{const on=x===b;x.classList.toggle('picked',on);x.setAttribute('aria-pressed',String(on));});
      const art=root.querySelector('.il-art');
      art.src=artSrc(key);
      const nameEl=root.querySelector('[data-theme-name]');
      if(nameEl)nameEl.textContent=b.getAttribute('aria-label')||'';
      saveNow();
    }));
    // Flip: a quick horizontal swipe across the leaf itself (not its fields).
    let swipe=null;
    const flipTo=back=>flipEl.classList.toggle('flipped',back);
    root.addEventListener('pointerdown',e=>{
      if(e.target.closest('input,textarea,button,select,a'))return;
      swipe={x:e.clientX,y:e.clientY,t:Date.now()};
    });
    root.addEventListener('pointerup',e=>{
      if(!swipe)return;
      const s=swipe;swipe=null;
      const dx=e.clientX-s.x,dy=e.clientY-s.y,dt=Date.now()-s.t;
      if(dt<450&&Math.abs(dx)>48&&Math.abs(dx)>Math.abs(dy)*1.6){
        flipTo(!flipEl.classList.contains('flipped'));
      }
    });
    root.addEventListener('pointercancel',()=>{swipe=null;});
    const onKey=e=>{
      if(!inlineLeaf||inlineLeaf.closing)return;
      if(document.querySelector('dialog[open]'))return;
      if(e.key==='Escape'){e.preventDefault();closeInlineLeaf('done');return;}
      if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&!e.target.closest('input,textarea')&&root.contains(e.target)){
        e.preventDefault();flipTo(!flipEl.classList.contains('flipped'));
      }
    };
    document.addEventListener('keydown',onKey);
    // The leaf's own verbs.
    root.querySelector('[data-il-done]').addEventListener('click',()=>closeInlineLeaf('done'));
    root.querySelector('[data-il-pocket]').addEventListener('click',()=>{saveNow();addToPocket('leaf',id);});
    const verbsRow=root.querySelector('.il-verbs'),confirmRow=root.querySelector('.il-verbs-confirm');
    root.querySelector('[data-il-remove]').addEventListener('click',()=>{verbsRow.hidden=true;confirmRow.hidden=false;});
    root.querySelector('[data-il-remove-no]').addEventListener('click',()=>{verbsRow.hidden=false;confirmRow.hidden=true;});
    root.querySelector('[data-il-remove-yes]').addEventListener('click',()=>{
      inlineLeaf.closing=true;
      remove('garden',id);
      teardown();
      notify('Leaf removed.');
    });
    function teardown(){
      clearTimeout(saveTimer);
      document.removeEventListener('keydown',onKey);
      root.remove();
      document.body.style.overflow=inlineLeaf.prevOverflow;
      if(inlineLeaf.leafBtn)inlineLeaf.leafBtn.classList.remove('leaf-inline-src');
      leafDraft=null;inlineLeaf=null;
      redraw(garden);
      const sel=view().querySelector(`[data-new="garden-slot"][data-id="${id}"]`);
      if(sel)sel.focus({preventScroll:true});
    }
    function closeInlineLeaf(){
      const z=inlineLeaf;
      if(!z||z.closing)return;
      z.closing=true;
      const e=collect();
      const hasContent=(e.words||'').trim()||(e.photos&&e.photos.words)||(e.title||'').trim();
      if(!hasContent){
        if(!z.wasNew)remove('garden',id);
        teardown();
        if(!z.wasNew)notify('Leaf removed.');
        return;
      }
      Object.assign(entry,e);commit('garden',id,e);
      teardown();
    }
    inlineLeaf.close=closeInlineLeaf;
    titleEl.focus({preventScroll:true});
  }
  const language={people:['Company without conversation','A friendship where I can be myself','Community that makes room for me'],places:['A quiet corner of the library','Time in nature','A room with morning light'],interests:['Drawing with no one watching','Something I am curious about','An interest without an outcome'],feelings:['Space for contradictory feelings','A little more ease','Feeling understood'],memories:['A memory I want to revisit','An experience that shaped me'],activities:['Making something with my hands','Moving in a way that feels good'],traits:['My curiosity','My sensitivity','A part of me I am learning to value'],others:['Something I cannot name yet','Something of my own']};
  function languagePicker(key){if(!leafDraft)return;const root=editorRoot();if(!root)return;leafDraft.words=root.querySelector('[name="words"]').value;const parent=root,focus=document.activeElement;const d=document.createElement('dialog');d.className='illustrated-dialog language-dialog';d.innerHTML=`<form class="dialog-surface"><h2>Help me find language</h2><p>${esc(leafDraft.category.label)}</p><div class="language-options">${language[key].map(s=>`<button type="button" class="btn2" data-suggestion="${esc(s)}">${esc(s)}</button>`).join('')}</div>${field('My words',leafDraft.words,'words','Choose some words or write your own.')}<div class="btnrow"><button class="btn" type="submit">Use these words</button><button class="note-act" type="button" data-language-back>Back to leaf</button></div></form>`;document.body.append(d);d.showModal();const close=()=>{d.close();d.remove();focus.focus();};d.addEventListener('cancel',e=>{e.preventDefault();close();});d.addEventListener('click',e=>{const b=e.target.closest('[data-suggestion]');if(b)d.querySelector('textarea').value=b.dataset.suggestion;if(e.target.closest('[data-language-back]')||e.target===d)close();});d.querySelector('form').onsubmit=e=>{e.preventDefault();leafDraft.words=d.querySelector('textarea').value;parent.querySelector('textarea').value=leafDraft.words;close();};}
  // Only the currently picked-up object is retained by global cancellation.
  // Detached page controls keep their own listeners and can be garbage-collected.
  let cancelActiveDrag=null;
  function dragTo(el,selector,drop,preview,ghostClass){
    let drag=null,timer;el.style.touchAction='auto';
    const clean=()=>{clearTimeout(timer);drag?.ghost?.remove();document.querySelectorAll('.store-drop-active').forEach(x=>x.classList.remove('store-drop-active'));drag=null;if(cancelActiveDrag===cancel)cancelActiveDrag=null;if(typeof sleepPocket==='function')sleepPocket();};
    const suppress=()=>{el.dataset.suppressClick='yes';setTimeout(()=>delete el.dataset.suppressClick,300);};
    const cancel=()=>{if(drag){suppress();clean();}};
    const down=(e,touch=false)=>{cancelActiveDrag?.();cancelActiveDrag=cancel;drag={x:e.clientX,y:e.clientY,moved:false,ghost:null,ready:!touch,touch};if(touch)timer=setTimeout(()=>{if(drag)drag.ready=true;},250);else{e.preventDefault();el.setPointerCapture(e.pointerId);}};
    // Rect-based hit test: elementFromPoint is unreliable while pointer capture is held (Chromium),
    // so find the topmost drop target geometrically instead.
    const targetAt=(x,y)=>{const els=document.querySelectorAll(selector);for(let i=els.length-1;i>=0;i--){const r=els[i].getBoundingClientRect();if(x>=r.left&&x<=r.right&&y>=r.top&&y<=r.bottom)return els[i];}return null;};
    const move=e=>{if(!drag)return;const distance=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);if(!drag.ready){if(distance>6)clean();return;}if(distance>6)drag.moved=true;if(!drag.moved)return;if(!drag.ghost){drag.ghost=document.createElement('div');drag.ghost.innerHTML=preview?asset(preview):el.classList.contains('store-basket')?el.parentElement.innerHTML:el.innerHTML;drag.ghost.className='drag-preview'+(ghostClass?' '+ghostClass:'');document.body.append(drag.ghost);if(typeof wakePocket==='function')wakePocket();}document.querySelectorAll('.store-drop-active').forEach(x=>x.classList.remove('store-drop-active'));const hoverEl=targetAt(e.clientX,e.clientY);hoverEl?.classList.add('store-drop-active');if(typeof pocketDroppable==='function')pocketDroppable(hoverEl?.classList?.contains('pocket-btn'));drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';if(e.clientY<60)window.scrollBy(0,-12);if(e.clientY>innerHeight-60)window.scrollBy(0,12);};
    const finish=e=>{if(!drag)return;const moved=drag.moved;clean();if(moved){const target=targetAt(e.clientX,e.clientY);suppress();if(target)drop(target);}};
    el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0)down(e);});el.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'){if(drag)e.preventDefault();move(e);}});el.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')finish(e);});el.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')clean();});
    el.addEventListener('touchstart',e=>{if(e.touches.length===1)down(e.touches[0],true);},{passive:true});el.addEventListener('touchmove',e=>{if(drag?.ready&&e.cancelable)e.preventDefault();if(e.touches.length===1)move(e.touches[0]);},{passive:false});el.addEventListener('touchend',e=>{if(drag?.moved&&e.cancelable)e.preventDefault();if(e.changedTouches[0])finish(e.changedTouches[0]);},{passive:false});el.addEventListener('touchcancel',clean);
  }

  function influences(){if(!influenceDraft)influenceDraft=structuredClone(data.influences);influenceDraft._photos=influenceDraft._photos||{};
    const prompts=[['opens','What it opens up for me'],['pressures','What pressures it introduces'],['place','What place I want it to have']];
    page('influences','influences','An influence','People, works, or places that helped you grow\u2014or make you think, \u201cI want to be a little more like that.\u201d Write a name, a title, or a few words on any object \u2014 or tap the camera button on a field to use a photo of your handwriting instead. Tap an object to open its three reflections. One is enough; you can use more than one.',
    `<div class="influence-objects">${DESIGN['influence-writing-objects'].items.map(item=>{
      const key=item.key;
      const fieldsHtml=item.fields.map((f,i)=>{const fkey=key+'-'+i,ph=influenceDraft._photos[fkey];
        return `<div class="influence-field" data-pb-field="${fkey}" style="left:${f.x/2.06}%;top:${f.y/1.84}%;width:${f.w/2.06}%;height:${f.h/1.84}%"><div class="pb-text"${ph?' hidden':''}><textarea aria-label="${esc(item.name+' '+(i+1))}" data-influence="${fkey}" placeholder="${esc(f.text)}">${esc(influenceDraft[fkey]||'')}</textarea></div><div class="pb-photo"${ph?'':' hidden'}><img${ph?` src="${ph}"`:''} alt="Your photo"></div><button type="button" class="influence-photo-btn" data-pb-add="${fkey}" aria-label="Add a photo instead of writing"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></div>`;}).join('');
      const reflectHtml=prompts.map(([pk,pl])=>`<label class="new-field"><span>${pl}</span><textarea data-influence-reflect="${key}-${pk}" rows="2" placeholder="Your own words\u2026">${esc(influenceDraft[key+'-'+pk]||'')}</textarea></label>`).join('');
      return `<div class="influence-object" data-influence-object="${key}">
        <div class="influence-tap" data-influence-tap="${key}" role="button" tabindex="0" aria-expanded="false" aria-label="${esc(item.name)} \u2014 tap to open its three reflections">
          ${asset('current/influence-'+key)}${fieldsHtml}
        </div>
        <div class="influence-reflect" hidden>
          ${reflectHtml}
          <button type="button" class="btn2" data-influence-pocket="${key}">Put in pocket</button>
        </div>
      </div>`;}).join('')}</div>`);
    const v=view();
    // Autosave: no Keep button needed.
    let saveT=null;
    const queueSave=()=>{clearTimeout(saveT);saveT=setTimeout(()=>{const next=structuredClone(data);next.influences=structuredClone(influenceDraft);save(next);},800);};
    v.querySelectorAll('[data-influence]').forEach(el=>el.addEventListener('input',()=>{influenceDraft[el.dataset.influence]=el.value;queueSave();}));
    v.querySelectorAll('[data-influence-reflect]').forEach(el=>el.addEventListener('input',()=>{influenceDraft[el.dataset.influenceReflect]=el.value;queueSave();}));
    const toggleReflect=b=>{const obj=b.closest('.influence-object');const panel=obj.querySelector('.influence-reflect');
      const open=panel.hidden;panel.hidden=!open;b.setAttribute('aria-expanded',String(open));};
    // Delegated: survives re-renders.
    v.addEventListener('click',e=>{
      const pb=e.target.closest&&e.target.closest('[data-influence-pocket]');
      if(pb){addToPocket('influence',pb.dataset.influencePocket);return;}
      const tap=e.target.closest('[data-influence-tap]');
      if(tap&&!e.target.closest('button,textarea,input'))toggleReflect(tap);
    });
    v.addEventListener('keydown',e=>{
      const tap=e.target.closest('[data-influence-tap]');
      if(tap&&(e.key==='Enter'||e.key===' ')){e.preventDefault();toggleReflect(tap);}
    });
    PhotoBody.reset(v);PhotoBody.bind(v,(name,url)=>{influenceDraft._photos=influenceDraft._photos||{};if(url)influenceDraft._photos[name]=url;else delete influenceDraft._photos[name];queueSave();});
  }

  // Nine individually saved paper stars in a glass jar, with independent, optional continuous ratings.
  // Stars in the jar are communities kept in the user's life; stars outside the jar are put aside for now.
  function contracts(){
    const entries=DESIGN['community-contract-scrolls'].entries;
    const star=s=>{
      const entry=data.contracts[s.key]||{};
      const name=((entry.fields||{}).Name||'').trim()||'Star '+s.key;
      return `<button class="paper-star" data-new="contract" data-id="${s.key}" aria-label="Open the paper star for ${esc(name)}">${paperStarSVG()}<span>${esc(name)}</span></button>`;
    };
    const inside=entries.filter(s=>((data.contracts[s.key]||{}).placement||'inside')!=='outside');
    const outside=entries.filter(s=>((data.contracts[s.key]||{}).placement||'inside')==='outside');
    page('contracts','community','Communities: A Jar of Paper Stars','Take a paper star from the jar to unfold it. Each star holds one community — what it asks of you, what you receive there, and how you feel in it.',
    `<div class="star-scene">
      <div class="star-zone"><div class="star-jar" role="group" aria-label="Glass jar"><div class="star-jar-stars">${inside.map(star).join('')||'<p class="star-empty">The jar is empty.</p>'}</div></div><p class="zone-caption">In the jar — keeping in my life</p></div>
      <div class="star-zone"><div class="star-outside" role="group" aria-label="Outside the jar">${outside.map(star).join('')||'<p class="star-empty">Nothing put aside right now.</p>'}</div><p class="zone-caption">Outside the jar — put aside for now</p></div>
    </div><p class="note-hint">Take a star from the jar to unfold it. Drag a star in or out of the jar to change where it lives.</p>`);
    view().querySelectorAll('.paper-star').forEach(el=>{
      dragTo(el,'.star-jar,.star-outside,.pocket-btn',target=>{
        if(target.classList.contains('pocket-btn')){addToPocket('star',el.dataset.id);return;}
        const place=target.classList.contains('star-outside')?'outside':'inside';
        const cur=data.contracts[el.dataset.id]||{fields:{},ratings:{}};
        if((cur.placement||'inside')===place)return;
        if(commit('contracts',el.dataset.id,{...cur,placement:place})){
          notify(place==='inside'?'Star kept in the jar — keeping in my life.':'Star moved outside the jar — put aside for now.');
          redraw(contracts);
        }
      });
    });
  }
  function contract(id,starBtn=null){activeContract=id;
    const draft=structuredClone(data.contracts[id]||{fields:{},ratings:{}});draft.placement=draft.placement||'inside';const labels=DESIGN['community-feeling-sliders'].labels;const cfields=DESIGN['community-contract-scrolls'].fields;const cph=['Community, group, or shared setting…','How much is expected, and how freely chosen?','The terms and responsibilities as they stand…','What I willingly stand behind…','What I would change, negotiate, or leave open…'];
    // (Obligation + appreciation + investment now live in the bond scene below.)
    // (See bond scene.)
    // Where the star lives: in the jar (keeping in my life) or outside it (put aside for now).
    const placeBlock=`<div class="star-placement"><h3 class="serif">Where does this star live?</h3><div class="btnrow" role="group" aria-label="Star placement"><button type="button" class="${draft.placement==='inside'?'btn':'btn2'}" data-place="inside" aria-pressed="${draft.placement==='inside'}">In the jar — keeping in my life</button><button type="button" class="${draft.placement==='outside'?'btn':'btn2'}" data-place="outside" aria-pressed="${draft.placement==='outside'}">Outside the jar — put aside for now</button></div></div>`;
    const oblWeight=draft.fields['Obligation weight']??50;
    const oblText=esc(draft.fields['Obligation level']||'');
    const appAmt=draft.fields['Appreciation amount']??50;
    const appText=esc(draft.fields['Appreciation']||'');
    // Migrate old pot-index investment (0-4) to distance (0-100).
    let bondDist=draft.investment;
    if(bondDist==null)bondDist=50;
    else if(bondDist<=4)bondDist=Math.round(bondDist/4*100);
    bondDist=Math.max(0,Math.min(100,bondDist));
    const bondScene=`
      <div class="bond-scene">
        <div class="bond-stage" data-bond-stage>
          <div class="bond-self" aria-hidden="true">
            <svg viewBox="0 0 40 84"><circle cx="20" cy="12" r="9" fill="#f5f0e6" stroke="#5a4a3a" stroke-width="3"/><line x1="20" y1="21" x2="20" y2="50" stroke="#5a4a3a" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="28" x2="6" y2="40" stroke="#5a4a3a" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="28" x2="34" y2="40" stroke="#5a4a3a" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="50" x2="10" y2="80" stroke="#5a4a3a" stroke-width="3" stroke-linecap="round"/><line x1="20" y1="50" x2="30" y2="80" stroke="#5a4a3a" stroke-width="3" stroke-linecap="round"/></svg>
            <span>You</span>
          </div>
          <div class="bond-arrow" data-bond-arrow aria-hidden="true"></div>
          <span class="bond-arrow-label">How invested or distanced do you want to be? Drag the stone and gift nearer or further.</span>
          <div class="bond-pair" data-bond-pair tabindex="0" role="slider" aria-label="How invested or distanced do you want to be" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${bondDist}">
            <div class="bond-item">
              <div class="contract-rock" data-rock data-stone data-aspect="0.876" role="slider" tabindex="0" aria-label="How heavy the obligations are. Press and hold the stone to feel its weight." aria-valuemin="0" aria-valuemax="100" aria-valuenow="${oblWeight}"><img src="assets/current/contract-rock.svg" alt="" draggable="false"><textarea name="Obligation level" aria-label="What the obligations are" placeholder="${esc(cph[1])}">${oblText}</textarea></div>
              <span class="bond-info">Obligations this community wants from me</span>
              <input type="hidden" name="Obligation weight" value="${oblWeight}" data-obl-input>
              <div class="bond-readout"><span>How heavy this feels</span><b data-obl-val>${oblWeight}</b></div>
              <p class="bond-hint">Press and hold the stone to feel its weight.</p>
            </div>
            <div class="bond-item">
              <div class="contract-rock" data-rock data-gift data-aspect="1" role="slider" tabindex="0" aria-label="How much appreciation is expressed. Drag the heart open with a finger." aria-valuemin="0" aria-valuemax="100" aria-valuenow="${appAmt}"><div class="gift-glow" aria-hidden="true"></div><img src="assets/current/contract-gift.svg" alt="" draggable="false"><textarea name="Appreciation" aria-label="What I appreciate getting" placeholder="What you receive here that you actually want…">${appText}</textarea></div>
              <span class="bond-info">What I can count on this community for</span>
              <input type="hidden" name="Appreciation amount" value="${appAmt}" data-app-input>
              <div class="bond-readout"><span>Appreciation expressed</span><b data-app-val>${appAmt}</b></div>
              <p class="bond-hint">Drag the heart open with a finger.</p>
            </div>
          </div>
        </div>
      </div>`;
    openModal('contract-dialog','My Assessment of This Community',`
      <label class="new-field"><span>The Name I Use for This Community:</span><input type="text" name="Name" maxlength="60" value="${esc(draft.fields['Name']||'')}" placeholder="${esc(cph[0])}"></label>
      ${bondScene}
      <h3 class="serif">In this community, I feel:</h3><div class="feeling-sliders">${labels.map((label,i)=>`<div class="feeling-column"><div class="face-slider" role="slider" tabindex="0" aria-label="${label}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${draft.ratings[label]??50}" aria-valuetext="${draft.ratings[label]==null?'Unanswered':draft.ratings[label]+' out of 100'}" data-rating="${label}"><span class="slider-rail"></span><span class="slider-face">${[0,1,2,3,4].map(n=>asset('current/face-'+n,'face-stage stage-'+n)).join('')}</span></div><span class="feeling-label">${label}</span><output>${draft.ratings[label]==null?'Not set':Math.round(draft.ratings[label])}</output></div>`).join('')}</div>${placeBlock}`,values=>{draft.fields=values;if(!commit('contracts',id,draft))return false;redraw(contracts);returnFocus=view().querySelector(`[data-new="contract"][data-id="${id}"]`);notify('Star kept.');});
    PhotoBody.bind(modal);
    modal.classList.add('star-dialog');
    // Pocket button in the btnrow
    const cRow=modal.querySelector('form > .btnrow');
    if(cRow){
      const pb=document.createElement('button');
      pb.type='button';pb.className='btn2';pb.textContent='Put in pocket';
      pb.addEventListener('click',()=>addToPocket('star',id));
      cRow.append(pb);
    }
    // Placement buttons: no data-new, so the global click handler ignores them.
    modal.querySelectorAll('[data-place]').forEach(b=>b.addEventListener('click',()=>{
      draft.placement=b.dataset.place;
      modal.querySelectorAll('[data-place]').forEach(x=>{const on=x===b;x.setAttribute('aria-pressed',String(on));x.classList.toggle('btn',on);x.classList.toggle('btn2',!on);});
    }));
    modal.querySelectorAll('.face-slider').forEach(slider=>{
      const label=slider.dataset.rating,face=slider.querySelector('.slider-face'),output=slider.parentElement.querySelector('output');let dragging=false;
      const paint=()=>{const value=draft.ratings[label]??50;face.style.bottom=value+'%';const k=value/25;slider.querySelectorAll('.face-stage').forEach((el,i)=>el.style.opacity=Math.max(0,1-Math.abs(k-i)));slider.setAttribute('aria-valuenow',Math.round(value));slider.setAttribute('aria-valuetext',draft.ratings[label]==null?'Unanswered':Math.round(value)+' out of 100');output.textContent=draft.ratings[label]==null?'Not set':Math.round(value);};
      const set=value=>{draft.ratings[label]=Math.max(0,Math.min(100,value));paint();};
      const at=e=>{const r=slider.getBoundingClientRect();set((r.bottom-e.clientY)/r.height*100);};
      slider.addEventListener('pointerdown',e=>{e.preventDefault();dragging=true;slider.setPointerCapture(e.pointerId);slider.focus({preventScroll:true});at(e);});
      slider.addEventListener('pointermove',e=>{if(dragging){e.preventDefault();at(e);}});slider.addEventListener('pointerup',()=>dragging=false);slider.addEventListener('pointercancel',()=>dragging=false);
      slider.addEventListener('keydown',e=>{const v=draft.ratings[label]??50;const vals={ArrowUp:v+1,ArrowRight:v+1,ArrowDown:v-1,ArrowLeft:v-1,PageUp:v+10,PageDown:v-10,Home:0,End:100};if(e.key in vals){e.preventDefault();set(vals[e.key]);}});paint();
    });
    initBondScene(modal,draft,bondDist);
  }

  // Bond scene: the stone + gift-box stick together as one draggable unit.
  // Dragging them nearer to / further from the stickman sets how invested
  // (near) or distanced (far) you want to be. The double-headed arrow always
  // spans from the stickman to the pair.
  function initBondScene(modal,draft,initialDist){
    const stage=modal.querySelector('[data-bond-stage]');if(!stage)return;
    const pair=stage.querySelector('[data-bond-pair]'),arrow=stage.querySelector('[data-bond-arrow]');
    let dist=Math.max(0,Math.min(100,initialDist??50));
    const pairW=()=>pair.getBoundingClientRect().width;
    const stageW=()=>stage.getBoundingClientRect().width;
    // Pair's left edge ranges from just right of the stickman to stage right edge.
    const minX=()=>70, maxX=()=>Math.max(minX()+10,stageW()-pairW()-12);
    const distToPx=d=>minX()+d/100*(maxX()-minX());
    const paint=()=>{
      const x=distToPx(dist);
      pair.style.left=x+'px';
      // Arrow from stickman (fixed at left) to the pair.
      const selfR=stage.querySelector('.bond-self').getBoundingClientRect();
      const stageR=stage.getBoundingClientRect();
      const pairR=pair.getBoundingClientRect();
      const x1=selfR.right-stageR.left+6, x2=pairR.left-stageR.left-6;
      arrow.style.left=x1+'px';
      arrow.style.width=Math.max(8,x2-x1)+'px';
      pair.setAttribute('aria-valuenow',Math.round(dist));
      pair.setAttribute('aria-valuetext',Math.round(dist)+' out of 100, '+(dist<33?'near':dist>66?'far':'in the middle'));
      draft.investment=Math.round(dist);
    };
    // The stone: press and hold it to feel the weight of the obligations.
    // The hold itself is the measurement — a brief touch is light, a long
    // hold is heavy. The stone grows with the weight while it is held.
    const stone=stage.querySelector('[data-stone]');
    const oblInput=stage.querySelector('[data-obl-input]'),oblVal=stage.querySelector('[data-obl-val]');
    let obl=Math.max(0,Math.min(100,Number(draft.fields['Obligation weight']??50)));
    const HOLD_MS=3000;
    const paintStone=()=>{
      const px=Math.round(100+obl/100*40);
      stone.style.width=px+'px';stone.style.height=Math.round(px*0.876)+'px';
      stone.setAttribute('aria-valuenow',Math.round(obl));
      stone.setAttribute('aria-valuetext',Math.round(obl)+' out of 100');
      if(oblVal)oblVal.textContent=Math.round(obl);
      if(oblInput)oblInput.value=Math.round(obl);
    };
    let holdRaf=0,holdStart=0;
    const stepHold=t=>{
      const k=Math.min(1,(t-holdStart)/HOLD_MS);
      obl=Math.round(k*100);paintStone();
      holdRaf=k<1?requestAnimationFrame(stepHold):0;
    };
    const endHold=()=>{if(holdRaf)cancelAnimationFrame(holdRaf);holdRaf=0;stone.classList.remove('holding');};
    stone.addEventListener('pointerdown',e=>{
      if(e.target.closest('textarea'))return;
      e.preventDefault();e.stopPropagation();
      try{stone.setPointerCapture(e.pointerId);}catch(_){}
      holdStart=performance.now();
      if(holdRaf)cancelAnimationFrame(holdRaf);
      holdRaf=requestAnimationFrame(stepHold);
      stone.classList.add('holding');
    });
    stone.addEventListener('pointerup',endHold);
    stone.addEventListener('pointercancel',endHold);
    stone.addEventListener('keydown',e=>{
      const vals={ArrowUp:5,ArrowRight:5,ArrowDown:-5,ArrowLeft:-5,PageUp:15,PageDown:-15,Home:0,End:100};
      if(e.key in vals){e.preventDefault();const v=vals[e.key];obl=Math.max(0,Math.min(100,(v===0||v===100)?v:obl+v));paintStone();}
    });
    paintStone();
    // The heart: drag its lid open with a finger. Open = appreciation
    // expressed; closed = kept inside. It stays where the hand leaves it.
    const gift=stage.querySelector('[data-gift]');
    const giftImg=gift.querySelector('img'),glow=gift.querySelector('.gift-glow');
    const appInput=stage.querySelector('[data-app-input]'),appVal=stage.querySelector('[data-app-val]');
    let app=Math.max(0,Math.min(100,Number(draft.fields['Appreciation amount']??50)));
    const paintGift=()=>{
      const k=app/100;
      giftImg.style.transform=`translateY(${(-k*14).toFixed(1)}px) rotate(${(-k*4).toFixed(1)}deg)`;
      if(glow)glow.style.opacity=k.toFixed(2);
      gift.setAttribute('aria-valuenow',Math.round(app));
      gift.setAttribute('aria-valuetext',Math.round(app)+' out of 100, '+(app<33?'kept inside':app>66?'expressed':'ajar'));
      if(appVal)appVal.textContent=Math.round(app);
      if(appInput)appInput.value=Math.round(app);
    };
    let lidDrag=null;
    gift.addEventListener('pointerdown',e=>{
      if(e.target.closest('textarea'))return;
      e.preventDefault();e.stopPropagation();
      try{gift.setPointerCapture(e.pointerId);}catch(_){}
      lidDrag={y:e.clientY,app};gift.classList.add('lidding');
    });
    gift.addEventListener('pointermove',e=>{
      if(!lidDrag)return;e.preventDefault();
      app=Math.max(0,Math.min(100,lidDrag.app+(lidDrag.y-e.clientY)/1.2));
      paintGift();
    });
    const endLid=()=>{lidDrag=null;gift.classList.remove('lidding');};
    gift.addEventListener('pointerup',endLid);
    gift.addEventListener('pointercancel',endLid);
    gift.addEventListener('keydown',e=>{
      const vals={ArrowUp:5,ArrowRight:5,ArrowDown:-5,ArrowLeft:-5,PageUp:15,PageDown:-15,Home:0,End:100};
      if(e.key in vals){e.preventDefault();const v=vals[e.key];app=Math.max(0,Math.min(100,(v===0||v===100)?v:app+v));paintGift();}
    });
    gift.style.width='120px';gift.style.height='120px';
    paintGift();
    let dragging=false,startX=0,startDist=0;
    const toPx=clientX=>{const r=stage.getBoundingClientRect();return clientX-r.left;};
    pair.addEventListener('pointerdown',e=>{
      if(e.target.closest('textarea,input,button,[data-stone],[data-gift]'))return; // let form controls and object gestures work
      e.preventDefault();dragging=true;pair.setPointerCapture(e.pointerId);
      startX=e.clientX;startDist=dist;pair.classList.add('dragging');
    });
    pair.addEventListener('pointermove',e=>{
      if(!dragging)return;e.preventDefault();
      const dx=e.clientX-startX; // pixels
      const rangePx=maxX()-minX();
      dist=Math.max(0,Math.min(100,startDist+dx/rangePx*100));
      paint();
    });
    const endDrag=()=>{if(!dragging)return;dragging=false;pair.classList.remove('dragging');};
    pair.addEventListener('pointerup',endDrag);
    pair.addEventListener('pointercancel',endDrag);
    pair.addEventListener('keydown',e=>{
      const vals={ArrowLeft:-2,ArrowRight:2,ArrowUp:2,ArrowDown:-2,PageUp:10,PageDown:-10,Home:0,End:100};
      if(e.key in vals){e.preventDefault();dist=Math.max(0,Math.min(100,(vals[e.key]===0||vals[e.key]===100)?vals[e.key]:dist+vals[e.key]));paint();}
    });
    // Paint after layout settles.
    requestAnimationFrame(()=>{paint();});
    window.addEventListener('resize',paint);
  }
  function saveCollection(kind){let sections=[];let title='';if(kind==='gems'){title='Aspects of my self';sections=Object.values(data.gems).map(x=>({label:(x.title||'').trim()||x.aspect,value:x.draws||x.aspect}));}if(kind==='spaces'){title='Spaces for my self';sections=Object.values(data.spaces).map((x,i)=>({label:'Space '+(i+1),value:x.words}));}if(kind==='garden'){title='The self I want to grow';sections=Object.values(data.garden).map(x=>({label:DESIGN['growth-categories'].categories.find(c=>c.key===x.category)?.label||'Growing',value:x.words}));}if(kind==='contracts'){title='My community paper stars';sections=Object.values(data.contracts).flatMap(x=>Object.entries(x.fields).filter(([,v])=>v.trim()).map(([label,value])=>({label:(x.fields.Name||'Community')+' · '+label,value})));}if(!sections.length){notify('You can keep a few words first, or leave this open.');return;}ROOM.keepExploration(title,sections,'story',kind==='gems'?data.attachments.map(a=>({type:a.type,id:a.id})):[]);}
  const routes={garden,spaces,gems,story,influences,contracts,'story-shelf':shelf,'my-stories':myStories,'my-people':myPeople,
    'elemental-fury':()=>ELEMENTAL.openRoom('fury'),'elemental-grief':()=>ELEMENTAL.openRoom('grief')};
  function enhance(){
    const home=view().querySelector('[data-od-id="home"]'),longer=view().querySelector('[data-od-id="longer-explorations"]');
    if(home){const pairs=[['.pv-plant','plant'],['.pv-torch','room-torch'],['.pv-magnet','magnet'],['.pv-book','book'],['.pv-pair','coffee-cups'],['.pv-circle','table'],['.pv-shovel','shovel'],['.o-plant .spot-art','plant'],['.o-torch .spot-art','torch'],['.o-magnet .spot-art','magnet'],['.o-book .spot-art','book'],['.o-pair .spot-art','coffee-cups'],['.o-circle .spot-art','table'],['.o-shovel .spot-art','shovel']];for(const [selector,name]of pairs){const el=view().querySelector(selector);if(el&&!el.dataset.updated){el.dataset.updated='true';el.innerHTML=name==='plant'?ROOM_LAYOUT.plantArt():asset('current/'+({book:'story-room','coffee-cups':'cups'}[name]||name));el.classList.add('current-miniature');if(name==='torch')el.classList.add('upward-torch');}}}
    if(longer)ROOM_LAYOUT.enhance(longer);
  }
  function refresh(){const id=view().querySelector('[data-page]')?.dataset.page;const map={'garden':garden,'spaces':spaces,'gems':gems,'story-book':story,'story-shelf':shelf,'influences':influences,'contracts':contracts};if(map[id])redraw(map[id]);if(view().querySelector('[data-od-id=longer-explorations]'))redraw(UI.renderLongerExplorations);enhance();}
  function init(){
    document.addEventListener('keydown',e=>{if(e.key==='Escape')cancelActiveDrag?.();});
    window.addEventListener('my-presence-navigation',()=>cancelActiveDrag?.());
    const overrides={'open-practice':'garden','open-lamp-room':'spaces','open-explore':'gems','open-story':'story-shelf','open-influence':'influences','open-belonging':'contracts','open-fury-room':'elemental-fury','open-grief-room':'elemental-grief'};
    document.addEventListener('click',e=>{
      const el=e.target.closest('button');if(!el)return;
      if(el.dataset.suppressClick){e.preventDefault();e.stopImmediatePropagation();return;}
      if(pendingStoryReview&&['s-keep-own','s-keep-with'].includes(el.dataset.ract)){if(!keepStories()){e.preventDefault();e.stopImmediatePropagation();return;}pendingStoryReview=false;}
      const route=overrides[el.dataset.ract];if(route){e.preventDefault();e.stopImmediatePropagation();routes[route]();return;}
      if(el.dataset.act==='export-data'){e.preventDefault();e.stopImmediatePropagation();const stores={};for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('fsaw.')||k.startsWith('fsaw-'))stores[k]=localStorage.getItem(k);}const url=URL.createObjectURL(new Blob([JSON.stringify({format:'my-presence-backup',version:1,exportedAt:new Date().toISOString(),stores},null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='my-presence-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);notify('Your backup includes explorations, arrangements, and scenarios.');return;}
      if(el.dataset.act==='delete-data'){e.preventDefault();e.stopImmediatePropagation();if(!confirm('Delete all My Presence data saved in this browser? This cannot be undone. Export a backup first if you want to keep it.'))return;const keys=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k.startsWith('fsaw.')||k.startsWith('fsaw-'))keys.push(k);}keys.forEach(k=>localStorage.removeItem(k));data=empty();storyDraft=null;influenceDraft=null;window.location.reload();return;}
      if(el.dataset.ract==='open-contrib'){e.preventDefault();e.stopImmediatePropagation();ITERATION.contributions();return;}const a=el.dataset.new;if(!a)return;e.preventDefault();e.stopImmediatePropagation();const id=el.dataset.id;
      if(routes[a]){routes[a]();if(a==='story-shelf'){window.scrollTo(0,shelfScroll);view().querySelector(`[data-new="story-open"][data-id="${storyIndex}"]`)?.focus({preventScroll:true});}return;}
      const actions={
        appearance,'appearance-choice':()=>{const next=structuredClone(data);next.appearance=id;if(save(next)){closeModal();redraw(spaces);view().querySelector('[data-new="appearance"]')?.focus();}},'close-modal':closeModal,exit:()=>NAV.exit(),space:()=>editSpace(id),gem:()=>{const k=Number(el.dataset.kindled||0);delete el.dataset.kindled;if(Date.now()-k<2000)editGem(id);},contract:()=>holdStar(id),arrangement:()=>ROOM.openArrangement(id),
        'story-open':()=>{shelfScroll=window.scrollY;storyIndex=Number(id);story();},'story-prev':()=>{storyIndex--;redraw(story);},'story-next':()=>{storyIndex++;redraw(story);},'story-add':()=>{ensureStories();storyDraft.push(blankStory());storyIndex=storyDraft.length-1;redraw(story);},
        bookmark:()=>{storyDraft[storyIndex].bookmark=el.dataset.value;redraw(story);},'bookmark-remove':()=>{storyDraft[storyIndex].bookmark=null;redraw(story);},'story-save':keepStories,'story-review':()=>{pendingStoryReview=true;ROOM.reviewStories(storyDraft);},
        'garden-slot':()=>editLeaf(id,el),'garden-language':()=>languagePicker(id),
        'language-pick':()=>{modal.querySelector('[name="words"]').value=el.dataset.value;modal.querySelector('[name="words"]').focus();},
        'growth-continue':()=>ROOM.continueGrowth(Object.values(data.garden).map(x=>x.words).join('\n')),
        'keep-garden':()=>saveCollection('garden'),'keep-spaces':()=>saveCollection('spaces'),'keep-gems':()=>saveCollection('gems'),'keep-contracts':()=>saveCollection('contracts'),
        'elemental-view':()=>ELEMENTAL.openKept(id),
      };actions[a]?.();
    },true);
    new MutationObserver(enhance).observe(view(),{childList:true,subtree:true});enhance();
    updatePocketBadge();
  }
  // Pocket: up to 3 individual leaves, stars, or check-ins for quick access.
  const POCKET_MAX=3;
  function pocketBtn(){return document.querySelector('.pocket-btn');}
  function updatePocketBadge(){
    const btn=pocketBtn();if(!btn)return;
    const count=(data.pocket||[]).length;
    const badge=btn.querySelector('.pocket-count');
    if(badge){badge.hidden=count===0;badge.textContent=count;}
    btn.setAttribute('aria-label',count?`Pocket, ${count} of ${POCKET_MAX}`:'Pocket, empty');
  }
  function wakePocket(){pocketBtn()?.classList.add('wake');}
  function sleepPocket(){const b=pocketBtn();if(b){b.classList.remove('wake');b.classList.remove('droppable');}}
  function pocketDroppable(on){pocketBtn()?.classList.toggle('droppable',!!on);}
  function addToPocket(kind,id){
    data.pocket=data.pocket||[];
    if(data.pocket.some(p=>p.kind===kind&&p.id===id)){notify('Already in your pocket.');return false;}
    if(data.pocket.length>=POCKET_MAX){notify(`Pocket is full (3). Take one out first.`);return false;}
    const next=structuredClone(data);next.pocket=[...data.pocket,{kind,id}];
    if(!save(next))return false;
    updatePocketBadge();notify('Put in your pocket.');
    return true;
  }
  function removeFromPocket(index){
    const next=structuredClone(data);next.pocket=(data.pocket||[]).filter((_,i)=>i!==index);
    if(save(next)){updatePocketBadge();return true;}return false;
  }
  function pocketItemLabel(p){
    if(p.kind==='leaf'){const g=data.garden[p.id];return g?((g.title||'').trim()||g.words||'Leaf'):'Leaf';}
    if(p.kind==='star'){const c=data.contracts[p.id];const n=c&&c.fields&&c.fields.Name;return (n||'').trim()||'Star';}
    if(p.kind==='checkin'){
      try{
        const sc=JSON.parse(localStorage.getItem('fsaw.scenarios.v1')||'{}');
        const item=sc[p.id]||(sc.scenarios&&sc.scenarios[p.id]);
        return (item&&(item.name||item.title)||'').trim()||'Check-in';
      }catch(e){return 'Check-in';}
    }
    if(p.kind==='influence'){
      const item=(DESIGN['influence-writing-objects'].items||[]).find(x=>x.key===p.id);
      const name=(data.influences&&data.influences[p.id+'-0']||'').trim();
      return name||(item?item.name:'Influence');
    }
    if(p.kind==='log'){
      try{
        const fs=JSON.parse(localStorage.getItem('fsaw.fury.v1')||'{}');
        const piece=(fs.pieces||[]).find(x=>x.id===p.id);
        return (piece&&(piece.title||'').trim())||'Burning log';
      }catch(e){return 'Burning log';}
    }
    if(p.kind==='story'){
      const st=(data.stories||[]).find(x=>x.id===p.id);
      return (st&&((st.source||'').trim()||(st.words||'').trim().slice(0,30)))||'Story';
    }
    if(p.kind==='bracelet'){
      const br=(data.bracelets||[]).find(x=>x.id===p.id);
      return (br&&(br.name||'').trim())||'Bracelet';
    }
    return 'Item';
  }
  function openPocket(){
    const items=data.pocket||[];
    const cards=items.map((p,i)=>{
      let art='',label=pocketItemLabel(p);
      if(p.kind==='leaf'){const g=data.garden[p.id];const shape=g?(g.shape||g.category):'people';art=`<img src="assets/current/leaf-${shape}.svg" alt="" draggable="false"${g&&g.hue?` style="filter:hue-rotate(${g.hue}deg)`:''}>`;}
      else if(p.kind==='star'){art=`<span class="pocket-star">${paperStarSVG()}</span>`;}
      else if(p.kind==='influence'){art=`<img src="assets/current/influence-${p.id}.svg" alt="" draggable="false">`;}
      else if(p.kind==='log'){art=`<img src="assets/current/fury-wood-burning.svg" alt="" draggable="false">`;}
      else if(p.kind==='story'){art=`<img src="assets/current/story-book-current.svg" alt="" draggable="false">`;}
      else if(p.kind==='bracelet'){art=`<img src="assets/current/bracelet-placeholder.svg" alt="" draggable="false">`;}
      else{art=`<span class="pocket-check">✓</span>`;}
      return `<div class="pocket-card" data-pocket-index="${i}">
        <button type="button" class="pocket-open" data-pocket-open="${i}" aria-label="Open ${esc(label)}">${art}<span>${esc(label)}</span></button>
        <button type="button" class="pocket-remove" data-pocket-remove="${i}" aria-label="Take ${esc(label)} out of pocket">×</button>
      </div>`;
    }).join('');
    openModal('pocket-dialog','Pocket',`
      ${items.length?`<div class="pocket-grid">${cards}</div><p class="note-hint">Tap a card to open it. You can keep up to 3.</p>`:`<p>Your pocket is empty. Put a leaf, star, check-in, influence, burning log, story, or bracelet here for quick access.</p><p class="note-hint">From a leaf, star, check-in, influence, log, story, or bracelet, choose "Put in pocket".</p>`}
    `,()=>true);
    modal.querySelectorAll('[data-pocket-open]').forEach(b=>b.addEventListener('click',()=>{
      const p=items[Number(b.dataset.pocketOpen)];closeModal();
      if(p.kind==='leaf'){redraw(garden);setTimeout(()=>{const el=view().querySelector(`.growing-leaf[data-id="${p.id}"]`);if(el)editLeaf(p.id,el);},50);}
      else if(p.kind==='star'){holdStar(p.id);}
      else if(p.kind==='checkin'){if(window.UI&&typeof window.UI.runUserCheckin==='function')window.UI.runUserCheckin(p.id);}
      else if(p.kind==='influence'){redraw(influences);setTimeout(()=>{const b=view().querySelector(`[data-influence-tap="${p.id}"]`);if(b){b.click();b.scrollIntoView({block:'center'});}},80);}
      else if(p.kind==='log'){if(window.FURY_ROOM&&typeof window.FURY_ROOM.open==='function'){window.FURY_ROOM.open();setTimeout(()=>{const el=view().querySelector(`.fury-piece[data-id="${p.id}"]`);if(el){el.scrollIntoView({block:'center'});el.click();}},300);}}
      else if(p.kind==='story'){redraw(myStories);setTimeout(()=>{const el=view().querySelector(`[data-my-story="${p.id}"]`);if(el){el.scrollIntoView({block:'center'});}},80);}
      else if(p.kind==='bracelet'){redraw(myPeople);setTimeout(()=>{const el=view().querySelector(`[data-bracelet="${p.id}"]`);if(el){el.scrollIntoView({block:'center'});}},80);}
    }));
    modal.querySelectorAll('[data-pocket-remove]').forEach(b=>b.addEventListener('click',()=>{
      if(removeFromPocket(Number(b.dataset.pocketRemove))){closeModal();openPocket();}
    }));
  }
  return {init,refresh,notify,intersects,gemLit,page,openModal,closeModal,getModal(){return modal;},commit,save,asset,btn,field,esc,redraw,routes,dragTo,openPocket,addToPocket,removeFromPocket,updatePocketBadge,wakePocket,sleepPocket,pocketDroppable,addBracelet,myPeople,myStories,seenGrowth(){if(!data.growthIntroSeen){const next=structuredClone(data);next.growthIntroSeen=true;save(next);}},get data(){return structuredClone(data);}};
})();
