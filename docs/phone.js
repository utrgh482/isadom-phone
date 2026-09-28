/* =====================================================================
 *  이사돔 핸드폰 — 핸드폰 층 phone.js  v0.3 (2026-09-28)
 *  PC 이사돔의 화면 파일(app.js·direct.js·consult.js·todo.js·dash.js·tagup.js·quali.js·memowin.js)을 그대로 쓰고,
 *  이 파일이 맨 뒤에 읽혀 핸드폰에 맞게 덧입힙니다. PC 파일은 고치지 않습니다.
 *   - 아래 탭 줄: 홈(대시보드) · 할일 · 상담 · 메모 · 더보기(지도사업 표 · 직접 사업 요약·가계부·현황 · 지원자격 찾기 · PC 와 주고받기)
 *   - 핸드폰에서 안 보이는 것: 사업 등록 · 스캔 찾기 · 부가세 · 월급 계산기 · 관리 · 계획표 · 표의 칸 속 서류 목록 · 상담의 전화번호·농가명 · 메모의 농가 칸 · 대시보드 파일 찾기
 *   - 처음 한 번 이름과 비밀번호를 정하고, 그 뒤로는 열 때마다(그리고 10분 넘게 다른 앱에 갔다 오면) 비밀번호를 넣습니다
 *     (자료는 sw.js 가 핸드폰 안에 저장 · 비밀번호는 잠근 값만 남고 되찾을 수 없음 → 잊으면 핸드폰 자료를 지우고 처음부터)
 * ===================================================================== */
