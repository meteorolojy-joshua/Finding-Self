/* Fabric-patch auto-fit (2026-10-01)
   J's five fabric patches at their natural 44px-tall sizes:
     bw64  69px | bw94  77px | bw120 108px | bw165 136px | bw302 221px
   Every .btn/.btn2 automatically becomes the smallest patch that fits its
   label, so the fabric fills the full button height and no label ever
   clips. A button the layout stretches full-width is left alone (a fixed
   patch can't cover it). A label wider than the largest patch keeps the
   302 patch stretched to its natural width. Buttons already pinned in the
   markup keep their pin when the label still fits it. Soft dark shows the
   same dark-green patches as the woodland scheme (pinned by the CSS). */
(function(){
  'use strict';
  var PATCHES=[['bw64',69],['bw94',77],['bw120',108],['bw165',136],['bw302',221]];
  var BWCLS=['bw64','bw94','bw120','bw165','bw302'];
  var MAXW=221;

  function patchWidth(cls){
    for(var i=0;i<PATCHES.length;i++) if(PATCHES[i][0]===cls) return PATCHES[i][1];
    return 0;
  }

  /* Natural border-box width of the button's label, measured on an
     off-screen clone with the patch width removed (other classes kept,
     so e.g. the trimmed 6px padding is honoured). */
  function naturalWidth(el){
    var c=el.cloneNode(true);
    c.removeAttribute('id');
    for(var i=0;i<BWCLS.length;i++) c.classList.remove(BWCLS[i]);
    c.classList.remove('bw-stretch');
    c.setAttribute('data-pf-probe','1');
    c.style.cssText='position:absolute!important;left:-9999px!important;top:0!important;'+
      'visibility:hidden!important;width:auto!important;max-width:none!important;'+
      'min-width:0!important;white-space:nowrap!important;flex:none!important;'+
      'margin:0!important;transform:none!important;';
    (el.parentNode||document.body).appendChild(c);
    var w=c.offsetWidth;
    c.remove();
    return w;
  }

  function fitOne(el){
    if(el.dataset.pfProbe) return; /* our own measuring clone */
    if(el.dataset.pfDone && el.dataset.pfLabel===el.textContent) return; /* fitted, label unchanged */
    /* note-act text buttons stay borderless unless already pinned to a patch
       group (e.g. Exit tutorial): only those get refitted. */
    var isTextBtn=el.classList.contains('note-act')&&!el.classList.contains('btn')&&!el.classList.contains('btn2');
    var hasBw=false;
    for(var h=0;h<BWCLS.length;h++) if(el.classList.contains(BWCLS[h])){ hasBw=true; break; }
    if(isTextBtn && !hasBw) return;
    var r=el.getBoundingClientRect();
    if(!r.width && !r.height) return; /* hidden or detached: try again later */
    var need=naturalWidth(el);
    if(!need) return;
    /* Full-width detection: the layout stretches this button well beyond
       its content, so a fixed patch can't cover it — leave it as it is. */
    var laid=el.offsetWidth;
    if(laid>need+40 && laid>MAXW+20) return;

    var cur=null, wasStretch=el.classList.contains('bw-stretch');
    for(var i=0;i<BWCLS.length;i++) if(el.classList.contains(BWCLS[i])){ cur=BWCLS[i]; break; }
    if(cur && !wasStretch && patchWidth(cur)>=need){
      el.dataset.pfDone='1'; el.dataset.pfLabel=el.textContent; /* pin still fits: keep it */
      return;
    }
    var want=null, stretch=false;
    for(var j=0;j<PATCHES.length;j++){ if(PATCHES[j][1]>=need){ want=PATCHES[j][0]; break; } }
    if(!want){ want='bw302'; stretch=true; } /* longer than any patch: stretch the largest */
    for(var k=0;k<BWCLS.length;k++) el.classList.remove(BWCLS[k]);
    el.classList.remove('bw-stretch');
    el.classList.add(want);
    if(stretch) el.classList.add('bw-stretch');
    el.dataset.pfDone='1';
    el.dataset.pfLabel=el.textContent;
  }

  function fitAll(root){
    var scope=root||document;
    var list=scope.querySelectorAll?scope.querySelectorAll('.btn, .btn2, .note-act'):[];
    for(var i=0;i<list.length;i++){ try{ fitOne(list[i]); }catch(e){} }
  }

  var t=null;
  /* Run before the next paint (not 150ms after) so patch classes land in the
     same frame as the render — buttons never show their pre-patch background. */
  function schedule(){
    if(t) cancelAnimationFrame(t);
    t=requestAnimationFrame(function(){ t=null; fitAll(document); });
  }

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',function(){ fitAll(document); });
  }else{ fitAll(document); }
  if(window.MutationObserver){
    new MutationObserver(schedule).observe(document.documentElement,
      {childList:true,subtree:true,attributes:true,attributeFilter:['hidden','open','class','style']});
  }
  window.__patchFit={fitAll:fitAll,fitOne:fitOne};
})();
