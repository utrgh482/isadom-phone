/* =====================================================================
 *  이사돔 — 상담  consult.js  v1 (2026-09-22)
 *  차림표 [상담]: 농가 상담을 한 건씩. 목록 → 건을 누르면 안으로 → 사전 정보 · 현장 답사 · 자료 정리(여러 개) · 후속 조치, 칸마다 메모와 사진.
 *  태그는 직접 늘립니다(주제든 상태든, 한 상담에 여러 개). '끝난 것'으로 표시한 태그(기본 '완료')가 달리면 끝난 상담 → 목록 아래로.
 *  '진행중' 은 태그가 아니라 "끝 태그가 안 달린 상담" 입니다.
 *  찾기: 글자(제목·농가명·고민·태그·메모 내용) · 태그 · 접수일 기간 · 연도.
 *  자료는 직접 사업 자료(direct)에 consults 로 같이 실려 저장됩니다(todo.js 와 같은 방식). 넘겨받기 때는 상담도 같이 들어옵니다.
 *  사진 꼬리표(ref) = {kind:'ddoc', s:상담 번호, part:'pre'|'visit'|'follow'|'ref', r:자료 번호}
 *  app.js · direct.js 뒤에 읽히는 파일이라, 없어도 나머지 화면은 그대로 돕니다. app.js 는 고치지 않았습니다.
 * ===================================================================== */