(function(){
'use strict';
if(!window.ISADOM_PHONE) return;
const PV='v0.3 (2026-09-28)';
const RELOCK_MIN=10;                                  /* 다른 앱에 이만큼 넘게 갔다 오면 다시 비밀번호 */
const q=(s,r)=>(r||document).querySelector(s), qa=(s,r)=>[...(r||document).querySelectorAll(s)];
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const post=(u,b)=>fetch(u,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(b||{})}).then(r=>r.json());
document.body.classList.add('phone');
const inApp=!!(window.IsadomApp&&typeof IsadomApp.version==='function');

/* ---------- 아래 탭 줄 · 더보기 ---------- */
const TABS=[{id:'dash',l:'홈'},{id:'todo',l:'할일'},{id:'consult',l:'상담'},{id:'memo',l:'메모'},{id:'more',l:'더보기'}];
const MORE=[{id:'grid',l:'지도사업 진행현황 표',s:'사업 × 15단계 · 보기만'},{id:'dsum',l:'직접 사업 요약',s:'보기만'},{id:'dledger',l:'가계부',s:'숫자 · 보기만'},{id:'dstat',l:'직접 사업 현황',s:'단계·서류 체크'},{id:'quali',l:'지원자격 찾기',s:''},{id:'psync',l:'PC 와 주고받기',s:'밴드로 파일 보내고 가져오기 — 준비 중'}];
const tabOf=id=>({dash:'dash',todo:'todo',consult:'consult',memo:'memo'})[id]||'more';
const bar=document.createElement('nav'); bar.className='pbar'; bar.id='pbar';
bar.innerHTML=TABS.map(t=>`<button type="button" data-ptab="${t.id}"><span class="ico ${t.id}"></span>${t.l}</button>`).join('');
document.body.appendChild(bar);
const sheet=document.createElement('div'); sheet.className='pmore'; sheet.id='pmore'; sheet.hidden=true;
sheet.innerHTML=`<div class="pmscrim"></div><div class="pmbox"><div class="pmhandle"></div><div class="pmlist">${MORE.map(m=>`<button type="button" data-pmore="${m.id}"><b>${m.l}</b>${m.s?`<small>${m.s}</small>`:''}</button>`).join('')}</div>
  <div class="pmfoot"><span id="pm-who"></span><button type="button" class="lnk" id="pm-name">이름 바꾸기</button><button type="button" class="lnk" id="pm-pw">비밀번호 바꾸기</button><span class="faint" id="pm-info">핸드폰 화면 ${PV}${inApp?' · 앱 '+E(IsadomApp.version()):''}</span></div></div>`;
document.body.appendChild(sheet);
function paintBar(){ const cur=(typeof PAGE!=='undefined')?PAGE:''; const on=tabOf(cur); qa('#pbar [data-ptab]').forEach(b=>b.classList.toggle('on',b.dataset.ptab===on)); bar.hidden=!(typeof LOGGED!=='undefined'&&LOGGED); }
function myName(){ return (typeof ME!=='undefined'&&ME&&ME.name)||''; }
function openMore(){ const w=q('#pm-who'); if(w) w.textContent=myName()?`이름: ${myName()}`:''; sheet.hidden=false; requestAnimationFrame(()=>sheet.classList.add('open')); }
function closeMore(){ sheet.classList.remove('open'); setTimeout(()=>{ sheet.hidden=true; },180); }
bar.addEventListener('click',e=>{ const b=e.target.closest('[data-ptab]'); if(!b) return; if(b.dataset.ptab==='more'){ openMore(); return; } closeMore(); showPage(b.dataset.ptab); });
sheet.addEventListener('click',e=>{ const t=e.target;
  if(t.classList.contains('pmscrim')){ closeMore(); return; }
  const m=t.closest('[data-pmore]'); if(m){ closeMore(); showPage(m.dataset.pmore); return; }
  if(t.id==='pm-name'){ const n=prompt('이 핸드폰에서 쓸 이름',myName()); if(n==null) return; const name=n.trim(); if(!name) return;
    post('/api/phone/rename',{name}).then(r=>{ if(!r.ok){ alert(r.error||'바꾸지 못했습니다.'); return; } try{ ME=r.user; }catch(e){} const el=q('#meName'); if(el) el.textContent=name; const w=q('#pm-who'); if(w) w.textContent=`이름: ${name}`; }); return; }
  if(t.id==='pm-pw'){ closeMore(); if(typeof openPwModal==='function') openPwModal(false); return; }
});

/* ---------- app.js 의 화면 바꾸기에 끼어들기 ---------- */
const _sp=window.showPage;
if(typeof _sp==='function') window.showPage=function(id){ const r=_sp.apply(this,arguments); if(id==='psync') drawSync(); fixWords(id); paintBar(); return r; };
/* PC 안내글 중 핸드폰에서 안 되는 이야기만 바꿔 씁니다 */
function fixWords(id){
  if(id==='grid'){ const d=q('#page-grid .desc'); if(d&&/칸을 누르면 서류 목록/.test(d.innerHTML)) d.innerHTML=d.innerHTML.replace(/사업 이름을 누르면 요약, 칸을 누르면 서류 목록, 단계 이름을 누르면 사업별로 모아 보기\./,'사업 이름을 누르면 요약을 봅니다. 서류 체크와 서류 목록은 PC 에서.'); }
}
const _sl=window.setLogged;
if(typeof _sl==='function') window.setLogged=function(on){ const r=_sl.apply(this,arguments); paintBar(); if(on) refreshPw(); return r; };
/* 표는 보기만: 칸을 눌러도 서류 목록(농가 이름)을 열지 않습니다. 사업 요약은 열되 계획표는 안 엽니다 */
['showCell','showUnit','showCommon','showFarmVendors','showCalls','showStage'].forEach(n=>{ if(typeof window[n]==='function') window[n]=function(){}; });
const _od=window.openDetail; if(typeof _od==='function') window.openDetail=function(alias,tab){ return _od.call(this,alias,'sum'); };
const _dd=window.drawDetail; if(typeof _dd==='function') window.drawDetail=function(){ try{ if(typeof subtab!=='undefined'&&subtab!=='sum') subtab='sum'; }catch(e){} return _dd.apply(this,arguments); };

/* ---------- 처음 한 번: 이름과 비밀번호 정하기 (app.js 의 로그인 폼을 고쳐 씁니다) ---------- */
(function(){
  const f=q('#loginForm'); if(!f) return;
  const h=q('h1',f); if(h) h.innerHTML='이사돔 핸드폰<small>처음 한 번 이름과 비밀번호를 정해 주세요 — 열 때마다 비밀번호를 넣습니다</small>';
  const em=q('#lgEmail'); if(em){ em.placeholder='예: 유진'; em.setAttribute('autocomplete','off'); const lab=em.closest('label'); if(lab) lab.firstChild.textContent='이름 '; }
  const pw=q('#lgPw'); if(pw){ pw.placeholder='4글자 이상 · 숫자만 써도 됩니다'; pw.setAttribute('autocomplete','new-password'); const lab=pw.closest('label'); if(lab){ lab.firstChild.textContent='비밀번호 '; const lab2=document.createElement('label'); lab2.className='fld'; lab2.innerHTML='비밀번호 한 번 더 <input id="lgPw2" type="password" autocomplete="new-password">'; lab.after(lab2); } }
  ['#lgHint','#lgBack'].forEach(s=>{ const el=q(s); if(el) el.hidden=true; });
  const go=q('#lgGo'); if(go) go.textContent='시작하기';
  const cr=q('.fontCredit',f); if(cr) cr.style.marginTop='30px';
  const pn=q('#pwNew'); if(pn){ const lab=pn.closest('label'); if(lab) lab.firstChild.textContent='새 비밀번호 (4글자 이상)'; }
  /* app.js 보다 먼저(잡는 단계에서) 검사해서 틀리면 보내지 않습니다 */
  document.addEventListener('submit',e=>{
    if(e.target!==f) return; const msg=q('#lgMsg'); const name=(q('#lgEmail').value||'').trim(), a=q('#lgPw').value, b=(q('#lgPw2')||{}).value||'';
    let bad=''; if(!name) bad='이름을 넣어 주세요.'; else if(a.length<4) bad='비밀번호는 4글자 이상으로 해 주세요.'; else if(a!==b) bad='비밀번호 두 개가 다릅니다.';
    if(bad){ e.preventDefault(); e.stopImmediatePropagation(); if(msg) msg.textContent=bad; }
  },true);
})();
/* app.js 가 나중에 로그인 안내글을 바꿔 넣어도 숨긴 채로 */
new MutationObserver(()=>{ const el=q('#lgHint'); if(el&&!el.hidden) el.hidden=true; }).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['hidden']});

