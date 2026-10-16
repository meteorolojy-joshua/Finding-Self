/* Perspective placement: explicit artwork bodies, footprints and supported stacks. */
'use strict';
window.ROOM_LAYOUT=(()=>{
  const E=()=>EXPLORATIONS,$=s=>document.querySelector(s),W=428,H=706.76,FLOOR=333.49;
  const concepts=[['compass','Compass'],['clock','Clock'],['mirror','Mirror'],['lantern','Lantern'],['watering-can','Watering can'],['sewing-box','Sewing box']];
  const registry={
    plant:{label:'Who I Am',action:'open-practice',art:'plant-new.png',x:8,y:320.58,w:140,h:205,body:[20,12,100,160],base:[20,172,100],labelBox:[10,172,120,30],mass:3},
    shovel:{label:'Contributions',action:'open-contrib',art:'shovel-new.png',x:55,y:195,w:90,h:135,body:[13,13,64,117],base:[13,130,64],labelBox:[-35,138,160,54],mass:1},
    table:{label:'Communities',action:'open-belonging',art:'rug-new.png',x:-29,y:407.58,w:598,h:142,body:[16,16,567,111],base:[16,111,567],labelBox:[195,144,208,47],mass:10,floorOnly:true},
    cups:{label:'Relationships',action:'open-connection',art:'bracelet-new.png',x:200,y:430,w:140,h:93,body:[14,14,112,65],base:[14,65,112],labelBox:[14,95,112,33],mass:1},


    magnet:{label:'Inspirations',action:'open-influence',art:'jersey-new.png',x:176.5,y:150,w:75,h:77,body:[13,8,34,41],base:[13,49,34],labelBox:[-38,55,90,20],mass:1,fixed:true},
    basket:{label:'Shop',art:'basket-new.png',x:280,y:535.58,w:123.2,h:148.8,body:[9.6,0,104,112],base:[24,102.4,75.2],labelBox:[0,118.4,123.2,30.4],mass:2},
    cupboard:{label:'Archive',art:'cupboard-base.png',x:270,y:182.5,w:160,h:114,body:[13,0,134,86],base:[26,83,112],labelBox:[0,91,160,38],mass:10,fixed:true},
    bookshelf:{label:'',art:'bookshelf-top.png',x:278,y:126.5,w:144,h:139,noAction:true,fixed:true},
    book:{label:'Narratives',action:'open-story',art:'story-1-new.png',x:322,y:155.5,w:55,h:70,body:[15,20,25,35],base:[15,55,25],labelBox:[-125,180,100,30],mass:1,fixed:true},
    torch:{label:'Emerging Selves',action:'open-explore',art:'gem-new-3.png',x:307.5,y:109.5,w:45,h:37,body:[5,26,44,16],base:[7,42,38],labelBox:[-85,-27,80,20],mass:1,fixed:true},
    spaces:{label:'Room to Be Myself',action:'open-lamp-room',x:75,y:64.49,w:146,h:38,fixed:true},
    fireplace:{label:'',art:'room-fireplace.png',x:154,y:241.48,w:120,h:92,fixed:true,noAction:true},
    burningStick:{label:'Anger',action:'open-fury-room',art:'room-burning-stick.png',x:179,y:270.58,w:70,h:52,fixed:true},
    altar:{label:'Grief',action:'open-grief-room',art:'room-altar',x:10,y:549.58,w:110,h:120,imgBox:[0,8,110,104],body:[15,40,80,60],base:[20,100,60],labelBox:[-8,102,126,38],mass:1}
  };
  concepts.forEach(([id,label],i)=>registry[id]={label,art:'concept-'+id,x:8+(i%3)*144,y:i<3?755:902,w:124,h:133,body:[12,0,100,100],base:[24,94,76],labelBox:[0,112,124,21],mass:1,concept:true});
  const defaults=()=>Object.fromEntries(Object.entries(registry).map(([id,r])=>[id,{x:r.x,y:r.y,support:r.support||'floor',status:r.concept?'available':'placed'}]));
  let current=null,undo=null,drag=null,suppressUntil=0;
  const clone=x=>structuredClone(x),clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  function state(){if(!current){const old=E().data.roomState;current={version:1,items:defaults(),selection:[]};for(const [id,p]of Object.entries(old?.items||{})){if(!registry[id])continue;current.items[id]={...current.items[id],...p};if(!['available','placed','packed','archived'].includes(p.status))current.items[id].status=defaults()[id].status;if(!Number.isFinite(p.x)||!Number.isFinite(p.y))Object.assign(current.items[id],{x:registry[id].x,y:registry[id].y});}current.selection=[...new Set(old?.selection||[])].filter(id=>registry[id]?.concept&&current.items[id].status==='available');repair(current.items);}return current;}
  function repair(items){const visited=new Set(),visiting=new Set();function check(id){if(visited.has(id)||registry[id].fixed||items[id].status!=='placed')return;const p=items[id],r=registry[id];if(visiting.has(id)){p.support='floor';p.y=Math.max(p.y,FLOOR-r.base[1]);return;}visiting.add(id);if(items[p.support])check(p.support);const base=point(id,p),support=supports(items,[id]).find(x=>x.id===p.support);const valid=p.support==='floor'?base.y>=FLOOR:support&&supported(support,base,r.mass)&&Math.abs(base.y-support.y)<.25&&(!r.floorOnly);if(!valid||!fitting(id,p,items,descendants(id,items))){const q=settle(id,p,items,descendants(id,items));if(q)items[id]=q;else{items[id]={...defaults()[id],status:p.status};items[id].y=Math.max(items[id].y,FLOOR-r.base[1]);items[id].support='floor';}}visiting.delete(id);visited.add(id);}Object.keys(items).forEach(check);}
  function persist(next,message){const all=E().data;all.roomState=next;if(!E().save(all))return false;current=next;if(message)E().notify(message);return true;}
  const point=(id,p=state().items[id])=>{const b=registry[id].base;return {x:p.x+b[0],y:p.y+b[1],w:b[2]};};
  const body=(id,p=state().items[id])=>{const b=registry[id].body;return {x:p.x+b[0],y:p.y+b[1],w:b[2],h:b[3]};};
  const overlap=(a,b)=>Math.min(a.x+a.w,b.x+b.w)>Math.max(a.x,b.x)+1&&Math.min(a.y+a.h,b.y+b.h)>Math.max(a.y,b.y)+1;
  function descendants(id,items){const result=[id];for(let i=0;i<result.length;i++)for(const [key,p]of Object.entries(items))if(p.status==='placed'&&p.support===result[i]&&!result.includes(key))result.push(key);return result;}
  function supports(items,exclude){return [...Object.entries(items).filter(([id,p])=>!exclude.includes(id)&&p.status==='placed'&&registry[id].surface).map(([id,p])=>{const [x,y,w,capacity]=registry[id].surface;return {id,x:p.x+x,y:p.y+y,w,capacity};})];}
  function supported(s,b,mass){return mass<=s.capacity&&b.x+b.w/2>=s.x&&b.x+b.w/2<=s.x+s.w&&Math.max(0,Math.min(b.x+b.w,s.x+s.w)-Math.max(b.x,s.x))>=b.w*.85;}
  function fitting(id,p,items,exclude){const r=registry[id],b=body(id,p),foot=point(id,p);if(b.x<0||b.x+b.w>W||b.y<0||foot.y>H-12)return false;for(const [other,q]of Object.entries(items)){if(exclude.includes(other)||q.status!=='placed'||registry[other].fixed||other===p.support)continue;const ob=body(other,q),of=point(other,q);if(p.support==='floor'&&q.support==='floor'){if(Math.abs(foot.y-of.y)<14&&foot.x<of.x+of.w&&foot.x+foot.w>of.x)return false;}else if(overlap(b,ob))return false;}return true;}
  function settle(id,desired,items=state().items,moving=[id]){const r=registry[id];let p={...desired,status:'placed'};const b0=r.body;p.x=clamp(p.x,-b0[0],W-b0[0]-b0[2]);const base=point(id,p);const mass=moving.reduce((n,k)=>n+registry[k].mass,0);if(!r.floorOnly){const candidates=supports(items,moving).filter(s=>s.y>=base.y-10&&supported({...s,capacity:s.capacity-Object.entries(items).filter(([key,q])=>!moving.includes(key)&&q.status==='placed'&&q.support===s.id).reduce((n,[key])=>n+registry[key].mass,0)},base,mass)).sort((a,b)=>a.y-b.y);for(const s of candidates){const candidate={...p,y:s.y-r.base[1],support:s.id};if(fitting(id,candidate,items,moving))return candidate;}}
    p.y=clamp(Math.max(base.y,FLOOR)-r.base[1],0,H-12-r.base[1]);p.support='floor';if(fitting(id,p,items,moving))return p;
    for(let radius=12;radius<900;radius+=12)for(const [dx,dy]of [[radius,0],[-radius,0],[0,radius],[0,-radius],[radius,radius],[-radius,radius]]){const candidate={...p,x:clamp(p.x+dx,-b0[0],W-b0[0]-b0[2]),y:clamp(p.y+dy,FLOOR-r.base[1],H-12-r.base[1])};if(fitting(id,candidate,items,moving))return candidate;}return null;
  }
  function land(id,desired){const next=clone(state()),was=next.items[id],moving=was.status==='packed'?[id]:descendants(id,next.items),p=settle(id,desired,next.items,moving);if(!p)return false;const dx=p.x-was.x,dy=p.y-was.y;const proposal=clone(next.items);for(const key of moving)proposal[key]={...proposal[key],x:proposal[key].x+dx,y:proposal[key].y+dy};proposal[id]=p;for(const key of moving)if(!fitting(key,proposal[key],proposal,moving))return false;undo=clone(next.items);next.items=proposal;return persist(next,registry[id].label+' placed.');}
  function detachChildren(id,items){for(const [key,p]of Object.entries(items))if(p.support===id&&p.status==='placed'){const landing=settle(key,p,items,[key,id]);if(landing){const dx=landing.x-p.x,dy=landing.y-p.y;for(const child of descendants(key,items))items[child]={...items[child],x:items[child].x+dx,y:items[child].y+dy};items[key]=landing;}}}
  function archive(id){if(['basket','cupboard'].includes(id)||!registry[id])return false;const next=clone(state());next.items[id].status='archived';detachChildren(id,next.items);if(!persist(next,registry[id].label+' is in the archive.'))return false;renderCurrent();return true;}
  function plantArt(){return `<span class="room-plant-art"><img src="assets/current/plant-new.png" alt="" draggable="false" style="width:100%;height:100%;object-fit:contain"></span>`;}
  function depth(id,p){let root=id,q=p,n=0;const seen=new Set([id]);while(state().items[q.support]?.status==='placed'&&!seen.has(q.support)){root=q.support;seen.add(root);q=state().items[root];n+=2;}return Math.round(point(root,q).y)+n;}
  function objectHTML(id,p){const r=registry[id],css=`left:${p.x/W*100}%;top:${p.y/H*100}%;width:${r.w/W*100}%;height:${r.h/H*100}%;z-index:${r.floorOnly?0:(r.fixed?1:depth(id,p))};`;
    if(r.fixed){
      const artSrc=r.art?(r.art.endsWith('.png')?`assets/current/${r.art}`:`assets/current/${r.art}.svg`):'';
      const actionAttr=r.noAction?'':' data-ract="'+r.action+'"';
      const tag=r.noAction?'div':'button';
      return `<${tag} class="room-item${r.art?' room-fixed-art':''}${r.sideLabel?' label-side':''}" data-room-id="${id}"${actionAttr} aria-label="${E().esc(r.label)}" style="${css}">${r.art?`<img draggable="false" src="${artSrc}" alt="">`:''}</${tag}>`;
    }
    const [x,y,w,h]=r.imgBox||r.body;
    const artFile=r.art?(r.art.endsWith('.png')?r.art:r.art+'.svg'):'';
    const image=id==='plant'?plantArt():`<img draggable="false" src="assets/current/${artFile}" alt="" style="left:${x/r.w*100}%;top:${y/r.h*100}%;width:${w/r.w*100}%;height:${h/r.h*100}%">`;
    return `<button type="button" class="room-item" data-room-id="${id}" ${r.action?`data-ract="${r.action}"`:''} aria-label="${E().esc(r.label)}" style="${css}">${image}</button>${id==='basket'?packedHTML(p):''}`;
  }
  function packedHTML(p){const ids=Object.keys(state().items).filter(k=>state().items[k].status==='packed');if(!ids.length)return '';return `<div class="room-packed packed-items" style="left:${(p.x+23)/W*100}%;top:${(p.y+27)/H*100}%;width:${100/W*100}%;right:auto;z-index:${Math.round(p.y+registry.basket.base[1])+1};">${ids.map(id=>`<button class="packed-item" data-packed="${id}" aria-label="Unpack ${registry[id].label}">${E().asset('current/'+registry[id].art)}</button>`).join('')}</div>`;}
  function placeLabels(scene){
    scene.querySelector('.room-labels')?.remove();
    const sr=scene.getBoundingClientRect();if(!(sr.width>0))return;
    const layer=document.createElement('div');layer.className='room-labels';
    scene.querySelectorAll('.room-item').forEach(item=>{
      const id=item.dataset.roomId,r=registry[id];if(!r)return;
      const text=(r.label||'').trim();if(!text)return;
      const b=document.createElement('button');
      b.type='button';b.className='room-label-btn'+(item.classList.contains('label-side')?' side':'');
      b.dataset.roomId=id;b.dataset.roomLabel=id;
      if(item.dataset.ract)b.dataset.ract=item.dataset.ract;
      b.tabIndex=-1;b.setAttribute('aria-hidden','true');b.textContent=text;
      const put=(cxPx,topPx)=>{b.style.left=(cxPx/sr.width*100)+'%';b.style.top=(topPx/sr.height*100)+'%';layer.appendChild(b);};
      if(r.fixed){
        const img=item.querySelector(':scope > img');
        if(img&&!img.complete)return;
        if(img){
          const ir=img.getBoundingClientRect();
          if(item.classList.contains('label-side'))put(ir.right+8-sr.left,ir.top+ir.height/2-sr.top);
          else put(ir.left+ir.width/2-sr.left,ir.bottom+8-sr.top);
        }else{
          const br=item.getBoundingClientRect();
          b.classList.add('vcenter');
          put(br.left+br.width/2-sr.left,br.top+br.height/2-sr.top);
        }
      }else{
        const p=state().items[id],lb=r.labelBox;if(!p||!lb)return;
        put((p.x+lb[0]+lb[2]/2)/W*sr.width,(p.y+lb[1])/H*sr.height);
      }
    });
    if(!layer.childElementCount)return;
    scene.appendChild(layer);
    const placed=[];
    layer.querySelectorAll('.room-label-btn').forEach(b=>{
      let r=b.getBoundingClientRect(),hw=r.width/2;
      let cx=parseFloat(b.style.left)/100*sr.width,top=r.top-sr.top;
      if(!(hw>0))return;
      if(!b.classList.contains('side')){
        let ax=cx;
        if(ax-hw<2)ax=hw+2;else if(ax+hw>sr.width-2)ax=sr.width-hw-2;
        if(ax!==cx){b.style.left=(ax/sr.width*100)+'%';cx=ax;}
      }
      const w=r.width,h=r.height,left=cx-(b.classList.contains('side')?0:hw);
      for(let iter=0;iter<6;iter++){
        let moved=false;
        for(const q of placed){
          const xOver=left<q.left+q.w&&left+w>q.left;
          const yOver=top<q.top+q.h-4&&top+h>q.top+4;
          if(xOver&&yOver){
            const downNeed=(q.top+q.h+6)-top,upNeed=top-(q.top-6-h);
            top=downNeed<=upNeed+5?q.top+q.h+6:q.top-6-h;
            moved=true;
          }
        }
        if(!moved)break;
      }
      b.style.top=(top/sr.height*100)+'%';
      placed.push({left:left,top:top,w:w,h:h});
    });
  }
  function enhance(card){let scene=card.querySelector('.room-scene');if(scene)return;scene=card.querySelector('.landscape');if(!scene)return;scene.className='room-scene';scene.innerHTML='<div class="room-floor"></div>'+Object.entries(state().items).filter(([,p])=>p.status==='placed').map(([id,p])=>objectHTML(id,p)).join('');placeLabels(scene);scene.querySelectorAll('.room-item.room-fixed-art > img').forEach(img=>{if(!img.complete)img.addEventListener('load',()=>placeLabels(scene),{once:true});});bindScene(scene);ITERATION.enhance();}
  function renderCurrent(){if($('#view .room-scene'))E().redraw(UI.renderLongerExplorations);else if($('#view [data-page="exploration-archive"]'))E().redraw(archivePage);else if($('#view [data-page="exploration-store"]'))E().redraw(storePage);}
  function open(id){const r=registry[id];if(id==='basket')return storePage();if(id==='cupboard')return archivePage();if(r.concept)return ITERATION.dialog(r.label,'<p>Concept placeholder · this exploration is still to be designed.</p>');const button=document.createElement('button');button.dataset.ract=r.action;button.hidden=true;document.body.append(button);button.click();button.remove();}
  function archivePage(){const ids=Object.keys(state().items).filter(id=>state().items[id].status==='archived');E().page('exploration-archive','archive','Archived self-explorations','Revisit explorations you’ve put away from your room.',`<div class="archive-items">${ids.map(id=>`<button class="archive-card" data-room-open="${id}">${id==='plant'?`<span class="archive-plant">${plantArt()}</span>`:registry[id].art?E().asset('current/'+registry[id].art):''}<span>${registry[id].label}</span></button>`).join('')}</div>${!ids.length?'<p>No self-explorations have been archived yet.</p>':''}<button class="btn2" data-room-action="archive-chooser">Archive an exploration</button>`);ITERATION.enhance();}
  function chooser(){const d=ITERATION.dialog('Archive an exploration','<div class="room-options-list">'+Object.keys(state().items).filter(id=>!['basket','cupboard'].includes(id)&&!registry[id].fixed&&['placed','packed'].includes(state().items[id].status)).map(id=>`<button class="btn2 archive-option" data-archive="${id}">${registry[id].art?E().asset("current/"+(id==="plant"?"pot":registry[id].art)):""}<span>${registry[id].label}</span></button>`).join('')+'</div>');d.node.addEventListener('click',e=>{const b=e.target.closest('[data-archive]');if(b&&archive(b.dataset.archive))d.close();});}
  function options(){const d=ITERATION.dialog('Arrange room','<div class="room-options-list"><button class="btn2" data-layout="undo">Undo last move</button><button class="btn2" data-layout="reset">Reset room layout</button></div>');d.node.addEventListener('click',e=>{const a=e.target.closest('[data-layout]')?.dataset.layout;if(!a)return;const next=clone(state());if(a==='undo'){if(!undo){E().notify('No move to undo yet.');return;}const previous=clone(next.items);for(const id of Object.keys(next.items))if(undo[id]&&next.items[id].status===undo[id].status)next.items[id]=undo[id];undo=previous;}else{undo=clone(next.items);for(const [id,p]of Object.entries(next.items))Object.assign(p,{x:registry[id].x,y:registry[id].y,support:registry[id].support||'floor'});}repair(next.items);if(persist(next,'Room layout updated.')){d.close();renderCurrent();}});}
  function unpackMenu(){const ids=Object.keys(state().items).filter(id=>state().items[id].status==='packed');const d=ITERATION.dialog('Unpack basket contents',ids.length?'<div class="room-options-list">'+ids.map(id=>`<button class="btn2" data-unpack="${id}">Place ${registry[id].label} in room</button>`).join('')+'</div>':'<p>Your basket is empty.</p>');d.node.addEventListener('click',e=>{const id=e.target.closest('[data-unpack]')?.dataset.unpack;if(id&&land(id,{...state().items[id],x:registry[id].x,y:registry[id].y})){d.close();renderCurrent();}});}
  function cue(text,x,y){let el=$('.room-drop-cue');if(!text){el?.remove();return;}if(!el){el=document.createElement('div');el.className='room-drop-cue';el.setAttribute('role','status');document.body.append(el);}el.textContent=text;el.style.left=clamp(x+18,8,innerWidth-260)+'px';el.style.top=clamp(y+18,8,innerHeight-70)+'px';}
  const masks=new Map();
  async function loadMasks(){const read=async name=>{const im=new Image();im.src='assets/current/'+name+'.svg';await im.decode();return im;};for(const [id,r]of Object.entries(registry)){if(r.fixed)continue;try{const c=document.createElement('canvas');c.width=Math.ceil(r.body[2]*2);c.height=Math.ceil(r.body[3]*2);const ctx=c.getContext('2d');ctx.scale(2,2);if(id==='plant'){ctx.translate(-r.body[0],-r.body[1]);const stem=await read('stem'),pot=await read('pot'),left=await read('leaf-places'),right=await read('leaf-right');ctx.drawImage(stem,54.468,18,9.016,165.99);for(let i=0;i<6;i++)ctx.drawImage(i%2?right:left,i%2?59:23,20.07+i*24,i%2?35:36,17.73);ctx.drawImage(pot,22.828,171.207,72.34,66.61);}else{const im=await read(r.art),w=r.body[2],h=r.body[3];{if(id==='magnet'){ctx.translate(0,h);ctx.scale(1,-1);}const scale=Math.min(w/im.naturalWidth,h/im.naturalHeight),iw=im.naturalWidth*scale,ih=im.naturalHeight*scale;ctx.drawImage(im,(w-iw)/2,(h-ih)/2,iw,ih);}}masks.set(id,{pixels:ctx.getImageData(0,0,c.width,c.height).data,w:c.width,h:c.height});}catch{}}}
  function solidAt(id,b,x,y){const m=masks.get(id);if(!m)return true;const u=Math.floor((x-b.x)*2),v=Math.floor((y-b.y)*2);return u>=0&&v>=0&&u<m.w&&v<m.h&&m.pixels[(v*m.w+u)*4+3]>40;}
  function visualOverlap(id,p,cupboard){const a=body(id,p),b=body('cupboard',cupboard);if(!overlap(a,b))return false;for(let y=Math.max(a.y,b.y)+.5;y<Math.min(a.y+a.h,b.y+b.h);y+=1)for(let x=Math.max(a.x,b.x)+.5;x<Math.min(a.x+a.w,b.x+b.w);x+=1)if(solidAt(id,a,x,y)&&solidAt('cupboard',b,x,y))return true;return false;}
  function cancel(){if(!drag)return;const id=drag.id;clearTimeout(drag.timer);drag.ghost?.remove();drag=null;cue('');$('.landing-preview')?.remove();document.querySelectorAll('.drop-target').forEach(e=>e.classList.remove('drop-target'));renderCurrent();document.querySelector(`.room-scene [data-room-id="${id}"]`)?.focus({preventScroll:true});suppressUntil=Date.now()+250;}
  function bindScene(scene){
    const liftLabel=id=>{const lab=scene.querySelector(`[data-room-label="${id}"]`);if(lab)lab.classList.add('lift');};
    const unliftLabel=id=>{const lab=scene.querySelector(`[data-room-label="${id}"]`);if(lab)lab.classList.remove('lift');};
    scene.addEventListener('mouseover',e=>{const it=e.target.closest?e.target.closest('.room-item[data-room-id]'):null;if(!it||it.classList.contains('dragging'))return;liftLabel(it.dataset.roomId);});
    scene.addEventListener('mouseout',e=>{const it=e.target.closest?e.target.closest('.room-item[data-room-id]'):null;if(!it)return;const to=e.relatedTarget&&e.relatedTarget.closest?e.relatedTarget.closest('.room-item[data-room-id]'):null;if(to===it)return;unliftLabel(it.dataset.roomId);});
    function pickup(el,id,ev,keyboard=false){const p=state().items[id];if(registry[id].fixed)return;const rect=scene.getBoundingClientRect(),packed=p.status==='packed';drag={id,el,scene,start:clone(p),proposed:{...p},x:ev.clientX||0,y:ev.clientY||0,scale:W/rect.width,moving:packed?[id]:descendants(id,state().items),ready:keyboard||ev.pointerType!=='touch',active:keyboard,packed,keyboard,pointer:ev.pointerId};if(!keyboard&&ev.pointerType!=='touch'){ev.preventDefault();el.setPointerCapture(ev.pointerId);}if(packed){drag.proposed={...p,x:state().items.basket.x+20,y:state().items.basket.y};drag.start=clone(drag.proposed);}if(ev.pointerType==='touch')drag.timer=setTimeout(()=>{if(drag){drag.ready=true;drag.active=true;if(ev.pointerId!=null)el.setPointerCapture(ev.pointerId);}},250);if(keyboard)E().notify('Picked up '+registry[id].label+'. Arrow keys move; Enter places; Escape cancels.');}
    function paint(x,y){if(!drag)return;const d=drag;const cupboard=state().items.cupboard;d.archive=!['basket','cupboard'].includes(d.id)&&visualOverlap(d.id,d.proposed,cupboard);scene.querySelector('[data-room-id=cupboard]')?.classList.toggle('drop-target',d.archive);cue(d.archive?'drop in cupboard to archive this self-exploration':'',x,y);const dx=d.proposed.x-d.start.x,dy=d.proposed.y-d.start.y;
      if(d.packed){if(!d.ghost){d.ghost=document.createElement('div');d.ghost.innerHTML=objectHTML(d.id,{...d.proposed,status:'placed'});d.ghost=d.ghost.firstElementChild;d.ghost.style.pointerEvents='none';scene.append(d.ghost);}d.ghost.style.left=d.proposed.x/W*100+'%';d.ghost.style.top=d.proposed.y/H*100+'%';d.ghost.classList.add('dragging');}
      else for(const id of d.moving){const el=scene.querySelector(`.room-item[data-room-id="${id}"]`);if(el){el.classList.add('dragging');el.style.transform=`translate(${dx/d.scale}px,${dy/d.scale}px)`;}const lab=scene.querySelector(`[data-room-label="${id}"]`);if(lab){lab.classList.add('dragging');lab.style.transform=`translate(${dx/d.scale}px,${dy/d.scale}px)`;}}
      if(d.id==='basket'){const packed=scene.querySelector('.room-packed');if(packed){packed.style.transform=`translate(${dx/d.scale}px,${dy/d.scale}px)`;packed.style.zIndex=2001;}}
      const landing=settle(d.id,d.proposed,state().items,d.moving);let preview=scene.querySelector('.landing-preview');if(!preview){preview=document.createElement('div');preview.className='landing-preview';scene.append(preview);}preview.hidden=d.archive||!landing;if(landing){const b=point(d.id,landing);preview.style.cssText=`left:${b.x/W*100}%;top:${b.y/H*100}%;width:${b.w/W*100}%`;}
    }
    function finish(){if(!drag)return;const d=drag;clearTimeout(d.timer);drag=null;cue('');suppressUntil=Date.now()+300;if(d.archive)archive(d.id);else{const landed=land(d.id,d.proposed);if(!landed)E().notify('That position does not fit. Restored the previous position.');renderCurrent();if(landed&&!matchMedia('(prefers-reduced-motion: reduce)').matches){const final=state().items[d.id],dx=(d.proposed.x-final.x)/d.scale,dy=(d.proposed.y-final.y)/d.scale;for(const key of d.moving)document.querySelector(`[data-room-id="${key}"]`)?.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:220,easing:'ease-out'});}}requestAnimationFrame(()=>document.querySelector(`.room-scene [data-room-id="${d.id}"]`)?.focus({preventScroll:true}));}
    scene.addEventListener('touchstart',e=>{const el=e.target.closest('[data-room-id],[data-packed]');if(!el||e.touches.length!==1)return;const t=e.touches[0];pickup(el,el.dataset.roomId||el.dataset.packed,{clientX:t.clientX,clientY:t.clientY,pointerType:'touch'});if(drag)drag.touch=true;},{passive:true});
    scene.addEventListener('touchmove',e=>{if(!drag?.touch||e.touches.length!==1)return;const t=e.touches[0],d=drag,dist=Math.hypot(t.clientX-d.x,t.clientY-d.y);if(!d.ready){if(dist>6){clearTimeout(d.timer);drag=null;}return;}if(e.cancelable)e.preventDefault();d.active=true;d.proposed.x=d.start.x+(t.clientX-d.x)*d.scale;d.proposed.y=d.start.y+(t.clientY-d.y)*d.scale;paint(t.clientX,t.clientY);if(t.clientY<55)window.scrollBy(0,-12);if(t.clientY>innerHeight-55)window.scrollBy(0,12);},{passive:false});
    scene.addEventListener('touchend',e=>{if(!drag?.touch)return;if(drag.active){if(e.cancelable)e.preventDefault();finish();}else{clearTimeout(drag.timer);drag=null;}},{passive:false});scene.addEventListener('touchcancel',cancel);scene.addEventListener('pointerdown',ev=>{if(ev.pointerType==='touch'||ev.button!==0)return;const el=ev.target.closest('[data-room-id],[data-packed]');if(!el)return;pickup(el,el.dataset.roomId||el.dataset.packed,ev);});
    scene.addEventListener('pointermove',ev=>{if(!drag||drag.keyboard||drag.touch)return;const d=drag,dist=Math.hypot(ev.clientX-d.x,ev.clientY-d.y);if(!d.ready){if(dist>6){clearTimeout(d.timer);drag=null;}return;}if(!d.active&&dist<=6)return;d.active=true;d.el.setPointerCapture(ev.pointerId);ev.preventDefault();d.proposed.x=d.start.x+(ev.clientX-d.x)*d.scale;d.proposed.y=d.start.y+(ev.clientY-d.y)*d.scale;paint(ev.clientX,ev.clientY);if(ev.clientY<55)window.scrollBy(0,-12);if(ev.clientY>innerHeight-55)window.scrollBy(0,12);});
    scene.addEventListener('pointerup',()=>{if(!drag||drag.touch)return;if(drag.active)finish();else{clearTimeout(drag.timer);drag=null;}});scene.addEventListener('pointercancel',e=>{if(e.pointerType!=='touch')cancel();});
    scene.addEventListener('keydown',ev=>{const el=ev.target.closest('[data-room-id],[data-packed]');if(!el)return;if(ev.key==='Escape'&&drag){ev.preventDefault();cancel();return;}if(!drag&&ev.code==='Space'){ev.preventDefault();pickup(el,el.dataset.roomId||el.dataset.packed,ev,true);return;}if(!drag?.keyboard)return;const moves={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]};if(moves[ev.key]){ev.preventDefault();const step=ev.shiftKey?24:6;drag.proposed.x+=moves[ev.key][0]*step;drag.proposed.y+=moves[ev.key][1]*step;const r=el.getBoundingClientRect();paint(r.right,r.top);}else if(ev.key==='Enter'||ev.code==='Space'){ev.preventDefault();finish();}});
  }
  function select(id,on){const next=clone(state());if(next.items[id].status!=='available')return;next.selection=next.selection.filter(x=>x!==id);if(on)next.selection.push(id);if(persist(next,on?'Added to basket.':'Returned to its shelf.'))E().redraw(storePage);}
  function checkout(){const perform=()=>{const next=clone(state());for(const id of next.selection)if(next.items[id].status==='available')next.items[id].status='packed';next.selection=[];next.items.basket={...next.items.basket,x:30,y:650,support:'floor'};const basketBody=body('basket',next.items.basket);for(const [id,p]of Object.entries(next.items))if(id!=='basket'&&!registry[id].fixed&&p.status==='placed'&&overlap(body(id,p),basketBody)){const q=settle(id,{...p,y:Math.max(p.y,710)},next.items,descendants(id,next.items));if(q){const dx=q.x-p.x,dy=q.y-p.y;for(const child of descendants(id,next.items))next.items[child]={...next.items[child],x:next.items[child].x+dx,y:next.items[child].y+dy};next.items[id]=q;}}if(persist(next,'Your choices are home in the basket.')){NAV.exit();if(!$('#view .room-scene'))UI.renderLongerExplorations();}};window.HELPER?HELPER.guard(perform):perform();}
  function storePage(){const st=state();E().page('exploration-store','store','Self-exploration store','Drag objects into your basket. Drag them back to their shelves to change your mind. Take your basket to the exit counter when you’re ready.',`<p class="note-hint">Six concept placeholders · explorations to be designed</p><div class="store-shelves">${concepts.map(([id,label])=>`<div class="store-slot" data-shelf="${id}">${st.items[id].status==='available'&&!st.selection.includes(id)?`<button class="store-product" data-store-item="${id}" aria-label="Add ${label} to basket">${E().asset('current/concept-'+id)}<span>${label}</span></button>`:''}</div>`).join('')}</div><div class="store-dock"><div class="store-basket-wrap"><button class="store-basket" aria-label="Move basket to checkout"><img src="assets/current/basket-new.png" alt="" draggable="false"><span>your basket</span></button><div class="packed-items">${Object.keys(st.items).filter(id=>st.items[id].status==='packed').map(id=>`<span class="packed-item owned-packed" aria-label="Owned: ${registry[id].label}" title="Already added · unpack in your room">${E().asset('current/'+registry[id].art)}</span>`).join('')}${st.selection.map(id=>`<button class="packed-item" data-store-return="${id}" aria-label="Return ${registry[id].label} to shelf">${E().asset('current/concept-'+id)}</button>`).join('')}</div></div><button class="checkout-target" data-room-action="checkout">${E().asset('current/checkout')}<span>checkout · exit<br>bring your basket here</span></button></div><div class="store-contents" aria-label="Basket contents">${st.selection.map(id=>`<button class="btn2" data-store-return="${id}">Return ${registry[id].label} to shelf</button>`).join('')}</div><p class="note-hint">Your choices travel home in the basket. Unpack them in your room whenever you’re ready.</p>`);
    const bind=(el,selector,fn,preview)=>E().dragTo(el,selector,fn,preview);
    document.querySelectorAll('[data-store-item]').forEach(el=>bind(el,'.store-basket-wrap',()=>select(el.dataset.storeItem,true),'current/concept-'+el.dataset.storeItem));document.querySelectorAll('.packed-item[data-store-return]').forEach(el=>bind(el,'.store-shelves',()=>select(el.dataset.storeReturn,false),'current/concept-'+el.dataset.storeReturn));
    bind($('.store-basket'),'.checkout-target',checkout);$('.store-basket').addEventListener('click',()=>checkout());$('.store-basket').addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();$('.checkout-target').focus();E().notify('Basket picked up. Press Enter at checkout to return to your room.');}});
  }
  function init(){loadMasks();window.addEventListener('my-presence-navigation',()=>{if(drag)cancel();});window.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;if((b.closest('.room-scene')&&Date.now()<suppressUntil)||b.dataset.suppressClick){e.preventDefault();e.stopImmediatePropagation();}},true);document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const id=b.dataset.roomId;if(id&&['basket','cupboard'].includes(id)||id&&registry[id]?.concept){e.preventDefault();e.stopImmediatePropagation();open(id);return;}if(b.dataset.roomOpen){e.preventDefault();open(b.dataset.roomOpen);}const a=b.dataset.roomAction;if(a){e.preventDefault();({arrange:options,packed:unpackMenu,'archive-chooser':chooser,checkout})[a]?.();}if(b.dataset.storeItem){e.preventDefault();select(b.dataset.storeItem,true);}if(b.dataset.storeReturn){e.preventDefault();select(b.dataset.storeReturn,false);}if(b.dataset.packed){e.preventDefault();unpackMenu();}},true);document.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});}
  return {init,enhance,plantArt,archivePage,storePage,registry,state,settle,repair,visualOverlap,land,archive,cancel,select,checkout,renderCurrent};
})();
