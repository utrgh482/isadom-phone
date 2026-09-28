/* =====================================================================
 *  이사돔 — 할일  todo.js  v1 (2026-09-22)
 *  [할일] 화면: 오늘 할 일(크게) → 디데이 5일 → 한 일(이름·날짜로 찾기).
 *  할 일마다 예정일(그날 할 일)과 기한(D-day)을 둘 수 있고, 안 한 일은 '지나간 일'로 오늘 칸에 올라옵니다.
 *  [수정]을 누르면 오른쪽 패널(#panel)에서 고칩니다 — 고치면 바로 반영되고, 저장은 다른 자료와 같이 저절로 됩니다.
 *  자료는 직접 사업 자료(direct)에 todos 로 같이 실려 저장됩니다. 넘겨받기(다른 분 자료)에는 섞이지 않습니다.
 *  app.js · direct.js · dash.js 뒤에 읽히는 파일이라, 없어도 나머지 화면은 그대로 돕니다.
 * ===================================================================== */
(function(){
'use strict';
if(!window.DIRECT){ console.warn('todo.js: direct.js 가 먼저 있어야 합니다'); return; }
const q=(s,r)=>(r||document).querySelector(s);
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const DOWK=['일','월','화','수','목','금','토'];
const ymd=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const tday=()=>ymd(new Date());
const addDays=(s,n)=>{const d=new Date(s+'T00:00:00'); d.setDate(d.getDate()+n); return ymd(d);};
const diff=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/86400000);
const md=s=>{ if(!s) return ''; const a=s.split('-'); return `${+a[1]}.${+a[2]}`; };
const dow=s=>s?DOWK[new Date(s+'T00:00:00').getDay()]:'';
const isYmd=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');

/* ---------- 자료 ---------- */
let TODOS=[];
let ED=null;            /* 패널에서 고치는 중인 것 {id,isNew} */
let LATER_OPEN=false;   /* '그 뒤에 있는 일' 펼침 */
const SR={name:'',from:'',to:'',more:false};   /* 한 일 찾기 */
const nid=()=>'t'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
function mk(r){ r=r||{};
  return {id:String(r.id||nid()), title:String(r.title||''), plan:isYmd(r.plan)?r.plan:'', due:isYmd(r.due)?r.due:'', proj:String(r.proj||''), memo:String(r.memo||''),
    subs:Array.isArray(r.subs)?r.subs.map(s=>({t:String((s&&s.t)||''),ok:!!(s&&s.ok)})).filter(s=>s.t):[],
    done:!!r.done, doneAt:isYmd(r.doneAt)?r.doneAt:'', made:isYmd(r.made)?r.made:tday()}; }
const byId=id=>TODOS.find(x=>x.id===id);
/* 저장·불러오기 — direct 자료에 todos 를 얹습니다 (app.js 는 DIRECT.serialize / DIRECT.load 를 부릅니다) */
const _ser=DIRECT.serialize, _load=DIRECT.load;
DIRECT.serialize=function(){ const o=_ser.apply(this,arguments); o.todos=JSON.parse(JSON.stringify(TODOS)); return o; };
DIRECT.load=function(d){ _load.apply(this,arguments); TODOS=((d&&Array.isArray(d.todos))?d.todos:[]).map(mk); ED=null; LATER_OPEN=false; SR.name=SR.from=SR.to=''; SR.more=false; };

/* ---------- 어느 칸에 놓이나 ---------- */
const hidden=x=>!!(ED&&ED.isNew&&x.id===ED.id&&!x.title.trim());   /* 새로 만드는 중인데 아직 이름이 없으면 목록에 안 보임 */
function anchor(x){ const ds=[x.plan,x.due].filter(Boolean).sort(); return ds[0]||''; }   /* 가장 이른 날짜 */
function lateOf(x,t){ if(x.done) return ''; if(x.plan) return x.plan<t?x.plan:''; return (x.due&&x.due<t)?x.due:''; }   /* 지나간 일이면 그 날짜 */
function isToday(x,t){ if(x.done||hidden(x)) return false; if(!x.plan&&!x.due) return true; return (!!x.plan&&x.plan<=t)||(!!x.due&&x.due<=t); }
function todayList(t){ return TODOS.filter(x=>isToday(x,t)).sort((a,b)=>{
  const la=lateOf(a,t), lb=lateOf(b,t); if(!!la!==!!lb) return la?-1:1; if(la&&lb&&la!==lb) return la<lb?-1:1;
  const da=a.due||'9999', db=b.due||'9999'; if(da!==db) return da<db?-1:1; return a.made<b.made?-1:(a.made>b.made?1:0); }); }
function doneToday(t){ return TODOS.filter(x=>x.done&&x.doneAt===t); }
function fiveList(t){ const t1=addDays(t,1), t5=addDays(t,5), out=[];
  TODOS.forEach(x=>{ if(x.done||hidden(x)) return; const dIn=!!x.due&&x.due>=t1&&x.due<=t5, pIn=!!x.plan&&x.plan>=t1&&x.plan<=t5; if(!dIn&&!pIn) return; out.push({x,at:dIn?x.due:x.plan,byDue:dIn}); });
  return out.sort((a,b)=>a.at!==b.at?(a.at<b.at?-1:1):(a.byDue!==b.byDue?(a.byDue?-1:1):(a.x.made<b.x.made?-1:1))); }
function laterList(t){ const t5=addDays(t,5);
  return TODOS.filter(x=>!x.done&&!hidden(x)&&anchor(x)>t5).map(x=>({x,at:anchor(x),byDue:!!x.due&&x.due===anchor(x)})).sort((a,b)=>a.at<b.at?-1:(a.at>b.at?1:0)); }
function doneList(){ let L=TODOS.filter(x=>x.done); const n=SR.name.trim().toLowerCase();
  if(n) L=L.filter(x=>(x.title+' '+x.proj+' '+x.memo).toLowerCase().includes(n));
  if(SR.from) L=L.filter(x=>(x.doneAt||'')>=SR.from); if(SR.to) L=L.filter(x=>(x.doneAt||'')<=SR.to);
  return L.sort((a,b)=>{const x=a.doneAt||'', y=b.doneAt||''; if(x!==y) return x>y?-1:1; return a.made>b.made?-1:1;}); }
/* 대시보드용: 오늘 할 일 + 일주일 안(내일~7일) 에 오는 일 */
function forDash(t,wk){ const today=todayList(t), ids=new Set(today.map(x=>x.id));
  const week=TODOS.filter(x=>!x.done&&!hidden(x)&&!ids.has(x.id)&&anchor(x)>t&&anchor(x)<=wk).sort((a,b)=>anchor(a)<anchor(b)?-1:(anchor(a)>anchor(b)?1:0));
  return {today,week}; }

/* ---------- 그리기 ---------- */
function dchip(x,t){ if(!x.due) return ''; const n=diff(t,x.due); const cls=n<0?'over':(n===0?'day':(n<=3?'soon':'')); const txt=n<0?`D+${-n}`:(n===0?'D-day':`D-${n}`); return `<span class="tdchip ${cls}">${txt}</span>`; }
function subLine(x,extra){ const parts=[]; if(x.proj) parts.push(E(x.proj)); const m=(x.memo||'').split('\n')[0].trim(); if(m) parts.push(E(m.length>60?m.slice(0,60)+'…':m));
  (extra||[]).forEach(s=>{ if(s) parts.push(s); }); if(x.subs.length) parts.push(`체크 ${x.subs.filter(s=>s.ok).length}/${x.subs.length}`);
  return parts.length?`<small>${parts.join(' · ')}</small>`:''; }
function row(x,t,o){ o=o||{};
  const late=o.late?`<span class="tdlate">지나간 일 ${md(o.late)}</span>`:'';
  const subs=(o.subs&&x.subs.length)?`<div class="tdsubs">${x.subs.map((s,i)=>`<label><input type="checkbox" data-tsub="${x.id}:${i}" ${s.ok?'checked':''}><span class="${s.ok?'ok':''}">${E(s.t)}</span></label>`).join('')}</div>`:'';
  return `<div class="tdi ${x.done?'tdone':''}" data-tid="${x.id}"><input type="checkbox" data-tdone="${x.id}" ${x.done?'checked':''} title="${x.done?'했음 풀기':'했음으로'}">${o.lead||''}<span class="tt">${late}<b>${E(x.title||'(할 일 이름 없음)')}</b>${o.chip||''}${subLine(x,o.extra)}${subs}</span><span class="tdact">${(o.acts||[]).join('')}<button type="button" class="btn sm" data-tedit="${x.id}">수정</button></span></div>`; }
function draw(){
  const pg=q('#page-todo'); if(!pg) return; const t=tday(), d=new Date(t+'T00:00:00');
  const TL=todayList(t), DT=doneToday(t), F5=fiveList(t), LT=laterList(t), DL=doneList(), allDone=TODOS.filter(x=>x.done).length;
  const todayIds=new Set(TL.map(x=>x.id)), searching=!!(SR.name||SR.from||SR.to), show=SR.more?DL:DL.slice(0,20);
  const t1=addDays(t,1), t5=addDays(t,5);
  const lead=(chip,at)=>`<span class="tdcol">${chip}<span class="dt">${md(at)} ${dow(at)}</span></span>`;
  pg.innerHTML=`<div class="lede">할일 <span class="faint" style="font-size:14px;font-weight:400;margin-left:8px">${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${DOWK[d.getDay()]}요일</span></div>
    <div class="lede-sub">할 일마다 <b>예정일</b>(그날 할 일)과 <b>기한</b>(꼭 끝낼 날, D-표시)을 둘 수 있고, 날짜는 언제든 고칠 수 있습니다. 안 한 일은 <b>지나간 일</b>로 오늘 칸에 올라옵니다.
      <button type="button" class="btn sm" id="td-newany" style="margin-left:8px">+ 할 일 (날짜 정해서)</button></div>
    <div class="card tdbig"><h2>오늘 할 일 <span class="pill ${TL.length?'warn':'done'}">${TL.length}</span></h2>
      <div class="tdq"><input id="td-quick" placeholder="할 일 적고 Enter — 오늘 할 일로 들어갑니다" maxlength="200"><button type="button" class="btn primary" id="td-quickadd">추가</button></div>
      ${TL.length?TL.map(x=>{const l=lateOf(x,t); return row(x,t,{late:l,chip:dchip(x,t),extra:[x.due?`기한 ${md(x.due)}`:''],acts:l?[`<button type="button" class="btn sm ghost" data-ttoday="${x.id}">오늘로</button>`]:[],subs:true});}).join(''):'<div class="empty tdempty">오늘 할 일이 없습니다. 위 칸에 적어 넣으세요.</div>'}
      ${DT.map(x=>row(x,t,{extra:[`했음 ${md(x.doneAt)}`]})).join('')}
      <p class="hint">체크하면 <b>했음</b>으로 흐려지고 한 날짜가 남습니다(오늘 한 일은 오늘 칸에 남고, 내일부터는 맨 아래 [한 일]에서 봅니다). 지나간 일은 [오늘로]를 누르면 예정일이 오늘로 옮겨집니다.</p></div>
    <div class="card tdfive"><h2>디데이 5일 <span class="pill ${F5.length?'warn':'done'}">${F5.length}</span> <span class="faint" style="font-size:13px;font-weight:400;margin-left:6px">내일부터 5일 안 · ${md(t1)} ${dow(t1)} ~ ${md(t5)} ${dow(t5)}</span></h2>
      ${F5.length?F5.map(({x,at,byDue})=>{ const extra=[]; if(x.plan&&x.plan!==at) extra.push(`예정 ${md(x.plan)}`); if(x.due&&x.due!==at) extra.push(`기한 ${md(x.due)} (D-${diff(t,x.due)})`); if(todayIds.has(x.id)) extra.push('오늘 할 일에도 있음');
        return row(x,t,{lead:lead(byDue?dchip(x,t):'<span class="tdchip">예정</span>',at),extra}); }).join(''):'<div class="empty tdempty">5일 안에 오는 일이 없습니다.</div>'}
      ${LT.length?`<div class="tdlater"><button type="button" class="bare" id="td-later">${LATER_OPEN?'▾':'▸'} 그 뒤에 있는 일 ${LT.length}건 ${LATER_OPEN?'접기':'보기'}</button>
        ${LATER_OPEN?LT.map(({x,at,byDue})=>row(x,t,{lead:lead(byDue?`<span class="tdchip">D-${diff(t,at)}</span>`:'<span class="tdchip">예정</span>',at),extra:[x.plan&&x.plan!==at?`예정 ${md(x.plan)}`:'',x.due&&x.due!==at?`기한 ${md(x.due)}`:'']})).join(''):''}</div>`:''}
      <p class="hint">기한(D-day)이나 예정일이 5일 안에 오는 일을 날짜순으로. D-3 안은 노란 딱지. 기한이 있으면 기한 날짜로, 없으면 예정일로 놓입니다.</p></div>
    <div class="card tddone"><h2>한 일 <span class="faint" style="font-size:13px;font-weight:400;margin-left:6px">모두 ${allDone}건${searching?` · 찾은 것 ${DL.length}건`:''}</span></h2>
      <div class="tdsrch"><div class="f"><span>이름으로 찾기</span><input id="td-sname" value="${E(SR.name)}" placeholder="예: 급여"></div>
        <div class="f"><span>한 날짜</span><input type="date" id="td-sfrom" value="${SR.from}"></div><span class="tilde">~</span><div class="f"><span>&nbsp;</span><input type="date" id="td-sto" value="${SR.to}"></div>
        <button type="button" class="btn sm primary" id="td-sgo">찾기</button><button type="button" class="btn sm ghost" id="td-sclear">지우기</button><span class="hint">비워 두면 최근 한 것부터 20건</span></div>
      ${show.length?show.map(x=>row(x,t,{extra:[`했음 ${md(x.doneAt)}`]})).join(''):`<div class="empty tdempty">${allDone?'찾은 것이 없습니다.':'아직 한 일이 없습니다.'}</div>`}
      ${DL.length>show.length?`<div class="row" style="margin-top:8px"><button type="button" class="btn sm ghost" id="td-more">더 보기 (${DL.length}건 중 ${show.length}건)</button></div>`:''}
      <p class="hint">체크를 풀면 다시 할 일로 돌아갑니다.</p></div>`;
}
function refresh(){ const pg=(typeof PAGE!=='undefined')?PAGE:''; if(pg==='todo') draw(); else if(pg==='dash'&&window.DASH&&DASH.drawDash) DASH.drawDash(); }
function setDone(x,on){ x.done=!!on; x.doneAt=on?tday():''; }   /* 체크하면 한 날짜는 오늘 (패널에서 고칠 수 있음) */

/* ---------- 화면 단추들 ---------- */
function quickAdd(){ const inp=q('#td-quick'); if(!inp) return; const v=inp.value.trim(); if(!v) return; TODOS.push(mk({title:v,plan:tday()})); draw(); const n=q('#td-quick'); if(n) n.focus(); }
function readSearch(){ SR.name=(q('#td-sname')||{}).value||''; SR.from=(q('#td-sfrom')||{}).value||''; SR.to=(q('#td-sto')||{}).value||''; SR.more=false; }
document.addEventListener('click',ev=>{
  const pg=q('#page-todo'); if(!pg||!pg.contains(ev.target)) return; const b=ev.target.closest('button'); if(!b) return;
  if(b.id==='td-quickadd'){ quickAdd(); return; }
  if(b.id==='td-newany'){ const x=mk({plan:''}); TODOS.push(x); edit(x.id,true); return; }
  if(b.id==='td-sgo'){ readSearch(); draw(); return; }
  if(b.id==='td-sclear'){ SR.name=SR.from=SR.to=''; SR.more=false; draw(); return; }
  if(b.id==='td-more'){ SR.more=true; draw(); return; }
  if(b.id==='td-later'){ LATER_OPEN=!LATER_OPEN; draw(); return; }
  if(b.dataset.tedit){ edit(b.dataset.tedit,false); return; }
  if(b.dataset.ttoday){ const x=byId(b.dataset.ttoday); if(x){ x.plan=tday(); draw(); } return; }
});
document.addEventListener('change',ev=>{
  const pg=q('#page-todo'); if(!pg||!pg.contains(ev.target)) return; const t=ev.target;
  if(t.dataset.tdone){ const x=byId(t.dataset.tdone); if(x){ setDone(x,t.checked); if(ED&&ED.id===x.id) paint(); draw(); } return; }
  if(t.dataset.tsub){ const [id,i]=t.dataset.tsub.split(':'); const x=byId(id); if(x&&x.subs[+i]){ x.subs[+i].ok=t.checked; if(ED&&ED.id===x.id) paint(); draw(); } return; }
});
document.addEventListener('keydown',ev=>{
  if(ev.key!=='Enter') return; const t=ev.target; if(!t||!t.id) return;
  if(t.id==='td-quick'){ ev.preventDefault(); quickAdd(); }
  else if(t.id==='td-sname'||t.id==='td-sfrom'||t.id==='td-sto'){ ev.preventDefault(); readSearch(); draw(); }
});

/* ---------- 오른쪽 패널에서 고치기 ---------- */
function projOptions(v){
  const mine=(typeof PROJECTS!=='undefined'?PROJECTS:[]).filter(p=>p&&p.mine).map(p=>p.alias);
  const own=((DIRECT.DS&&DIRECT.DS.projects)||[]).map(p=>p.alias||p.full);
  const u=a=>[...new Set(a.filter(Boolean))].sort((x,y)=>String(x).localeCompare(String(y),'ko'));
  let has=false; const opt=n=>{const s=n===v; if(s) has=true; return `<option value="${E(n)}" ${s?'selected':''}>${E(n)}</option>`;};
  const g1=u(mine), g2=u(own); let h=`<option value="" ${!v?'selected':''}>(없음)</option>`;
  if(g1.length) h+=`<optgroup label="지도사업">${g1.map(opt).join('')}</optgroup>`; if(g2.length) h+=`<optgroup label="직접 사업">${g2.map(opt).join('')}</optgroup>`;
  if(v&&!has) h+=`<option value="${E(v)}" selected>${E(v)}</option>`; return h; }
function edit(id,isNew){ const x=byId(id); if(!x) return; if(ED&&ED.id!==id) finish(false); ED={id,isNew:!!isNew}; cur={view:'todo'}; paint(); openPanel();
  const f=q('[data-tf="title"]',pbody); if(f&&isNew) f.focus(); }
function paint(){ const x=ED&&byId(ED.id); if(!x){ closePanel(); return; }
  ptitle.textContent=x.title.trim()||'새 할 일'; psub.textContent=ED.isNew?'새 할 일 — 적으면 바로 들어갑니다':'할 일 고치기 — 고치면 바로 반영됩니다';
  pbody.innerHTML=`<div class="note tdform" style="padding-top:8px"><div class="frow">
      <div class="f wide"><span>할 일</span><input data-tf="title" value="${E(x.title)}" maxlength="200" placeholder="예: 3분기 기안 올리기"></div>
      <div class="f"><span>예정일 (그날 할 일)</span><input type="date" data-tf="plan" value="${x.plan}"></div>
      <div class="f"><span>기한 (D-day, 선택)</span><input type="date" data-tf="due" value="${x.due}"></div>
      <div class="f wide"><span>사업 (선택)</span><select data-tf="proj">${projOptions(x.proj)}</select></div>
      <div class="f wide"><span>메모</span><textarea data-tf="memo" style="min-height:70px" placeholder="누구에게 · 무엇을 · 참고할 것">${E(x.memo)}</textarea></div>
      <div class="f wide"><span>작은 체크리스트 (선택)</span><div class="tdsubed">${x.subs.map((s,i)=>`<div><input type="checkbox" data-tsok="${i}" ${s.ok?'checked':''}><input type="text" data-tst="${i}" value="${E(s.t)}" maxlength="120"><button type="button" class="chipx" data-tsdel="${i}" title="줄 지우기">×</button></div>`).join('')}<div><input type="text" id="td-subnew" placeholder="+ 줄 추가 (적고 Enter)" maxlength="120"></div></div></div>
      <div class="f wide"><label class="check"><input type="checkbox" data-tf="done" ${x.done?'checked':''}> 했음</label>${x.done?`<span style="margin-left:14px;font-size:12px;color:var(--muted)">한 날짜</span> <input type="date" data-tf="doneAt" value="${x.doneAt}" style="width:auto;margin-left:4px">`:''}</div>
    </div><p class="hint" style="margin-top:10px">예정일·기한 둘 다 비우면 날짜 없는 일로 오늘 칸에 남습니다. 기한이 늘어나면 날짜만 고치면 됩니다.</p></div>`;
  pfoot.innerHTML=`<button type="button" class="btn sm primary" id="td-pclose">저장하고 닫기</button><button type="button" class="btn sm ghost" id="td-pdel" style="color:var(--bad)">지우기</button>`;
}
function finish(redraw){ if(!ED) return; const x=byId(ED.id); const pend=q('#td-subnew',pbody);
  if(x&&pend&&pend.value.trim()){ x.subs.push({t:pend.value.trim(),ok:false}); pend.value=''; }
  if(x&&!x.title.trim()&&!x.memo.trim()&&!x.subs.length){ TODOS=TODOS.filter(y=>y!==x); }
  ED=null; if(redraw!==false) refresh(); }
const inTodoPanel=()=>!!(ED&&typeof cur!=='undefined'&&cur&&cur.view==='todo');
panel.addEventListener('input',ev=>{ if(!inTodoPanel()) return; const x=byId(ED.id); if(!x) return; const t=ev.target, f=t.dataset.tf;
  if(f==='title'){ x.title=t.value; ptitle.textContent=x.title.trim()||'새 할 일'; refresh(); return; }
  if(f==='memo'){ x.memo=t.value; refresh(); return; }
  if(t.dataset.tst!=null){ const s=x.subs[+t.dataset.tst]; if(s) s.t=t.value; refresh(); return; }
});
panel.addEventListener('change',ev=>{ if(!inTodoPanel()) return; const x=byId(ED.id); if(!x) return; const t=ev.target, f=t.dataset.tf;
  if(f==='plan'||f==='due'||f==='doneAt'){ x[f]=isYmd(t.value)?t.value:''; refresh(); return; }
  if(f==='proj'){ x.proj=t.value; refresh(); return; }
  if(f==='done'){ setDone(x,t.checked); paint(); refresh(); return; }
  if(t.dataset.tsok!=null){ const s=x.subs[+t.dataset.tsok]; if(s) s.ok=t.checked; refresh(); return; }
});
panel.addEventListener('keydown',ev=>{ if(!inTodoPanel()||ev.key!=='Enter') return; const t=ev.target; const x=byId(ED.id); if(!x) return;
  if(t.id==='td-subnew'){ ev.preventDefault(); const v=t.value.trim(); if(!v) return; x.subs.push({t:v,ok:false}); paint(); refresh(); const n=q('#td-subnew',pbody); if(n) n.focus(); return; }
  if(t.dataset.tf==='title'){ ev.preventDefault(); const n=q('[data-tf="plan"]',pbody); if(n) n.focus(); }
});
panel.addEventListener('click',ev=>{ if(!inTodoPanel()) return; const x=byId(ED.id); const b=ev.target.closest('button'); if(!b) return;
  if(b.id==='td-pclose'){ closePanel(); return; }
  if(b.id==='td-pdel'){ if(!x){ closePanel(); return; } if(!confirm(`"${x.title||'(이름 없음)'}" 할 일을 지울까요?`)) return; TODOS=TODOS.filter(y=>y!==x); ED=null; closePanel(); refresh(); return; }
  if(b.dataset.tsdel!=null&&x){ x.subs.splice(+b.dataset.tsdel,1); paint(); refresh(); return; }
});
/* 패널이 어떻게든 닫히면(×·바탕·Esc·다른 화면) 마무리 */
new MutationObserver(()=>{ if(ED&&!panel.classList.contains('open')) finish(true); }).observe(panel,{attributes:true,attributeFilter:['class']});

window.TODO={draw,edit,forDash,lateOf,anchor,list:()=>TODOS};
})();