/* ---------- 잠금 화면: 열 때마다 비밀번호 ---------- */
let HAS_PW=false, LOCKED=false, hiddenAt=0;
const lock=document.createElement('div'); lock.id='plock'; lock.className='loginWrap plock'; lock.hidden=true;
lock.innerHTML=`<form class="loginBox" id="plockForm" autocomplete="off" novalidate>
  <h1>이사돔<small id="plock-sub"></small></h1>
  <label class="fld" id="plock-l1">비밀번호<input id="plock-pw" type="password" autocomplete="current-password"></label>
  <label class="fld" id="plock-l2" hidden>비밀번호 한 번 더<input id="plock-pw2" type="password" autocomplete="new-password"></label>
  <div class="msg" id="plock-msg"></div>
  <button class="btn primary" type="submit" id="plock-go">열기</button>
  <button type="button" class="lgBack" id="plock-forgot">비밀번호를 잊으셨나요?</button>
</form>`;
document.body.appendChild(lock);
function showLock(mode){   /* 'unlock' 비밀번호 확인 · 'set' 비밀번호가 아직 없는 자료(옛 판)면 정하기 */
  LOCKED=true; lock.dataset.mode=mode; lock.hidden=false;
  q('#plock-sub').textContent=mode==='set'?'이 핸드폰의 이사돔에 비밀번호를 정해 주세요 (4글자 이상)':(myName()?`${myName()} 님 — 비밀번호를 넣어 주세요`:'비밀번호를 넣어 주세요');
  q('#plock-l2').hidden=mode!=='set'; q('#plock-forgot').hidden=mode==='set'; q('#plock-go').textContent=mode==='set'?'정하기':'열기';
  q('#plock-pw').value=''; q('#plock-pw2').value=''; q('#plock-msg').textContent='';
  setTimeout(()=>{ try{ q('#plock-pw').focus(); }catch(e){} },50);
}
function hideLock(){ LOCKED=false; lock.hidden=true; }
q('#plockForm').addEventListener('submit',async e=>{
  e.preventDefault(); const msg=q('#plock-msg'), pw=q('#plock-pw').value, go=q('#plock-go'); msg.textContent='';
  if(lock.dataset.mode==='set'){
    if(pw.length<4){ msg.textContent='비밀번호는 4글자 이상으로 해 주세요.'; return; }
    if(pw!==q('#plock-pw2').value){ msg.textContent='비밀번호 두 개가 다릅니다.'; return; }
    go.disabled=true; const r=await post('/api/auth/password',{current:'',next:pw}).catch(()=>({})); go.disabled=false;
    if(!r.ok){ msg.textContent=r.error||'정하지 못했습니다.'; return; }
    HAS_PW=true; hideLock(); return;
  }
  if(!pw){ msg.textContent='비밀번호를 넣어 주세요.'; return; }
  go.disabled=true; const r=await post('/api/auth/login',{email:myName(),password:pw}).catch(()=>({})); go.disabled=false;
  if(!r.ok){ msg.textContent=r.error||'비밀번호가 다릅니다.'; q('#plock-pw').value=''; q('#plock-pw').focus(); return; }
  hideLock();
});
q('#plock-forgot').addEventListener('click',()=>{
  if(!confirm('비밀번호는 되찾을 수 없습니다.\n\n대신 이 핸드폰의 이사돔 자료(할일·메모·상담·사진·이름)를 모두 지우고 처음부터 시작할 수 있습니다. 사무실 PC 이사돔의 자료는 그대로입니다.\n\n지우고 처음부터 할까요?')) return;
  const t=prompt('정말 지우려면 "지움" 이라고 적어 주세요.',''); if(t==null||t.trim()!=='지움') return;
  post('/api/phone/reset').then(()=>location.reload()).catch(()=>alert('지우지 못했습니다. 앱을 닫았다 다시 열어 보세요.'));
});
/* 열자마자: 이름·비밀번호가 있으면 잠근 채로 시작 (자료가 그려지기 전에 덮습니다) */
lock.hidden=false; LOCKED=true; q('#plock-sub').textContent=''; q('#plock-l1').hidden=true; q('#plock-go').hidden=true; q('#plock-forgot').hidden=true;
fetch('/api/phone/info',{cache:'no-store'}).then(r=>r.json()).catch(()=>null).then(info=>{
  q('#plock-l1').hidden=false; q('#plock-go').hidden=false;
  if(!info||!info.ok||!info.name){ hideLock(); return; }          /* 처음: 이름·비밀번호 정하는 화면이 뜹니다 */
  HAS_PW=!!info.hasPw; showLock(HAS_PW?'unlock':'set');
});
/* 비밀번호가 있는지 다시 확인 (처음 정한 직후 · 바꾼 뒤) */
function refreshPw(){ return fetch('/api/phone/info',{cache:'no-store'}).then(r=>r.json()).then(i=>{ if(i&&i.ok) HAS_PW=!!i.hasPw; return HAS_PW; }).catch(()=>HAS_PW); }
/* 다른 앱에 갔다가 한참 만에 돌아오면 다시 비밀번호 */
document.addEventListener('visibilitychange',()=>{ if(document.hidden){ hiddenAt=Date.now(); return; } const away=hiddenAt?Date.now()-hiddenAt:0; hiddenAt=0; if(away>RELOCK_MIN*60000&&!LOCKED) refreshPw().then(has=>{ if(has&&!LOCKED) showLock('unlock'); }); });