(function(){
'use strict';
if(!window.DIRECT){ console.warn('consult.js: direct.js 가 먼저 있어야 합니다'); return; }
const q=(s,r)=>(r||document).querySelector(s), qa=(s,r)=>[...(r||document).querySelectorAll(s)];
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const pad2=n=>String(n).padStart(2,'0');
const tday=()=>{const d=new Date();return `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;};
const isYmd=s=>/^\d{4}-\d{2}-\d{2}$/.test(s||'');
const str=v=>String(v==null?'':v);
const nid=()=>{try{return uid();}catch(e){return Date.now()+Math.floor(Math.random()*1000);}};   /* app.js 의 번호표(uid)를 같이 씁니다 */
const DL=(typeof DLIM!=='undefined')?DLIM:'min="1900-01-01" max="2099-12-31"';
const fmtD=s=>s?String(s).replace(/-/g,'.'):'';
const md=s=>{ if(!isYmd(s)) return ''; const [y,m,d]=s.split('-'); return (y===String(new Date().getFullYear())?'':y+'.')+`${+m}.${+d}`; };
const PARTS={pre:'사전 정보',visit:'현장 답사',ref:'자료 정리',follow:'후속 조치'};

/* ---------- 자료 ---------- */
const TAGS_DEFAULT=[{n:'완료',end:true}];
const CS={list:[],tags:JSON.parse(JSON.stringify(TAGS_DEFAULT))};   /* tags: [{n:이름, end:끝난 것인가}] */
const V={open:null,q:'',tag:'',from:'',to:'',year:null,tagEdit:false};   /* 화면 상태 (저장 안 함) */
function normTags(t){ const seen=new Set(); return (Array.isArray(t)?t:[]).map(x=>typeof x==='string'?{n:x,end:x==='완료'}:{n:str(x&&x.n).trim(),end:!!(x&&x.end)}).filter(x=>x.n&&!seen.has(x.n)&&seen.add(x.n)); }
const tagOf=n=>CS.tags.find(t=>t.n===n)||null;
const isEnd=c=>c.tags.some(n=>{const t=tagOf(n); return !!(t&&t.end);});
const byId=id=>CS.list.find(c=>c.id===id);
function mkRef(r){ r=r||{}; return {id:(+r.id>0?+r.id:nid()), title:str(r.title), date:isYmd(r.date)?r.date:'', memo:str(r.memo)}; }
function mkC(r){ r=r||{}; const v=r.visit||{}, f=r.follow||{};
  return {id:(+r.id>0?+r.id:nid()), title:str(r.title), farm:str(r.farm), tel:str(r.tel), addr:str(r.addr), date:isYmd(r.date)?r.date:tday(), issue:str(r.issue), memo:str(r.memo),
    tags:[...new Set((Array.isArray(r.tags)?r.tags:[]).map(str).map(s=>s.trim()).filter(Boolean))],
    visit:{date:isYmd(v.date)?v.date:'',memo:str(v.memo)}, refs:(Array.isArray(r.refs)?r.refs:[]).map(mkRef), follow:{date:isYmd(f.date)?f.date:'',memo:str(f.memo)},
    made:isYmd(r.made)?r.made:tday(), from:str(r.from)}; }
const isEmpty=c=>!(c.title.trim()||c.farm.trim()||c.tel.trim()||c.addr.trim()||c.issue.trim()||c.memo.trim()||c.visit.memo.trim()||c.visit.date||c.follow.memo.trim()||c.follow.date||c.refs.some(r=>r.title.trim()||r.memo.trim())||c.tags.length||cFiles(c).length);

/* ---------- 사진 꼬리표 ---------- */
const cref=(c,part,r)=>{const o={kind:'ddoc',s:c.id,part}; if(part==='ref') o.r=r; return o;};
const isCRef=r=>!!r&&r.kind==='ddoc'&&r.s!=null;
const cFiles=c=>FILES.filter(f=>isCRef(f.ref)&&f.ref.s===c.id);
const pFiles=(c,part,r)=>filesFor(cref(c,part,r));
function refOfKey(c,key){ const [part,r]=String(key).split(':'); return cref(c,part,r!=null?+r:undefined); }
function vtitle(c,ref){ let s=`${c.title||'(제목 없음)'} · ${PARTS[ref.part]||''}`; if(ref.part==='ref'){ const x=c.refs.find(y=>y.id===ref.r); s+=` · ${x?(x.title||'(제목 없음)'):''}`; } return s; }

/* ---------- 저장·불러오기·넘겨받기 — direct 자료에 consults 를 얹습니다 (app.js 는 DIRECT.serialize / load / merge 를 부릅니다) ---------- */
const _ser=DIRECT.serialize, _load=DIRECT.load, _merge=DIRECT.merge, _remap=DIRECT.remapRef;
DIRECT.serialize=function(){ const o=_ser.apply(this,arguments); o.consults=JSON.parse(JSON.stringify(CS)); return o; };
DIRECT.load=function(d){ _load.apply(this,arguments); const c=(d&&d.consults)||{};
  CS.list=(Array.isArray(c.list)?c.list:[]).map(mkC); CS.tags=Array.isArray(c.tags)?normTags(c.tags):JSON.parse(JSON.stringify(TAGS_DEFAULT));
  Object.assign(V,{open:null,q:'',tag:'',from:'',to:'',year:null,tagEdit:false}); };
let CMAP=null;   /* 넘겨받기 때 옛 번호 → 새 번호 */
DIRECT.merge=function(d,fromName){ const out=_merge.apply(this,arguments); CMAP={}; const c=(d&&d.consults)||{};
  normTags(c.tags).forEach(t=>{ if(!tagOf(t.n)) CS.tags.push({n:t.n,end:t.end}); });
  (Array.isArray(c.list)?c.list:[]).forEach(raw=>{ const nc=mkC({...raw,id:undefined,refs:[]}); nc.id=nid(); const rm={};
    nc.refs=(Array.isArray(raw.refs)?raw.refs:[]).map(r=>{const nr=mkRef({...r,id:undefined}); nr.id=nid(); if(r&&r.id!=null) rm[r.id]=nr.id; return nr;});
    nc.from=fromName||'넘겨받음'; CMAP[raw.id]={id:nc.id,r:rm}; CS.list.push(nc); });
  return out; };
DIRECT.remapRef=function(r){ if(!isCRef(r)) return _remap.apply(this,arguments); const m=CMAP&&CMAP[r.s]; if(!m) return null;
  const o={kind:'ddoc',s:m.id,part:r.part}; if(r.part==='ref'){ const nr=m.r[r.r]; if(nr==null) return null; o.r=nr; } return o; };
/* 꼬리표 비교·스캔 찾기 표시·해 — 상담 것만 여기서, 나머지는 direct.js 로 */
const _same=DIRECT.sameRef, _ctx=DIRECT.fileCtx, _year=DIRECT.fileYear;
DIRECT.sameRef=function(a,b){ if(isCRef(a)||isCRef(b)) return isCRef(a)&&isCRef(b)&&a.s===b.s&&str(a.part)===str(b.part)&&str(a.r==null?'':a.r)===str(b.r==null?'':b.r); return _same.apply(this,arguments); };
DIRECT.fileCtx=function(r){ if(!isCRef(r)) return _ctx.apply(this,arguments); const c=byId(r.s); if(!c) return {proj:'상담',where:'(지워진 상담)',unit:''};
  let where=PARTS[r.part]||''; if(r.part==='ref'){ const x=c.refs.find(y=>y.id===r.r); where+=` · ${x?(x.title||'(제목 없음)'):'(지워진 자료)'}`; }
  return {proj:'상담',where:`${c.title||'(제목 없음)'} · ${where}`,unit:c.farm||''}; };
DIRECT.fileYear=function(r){ if(!isCRef(r)) return _year.apply(this,arguments); const c=byId(r.s); return (c&&isYmd(c.date))?+c.date.slice(0,4):null; };
/* 화면 그리기 — app.js 는 모르는 화면 id 를 DIRECT.draw(id) 로 넘깁니다. 사진이 바뀌면 DIRECT.repaint() 가 불립니다 */
const _draw=DIRECT.draw, _rep=DIRECT.repaint;
DIRECT.draw=function(id){ if(id==='consult'){ draw(); return; } return _draw.apply(this,arguments); };
DIRECT.repaint=function(){ const r=_rep.apply(this,arguments); if(typeof PAGE!=='undefined'&&PAGE==='consult') draw(true); return r; };
/* 다른 화면으로 나가면 목록으로 돌아가고, 아무것도 안 적은 새 상담은 지웁니다 */
const _sp=window.showPage;
if(typeof _sp==='function') window.showPage=function(id){ if(typeof PAGE!=='undefined'&&PAGE==='consult'&&id!=='consult'){ dropEmpty(); V.open=null; V.tagEdit=false; } return _sp.apply(this,arguments); };
function dropEmpty(){ const c=V.open!=null?byId(V.open):null; if(c&&isEmpty(c)) CS.list=CS.list.filter(x=>x!==c); }

/* ---------- 어느 칸을 채웠나 · 찾기 ---------- */
function prog(c){ return {pre:!!(c.memo.trim()||c.issue.trim()||pFiles(c,'pre').length), visit:!!(c.visit.memo.trim()||c.visit.date||pFiles(c,'visit').length), refs:c.refs.length, follow:!!(c.follow.memo.trim()||c.follow.date||pFiles(c,'follow').length)}; }
function textOf(c){ return [c.title,c.farm,c.issue,c.addr,c.memo,c.tags.join(' '),c.visit.memo,c.follow.memo,...c.refs.map(r=>r.title+' '+r.memo)].join('\n').toLowerCase(); }
function filtered(){ let L=CS.list.slice(); const s=V.q.trim().toLowerCase();
  if(s) L=L.filter(c=>textOf(c).includes(s));
  if(V.tag==='__open') L=L.filter(c=>!isEnd(c)); else if(V.tag) L=L.filter(c=>c.tags.includes(V.tag));
  if(V.from) L=L.filter(c=>c.date&&c.date>=V.from); if(V.to) L=L.filter(c=>c.date&&c.date<=V.to);
  if(V.year!=null) L=L.filter(c=>+String(c.date).slice(0,4)===V.year);
  return L; }
const byDate=(a,b)=>(b.date>a.date?1:(b.date<a.date?-1:0))||(b.made>a.made?1:(b.made<a.made?-1:0))||b.id-a.id;

/* ---------- 목록 ---------- */
function row(c){ const p=prog(c), nf=cFiles(c).length, end=isEnd(c);
  return `<div class="srow ${end?'end':''}" data-copen="${c.id}"><span class="dt">${md(c.date)||'<span class="faint">날짜 없음</span>'}</span>
    <span class="nm"><span class="ttl">${E(c.title)||'<span class="faint">(제목 없음)</span>'}</span>${c.farm?`<span class="farm">${E(c.farm)}</span>`:''}${c.tags.map(n=>{const t=tagOf(n);return `<span class="stag ${t&&t.end?'end':''}">${E(n)}</span>`;}).join('')}<small>${E(c.issue)||'<span style="opacity:.6">고민 요약 없음</span>'}${c.from?` · 넘겨받음 (${E(c.from)})`:''}</small></span>
    <span class="sprog"><span class="${p.pre?'d':''}">사전</span><span class="${p.visit?'d':''}">답사</span><span class="${p.refs?'d':''}">자료${p.refs?' '+p.refs:''}</span><span class="${p.follow?'d':''}">후속</span></span><span class="faint">📎${nf}</span></div>`; }
function drawList(){
  const pg=q('#page-consult'); const L=filtered();
  const years=[...new Set(CS.list.map(c=>+String(c.date).slice(0,4)).filter(Boolean))].sort((a,b)=>b-a); if(V.year!=null&&!years.includes(V.year)) V.year=null;
  const act=L.filter(c=>!isEnd(c)).sort(byDate), end=L.filter(isEnd).sort(byDate);
  const nOpen=CS.list.filter(c=>!isEnd(c)).length, cnt=n=>CS.list.filter(c=>c.tags.includes(n)).length, searching=!!(V.q.trim()||V.from||V.to);
  pg.innerHTML=`<div class="card"><h2>상담 <span class="pill ${nOpen?'warn':'done'}">진행중 ${nOpen}</span></h2>
    <div class="desc">농가 상담을 한 건씩 적어 둡니다. 건을 누르면 안으로 들어가고, 안에는 <b>사전 정보 → 현장 답사 → 자료 정리 → 후속 조치</b> 네 칸이 있어 칸마다 메모와 사진을 붙입니다. 태그는 주제(병해충·토양…)든 상태든 직접 늘려서 여러 개 달 수 있고, <b>끝난 것</b>으로 표시한 태그(기본 '완료')가 달리면 끝난 상담으로 아래에 내려갑니다.</div>
    <div class="row">${years.length>1?`<span class="yearBtns"><button type="button" class="btn sm ${V.year==null?'primary':''}" data-cyear="">전부</button>${years.map(y=>`<button type="button" class="btn sm ${V.year===y?'primary':''}" data-cyear="${y}">${y}</button>`).join('')}</span>`:''}
      <span class="row" style="margin-left:auto"><button type="button" class="btn sm primary" id="cs-add">+ 새 상담</button><button type="button" class="btn sm" id="cs-tags">태그 고치기</button></span></div>
    <div id="cs-tagbox" ${V.tagEdit?'':'hidden'}></div></div>
  <div class="card">
    <div class="row" style="margin-bottom:8px"><span class="segs"><button type="button" class="seg ${!V.tag?'on':''}" data-ctag="">전부 ${CS.list.length}</button><button type="button" class="seg ${V.tag==='__open'?'on':''}" data-ctag="__open">진행중 ${nOpen}</button>${CS.tags.map(t=>`<button type="button" class="seg ${V.tag===t.n?'on':''}" data-ctag="${E(t.n)}">${E(t.n)} ${cnt(t.n)}</button>`).join('')}</span></div>
    <div class="tdsrch"><div class="f"><span>글자로 찾기</span><input id="cs-q" value="${E(V.q)}" placeholder="제목 · 농가명 · 태그 · 메모 내용" style="width:270px"></div>
      <div class="f"><span>접수일</span><input type="date" ${DL} id="cs-from" value="${V.from}"></div><span class="tilde">~</span><div class="f"><span>&nbsp;</span><input type="date" ${DL} id="cs-to" value="${V.to}"></div>
      <button type="button" class="btn sm ghost" id="cs-clear">지우기</button>${searching?`<span class="hint">찾은 것 ${L.length}건</span>`:''}</div>
    ${CS.list.length?`<div class="clist">${act.map(row).join('')}${end.length?`<div class="divider">끝난 상담 ${end.length}</div>${end.map(row).join('')}`:''}${!act.length&&!end.length?'<div class="empty">조건에 맞는 상담이 없습니다.</div>':''}</div>`:'<div class="empty">아직 상담이 없습니다. [+ 새 상담]으로 넣으세요.</div>'}
    <p class="hint" style="margin-top:10px">알약 네 개 = 사전 정보 · 현장 답사 · 자료 정리(개수) · 후속 조치 — 적은 것이 있으면 칠해집니다. 끝난 상담은 점선 아래로 내려갑니다. 📎 = 붙인 사진·스캔 수.</p></div>`;
  if(V.tagEdit) paintTagBox();
}
function paintTagBox(){ const box=q('#cs-tagbox'); if(!box) return; box.hidden=false; const used=n=>CS.list.filter(c=>c.tags.includes(n)).length;
  box.innerHTML=`<div class="catedit">${CS.tags.map((t,i)=>`<div class="row"><input data-ctagname="${i}" value="${E(t.n)}"><label class="check"><input type="checkbox" data-ctagend="${i}" ${t.end?'checked':''}> 끝난 것 (목록 아래로)</label><span class="hint">${used(t.n)}건</span><button type="button" class="btn sm" data-ctagren="${i}">이름 바꾸기</button><button type="button" class="btn sm ghost" data-ctagdel="${i}" ${used(t.n)?'disabled title="이 태그가 달린 상담이 있어 지울 수 없습니다"':''} style="color:var(--bad)">지우기</button></div>`).join('')||'<div class="hint">태그가 없습니다.</div>'}
    <div class="row"><input id="cs-tagnew" placeholder="새 태그 이름 (예: 병해충, 토양, 보류)"><button type="button" class="btn sm" id="cs-tagadd">추가</button><button type="button" class="btn sm ghost" id="cs-tagclose">닫기</button></div>
    <div class="hint">주제(병해충·토양·과수…)든 상태(보류…)든 마음대로. 한 상담에 여러 개 달 수 있습니다. 이름을 바꾸면 그 태그가 달린 상담도 같이 바뀌고, 상담이 달린 태그는 지울 수 없습니다.</div></div>`; }
function addTag(){ const pg=q('#page-consult'), inp=q('#cs-tagnew',pg); const n=(inp?inp.value:'').trim(); if(!n) return; if(tagOf(n)){alert('이미 있는 태그입니다.');return;} CS.tags.push({n,end:false}); draw(true); const n2=q('#cs-tagnew',pg); if(n2) n2.focus(); }

/* ---------- 건 안 ---------- */
const subLine=c=>`접수 ${fmtD(c.date)||'날짜 없음'}${c.issue.trim()?' · '+E(c.issue):''}`;
function thumbs(c,part,r){ const ref=cref(c,part,r), fs=filesFor(ref), key=part+(r!=null?':'+r:'');
  return `<div class="thumbs cph">${fs.map((f,i)=>thumbHTML(f,`data-cthumb="${key}" data-i="${i}"`)).join('')}<button type="button" class="thumb add" data-cpick="${key}" title="사진·스캔 붙이기">+ 사진</button>${fs.length?`<span class="hint" style="align-self:center">${fs.length}장 · 누르면 크게, 크게 본 화면에서 지울 수 있습니다</span>`:''}</div>`; }
function drawDetail(c){
  const pg=q('#page-consult');
  pg.innerHTML=`<div class="chead"><button type="button" class="btn sm" id="cs-back">← 상담 목록</button><span class="faint">상담${c.from?` · 넘겨받음 (${E(c.from)})`:''}</span>
      <span class="row" style="margin-left:auto"><button type="button" class="btn sm ghost" id="cs-del" style="color:var(--bad)">이 상담 지우기</button></span></div>
    <div class="lede"><span id="cs-ltitle">${E(c.title.trim())||'(제목 없음)'}</span> <span class="faint" id="cs-lfarm" style="font-size:15px;font-weight:600;color:var(--accent)">${E(c.farm)}</span></div>
    <div class="lede-sub" id="cs-lsub">${subLine(c)}</div>
    <div class="ctags">태그 ${CS.tags.map(t=>`<button type="button" class="tag ${c.tags.includes(t.n)?'on':''}" data-ctog="${E(t.n)}" title="누르면 ${c.tags.includes(t.n)?'뗍니다':'답니다'}">${E(t.n)}${t.end?' (끝)':''}</button>`).join('')}${CS.tags.length?'':'<span class="faint">태그가 아직 없습니다.</span>'}<button type="button" class="lnk" id="cs-tags" style="margin-left:6px">태그 고치기</button>${isEnd(c)?'<span class="pill done" style="margin-left:6px">끝난 상담</span>':''}
      <div id="cs-tagbox" ${V.tagEdit?'':'hidden'} style="flex-basis:100%"></div></div>
    <div class="card sec cform"><h2><span class="secno">1</span>사전 정보 <span class="faint">전화나 방문으로 처음 들은 것</span></h2>
      <div class="cinfo">
        <div class="f s3"><span>제목</span><input data-cf="title" value="${E(c.title)}" placeholder="예: 배 잎 가장자리 갈변" maxlength="120"></div>
        <div class="f s2"><span>농가명</span><input data-cf="farm" value="${E(c.farm)}" placeholder="이름" maxlength="60"></div>
        <div class="f s1"><span>접수일</span><input type="date" ${DL} data-cf="date" value="${c.date}"></div>
        <div class="f s2"><span>전화번호</span><input data-cf="tel" value="${E(c.tel)}" inputmode="tel" maxlength="40"></div>
        <div class="f s4"><span>주소</span><input data-cf="addr" value="${E(c.addr)}" placeholder="면·리, 밭이나 과원 위치" maxlength="200"></div>
        <div class="f s6"><span>고민 한줄 요약</span><input data-cf="issue" value="${E(c.issue)}" placeholder="무엇이 문제인지 한 줄로 — 목록에 보입니다" maxlength="200"></div>
        <div class="f s6"><span>메모</span><textarea data-cf="memo" placeholder="언제 · 어떻게 들었나, 재배 상황, 그동안 해 본 것">${E(c.memo)}</textarea></div>
      </div>
      <div class="f"><span>사진 · 스캔</span>${thumbs(c,'pre')}</div></div>
    <div class="card sec cform"><h2><span class="secno">2</span>현장 답사 <span class="faint">가서 본 것</span></h2>
      <div class="cinfo"><div class="f s1"><span>답사일</span><input type="date" ${DL} data-vf="date" value="${c.visit.date}"></div>
        <div class="f s6"><span>메모</span><textarea data-vf="memo" placeholder="현장에서 본 것, 잰 것, 가져온 시료. 두 번 이상 갔으면 날짜를 적고 이어서">${E(c.visit.memo)}</textarea></div></div>
      <div class="f"><span>사진 · 스캔</span>${thumbs(c,'visit')}</div></div>
    <div class="card sec cform"><h2><span class="secno">3</span>자료 정리 <span class="faint">찾아보고 공부한 것 — 여러 개 둘 수 있습니다</span></h2>
      ${c.refs.length?c.refs.map(r=>`<div class="centry" data-rid="${r.id}"><div class="eh"><input class="etitle" data-rf="title" value="${E(r.title)}" placeholder="자료 제목 (예: 농사로 검색 결과, 책 ○○쪽)" maxlength="120"><input type="date" ${DL} data-rf="date" value="${r.date}"><button type="button" class="btn sm ghost" data-rdel="${r.id}" style="color:var(--bad)" title="이 자료 지우기">×</button></div>
        <textarea data-rf="memo" placeholder="정리한 내용">${E(r.memo)}</textarea>${thumbs(c,'ref',r.id)}</div>`).join(''):'<div class="empty" style="padding:14px">아직 자료가 없습니다.</div>'}
      <div class="row" style="margin-top:10px"><button type="button" class="btn sm" id="cs-refadd">+ 자료 추가</button><span class="hint">자료마다 제목·날짜·메모·사진. 책이나 화면을 찍어 붙여 두면 다음에 비슷한 상담 때 바로 찾습니다.</span></div></div>
    <div class="card sec cform"><h2><span class="secno">4</span>후속 조치 <span class="faint">안내한 것 · 그 뒤 어떻게 됐나</span></h2>
      <div class="cinfo"><div class="f s1"><span>조치일</span><input type="date" ${DL} data-ff="date" value="${c.follow.date}"></div>
        <div class="f s6"><span>메모</span><textarea data-ff="memo" placeholder="안내한 것, 다시 확인할 날">${E(c.follow.memo)}</textarea></div></div>
      <div class="f"><span>사진 · 스캔</span>${thumbs(c,'follow')}</div></div>
    <p class="hint">고치면 바로 반영되고, 저장은 다른 자료와 같이 저절로 됩니다. 사진은 [스캔 찾기]에서도 "상담 · 제목 · 칸 이름"으로 찾아집니다.</p>`;
  qa('textarea',pg).forEach(autosize); if(V.tagEdit) paintTagBox();
}
function autosize(t){ t.style.height='auto'; t.style.height=Math.max(90,t.scrollHeight+2)+'px'; }
function draw(keep){ const pg=q('#page-consult'); if(!pg) return; const y=keep?window.scrollY:0; const c=V.open!=null?byId(V.open):null; if(V.open!=null&&!c) V.open=null; if(c) drawDetail(c); else drawList(); if(keep) window.scrollTo(0,y); }
function open(id){ dropEmpty(); V.open=id; V.tagEdit=false; draw(); window.scrollTo(0,0); }
function back(){ dropEmpty(); V.open=null; V.tagEdit=false; draw(); window.scrollTo(0,0); }
function refOf(c,t){ const e=t.closest('[data-rid]'); return e?c.refs.find(x=>x.id===+e.dataset.rid):null; }

/* ---------- 단추 · 입력 ---------- */
document.addEventListener('click',ev=>{
  const pg=q('#page-consult'); if(!pg||!pg.contains(ev.target)) return; const t=ev.target, b=t.closest('button');
  /* 태그 고치기 상자 — 목록·건 안 어디서든 */
  if(b&&b.id==='cs-tags'){ V.tagEdit=!V.tagEdit; draw(true); return; }
  if(b&&b.id==='cs-tagclose'){ V.tagEdit=false; draw(true); return; }
  if(b&&b.id==='cs-tagadd'){ addTag(); return; }
  const rn=t.closest('[data-ctagren]'); if(rn){ const i=+rn.dataset.ctagren, inp=q(`[data-ctagname="${i}"]`,pg), n=(inp?inp.value:'').trim(); if(!n||!CS.tags[i]) return; const old=CS.tags[i].n;
    if(n!==old){ if(tagOf(n)){alert('이미 있는 태그입니다.');return;} CS.tags[i].n=n; CS.list.forEach(c=>{c.tags=c.tags.map(x=>x===old?n:x);}); if(V.tag===old) V.tag=n; } draw(true); return; }
  const dl=t.closest('[data-ctagdel]'); if(dl){ if(dl.disabled) return; const i=+dl.dataset.ctagdel, tg=CS.tags[i]; if(!tg||CS.list.some(c=>c.tags.includes(tg.n))) return; CS.tags.splice(i,1); if(V.tag===tg.n) V.tag=''; draw(true); return; }
  if(V.open==null){   /* 목록 */
    const yb=t.closest('[data-cyear]'); if(yb){ V.year=yb.dataset.cyear?+yb.dataset.cyear:null; draw(); return; }
    const sg=t.closest('[data-ctag]'); if(sg){ V.tag=sg.dataset.ctag; draw(); return; }
    if(b&&b.id==='cs-add'){ const c=mkC({}); CS.list.push(c); open(c.id); const i=q('[data-cf="title"]',pg); if(i) i.focus(); return; }
    if(b&&b.id==='cs-clear'){ V.q=V.from=V.to=''; draw(); return; }
    const op=t.closest('[data-copen]'); if(op){ open(+op.dataset.copen); return; }
    return;
  }
  const c=byId(V.open); if(!c){ V.open=null; draw(); return; }
  if(b&&b.id==='cs-back'){ back(); return; }
  if(b&&b.id==='cs-del'){ const nf=cFiles(c).length; if(!isEmpty(c)&&!confirm(`"${c.title.trim()||'(제목 없음)'}" 상담을 지웁니다${nf?` (붙인 사진 ${nf}장도 같이)`:''}. 되돌릴 수 없습니다.`)) return;
    cFiles(c).forEach(f=>removeFile(f)); CS.list=CS.list.filter(x=>x!==c); V.open=null; V.tagEdit=false; draw(); window.scrollTo(0,0); return; }
  const tg=t.closest('[data-ctog]'); if(tg){ const n=tg.dataset.ctog; if(c.tags.includes(n)) c.tags=c.tags.filter(x=>x!==n); else c.tags.push(n); draw(true); return; }
  if(b&&b.id==='cs-refadd'){ const r=mkRef({date:tday()}); c.refs.push(r); draw(true); const i=q(`[data-rid="${r.id}"] [data-rf="title"]`,pg); if(i){ i.focus(); i.scrollIntoView({block:'center'}); } return; }
  const rd=t.closest('[data-rdel]'); if(rd){ const r=c.refs.find(x=>x.id===+rd.dataset.rdel); if(!r) return; const fs=pFiles(c,'ref',r.id);
    if((r.title.trim()||r.memo.trim()||fs.length)&&!confirm(`"${r.title.trim()||'(제목 없음)'}" 자료를 지웁니다${fs.length?` (붙인 사진 ${fs.length}장도 같이)`:''}. 되돌릴 수 없습니다.`)) return;
    fs.forEach(f=>removeFile(f)); c.refs=c.refs.filter(x=>x!==r); draw(true); return; }
  const pk=t.closest('[data-cpick]'); if(pk){ const ref=refOfKey(c,pk.dataset.cpick); pickFiles(ref,()=>draw(true)); return; }
  const th=t.closest('[data-cthumb]'); if(th){ const ref=refOfKey(c,th.dataset.cthumb), fs=filesFor(ref); openViewer(fs.map(f=>f.id),+th.dataset.i,ref,vtitle(c,ref)); return; }
});
document.addEventListener('input',ev=>{
  const pg=q('#page-consult'); if(!pg||!pg.contains(ev.target)) return; const t=ev.target;
  if(V.open==null){ if(t.id==='cs-q'){ V.q=t.value; const pos=t.selectionStart; draw(true); const n=q('#cs-q',pg); if(n){ n.focus(); n.setSelectionRange(pos,pos); } } return; }
  const c=byId(V.open); if(!c||t.type==='date') return;
  if(t.tagName==='TEXTAREA') autosize(t);
  const f=t.dataset.cf; if(f){ c[f]=t.value; if(f==='title'){ const el=q('#cs-ltitle',pg); if(el) el.textContent=c.title.trim()||'(제목 없음)'; } if(f==='farm'){ const el=q('#cs-lfarm',pg); if(el) el.textContent=c.farm; } if(f==='issue'){ const el=q('#cs-lsub',pg); if(el) el.innerHTML=subLine(c); } return; }
  if(t.dataset.vf){ c.visit[t.dataset.vf]=t.value; return; }
  if(t.dataset.ff){ c.follow[t.dataset.ff]=t.value; return; }
  if(t.dataset.rf){ const r=refOf(c,t); if(r) r[t.dataset.rf]=t.value; return; }
});
document.addEventListener('change',ev=>{
  const pg=q('#page-consult'); if(!pg||!pg.contains(ev.target)) return; const t=ev.target;
  const te=t.closest('[data-ctagend]'); if(te){ const tg=CS.tags[+te.dataset.ctagend]; if(tg) tg.end=t.checked; draw(true); return; }
  if(V.open==null){ if(t.id==='cs-from'){ V.from=isYmd(t.value)?t.value:''; draw(); } else if(t.id==='cs-to'){ V.to=isYmd(t.value)?t.value:''; draw(); } return; }
  const c=byId(V.open); if(!c||t.type!=='date') return; const v=isYmd(t.value)?t.value:'';
  if(t.dataset.cf==='date'){ c.date=v; const el=q('#cs-lsub',pg); if(el) el.innerHTML=subLine(c); }
  else if(t.dataset.vf==='date') c.visit.date=v; else if(t.dataset.ff==='date') c.follow.date=v;
  else if(t.dataset.rf==='date'){ const r=refOf(c,t); if(r) r.date=v; }
});
document.addEventListener('keydown',ev=>{
  if(ev.key!=='Enter') return; const t=ev.target; if(!t||!t.id) return; const pg=q('#page-consult'); if(!pg||!pg.contains(t)) return;
  if(t.id==='cs-tagnew'){ ev.preventDefault(); addTag(); }
});

window.CONSULT={draw,open,back,list:()=>CS.list,tags:()=>CS.tags,V,isEnd,filtered,cFiles};
})();
