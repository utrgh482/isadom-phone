/* =====================================================================
 *  이사돔 — 직접 사업 (우리가 집행하는 돈)  direct.js  v4.12 (2026-09-22 · 총급여·실지급 10원 올림 · 간이세액표 엑셀 올리기)
 *  app.js 뒤에 따로 읽히는 파일입니다. 여기가 고장 나도 지도사업 화면은 그대로 돕니다.
 *  네 화면: 사업 요약(dsum) · 가계부(dledger) · 현황(dstat) · 월급 계산기(dpay) + 등록(dnew)
 *  자료는 app.js 의 저장 덩어리(snapshot) 안에 direct 라는 이름으로 같이 저장됩니다.
 * ===================================================================== */
(function(){
'use strict';

/* ================= 기준 자료 ================= */
/* 통계목 — 일상경비 운영계획에 있는 것들 */
const TONGS=['기간제근로자등보수','사무관리비','공공운영비','재료비','국내여비','행사운영비','자산및물품취득비','시설비','업무추진비','기타'];
/* 지출 종류 — 매뉴얼에서 뽑음 (2026-09-17 초안, 본인 확인 전) */
const KINDS=[
 {k:'buy',     name:'① 220만 미만 구매',   short:'구매',    docs:['견적서','산출내역 (품목 많을 때)','기안문 (지급품의결재요청)','검수서 또는 납품완료보고서','사진대지','영수증(카드) 또는 전자세금계산서','사업자등록증 (계산서일 때)','통장사본 (계산서일 때)']},
 {k:'contract',name:'② 계약 구매 (220만 이상)',short:'계약',docs:['견적서 (원가)','n% 업/다운 견적서','타 업체 견적서','사업자등록증','통장사본','4대보험 완납증명','지방세·소득세 완납증명','기안문','계약 의뢰 공문 (기획과)','계약서','인감증명서','사진대지','완료(납품완료)보고서','검수 (검사검수등록)','다중분개','공사만: 도면·하자보수증권·하자보수서약서·상세내역서·보증보험']},
 {k:'pay',     name:'③ 기간제 급여',       short:'급여',    docs:['급여대장','보수지급명세서 (도장·스캔)','급여명세서 (근로자용)','기안문','개인부담금 고지서','지출결의서']},
 {k:'ins',     name:'④ 4대보험 기관부담금', short:'4대보험', docs:['산출내역 엑셀','기안문','기관부담금 고지서','개인부담금 고지서','지출결의서']},
 {k:'repair',  name:'⑤ 수리·유지보수·용역', short:'수리',    docs:['견적서','기안문','완료보고서 또는 검수서','사진대지','전자세금계산서 또는 영수증','사업자등록증','통장사본']},
 {k:'etc',     name:'⑥ 그 외 (수당·교육비·검진비 등)',short:'그 외',docs:['기안문','증빙 (영수증·계산서·명단 등)','지출결의서']},
];
const KIND=k=>KINDS.find(x=>x.k===k)||KINDS[0];
/* 현황의 '경우' — 유진이 준 표(2026-09-22). 단계마다 필요 서류, 서류 없는 단계는 체크만. opt = 선택 서류 */
const CASES=[
 {k:'card',name:'일상경비 (카드)',steps:[
   {k:'pumui',name:'품의',docs:[],note:'체크만'},
   {k:'gian',name:'기안',docs:[{n:'기안문'},{n:'산출내역',opt:true}]},
   {k:'done',name:'완료보고',docs:[{n:'기안문',hint:'검수서로 대체 가능'},{n:'사진대지'},{n:'영수증'}]},
   {k:'approve',name:'승인내역등록',docs:[{n:'지출증빙',hint:'완료보고서(또는 검수서) + 사진대지 + 영수증을 묶어서 첨부'}]}]},
 {k:'transfer',name:'일상경비 (계좌이체)',steps:[
   {k:'pumui',name:'품의',docs:[],note:'체크만'},
   {k:'gian',name:'기안',docs:[{n:'기안문'},{n:'산출내역',opt:true}]},
   {k:'done',name:'완료보고',docs:[{n:'기안문',hint:'검수서로 대체 가능'},{n:'사진대지'}]},
   {k:'approve',name:'승인내역등록',docs:[{n:'지출증빙',hint:'완료보고서(또는 검수서) + 사진대지 묶음'},{n:'견적서'},{n:'사업자등록증'},{n:'통장사본'},{n:'전자세금계산서'}]}]},
 {k:'contract',name:'일상경비 (계약건)',steps:[
   {k:'pumui',name:'품의',docs:[],note:'체크만'},
   {k:'gian',name:'기안',docs:[{n:'기안문'},{n:'산출내역'}]},
   {k:'approve',name:'승인내역등록',docs:[{n:'견적서'},{n:'사업자등록증'},{n:'통장사본'},{n:'4대보험 완납 증명서'},{n:'국세·지방세 완납 증명서'}]},
   {k:'handoff',name:'회계에게 서류 전달',docs:[],note:'체크만'},
   {k:'done',name:'완료보고',docs:[{n:'기안문'},{n:'사진대지'}]},
   {k:'inspect',name:'검수 및 분개',docs:[],note:'체크만'}]},
 {k:'plan',name:'기획과 계약건',steps:[
   {k:'pumui',name:'품의',docs:[],note:'체크만'},
   {k:'gian',name:'기안',docs:[{n:'기안문'},{n:'산출내역'}]},
   {k:'approve',name:'승인내역등록',docs:[{n:'견적서'},{n:'사업자등록증'},{n:'통장사본'},{n:'4대보험 완납 증명서'},{n:'국세·지방세 완납 증명서'}]},
   {k:'request',name:'의뢰문',docs:[{n:'의뢰 기안문'}]},
   {k:'handoff',name:'회계에게 서류 전달',docs:[],note:'체크만'},
   {k:'done',name:'완료보고',docs:[{n:'기안문'},{n:'사진대지'}]},
   {k:'inspect',name:'검수 및 분개',docs:[],note:'체크만'}]},
];
const CASE=k=>CASES.find(x=>x.k===k)||CASES[1];
const TAGS_DEFAULT=[{n:'진행중',end:false},{n:'완료',end:true},{n:'중단',end:true},{n:'토스',end:false}];
/* 지출 흐름 — 원자료의 상태 글자로 어디까지 왔는지 */
const STEPS=['품의','원인행위','결의','지급'];
/* 계약 기준 (원, 부가세 포함) — 2026 계약시 주의사항 · 일상경비 운영계획 */
const LIMITS={contract:2200000, supplies:11000000, maintain:22000000, works:5500000};

/* 4대보험 요율 — 해마다 다릅니다. 2025 는 본인 견본(기준소득월액 240만원)에서 맞춘 것, 2026 은 공표된 요율 (확인 필요) */
const RATES_DEFAULT={
 2025:{daily:88080,meal:120000,health:0.03545,care:0.1295,pension:0.045,emp:0.009,empDev:0.0085,accident:0.00924,note:'본인 견본(2025년 3월)에서 맞춤'},
 2026:{daily:90080,meal:120000,health:0.03595,care:0.1314,pension:0.0475,emp:0.009,empDev:0.0085,accident:0.00966,note:'2026 요율 — 8월 고지서(기준소득월액 240만원)와 맞춤: 건강 3.595% + 장기요양 13.14%, 연금 4.75%, 고용 0.9%, 고안직능 0.85%, 산재 0.966%'},
};
/* 공휴일 (근로자의 날 포함) — 달력 채울 때 유급휴가로 잡습니다. 틀리면 화면에서 고치면 됩니다 */
const HOLIDAYS_DEFAULT={
 2025:['2025-01-01','2025-01-28','2025-01-29','2025-01-30','2025-03-01','2025-03-03','2025-05-01','2025-05-05','2025-05-06','2025-06-03','2025-06-06','2025-08-15','2025-10-03','2025-10-05','2025-10-06','2025-10-07','2025-10-08','2025-10-09','2025-12-25'],
 2026:['2026-01-01','2026-02-16','2026-02-17','2026-02-18','2026-03-01','2026-03-02','2026-05-01','2026-05-05','2026-05-24','2026-05-25','2026-06-03','2026-06-06','2026-08-15','2026-08-17','2026-09-24','2026-09-25','2026-09-26','2026-09-28','2026-10-03','2026-10-05','2026-10-09','2026-12-25'],
};
/* 하루 상태 */
const DAY_ST=[
 {v:'work',name:'근무',h:8,paid:true,worked:true},
 {v:'leave',name:'연가',h:0,paid:false,worked:true,annual:true},
 {v:'official',name:'공가',h:0,paid:true,worked:true,pub:true},   /* 공가는 공휴일처럼 유급휴가 (유진 확인 2026-09-21) */
 {v:'holiday',name:'공휴일',h:0,paid:true,worked:true,pub:true},
 {v:'sickpaid',name:'유급병가',h:0,paid:true,worked:true,pub:true},   /* 유급병가는 유급휴가로 침 — 유급·무급은 담당자가 고름 */
 {v:'sick',name:'무급병가',h:0,paid:false,worked:false},
 {v:'absent',name:'결근',h:0,paid:false,worked:false},
 {v:'off',name:'휴무(토)',h:0,paid:false,worked:null},
 {v:'weekly',name:'주휴',h:0,paid:false,worked:null},
 {v:'none',name:'미근무',h:0,paid:false,worked:false},
];
const DST=v=>DAY_ST.find(x=>x.v===v)||DAY_ST[0];

/* ================= 자료 ================= */
const DS={projects:[],rates:JSON.parse(JSON.stringify(RATES_DEFAULT)),holidays:JSON.parse(JSON.stringify(HOLIDAYS_DEFAULT)),tags:JSON.parse(JSON.stringify(TAGS_DEFAULT)),taxtable:null};   /* taxtable: 올린 간이세액표(없으면 taxtable.js 기본 표) */
const floor10=n=>Math.floor((+n||0)/10)*10;
const ceil10=n=>Math.ceil((+n||0)/10-1e-9)*10;   /* 총급여·실지급은 10원 단위 올림 (유진 2026-09-22) — 일의 자리가 있으면 다음 10원으로 */
const won=n=>Number(n||0).toLocaleString();
/* 숫자 읽기. 지방재정 엑셀은 1천만 원 이상을 1.749E7 처럼 지수 표기로 담아 두므로 그 꼴도 그대로 읽습니다 (v4.6 에서는 E 를 지워 1.7497 로 잘못 읽었음) */
const num=v=>{
  if(typeof v==='number') return isFinite(v)?v:'';
  const s=String(v==null?'':v).replace(/[,\s원₩]/g,'');
  if(s==='') return '';
  if(/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s)){ const n=Number(s); return isFinite(n)?n:''; }
  const t=s.replace(/[^\d.\-]/g,''); if(t==='') return ''; const n=parseFloat(t); return isNaN(n)?'':n;
};
/* v4.6 이 잘못 읽어 둔 금액 되살리기: '1.7497' 은 1.749E7(17,490,000) 을 E 없이 읽은 것 — 맨 끝 숫자가 지수(7~9) */
function unmangle(v){
  if(typeof v!=='number'||!isFinite(v)||v<=0||v>=10||Number.isInteger(v)) return null;
  const m=String(v).match(/^(\d\.\d+)([789])$/); if(!m) return null;
  const n=Number(m[1]+'E'+m[2]); return isFinite(n)&&Number.isInteger(n)?n:null;
}
const pnoKey=v=>String(v==null?'':v).trim().replace(/\.0+$/,'');
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const pad2=n=>String(n).padStart(2,'0');
const ymd=(y,m,d)=>`${y}-${pad2(m)}-${pad2(d)}`;
const today=()=>{const d=new Date();return ymd(d.getFullYear(),d.getMonth()+1,d.getDate());};
const nid=()=>{try{return uid();}catch(e){return Date.now()+Math.floor(Math.random()*1000);}};   /* app.js 의 번호표(uid)를 같이 씁니다 */

function mkDProject(o){
  const p=Object.assign({id:nid(),alias:'',full:'',sebu:'',year:new Date().getFullYear(),jeongchaek:'',danwi:'',pyeonseong:'',gukbi:'',dobi:'',sibi:'',start:'',end:'',
    note:'',sameName:'',caution:'',owner:(typeof ME!=='undefined'&&ME&&ME.name)||'',budgets:[],entries:[],workers:[],months:{}},o||{});
  p.budgets=(p.budgets||[]).map(b=>Object.assign({id:nid(),tong:'사무관리비',name:'',amt:''},b));
  p.entries=(p.entries||[]).map(e=>mkEntry(e));
  p.workers=(p.workers||[]).map(w=>mkWorker(w));
  p.months=p.months||{};
  p.cases=(p.cases||[]).map(c=>mkCase(c));
  p.grants=(p.grants||[]).map(g=>mkGrant(g));
  return p;
}
/* 일상경비 교부 — 일반지출 엑셀에서 품의유형 '일상경비교부' 인 줄. 세부사업 예산에서 일상경비 통장으로 '땡겨온' 돈 */
function mkGrant(o){ const g=Object.assign({id:nid(),pno:'',tong:'',code:'',title:'',date:'',amt:'',resDate:'',resAmt:'',payDate:'',status:''},o||{}); g.pno=pnoKey(g.pno); return g; }
const isGrantRow=r=>/일상경비\s*교부/.test(String(r.ptype||''))||/^일상경비\s*교부/.test(String(r.title||''));
const isDaily=e=>e.gubun!=='일반지출';   /* 일상경비 통장에서 나간 줄 (경비구분을 모르는 예전 줄도 일상경비로 봄) */
function grantOf(p,tong){ return (p.grants||[]).filter(g=>g.tong===tong&&g.resDate).reduce((s,g)=>s+(+g.resAmt||+g.amt||0),0); }
function grantPendingOf(p,tong){ return (p.grants||[]).filter(g=>g.tong===tong&&!g.resDate).reduce((s,g)=>s+(+g.amt||0),0); }
/* 현황의 건 하나 — 가계부 지출 줄과는 따로 (유진: 회계를 거치며 바뀌는 게 많아 잇지 않기로) */
function mkCase(o){
  const c=Object.assign({id:nid(),no:0,name:'',tag:'진행중',kind:'transfer',start:today(),amt:'',vendor:'',memo:'',steps:{},docs:{}},o||{});
  if(!c.steps||typeof c.steps!=='object') c.steps={}; if(!c.docs||typeof c.docs!=='object') c.docs={};
  return c;
}
const dkey=(sk,dn)=>`${sk}|${dn}`;
function caseStat(c){ /* 단계 진행: 해당 없음 뺀 단계 중 끝낸 수 */
  const K=CASE(c.kind); let need=0,done=0; K.steps.forEach(s=>{const st=c.steps[s.k]||{}; if(st.na) return; need++; if(st.done) done++;}); return {need,done,all:need>0&&done===need};
}
function caseFiles(p,c){ return FILES.filter(f=>f.ref&&f.ref.kind==='ddoc'&&f.ref.d===p.id&&f.ref.c===c.id); }
function nextNo(p){ return p.cases.reduce((m,c)=>Math.max(m,+c.no||0),0)+1; }
function tagOf(n){ return DS.tags.find(t=>t.n===n)||null; }
function mkEntry(o){
  const e=Object.assign({id:nid(),pno:'',gubun:'',tong:'',code:'',title:'',date:'',amt:'',status:'',vendor:'',causeDate:'',causeAmt:'',resDate:'',resAmt:'',payDate:'',payStatus:'',ptype:'',contractNo:'',kind:'',docs:{},memo:'',manual:false},o||{});
  e.pno=pnoKey(e.pno);
  let fixed=false;
  ['amt','causeAmt','resAmt'].forEach(k=>{ const n=unmangle(e[k]); if(n!=null){ e[k]=n; fixed=true; } });
  if(fixed&&(!e.kind||e.kind==='buy')) e.kind=guessKind(e);   /* 금액이 커진 만큼 계약 종류로 다시 짐작 */
  if(!e.kind) e.kind=guessKind(e);
  if(!e.docs||typeof e.docs!=='object') e.docs={};
  return e;
}
function mkWorker(o){
  return Object.assign({id:nid(),name:'',hired:'',quit:'',daily:'',base:'',deps:1,child:0,bank:'',account:'',site:'',meal:120000,health:true,pension:true,emp:true,accident:true,memo:'',birth:''},o||{});
}
function guessKind(e){
  const t=String(e.title||'');
  if(/4대보험|기관부담금/.test(t)) return 'ins';
  if(/보수 지급|보수지급|급여|임금/.test(t)) return 'pay';
  if(/유지 ?보수|수리|보수 건의|교체|위탁|유지관리/.test(t)) return 'repair';
  if(/수당|교육비|검진|검사 비용|신체검사|여비|수수료/.test(t)) return 'etc';
  if(e.contractNo||(+e.amt||0)>=LIMITS.contract) return 'contract';
  return 'buy';
}
/* 금액으로 보는 계약 판정 */
function verdict(e){
  const a=+e.resAmt||+e.amt||0, out=[];
  if(e.kind==='pay'||e.kind==='ins') return out;
  if(a>=LIMITS.contract) out.push({bad:true,t:`부가세 포함 ${won(LIMITS.contract)}원 이상 — 계약 구매(②)`});
  if(e.kind==='repair'&&a>LIMITS.maintain) out.push({bad:true,t:`유지보수 용역 ${won(LIMITS.maintain)}원 초과 — 기획과 계약 의뢰`});
  else if(e.kind!=='repair'&&a>LIMITS.supplies) out.push({bad:true,t:`소모품·물품 ${won(LIMITS.supplies)}원 초과 — 기획과 계약 의뢰`});
  return out;
}
function stepOf(e){
  if(e.payDate||/지급/.test(e.payStatus||'')) return 3;
  if(e.resDate) return 2;
  if(e.causeDate) return 1;
  return 0;
}
function docsOf(e){return KIND(e.kind).docs;}
function docStat(e){const ds=docsOf(e); let have=0,na=0; ds.forEach(d=>{const v=e.docs[d]||0; if(v===1)have++; else if(v===2)na++;}); const need=ds.length-na; return {have,need,done:need>0&&have===need,any:have>0};}
const byId=id=>DS.projects.find(p=>p.id===id);
function projYears(){return [...new Set(DS.projects.map(p=>p.year))].sort((a,b)=>b-a);}
function budgetOf(p,tong){return p.budgets.filter(b=>b.tong===tong).reduce((s,b)=>s+(+b.amt||0),0)*1000;}
function tongsOf(p){const set=new Set(p.budgets.map(b=>b.tong)); p.entries.forEach(e=>{if(e.tong) set.add(e.tong);}); (p.grants||[]).forEach(g=>{if(g.tong) set.add(g.tong);}); return TONGS.filter(t=>set.has(t)).concat([...set].filter(t=>!TONGS.includes(t)));}
/* daily: true 면 일상경비 줄만, false 면 일반지출 줄만, 없으면 전부 */
function spentOf(p,tong,uptoMonth,daily){return p.entries.filter(e=>e.tong===tong&&(daily==null||isDaily(e)===daily)&&(uptoMonth==null||(e.resDate&&+e.resDate.slice(5,7)<=uptoMonth))).reduce((s,e)=>s+(+e.resAmt||(e.resDate?+e.amt:0)||0),0);}
function pendingOf(p,tong,daily){return p.entries.filter(e=>e.tong===tong&&(daily==null||isDaily(e)===daily)&&!e.resDate).reduce((s,e)=>s+(+e.amt||0),0);}

/* ================= 엑셀 읽기 (지방재정에서 내려받은 원자료) ================= */
/* 외부 부품 없이 읽습니다: xlsx = zip + xml. 압축은 브라우저의 DecompressionStream 으로 풉니다 */
async function readXlsx(file){
  const buf=new Uint8Array(await file.arrayBuffer()), dv=new DataView(buf.buffer);
  let eocd=-1; for(let i=buf.length-22;i>=Math.max(0,buf.length-70000);i--){ if(dv.getUint32(i,true)===0x06054b50){eocd=i;break;} }
  if(eocd<0) throw new Error('엑셀(xlsx) 파일이 아닙니다.');
  const n=dv.getUint16(eocd+10,true), cdOff=dv.getUint32(eocd+16,true);
  const entries={}; let p=cdOff;
  for(let i=0;i<n;i++){
    if(dv.getUint32(p,true)!==0x02014b50) break;
    const method=dv.getUint16(p+10,true), csize=dv.getUint32(p+20,true), usize=dv.getUint32(p+24,true), nlen=dv.getUint16(p+28,true), elen=dv.getUint16(p+30,true), clen=dv.getUint16(p+32,true), loff=dv.getUint32(p+42,true);
    const name=new TextDecoder().decode(buf.subarray(p+46,p+46+nlen));
    entries[name]={method,csize,usize,loff}; p+=46+nlen+elen+clen;
  }
  async function get(name){
    const e=entries[name]; if(!e) return null;
    const lh=e.loff, nlen=dv.getUint16(lh+26,true), elen=dv.getUint16(lh+28,true), start=lh+30+nlen+elen;
    const data=buf.subarray(start,start+e.csize);
    if(e.method===0) return new TextDecoder().decode(data);
    if(e.method!==8) throw new Error('지원하지 않는 압축 방식입니다.');
    if(typeof DecompressionStream==='undefined') throw new Error('이 브라우저는 압축을 풀지 못합니다 (크롬·엣지 최신판 필요).');
    const ds=new DecompressionStream('deflate-raw');
    const out=await new Response(new Blob([data]).stream().pipeThrough(ds)).arrayBuffer();
    return new TextDecoder().decode(out);
  }
  const parse=x=>new DOMParser().parseFromString(x,'application/xml');
  const wb=parse(await get('xl/workbook.xml')), rels=parse(await get('xl/_rels/workbook.xml.rels'));
  const sheets=[...wb.getElementsByTagName('sheet')].map(s=>({name:s.getAttribute('name'),rid:s.getAttribute('r:id')||s.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')}));
  const relMap={}; [...rels.getElementsByTagName('Relationship')].forEach(r=>{relMap[r.getAttribute('Id')]=r.getAttribute('Target');});
  const sst=[]; const sx=await get('xl/sharedStrings.xml');
  if(sx){ const d=parse(sx); [...d.getElementsByTagName('si')].forEach(si=>{sst.push([...si.getElementsByTagName('t')].map(t=>t.textContent).join(''));}); }
  const colIdx=ref=>{const m=ref.match(/^([A-Z]+)/); let c=0; for(const ch of m[1]) c=c*26+(ch.charCodeAt(0)-64); return c-1;};
  const out=[];
  for(const sh of sheets){
    let target=relMap[sh.rid]||''; if(!target) continue; target=target.replace(/^\//,''); if(!target.startsWith('xl/')) target='xl/'+target;
    const xml=await get(target); if(!xml) continue;
    const d=parse(xml), rows=[];
    [...d.getElementsByTagName('row')].forEach(r=>{
      const cells=[];
      [...r.getElementsByTagName('c')].forEach(c=>{
        const ref=c.getAttribute('r')||'', t=c.getAttribute('t'), v=c.getElementsByTagName('v')[0], is=c.getElementsByTagName('is')[0];
        let val='';
        if(t==='s') val=sst[+(v?v.textContent:0)]||'';
        else if(t==='inlineStr') val=is?[...is.getElementsByTagName('t')].map(x=>x.textContent).join(''):'';
        else if(t==='b') val=v&&v.textContent==='1'?'TRUE':'FALSE';
        else { val=v?v.textContent:''; if((!t||t==='n')&&/^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(val.trim())){ const n=Number(val); if(isFinite(n)) val=n; } }
        cells[colIdx(ref)]=val;
      });
      rows.push(cells);
    });
    out.push({name:sh.name,rows});
  }
  return out;
}
/* 원자료 줄 → 지출 줄 */
const D8=s=>{const t=String(s||'').replace(/\D/g,''); return t.length>=8?`${t.slice(0,4)}-${t.slice(4,6)}-${t.slice(6,8)}`:'';};
function parseLedgerRows(rows){
  if(!rows.length) return {error:'빈 시트입니다.'};
  const hi=rows.findIndex(r=>r&&r.some(c=>String(c||'').trim()==='적요')&&r.some(c=>String(c||'').trim()==='품의일자'));
  if(hi<0) return {error:'지방재정에서 내려받은 지출 목록(일상경비·일반지출)이 아닌 것 같습니다 (적요·품의일자 열이 없습니다).'};
  const hdr=rows[hi].map(c=>String(c||'').trim());
  const col=(name,nth)=>{let k=0; for(let i=0;i<hdr.length;i++){ if(hdr[i]===name){ if(k===(nth||0)) return i; k++; } } return -1;};
  const F={sebu:col('세부사업'),gubun:col('경비구분'),tong:col('통계목명'),code:col('통계목코드'),title:col('적요'),pno:col('품의번호'),date:col('품의일자'),amt:col('품의금액'),status:col('품의상태'),vendor:col('거래처명',0),
    causeDate:col('원인행위일'),causeAmt:col('원인금액'),resDate:col('결의일자'),resAmt:col('결의금액'),payDate:col('지급일자'),payStatus:col('지급상태'),ptype:col('품의유형'),contractNo:col('계약대장관리번호'),dept:col('부서명')};
  const g=(r,k)=>F[k]>=0?String(r[F[k]]==null?'':r[F[k]]).trim():'';
  const list=[];
  for(let i=hi+1;i<rows.length;i++){const r=rows[i]; if(!r||!g(r,'title')&&!g(r,'pno')) continue;
    const won0=k=>{const n=num(r[F[k]]); return n===''?'':Math.round(n);};
    list.push({sebu:g(r,'sebu'),gubun:g(r,'gubun'),tong:g(r,'tong'),code:g(r,'code'),title:g(r,'title'),pno:pnoKey(g(r,'pno')),date:D8(g(r,'date')),amt:won0('amt'),status:g(r,'status'),vendor:g(r,'vendor'),
      causeDate:D8(g(r,'causeDate')),causeAmt:won0('causeAmt'),resDate:D8(g(r,'resDate')),resAmt:won0('resAmt'),payDate:D8(g(r,'payDate')),payStatus:g(r,'payStatus'),ptype:g(r,'ptype'),contractNo:g(r,'contractNo')});
  }
  return {list};
}
const norm=s=>String(s||'').replace(/\s+/g,'').replace(/[()（）]/g,'');
function matchProject(sebu,year){
  const n=norm(sebu); if(!n) return null;
  return DS.projects.find(p=>p.year===year&&(norm(p.sebu)===n||norm(p.full)===n||norm(p.alias)===n))
      ||DS.projects.find(p=>norm(p.sebu)===n||norm(p.full)===n)
      ||DS.projects.find(p=>p.year===year&&n.includes(norm(p.alias))&&norm(p.alias).length>=3)||null;
}
/* 가져온 줄을 사업에 넣습니다 — 품의번호가 같으면 갱신, 없으면 추가 */
function importInto(p,rows){
  let added=0,updated=0,gAdded=0,gUpdated=0; p.grants=p.grants||[];
  rows.forEach(r=>{
    if(isGrantRow(r)){ /* 일상경비 교부 → 따로 */
      let g=r.pno?p.grants.find(x=>x.pno===r.pno):null;
      const v={pno:r.pno,tong:r.tong,code:r.code,title:r.title,date:r.date,amt:r.amt,resDate:r.resDate,resAmt:r.resAmt,payDate:r.payDate,status:r.status};
      if(g){ Object.assign(g,v); gUpdated++; } else { p.grants.push(mkGrant(v)); gAdded++; }
      return;
    }
    /* 품의번호는 경비구분(일상경비/일반지출)마다 따로 매겨집니다 → 같은 경비구분끼리만, 경비구분을 모르는 예전 줄은 적요나 금액이 같을 때만 */
    let e=null;
    if(r.pno){ e=p.entries.find(x=>pnoKey(x.pno)===r.pno&&x.gubun&&x.gubun===r.gubun)
      ||p.entries.find(x=>pnoKey(x.pno)===r.pno&&!x.gubun&&(x.title===r.title||+x.amt===+r.amt))||null; }
    if(!e) e=p.entries.find(x=>!x.pno&&x.title===r.title&&x.date===r.date&&+x.amt===+r.amt)||null;
    if(e){ Object.assign(e,{gubun:r.gubun||e.gubun,tong:r.tong||e.tong,code:r.code||e.code,title:r.title||e.title,date:r.date||e.date,amt:r.amt!==''?r.amt:e.amt,status:r.status,vendor:r.vendor||e.vendor,causeDate:r.causeDate,causeAmt:r.causeAmt,resDate:r.resDate,resAmt:r.resAmt,payDate:r.payDate,payStatus:r.payStatus,ptype:r.ptype,contractNo:r.contractNo,pno:r.pno||e.pno}); e.manual=false; updated++; }
    else { const {sebu,...rest}=r; p.entries.push(mkEntry(rest)); added++; }
  });
  p.entries.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.pno).localeCompare(String(b.pno)));
  p.grants.sort((a,b)=>String(a.date).localeCompare(String(b.date))||String(a.pno).localeCompare(String(b.pno)));
  return {added,updated,gAdded,gUpdated};
}

/* ================= 월급 계산 ================= */
function ratesFor(year){ const r=DS.rates[year]||DS.rates[String(year)]; if(r) return r; const ys=Object.keys(DS.rates).map(Number).sort((a,b)=>b-a); const near=ys.find(y=>y<=year)||ys[0]; return DS.rates[near]||RATES_DEFAULT[2026]; }
function holidaysFor(year){ return DS.holidays[year]||DS.holidays[String(year)]||[]; }
function daysInMonth(y,m){return new Date(y,m,0).getDate();}
/* 근로자의 이 달 달력을 처음 만들 때 — 평일 근무, 토 휴무, 일 주휴(판정), 공휴일, 채용 전·퇴직 후 미근무 */
function defaultDays(p,w,ym){
  const [y,m]=ym.split('-').map(Number), n=daysInMonth(y,m), hol=new Set(holidaysFor(y)), days={};
  for(let d=1;d<=n;d++){
    const date=ymd(y,m,d), dow=new Date(y,m-1,d).getDay();
    if((w.hired&&date<w.hired)||(w.quit&&date>=w.quit)){days[d]='none';continue;}
    if(dow===0) days[d]='weekly'; else if(dow===6) days[d]='off'; else if(hol.has(date)) days[d]='holiday'; else days[d]='work';
  }
  return days;
}
function monthRec(p,ym,create){ if(!p.months[ym]){ if(!create) return null; p.months[ym]={w:{}}; } return p.months[ym]; }
function workerMonth(p,w,ym,create){
  const mr=monthRec(p,ym,create); if(!mr) return null;
  if(!mr.w[w.id]){ if(!create) return null; mr.w[w.id]={days:defaultDays(p,w,ym),ot:{},tax:'',ins:{},memo:'',weekly:{}}; }
  const wm=mr.w[w.id]; wm.ot=wm.ot||{}; wm.ins=wm.ins||{}; wm.weekly=wm.weekly||{}; return wm;
}
/* 주휴 판정 — 그 일요일 앞의 월~금이 모두 근무·연가·공가·공휴일·유급병가면 주휴. 월~금이 지난달에 걸치면 지난달 기록(없으면 기본 달력)으로 봅니다 (유진 8월 양식: 8/2 일요일도 주휴) */
function weeklyPaid(p,w,wm,y,m,d){
  if(wm.weekly[d]==='on') return true; if(wm.weekly[d]==='off') return false;
  const dow=new Date(y,m-1,d).getDay(); if(dow!==0) return false;
  let prev=null;
  for(let k=6;k>=2;k--){ const dd=d-k; let st;
    if(dd<1){ if(!prev){ const py=m===1?y-1:y, pm=m===1?12:m-1, pym=`${py}-${pad2(pm)}`, rec=p.months[pym]&&p.months[pym].w[w.id]; prev={n:daysInMonth(py,pm),days:rec?rec.days:defaultDays(p,w,pym)}; } st=prev.days[prev.n+dd]||'none'; }
    else st=wm.days[dd]||'none';
    if(!DST(st).worked) return false; }
  return true;
}
/* 그날 일한 시간 — 근무일은 기본 8, 연가를 시간으로 쓰면 그만큼 적게 (나머지는 연차수당) */
function hoursOf(wm,d){ const h=wm.hours&&wm.hours[d]; if(h==null||h==='') return 8; return Math.max(0,Math.min(8,+h||0)); }
const dayText=x=>{ if(!x) return '0일'; const f=Math.floor(x), h=Math.round((x-f)*8); return h?`${f?f+'일 ':''}${h}시간`:`${f}일`; };
/* 근로소득세 — 간이세액표(taxtable.js). 월급여액(원)·공제대상가족 수(본인 포함)·8~20세 자녀 수 → 세액(원). 표 파일이 없으면 null */
/* 쓰는 간이세액표 — 올린 표(DS.taxtable)가 있으면 그것, 없으면 taxtable.js 의 기본 표 */
function taxTable(){ const t=DS.taxtable; return (t&&Array.isArray(t.rows)&&t.rows.length)?t:(window.TAXTABLE||null); }
function taxFor(gross,deps,child){
  const T=taxTable(); if(!T||!T.rows||!T.rows.length) return null;
  const g=Math.max(0,Math.floor(+gross||0)), d=Math.max(1,+deps||1), k=Math.min(d,11), kw=g/1000;
  let tax=0;
  if(kw<T.rows[0][0]) tax=0;
  else if(kw<10000){ const r=T.rows.find(r=>kw>=r[0]&&kw<r[1]); if(r){ tax=r[1+k]; if(d>11) tax=Math.max(0,r[12]-(r[11]-r[12])*(d-11)); } }
  else { /* 10,000천원 초과 — 표 아래 계산식 */
    const b=T.at10000[k-1]; let t;
    if(kw<=14000) t=b+(g-10000000)*0.98*0.35+25000;
    else if(kw<=28000) t=b+1397000+(g-14000000)*0.98*0.38;
    else if(kw<=30000) t=b+6610600+(g-28000000)*0.98*0.40;
    else if(kw<=45000) t=b+7394600+(g-30000000)*0.40;
    else if(kw<=87000) t=b+13394600+(g-45000000)*0.42;
    else t=b+31034600+(g-87000000)*0.45;
    tax=floor10(t); }
  const c=Math.max(0,+child||0); if(c>0){ const ded=c===1?20830:(c===2?45830:45830+33330*(c-2)); tax=Math.max(0,tax-ded); }
  return tax;
}
function calcWorker(p,w,ym){
  const [y,m]=ym.split('-').map(Number), n=daysInMonth(y,m), R=ratesFor(y), wm=workerMonth(p,w,ym,true);
  const daily=+w.daily||R.daily||0, hourly=daily/8;
  wm.hours=wm.hours||{};
  let workH=0,hol=0,leaveFull=0,leaveH=0,weekly=0,otH=0,sick=0,absent=0,official=0,sickPaid=0; const days=[];
  for(let d=1;d<=n;d++){
    const st=wm.days[d]||'none', dow=new Date(y,m-1,d).getDay(); let hours=0;
    if(st==='work'){ hours=hoursOf(wm,d); workH+=hours; if(hours<8) leaveH+=8-hours; }
    else if(st==='holiday') hol++; else if(st==='leave') leaveFull++; else if(st==='sick') sick++; else if(st==='absent') absent++; else if(st==='official'){ official++; hol++; } else if(st==='sickpaid'){ sickPaid++; hol++; }   /* 공가·유급병가 = 유급휴가 */
    const wk=dow===0&&st!=='none'&&weeklyPaid(p,w,wm,y,m,d); if(wk) weekly++;
    const ot=+wm.ot[d]||0; otH+=ot;
    days.push({d,dow,st,hours,weekly:wk,ot,partial:st==='work'&&hours<8});
  }
  const workDays=workH/8, leave=leaveFull+leaveH/8;
  const base=Math.round(workH*hourly), holPay=hol*daily, leavePay=Math.round(leave*daily), weeklyPay=weekly*daily, otPay=Math.round(otH*hourly*1.5);
  const total=base+holPay+leavePay+weeklyPay+otPay, gross=ceil10(total);
  /* 4대보험 — 칸에 적은(또는 고지 엑셀로 넣은) 숫자가 있으면 그것, 없으면 기준소득월액 × 요율 */
  const ins=wm.ins||{}, has=k=>ins[k]!==''&&ins[k]!=null, take=k=>+ins[k]||0;
  const pension=has('pension')?take('pension'):(w.pension?floor10((+w.base||0)*R.pension):0);
  /* 기준소득월액을 안 넣었으면 고지서의 국민연금액으로 거꾸로 셉니다 (연금액 ÷ 요율, 만원 단위) */
  const bm=+w.base||(pension&&R.pension?Math.round(pension/R.pension/10000)*10000:0);
  const health=has('health')?take('health'):(w.health?floor10(bm*R.health*(1+R.care)):0);
  const emp=has('emp')?take('emp'):(w.emp?floor10(bm*R.emp):0);
  /* 근로소득세 — 칸에 적은 숫자가 있으면 그것, 없으면 간이세액표 */
  const taxAuto=taxFor(gross,w.deps,w.child), taxTyped=wm.tax!==''&&wm.tax!=null;
  const tax=taxTyped?(+wm.tax||0):(taxAuto==null?0:taxAuto), local=floor10(tax*0.1), meal=+w.meal||0;
  const ded=health+pension+emp+tax+local+meal, net=ceil10(gross-ded);
  /* 기관부담금 — 고지 숫자가 있으면 그것, 없으면 개인부담금과 같게(건강·연금·고용) 또는 요율로(고안직능·산재) */
  const orgHealth=has('orgHealth')?take('orgHealth'):(w.health?health:0);
  const orgPension=has('orgPension')?take('orgPension'):(w.pension?pension:0);
  const orgEmp=has('orgEmp')?take('orgEmp'):(w.emp?emp:0);
  const orgEmpDev=has('orgEmpDev')?take('orgEmpDev'):(w.emp?floor10(bm*R.empDev):0);
  const orgAcc=has('orgAcc')?take('orgAcc'):(w.accident?floor10(bm*R.accident):0);
  return {y,m,n,daily,hourly,workDays,workH,hol,leave,leaveFull,leaveH,weekly,otH,sick,absent,official,sickPaid,base,holPay,leavePay,weeklyPay,otPay,total,gross,health,pension,emp,tax,local,meal,ded,net,bm,taxAuto,taxTyped,days,
    org:{health:orgHealth,pension:orgPension,emp:orgEmp,empDev:orgEmpDev,acc:orgAcc,sum:orgHealth+orgPension+orgEmp+orgEmpDev+orgAcc},person:{health,pension,emp,sum:health+pension+emp},wm};
}
/* ── 4대보험료 산출내역(고지) 엑셀 읽기 — 머리줄 '성명 · 국민건강보험료 · 국민연금보험료 · 고용보험료 · 산재보험료', 다음 줄 '개인부담금/기관부담금' */
function parseInsRows(rows){
  const txt=c=>String(c==null?'':c).replace(/\s+/g,'');
  const hi=rows.findIndex(r=>r&&r.some(c=>txt(c)==='성명')&&r.some(c=>/건강보험/.test(txt(c))));
  if(hi<0) return {error:'4대보험료 산출내역 엑셀이 아닌 것 같습니다 (성명·국민건강보험료 머리줄이 없습니다).'};
  const H=rows[hi], S=rows[hi+1]||[], nameCol=H.findIndex(c=>txt(c)==='성명');
  const groups=[]; H.forEach((c,i)=>{const t=txt(c); if(!t) return; if(/건강/.test(t)) groups.push({k:'health',i}); else if(/연금/.test(t)) groups.push({k:'pension',i}); else if(/고용/.test(t)) groups.push({k:'emp',i}); else if(/산재/.test(t)) groups.push({k:'acc',i});});
  const map={};
  groups.forEach((g,gi)=>{const end=gi+1<groups.length?groups[gi+1].i:H.length;
    for(let c=g.i;c<end;c++){const s=txt(S[c]);
      if(g.k==='acc'){ if(c===g.i) map[c]='orgAcc'; continue; }
      if(!s){ if(c===g.i) map[c]=g.k; continue; }
      if(/개인/.test(s)) map[c]=g.k; else if(/고안|직능/.test(s)) map[c]='orgEmpDev'; else if(/기관/.test(s)) map[c]='org'+g.k[0].toUpperCase()+g.k.slice(1); }});
  let title=''; for(let i=0;i<hi&&!title;i++) (rows[i]||[]).forEach(c=>{ if(!title&&/산출내역|보험료/.test(String(c||''))) title=String(c); });
  const mm=title.match(/(\d{1,2})\s*월/), yy=title.match(/(\d{2,4})\s*년/);
  const list=[];
  for(let i=hi+2;i<rows.length;i++){const r=rows[i]; if(!r) continue; const name=String(r[nameCol]==null?'':r[nameCol]).trim(); if(!name||/^합\s*계$/.test(name)) continue;
    const o={name}; let any=false; Object.entries(map).forEach(([c,k])=>{const v=num(r[c]); if(v!==''){o[k]=Math.round(v); any=true;}}); if(any) list.push(o);}
  const year=yy?(+yy[1]<100?2000+ +yy[1]:+yy[1]):null;
  return {list,month:mm?+mm[1]:null,year};
}
/* 읽은 줄을 그 달 근로자 칸에 넣습니다 — 이름이 같은 근로자만 */
function importIns(p,list,ym){
  const key=s=>String(s||'').replace(/\s+/g,''), [y]=ym.split('-').map(Number), R=ratesFor(y), done=[], miss=[];
  list.forEach(o=>{const w=p.workers.find(x=>key(x.name)===key(o.name)); if(!w){miss.push(o.name);return;}
    const wm=workerMonth(p,w,ym,true); wm.ins=wm.ins||{};
    ['health','orgHealth','pension','orgPension','emp','orgEmp','orgEmpDev','orgAcc'].forEach(k=>{ if(o[k]!=null) wm.ins[k]=o[k]; });
    if(!w.base&&o.pension&&R.pension) w.base=Math.round(o.pension/R.pension/10000)*10000;   /* 기준소득월액이 비어 있으면 연금액으로 채움 */
    done.push(w.name);});
  return {done,miss};
}
async function importInsFile(p,f){
  let sheets; try{ sheets=await readXlsx(f); }catch(err){ alert('엑셀을 읽지 못했습니다: '+(err.message||err)); return; }
  let parsed=null; for(const sh of sheets){ const r=parseInsRows(sh.rows); if(r.list){parsed=r;break;} parsed=parsed||r; }
  if(!parsed||!parsed.list){ alert(parsed?parsed.error:'읽을 시트가 없습니다.'); return; }
  if(!parsed.list.length){ alert('사람 줄이 없습니다.'); return; }
  const [cy]=D.ym.split('-').map(Number); let ym=parsed.month?`${parsed.year||cy}-${pad2(parsed.month)}`:D.ym;
  const ans=prompt(`"${f.name}" 에서 ${parsed.list.length}명을 읽었습니다.\n어느 달의 4대보험료로 넣을까요? (예: 2026-08)`,ym); if(ans==null) return;
  if(!/^\d{4}-\d{2}$/.test(ans.trim())){ alert('달은 2026-08 처럼 적어 주세요.'); return; } ym=ans.trim();
  const r=importIns(p,parsed.list,ym); D.ym=ym; drawPay();
  alert(`${ym} 4대보험료를 넣었습니다.\n넣은 사람: ${r.done.join(', ')||'없음'}${r.miss.length?`\n근로자 목록에 없어 건너뜀: ${r.miss.join(', ')} — 근로자를 먼저 등록하고 다시 올리세요.`:''}`);
}
/* ── 근로소득 간이세액표 엑셀(국세청) 읽기 ──
   자료 줄 = [이상(천원), 미만(천원), 가족 1~11명 세액] 숫자 13개. "10,000천원인 경우의 세액" 11개(내림차순, 백만 원대)는 따로 찾고, 못 찾으면 예전 표의 값을 그대로 둡니다. */
const tnum=v=>{ if(typeof v==='number') return isFinite(v)?v:null; const s=String(v==null?'':v).replace(/[,\s원]/g,''); if(!/^[-+]?\d+(\.\d+)?$/.test(s)) return null; return Number(s); };
function parseTaxRows(rows){
  const data=[], texts=[]; let at10000=null;
  (rows||[]).forEach(r=>{ if(!r) return;
    const cells=r.map(x=>x==null?'':x); const nums=cells.map(tnum);
    cells.forEach(v=>{ if(typeof v==='string'&&v.trim()) texts.push(v); });
    /* 자료 줄: 앞 두 칸이 이상<미만, 그 뒤 숫자 11개 */
    const i0=nums.findIndex(x=>x!=null); if(i0<0) return;
    const run=[]; for(let i=i0;i<nums.length&&nums[i]!=null;i++) run.push(nums[i]);
    if(run.length>=13&&run[0]>=0&&run[1]>run[0]&&run[1]<=10000&&run.slice(2,13).every(x=>x>=0)){ data.push([run[0],run[1],...run.slice(2,13).map(x=>Math.round(x))]); return; }
    /* 10,000천원인 경우의 세액: 백만 원대 숫자 11개가 내림차순 */
    const big=nums.filter(x=>x!=null&&x>=100000); if(!at10000&&big.length>=11){ const b=big.slice(-11); if(b.every((x,i)=>i===0||x<=b[i-1])&&b[0]>=1000000) at10000=b.map(x=>Math.round(x)); }
  });
  data.sort((a,b)=>a[0]-b[0]);
  const eff=(()=>{ for(const t of texts){ const m=t.match(/(20\d{2})\s*[.\-년/]\s*(\d{1,2})\s*[.\-월/]\s*(\d{1,2})/); if(m) return `${m[1]}-${pad2(+m[2])}-${pad2(+m[3])}`; } return ''; })();
  return {rows:data,at10000,eff};
}
async function importTaxFile(f){
  let sheets; try{ sheets=await readXlsx(f); }catch(err){ alert('엑셀을 읽지 못했습니다: '+(err.message||err)); return; }
  let best=null; for(const sh of sheets){ const r=parseTaxRows(sh.rows); if(!best||r.rows.length>best.rows.length) best=r; }
  if(!best||best.rows.length<100){ alert(`간이세액표 모양의 줄(월급여액 이상·미만 + 가족 수 1~11명 세액)을 ${best?best.rows.length:0}줄밖에 못 찾았습니다. 국세청 간이세액표 엑셀(.xlsx)이 맞는지 확인해 주세요.`); return; }
  const prev=taxTable();
  let eff=best.eff||prompt('이 표의 시행일을 넣어 주세요 (예: 2027-03-01)',today()); if(eff==null) return; eff=String(eff).trim(); if(!/^\d{4}-\d{2}-\d{2}$/.test(eff)){ alert('시행일은 2027-03-01 처럼 넣어 주세요.'); return; }
  const at=best.at10000||(prev&&prev.at10000)||null; if(!at){ alert('10,000천원인 경우의 세액을 찾지 못했고 예전 값도 없습니다. 파일을 확인해 주세요.'); return; }
  const first=best.rows[0], last=best.rows[best.rows.length-1];
  if(!confirm(`"${f.name}" 에서 간이세액표 ${best.rows.length}줄을 읽었습니다.\n\n구간 ${first[0].toLocaleString()} ~ ${last[1].toLocaleString()}천원 · 시행일 ${eff}\n10,000천원 초과 계산용 세액: ${best.at10000?'파일에서 찾음':'못 찾아 예전 값 그대로'}\n\n이 표로 바꿀까요?`)) return;
  DS.taxtable={eff,rows:best.rows,at10000:at,src:f.name,at:today()};
  drawPay();
}
function activeWorkers(p,ym){ const [y,m]=ym.split('-').map(Number), first=ymd(y,m,1), last=ymd(y,m,daysInMonth(y,m)); return p.workers.filter(w=>(!w.hired||w.hired<=last)&&(!w.quit||w.quit>first)); }

/* ================= 엑셀 만들기 (외부 부품 없이) ================= */
/* xlsx = zip(압축 안 함) + xml. 글은 inlineStr 로 넣습니다 */
const XL=(function(){
  const CRC=(()=>{const t=new Uint32Array(256);for(let i=0;i<256;i++){let c=i;for(let k=0;k<8;k++)c=c&1?0xEDB88320^(c>>>1):c>>>1;t[i]=c>>>0;}return t;})();
  const crc32=b=>{let c=0xFFFFFFFF;for(let i=0;i<b.length;i++)c=CRC[(c^b[i])&0xFF]^(c>>>8);return (c^0xFFFFFFFF)>>>0;};
  const enc=new TextEncoder();
  function zip(files){ /* files: [{name, text}] */
    const parts=[], cd=[]; let off=0;
    const dt=new Date(), dosT=((dt.getHours()<<11)|(dt.getMinutes()<<5)|(dt.getSeconds()>>1))&0xFFFF, dosD=(((dt.getFullYear()-1980)<<9)|((dt.getMonth()+1)<<5)|dt.getDate())&0xFFFF;
    files.forEach(f=>{
      const name=enc.encode(f.name), data=enc.encode(f.text), crc=crc32(data);
      const lh=new DataView(new ArrayBuffer(30)); lh.setUint32(0,0x04034b50,true); lh.setUint16(4,20,true); lh.setUint16(6,0x0800,true); lh.setUint16(8,0,true); lh.setUint16(10,dosT,true); lh.setUint16(12,dosD,true);
      lh.setUint32(14,crc,true); lh.setUint32(18,data.length,true); lh.setUint32(22,data.length,true); lh.setUint16(26,name.length,true); lh.setUint16(28,0,true);
      const ch=new DataView(new ArrayBuffer(46)); ch.setUint32(0,0x02014b50,true); ch.setUint16(4,20,true); ch.setUint16(6,20,true); ch.setUint16(8,0x0800,true); ch.setUint16(10,0,true); ch.setUint16(12,dosT,true); ch.setUint16(14,dosD,true);
      ch.setUint32(16,crc,true); ch.setUint32(20,data.length,true); ch.setUint32(24,data.length,true); ch.setUint16(28,name.length,true); ch.setUint16(30,0,true); ch.setUint16(32,0,true); ch.setUint16(34,0,true); ch.setUint16(36,0,true); ch.setUint32(38,0,true); ch.setUint32(42,off,true);
      parts.push(new Uint8Array(lh.buffer),name,data); cd.push(new Uint8Array(ch.buffer),name);
      off+=30+name.length+data.length;
    });
    const cdSize=cd.reduce((s,x)=>s+x.length,0);
    const e=new DataView(new ArrayBuffer(22)); e.setUint32(0,0x06054b50,true); e.setUint16(8,files.length,true); e.setUint16(10,files.length,true); e.setUint32(12,cdSize,true); e.setUint32(16,off,true);
    return new Blob([...parts,...cd,new Uint8Array(e.buffer)],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
  }
  const X=s=>String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const colL=i=>{let s='';i++;while(i>0){const r=(i-1)%26;s=String.fromCharCode(65+r)+s;i=Math.floor((i-1)/26);}return s;};
  /* 서식 번호 (styles.xml 의 cellXfs 순서)
     0 보통 · 1 글 가운데+테두리 · 2 글 왼쪽+테두리 · 3 숫자 #,##0 오른쪽+테두리 · 4 머리(굵게·가운데·회색·테두리·줄바꿈)
     5 제목(굵게 16 가운데) · 6 글 가운데 굵게+테두리 · 7 숫자 굵게+테두리+회색 · 8 작은 글 가운데 줄바꿈+테두리
     9 글 왼쪽 · 10 숫자 #,##0 · 11 글 가운데 · 12 연두 바탕 가운데+테두리(공휴일) · 13 노랑 바탕 가운데+테두리(연가) · 14 글 굵게 왼쪽 · 15 회색 바탕 글 가운데+테두리 · 16 숫자 오른쪽 굵게 */
  const STYLES=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
<fonts count="5"><font><sz val="10"/><name val="맑은 고딕"/></font><font><b/><sz val="10"/><name val="맑은 고딕"/></font><font><b/><sz val="16"/><name val="맑은 고딕"/></font><font><sz val="9"/><name val="맑은 고딕"/></font><font><b/><sz val="12"/><name val="맑은 고딕"/></font></fonts>
<fills count="5"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFEFEF"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFDDF2C4"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFF2A8"/><bgColor indexed="64"/></patternFill></fill></fills>
<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>
<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
<cellXfs count="17">
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="3" fontId="1" fillId="2" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="3" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="3" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="4" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
<xf numFmtId="0" fontId="4" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center"/></xf>
<xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
<xf numFmtId="3" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
</cellXfs>
<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;
  /* sheet: {name, cols:[너비…], rows:[{h:높이, cells:[값 또는 {v, s} …]}], merges:['A1:H1',…]} */
  function sheetXML(sh){
    let x=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">`;
    x+=`<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>`;
    x+=`<sheetViews><sheetView workbookViewId="0" showGridLines="${sh.grid===false?'0':'1'}"/></sheetViews><sheetFormatPr defaultRowHeight="16"/>`;
    if(sh.cols&&sh.cols.length) x+='<cols>'+sh.cols.map((w,i)=>w?`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`:'').join('')+'</cols>';
    x+='<sheetData>';
    (sh.rows||[]).forEach((row,ri)=>{
      if(!row){return;}
      const cells=row.cells||row;
      x+=`<row r="${ri+1}"${row.h?` ht="${row.h}" customHeight="1"`:''}>`;
      (cells||[]).forEach((c,ci)=>{
        if(c==null||c==='') return;
        const ref=colL(ci)+(ri+1);
        const o=(typeof c==='object'&&c!==null&&'v' in c)?c:{v:c};
        if(o.v==null||o.v==='') { if(o.s!=null) x+=`<c r="${ref}" s="${o.s}"/>`; return; }
        if(typeof o.v==='number'&&isFinite(o.v)) x+=`<c r="${ref}"${o.s!=null?` s="${o.s}"`:''}><v>${o.v}</v></c>`;
        else x+=`<c r="${ref}"${o.s!=null?` s="${o.s}"`:''} t="inlineStr"><is><t xml:space="preserve">${X(o.v)}</t></is></c>`;
      });
      x+='</row>';
    });
    x+='</sheetData>';
    if(sh.merges&&sh.merges.length) x+=`<mergeCells count="${sh.merges.length}">`+sh.merges.map(m=>`<mergeCell ref="${m}"/>`).join('')+'</mergeCells>';
    x+='<pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>';
    x+=`<pageSetup paperSize="9" orientation="${sh.landscape?'landscape':'portrait'}" fitToWidth="1" fitToHeight="0"/>`;
    x+='</worksheet>'; return x;
  }
  const safeName=s=>String(s||'Sheet').replace(/[\\\/\?\*\[\]:]/g,' ').slice(0,31)||'Sheet';
  function workbook(sheets){
    const files=[];
    files.push({name:'[Content_Types].xml',text:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((s,i)=>`<Override PartName="/xl/worksheets/sheet${i+1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`});
    files.push({name:'_rels/.rels',text:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`});
    files.push({name:'xl/workbook.xml',text:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map((s,i)=>`<sheet name="${X(safeName(s.name))}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join('')}</sheets></workbook>`});
    files.push({name:'xl/_rels/workbook.xml.rels',text:`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((s,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`});
    files.push({name:'xl/styles.xml',text:STYLES});
    sheets.forEach((s,i)=>files.push({name:`xl/worksheets/sheet${i+1}.xml`,text:sheetXML(s)}));
    return zip(files);
  }
  function download(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);}
  return {workbook,download,colL};
})();

/* ---------- 급여대장 엑셀 ---------- */
const S={ctr:1,left:2,num:3,head:4,title:5,ctrB:6,numB:7,small:8,text:9,numPlain:10,ctrPlain:11,green:12,yellow:13,bold:14,grayCtr:15,numBold:16};
const DOWK=['일','월','화','수','목','금','토'];
function payrollWorkbook(p,ym){
  const [y,m]=ym.split('-').map(Number), ws=activeWorkers(p,ym), calcs=ws.map(w=>({w,c:calcWorker(p,w,ym)}));
  const title=`${p.alias||p.full} 기간제 근로자 보수`, period=`${y}.${pad2(m)}.01. ~ ${y}.${pad2(m)}.${pad2(daysInMonth(y,m))}.`;
  const sheets=[];
  /* 청구서 */
  { const rows=[]; rows[0]={h:34,cells:[{v:'청   구  (영수)  서',s:S.title}]}; rows[2]={cells:[{v:'□ 사업명   : ',s:S.text},'',{v:title,s:S.bold}]}; rows[3]={cells:[{v:`${y}년 ${m}월`,s:S.text}]};
    rows[5]={h:30,cells:['연번','성 명','청구(영수)\n금액(원)','금융기관','계좌번호','청구(영수)자(인)','비고\n(근무지)'].map(v=>({v,s:S.head}))};
    calcs.forEach((x,i)=>{rows[6+i]={h:26,cells:[{v:i+1,s:S.ctr},{v:x.w.name,s:S.ctr},{v:x.c.net,s:S.num},{v:x.w.bank,s:S.ctr},{v:x.w.account,s:S.ctr},{v:'(인)',s:S.ctr},{v:x.w.site,s:S.ctr}]};});
    rows[6+calcs.length]={h:26,cells:[{v:'',s:S.ctrB},{v:'합계',s:S.ctrB},{v:calcs.reduce((s,x)=>s+x.c.net,0),s:S.numB},{v:'',s:S.ctrB},{v:'',s:S.ctrB},{v:'',s:S.ctrB},{v:'',s:S.ctrB}]};
    sheets.push({name:'청구서',cols:[6,10,14,10,16,14,10],rows,merges:['A1:G1','C3:G3','A4:G4']}); }
  /* 보수지급명세서 */
  { const H=['번호','성 명','계약체결일\n(최초근무일)','근무일','기본급','기타수당\n(연차수당)','주휴수당','초과근무','총급여','건강보험료','국민연금','고용보험료','근로소득세','지방소득세','식  비','공제액계','실지급액\n①','금융기관','계좌번호','비고'];
    const rows=[]; rows[0]={h:34,cells:['',{v:`${y}년 ${pad2(m)}월 보수지급명세서`,s:S.title}]}; rows[2]={cells:['',{v:'지급기준 :',s:S.text},{v:' '+period,s:S.text}]};
    rows[4]={h:34,cells:H.map(v=>({v,s:S.head}))};
    const tot={d:0,base:0,ann:0,wk:0,ot:0,gross:0,h:0,p:0,e:0,t:0,l:0,meal:0,ded:0,net:0};
    calcs.forEach((x,i)=>{const c=x.c, basePlus=c.base+c.holPay;
      rows[5+i]={h:26,cells:[{v:i+1,s:S.ctr},{v:x.w.name,s:S.ctr},{v:x.w.hired?x.w.hired.replace(/-/g,'.')+'.':'',s:S.ctr},{v:c.workDays,s:S.num},{v:basePlus,s:S.num},{v:c.leavePay,s:S.num},{v:c.weeklyPay,s:S.num},{v:c.otPay,s:S.num},{v:c.gross,s:S.num},{v:c.health,s:S.num},{v:c.pension,s:S.num},{v:c.emp,s:S.num},{v:c.tax,s:S.num},{v:c.local,s:S.num},{v:c.meal,s:S.num},{v:c.ded,s:S.num},{v:c.net,s:S.num},{v:x.w.bank,s:S.ctr},{v:x.w.account,s:S.ctr},{v:x.w.site,s:S.ctr}]};
      tot.d+=c.workDays;tot.base+=basePlus;tot.ann+=c.leavePay;tot.wk+=c.weeklyPay;tot.ot+=c.otPay;tot.gross+=c.gross;tot.h+=c.health;tot.p+=c.pension;tot.e+=c.emp;tot.t+=c.tax;tot.l+=c.local;tot.meal+=c.meal;tot.ded+=c.ded;tot.net+=c.net;});
    rows[5+calcs.length]={h:26,cells:[{v:'',s:S.ctrB},{v:'계',s:S.ctrB},{v:`${calcs.length}명`,s:S.ctrB},{v:tot.d,s:S.numB},{v:tot.base,s:S.numB},{v:tot.ann,s:S.numB},{v:tot.wk,s:S.numB},{v:tot.ot,s:S.numB},{v:tot.gross,s:S.numB},{v:tot.h,s:S.numB},{v:tot.p,s:S.numB},{v:tot.e,s:S.numB},{v:tot.t,s:S.numB},{v:tot.l,s:S.numB},{v:tot.meal,s:S.numB},{v:tot.ded,s:S.numB},{v:tot.net,s:S.numB},{v:'',s:S.ctrB},{v:'',s:S.ctrB},{v:'',s:S.ctrB}]};
    rows[7+calcs.length]={cells:['',{v:'※ 기본급 = 근로일 × 일금 + 유급휴가(공휴일·공가·유급병가) × 일금 · 기타수당 = 연차 × 일금 · 주휴수당 = 주휴일 × 일금 · 초과근무 = 시급 × 150% × 시간 · 총급여·실지급액은 10원 단위 올림',s:S.text}]};
    sheets.push({name:'보수지급명세서',cols:[5,9,12,7,11,11,11,10,11,11,11,10,11,10,9,11,12,9,18,10],rows,merges:[`B1:${XL.colL(H.length-1)}1`],landscape:true}); }
  /* 급여명세서 — 사람마다 한 장 */
  calcs.forEach(x=>{const c=x.c, rows=[];
    rows[2]={h:30,cells:['',{v:'급여 명세서',s:S.title}]}; rows[3]={cells:['',{v:`${y}년 ${m}월`,s:S.ctrPlain}]};
    rows[5]={cells:['',{v:'성명 :',s:S.text},{v:x.w.name,s:S.bold}]}; rows[7]={cells:['',{v:'지급기간   : ',s:S.text},{v:period,s:S.text}]};
    rows[11]={h:24,cells:['',{v:'실수령액 :',s:S.bold},{v:c.net,s:S.numBold}]};
    rows[13]={h:22,cells:['',{v:'급 여 지 급   상 세 내 역',s:S.head},{v:'',s:S.head},{v:'',s:S.head},{v:'',s:S.head},{v:'',s:S.head}]};
    const L=[['기본급',c.base+c.holPay,'건강보험료',c.health],['주휴수당',c.weeklyPay,'국민연금',c.pension],['연차수당',c.leavePay,'고용보험료',c.emp],['초과근무',c.otPay,'근로소득세',c.tax],['','','지방소득세',c.local],['','','식   비',c.meal]];
    L.forEach((r,i)=>{rows[14+i]={h:20,cells:['',{v:r[0],s:S.ctr},{v:r[1]===''?'':r[1],s:S.num},'',{v:r[2],s:S.ctr},{v:r[3],s:S.num}]};});
    rows[21]={h:20,cells:['',{v:'',s:S.ctr},{v:'',s:S.num},'',{v:'공제합계',s:S.ctrB},{v:c.ded,s:S.numB}]};
    rows[22]={h:22,cells:['',{v:'보수합계',s:S.ctrB},{v:c.gross,s:S.numB},'',{v:'실수령액',s:S.ctrB},{v:c.net,s:S.numB}]};
    sheets.push({name:`급여명세서_${x.w.name}`,cols:[3,14,16,3,14,16],rows,merges:['B3:F3','B4:F4','B14:F14'],grid:false});
  });
  /* 근무내역 — 사람마다 한 장 */
  calcs.forEach(x=>{const c=x.c, w=x.w, wm=c.wm, n=c.n, rows=[];
    rows[0]={h:28,cells:[{v:title,s:S.bold}]}; rows[1]={cells:[{v:'□ 사업명 :',s:S.text},'',{v:title,s:S.text}]}; rows[2]={cells:[{v:'□ 기간 :',s:S.text},{v:period,s:S.text}]}; rows[3]={cells:[{v:'□ 근무내역',s:S.text}]};
    rows[4]={cells:[{v:'근무자',s:S.grayCtr},{v:w.name,s:S.ctrB},'','','','','','','','','',{v:'근무월',s:S.grayCtr},'','',{v:`${y}년 ${m}월`,s:S.ctrB}]};
    const dayCells=(fn,style)=>{const cells=[]; for(let d=1;d<=31;d++) cells.push(d<=n?{v:fn(d),s:style?style(d):S.ctr}:{v:'',s:S.ctr}); return cells;};
    rows[5]={h:18,cells:[{v:'일자',s:S.head},...dayCells(d=>d,()=>S.head),{v:'계',s:S.head},{v:'금액',s:S.head}]};
    rows[6]={h:18,cells:[{v:'요일',s:S.head},...dayCells(d=>DOWK[new Date(y,m-1,d).getDay()],()=>S.head),{v:'',s:S.head},{v:'',s:S.head}]};
    const stName=d=>{const st=wm.days[d]||'none', date=ymd(y,m,d); if(w.hired===date) return '채용'; if(w.quit===date) return '퇴직'; return st==='holiday'?'공휴일':st==='leave'?'연가':st==='official'?'공가':st==='sickpaid'?'유급병가':st==='sick'?'무급병가':st==='absent'?'결근':'';};
    rows[7]={h:30,cells:[{v:'비고',s:S.head},...dayCells(d=>stName(d),d=>S.small),{v:'',s:S.ctr},{v:'',s:S.ctr}]};
    rows[8]={h:22,cells:[{v:'근로일\n(기본급)ⓐ',s:S.head},...dayCells(d=>{const st=wm.days[d]||'none'; if(st==='work') return hoursOf(wm,d); if(new Date(y,m-1,d).getDay()===0&&st!=='none') return weeklyPaid(p,w,wm,y,m,d)?'주휴':''; return st==='holiday'||st==='leave'||st==='official'||st==='sickpaid'?0:'';},d=>{const st=wm.days[d]; return st==='holiday'||st==='official'||st==='sickpaid'?S.green:st==='leave'?S.yellow:S.ctr;}),{v:c.workDays,s:S.numB},{v:c.base,s:S.numB}]};
    rows[9]={h:20,cells:[{v:'초과시간',s:S.head},...dayCells(d=>+wm.ot[d]||''),{v:c.otH,s:S.numB},{v:c.otPay,s:S.numB}]};
    /* 계산식 줄 — 날짜 칸이 좁아서 여러 칸을 합쳐 씁니다 (B:C 이름, D:F 금액, G ×, H:I 일수, J =, K:M 결과, N 원) */
    const frow=(label,tag,amount,cnt,unit,result)=>[{v:label,s:S.head},{v:tag,s:S.ctr},{v:'',s:S.ctr},{v:amount,s:S.num},{v:'',s:S.num},{v:'',s:S.num},{v:'원 ×',s:S.ctr},{v:cnt,s:S.num},{v:'',s:S.num},{v:unit+' =',s:S.ctr},{v:result,s:S.num},{v:'',s:S.num},{v:'',s:S.num},{v:'원',s:S.ctr}];
    rows[10]={h:20,cells:[...frow('주휴일\n(주휴수당)ⓒ','주간',c.daily,c.weekly,'일',c.weeklyPay),'',{v:'초과',s:S.ctr},{v:'',s:S.ctr},{v:Math.round(c.hourly*1.5),s:S.num},{v:'',s:S.num},{v:'',s:S.num},{v:'원 ×',s:S.ctr},{v:c.otH,s:S.num},{v:'',s:S.num},{v:'시간 =',s:S.ctr},{v:c.otPay,s:S.num},{v:'',s:S.num},{v:'',s:S.num},{v:'원',s:S.ctr}]};
    rows[11]={h:20,cells:frow('유급휴가\n(공휴일·공가·유급병가)','유급',c.daily,c.hol,'일',c.holPay)};
    rows[12]={h:20,cells:frow('연차수당','연차',c.daily,c.leave,'일',c.leavePay)};
    rows[13]={h:22,cells:[{v:'총급여\nⓐ+ⓑ+ⓒ',s:S.head},{v:c.gross,s:S.numB},{v:'',s:S.numB},{v:'',s:S.numB},{v:'',s:S.numB}]};
    rows[15]={cells:[{v:'※ 산출근거',s:S.bold},'','','','','','','','','','','','','',{v:'근무자',s:S.text},'',{v:w.name,s:S.text},'',{v:'(인)',s:S.text},'','','','','',{v:'확인자',s:S.text},'',{v:'',s:S.text},'',{v:'(인)',s:S.text}]};
    rows[16]={cells:[{v:`ⓐ기본급 = 근로일 × 일금(${won(c.daily)}원)`,s:S.text}]}; rows[17]={cells:[{v:'ⓑ초과근무 = 시급 × 150%',s:S.text}]}; rows[18]={cells:[{v:'ⓒ주휴수당 = 주휴일 × 일금 · 유급휴가(공휴일·공가·유급병가)·연차수당도 일금 기준',s:S.text}]};
    rows[19]={cells:[{v:'※ 연두색 = 공휴일·공가·유급병가(유급휴가) · 노란색 = 연가(연차수당) · 무급병가·결근은 무급',s:S.text}]};
    const cols=[13]; for(let i=0;i<31;i++) cols.push(4.2); cols.push(6,11);
    const fm=r=>[`B${r}:C${r}`,`D${r}:F${r}`,`H${r}:I${r}`,`K${r}:M${r}`];
    sheets.push({name:w.name||'근무자',cols,rows,merges:['A1:AH1','C2:L2','B3:L3','B5:K5','O5:R5','B14:E14',...fm(11),...fm(12),...fm(13),'P11:Q11','R11:T11','V11:W11','Y11:AA11'],landscape:true});
  });
  return {blob:XL.workbook(sheets),name:`급여대장_${p.alias||'직접사업'}_${y}-${pad2(m)}.xlsx`};
}
/* ---------- 4대보험 산출내역 엑셀 ---------- */
function insuranceWorkbook(p,ym){
  const [y,m]=ym.split('-').map(Number), ws=activeWorkers(p,ym), calcs=ws.map(w=>({w,c:calcWorker(p,w,ym)}));
  const rows=[]; rows[0]={h:34,cells:[{v:`4대보험료 산출내역(${m}월분)`,s:S.title}]};
  rows[1]={h:22,cells:[{v:'성명',s:S.head},{v:'생년월일',s:S.head},{v:'국민건강보험료',s:S.head},{v:'',s:S.head},{v:'국민연금보험료',s:S.head},{v:'',s:S.head},{v:'고용보험료',s:S.head},{v:'',s:S.head},{v:'',s:S.head},{v:'산재보험료',s:S.head},{v:'비  고',s:S.head}]};
  rows[2]={h:34,cells:[{v:'',s:S.head},{v:'',s:S.head},{v:'개인부담금',s:S.head},{v:'기관부담금',s:S.head},{v:'개인부담금',s:S.head},{v:'기관부담금',s:S.head},{v:'개인부담금',s:S.head},{v:'기관부담금\n(고용보험)',s:S.head},{v:'기관부담금\n(고안직능)',s:S.head},{v:'기관부담금',s:S.head},{v:'',s:S.head}]};
  const T={h:0,oh:0,p:0,op:0,e:0,oe:0,ed:0,acc:0};
  calcs.forEach(x=>{const c=x.c; T.h+=c.health;T.oh+=c.org.health;T.p+=c.pension;T.op+=c.org.pension;T.e+=c.emp;T.oe+=c.org.emp;T.ed+=c.org.empDev;T.acc+=c.org.acc;});
  rows[3]={h:22,cells:[{v:'합 계',s:S.ctrB},{v:'',s:S.ctr},{v:T.h,s:S.numB},{v:T.oh,s:S.numB},{v:T.p,s:S.numB},{v:T.op,s:S.numB},{v:T.e,s:S.numB},{v:T.oe,s:S.numB},{v:T.ed,s:S.numB},{v:T.acc,s:S.numB},{v:'',s:S.ctr}]};
  calcs.forEach((x,i)=>{const c=x.c; rows[4+i]={h:22,cells:[{v:x.w.name,s:S.ctr},{v:x.w.birth||'',s:S.ctr},{v:c.health,s:S.num},{v:c.org.health,s:S.num},{v:c.pension,s:S.num},{v:c.org.pension,s:S.num},{v:c.emp,s:S.num},{v:c.org.emp,s:S.num},{v:c.org.empDev,s:S.num},{v:c.org.acc,s:S.num},{v:x.w.memo||'',s:S.ctr}]};});
  const r0=5+calcs.length, person=T.h+T.p+T.e, org=T.oh+T.op+T.oe+T.ed+T.acc;
  rows[r0]={h:20,cells:[{v:'개인부담금',s:S.grayCtr},'',{v:person,s:S.num},'',{v:'건강보험',s:S.grayCtr},{v:T.h+T.oh,s:S.num}]};
  rows[r0+1]={h:20,cells:[{v:'기관부담금',s:S.grayCtr},'',{v:org,s:S.num},'',{v:'국민연금',s:S.grayCtr},{v:T.p+T.op,s:S.num}]};
  rows[r0+2]={h:20,cells:[{v:'합  계',s:S.ctrB},'',{v:person+org,s:S.numB},'',{v:'고용보험',s:S.grayCtr},{v:T.e+T.oe+T.ed,s:S.num}]};
  rows[r0+3]={h:20,cells:['','','','',{v:'산재보험',s:S.grayCtr},{v:T.acc,s:S.num}]};
  rows[r0+4]={h:20,cells:['','','','',{v:'전체합계',s:S.ctrB},{v:person+org,s:S.numB}]};
  const R=ratesFor(y);
  rows[r0+6]={cells:[{v:`※ 요율(${y}): 건강 ${(R.health*100).toFixed(3)}% + 장기요양 ${(R.care*100).toFixed(2)}%(건강보험료의) · 국민연금 ${(R.pension*100).toFixed(2)}% · 고용 ${(R.emp*100).toFixed(2)}% · 고안직능(기관) ${(R.empDev*100).toFixed(2)}% · 산재(기관) ${(R.accident*100).toFixed(3)}% — 기준소득월액 기준, 10원 단위 내림. 고지서와 다르면 고지서를 따르세요.`,s:S.text}]};
  return {blob:XL.workbook([{name:'4대보험',cols:[10,12,12,12,12,12,12,12,12,12,10],rows,merges:['A1:K1','A2:A3','B2:B3','C2:D2','E2:F2','G2:I2','J2:J3','K2:K3'],landscape:true}]),name:`4대보험료_산출내역_${p.alias||'직접사업'}_${y}-${pad2(m)}.xlsx`};
}

/* 급여대장 내려받기 — 유진 양식(payxl.js + paytpl.xlsx)으로, 못 읽으면 예전 모양으로 */
async function downloadPayroll(p,ym){
  if(window.PAYXL){
    try{ const r=await PAYXL.build(payData(p,ym)); XL.download(r.blob,r.name); return; }
    catch(err){ console.warn('양식 급여대장 실패, 기본 모양으로',err); alert('양식 파일(paytpl.xlsx)로 만들지 못해 기본 모양으로 내려받습니다: '+(err.message||err)); }
  }
  const r=payrollWorkbook(p,ym); XL.download(r.blob,r.name);
}
/* 양식에 채울 자료 — 계좌번호는 여기서만 잠깐 풀어 씁니다 */
function payData(p,ym){
  const [y,m]=ym.split('-').map(Number), n=daysInMonth(y,m), ws=activeWorkers(p,ym), me=(typeof ME!=='undefined'&&ME&&ME.name)||'';
  const mm=pad2(m), nn=pad2(n);
  const workers=ws.map(w=>{const c=calcWorker(p,w,ym); const days=[]; for(let d=1;d<=31;d++){ const x=c.days[d-1]; if(!x){days.push(null);continue;}
      const date=ymd(y,m,d); let note=''; if(w.hired===date) note='채용'; else if(w.quit===date) note='퇴직'; else note=({holiday:'공휴일',official:'공가',leave:'연차',sickpaid:'유급병가',sick:'무급병가',absent:'결근'})[x.st]||(x.partial?'연차':'');
      days.push({dow:x.dow,st:x.st,hours:x.hours,weekly:x.weekly,ot:x.ot||'',note,partial:x.partial}); }
    return {name:w.name,hired:(w.hired||'').replace(/-/g,'.'),bank:w.bank||'',account:w.account||'',site:w.site||'',memo:w.memo||'',daily:c.daily,hourly15:Math.round(c.hourly*1.5),
      workDays:c.workDays,base:c.base,basePlus:c.base+c.holPay,hol:c.hol,holPay:c.holPay,leave:c.leave,leaveFull:c.leaveFull,leaveH:c.leaveH,leaveText:c.leave?dayText(c.leave):'',leavePay:c.leavePay,weekly:c.weekly,weeklyPay:c.weeklyPay,otH:c.otH,otPay:c.otPay,
      total:c.total,gross:c.gross,health:c.health,pension:c.pension,emp:c.emp,tax:c.tax,local:c.local,meal:c.meal,ded:c.ded,net:c.net,days};});
  return {title:p.payTitle||`${p.alias||p.full} 기간제 근로자 보수`,ymLabel:`${y}년 ${m}월`,period1:` ${y}.${mm}.01. ~ ${y}.${mm}.${nn}.`,period2:`${y}.${mm}.01.  ~   ${y}.${mm}.${nn}.`,y,m,n,
    checker:p.payChecker||me,footer:p.payFooter||(me?`지방농촌지도사 ${me}`:''),workers,fileName:`급여대장_${p.alias||'직접사업'}_${y}-${mm}.xlsx`};
}
/* ================= 화면 ================= */
const $=(s,r)=>(r||document).querySelector(s), $$=(s,r)=>[...(r||document).querySelectorAll(s)];
const D={year:null,proj:null,ym:(()=>{const d=new Date();return `${d.getFullYear()}-${pad2(d.getMonth()+1)}`;})(),editId:null,filt:{tong:'',kind:'',q:'',month:'',gubun:''},wedit:null,eedit:null,cfgOpen:false,panel:null,sfilt:{tag:'',q:''},tagEdit:false,gopen:false};
const fmtDate=s=>s?String(s).replace(/-/g,'.'):'';
function yearBtns(sel,onAttr){const ys=projYears(); if(!ys.length) return ''; return `<span class="yearBtns">${ys.map(y=>`<button class="btn sm ${y===sel?'primary':''}" data-${onAttr}="${y}">${y}년</button>`).join('')}</span>`;}
function curYear(){const ys=projYears(); if(D.year==null||!ys.includes(D.year)) D.year=ys[0]||new Date().getFullYear(); return D.year;}
function projsOfYear(){const y=curYear(); return DS.projects.filter(p=>p.year===y);}
function curProj(){const ps=projsOfYear(); let p=ps.find(x=>x.id===D.proj); if(!p){p=ps[0]||null; D.proj=p?p.id:null;} return p;}
function projChips(p){const ps=projsOfYear(); return ps.length?`<div class="tabs2" style="margin-bottom:12px">${ps.map(x=>`<button data-dproj="${x.id}" class="${p&&x.id===p.id?'on':''}">${esc(x.alias||x.full)}</button>`).join('')}</div>`:'';}
const moneyK=n=>(n===''||n==null)?'—':won(n)+'천원';
function fundHTML(p){const g=+p.gukbi||0,d=+p.dobi||0,s=+p.sibi||0,t=g+d+s; return `총 <b>${won(t)}</b>천원 <span class="faint">(국비 ${won(g)} · 도비 ${won(d)} · 시비 ${won(s)})</span>`;}

/* ---------- 사업 요약 ---------- */
function drawSum(){
  const pg=$('#page-dsum'), y=curYear(), ps=projsOfYear();
  pg.innerHTML=`<div class="card"><h2>직접 사업 <span class="pill done">${y}년</span></h2>
    <div class="desc">우리가 직접 집행하는 돈(일상경비). 사업마다 재원·예산 과목·통계목별 예산과 기억할 사항을 적어 두고, 가계부에서 지출을 맞춰 봅니다.</div>
    <div class="row">${yearBtns(y,'dyear')}<span style="margin-left:auto" class="row"><button class="btn sm primary" id="d-new">+ 직접 사업 등록</button></span></div></div>
    ${ps.length?ps.map(p=>{const tongs=tongsOf(p); const spentAll=p.entries.reduce((s,e)=>s+(+e.resAmt||(e.resDate?+e.amt:0)||0),0), budAll=p.budgets.reduce((s,b)=>s+(+b.amt||0),0)*1000;
      return `<div class="card dproj" data-pid="${p.id}"><h2>${esc(p.alias||p.full)} <span class="faint" style="font-weight:400;font-size:13px">${esc(p.full)}</span>
        <span class="row" style="margin-left:auto"><button class="btn sm" data-dgo="dledger" data-pid="${p.id}">가계부</button><button class="btn sm" data-dgo="dpay" data-pid="${p.id}">월급 계산기</button><button class="btn sm ghost" data-dedit="${p.id}">✎ 고치기</button><button class="btn sm ghost" data-ddel="${p.id}" style="color:var(--bad)">삭제</button></span></h2>
        <dl class="kv" style="margin-top:8px">
          <dt>재원</dt><dd>${fundHTML(p)}</dd>
          <dt>예산 과목</dt><dd>${[p.jeongchaek,p.danwi,p.sebu,p.pyeonseong].filter(x=>x&&x.trim()).map(esc).join(' › ')||'<span class="faint">안 넣음</span>'}${p.sebu?`<div class="faint">원자료(지방재정) 세부사업명: ${esc(p.sebu)}</div>`:''}</dd>
          <dt>기간</dt><dd>${p.start||'—'} ~ ${p.end||'—'} <span class="faint">(${p.year}년)</span></dd>
          <dt>통계목별 예산</dt><dd>${tongs.length?`<table class="dtab"><thead><tr><th>통계목</th><th class="num">예산(천원)</th><th class="num">집행(결의, 원)</th><th class="num">잔액(원)</th></tr></thead><tbody>${tongs.map(t=>{const b=budgetOf(p,t), sp=spentOf(p,t); return `<tr><td>${esc(t)}${p.budgets.filter(x=>x.tong===t).map(x=>`<div class="faint">· ${esc(x.name||'(항목)')} ${won(x.amt)}천원</div>`).join('')}</td><td class="num">${won(b/1000)}</td><td class="num">${won(sp)}</td><td class="num ${b-sp<0?'over':''}">${won(b-sp)}</td></tr>`;}).join('')}<tr><td><b>계</b></td><td class="num"><b>${won(budAll/1000)}</b></td><td class="num"><b>${won(spentAll)}</b></td><td class="num"><b>${won(budAll-spentAll)}</b></td></tr></tbody></table>`:'<span class="faint">아직 없음 — 고치기에서 통계목별 예산을 넣으세요</span>'}</dd>
          <dt>비고 (기억할 사항)</dt><dd>${p.note?esc(p.note).replace(/\n/g,'<br>'):'<span class="faint">—</span>'}</dd>
          <dt>같은 이름</dt><dd>${esc(p.sameName)||'<span class="faint">—</span>'}</dd>
          <dt>주의사항</dt><dd>${p.caution?`<span style="color:var(--bad);font-weight:600">${esc(p.caution)}</span>`:'<span class="faint">—</span>'}</dd>
          <dt>가계부·현황</dt><dd>지출 <b>${p.entries.length}</b>건 · 현황 <b>${p.cases.length}</b>건(끝난 것 <b>${p.cases.filter(c=>{const t=tagOf(c.tag);return t&&t.end;}).length}</b>) · 근로자 <b>${p.workers.length}</b>명</dd>
        </dl></div>`;}).join('')
      :`<div class="card"><div class="empty">${y}년 직접 사업이 없습니다. [+ 직접 사업 등록]으로 넣거나, 가계부에서 지방재정 엑셀을 올리면 세부사업명대로 저절로 생깁니다.</div></div>`}`;
  $('#d-new').onclick=()=>{D.editId=null; showPage('dnew');};
  pg.onclick=e=>{const t=e.target;
    const yb=t.closest('[data-dyear]'); if(yb){D.year=+yb.dataset.dyear; drawSum(); return;}
    const go=t.closest('[data-dgo]'); if(go){D.proj=+go.dataset.pid; showPage(go.dataset.dgo); return;}
    const ed=t.closest('[data-dedit]'); if(ed){D.editId=+ed.dataset.dedit; showPage('dnew'); return;}
    const dl=t.closest('[data-ddel]'); if(dl){const p=byId(+dl.dataset.ddel); if(!p) return;
      if(!confirm(`"${p.alias||p.full}" 직접 사업을 지웁니다.\n가계부 ${p.entries.length}건·근로자 ${p.workers.length}명·월급 기록·서류 체크·스캔이 같이 사라집니다. 되돌릴 수 없습니다.`)) return;
      DS.projects=DS.projects.filter(x=>x!==p); FILES.filter(f=>f.ref&&f.ref.kind==='ddoc'&&f.ref.d===p.id).forEach(f=>removeFile(f)); drawSum(); return;}
  };
}
/* ---------- 등록 · 고치기 ---------- */
let NEWD=null;
function drawNew(){
  const pg=$('#page-dnew'), editing=D.editId?byId(D.editId):null;
  if(!NEWD||NEWD._for!==(editing?editing.id:0)){ NEWD=editing?JSON.parse(JSON.stringify({...editing,entries:[],workers:[],months:{}})):mkDProject({year:curYear()}); NEWD._for=editing?editing.id:0; if(!NEWD.budgets.length) NEWD.budgets.push({id:nid(),tong:'사무관리비',name:'',amt:''}); }
  const N=NEWD;
  const f=(k,label,ph,extra)=>`<div class="f ${extra||''}"><span>${label}</span><input data-nf="${k}" value="${esc(N[k])}" placeholder="${esc(ph||'')}"></div>`;
  pg.innerHTML=`<div class="card"><h2>${editing?`직접 사업 고치기 <span class="pill grey">${esc(editing.alias)}</span>`:'직접 사업 등록'}</h2><div class="desc">재원은 천원 단위. 세부사업명은 지방재정에서 내려받은 엑셀의 '세부사업' 글자와 같아야 가계부에 저절로 들어갑니다.</div>
    <div class="frow">
      ${f('alias','별칭','예: 검정실 운영')}
      <div class="f" style="grid-column:1/-1"><span>정식 사업명</span><input data-nf="full" value="${esc(N.full)}" placeholder="예: 친환경종합검정실(농산물안전성분석실) 운영"></div>
      <div class="f" style="grid-column:1/-1"><span>세부사업명 (지방재정 원자료와 맞추는 이름)</span><input data-nf="sebu" value="${esc(N.sebu)}" placeholder="비우면 정식 사업명으로 맞춥니다"></div>
      <div class="f"><span>연도</span><input type="number" data-nf="year" value="${N.year}"></div>
      <div class="f"><span>사업 시작</span><input type="date" min="1900-01-01" max="2099-12-31" data-nf="start" value="${N.start}"></div>
      <div class="f"><span>사업 종료</span><input type="date" min="1900-01-01" max="2099-12-31" data-nf="end" value="${N.end}"></div>
    </div></div>
    <div class="card"><h2>예산 과목</h2><div class="frow">${f('jeongchaek','정책사업','예: 고품질 농산물 생산 기술보급')}${f('danwi','단위사업','예: 과학영농기술 지원')}${f('pyeonseong','편성목','예: 201 일반운영비')}</div></div>
    <div class="card"><h2>재원 <span class="faint" style="font-weight:400">천원 단위</span></h2><div class="frow">
      <div class="f money"><span>국비 (천원)</span><input type="number" data-nf="gukbi" value="${N.gukbi}" placeholder="0"></div>
      <div class="f money"><span>도비 (천원)</span><input type="number" data-nf="dobi" value="${N.dobi}" placeholder="0"></div>
      <div class="f money"><span>시비 (천원)</span><input type="number" data-nf="sibi" value="${N.sibi}" placeholder="0"></div>
    </div><div class="sum" id="dn-sum"></div></div>
    <div class="card"><h2>통계목별 예산 (세부 산출근거) <span class="faint" style="font-weight:400">천원 단위 · 가계부 잔액의 기준</span></h2>
      <table class="dtab" id="dn-bud"><thead><tr><th style="width:190px">통계목</th><th>항목 (산출근거)</th><th style="width:130px" class="num">금액 (천원)</th><th style="width:40px"></th></tr></thead><tbody>${N.budgets.map(b=>`<tr data-bid="${b.id}"><td><select data-bf="tong">${TONGS.map(t=>`<option ${b.tong===t?'selected':''}>${t}</option>`).join('')}</select></td><td><input data-bf="name" value="${esc(b.name)}" placeholder="예: 2명 10개월, 90,080원"></td><td><input class="num" data-bf="amt" value="${esc(b.amt)}" inputmode="numeric"></td><td><button type="button" class="btn sm ghost" data-bdel="${b.id}" style="color:var(--bad)">×</button></td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:8px"><button class="btn sm" id="dn-badd">+ 줄 추가</button><span class="hint">같은 통계목 줄이 여럿이면 합쳐서 그 통계목 예산이 됩니다.</span></div></div>
    <div class="card"><h2>기억할 사항</h2><div class="frow">
      <div class="f wide" style="grid-column:1/-1"><span>비고 (기억할 사항)</span><textarea data-nf="note" placeholder="예: 4대보험 기관부담금은 매달 초에 올리기. 폐기물 위탁은 3월에 연간 계약.">${esc(N.note)}</textarea></div>
      ${f('sameName','같은 이름 (헷갈리는 다른 사업)','예: 종합검정실 운영')}
      ${f('caution','주의사항','예: 축산·꽃가루 은행과 같이 있음. 항상 주의!!!')}
    </div></div>
    <div class="row" style="margin-top:4px"><button class="btn primary" id="dn-save">${editing?'저장':'등록'}</button><button class="btn" id="dn-cancel">취소</button></div>`;
  const paintSum=()=>{const g=+N.gukbi||0,d=+N.dobi||0,s=+N.sibi||0,t=g+d+s; $('#dn-sum').innerHTML=t?`<span>총 사업비 <b>${won(t)}</b>천원</span><span class="faint">국비 ${t?Math.round(g/t*100):0} : 도비 ${t?Math.round(d/t*100):0} : 시비 ${t?Math.round(s/t*100):0}</span>`:'<span class="faint">재원을 넣으면 합계가 나옵니다.</span>';};
  paintSum();
  pg.oninput=e=>{const el=e.target; if(el.dataset.nf){N[el.dataset.nf]=el.type==='number'?num(el.value):el.value; if(['gukbi','dobi','sibi'].includes(el.dataset.nf)) paintSum();}
    if(el.dataset.bf){const b=N.budgets.find(x=>x.id===+el.closest('tr').dataset.bid); if(b) b[el.dataset.bf]=el.dataset.bf==='amt'?num(el.value):el.value;}};
  pg.onchange=pg.oninput;
  pg.onclick=e=>{const t=e.target;
    if(t.id==='dn-badd'){N.budgets.push({id:nid(),tong:N.budgets.length?N.budgets[N.budgets.length-1].tong:'사무관리비',name:'',amt:''}); drawNew(); return;}
    const bd=t.closest('[data-bdel]'); if(bd){N.budgets=N.budgets.filter(x=>x.id!==+bd.dataset.bdel); drawNew(); return;}
    if(t.id==='dn-cancel'){NEWD=null; showPage('dsum'); return;}
    if(t.id==='dn-save'){
      if(!String(N.alias).trim()&&!String(N.full).trim()){alert('별칭이나 정식 사업명을 넣어 주세요.'); return;}
      const alias=String(N.alias).trim()||String(N.full).trim();
      const dup=DS.projects.find(x=>x.alias===alias&&x.year===+N.year&&(!editing||x!==editing)); if(dup){alert('같은 해에 같은 별칭의 직접 사업이 이미 있습니다.'); return;}
      const vals={alias,full:String(N.full).trim()||alias,sebu:String(N.sebu).trim(),year:+N.year||curYear(),jeongchaek:N.jeongchaek,danwi:N.danwi,pyeonseong:N.pyeonseong,gukbi:N.gukbi,dobi:N.dobi,sibi:N.sibi,start:N.start,end:N.end,note:N.note,sameName:N.sameName,caution:N.caution,budgets:N.budgets.filter(b=>b.tong).map(b=>({id:b.id,tong:b.tong,name:b.name,amt:b.amt}))};
      if(editing){Object.assign(editing,vals); D.proj=editing.id;} else {const p=mkDProject(vals); DS.projects.push(p); D.proj=p.id;}
      D.year=vals.year; NEWD=null; D.editId=null; showPage('dsum'); }
  };
}
/* ---------- 가계부 ---------- */
function drawLedger(){
  const pg=$('#page-dledger'), y=curYear(), p=curProj();
  const head=`<div class="card"><h2>가계부 <span class="pill done">${y}년</span></h2>
    <div class="desc">지방재정(차세대)에서 내려받은 지출 목록 엑셀을 올리면 지출 줄이 저절로 생기고, 통계목별 잔액을 달마다 셉니다. <b>일반지출</b> 목록을 올리면 그 안의 <b>일상경비교부</b> 줄은 아래 '일상경비 교부 현황'에, 나머지(기획과 계약 같은 직접 집행)는 지출 줄에 들어갑니다. 서류 챙기기는 [현황]에서 따로 합니다.</div>
    <div class="row">${yearBtns(y,'dyear')}<span class="row" style="margin-left:auto"><button class="btn sm primary" id="dl-import" title="지방재정 › 지출관리에서 내려받은 목록. 일상경비 목록도, 일반지출 목록(일상경비교부가 들어 있는 것)도 같은 단추로">지방재정 엑셀 올리기 (일상경비·일반지출)</button><button class="btn sm" id="dl-add" ${p?'':'disabled'}>+ 지출 줄 직접 넣기</button></span></div>
    <input type="file" id="dl-file" accept=".xlsx" hidden>${projChips(p)}</div>`;
  if(!p){ pg.innerHTML=head+`<div class="card"><div class="empty">직접 사업이 없습니다. 위의 [지방재정 엑셀 올리기]를 누르면 세부사업명대로 사업이 생기고, 또는 [사업 요약]에서 등록합니다.</div></div>`; bindLedger(pg,null); return; }
  const tongs=tongsOf(p), months=[...Array(12)].map((_,i)=>i+1);
  const noBud=[];
  const budRows=tongs.map(t=>{const b=budgetOf(p,t), sp=spentOf(p,t), pd=pendingOf(p,t), hasBud=p.budgets.some(x=>x.tong===t&&+x.amt); if(!hasBud) noBud.push(t);
    return `<tr><td><b>${esc(t)}</b></td><td class="num">${hasBud?won(b):'<span class="faint">—</span>'}</td><td class="num">${won(sp)}</td><td class="num faint">${won(pd)}</td><td class="num ${hasBud&&b-sp<0?'over':''}"><b>${hasBud?won(b-sp):'<span class="faint">예산 없음</span>'}</b></td>${months.map(m=>{const s=spentOf(p,t,m); const past=m<=(y===new Date().getFullYear()?new Date().getMonth()+1:12); return `<td class="num ${past?'':'faint'} ${hasBud&&b-s<0?'over':''}">${past&&hasBud?won(b-s):''}</td>`;}).join('')}</tr>`;}).join('');
  const budTot=tongs.reduce((s,t)=>s+budgetOf(p,t),0), spTot=tongs.reduce((s,t)=>s+spentOf(p,t),0);
  /* 일상경비 교부 현황 — 땡겨온 돈에서 일상경비로 결의한 것과 품의만 된 것을 빼면 지금 쓸 수 있는 돈 */
  const unknownG=p.entries.filter(e=>!e.gubun&&!e.manual).length, gtongs=tongs.filter(t=>grantOf(p,t)||grantPendingOf(p,t)||spentOf(p,t,null,true)||pendingOf(p,t,true));
  const GT={bud:0,g:0,gp:0,sp:0,pd:0,av:0,gen:0};
  const grantRows=gtongs.map(t=>{const b=budgetOf(p,t), hasBud=p.budgets.some(x=>x.tong===t&&+x.amt), g=grantOf(p,t), gp=grantPendingOf(p,t), sp=spentOf(p,t,null,true), pd=pendingOf(p,t,true), gen=spentOf(p,t,null,false), av=g-sp-pd, left=hasBud?b-g-gen:null;
    GT.bud+=b; GT.g+=g; GT.gp+=gp; GT.sp+=sp; GT.pd+=pd; GT.av+=av; GT.gen+=gen;
    return `<tr><td><b>${esc(t)}</b></td><td class="num">${hasBud?won(b):'<span class="faint">—</span>'}</td><td class="num"><b>${won(g)}</b>${gp?`<div class="faint" style="font-size:11px">+ 품의만 ${won(gp)}</div>`:''}</td><td class="num">${won(sp)}</td><td class="num faint">${won(pd)}</td><td class="num ${av<0?'over':''}"><b>${won(av)}</b></td><td class="num faint">${gen?won(gen):'—'}</td><td class="num ${left!=null&&left<0?'over':''}">${left==null?'<span class="faint">—</span>':won(left)}</td></tr>`;}).join('');
  const grantList=(p.grants||[]).slice().sort((a,b)=>String(b.resDate||b.date).localeCompare(String(a.resDate||a.date)));
  const grantCard=`<div class="card"><h2>일상경비 교부 현황 <span class="faint" style="font-weight:400">원 단위 · 지금 쓸 수 있는 일상경비 = 교부 − 일상경비 결의 − 품의만</span></h2>
    ${gtongs.length?`<div class="tableWrap"><table class="dtab budget"><thead><tr><th style="width:150px">통계목</th><th class="num">예산</th><th class="num">교부 (땡겨온 일상경비)</th><th class="num">일상경비 집행(결의)</th><th class="num">품의만 (묶인 돈)</th><th class="num">지금 쓸 수 있는 일상경비</th><th class="num">일반지출로 바로 집행</th><th class="num">아직 안 땡겨온 예산</th></tr></thead><tbody>${grantRows}
      <tr class="tot"><td><b>계</b></td><td class="num"><b>${won(GT.bud)}</b></td><td class="num"><b>${won(GT.g)}</b></td><td class="num"><b>${won(GT.sp)}</b></td><td class="num faint">${won(GT.pd)}</td><td class="num ${GT.av<0?'over':''}"><b>${won(GT.av)}</b></td><td class="num faint">${GT.gen?won(GT.gen):'—'}</td><td class="num">${won(GT.bud-GT.g-GT.gen)}</td></tr></tbody></table></div>
      <p class="hint" style="margin:8px 0 0">교부 = 일반지출 목록의 '일상경비교부' 줄(결의된 것) 합계. '아직 안 땡겨온 예산' = 예산 − 교부 − 일반지출로 바로 집행한 것.${unknownG?` <b style="color:var(--warn)">경비구분을 모르는 지출 줄 ${unknownG}건</b>은 일상경비로 보고 셌습니다 — 지방재정 일상경비 목록을 한 번 더 올리면 채워집니다.`:''}</p>
      <div style="margin-top:8px"><button type="button" class="lnk" id="dl-gtoggle">교부 내역 ${grantList.length}건 ${D.gopen?'접기':'보기'}</button></div>
      ${D.gopen&&grantList.length?`<div class="tableWrap" style="margin-top:6px"><table class="dtab entries"><thead><tr><th style="width:86px">결의일</th><th>적요</th><th style="width:130px">통계목</th><th class="num" style="width:120px">금액(원)</th><th style="width:70px">품의번호</th></tr></thead><tbody>${grantList.map(g=>`<tr><td>${fmtDate(g.resDate)||`<span class="faint">품의 ${fmtDate(g.date)}</span>`}</td><td>${esc(g.title)}</td><td>${esc(g.tong)}</td><td class="num">${won(g.resAmt||g.amt)}</td><td class="faint">${esc(g.pno)}</td></tr>`).join('')}</tbody></table></div>`:''}`
      :`<div class="empty">아직 교부 자료가 없습니다. 지방재정에서 <b>일반지출</b> 목록(일상경비교부가 들어 있는 것)을 내려받아 위의 [지방재정 엑셀 올리기]로 올리세요.</div>`}</div>`;
  /* 지출 줄 */
  let list=p.entries.slice();
  const F=D.filt; if(F.tong) list=list.filter(e=>e.tong===F.tong); if(F.month) list=list.filter(e=>(e.resDate||e.date||'').slice(5,7)===F.month); if(F.gubun) list=list.filter(e=>F.gubun==='일반지출'?e.gubun==='일반지출':isDaily(e));
  const q=F.q.trim(); if(q) list=list.filter(e=>[e.title,e.vendor,e.tong,e.pno,e.memo].join(' ').includes(q));
  list.sort((a,b)=>String(b.resDate||b.date).localeCompare(String(a.resDate||a.date))||b.id-a.id);
  pg.innerHTML=head+`<div class="card"><h2>통계목별 예산·잔액 <span class="faint" style="font-weight:400">원 단위 · 잔액 = 예산 − 결의된 금액</span></h2>
    <div class="tableWrap"><table class="dtab budget"><thead><tr><th style="width:150px">통계목</th><th class="num">예산</th><th class="num">집행(결의)</th><th class="num">품의만(미결)</th><th class="num">잔액</th>${months.map(m=>`<th class="num mo">${m}월 말 잔액</th>`).join('')}</tr></thead><tbody>${budRows||`<tr><td colspan="17" class="faint">통계목이 없습니다. 사업 요약 → 고치기에서 통계목별 예산을 넣거나 엑셀을 올리세요.</td></tr>`}
      ${tongs.length?`<tr class="tot"><td><b>계</b></td><td class="num"><b>${won(budTot)}</b></td><td class="num"><b>${won(spTot)}</b></td><td class="num faint">${won(tongs.reduce((s,t)=>s+pendingOf(p,t),0))}</td><td class="num"><b>${won(budTot-spTot)}</b></td>${months.map(()=>'<td></td>').join('')}</tr>`:''}</tbody></table></div>
    <p class="hint" style="margin:8px 0 0">품의만 된 것(아직 결의 전)은 잔액에서 빼지 않고 '품의만' 칸에 따로 보입니다. 집행에는 일상경비와 일반지출(기획과 계약 등)이 다 들어갑니다. 통계목 예산은 사업 요약 → 고치기에서.${noBud.length?` <b style="color:var(--bad)">예산이 안 들어간 통계목: ${noBud.map(esc).join(', ')}</b> — 사업 요약 → 고치기 → 통계목별 예산에 넣으면 잔액이 나옵니다.`:''}</p></div>
    ${grantCard}
    <div class="card"><h2>지출 <span class="faint" style="font-weight:400">${list.length}건${list.length!==p.entries.length?` / 전체 ${p.entries.length}건`:''}</span></h2>
    <div class="row" style="margin-bottom:10px"><select id="dl-ftong" style="width:auto"><option value="">통계목 전부</option>${tongs.map(t=>`<option ${F.tong===t?'selected':''}>${esc(t)}</option>`).join('')}</select>
      <select id="dl-fgubun" style="width:auto"><option value="">경비 전부</option><option value="일상경비" ${F.gubun==='일상경비'?'selected':''}>일상경비</option><option value="일반지출" ${F.gubun==='일반지출'?'selected':''}>일반지출</option></select>
      <select id="dl-fmonth" style="width:auto"><option value="">달 전부</option>${months.map(m=>`<option value="${pad2(m)}" ${F.month===pad2(m)?'selected':''}>${m}월</option>`).join('')}</select>
      <input id="dl-q" placeholder="적요·거래처로 찾기" value="${esc(F.q)}" style="width:220px"></div>
    ${list.length?`<div class="tableWrap"><table class="dtab entries"><thead><tr><th style="width:86px">결의일</th><th>적요</th><th style="width:120px">거래처</th><th style="width:110px">통계목</th><th class="num" style="width:110px">금액(원)</th><th style="width:70px">진행</th><th style="width:70px"></th></tr></thead><tbody>
      ${list.map(e=>{const st=stepOf(e), vs=verdict(e);
        if(D.eedit===e.id) return `<tr class="erow fedit" data-eid="${e.id}"><td colspan="7"><div class="eform">
          <div class="f wide"><span>적요</span><input data-ef="title" value="${esc(e.title)}"></div>
          <div class="f"><span>통계목</span><select data-ef="tong">${TONGS.concat(e.tong&&!TONGS.includes(e.tong)?[e.tong]:[]).map(t=>`<option ${e.tong===t?'selected':''}>${t}</option>`).join('')}</select></div>
          <div class="f"><span>품의일자</span><input type="date" ${DLIM} data-ef="date" value="${e.date}"></div>
          <div class="f"><span>결의일자 <span class="faint">(결의됐으면)</span></span><input type="date" ${DLIM} data-ef="resDate" value="${e.resDate}"></div>
          <div class="f"><span>금액 (원)</span><input class="num" data-ef="amt" value="${esc(e.amt)}" inputmode="numeric"></div>
          <div class="f"><span>거래처</span><input data-ef="vendor" value="${esc(e.vendor)}"></div>
          <div class="f wide"><span>메모</span><input data-ef="memo" value="${esc(e.memo)}"></div>
          </div><div class="eact"><button type="button" class="btn sm primary" data-esave="${e.id}">저장</button><button type="button" class="btn sm" data-ecancel="1">취소</button></div></td></tr>`;
        return `<tr class="erow" data-eid="${e.id}"><td>${fmtDate(e.resDate)||`<span class="faint">품의 ${fmtDate(e.date)}</span>`}</td>
          <td>${esc(e.title)||'(적요 없음)'}${e.gubun==='일반지출'?' <span class="stepchip" title="일상경비 통장이 아니라 회계과에서 바로 지급(일반지출)">일반지출</span>':''}${vs.length?`<div>${vs.map(v=>`<span class="cmark over" style="margin:2px 6px 0 0;font-size:11px">${esc(v.t)}</span>`).join('')}</div>`:''}${e.memo?`<div class="hint">${esc(e.memo)}</div>`:''}${e.manual?'<div class="hint">직접 넣은 줄</div>':''}</td>
          <td>${esc(e.vendor)||'<span class="faint">—</span>'}</td><td>${esc(e.tong)||'<span class="faint">—</span>'}</td><td class="num">${won(e.resAmt||e.amt)}</td>
          <td><span class="stepchip s${st}" title="${STEPS.map((s,i)=>(i<=st?'✓':'·')+s).join(' ')}">${STEPS[st]}</span></td>
          <td>${e.manual?`<button type="button" class="btn sm ghost" data-eedit="${e.id}" title="고치기">✎</button><button type="button" class="btn sm ghost" data-edel="${e.id}" style="color:var(--bad)" title="지우기">×</button>`:''}</td></tr>`;}).join('')}</tbody></table></div>`
      :`<div class="empty">${p.entries.length?'거르기에 맞는 지출이 없습니다.':'아직 지출이 없습니다. 지방재정 엑셀을 올리거나 직접 넣으세요.'}</div>`}</div>`;
  bindLedger(pg,p);
}
function bindLedger(pg,p){
  $('#dl-import').onclick=()=>$('#dl-file').click();
  $('#dl-file').onchange=async()=>{const f=$('#dl-file').files[0]; $('#dl-file').value=''; if(!f) return; await importFile(f);};
  const add=$('#dl-add'); if(add&&p) add.onclick=()=>{const e=mkEntry({title:'',date:today(),tong:tongsOf(p)[0]||'사무관리비',manual:true,kind:'buy'}); p.entries.push(e); D.eedit=e.id; drawLedger(); const i=$('tr.fedit input[data-ef="title"]',pg); if(i) i.focus();};
  pg.onclick=e=>{const t=e.target;
    const yb=t.closest('[data-dyear]'); if(yb){D.year=+yb.dataset.dyear; D.proj=null; drawLedger(); return;}
    const pc=t.closest('[data-dproj]'); if(pc){D.proj=+pc.dataset.dproj; drawLedger(); return;}
    if(t.id==='dl-gtoggle'){D.gopen=!D.gopen; drawLedger(); return;}
    const ed=t.closest('[data-eedit]'); if(ed&&p){D.eedit=+ed.dataset.eedit; drawLedger(); return;}
    if(t.closest('[data-ecancel]')){const en=p&&p.entries.find(x=>x.id===D.eedit); if(en&&en.manual&&!en.title&&!en.amt) p.entries=p.entries.filter(x=>x!==en); D.eedit=null; drawLedger(); return;}
    const es=t.closest('[data-esave]'); if(es&&p){const en=p.entries.find(x=>x.id===+es.dataset.esave); if(!en) return; const tr=es.closest('tr');
      $$('[data-ef]',tr).forEach(i=>{const k=i.dataset.ef; en[k]=k==='amt'?num(i.value):i.value.trim();}); if(en.resDate&&en.resAmt==='') en.resAmt=en.amt; if(!en.resDate) en.resAmt='';
      D.eedit=null; drawLedger(); return;}
    const dl=t.closest('[data-edel]'); if(dl&&p){const en=p.entries.find(x=>x.id===+dl.dataset.edel); if(!en) return; if(!confirm(`"${en.title||'이 줄'}"을 지웁니다.`)) return; p.entries=p.entries.filter(x=>x!==en); FILES.filter(f=>f.ref&&f.ref.kind==='ddoc'&&f.ref.d===p.id&&f.ref.e===en.id).forEach(f=>removeFile(f)); drawLedger(); return;}
  };
  pg.onchange=e=>{const t=e.target;
    if(t.id==='dl-ftong'){D.filt.tong=t.value; drawLedger(); return;} if(t.id==='dl-fmonth'){D.filt.month=t.value; drawLedger(); return;} if(t.id==='dl-fgubun'){D.filt.gubun=t.value; drawLedger(); return;}
  };
  const q=$('#dl-q'); if(q) q.oninput=()=>{D.filt.q=q.value; const pos=q.selectionStart; drawLedger(); const q2=$('#dl-q'); if(q2){q2.focus(); q2.setSelectionRange(pos,pos);}};
}
async function importFile(f){
  let sheets; try{ sheets=await readXlsx(f); }catch(err){ alert('엑셀을 읽지 못했습니다: '+(err.message||err)); return; }
  let parsed=null; for(const sh of sheets){ const r=parseLedgerRows(sh.rows); if(r.list){parsed=r;break;} else parsed=parsed||r; }
  if(!parsed||!parsed.list){ alert(parsed?parsed.error:'읽을 시트가 없습니다.'); return; }
  const rows=parsed.list; if(!rows.length){alert('지출 줄이 없습니다.');return;}
  const groups={}; rows.forEach(r=>{(groups[r.sebu||'']=groups[r.sebu||'']||[]).push(r);});
  const report=[];
  for(const [sebu,rs] of Object.entries(groups)){
    const year=+String(rs.find(r=>r.date)?.date||'').slice(0,4)||curYear();
    let p=sebu?matchProject(sebu,year):curProj();
    if(!p){ if(!confirm(`"${sebu||'(세부사업명 없음)'}" 에 맞는 직접 사업이 없습니다. 이 이름으로 ${year}년 사업을 새로 만들까요?\n(아니오를 누르면 이 사업 줄 ${rs.length}건은 건너뜁니다)`)){ report.push(`${sebu||'(이름 없음)'}: 건너뜀 ${rs.length}건`); continue; }
      p=mkDProject({alias:sebu.length>14?sebu.slice(0,14):sebu,full:sebu,sebu,year}); DS.projects.push(p); }
    const r=importInto(p,rs); report.push(`${p.alias}: 지출 새로 ${r.added}건 · 갱신 ${r.updated}건${(r.gAdded||r.gUpdated)?` / 일상경비 교부 새로 ${r.gAdded}건 · 갱신 ${r.gUpdated}건`:''}`);
    D.year=p.year; D.proj=p.id;
  }
  alert('가져왔습니다.\n'+report.join('\n'));
  drawLedger();
}
/* ================= 현황 — 건 목록 (가계부와는 따로) ================= */
function drawStat(){
  const pg=$('#page-dstat'), y=curYear(), p=curProj();
  const head=`<div class="card"><h2>현황 <span class="pill done">${y}년</span></h2>
    <div class="desc">폴더처럼 건마다 번호와 이름을 붙이고 태그(진행중·완료·중단·토스…)를 답니다. 건을 누르면 오른쪽에 경우에 맞는 단계와 서류가 나와서, 단계를 체크하고 서류를 붙일 수 있습니다. 가계부의 지출 줄과는 따로 관리합니다.</div>
    <div class="row">${yearBtns(y,'dyear')}<span class="row" style="margin-left:auto"><button class="btn sm primary" id="ds-add" ${p?'':'disabled'}>+ 새 건</button><button class="btn sm" id="ds-tags">태그 고치기</button></span></div>
    ${projChips(p)}<div id="ds-tagbox" ${D.tagEdit?'':'hidden'}></div></div>`;
  if(!p){ pg.innerHTML=head+`<div class="card"><div class="empty">직접 사업이 없습니다. [사업 요약]에서 등록하세요.</div></div>`; bindStat(pg,null); return; }
  const F=D.sfilt, cnt=t=>p.cases.filter(c=>c.tag===t).length;
  let list=p.cases.slice(); if(F.tag) list=list.filter(c=>c.tag===F.tag);
  const q=F.q.trim(); if(q) list=list.filter(c=>[c.no,c.name,c.vendor,c.memo].join(' ').includes(q));
  const isEnd=c=>{const t=tagOf(c.tag); return !!(t&&t.end);};
  const byNo=(a,b)=>(+a.no||0)-(+b.no||0)||a.id-b.id;
  const active=list.filter(c=>!isEnd(c)).sort(byNo), ended=list.filter(isEnd).sort(byNo);
  const row=c=>{const K=CASE(c.kind), st=caseStat(c), nf=caseFiles(p,c).length, tg=tagOf(c.tag);
    const squares=K.steps.map(s=>{const x=c.steps[s.k]||{}; return `<i class="${x.na?'n':(x.done?'d':'')}" title="${esc(s.name)}${x.na?' (해당 없음)':(x.done?' ✓':'')}"></i>`;}).join('');
    return `<div class="crow ${isEnd(c)?'end':''}" data-copen="${c.id}"><span class="no">${esc(c.no)}</span><span class="nm">${esc(c.name)||'<span class="faint">(이름 없음)</span>'}<small>${esc(K.name)}${c.start?` · ${fmtDate(c.start)}`:''}${c.vendor?` · ${esc(c.vendor)}`:''}</small></span>
      <span><select class="tagsel ${tg&&tg.end?'end':''}" data-ctag="${c.id}" title="태그">${DS.tags.map(t=>`<option ${c.tag===t.n?'selected':''}>${esc(t.n)}</option>`).join('')}${tg?'':`<option selected>${esc(c.tag)}</option>`}</select></span>
      <span class="steps" title="${st.done}/${st.need} 단계">${squares}</span><span class="money">${c.amt!==''&&c.amt!=null?won(c.amt):'<span class="faint">—</span>'}</span><span class="faint">📎${nf}</span></div>`;};
  pg.innerHTML=head+`<div class="card"><div class="row" style="margin-bottom:10px"><span class="segs"><button type="button" class="seg ${!F.tag?'on':''}" data-stag="">전부 ${p.cases.length}</button>${DS.tags.map(t=>`<button type="button" class="seg ${F.tag===t.n?'on':''}" data-stag="${esc(t.n)}">${esc(t.n)} ${cnt(t.n)}</button>`).join('')}</span><input id="ds-q" placeholder="번호·이름·거래처로 찾기" value="${esc(F.q)}" style="width:220px;margin-left:auto"></div>
    ${p.cases.length?`<div class="clist">${active.map(row).join('')}${ended.length?`<div class="divider">끝난 건 ${ended.length}</div>${ended.map(row).join('')}`:''}${!active.length&&!ended.length?'<div class="empty">거르기에 맞는 건이 없습니다.</div>':''}</div>`:'<div class="empty">아직 건이 없습니다. [+ 새 건]으로 넣으세요.</div>'}
    <p class="hint" style="margin-top:10px">네모 = 단계(칠해지면 끝냄, 점선은 해당 없음). 태그는 목록에서 바로 바꿀 수 있고, "끝난 것"으로 표시한 태그의 건은 점선 아래로 내려갑니다.</p></div>`;
  if(D.tagEdit) paintTagBox();
  bindStat(pg,p);
}
function paintTagBox(){
  const box=$('#ds-tagbox'); if(!box) return; box.hidden=false;
  const used=n=>DS.projects.reduce((s,p)=>s+p.cases.filter(c=>c.tag===n).length,0);
  box.innerHTML=`<div class="catedit">${DS.tags.map((t,i)=>`<div class="row"><input data-tagname="${i}" value="${esc(t.n)}"><label class="check"><input type="checkbox" data-tagend="${i}" ${t.end?'checked':''}> 끝난 것 (목록 아래로)</label><span class="hint">${used(t.n)}건</span><button type="button" class="btn sm" data-tagren="${i}">이름 바꾸기</button><button type="button" class="btn sm ghost" data-tagdel="${i}" ${used(t.n)?'disabled title="이 태그가 달린 건이 있어 지울 수 없습니다"':''} style="color:var(--bad)">지우기</button></div>`).join('')}
    <div class="row"><input id="ds-tagnew" placeholder="새 태그 이름 (예: 보류)"><button type="button" class="btn sm" id="ds-tagadd">추가</button><button type="button" class="btn sm ghost" id="ds-tagclose">닫기</button></div>
    <div class="hint">이름을 바꾸면 그 태그가 달린 건도 같이 바뀝니다. 건이 달린 태그는 지울 수 없습니다.</div></div>`;
}
function bindStat(pg,p){
  pg.onclick=e=>{const t=e.target;
    const yb=t.closest('[data-dyear]'); if(yb){D.year=+yb.dataset.dyear; D.proj=null; drawStat(); return;}
    const pc=t.closest('[data-dproj]'); if(pc){D.proj=+pc.dataset.dproj; drawStat(); return;}
    if(t.id==='ds-tags'){D.tagEdit=!D.tagEdit; drawStat(); return;}
    if(t.id==='ds-tagclose'){D.tagEdit=false; drawStat(); return;}
    if(t.id==='ds-tagadd'){const n=$('#ds-tagnew').value.trim(); if(!n) return; if(tagOf(n)){alert('이미 있는 태그입니다.');return;} DS.tags.push({n,end:false}); drawStat(); return;}
    const rn=t.closest('[data-tagren]'); if(rn){const i=+rn.dataset.tagren, n=$(`[data-tagname="${i}"]`).value.trim(); if(!n) return; const old=DS.tags[i].n; if(n!==old){ if(tagOf(n)){alert('이미 있는 태그입니다.');return;} DS.tags[i].n=n; DS.projects.forEach(pp=>pp.cases.forEach(c=>{if(c.tag===old) c.tag=n;})); } drawStat(); return;}
    const dl=t.closest('[data-tagdel]'); if(dl){const i=+dl.dataset.tagdel; if(DS.tags.length<=1){alert('태그는 하나는 남겨 두세요.');return;} DS.tags.splice(i,1); drawStat(); return;}
    const sg=t.closest('[data-stag]'); if(sg){D.sfilt.tag=sg.dataset.stag; drawStat(); return;}
    if(!p) return;
    if(t.id==='ds-add'){const c=mkCase({no:nextNo(p),tag:(DS.tags[0]||{}).n||'진행중'}); p.cases.push(c); drawStat(); openCase(p,c); setTimeout(()=>{const i=$('#pbody [data-cf="name"]'); if(i) i.focus();},50); return;}
    if(t.closest('select')) return;
    const op=t.closest('[data-copen]'); if(op){const c=p.cases.find(x=>x.id===+op.dataset.copen); if(c) openCase(p,c); return;}
  };
  pg.onchange=e=>{const t=e.target;
    const te=t.closest('[data-tagend]'); if(te){DS.tags[+te.dataset.tagend].end=t.checked; drawStat(); return;}
    const tg=t.closest('[data-ctag]'); if(tg&&p){const c=p.cases.find(x=>x.id===+tg.dataset.ctag); if(c){c.tag=t.value; drawStat(); if(D.panel&&D.panel.c===c.id) paintCase();} return;}
  };
  const q=$('#ds-q'); if(q) q.oninput=()=>{D.sfilt.q=q.value; const pos=q.selectionStart; drawStat(); const q2=$('#ds-q'); if(q2){q2.focus(); q2.setSelectionRange(pos,pos);}};
}
/* ---------- 건 패널 (오른쪽) ---------- */
function openCase(p,c){ cur={view:'direct'}; D.panel={d:p.id,c:c.id}; paintCase(); openPanel(); }
function paintCase(){
  if(!D.panel||D.panel.c==null) return; const p=byId(D.panel.d), c=p&&p.cases.find(x=>x.id===D.panel.c); if(!c){closePanel();return;}
  const K=CASE(c.kind), st=caseStat(c), tg=tagOf(c.tag);
  ptitle.textContent=`${c.no}. ${c.name||'(이름 없음)'}`; psub.textContent=`${p.alias} · ${K.name} · ${c.tag}`;
  const ref=(sk,dn)=>({kind:'ddoc',d:p.id,c:c.id,doc:dkey(sk,dn)});
  pbody.innerHTML=`<div class="note" style="padding-top:8px"><div class="frow">
      <div class="f" style="flex:0 0 70px"><span>번호</span><input class="num" data-cf="no" value="${esc(c.no)}" inputmode="numeric"></div>
      <div class="f" style="flex:1 1 auto"><span>이름</span><input data-cf="name" value="${esc(c.name)}" placeholder="예: FAPAS(2차)"></div>
      <div class="f"><span>태그</span><select data-cf="tag">${DS.tags.map(t=>`<option ${c.tag===t.n?'selected':''}>${esc(t.n)}</option>`).join('')}${tg?'':`<option selected>${esc(c.tag)}</option>`}</select></div>
      <div class="f"><span>경우</span><select data-cf="kind">${CASES.map(k=>`<option value="${k.k}" ${c.kind===k.k?'selected':''}>${k.name}</option>`).join('')}</select></div>
      <div class="f"><span>시작일</span><input type="date" ${DLIM} data-cf="start" value="${esc(c.start)}"></div>
      <div class="f"><span>금액 (원, 선택)</span><input class="num" data-cf="amt" value="${esc(c.amt)}" inputmode="numeric"></div>
      <div class="f wide"><span>거래처 (선택)</span><input data-cf="vendor" value="${esc(c.vendor)}"></div>
    </div></div>
    ${K.steps.map((s,si)=>{const x=c.steps[s.k]||{}, cls=x.na?'skip':(x.done?'done':'');
      return `<div class="stepcard ${cls}"><div class="sh"><input type="checkbox" data-cstep="${s.k}" ${x.done?'checked':''} ${x.na?'disabled':''}><b>${si+1}. ${esc(s.name)}</b><span class="when">${x.done&&x.at?fmtDate(x.at):''}</span>${s.note?`<span class="faint">${esc(s.note)}</span>`:''}<label class="check na"><input type="checkbox" data-cna="${s.k}" ${x.na?'checked':''}> 해당 없음</label></div>
        ${s.docs.length&&!x.na?s.docs.map(d=>{const k=dkey(s.k,d.n), val=c.docs[k]||0, fs=filesFor(ref(s.k,d.n)), dcls=val===1?'done':(val===2?'na':''), mark=val===1?'✓':(val===2?'—':'');
          return `<div class="doc ${dcls}" style="padding:7px 0"><button type="button" class="tick" data-ctk="${esc(k)}">${mark}</button><span class="dname">${esc(d.n)}${d.opt?' <span class="faint">(선택)</span>':''}${d.hint?`<span class="why">${esc(d.hint)}</span>`:''}${fs.length?`<div class="thumbs">${fs.map((f,i)=>thumbHTML(f,`data-copenf="${i}" data-ck="${esc(k)}"`)).join('')}<button type="button" class="thumb add" data-cadd="${esc(k)}" title="더 붙이기">+</button></div>`:''}</span><button type="button" class="scan ${fs.length?'has':''}" data-csc="${esc(k)}">${fs.length?`스캔 ${fs.length}`:'첨부'}</button></div>`;}).join(''):''}</div>`;}).join('')}
    <div class="note"><span class="faint">메모</span><textarea data-cf="memo" style="margin-top:4px;min-height:60px" placeholder="예: 견적서는 9월치로 다시 받기">${esc(c.memo)}</textarea></div>
    <div class="note" style="padding-top:0"><button type="button" class="btn sm ghost" data-cdel="1" style="color:var(--bad)">이 건 지우기</button></div>
    <p class="note">단계의 네모를 누르면 끝낸 날짜가 적힙니다. 서류 네모는 <b>아직 → 갖춤 → 해당없음</b> 순으로 바뀌고, [첨부]로 스캔·사진을 붙입니다.</p>`;
  pfoot.innerHTML=`<span>단계 <b>${st.done}</b> / <b>${st.need}</b></span>`+(st.all?'<span style="color:var(--accent);font-weight:700">모두 끝</span>':'');
}
function bindPanel(){
  panel.addEventListener('click',ev=>{
    if(!cur||cur.view!=='direct'||!D.panel||D.panel.c==null) return; const t=ev.target, p=byId(D.panel.d), c=p&&p.cases.find(x=>x.id===D.panel.c); if(!c) return;
    const ref=k=>({kind:'ddoc',d:p.id,c:c.id,doc:k}), title=k=>`${c.no}. ${c.name} · ${docLabel(k)}`;
    const tk=t.closest('[data-ctk]'); if(tk){const k=tk.dataset.ctk; c.docs[k]=((c.docs[k]||0)+1)%3; paintCase(); return;}
    const sc=t.closest('[data-csc]'); if(sc){const k=sc.dataset.csc, fs=filesFor(ref(k)); if(fs.length) openViewer(fs.map(x=>x.id),0,ref(k),title(k)); else pickFiles(ref(k),added=>{paintCase(); if(PAGE==='dstat') drawStat(); openViewer(added.map(x=>x.id),0,ref(k),title(k));}); return;}
    const ad=t.closest('[data-cadd]'); if(ad){pickFiles(ref(ad.dataset.cadd),()=>{paintCase(); if(PAGE==='dstat') drawStat();}); return;}
    const op=t.closest('[data-copenf]'); if(op){const k=op.dataset.ck, fs=filesFor(ref(k)); openViewer(fs.map(x=>x.id),+op.dataset.copenf,ref(k),title(k)); return;}
    if(t.closest('[data-cdel]')){ if(!confirm(`"${c.no}. ${c.name||'이 건'}"을 지웁니다. 단계 체크·붙인 스캔도 같이 사라집니다.`)) return; caseFiles(p,c).forEach(f=>removeFile(f)); p.cases=p.cases.filter(x=>x!==c); D.panel=null; closePanel(); if(PAGE==='dstat') drawStat(); return; }
  });
  panel.addEventListener('change',ev=>{
    if(!cur||cur.view!=='direct'||!D.panel||D.panel.c==null) return; const t=ev.target, p=byId(D.panel.d), c=p&&p.cases.find(x=>x.id===D.panel.c); if(!c) return;
    const cs=t.closest('[data-cstep]'); if(cs){const k=cs.dataset.cstep, x=c.steps[k]||(c.steps[k]={}); x.done=t.checked; x.at=t.checked?today():''; paintCase(); if(PAGE==='dstat') drawStat(); return;}
    const na=t.closest('[data-cna]'); if(na){const k=na.dataset.cna, x=c.steps[k]||(c.steps[k]={}); x.na=t.checked; if(t.checked){x.done=false;x.at='';} paintCase(); if(PAGE==='dstat') drawStat(); return;}
    const f=t.dataset.cf; if(f){ if(f==='amt') c.amt=num(t.value); else if(f==='no') c.no=Math.max(0,Math.round(+num(t.value)||0)); else c[f]=t.value.trim(); if(f==='kind'||f==='tag') paintCase(); else { ptitle.textContent=`${c.no}. ${c.name||'(이름 없음)'}`; } if(PAGE==='dstat') drawStat(); return; }
  });
}

/* ---------- 월급 계산기 ---------- */
const maskAcct=s=>{const t=String(s||''); if(!t) return ''; return t.length>4?'*'.repeat(Math.max(0,t.length-4)).replace(/\*{4}/g,'**** ')+t.slice(-4):t;};
function drawPay(){
  const pg=$('#page-dpay'), y=curYear(), p=curProj();
  const head=`<div class="card"><h2>월급 계산기 <span class="faint" style="font-weight:400">기간제 근로자 · 공정수당 반영 전</span></h2>
    <div class="desc">근로자를 넣고, 달마다 <b>쉰 날과 사유</b>만 고르면 급여대장·4대보험 산출내역 엑셀을 내려받을 수 있습니다. 평일은 근무, 토요일은 휴무, 일요일은 주휴(그 주 월~금을 다 일했으면), 공휴일은 유급휴가로 미리 채워 둡니다. 공가와 유급병가도 유급휴가로 셉니다(무급병가는 무보수).</div>
    <div class="row">${yearBtns(y,'dyear')}</div>${projChips(p)}</div>`;
  if(!p){ pg.innerHTML=head+`<div class="card"><div class="empty">직접 사업이 없습니다. 사업 요약에서 먼저 등록하세요 (기간제 보수가 잡힌 사업).</div></div>`; bindPay(pg,null); return; }
  const [yy,mm]=D.ym.split('-').map(Number), R=ratesFor(yy), ws=activeWorkers(p,D.ym);
  /* 근로자 표 */
  const wrow=w=>{ if(D.wedit===w.id) return weditRow(w);
    return `<tr data-wid="${w.id}"><td><b>${esc(w.name)||'(이름 없음)'}</b>${w.site?`<div class="faint">${esc(w.site)}</div>`:''}</td><td>${fmtDate(w.hired)||'—'}${w.quit?`<div class="faint">퇴직 ${fmtDate(w.quit)}</div>`:''}</td><td class="num">${won(w.daily||R.daily)}</td><td class="num">${won(w.base)||'<span class="faint">—</span>'}</td><td class="num">${w.deps}</td><td>${esc(w.bank)} <span class="mask">${esc(maskAcct(w.account))}</span></td><td class="num">${won(w.meal)}</td><td>${[w.health?'건강':'',w.pension?'연금':'',w.emp?'고용':'',w.accident?'산재':''].filter(Boolean).join('·')||'<span class="faint">없음</span>'}</td><td class="act"><button type="button" class="btn sm ghost" data-wedit="${w.id}">✎</button><button type="button" class="btn sm ghost" data-wdel="${w.id}" style="color:var(--bad)">×</button></td></tr>`; };
  const weditRow=w=>`<tr class="fedit" data-wid="${w.id}"><td colspan="9"><div class="eform">
      <div class="f"><span>성명</span><input data-wf="name" value="${esc(w.name)}"></div>
      <div class="f"><span>계약체결일 (최초근무일)</span><input type="date" min="1900-01-01" max="2099-12-31" data-wf="hired" value="${w.hired}"></div>
      <div class="f"><span>퇴직일 (마지막 근무 다음 날)</span><input type="date" min="1900-01-01" max="2099-12-31" data-wf="quit" value="${w.quit}"></div>
      <div class="f"><span>일금 (원) <span class="faint">비우면 ${won(R.daily)}</span></span><input class="num" data-wf="daily" value="${esc(w.daily)}" inputmode="numeric" placeholder="${R.daily}"></div>
      <div class="f"><span>기준소득월액 (4대보험 계산 기준, 원)</span><input class="num" data-wf="base" value="${esc(w.base)}" inputmode="numeric" placeholder="예: 2400000"></div>
      <div class="f"><span>부양가족 수 (본인 포함)</span><input type="number" data-wf="deps" value="${w.deps}" min="1"></div>
      <div class="f"><span>8~20세 자녀 수 <span class="faint">(세액표 공제)</span></span><input type="number" data-wf="child" value="${w.child||0}" min="0"></div>
      <div class="f"><span>금융기관</span><input data-wf="bank" value="${esc(w.bank)}"></div>
      <div class="f"><span>계좌번호</span><input data-wf="account" value="${esc(w.account)}" autocomplete="off"></div>
      <div class="f"><span>생년월일 (4대보험 산출내역용)</span><input data-wf="birth" value="${esc(w.birth)}" placeholder="비워도 됨"></div>
      <div class="f"><span>근무지 (청구서 비고)</span><input data-wf="site" value="${esc(w.site)}"></div>
      <div class="f"><span>식비 공제 (원)</span><input class="num" data-wf="meal" value="${esc(w.meal)}" inputmode="numeric"></div>
      <div class="f wide"><span>4대보험 가입</span><div class="row">${[['health','건강보험'],['pension','국민연금'],['emp','고용보험'],['accident','산재보험']].map(x=>`<label class="check"><input type="checkbox" data-wf="${x[0]}" ${w[x[0]]?'checked':''}> ${x[1]}</label>`).join('')}</div></div>
      <div class="f wide"><span>메모 (산출내역 비고)</span><input data-wf="memo" value="${esc(w.memo)}"></div>
    </div><div class="eact"><button type="button" class="btn sm primary" data-wsave="${w.id}">저장</button><button type="button" class="btn sm" data-wcancel="1">취소</button><span class="hint">계좌번호는 서버에 암호화되어 저장되고 화면에서는 가려서 보입니다.</span></div></td></tr>`;
  /* 달력 */
  const calHTML=w=>{const c=calcWorker(p,w,D.ym), wm=c.wm, n=c.n, first=new Date(yy,mm-1,1).getDay();
    let cells=''; for(let i=0;i<first;i++) cells+='<div class="dcell empty"></div>';
    for(let d=1;d<=n;d++){const st=wm.days[d]||'none', dow=new Date(yy,mm-1,d).getDay(), isSun=dow===0, wk=isSun&&st!=='none'&&weeklyPaid(p,w,wm,yy,mm,d), hrs=st==='work'?hoursOf(wm,d):8;
      cells+=`<div class="dcell st-${st} ${isSun?'sun':''} ${dow===6?'sat':''}"><div class="dn">${d}<span class="dw">${DOWK[dow]}</span>${isSun&&st!=='none'?`<button type="button" class="wkbtn ${wk?'on':''}" data-wk="${w.id}|${d}" title="주휴 켜고 끄기">${wk?'주휴':'주휴 ✕'}</button>`:''}</div>
        ${st==='none'?'<div class="faint" style="font-size:11px">미근무</div>':isSun?'':`<select data-day="${w.id}|${d}">${DAY_ST.filter(s=>s.v!=='weekly'&&(s.v!=='off'||dow===6)).map(s=>`<option value="${s.v}" ${st===s.v?'selected':''}>${s.name}</option>`).join('')}</select>`}
        ${st==='work'?`<div class="hrow"><input class="ot" data-hr="${w.id}|${d}" value="${hrs}" inputmode="numeric" title="그날 일한 시간 (기본 8, 연가를 시간으로 쓰면 그만큼 줄이세요)"><span class="faint">h${hrs<8?` <b class="lv">연가 ${8-hrs}h</b>`:''}</span></div>`:''}</div>`;}
    return `<div class="dcal">${cells}</div>`;};
  const sumHTML=w=>{const c=calcWorker(p,w,D.ym), wm=c.wm, ins=wm.ins||{};
    return `<div class="paysum"><div class="pscol"><h4>지급</h4>
        <div><span>근로일 ${c.workDays}일${Number.isInteger(c.workDays)?'':` (${c.workH}시간)`} × ${won(c.daily)}</span><b>${won(c.base)}</b></div>
        <div><span>주휴 ${c.weekly}일</span><b>${won(c.weeklyPay)}</b></div>
        <div><span>유급휴가 ${c.hol}일 <span class="faint">공휴일 ${c.hol-c.official-c.sickPaid}${c.official?` · 공가 ${c.official}`:''}${c.sickPaid?` · 유급병가 ${c.sickPaid}`:''}</span></span><b>${won(c.holPay)}</b></div>
        <div><span>연차수당 ${c.leave}일${Number.isInteger(c.leave)?'':` (${dayText(c.leave)})`}</span><b>${won(c.leavePay)}</b></div>
        <div><span>초과 ${c.otH}시간 × ${won(Math.round(c.hourly*1.5))}</span><b>${won(c.otPay)}</b></div>
        <div class="tot"><span>총급여 (10원 올림)</span><b>${won(c.gross)}</b></div>
        ${c.sick||c.absent?`<div class="faint" style="font-size:12px">무급: 무급병가 ${c.sick} · 결근 ${c.absent}</div>`:''}</div>
      <div class="pscol"><h4>공제 <span class="faint">비워 두면 요율·세액표로 셈, 적으면 그 숫자</span></h4>
        <div><span>건강보험(장기요양 포함)</span><input class="num" data-ins="${w.id}|health" value="${ins.health!=null&&ins.health!==''?ins.health:''}" placeholder="${c.health}"></div>
        <div><span>국민연금</span><input class="num" data-ins="${w.id}|pension" value="${ins.pension!=null&&ins.pension!==''?ins.pension:''}" placeholder="${c.pension}"></div>
        <div><span>고용보험</span><input class="num" data-ins="${w.id}|emp" value="${ins.emp!=null&&ins.emp!==''?ins.emp:''}" placeholder="${c.emp}"></div>
        <div><span>근로소득세 <span class="faint">${c.taxAuto==null?'(간이세액표 파일 없음 — 손으로)':`(간이세액표 ${taxTable().eff} · 부양가족 ${w.deps}${w.child?` · 자녀 ${w.child}`:''})`}</span></span><input class="num" data-tax="${w.id}" value="${wm.tax!==''&&wm.tax!=null?wm.tax:''}" placeholder="${c.taxAuto==null?0:c.taxAuto}"></div>
        <div><span>지방소득세 (10%)</span><b>${won(c.local)}</b></div>
        <div><span>식비</span><b>${won(c.meal)}</b></div>
        <div class="tot"><span>공제 계</span><b>${won(c.ded)}</b></div>
        <div class="tot net"><span>실지급액</span><b>${won(c.net)}</b></div></div>
      <div class="pscol"><h4>기관부담금 <span class="faint">기준소득월액 ${c.bm?won(c.bm):'—'}${!w.base&&c.bm?' (연금액으로 셈)':''}</span></h4>
        ${[['orgHealth','건강보험',c.org.health],['orgPension','국민연금',c.org.pension],['orgEmp','고용보험',c.org.emp],['orgEmpDev','고안직능',c.org.empDev],['orgAcc','산재보험',c.org.acc]].map(x=>`<div><span>${x[1]}</span><input class="num" data-ins="${w.id}|${x[0]}" value="${ins[x[0]]!=null&&ins[x[0]]!==''?ins[x[0]]:''}" placeholder="${x[2]}"></div>`).join('')}
        <div class="tot"><span>기관부담금 계</span><b>${won(c.org.sum)}</b></div><div><span class="faint">개인부담금 계</span><b class="faint">${won(c.person.sum)}</b></div></div></div>`;};
  const cfg=R;
  pg.innerHTML=head+`<div class="card"><h2>근로자 <span class="faint" style="font-weight:400">${p.workers.length}명</span><span class="row" style="margin-left:auto"><button class="btn sm primary" id="dw-add">+ 근로자</button></span></h2>
    ${p.workers.length?`<div class="tableWrap"><table class="dtab workers"><thead><tr><th>성명</th><th>계약체결일</th><th class="num">일금</th><th class="num">기준소득월액</th><th class="num">부양</th><th>계좌</th><th class="num">식비</th><th>4대보험</th><th style="width:70px"></th></tr></thead><tbody>${p.workers.map(wrow).join('')}</tbody></table></div>`:'<div class="empty">근로자가 없습니다. [+ 근로자]로 넣으세요.</div>'}</div>
    <div class="card"><h2>급여대장에 적히는 글</h2><div class="frow">
      <div class="f wide"><span>사업명 (청구서·근무내역 머리)</span><input data-pf="payTitle" value="${esc(p.payTitle||'')}" placeholder="${esc((p.alias||p.full)+' 기간제 근로자 보수')}"></div>
      <div class="f"><span>확인자 (근무내역 도장 칸)</span><input data-pf="payChecker" value="${esc(p.payChecker||'')}" placeholder="${esc((typeof ME!=='undefined'&&ME&&ME.name)||'')}"></div>
      <div class="f"><span>급여명세서 아래 글</span><input data-pf="payFooter" value="${esc(p.payFooter||'')}" placeholder="지방농촌지도사 ${esc((typeof ME!=='undefined'&&ME&&ME.name)||'')}"></div>
      </div><p class="hint">비워 두면 회색 글자대로 들어갑니다. 급여대장은 유진 양식(2026년 8월분) 그대로 — 청구서 · 보수지급명세서 · 급여명세서(이름 고르는 칸 있음) · 근무자마다 근무내역 시트. 수식은 살아 있어 엑셀에서 열면 다시 계산됩니다.</p></div>
    <div class="card"><h2>달마다 <span class="row" style="margin-left:14px;font-weight:400"><button class="btn sm" data-ymstep="-1">‹</button><input type="month" id="dp-ym" value="${D.ym}" style="width:150px"><button class="btn sm" data-ymstep="1">›</button></span>
      <span class="row" style="margin-left:auto"><button class="btn sm primary" id="dp-xls" ${ws.length?'':'disabled'}>급여대장 엑셀 내려받기</button><button class="btn sm" id="dp-ins" ${ws.length?'':'disabled'}>4대보험 산출내역 엑셀</button><button class="btn sm" id="dp-insimp" ${p.workers.length?'':'disabled'} title="메일로 온 그달 4대보험료 산출내역(개인·기관부담금) 엑셀을 올리면 근로자마다 공제 칸에 들어갑니다">4대보험 고지 엑셀 올리기</button><input type="file" id="dp-insfile" accept=".xlsx" hidden></span></h2>
      <div class="desc">${yy}년 ${mm}월 · 일금 ${won(R.daily)}원 기준 (근로자마다 다르게 넣을 수 있음) · 근로자 ${ws.length}명 해당</div>
      ${ws.length?ws.map(w=>`<div class="wblock" data-wid="${w.id}"><div class="wbhead"><b>${esc(w.name)}</b><span class="faint">${fmtDate(w.hired)}${w.quit?` ~ ${fmtDate(w.quit)} 퇴직`:''}</span><button type="button" class="btn sm ghost" data-wreset="${w.id}" title="이 달 달력을 처음 상태로">달력 다시 채우기</button></div>${calHTML(w)}${sumHTML(w)}</div>`).join(''):'<div class="empty">이 달에 해당하는 근로자가 없습니다 (계약체결일·퇴직일을 확인하세요).</div>'}
      <p class="hint">칸의 상태를 바꾸면 바로 다시 계산됩니다. 근무일의 시간 칸은 기본 8 — 연가를 시간으로 쓰면 일한 시간만큼 줄이세요(나머지는 연차수당). 일요일의 [주휴]는 그 주 월~금이 모두 근무·연가·공가·공휴일·유급병가면 저절로 켜지고(달 첫 주는 지난달 기록으로), 눌러서 억지로 켜거나 끌 수 있습니다. 근로소득세·지방소득세는 간이세액표${taxTable()?`(${taxTable().eff} 시행)`:''}로 저절로 계산됩니다(칸에 적으면 그 숫자). 4대보험은 [4대보험 고지 엑셀 올리기]로 그달 고지 숫자를 한 번에 넣거나 칸에 직접 적으면 됩니다.</p></div>
    <div class="card"><h2 style="cursor:pointer" id="dp-cfgh">요율·공휴일 설정 <span class="faint" style="font-weight:400">${D.cfgOpen?'▴':'▾'} ${yy}년</span></h2>
      <div id="dp-cfg" ${D.cfgOpen?'':'hidden'}><div class="frow">
        ${[['daily','일금 (원)',1],['meal','식비 공제 (원)',1],['health','건강보험 (근로자·기관 각각, %)',100],['care','장기요양 (건강보험료의 %)',100],['pension','국민연금 (각각, %)',100],['emp','고용보험 (각각, %)',100],['empDev','고안직능 (기관만, %)',100],['accident','산재보험 (기관만, %)',100]].map(x=>`<div class="f"><span>${x[1]}</span><input class="num" data-rate="${x[0]}" value="${x[2]===1?cfg[x[0]]:+(cfg[x[0]]*100).toFixed(4)}"></div>`).join('')}
        <div class="f wide" style="grid-column:1/-1"><span>${yy}년 공휴일·근로자의 날 (한 줄에 하나, 2026-05-01 처럼)</span><textarea data-hol="${yy}" style="min-height:90px">${holidaysFor(yy).join('\n')}</textarea><div class="hint">${esc(cfg.note||'')} · 요율이 바뀌면 그 해 숫자만 고치면 됩니다. 총급여·실지급액은 10원 단위 올림(일의 자리가 있으면 다음 10원)입니다.</div></div>
      </div></div>
    ${(()=>{const tt=taxTable(); return `<div class="card"><h2>근로소득 간이세액표 <span class="faint" style="font-weight:400">${tt?`${esc(tt.eff||'')} 시행 · ${tt.rows.length}행${DS.taxtable?` · 올린 표 (${esc(DS.taxtable.src||'')}${DS.taxtable.at?`, ${fmtDate(DS.taxtable.at)} 올림`:''})`:' · 기본 표 (taxtable.js)'}`:'표 없음 — 근로소득세를 손으로 적어야 합니다'}</span>
      <span class="row" style="margin-left:auto"><button class="btn sm" id="dp-taximp">간이세액표 엑셀 올리기</button><input type="file" id="dp-taxfile" accept=".xlsx" hidden>${DS.taxtable?'<button class="btn sm ghost" id="dp-taxreset">기본 표로 되돌리기</button>':''}</span></h2>
      <div class="desc">국세청 홈택스에서 받은 <b>근로소득 간이세액표</b> 엑셀(.xlsx)을 올리면 그 표로 근로소득세를 셉니다. 표가 바뀌면(보통 해마다 2~3월) 새 파일을 올리면 됩니다. 올린 표는 내 자료에 저장되어 다음에도 그대로 쓰입니다.</div></div>`;})()}`;
  bindPay(pg,p);
}
function bindPay(pg,p){
  pg.onclick=e=>{const t=e.target;
    const yb=t.closest('[data-dyear]'); if(yb){D.year=+yb.dataset.dyear; D.proj=null; drawPay(); return;}
    const pc=t.closest('[data-dproj]'); if(pc){D.proj=+pc.dataset.dproj; drawPay(); return;}
    if(!p) return;
    if(t.id==='dw-add'){const w=mkWorker({daily:'',base:''}); p.workers.push(w); D.wedit=w.id; drawPay(); const i=$('tr.fedit input[data-wf="name"]',pg); if(i) i.focus(); return;}
    const we=t.closest('[data-wedit]'); if(we){D.wedit=+we.dataset.wedit; drawPay(); return;}
    const wc=t.closest('[data-wcancel]'); if(wc){const w=p.workers.find(x=>x.id===D.wedit); if(w&&!w.name) p.workers=p.workers.filter(x=>x!==w); D.wedit=null; drawPay(); return;}
    const wsv=t.closest('[data-wsave]'); if(wsv){const w=p.workers.find(x=>x.id===+wsv.dataset.wsave); if(!w) return; const tr=wsv.closest('tr');
      $$('[data-wf]',tr).forEach(i=>{const k=i.dataset.wf; if(i.type==='checkbox') w[k]=i.checked; else if(['daily','base','meal'].includes(k)) w[k]=num(i.value); else if(k==='deps') w[k]=Math.max(1,+i.value||1); else if(k==='child') w[k]=Math.max(0,+i.value||0); else w[k]=i.value.trim();});
      if(!w.name){alert('성명을 넣어 주세요.'); return;} D.wedit=null; drawPay(); return;}
    const wd=t.closest('[data-wdel]'); if(wd){const w=p.workers.find(x=>x.id===+wd.dataset.wdel); if(!w) return; if(!confirm(`"${w.name}" 님을 뺍니다. 달마다 넣은 근무 기록도 같이 사라집니다.`)) return; p.workers=p.workers.filter(x=>x!==w); Object.values(p.months).forEach(m=>{delete m.w[w.id];}); drawPay(); return;}
    const ys=t.closest('[data-ymstep]'); if(ys){const [y,m]=D.ym.split('-').map(Number); const d=new Date(y,m-1+(+ys.dataset.ymstep),1); D.ym=`${d.getFullYear()}-${pad2(d.getMonth()+1)}`; drawPay(); return;}
    const wr=t.closest('[data-wreset]'); if(wr){const w=p.workers.find(x=>x.id===+wr.dataset.wreset); if(!w) return; if(!confirm(`${w.name} 님의 ${D.ym} 달력을 처음 상태(평일 근무·공휴일)로 다시 채웁니다. 넣어 둔 연가·초과시간이 지워집니다.`)) return; const mr=monthRec(p,D.ym,true); mr.w[w.id]={days:defaultDays(p,w,D.ym),ot:{},hours:{},tax:(mr.w[w.id]||{}).tax||'',ins:(mr.w[w.id]||{}).ins||{},memo:'',weekly:{}}; drawPay(); return;}
    const wk=t.closest('[data-wk]'); if(wk){const [wid,d]=wk.dataset.wk.split('|'); const w=p.workers.find(x=>x.id===+wid); if(!w) return; const wm=workerMonth(p,w,D.ym,true); const [y,m]=D.ym.split('-').map(Number); const auto=(()=>{const save=wm.weekly[d]; delete wm.weekly[d]; const a=weeklyPaid(p,w,wm,y,m,+d); if(save!==undefined) wm.weekly[d]=save; return a;})(); const now=weeklyPaid(p,w,wm,y,m,+d); const want=!now; if(want===auto) delete wm.weekly[d]; else wm.weekly[d]=want?'on':'off'; drawPay(); return;}
    if(t.id==='dp-cfgh'){D.cfgOpen=!D.cfgOpen; drawPay(); return;}
    if(t.id==='dp-xls'){ t.disabled=true; downloadPayroll(p,D.ym).finally(()=>{t.disabled=false;}); return;}
    if(t.id==='dp-ins'){const r=insuranceWorkbook(p,D.ym); XL.download(r.blob,r.name); return;}
    if(t.id==='dp-insimp'){$('#dp-insfile',pg).click(); return;}
    if(t.id==='dp-taximp'){$('#dp-taxfile',pg).click(); return;}
    if(t.id==='dp-taxreset'){ if(!confirm('올린 간이세액표를 지우고 프로그램에 든 기본 표(taxtable.js)로 돌아갑니다.')) return; DS.taxtable=null; drawPay(); return; }
  };
  pg.onchange=e=>{const t=e.target; if(!p) return;
    if(t.id==='dp-ym'&&/^\d{4}-\d{2}$/.test(t.value)){D.ym=t.value; drawPay(); return;}
    if(t.id==='dp-insfile'){const f=t.files[0]; t.value=''; if(f) importInsFile(p,f); return;}
    if(t.id==='dp-taxfile'){const f=t.files[0]; t.value=''; if(f) importTaxFile(f); return;}
    const pf=t.dataset.pf; if(pf){ p[pf]=t.value.trim(); return; }
    const dd=t.dataset.day; if(dd){const [wid,d]=dd.split('|'); const w=p.workers.find(x=>x.id===+wid); if(!w) return; const wm=workerMonth(p,w,D.ym,true); wm.days[d]=t.value; if(t.value!=='work'){ delete wm.ot[d]; if(wm.hours) delete wm.hours[d]; } drawPay(); return;}
    const hr=t.dataset.hr; if(hr){const [wid,d]=hr.split('|'); const w=p.workers.find(x=>x.id===+wid); if(!w) return; const wm=workerMonth(p,w,D.ym,true); wm.hours=wm.hours||{}; const v=num(t.value); if(v===''||v>=8) delete wm.hours[d]; else wm.hours[d]=Math.max(0,v); drawPay(); return;}
    const ins=t.dataset.ins; if(ins){const [wid,k]=ins.split('|'); const w=p.workers.find(x=>x.id===+wid); if(!w) return; const wm=workerMonth(p,w,D.ym,true); const v=num(t.value); if(v==='') delete wm.ins[k]; else wm.ins[k]=v; drawPay(); return;}
    const tx=t.dataset.tax; if(tx){const w=p.workers.find(x=>x.id===+tx); if(!w) return; const wm=workerMonth(p,w,D.ym,true); wm.tax=num(t.value); drawPay(); return;}
    const rt=t.dataset.rate; if(rt){const [y]=D.ym.split('-').map(Number); const R=DS.rates[y]||(DS.rates[y]=Object.assign({},ratesFor(y),{note:`${y}년 — 직접 고침`})); const v=num(t.value); if(v==='') return; R[rt]=['daily','meal'].includes(rt)?v:v/100; drawPay(); return;}
    const hl=t.dataset.hol; if(hl){DS.holidays[hl]=t.value.split(/\r?\n/).map(x=>x.trim()).filter(x=>/^\d{4}-\d{2}-\d{2}$/.test(x)); drawPay(); return;}
  };
}

/* ================= app.js 와 잇는 부분 ================= */
function serialize(){ return JSON.parse(JSON.stringify({projects:DS.projects,rates:DS.rates,holidays:DS.holidays,tags:DS.tags,taxtable:DS.taxtable||null})); }
function load(d){
  DS.projects=((d&&d.projects)||[]).map(p=>mkDProject(p));
  DS.rates=Object.assign(JSON.parse(JSON.stringify(RATES_DEFAULT)),(d&&d.rates)||{});
  /* v4.6 때 저장된 2026 짐작 요율(장기요양 12.95%·산재 0.924%)이 손대지 않은 채 남아 있으면 고지서에 맞춘 요율로 바꿉니다 */
  const r26=DS.rates[2026]||DS.rates['2026']; if(r26&&Math.abs(r26.care-0.1295)<1e-9&&Math.abs(r26.accident-0.00924)<1e-9&&/공표 요율로 넣음/.test(r26.note||'')) DS.rates[2026]=JSON.parse(JSON.stringify(RATES_DEFAULT[2026]));
  DS.holidays=Object.assign(JSON.parse(JSON.stringify(HOLIDAYS_DEFAULT)),(d&&d.holidays)||{});
  DS.tags=(d&&Array.isArray(d.tags)&&d.tags.length)?d.tags.map(t=>typeof t==='string'?{n:t,end:t==='완료'}:{n:String(t.n||''),end:!!t.end}).filter(t=>t.n):JSON.parse(JSON.stringify(TAGS_DEFAULT));
  const tt=d&&d.taxtable; DS.taxtable=(tt&&Array.isArray(tt.rows)&&tt.rows.length&&Array.isArray(tt.at10000)&&tt.at10000.length===11)?{eff:String(tt.eff||''),rows:tt.rows.map(r=>r.map(Number)),at10000:tt.at10000.map(Number),src:String(tt.src||''),at:String(tt.at||'')}:null;
  D.year=null; D.proj=null; D.panel=null; D.editId=null; NEWD=null;
}
let MERGE_MAP=null;
/* 넘겨받기 — 다른 분 자료의 직접 사업을 내 것에 붙입니다 (번호를 새로 매김) */
function merge(d,fromName){
  MERGE_MAP={p:{},e:{},c:{}}; const out=[];
  ((d&&d.tags)||[]).forEach(t=>{const n=typeof t==='string'?t:(t&&t.n); if(n&&!tagOf(n)) DS.tags.push({n,end:!!(t&&t.end)});});
  ((d&&d.projects)||[]).forEach(raw=>{
    const p=mkDProject({...raw,id:undefined}); p.id=nid(); MERGE_MAP.p[raw.id]=p.id;
    p.entries=(raw.entries||[]).map(e=>{const ne=mkEntry({...e,id:undefined}); ne.id=nid(); MERGE_MAP.e[e.id]=ne.id; return ne;});
    p.cases=(raw.cases||[]).map(c=>{const nc=mkCase({...c,id:undefined}); nc.id=nid(); MERGE_MAP.c[c.id]=nc.id; return nc;});
    p.grants=(raw.grants||[]).map(g=>{const ng=mkGrant({...g,id:undefined}); ng.id=nid(); return ng;});
    const wm={}; p.workers=(raw.workers||[]).map(w=>{const nw=mkWorker({...w,id:undefined}); nw.id=nid(); wm[w.id]=nw.id; return nw;});
    p.months={}; Object.entries(raw.months||{}).forEach(([ym,m])=>{p.months[ym]={w:{}}; Object.entries((m&&m.w)||{}).forEach(([wid,rec])=>{ if(wm[wid]!=null) p.months[ym].w[wm[wid]]=JSON.parse(JSON.stringify(rec)); });});
    if(DS.projects.find(x=>x.alias===p.alias&&x.year===p.year)) p.alias=`${p.alias} (${fromName||'넘겨받음'})`;
    p.from=fromName||''; DS.projects.push(p); out.push(p.alias);
  });
  return out;
}
function remapRef(r){ if(!MERGE_MAP) return null; const d=MERGE_MAP.p[r.d]; if(d==null) return null;
  if(r.c!=null){ const c=MERGE_MAP.c[r.c]; return c!=null?{kind:'ddoc',d,c,doc:r.doc}:null; }
  const e=MERGE_MAP.e[r.e]; return e!=null?{kind:'ddoc',d,e,doc:r.doc}:null; }
function docLabel(doc){ const i=String(doc||'').indexOf('|'); return i<0?doc:doc.slice(i+1); }
function fileCtx(r){ const p=byId(r.d); if(!p) return {proj:'직접 사업',where:'(지워진 사업)',unit:''};
  if(r.c!=null){ const c=p.cases.find(x=>x.id===r.c); return {proj:p.alias,where:`현황 · ${c?`${c.no}. ${c.name||'(이름 없음)'}`:'(지워진 건)'} · ${docLabel(r.doc)}`,unit:c?(c.vendor||''):''}; }
  const e=p.entries.find(x=>x.id===r.e); return {proj:p.alias,where:`가계부 · ${e?(e.title||'(적요 없음)'):'(지워진 지출)'} · ${r.doc}`,unit:e?(e.vendor||''):''}; }
function fileYear(r){ const p=byId(r.d); return p?p.year:null; }
function draw(id){ if(id==='dsum') drawSum(); else if(id==='dnew') drawNew(); else if(id==='dledger') drawLedger(); else if(id==='dstat') drawStat(); else if(id==='dpay') drawPay(); }
function repaint(){ if(cur&&cur.view==='direct'&&D.panel) paintCase(); if(PAGE==='dledger') drawLedger(); if(PAGE==='dstat') drawStat(); }
function sameRef(a,b){ return a.d===b.d&&a.e===b.e&&a.c===b.c&&a.doc===b.doc; }
bindPanel();
window.DIRECT={draw,serialize,load,merge,remapRef,fileCtx,fileYear,repaint,sameRef,KINDS,calcWorker,payrollWorkbook,payData,downloadPayroll,insuranceWorkbook,readXlsx,parseLedgerRows,parseInsRows,importIns,taxFor,DS,D,mkDProject,mkWorker,importInto,matchProject,grantOf,spentOf,pendingOf};
})();
