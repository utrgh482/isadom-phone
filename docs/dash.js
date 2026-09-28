/* =====================================================================
 *  이사돔 — 대시보드  dash.js  v2.2 (2026-09-22) — 2.1: 위쪽 '이사돔' 누르면 대시보드로 · 2.2: 파일 찾기 칸
 *  차림표 맨 위 [대시보드]: 오늘 할 일 · 일주일 안에 할 일 · 지도사업별 진행(%) · 직접 사업별 집행(%) · 맨 아래 파일 찾기(이름·태그 글자로, 찾은 줄에서 바로 태그 달고 떼기).
 *  오늘·일주일 할 일은 [할일] 화면(todo.js)의 할 일과 메모의 '기한'(아직인 메모만)에서 가져옵니다.
 *  [할일] 화면은 todo.js 가 그립니다(없으면 자리만).
 *  app.js 뒤에 따로 읽히는 파일이라, 없어도 나머지 화면은 그대로 돕니다.
 * ===================================================================== */
(function(){
'use strict';
const q=(s,r)=>(r||document).querySelector(s);
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const wonF=n=>Number(n||0).toLocaleString();
const DOWK=['일','월','화','수','목','금','토'];
const addDays=(ymd,n)=>{const d=new Date(ymd+'T00:00:00'); d.setDate(d.getDate()+n); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
const daysBetween=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);
const fmt=s=>s?String(s).replace(/-/g,'.'):'';

function memoLine(m,t){
  const late=m.due&&m.due<t?daysBetween(m.due,t):0;
  return `<li class="dl-item"><button type="button" class="bare dl-open" data-memo="${m.id}"><b>${E(m.title||m.body.split('\n')[0]||'(제목 없음)')}</b>
    <span class="faint">${[m.farm,m.alias,m.cat].filter(Boolean).map(E).join(' · ')}</span></button>
    <span class="dl-due ${late?'late':''}">${m.due?fmt(m.due):''}${late?` (${late}일 지남)`:''}</span></li>`;
}
function todoLine(x,t){
  const late=window.TODO?TODO.lateOf(x,t):'', subs=(x.subs&&x.subs.length)?` · 체크 ${x.subs.filter(s=>s.ok).length}/${x.subs.length}`:'';
  const when=late?`지나간 일 ${fmt(late)}`:(x.due?`기한 ${fmt(x.due)}`:(x.plan?`예정 ${fmt(x.plan)}`:'날짜 없음'));
  return `<li class="dl-item"><button type="button" class="bare dl-open" data-todo="${E(x.id)}"><b>${E(x.title||'(이름 없음)')}</b>
    <span class="faint">${E(x.proj||'')}${subs}</span></button>
    <span class="dl-due ${late?'late':''}">${when}</span></li>`;
}
/* ---------- 파일 찾기(대시보드 맨 아래) — 붙여 둔 모든 파일(사진·한글·PDF…)을 이름·태그·사업·농가 글자로 찾고, 줄에서 바로 태그를 달거나 뗍니다. 안 찾을 때는 최근 붙인 파일 8장 ---------- */
const FF={q:'',more:false};
function ffList(){ const s=FF.q.trim().toLowerCase(); let L=FILES.slice();
  if(s) L=L.filter(f=>fileSearchText(f).includes(s));
  return L.sort((a,b)=>b.id-a.id); }
function ffRow(f,i){ const c=fileCtx(f);
  return `<div class="ffrow" data-fid="${f.id}">${thumbHTML(f,`data-ffopen="${i}"`)}<div class="ffmain"><button type="button" class="bare ffname" data-ffopen="${i}">${E(f.name)}</button><div class="faint">${E(c.proj)} · ${E(c.where)}${c.unit?` · ${E(c.unit)}`:''} · ${E(f.added||'')}</div></div>
    <div class="fftags">${f.tags.map(t=>`<span class="chip">${E(t)}<button type="button" class="chipx" data-ffdel="${E(t)}" title="태그 빼기">×</button></span>`).join('')}<input class="fftagin" placeholder="+ 태그 (적고 Enter)" maxlength="40"></div></div>`; }
function paintFileFind(){ const box=q('#ff-box'); if(!box) return; const searching=!!FF.q.trim();
  const L=searching?ffList():[], show=FF.more?L:L.slice(0,20), recent=FILES.slice().sort((a,b)=>b.id-a.id).slice(0,8);
  box.innerHTML=`<div class="fsearch" style="margin-bottom:8px"><input id="ff-q" value="${E(FF.q)}" placeholder="파일 이름 · 태그 · 사업 · 농가 · 서류 이름으로 찾기"><span>${searching?`${L.length} / `:''}${FILES.length}장</span></div>
    ${searching?(show.length?`<div class="fflist">${show.map((f,i)=>ffRow(f,i)).join('')}</div>${L.length>show.length?`<div class="row" style="margin-top:8px"><button type="button" class="btn sm ghost" id="ff-more">더 보기 (${L.length}장 중 ${show.length}장)</button></div>`:''}`:'<div class="empty" style="padding:18px">찾는 파일이 없습니다.</div>')
      :(recent.length?`<div class="faint" style="margin:2px 0 4px">최근 붙인 파일 — 누르면 크게</div><div class="thumbs">${recent.map((f,i)=>thumbHTML(f,`data-ffrecent="${i}"`)).join('')}</div>`:'<div class="empty" style="padding:14px">아직 붙인 파일이 없습니다.</div>')}
    <p class="hint" style="margin-bottom:0">태그 이름을 적으면 그 태그가 달린 파일이 나옵니다. 사진·한글·PDF 어떤 파일이든 찾은 줄에서 바로 태그를 달고(적고 Enter, 쉼표로 여러 개) 뗄 수 있고(×), 파일을 눌러 크게 보기에서도 됩니다. 전체 목록·태그별 모아 보기는 지도사업 › [스캔 찾기].</p>`; }
function ffOpen(list,i,title){ openViewer(list.map(f=>f.id),i,null,title); }
function drawDash(){
  const pg=q('#page-dash'); if(!pg) return;
  const t=today(), wk=addDays(t,7), d=new Date();
  const open=(MEMOS||[]).filter(m=>!m.st&&m.due), byDue=(a,b)=>String(a.due).localeCompare(String(b.due));
  const todayL=open.filter(m=>m.due<=t).sort(byDue), weekL=open.filter(m=>m.due>t&&m.due<=wk).sort(byDue);
  const TD=window.TODO?TODO.forDash(t,wk):{today:[],week:[]};
  const nToday=TD.today.length+todayL.length, nWeek=TD.week.length+weekL.length;
  /* 지도사업 — 올해(진행현황에서 고른 해) 내 사업의 서류 진행률 */
  const mine=PROJECTS.filter(p=>p.mine), years=[...new Set(mine.map(p=>p.year))].sort((a,b)=>b-a);
  const y=(typeof YEAR!=='undefined'&&YEAR!=null&&years.includes(YEAR))?YEAR:(years[0]||d.getFullYear());
  const biz=mine.filter(p=>p.year===y).map(p=>{const s=projStat(p); return {p,pct:s.need?Math.round(s.have/s.need*100):null,have:s.have,need:s.need};}).sort((a,b)=>(b.pct==null?-1:b.pct)-(a.pct==null?-1:a.pct));
  /* 직접 사업 — 실집행률 = 결의된 금액 ÷ 통계목 예산 */
  const DSP=(window.DIRECT&&DIRECT.DS&&DIRECT.DS.projects)||[];
  const dyears=[...new Set(DSP.map(p=>p.year))].sort((a,b)=>b-a), dy=dyears.includes(y)?y:(dyears[0]||y);
  const own=DSP.filter(p=>p.year===dy).map(p=>{const bud=(p.budgets||[]).reduce((s,b)=>s+(+b.amt||0),0)*1000, sp=(p.entries||[]).reduce((s,e)=>s+(+e.resAmt||(e.resDate?+e.amt:0)||0),0); return {p,bud,sp,pct:bud?Math.round(sp/bud*100):null};});
  const bar=(pct,cls)=>`<span class="dbar"><i class="${cls||''}" style="width:${Math.max(0,Math.min(100,pct||0))}%"></i></span>`;
  pg.innerHTML=`<div class="lede">대시보드</div>
    <div class="lede-sub">${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DOWK[d.getDay()]}요일 · 오늘 할 일과 일주일 안에 할 일은 [할일] 화면의 할 일과 메모의 <b>기한</b>(아직인 메모만)에서 가져옵니다.</div>
    <div class="dash">
      <div class="card dcard"><h2>오늘 할 일 <span class="pill ${nToday?'warn':'done'}">${nToday}</span></h2>
        ${nToday?`<ul class="dl">${TD.today.map(x=>todoLine(x,t)).join('')}${todayL.map(m=>memoLine(m,t)).join('')}</ul>`:'<div class="empty">오늘 할 일이 없습니다.</div>'}
        <p class="hint">[할일]에 적은 오늘 할 일(지나간 일 포함)과 기한 있는 메모가 뜹니다. 누르면 그리로 갑니다.</p></div>
      <div class="card dcard"><h2>일주일 안에 할 일 <span class="pill ${nWeek?'warn':'done'}">${nWeek}</span> <span class="faint" style="font-weight:400">${fmt(addDays(t,1))} ~ ${fmt(wk)}</span></h2>
        ${nWeek?`<ul class="dl">${TD.week.map(x=>todoLine(x,t)).join('')}${weekL.map(m=>memoLine(m,t)).join('')}</ul>`:'<div class="empty">일주일 안에 할 일이 없습니다.</div>'}</div>
      <div class="card dcard"><h2>지도사업별 현황 <span class="pill done">${y}년</span> <span class="faint" style="font-weight:400">서류 갖춘 비율</span></h2>
        ${biz.length?`<ul class="dl pct">${biz.map(x=>`<li><button type="button" class="bare dl-open" data-proj="${E(x.p.alias)}"><b>${E(x.p.alias)}</b></button>${x.pct==null?'<span class="faint">서류 없음</span>':bar(x.pct,x.pct>=100?'full':'')}<span class="dpct">${x.pct==null?'—':x.pct+'%'}</span></li>`).join('')}</ul>`:'<div class="empty">올해 등록한 지도사업이 없습니다.</div>'}
        <p class="hint">해마다 필요한 서류 전체 중 갖춘 서류의 비율입니다. 사업 이름을 누르면 요약으로 갑니다.</p></div>
      <div class="card dcard"><h2>직접 사업별 현황 <span class="pill done">${dy}년</span> <span class="faint" style="font-weight:400">실집행 비율</span></h2>
        ${own.length?`<ul class="dl pct">${own.map(x=>`<li><button type="button" class="bare dl-open" data-dproj="${x.p.id}" data-dyear="${x.p.year}"><b>${E(x.p.alias||x.p.full)}</b></button>${x.pct==null?'<span class="faint">예산 없음</span>':bar(x.pct,x.pct>100?'over':(x.pct>=100?'full':''))}<span class="dpct">${x.pct==null?'—':x.pct+'%'}</span><span class="faint dsub">${wonF(x.sp)} / ${wonF(x.bud)}</span></li>`).join('')}</ul>`:'<div class="empty">직접 사업이 없습니다.</div>'}
        <p class="hint">결의된 금액 ÷ 통계목별 예산. 이름을 누르면 가계부로 갑니다.</p></div>
      <div class="card dcard wide"><h2>파일 찾기 <span class="faint" style="font-weight:400">붙여 둔 사진·한글·PDF를 이름·태그로</span></h2><div id="ff-box"></div></div>
    </div>`;
  paintFileFind();
  pg.onclick=e=>{const t=e.target;
    if(t.id==='ff-more'){ FF.more=true; paintFileFind(); return; }
    const fo=t.closest('[data-ffopen]'); if(fo){ const L=ffList(); ffOpen(L,+fo.dataset.ffopen,'찾은 파일'); return; }
    const fr=t.closest('[data-ffrecent]'); if(fr){ const R=FILES.slice().sort((a,b)=>b.id-a.id).slice(0,8); ffOpen(R,+fr.dataset.ffrecent,'최근 붙인 파일'); return; }
    const fd=t.closest('[data-ffdel]'); if(fd){ const row=fd.closest('[data-fid]'), f=row&&FILES.find(x=>x.id===+row.dataset.fid); if(f){ f.tags=f.tags.filter(x=>x!==fd.dataset.ffdel); paintFileFind(); } return; }
    const b=t.closest('.dl-open'); if(!b) return;
    if(b.dataset.memo){ showPage('memo'); return; }
    if(b.dataset.todo){ showPage('todo'); if(window.TODO) TODO.edit(b.dataset.todo,false); return; }
    if(b.dataset.proj){ if(typeof openDetail==='function') openDetail(b.dataset.proj,'sum'); else showPage('grid'); return; }
    if(b.dataset.dproj&&window.DIRECT){ DIRECT.D.year=+b.dataset.dyear; DIRECT.D.proj=+b.dataset.dproj; showPage('dledger'); return; }
  };
  pg.oninput=e=>{ const t=e.target; if(t.id!=='ff-q') return; FF.q=t.value; FF.more=false; const pos=t.selectionStart; paintFileFind(); const n=q('#ff-q'); if(n){ n.focus(); n.setSelectionRange(pos,pos); } };
  pg.onkeydown=e=>{ const t=e.target; if(e.key!=='Enter'||!t.classList||!t.classList.contains('fftagin')) return; e.preventDefault();
    const row=t.closest('[data-fid]'), f=row&&FILES.find(x=>x.id===+row.dataset.fid); if(!f) return;
    t.value.split(',').map(x=>x.trim()).filter(Boolean).forEach(x=>{ if(!f.tags.includes(x)) f.tags.push(x); });
    paintFileFind(); const n=q(`.ffrow[data-fid="${f.id}"] .fftagin`)||q('.ffrow .fftagin'); if(n) n.focus(); };
}
/* 크게 보기에서 태그를 달거나 파일을 지우면 대시보드의 찾기 줄도 같이 바뀌게 */
const _rv=window.renderViewer;
if(typeof _rv==='function') window.renderViewer=function(){ const r=_rv.apply(this,arguments); if(typeof PAGE!=='undefined'&&PAGE==='dash') paintFileFind(); return r; };
function drawTodo(){
  if(window.TODO&&TODO.draw){ TODO.draw(); return; }
  const pg=q('#page-todo'); if(!pg) return;
  pg.innerHTML=`<div class="lede">할일</div><div class="lede-sub">todo.js 파일이 없어 할일 화면을 그릴 수 없습니다. 파일을 확인해 주세요.</div>`;
}
/* app.js 의 화면 바꾸기에 끼어들기 — 모르는 화면(dash·todo)은 여기서 그립니다 */
const _showPage=window.showPage;
if(typeof _showPage==='function') window.showPage=function(id){ _showPage.apply(this,arguments); if(id==='dash') drawDash(); else if(id==='todo') drawTodo(); };
/* 위쪽 '이사돔' 글자를 누르면 대시보드로 — app.js 는 진행현황으로 보내던 것을 앞(capture)에서 가로챕니다 */
document.addEventListener('click',e=>{ const b=e.target&&e.target.closest?e.target.closest('#brand'):null; if(!b) return; e.stopPropagation(); if(typeof LOGGED!=='undefined'&&LOGGED) showPage('dash'); },true);
const _setLogged=window.setLogged;
if(typeof _setLogged==='function') window.setLogged=function(on){ _setLogged.apply(this,arguments); if(on) showPage('dash'); };
window.DASH={drawDash,drawTodo};
})();
