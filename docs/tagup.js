/* =====================================================================
 *  이사돔 — 붙일 때 태그 달기  tagup.js  v1 (2026-09-22)
 *  어디서든(서류 목록 [스캔 첨부]·계획표 [사진]·메모 [+ 사진]·현황 [첨부]·상담 [+ 사진]·크게 보기 [+ 추가]) 파일을 고르고 나면
 *  화면 아래 가운데에 작은 상자가 떠서, 방금 붙인 파일 전부에 태그를 한 번에 답니다. (적고 Enter · 쉼표로 여러 개 · [나중에]로 건너뜀)
 *  지난번에 단 태그가 미리 들어 있어(글자가 선택된 채) 그대로 Enter 하면 같은 태그, 새로 적으면 새 태그입니다.
 *  app.js 의 pickFiles 를 감싸서(wrap) 동작합니다 — app.js 는 고치지 않았습니다. 이 파일이 없어도 나머지는 그대로 돕니다.
 * ===================================================================== */
(function(){
'use strict';
if(typeof window.pickFiles!=='function'){ console.warn('tagup.js: app.js 의 pickFiles 가 먼저 있어야 합니다'); return; }
const q=(s,r)=>(r||document).querySelector(s);
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
let BATCH=[];        /* 방금 붙인 파일들 */
let LAST=[];         /* 지난번에 단 태그 */
const box=document.createElement('div'); box.id='tagup'; box.className='tagup'; box.hidden=true; document.body.appendChild(box);
const parse=s=>[...new Set(String(s||'').split(',').map(x=>x.trim()).filter(Boolean))];
function freqTags(){ const n={}; FILES.forEach(f=>(f.tags||[]).forEach(t=>n[t]=(n[t]||0)+1)); return Object.keys(n).sort((a,b)=>n[b]-n[a]||a.localeCompare(b,'ko')).slice(0,14); }
function show(added){
  BATCH=added.slice(); const recent=LAST.filter(Boolean), freq=freqTags().filter(t=>!recent.includes(t));
  box.innerHTML=`<div class="tuHead"><b>방금 붙인 파일 ${BATCH.length}장에 태그 달기</b><span class="faint">${BATCH.map(f=>E(f.name)).join(', ')}</span><button type="button" class="btn sm ghost" id="tu-later">나중에 ×</button></div>
    <div class="tuRow"><div class="thumbs">${BATCH.slice(0,5).map(f=>thumbHTML(f,'','','span')).join('')}${BATCH.length>5?`<span class="faint" style="align-self:center">+${BATCH.length-5}</span>`:''}</div>
      <input id="tu-in" value="${E(recent.join(', '))}" placeholder="태그 적고 Enter (쉼표로 여러 개: 견적서, 국화)" maxlength="200" autocomplete="off"><button type="button" class="btn sm primary" id="tu-go">달기</button></div>
    ${(recent.length||freq.length)?`<div class="tuChips">${recent.length?`<span class="faint">지난번</span>${recent.map(t=>`<button type="button" class="tag" data-tu="${E(t)}">${E(t)}</button>`).join('')}`:''}${freq.length?`<span class="faint" style="margin-left:${recent.length?8:0}px">자주 쓰는</span>${freq.map(t=>`<button type="button" class="tag" data-tu="${E(t)}">${E(t)}</button>`).join('')}`:''}</div>`:''}
    <div class="hint">${recent.length?'지난번 태그가 미리 들어 있습니다 — 그대로 Enter 하면 같은 태그, 새로 적으면 새 태그. ':''}알약을 누르면 칸에 들어갑니다. 나중에 달려면 대시보드 [파일 찾기]나 크게 보기에서.</div>`;
  box.hidden=false;
  setTimeout(()=>{ const i=q('#tu-in',box); if(i){ i.focus(); i.select(); } },40);   /* 크게 보기가 먼저 초점을 가져가도 상자 칸으로 */
}
function hide(){ box.hidden=true; BATCH=[]; }
function apply(){
  const tags=parse((q('#tu-in',box)||{}).value); if(!tags.length){ hide(); return; }
  let n=0; BATCH.forEach(f=>{ if(!FILES.includes(f)) return; f.tags=f.tags||[]; tags.forEach(t=>{ if(!f.tags.includes(t)){ f.tags.push(t); n++; } }); });
  LAST=tags.slice(); hide();
  try{ repaintFiles(); }catch(e){}
  try{ if(typeof PAGE!=='undefined'&&PAGE==='dash'&&window.DASH&&DASH.drawDash) DASH.drawDash(); }catch(e){}
  try{ const v=q('#viewer'); if(v&&!v.hidden&&typeof renderViewer==='function') renderViewer(); }catch(e){}
}
box.addEventListener('click',ev=>{ const t=ev.target;
  if(t.id==='tu-later'){ hide(); return; }
  if(t.id==='tu-go'){ apply(); return; }
  const c=t.closest('[data-tu]'); if(c){ const i=q('#tu-in',box); if(!i) return; const cur=parse(i.value); if(!cur.includes(c.dataset.tu)) cur.push(c.dataset.tu); i.value=cur.join(', '); i.focus(); i.setSelectionRange(i.value.length,i.value.length); }
});
box.addEventListener('keydown',ev=>{ if(ev.target.id!=='tu-in') return; if(ev.key==='Enter'){ ev.preventDefault(); apply(); } else if(ev.key==='Escape'){ ev.preventDefault(); hide(); } });
/* app.js 의 pickFiles 를 감쌉니다: 원래 할 일(cb)을 다 한 뒤 상자를 띄웁니다 */
const _pick=window.pickFiles;
window.pickFiles=function(ref,cb){
  return _pick.call(this,ref,function(added){ let r; try{ if(typeof cb==='function') r=cb.apply(this,arguments); } finally{ if(added&&added.length) show(added); } return r; });
};
window.TAGUP={show,hide,apply,last:()=>LAST.slice(),batch:()=>BATCH.slice()};
})();