/* ---------- 크게 보기: 내려받기는 앱의 다운로드 폴더로 ---------- */
document.addEventListener('click',e=>{
  const a=e.target.closest&&e.target.closest('#viewer a[download]'); if(!a) return;
  e.preventDefault(); e.stopPropagation();
  const name=a.getAttribute('download')||'file';
  fetch(a.getAttribute('href')).then(r=>r.blob()).then(b=>{
    if(inApp&&IsadomApp.saveFile){ const fr=new FileReader(); fr.onload=()=>IsadomApp.saveFile(name,String(fr.result).split(',')[1],b.type||''); fr.readAsDataURL(b); return; }
    const u=URL.createObjectURL(b), t=document.createElement('a'); t.href=u; t.download=name; document.body.appendChild(t); t.click(); t.remove(); setTimeout(()=>URL.revokeObjectURL(u),4000);
  }).catch(()=>alert('파일을 내려받지 못했습니다.'));
},true);

/* ---------- PC 와 주고받기 (자리) ---------- */
function drawSync(){
  const pg=q('#page-psync'); if(!pg) return;
  fetch('/api/phone/info').then(r=>r.json()).catch(()=>({})).then(info=>{
    pg.innerHTML=`<div class="lede">PC 와 주고받기</div><div class="lede-sub">사무실 PC 이사돔과 이 핸드폰은 서로 연결되지 않습니다. 잠긴 파일 하나를 <b>밴드</b>로 주고받아 맞춥니다.</div>
      <div class="card"><h2>PC 에서 온 파일 가져오기</h2><p class="desc">밴드에서 내려받은 <b>이사돔_핸드폰_….isd</b> 파일을 고르고 이사돔 비밀번호를 넣으면, 할일·메모·상담·현황과 PC 의 표·가계부 숫자가 이 핸드폰에 들어옵니다. 양쪽에서 같은 것을 고쳤으면 나중 것이 남고 몇 개인지 알려 줍니다.</p><button type="button" class="btn primary" disabled>파일 고르기 (준비 중)</button></div>
      <div class="card"><h2>PC 로 보낼 파일 만들기</h2><p class="desc">이 핸드폰에서 고친 할일·메모·상담·현황 체크와 새로 찍은 사진을 잠긴 파일 하나로 만들어 다운로드 폴더에 둡니다. 밴드에 올리면 PC 이사돔의 [핸드폰에서 가져오기]로 받습니다.</p><button type="button" class="btn primary" disabled>파일 만들기 (준비 중)</button></div>
      <div class="card"><h2>이 핸드폰 안</h2><div class="kv2"><span>자료 판</span><b>${info&&info.version!=null?info.version:'—'}</b><span>마지막 저장</span><b>${info&&info.updatedAt?new Date(info.updatedAt).toLocaleString('ko-KR'):'—'}</b><span>사진·파일</span><b>${info&&info.files!=null?`${info.files}장 · ${Math.round((info.bytes||0)/1024/1024*10)/10}MB`:'—'}</b><span>핸드폰 서버</span><b>${E(info&&info.sw||'—')}</b></div>
        <p class="hint">자료는 이 핸드폰 안(앱 저장 공간)에만 있습니다. 앱을 지우면 같이 지워지니, 중요한 것은 PC 로 보내 두세요. 비밀번호는 [더보기]에서 바꿉니다.</p></div>`;
  });
}

/* 처음(이름 없음)이면 지원자격 화면 대신 이름·비밀번호 정하는 화면을 바로 엽니다 */
let tries=0; const t=setInterval(()=>{ tries++; if(typeof LOGGED!=='undefined'&&LOGGED){ clearInterval(t); return; } if(tries>=3&&typeof ME!=='undefined'&&!ME&&!LOCKED){ const w=q('#loginWrap'); if(w&&w.hidden){ w.hidden=false; const em=q('#lgEmail'); if(em) em.focus(); } } if(tries>40) clearInterval(t); },300);
paintBar();
window.PHONE={version:PV,openMore,closeMore,drawSync,lockNow:()=>showLock('unlock'),isLocked:()=>LOCKED};
})();
