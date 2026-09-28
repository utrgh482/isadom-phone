/* =====================================================================
 *  이사돔 — 떠 있는 메모 창  memowin.js  v1 (2026-09-21)
 *  위쪽 [+ 메모] 를 누르면 화면 오른쪽 아래에 메모 창이 떠서, 다른 화면(진행현황·계획표·가계부…)을
 *  보면서 적을 수 있습니다. 머리 부분을 끌어 옮기고, [－] 로 접고, [×] 로 닫아도 적던 내용은 남습니다.
 *  app.js 의 메모 자료(MEMOS·MEMO_CATS)와 사진 붙이기(pickFiles)를 그대로 씁니다.
 *  이 파일이 없어도 나머지 화면은 그대로 돕니다.
 * ===================================================================== */
(function(){
'use strict';
const PENDING=-1;                                  /* 저장 전 사진에 붙이는 임시 메모 번호 (메모 화면의 임시 번호 0 과 겹치지 않게) */
const pref=()=>({kind:'memo',id:PENDING});
const pfiles=()=>filesFor(pref());
let win=null, dragging=null, statusTimer=null;
const draft={date:'',due:'',cat:'',alias:'',farm:'',title:'',body:''};
const hasDraft=()=>!!(draft.title.trim()||draft.body.trim()||pfiles().length);

function ensure(){
  if(win) return win;
  win=document.createElement('div'); win.id='memoWin'; win.className='memoWin'; win.hidden=true;
  win.innerHTML=`<div class="mwHead"><span class="mwTitle">메모 <small class="faint">적어 두기</small></span>
      <span class="mwBtns"><button type="button" class="bare" data-mw="page" title="메모 화면으로">목록</button><button type="button" class="bare" data-mw="min" title="접기">－</button><button type="button" class="bare" data-mw="close" title="닫기 (적던 내용은 남습니다)">×</button></span></div>
    <div class="mwBody"></div><datalist id="dl-mwfarm"></datalist>`;
  document.body.appendChild(win); bind(); return win;
}
function open(){
  if(typeof LOGGED!=='undefined'&&!LOGGED) return;
  ensure();
  if(!draft.date) draft.date=today();
  if(!draft.cat) draft.cat=MEMO_CATS[0]||'';
  win.hidden=false; win.classList.remove('min');
  paint(); const b=$('#mw-body',win); if(b) b.focus();
}
function hide(){ if(win) win.hidden=true; }
function paint(){
  const mine=PROJECTS.filter(p=>p.mine), v=draft;
  $('.mwBody',win).innerHTML=`<div class="mform">
      <div class="f"><span>날짜</span><input type="date" id="mw-date" ${DLIM} value="${esc(v.date)}"></div>
      <div class="f"><span>기한 (선택)</span><input type="date" id="mw-due" ${DLIM} value="${esc(v.due)}"></div>
      <div class="f"><span>분류</span><select id="mw-cat">${MEMO_CATS.map(c=>`<option ${v.cat===c?'selected':''}>${esc(c)}</option>`).join('')}<option value="__new" ${v.cat==='__new'?'selected':''}>── 새 분류…</option></select>
        <div id="mw-newcat" ${v.cat==='__new'?'':'hidden'} style="margin-top:6px"><input placeholder="새 분류 이름" value="${esc(v.newcat||'')}"></div></div>
      <div class="f"><span>사업 (선택)</span><select id="mw-alias"><option value="">(사업 없음)</option>${mine.map(p=>`<option value="${esc(p.alias)}" ${v.alias===p.alias?'selected':''}>${esc(p.alias)}</option>`).join('')}</select></div>
      <div class="f wide"><span>농가 (선택)</span><input id="mw-farm" list="dl-mwfarm" value="${esc(v.farm)}" placeholder="이름" autocomplete="off"></div>
      <div class="f wide"><span>제목</span><input id="mw-title" value="${esc(v.title)}" placeholder="한 줄로"></div>
      <div class="f wide"><span>내용</span><textarea id="mw-body" placeholder="나눈 이야기, 해야 할 것, 언제까지">${esc(v.body)}</textarea></div>
      <div class="f wide"><span>사진 · 스캔 (선택)</span><div class="thumbs" id="mw-files"></div></div>
    </div>
    <div class="row"><button type="button" class="btn sm primary" id="mw-save">적어 두기</button><button type="button" class="btn sm ghost" id="mw-clear">비우기</button><span class="hint" id="mw-status">Ctrl+Enter 로도 저장됩니다.</span></div>`;
  fillFarms(); paintFiles();
}
function fillFarms(){ const dl=$('#dl-mwfarm',win); if(dl) dl.innerHTML=allFarmNames(draft.alias).map(n=>`<option value="${esc(n)}">`).join(''); }
function paintFiles(){
  const box=win&&$('#mw-files',win); if(!box) return;
  const fs=pfiles();
  box.innerHTML=fs.map((f,k)=>thumbHTML(f,`data-mwopen="${k}"`)).join('')+`<button type="button" class="thumb add" id="mw-pick" title="사진·스캔 붙이기">+ 사진</button>`+(fs.length?`<span class="hint" style="align-self:center">${fs.length}장 · 누르면 크게</span>`:'');
}
function status(t,keep){ const el=$('#mw-status',win); if(!el) return; el.textContent=t; clearTimeout(statusTimer); if(!keep) statusTimer=setTimeout(()=>{ if(el.textContent===t) el.textContent='Ctrl+Enter 로도 저장됩니다.'; },2500); }
function read(){
  draft.date=$('#mw-date',win).value; draft.due=$('#mw-due',win).value; draft.cat=$('#mw-cat',win).value; draft.newcat=$('#mw-newcat input',win).value;
  draft.alias=$('#mw-alias',win).value; draft.farm=$('#mw-farm',win).value; draft.title=$('#mw-title',win).value; draft.body=$('#mw-body',win).value;
}
function save(){
  read();
  const title=draft.title.trim(), body=draft.body.trim();
  if(!title&&!body){ $('#mw-title',win).focus(); status('제목이나 내용을 적어 주세요.'); return; }
  let cat=draft.cat;
  if(cat==='__new'){ cat=(draft.newcat||'').trim(); if(!cat){ $('#mw-newcat input',win).focus(); status('새 분류 이름을 적어 주세요.'); return; } if(!MEMO_CATS.includes(cat)) MEMO_CATS.push(cat); }
  const m=mkMemo({date:draft.date||today(),due:draft.due||'',cat,alias:draft.alias,farm:draft.farm.trim(),title:title||body.split('\n')[0].slice(0,40),body});
  MEMOS.push(m); pfiles().forEach(f=>{f.ref.id=m.id;});
  if(typeof PAGE!=='undefined'&&PAGE==='memo'){ paintMemoTools(); paintMemoList(); }
  /* 다음 메모를 위해 날짜·분류·사업은 두고 나머지는 비웁니다 */
  Object.assign(draft,{cat,farm:'',title:'',body:'',due:'',newcat:''});
  paint(); status('적어 두었습니다 ✓'); $('#mw-title',win).focus();
}
function clear(){
  read(); if(hasDraft()&&!confirm('적던 내용과 붙인 사진을 비울까요?')) return;
  pfiles().forEach(f=>removeFile(f));
  Object.assign(draft,{due:'',farm:'',title:'',body:'',newcat:''}); paint();
}
function bind(){
  win.addEventListener('click',e=>{
    const t=e.target, b=t.closest('[data-mw]');
    if(b){ const k=b.dataset.mw; if(k==='min') win.classList.toggle('min'); else if(k==='close'){ read(); hide(); } else if(k==='page'){ read(); showPage('memo'); } return; }
    if(t.id==='mw-save'){ save(); return; }
    if(t.id==='mw-clear'){ clear(); return; }
    if(t.id==='mw-pick'){ read(); pickFiles(pref(),()=>paintFiles()); return; }
    const fo=t.closest('[data-mwopen]'); if(fo){ const fs=pfiles(); openViewer(fs.map(x=>x.id),+fo.dataset.mwopen,pref(),'메모 창 사진'); return; }
  });
  win.addEventListener('change',e=>{
    if(e.target.id==='mw-cat'){ const nb=$('#mw-newcat',win); if(e.target.value==='__new'){ nb.hidden=false; $('input',nb).focus(); } else nb.hidden=true; }
    if(e.target.id==='mw-alias'){ read(); fillFarms(); }
  });
  win.addEventListener('input',()=>{ if($('#mw-title',win)) read(); });
  win.addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){ e.preventDefault(); save(); } if(e.key==='Escape') e.stopPropagation(); });
  /* 머리 부분을 끌어서 옮기기 */
  const head=$('.mwHead',win);
  head.addEventListener('pointerdown',e=>{ if(e.target.closest('button')) return; const r=win.getBoundingClientRect(); dragging={dx:e.clientX-r.left,dy:e.clientY-r.top,w:r.width,h:r.height}; head.setPointerCapture(e.pointerId); e.preventDefault(); });
  head.addEventListener('pointermove',e=>{ if(!dragging) return; const x=Math.max(0,Math.min(e.clientX-dragging.dx,window.innerWidth-dragging.w)), y=Math.max(0,Math.min(e.clientY-dragging.dy,window.innerHeight-40)); win.style.left=x+'px'; win.style.top=y+'px'; win.style.right='auto'; win.style.bottom='auto'; });
  head.addEventListener('pointerup',()=>{dragging=null;}); head.addEventListener('pointercancel',()=>{dragging=null;});
  head.addEventListener('dblclick',e=>{ if(!e.target.closest('button')) win.classList.toggle('min'); });
}
/* 위쪽 [+ 메모] 단추 */
function mountButton(){
  const who=$('.topbar .who'); if(!who||$('#memoWinBtn')) return;
  const b=document.createElement('button'); b.type='button'; b.className='btn sm'; b.id='memoWinBtn'; b.title='다른 화면을 보면서 메모를 적을 수 있는 작은 창을 엽니다'; b.textContent='+ 메모';
  b.addEventListener('click',()=>{ if(win&&!win.hidden&&!win.classList.contains('min')) { win.classList.add('min'); } else open(); });
  who.insertBefore(b,who.firstChild);
}
/* app.js 와 잇기 — 사진을 지우면 창도 다시 그리고, 나가면 창을 감춥니다 */
const _repaint=window.repaintFiles; if(typeof _repaint==='function') window.repaintFiles=function(){ _repaint.apply(this,arguments); paintFiles(); };
const _setLogged=window.setLogged; if(typeof _setLogged==='function') window.setLogged=function(on){ _setLogged.apply(this,arguments); if(!on) hide(); };
const _fileCtx=window.fileCtx; if(typeof _fileCtx==='function') window.fileCtx=function(f){ if(f&&f.ref&&f.ref.kind==='memo'&&f.ref.id===PENDING) return {proj:'메모',where:'(메모 창에서 적는 중)',unit:''}; return _fileCtx.apply(this,arguments); };
window.addEventListener('beforeunload',e=>{ if(win&&hasDraft()){ e.preventDefault(); e.returnValue=''; } });
mountButton();
window.MEMOWIN={open,hide,draft,paint};
})();
