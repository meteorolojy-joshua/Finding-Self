/* Runtime implementations of the fuller interaction contracts recorded with Figma. */
'use strict';
window.EXPLORATIONS = (() => {
  const KEY='fsaw.updated.v1';
  const empty=()=>({version:2,contributions:{},appearance:"portrait-original",growthIntroSeen:false,roomState:null,garden:{},spaces:{},gems:{},stories:[],contracts:{},influences:{},attachments:[]});
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
      `<p class="scene-instruction">Drag the torch to shine on a gemstone. While it is lit, open it to add or revisit an aspect of yourself.</p><div class="gem-scene spatial-scene"><div class="torch-beam" aria-hidden="true">${asset('gemstone-torch-beam')}</div>${DESIGN['gemstone-exploration'].positions.map(([x,y],i)=>`<button class="gem-target" data-new="gem" data-id="${i+1}" style="left:${x/4.28}%;top:${y/6.5}%" aria-label="${esc(filledLabel(data.gems[i+1],`Gemstone ${i+1}: empty`))}">${asset('current/gem-'+(i+1)+(data.gems[i+1]?'':'-outline'))}<span>${esc(gemCaption(data.gems[i+1]))}</span></button>`).join('')}<button class="movable-torch" aria-label="Move torch. Drag, or use arrow keys; hold Shift for larger steps." type="button">${asset('current/torch')}</button></div><p class="note-hint" id="torch-status" role="status"></p><p class="note-hint">Keyboard: focus the torch and use the arrow keys. Then Tab to an illuminated gemstone and press Enter.</p><div class="btnrow">${btn('keep-gems','Keep this exploration')}${btn('exit','Not now','note-act')}</div>`);
    const handle=$('.movable-torch');let drag=null;
    handle.addEventListener('pointerdown',e=>{e.preventDefault();const r=$('.gem-scene').getBoundingClientRect();drag={x:e.clientX,y:e.clientY,tx:torch.x,ty:torch.y,scale:428/r.width};handle.setPointerCapture(e.pointerId);});
    handle.addEventListener('pointermove',e=>{if(!drag)return;torch.x=Math.max(0,Math.min(378,drag.tx+(e.clientX-drag.x)*drag.scale));torch.y=Math.max(0,Math.min(625,drag.ty+(e.clientY-drag.y)*drag.scale));updateTorch();});
    const end=()=>drag=null;handle.addEventListener('pointerup',end);handle.addEventListener('pointercancel',end);
    handle.addEventListener('keydown',e=>{const step=e.shiftKey?30:8;const moves={ArrowLeft:[-step,0],ArrowRight:[step,0],ArrowUp:[0,-step],ArrowDown:[0,step]};if(!moves[e.key])return;e.preventDefault();torch.x=Math.max(0,Math.min(378,torch.x+moves[e.key][0]));torch.y=Math.max(0,Math.min(625,torch.y+moves[e.key][1]));updateTorch();});
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
    const level=(bm)=>{const books=storyDraft.map((s,i)=>({s,i})).filter(({s})=>(s.bookmark||'Undecided')===bm);
      return `<div class="shelf-level" data-level="${bm.toLowerCase()}" role="group" aria-label="${bm} shelf"><div class="shelf-books">${books.map(({s,i})=>cover(s,i,'shelf-book')).join('')}</div><span class="level-tag">${bm}</span></div>`;};
    const addBook=`<button type="button" class="story-add-book has-cursor-tip" data-new="story-add" data-tip="Add a new story" aria-label="Add a story"><svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg><span>add story</span></button>`;
    const discarded=storyDraft.map((s,i)=>({s,i})).filter(({s})=>s.bookmark==='Discard');
    page('story-shelf','stories','What narratives have you inherited? Which ones do you want to discard, keep, change, or remain undecided about?','Each book holds a story you inherited. Open one to revisit its words, or drag it to another shelf — or the bin — to change its bookmark. New stories arrive on the trolley.',
      `<div class="shelf-wrap"><div class="shelf-art"><h2 class="shelf-title">My bookshelf</h2><div class="shelf-art-frame">${asset('current/story-bookshelf','shelf-art-img')}<div class="shelf-levels">${level('Keep')}${level('Undecided')}${level('Change')}</div></div></div><div class="shelf-side"><div class="book-trolley">${asset('current/story-trolley','trolley-art')}${addBook}</div><div class="trash-bin-wrap"><div class="trash-bin"><div class="bin-body">${asset('current/story-trash-can','bin-body-img')}</div><div class="bin-mouth">${discarded.length?discarded.map(({s,i})=>cover(s,i,'bin-book')).join(''):'<p class="bin-empty">Nothing discarded yet.</p>'}</div><button type="button" class="bin-lid has-cursor-tip" data-tip="tap to open and view discarded stories" aria-label="Trash bin lid. Tap to open and view discarded stories.">${asset('current/story-trash-can','bin-lid-img')}</button></div><p class="bin-caption"><span class="bin-label">discarded stories</span></p></div></div></div>`);
    bindBinLid();bindBookDrag();
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
    page('garden','growth','What is the Self that You Want to Grow?','Tap a dotted leaf on the plant to grow a new leaf, and jot down relationships, places, interests, feelings, experiences, memories, activities, personality traits, etc. that feel like ‘you’ on the leaves.',
      `<div class="growth-plant">${asset('current/stem','current-stem')}${asset('current/pot','current-pot')}${slots.slice(0,4).map((id,i)=>{
        const g=data.garden[id];
        const photo=g&&g.photos&&g.photos.title;
        const titleText=g?((g.title||'').trim()||g.words||''):'';
        const example=['A quiet corner of the library','Drawing with no one watching','Company without conversation','Something I can’t name yet'][i];
        const shape=g?(g.shape||g.category):null;
        const hue=g&&g.hue?` style="filter:hue-rotate(${g.hue}deg)"`:'';
        const leafImg=g?`<img class="saved-leaf" src="assets/current/leaf-${shape}.svg" alt="" draggable="false"${hue}>`:asset('current/leaf-outline-'+(i+1),'empty-leaf');
        return `<button class="growing-leaf ${i%2?'right':'left'} ${g?'filled':''}" style="left:${(anchors[i][0]-8)/4.28}%;top:${(anchors[i][1]-8)/3}%;" data-new="garden-slot" data-id="${id}" ${g?'':`title="Add a leaf"`} aria-label="${esc(leafCaption(g)||'Add a leaf')}">${leafImg}${photo?`<span class="leaf-photo" style="-webkit-mask-image:url('assets/current/leaf-${shape}.svg');mask-image:url('assets/current/leaf-${shape}.svg')" aria-hidden="true"><img src="${photo}" alt=""></span>`:''}${g?(titleText?`<span class="leaf-title">${esc(titleText)}</span>`:''):`<span class="leaf-example">${esc('Example: '+example)}</span>`}</button>`;
      }).join('')}</div>${Object.keys(data.garden).length>=4?'<div class="extra-leaves">'+slots.slice(4).map(id=>btn('garden-slot',esc(leafCaption(data.garden[id])||'+ Add another leaf'),'btn2',`data-id="${id}"`)).join('')+'</div>':''}<p class="note-hint">Keep these words save each leaf on this device.</p><div class="btnrow">${data.growthIntroSeen?btn('exit','Done for now')+btn('growth-continue','Continue guided exploration','btn2'):btn('growth-continue','Continue')+btn('growth-continue','Skip this','note-act')+btn('keep-garden','Keep this collection','btn2')}</div>`);
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

  function editLeaf(id,leafBtn=null){
    if(leafZoom)return; // an editor is already open
    if(data.garden[id])editExistingLeaf(id,leafBtn);
    else createLeaf(id,leafBtn);
  }
  function editExistingLeaf(id,leafBtn){
    const old=data.garden[id],c=DESIGN['growth-categories'].categories.find(c=>c.key===old.category);
    const shape=leafShape(old),hue=leafHue(old);
    leafDraft={id,category:c,shape,hue,words:old.words||'',title:old.title||'',titlePhoto:(old.photos&&old.photos.title)||null};
    const bodyHTML=`<label class="new-field"><span>Title</span><input type="text" name="title" maxlength="60" value="${esc(leafDraft.title)}" placeholder="A short title for this leaf…"></label><div class="title-photo" data-title-photo></div>`
      +PhotoBody.field('words','What would you like to grow?',leafDraft.words,(old.photos||{}).words,{placeholder:'Your own words…',required:true})
      +btn('garden-language','Help me find language','btn2',`data-id="${c.key}"`);
    const validate=(values,root)=>{
      if(!values.words.trim()&&!bodyPhoto(old||{},root,'words')){root.querySelector('.dialog-error').textContent='Write a few words or add a photo for this leaf.';return false;}
      const photos=mergePhotos(old?.photos,root,['words']);
      if(leafDraft.titlePhoto)photos.title=leafDraft.titlePhoto;else delete photos.title;
      return {category:c.key,shape,hue,color:c.color,words:values.words,title:(values.title||'').trim(),photos};
    };
    const doSave=entry=>{
      if(!commit('garden',id,entry))return false;
      leafDraft=null;redraw(garden);
      notify('Your words are kept on this device.');
      return true;
    };
    const doDelete=()=>{
      if(!remove('garden',id))return false;
      leafDraft=null;redraw(garden);notify('Leaf deleted.');
      return true;
    };
    if(matchMedia('(prefers-reduced-motion: reduce)').matches||!leafBtn){
      openModal('leaf-dialog',esc(c.label),bodyHTML,
        values=>{const entry=validate(values,modal);if(entry===false)return false;if(!doSave(entry))return false;closeModal();},
        ()=>{closeModal();doDelete();});
      wireLeafForm(modal,c,old,shape,hue);
      return;
    }
    openLeafZoom(leafBtn,id,c,old,bodyHTML,validate,doSave,doDelete,shape,hue);
  }
  // Shared wiring for the leaf editor's form, whether it lives in the dialog
  // popup or in the zoom-in overlay. `root` is the editor's container element.
  // Creates a new leaf: zoom into the empty slot, choose a theme from the
  // tray, then write. Appearance (shape/color) is optional and never touches
  // the words.
  function createLeaf(id,leafBtn){
    if(!leafBtn){notify('Choose a dotted leaf on the plant.');return;}
    openLeafCreation(leafBtn,id);
  }
  async function openLeafCreation(leafBtn,id){
    const cats=DESIGN['growth-categories'].categories;
    const creation={theme:null,shape:null,hue:0};
    leafDraft={id,category:null,shape:null,hue:0,words:'',title:'',titlePhoto:null};
    const born=Date.now();
    const lr=leafBtn.getBoundingClientRect();
    const ov=document.createElement('div');
    ov.className='leaf-zoom-ov';
    ov.innerHTML=`
      <div class="leaf-zoom-dim"></div>
      <div class="leaf-zoom-panel creation-panel leaf-editor" role="dialog" aria-modal="true" aria-labelledby="creation-title">
        <form class="dialog-surface">
          <h2 id="creation-title">Grow a new leaf</h2>
          <div class="creation-canvas"><div class="creation-slot" aria-hidden="true"></div></div>
          <div class="creation-tray">
            <p class="tray-label">Choose a theme for this leaf:</p>
            <div class="tray-piles">
              ${cats.map(c=>`<button type="button" class="tray-pile" data-theme="${c.key}" aria-label="${esc(c.label)}"><img src="assets/current/leaf-${c.key}.svg" alt="" draggable="false"><span>${esc(SHORT_LABELS[c.key]||c.label)}</span></button>`).join('')}
            </div>
          </div>
          <div class="creation-fields" hidden>
            <label class="new-field"><span>Title</span><input type="text" name="title" maxlength="60" placeholder="A short title for this leaf…"></label>
            <div class="title-photo" data-title-photo></div>
            ${PhotoBody.field('words','What would you like to grow?','',null,{placeholder:'Your own words…',required:true})}
            ${btn('garden-language','Help me find language','btn2','data-id=""')}
          </div>
          <div class="creation-appearance" hidden>
            <p class="appearance-title">Appearance <span class="note-hint">(optional — your words stay as they are)</span></p>
            <div class="app-row"><span class="app-cap">Shape</span><div class="app-shapes">
              ${cats.map(c=>`<button type="button" class="app-shape" data-shape="${c.key}" aria-label="${esc(c.label)} shape"><img src="assets/current/leaf-${c.key}.svg" alt=""></button>`).join('')}
            </div></div>
            <div class="app-row"><span class="app-cap">Color</span><div class="app-colors">
              ${cats.map(c=>`<button type="button" class="app-color" data-color="${c.key}" aria-label="${esc(c.label)} color" style="background:${ITERATION_DATA.leafColors[c.key]}"></button>`).join('')}
            </div></div>
          </div>
          <p class="dialog-error" role="alert"></p>
          <div class="btnrow">
            <button type="submit" class="btn bw165" disabled>Grow this leaf</button>
            <button type="button" class="btn2" data-lz-cancel>Cancel</button>
          </div>
        </form>
      </div>`;
    document.body.append(ov);
    const panel=ov.querySelector('.leaf-zoom-panel'),
          dim=ov.querySelector('.leaf-zoom-dim'),
          form=panel.querySelector('form'),
          canvas=ov.querySelector('.creation-canvas'),
          fields=ov.querySelector('.creation-fields'),
          appearance=ov.querySelector('.creation-appearance'),
          submitBtn=ov.querySelector('button[type="submit"]'),
          titleEl=ov.querySelector('#creation-title'),
          langBtn=ov.querySelector('[data-new="garden-language"]');
    let resolveSettled;
    leafZoom={panel,ov,form,leafBtn,id,lr,pr:null,born,closing:false,creation:true,
      settled:new Promise(r=>{resolveSettled=r;}),resolveSettled,
      prevOverflow:document.body.style.overflow};
    wireLeafFields(panel);
    const updateCanvasLeaf=()=>{
      const img=canvas.querySelector('.creation-leaf');
      if(!img)return;
      img.src=`assets/current/leaf-${creation.shape}.svg`;
      img.style.filter=creation.hue?`hue-rotate(${creation.hue}deg)`:'';
    };
    const markAppearance=()=>{
      ov.querySelectorAll('.app-shape').forEach(b=>b.classList.toggle('picked',b.dataset.shape===creation.shape));
      ov.querySelectorAll('.app-color').forEach(b=>b.classList.toggle('picked',creation.hue===hueFor(creation.shape,b.dataset.color)&&creation.hue!==0||(creation.hue===0&&b.dataset.color===creation.theme)));
    };
    const pickTheme=(key,fromBtn)=>{
      const c=cats.find(c=>c.key===key);
      if(!c)return;
      const firstPick=!creation.theme;
      creation.theme=key;creation.shape=key;creation.hue=0;
      leafDraft.category=c;leafDraft.shape=key;leafDraft.hue=0;
      ov.querySelectorAll('.tray-pile').forEach(b=>b.classList.toggle('picked',b===fromBtn));
      titleEl.textContent=c.label;
      if(langBtn)langBtn.dataset.id=key;
      const fromImg=fromBtn?fromBtn.querySelector('img'):null;
      const place=()=>{
        fields.hidden=false;appearance.hidden=false;submitBtn.disabled=false;
        markAppearance();
        const ta=fields.querySelector('textarea[name="words"]');
        if(ta)ta.focus({preventScroll:true});
      };
      if(firstPick&&fromImg){
        // The chosen leaf expands to fill the slot: FLIP it from the tray.
        const r1=fromImg.getBoundingClientRect();
        canvas.innerHTML=`<img class="creation-leaf" src="assets/current/leaf-${key}.svg" alt="" draggable="false">`;
        const leafEl=canvas.querySelector('.creation-leaf');
        const r2=leafEl.getBoundingClientRect();
        const dx=(r1.left+r1.width/2)-(r2.left+r2.width/2),
              dy=(r1.top+r1.height/2)-(r2.top+r2.height/2),
              sc=Math.min(r1.width/r2.width,r1.height/r2.height);
        leafEl.animate([
          {transform:`translate(${dx.toFixed(1)}px,${dy.toFixed(1)}px) scale(${sc.toFixed(3)})`,opacity:.5},
          {transform:'translate(0,0) scale(1)',opacity:1}
        ],{duration:420,easing:'cubic-bezier(.25,.8,.25,1)',fill:'forwards'}).finished.then(place).catch(place);
      }else{
        canvas.innerHTML=`<img class="creation-leaf" src="assets/current/leaf-${key}.svg" alt="" draggable="false">`;
        place();
      }
    };
    ov.querySelectorAll('.tray-pile').forEach(b=>{
      b.addEventListener('click',()=>{if(b.dataset.suppressClick)return;pickTheme(b.dataset.theme,b);});
      dragTo(b,'.creation-canvas',()=>pickTheme(b.dataset.theme,b));
    });
    ov.querySelectorAll('.app-shape').forEach(b=>b.addEventListener('click',()=>{
      if(!creation.theme)return;
      creation.shape=b.dataset.shape;leafDraft.shape=b.dataset.shape;
      updateCanvasLeaf();markAppearance();
    }));
    ov.querySelectorAll('.app-color').forEach(b=>b.addEventListener('click',()=>{
      if(!creation.theme)return;
      creation.hue=hueFor(creation.shape,b.dataset.color);leafDraft.hue=creation.hue;
      updateCanvasLeaf();markAppearance();
    }));
    const validate=()=>{
      const values=Object.fromEntries(new FormData(form));
      if(!values.words.trim()&&!bodyPhoto({},form,'words')){
        form.querySelector('.dialog-error').textContent='Write a few words or add a photo for this leaf.';
        return false;
      }
      const photos=mergePhotos(null,form,['words']);
      if(leafDraft.titlePhoto)photos.title=leafDraft.titlePhoto;else delete photos.title;
      const c=cats.find(c=>c.key===creation.theme);
      return {category:creation.theme,shape:creation.shape,hue:creation.hue,color:c.color,
        words:values.words,title:(values.title||'').trim(),photos};
    };
    const cleanup=()=>{
      ov.remove();
      document.body.style.overflow=leafZoom.prevOverflow;
      document.body.classList.remove('leaf-zoom-open');
    document.documentElement.classList.remove('leaf-zoom-open');
      document.documentElement.classList.remove('leaf-zoom-open');
      const main=document.getElementById('main');if(main)main.inert=false;
      const done=leafZoom.resolveSettled;leafZoom=null;
      if(done)done();
    };
    const closeCreation=(mode)=>{
      if(!leafZoom||leafZoom.closing)return;
      leafZoom.closing=true;
      const pr=panel.getBoundingClientRect();
      const ox=(lr.left+lr.width/2)-(pr.left+pr.width/2),
            oy=(lr.top+lr.height/2)-(pr.top+pr.height/2);
      panel.animate([
        {transform:'translate(0,0) scale(1)',opacity:1},
        {transform:`translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(0.12)`,opacity:0}
      ],{duration:340,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'}).finished.then(()=>{
        cleanup();
        const sel=mode==='save'
          ?document.querySelector(`.growing-leaf[data-id="${id}"]`)
          :document.querySelector(`.growing-leaf[data-id="${id}"]`);
        if(sel)sel.focus({preventScroll:true});
      }).catch(()=>{cleanup();});
    };
    const cancel=()=>closeCreation('cancel');
    // Swallow the pointer-up click of the gesture that opened us.
    ov.addEventListener('click',e=>{if(Date.now()-born<400){e.stopPropagation();e.preventDefault();}},true);
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(Date.now()-born<400||!creation.theme)return;
      const entry=validate();
      if(entry===false)return;
      if(!commit('garden',id,entry))return;
      leafDraft=null;redraw(garden);
      notify('Your words are kept on this device.');
      closeCreation('save');
    });
    ov.querySelector('[data-lz-cancel]').addEventListener('click',cancel);
    dim.addEventListener('click',cancel);
    ov.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();cancel();return;}
      if(e.key!=='Tab')return;
      const f=[...panel.querySelectorAll('button,input,textarea,select')].filter(x=>!x.disabled&&x.getClientRects().length);
      if(!f.length)return;
      const first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    document.body.style.overflow='hidden';
    document.body.classList.add('leaf-zoom-open');
    document.documentElement.classList.add('leaf-zoom-open');
    document.getElementById('main').inert=true;
    // The creation sheet grows out of the tapped slot.
    panel.style.visibility='visible';
    const pr=panel.getBoundingClientRect();
    const ox=(lr.left+lr.width/2)-(pr.left+pr.width/2),
          oy=(lr.top+lr.height/2)-(pr.top+pr.height/2);
    panel.animate([
      {transform:`translate(${ox.toFixed(1)}px,${oy.toFixed(1)}px) scale(0.12)`,opacity:0},
      {transform:'translate(0,0) scale(1)',opacity:1}
    ],{duration:440,easing:'cubic-bezier(.25,.8,.25,1)',fill:'forwards'});
    const firstPile=ov.querySelector('.tray-pile');
    if(firstPile)firstPile.focus({preventScroll:true});
  }
  // Shared wiring for the leaf editor's fields (title, title photo, words):
  // used by both the edit zoom and the creation zoom.
  function wireLeafFields(root){
    PhotoBody.bind(root);
    // Title photo: text, a photo, or both. The photo fills the leaf on the plant.
    const renderTitlePhoto=()=>{
      const host=root.querySelector('[data-title-photo]');if(!host||!leafDraft)return;
      const ph=leafDraft.titlePhoto;
      host.innerHTML=ph
        ? `<img src="${ph}" alt="Title photo preview"><div class="btnrow"><button type="button" class="btn2" data-tp-pick>Replace photo</button><button type="button" class="note-act" data-tp-remove>Remove photo</button></div>`
        : `<button type="button" class="btn2" data-tp-pick>Add a photo for the title</button> <span class="note-hint">Text, a photo, or both — the photo fills the leaf on the plant.</span>`;
    };
    root.querySelector('[data-title-photo]').addEventListener('click',async e=>{
      if(e.target.closest('[data-tp-remove]')){leafDraft.titlePhoto=null;renderTitlePhoto();return;}
      if(!e.target.closest('[data-tp-pick]'))return;
      const src=await PhotoBody.chooseSource(root,{});
      if(!src||!leafDraft)return;
      const file=await PhotoBody.pickFile(src);
      if(!file||!leafDraft)return;
      try{const url=await PhotoBody.downscale(file);if(url&&leafDraft){leafDraft.titlePhoto=url;renderTitlePhoto();}}
      catch(err){notify('That photo could not be read. Try another one.');}
    });
    renderTitlePhoto();
  }
  function wireLeafForm(root,c,old,shape,hue){
    wireLeafFields(root);
    // The editor page wears the actual leaf artwork as its background, over the
    // leaf's own flat color; text boxes are fully opaque on top of it. The art
    // lives on its own layer so a custom color (hue shift) never touches text.
    const surface=root.querySelector('.dialog-surface');
    surface.style.backgroundColor=ITERATION_DATA.leafColors[c.key];
    surface.style.borderRadius='0';
    let bg=surface.querySelector('.leaf-bg');
    if(!bg){bg=document.createElement('div');bg.className='leaf-bg';bg.setAttribute('aria-hidden','true');surface.prepend(bg);}
    bg.style.backgroundImage=`url('assets/current/leaf-${shape}.svg')`;
    bg.style.filter=hue?`hue-rotate(${hue}deg)`:'';
  }
  // The open leaf-zoom editor, if any. `modal` stays null while it is open.
  let leafZoom=null;
  // The open leaf editor's root element: the zoom panel, or the modal dialog.
  function editorRoot(){return (leafZoom&&leafZoom.panel)||modal;}
  function soon(promise,ms){return Promise.race([promise,new Promise(r=>setTimeout(r,ms))]);}
  // Flies the leaf art from its rect on the plant to cover the panel rect (or
  // back): it grows and turns a quarter-turn, tip up. The growth is done via
  // the layout box (not a transform scale), which sidesteps a Chromium quirk
  // that mis-rasterizes large transform-scaled dashed strokes.
  function flyLeafArt(art,lr,pr,artAspect,reverse){
    const a=artAspect; // the flying leaf art's landscape aspect
    const dh=Math.max(pr.width,pr.height/a),dw=a*dh; // same aspect; rotated, covers panel
    const pcx=pr.left+pr.width/2,pcy=pr.top+pr.height/2;
    const f=n=>n.toFixed(1)+'px';
    const start={left:f(lr.left),top:f(lr.top),width:f(lr.width),height:f(lr.height),transform:'rotate(0deg)'};
    const end={left:f(pcx-dw/2),top:f(pcy-dh/2),width:f(dw),height:f(dh),transform:'rotate(-90deg)'};
    const anim=art.animate(reverse?[end,start]:[start,end],
      {duration:reverse?380:460,easing:'cubic-bezier(.25,.8,.25,1)',fill:'forwards'});
    return soon(anim.finished,1600);
  }
  // Opens the leaf editor as a zoom: the tapped leaf grows and turns into its
  // editing page, so it feels like diving into the leaf on the same page.
  async function openLeafZoom(leafBtn,id,c,old,bodyHTML,validate,doSave,doDelete,shape,hue){
    const artImg=leafBtn.querySelector('.saved-leaf,.empty-leaf');
    if(!artImg){editLeaf(id,false,null);return;}
    const lr=artImg.getBoundingClientRect();
    const born=Date.now();
    // The flight always wears the solid category leaf: it renders correctly at
    // every size, while the dotted outline hits a Chromium raster quirk when
    // grown large. (For a filled leaf this is its own art; for a new leaf it
    // is the pile just picked.)
    const flySrc=`assets/current/leaf-${shape}.svg`;
    const ov=document.createElement('div');
    ov.className='leaf-zoom-ov';
    ov.innerHTML=`
      <div class="leaf-zoom-dim"></div>
      <div class="leaf-zoom-art${leafBtn.classList.contains('right')?' mirrored':''}"><img src="${flySrc}" alt=""${hue?` style="filter:hue-rotate(${hue}deg)"`:''}></div>
      <div class="leaf-zoom-panel leaf-dialog leaf-editor" role="dialog" aria-modal="true" aria-labelledby="leaf-zoom-title">
        <form class="dialog-surface">
          <h2 id="leaf-zoom-title">${esc(c.label)}</h2>
          ${bodyHTML}
          <p class="dialog-error" role="alert"></p>
          <div class="btnrow">
            <button type="submit" class="btn bw64 bwtrim">Confirm</button>
            <button type="button" class="btn2" data-lz-cancel>Cancel</button>
            ${doDelete?'<button type="button" class="btn2" data-lz-delete>Delete</button>':''}
          </div>
        </form>
      </div>`;
    document.body.append(ov);
    const panel=ov.querySelector('.leaf-zoom-panel'),
          art=ov.querySelector('.leaf-zoom-art'),
          dim=ov.querySelector('.leaf-zoom-dim'),
          form=panel.querySelector('form');
    let resolveSettled;
    leafZoom={panel,ov,art,dim,form,leafBtn,id,lr,pr:null,born,closing:false,
      settled:new Promise(r=>{resolveSettled=r;}),resolveSettled,doSave,doDelete,
      prevOverflow:document.body.style.overflow};
    wireLeafForm(panel,c,old,shape,hue);
    // Swallow the pointer-up click of the gesture that opened us (e.g. a drop).
    ov.addEventListener('click',e=>{if(Date.now()-born<400){e.stopPropagation();e.preventDefault();}},true);
    form.addEventListener('submit',e=>{
      e.preventDefault();
      if(Date.now()-born<400)return;
      const entry=validate(Object.fromEntries(new FormData(form)),panel);
      if(entry===false)return;
      closeLeafZoom('save',entry);
    });
    const cancel=()=>closeLeafZoom('cancel');
    ov.querySelector('[data-lz-cancel]').addEventListener('click',cancel);
    dim.addEventListener('click',cancel);
    if(doDelete)ov.querySelector('[data-lz-delete]').addEventListener('click',()=>{
      const row=panel.querySelector('form > .btnrow');
      row.innerHTML=`<span class="dialog-confirm-text">Delete this leaf?</span><button type="button" class="btn bw165" data-lz-delete-yes>Yes, delete</button><button type="button" class="btn2 bw64 bwtrim" data-lz-delete-no>Keep it</button>`;
      row.querySelector('[data-lz-delete-yes]').addEventListener('click',()=>closeLeafZoom('delete'));
      row.querySelector('[data-lz-delete-no]').addEventListener('click',()=>closeLeafZoom('cancel'));
    });
    ov.addEventListener('keydown',e=>{
      if(e.key==='Escape'){e.preventDefault();cancel();return;}
      if(e.key!=='Tab')return;
      const f=[...panel.querySelectorAll('button,input,textarea,select')].filter(x=>!x.disabled&&x.getClientRects().length);
      if(!f.length)return;
      const first=f[0],last=f[f.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    });
    // Hide the source leaf's art for the flight (its layout spot is kept).
    leafBtn.classList.add('leaf-zoom-src');
    document.body.style.overflow='hidden';
    document.body.classList.add('leaf-zoom-open');
    document.documentElement.classList.add('leaf-zoom-open');
    document.getElementById('main').inert=true;
    // Measure the panel at rest, then park the art over the leaf, sized to the
    // solid leaf's own aspect and centered on the leaf's rect.
    const pr=panel.getBoundingClientRect();
    leafZoom.pr=pr;
    const flyImg=ov.querySelector('.leaf-zoom-art img');
    try{await flyImg.decode();}catch(e){}
    const artAspect=(flyImg.naturalWidth||80)/(flyImg.naturalHeight||34);
    leafZoom.artAspect=artAspect;
    const aw=lr.width,ah=aw/artAspect;
    Object.assign(art.style,{left:lr.left+'px',top:(lr.top+(lr.height-ah)/2)+'px',width:aw+'px',height:ah+'px'});
    const ar={left:lr.left,top:lr.top+(lr.height-ah)/2,width:aw,height:ah};
    leafZoom.lr=ar;
    // Dim, fly the art, then crossfade it into the panel and reveal the form.
    requestAnimationFrame(()=>{dim.style.opacity='1';});
    flyLeafArt(art,ar,pr,artAspect,false)
      .then(()=>{panel.style.visibility='visible';})
      .then(()=>Promise.all([
        soon(panel.animate([{opacity:0},{opacity:1}],{duration:220,easing:'ease-out',fill:'forwards'}).finished,600),
        soon(art.animate([{opacity:1},{opacity:0}],{duration:220,fill:'forwards'}).finished,600)
      ]))
      .then(()=>{art.style.visibility='hidden';panel.querySelector('textarea,input,button')?.focus();})
      .catch(()=>{})
      .finally(()=>{resolveSettled();});
  }
  // Closes the zoom, playing the trip in reverse: the page shrinks back into
  // the leaf it came from, then the save/delete/cancel takes effect.
  async function closeLeafZoom(mode,entry){
    const z=leafZoom;
    if(!z||z.closing)return;
    z.closing=true;leafZoom=null;
    const {panel,ov,art,dim,leafBtn,lr,pr,artAspect,doSave,doDelete,prevOverflow}=z;
    try{
      await z.settled;
      await soon(panel.animate([{opacity:1},{opacity:0}],{duration:160,fill:'forwards'}).finished,600);
      panel.style.visibility='hidden';
      art.style.visibility='visible';
      art.animate([{opacity:0},{opacity:1}],{duration:160,fill:'forwards'});
      await flyLeafArt(art,lr,pr,artAspect||lr.width/lr.height,true);
    }catch(e){}
    dim.style.opacity='0';
    document.body.classList.remove('leaf-zoom-open');
    document.documentElement.classList.remove('leaf-zoom-open');
    document.body.style.overflow=prevOverflow;
    document.getElementById('main').inert=false;
    leafBtn.classList.remove('leaf-zoom-src');
    ov.remove();
    if(mode==='save'&&entry&&doSave(entry)){
      view().querySelector(`[data-new="garden-slot"][data-id="${z.id}"]`)?.focus({preventScroll:true});
    }else if(mode==='delete'&&doDelete){
      doDelete();
    }else if(leafBtn.isConnected){
      leafBtn.focus({preventScroll:true});
    }
  }
  const language={people:['Company without conversation','A friendship where I can be myself','Community that makes room for me'],places:['A quiet corner of the library','Time in nature','A room with morning light'],interests:['Drawing with no one watching','Something I am curious about','An interest without an outcome'],feelings:['Space for contradictory feelings','A little more ease','Feeling understood'],memories:['A memory I want to revisit','An experience that shaped me'],activities:['Making something with my hands','Moving in a way that feels good'],traits:['My curiosity','My sensitivity','A part of me I am learning to value'],others:['Something I cannot name yet','Something of my own']};
  function languagePicker(key){if(!leafDraft)return;const root=editorRoot();if(!root)return;leafDraft.words=root.querySelector('[name="words"]').value;const parent=root,focus=document.activeElement;const d=document.createElement('dialog');d.className='illustrated-dialog language-dialog';d.innerHTML=`<form class="dialog-surface"><h2>Help me find language</h2><p>${esc(leafDraft.category.label)}</p><div class="language-options">${language[key].map(s=>`<button type="button" class="btn2" data-suggestion="${esc(s)}">${esc(s)}</button>`).join('')}</div>${field('My words',leafDraft.words,'words','Choose some words or write your own.')}<div class="btnrow"><button class="btn" type="submit">Use these words</button><button class="note-act" type="button" data-language-back>Back to leaf</button></div></form>`;document.body.append(d);d.showModal();const close=()=>{d.close();d.remove();focus.focus();};d.addEventListener('cancel',e=>{e.preventDefault();close();});d.addEventListener('click',e=>{const b=e.target.closest('[data-suggestion]');if(b)d.querySelector('textarea').value=b.dataset.suggestion;if(e.target.closest('[data-language-back]')||e.target===d)close();});d.querySelector('form').onsubmit=e=>{e.preventDefault();leafDraft.words=d.querySelector('textarea').value;parent.querySelector('textarea').value=leafDraft.words;close();};}
  // Only the currently picked-up object is retained by global cancellation.
  // Detached page controls keep their own listeners and can be garbage-collected.
  let cancelActiveDrag=null;
  function dragTo(el,selector,drop,preview,ghostClass){
    let drag=null,timer;el.style.touchAction='auto';
    const clean=()=>{clearTimeout(timer);drag?.ghost?.remove();document.querySelectorAll('.store-drop-active').forEach(x=>x.classList.remove('store-drop-active'));drag=null;if(cancelActiveDrag===cancel)cancelActiveDrag=null;};
    const suppress=()=>{el.dataset.suppressClick='yes';setTimeout(()=>delete el.dataset.suppressClick,300);};
    const cancel=()=>{if(drag){suppress();clean();}};
    const down=(e,touch=false)=>{cancelActiveDrag?.();cancelActiveDrag=cancel;drag={x:e.clientX,y:e.clientY,moved:false,ghost:null,ready:!touch,touch};if(touch)timer=setTimeout(()=>{if(drag)drag.ready=true;},250);else{e.preventDefault();el.setPointerCapture(e.pointerId);}};
    const move=e=>{if(!drag)return;const distance=Math.hypot(e.clientX-drag.x,e.clientY-drag.y);if(!drag.ready){if(distance>6)clean();return;}if(distance>6)drag.moved=true;if(!drag.moved)return;if(!drag.ghost){drag.ghost=document.createElement('div');drag.ghost.innerHTML=preview?asset(preview):el.classList.contains('store-basket')?el.parentElement.innerHTML:el.innerHTML;drag.ghost.className='drag-preview'+(ghostClass?' '+ghostClass:'');document.body.append(drag.ghost);}document.querySelectorAll('.store-drop-active').forEach(x=>x.classList.remove('store-drop-active'));document.elementFromPoint(e.clientX,e.clientY)?.closest(selector)?.classList.add('store-drop-active');drag.ghost.style.left=e.clientX+'px';drag.ghost.style.top=e.clientY+'px';if(e.clientY<60)window.scrollBy(0,-12);if(e.clientY>innerHeight-60)window.scrollBy(0,12);};
    const finish=e=>{if(!drag)return;const moved=drag.moved;clean();if(moved){const target=document.elementFromPoint(e.clientX,e.clientY)?.closest(selector);suppress();if(target)drop(target);}};
    el.addEventListener('pointerdown',e=>{if(e.pointerType!=='touch'&&e.button===0)down(e);});el.addEventListener('pointermove',e=>{if(e.pointerType!=='touch'){if(drag)e.preventDefault();move(e);}});el.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')finish(e);});el.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')clean();});
    el.addEventListener('touchstart',e=>{if(e.touches.length===1)down(e.touches[0],true);},{passive:true});el.addEventListener('touchmove',e=>{if(drag?.ready&&e.cancelable)e.preventDefault();if(e.touches.length===1)move(e.touches[0]);},{passive:false});el.addEventListener('touchend',e=>{if(drag?.moved&&e.cancelable)e.preventDefault();if(e.changedTouches[0])finish(e.changedTouches[0]);},{passive:false});el.addEventListener('touchcancel',clean);
  }

  function influences(){if(!influenceDraft)influenceDraft=structuredClone(data.influences);influenceDraft._photos=influenceDraft._photos||{};page('influences','influences','An influence','People, works, or places that helped you grow—or make you think, “I want to be a little more like that.” Write a name, a title, or a few words on any object — or tap the camera button on a field to use a photo of your handwriting instead. One is enough; you can use more than one.',`<div class="influence-objects">${DESIGN['influence-writing-objects'].items.map(item=>`<div class="influence-object">${asset('current/influence-'+item.key)}${item.fields.map((f,i)=>{const key=item.key+'-'+i,ph=influenceDraft._photos[key];return `<div class="influence-field" data-pb-field="${key}" style="left:${f.x/2.06}%;top:${f.y/1.84}%;width:${f.w/2.06}%;height:${f.h/1.84}%"><div class="pb-text"${ph?' hidden':''}><textarea aria-label="${esc(item.name+' '+(i+1))}" data-influence="${key}" placeholder="${esc(f.text)}">${esc(influenceDraft[key]||'')}</textarea></div><div class="pb-photo"${ph?'':' hidden'}><img${ph?` src="${ph}"`:''} alt="Your photo"></div><button type="button" class="influence-photo-btn" data-pb-add="${key}" aria-label="Add a photo instead of writing"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 8h3l2-2h6l2 2h3v11H4z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="12" cy="13" r="3.2" fill="none" stroke="currentColor" stroke-width="2"/></svg></button></div>`;}).join('')}</div>`).join('')}</div><div class="btnrow">${btn('influence-continue','Continue')}${btn('influence-save','Keep these influences','btn2')}${btn('influence-continue','Skip to the sorting','btn2')}</div>`);view().querySelectorAll('[data-influence]').forEach(el=>el.addEventListener('input',()=>influenceDraft[el.dataset.influence]=el.value));PhotoBody.reset(view());PhotoBody.bind(view(),(name,url)=>{influenceDraft._photos=influenceDraft._photos||{};if(url)influenceDraft._photos[name]=url;else delete influenceDraft._photos[name];});}

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
    </div><p class="note-hint">Take a star from the jar to unfold it. Drag a star in or out of the jar to change where it lives.</p><div class="btnrow">${btn('community-continue','Continue')}${btn('community-continue','Skip this','note-act')}${btn('keep-contracts','Stop and keep what I have','note-act')}</div>`);
    view().querySelectorAll('.paper-star').forEach(el=>{
      dragTo(el,'.star-jar,.star-outside',target=>{
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
    // Star zoom: fly the star as it opens into the assessment.
    if(starBtn&&!matchMedia('(prefers-reduced-motion: reduce)').matches){
      const svg=starBtn.querySelector('svg');
      if(svg){
        const r=svg.getBoundingClientRect();
        const fly=document.createElement('div');
        fly.className='star-zoom-fly';
        fly.innerHTML=svg.outerHTML;
        Object.assign(fly.style,{position:'fixed',left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px',zIndex:400,pointerEvents:'none',margin:0});
        document.body.append(fly);
        starBtn.style.visibility='hidden';
        fly.animate([
          {transform:'scale(1) rotate(0deg)',opacity:1},
          {transform:'scale(5) rotate(18deg)',opacity:0}
        ],{duration:450,easing:'cubic-bezier(.25,.8,.25,1)',fill:'forwards'}).finished.then(()=>fly.remove()).catch(()=>fly.remove());
        setTimeout(()=>{starBtn.style.visibility='';},500);
      }
    }const draft=structuredClone(data.contracts[id]||{fields:{},ratings:{}});draft.placement=draft.placement||'inside';const labels=DESIGN['community-feeling-sliders'].labels;const cfields=DESIGN['community-contract-scrolls'].fields;const cph=['Community, group, or shared setting…','How much is expected, and how freely chosen?','The terms and responsibilities as they stand…','What I willingly stand behind…','What I would change, negotiate, or leave open…'];
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
              <div class="contract-rock" data-rock data-aspect="0.876"><img src="assets/current/contract-rock.svg" alt="" draggable="false"><textarea name="Obligation level" aria-label="What the obligations are" placeholder="${esc(cph[1])}">${oblText}</textarea></div>
              <span class="bond-info">Obligations this community wants from me</span>
              <div class="contract-hslider bond-slider"><label>How heavy the obligations are</label><input type="range" name="Obligation weight" min="0" max="100" value="${oblWeight}" aria-label="How heavy the obligations are"><div class="contract-hslider-ends"><span>light</span><span>heavy</span></div></div>
            </div>
            <div class="bond-item">
              <div class="contract-rock" data-rock data-aspect="1"><img src="assets/current/contract-gift.svg" alt="" draggable="false"><textarea name="Appreciation" aria-label="What I appreciate getting" placeholder="What you receive here that you actually want…">${appText}</textarea></div>
              <span class="bond-info">What I can count on this community for</span>
              <div class="contract-hslider bond-slider"><label>How much I experience myself receiving that I actually want</label><input type="range" name="Appreciation amount" min="0" max="100" value="${appAmt}" aria-label="How much I experience myself receiving that I actually want"><div class="contract-hslider-ends"><span>little</span><span>much</span></div></div>
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
    // Rock/gift size sliders (kept near their objects).
    stage.querySelectorAll('.bond-item').forEach(item=>{
      const rock=item.querySelector('[data-rock]'),slider=item.querySelector('input[type=range]');
      if(!rock||!slider)return;
      const size=()=>{const v=Number(slider.value||50);const px=Math.round(100+v/100*40);const aspect=parseFloat(rock.dataset.aspect||'0.876');rock.style.width=px+'px';rock.style.height=Math.round(px*aspect)+'px';slider.setAttribute('aria-valuetext',v+' out of 100');};
      slider.addEventListener('input',size);size();
    });
    let dragging=false,startX=0,startDist=0;
    const toPx=clientX=>{const r=stage.getBoundingClientRect();return clientX-r.left;};
    pair.addEventListener('pointerdown',e=>{
      if(e.target.closest('textarea,input,button'))return; // let form controls work
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
  const routes={garden,spaces,gems,story,influences,contracts,'story-shelf':shelf,
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
        appearance,'appearance-choice':()=>{const next=structuredClone(data);next.appearance=id;if(save(next)){closeModal();redraw(spaces);view().querySelector('[data-new="appearance"]')?.focus();}},'close-modal':closeModal,exit:()=>NAV.exit(),space:()=>editSpace(id),gem:()=>editGem(id),contract:()=>contract(id,el),arrangement:()=>ROOM.openArrangement(id),
        'story-open':()=>{shelfScroll=window.scrollY;storyIndex=Number(id);story();},'story-prev':()=>{storyIndex--;redraw(story);},'story-next':()=>{storyIndex++;redraw(story);},'story-add':()=>{ensureStories();storyDraft.push(blankStory());storyIndex=storyDraft.length-1;redraw(story);},
        bookmark:()=>{storyDraft[storyIndex].bookmark=el.dataset.value;redraw(story);},'bookmark-remove':()=>{storyDraft[storyIndex].bookmark=null;redraw(story);},'story-save':keepStories,'story-review':()=>{pendingStoryReview=true;ROOM.reviewStories(storyDraft);},
        'garden-slot':()=>editLeaf(id,el),'garden-language':()=>languagePicker(id),
        'language-pick':()=>{modal.querySelector('[name="words"]').value=el.dataset.value;modal.querySelector('[name="words"]').focus();},
        'growth-continue':()=>ROOM.continueGrowth(Object.values(data.garden).map(x=>x.words).join('\n')),
        'community-continue':()=>ROOM.continueCommunity(data.contracts[activeContract]||{fields:{}}),
        'influence-continue':()=>ROOM.continueInfluence(Object.values(influenceDraft||{}).filter(x=>typeof x==='string'&&x.trim()).join('\n')),
        'influence-save':()=>{const next=structuredClone(data);next.influences=structuredClone(influenceDraft);if(save(next))notify('Your influences are kept.');},
        'keep-garden':()=>saveCollection('garden'),'keep-spaces':()=>saveCollection('spaces'),'keep-gems':()=>saveCollection('gems'),'keep-contracts':()=>saveCollection('contracts'),
        'elemental-view':()=>ELEMENTAL.openKept(id),
      };actions[a]?.();
    },true);
    new MutationObserver(enhance).observe(view(),{childList:true,subtree:true});enhance();
  }
  return {init,refresh,notify,intersects,gemLit,page,openModal,closeModal,getModal(){return modal;},commit,save,asset,btn,field,esc,redraw,routes,dragTo,seenGrowth(){if(!data.growthIntroSeen){const next=structuredClone(data);next.growthIntroSeen=true;save(next);}},get data(){return structuredClone(data);}};
})();
