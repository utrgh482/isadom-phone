/* =====================================================================
 *  이사돔 (e지도사업도움) — v4.6 (2026-09-17 · 단체 사업 구조 + 직접 사업 direct.js)
 *  파일로 열면 시안(예시 자료), 서버로 열면 진짜 자료. 맨 아래 SERVER 가 갈라 줍니다.
 *  v4.5: 개소/단체 표시 하나로 서류 단위가 바뀝니다 — 단체 사업은 단체마다 한 부, 12단계는 단체 × 업체,
 *        계약 판정은 개체 × 업체 합계, 여러 단체·소속 단체 칸, 선정은 단체 단위, 포기(개소: 농가 · 단체: 회원)
 * ===================================================================== */

/* ================= 기준 데이터 ================= */
const BOJO_JONG=[
 {code:'307-02',name:'민간경상사업보조'},
 {code:'402-02',name:'민간자본사업보조 (이전재원)'},
 {code:'402-01',name:'민간자본사업보조 (자체재원)'},
];
/* 용도 — 그 돈이 농가에서 무엇이 되는가. 재산 여부는 여기서 정해집니다. */
const YONGDO=[
 {name:'재료비',jasan:false},{name:'사무관리비',jasan:false},{name:'공공운영비',jasan:false},
 {name:'시험연구비',jasan:false},{name:'기타보상금',jasan:false},{name:'기간제근로자등보수',jasan:false},
 {name:'국내여비',jasan:false},{name:'시설비',jasan:true},{name:'자산취득비',jasan:true},
];
/* 계약 금액 기준 — 천원 단위 (국고보조금통합관리지침 제21조제2항) */
const GYEYAK=[
 {type:'물품·용역',g2b:20000,jungang:null},
 {type:'건설공사',g2b:200000,jungang:3000000},
 {type:'전문공사',g2b:100000,jungang:300000},
 {type:'그 밖의 공사',g2b:80000,jungang:null},
];
const LAYER={
 farm:  {unit:'농가',one:'수혜자',cnt:'명'},
 vendor:{unit:'업체',one:'업체',cnt:'곳'},
};

/* 단계 · 서류
   u:'common' = 해 공통 (그 해에 한 장이면 모든 사업에 쓰임)
   u:'each'   = 개별 — "개체"마다 한 장. 개체 = 개소 사업이면 농가 한 곳, 단체 사업이면 단체 하나.
                12단계는 개체 × 업체 한 쌍이 한 벌.
   if: 판정 결과에 따라 붙는 서류 · o: 해당시 */
const c=n=>({n,u:'common',o:0});
const e=(n,cond)=>Object.assign({n,u:'each',o:0},cond?{if:cond}:{});
const o=n=>({n,u:'each',o:1});
/* 단체 사업에서만 다른 단위 — gu:'member' 회원마다(경영체 확인서) · gu:'rep' 단체마다 한 부인데 대표 것(금융거래 확인서)
   나머지 개별 서류는 단체 사업이면 단체마다 한 부 (2026-09-17 본인 확정) */
const m=n=>({n,u:'each',o:0,gu:'member'});
const r=n=>({n,u:'each',o:0,gu:'rep'});
const GROUPS=[{name:'선정',span:7},{name:'교부',span:4},{name:'정산',span:3},{name:'그 외',span:1}];
const STAGES=[
 {no:1,name:'추진계획',unit:null,docs:[c('소득기술분야 시범사업 추진계획 공문'),c('위 공문 붙임 파일')]},
 {no:2,name:'사업신청서',unit:'farm',all:true,docs:[e('농업인이 제출한 신청서'),m('농업경영체 확인서'),r('금융거래 확인서')]},
 {no:3,name:'현지조사 계획',unit:null,docs:[c('소득팀 현지조사 계획 공문'),c('위 공문 붙임 파일')]},
 {no:4,name:'현지조사 결과',unit:null,docs:[c('결과 보고 공문'),c('위 공문 붙임 파일'),c('시범사업 현지조사표 (날인본)')]},
 {no:5,name:'심의회 계획',unit:null,docs:[c('여주시농업산학협동심의회 개최 계획 공문')]},
 {no:6,name:'심의회 결과',unit:null,docs:[c('심의회 개최 결과 공문'),c('위 공문 붙임 파일')]},
 {no:7,name:'선정결과 보고',unit:null,docs:[c('시범사업 대상자 선정 통보 공문')]},
 {no:8,name:'교부신청서',unit:'farm',docs:[e('지방보조금 교부 신청서'),e('사업계획서'),e('예산집행 계획서'),e('지방보조금 청구서'),
   e('지방보조사업자 관리카드'),e('통장 사본'),e('보조금 전용카드 발급 확인'),
   c('대상 농가 교육결과 보고 공문'),c('붙임 파일 (명단)'),c('대상 농가 교육계획'),c('붙임 파일 (교육 자료)'),c('청렴이행계약서')]},
 {no:9,name:'교부검토보고',unit:'farm',docs:[e('검토보고 공문'),e('보조금지원 검토보고서')]},
 {no:10,name:'교부결정통지',unit:'farm',docs:[e('보조금 교부 결정 통지 공문'),e('지방보조금 교부 결정 통지서')]},
 {no:11,name:'보조금 교부',unit:'farm',docs:[e('보조금 교부 공문'),e('나라장터(G2B) 계약 관련 서류','g2b')]},
 {no:12,name:'실적 보고',unit:'farm',pair:true,docs:[e('실적보고서'),e('거래내역 확인증'),e('전자세금계산서 또는 영수증'),e('사업자등록증'),
   e('통장 사본'),e('견적서'),e('산출내역'),e('사진대지'),e('부가가치세 환급 확인'),
   e('회계법인 정산 검증보고서','geomjeung'),e('중요재산 관리카드','jaesan'),
   o('계약서'),o('설계도면'),o('적합등록 필증'),o('직접생산확인증명서'),o('제품보증서'),o('청구서'),o('하자보수보증금 지급각서')]},
 {no:13,name:'정산결과보고',unit:'farm',docs:[e('정산검사 결과보고 공문'),e('보조사업 정산 검사서')]},
 {no:14,name:'보조금 확정',unit:'farm',docs:[e('지방보조금 확정 알림 공문'),e('보조금 확정 통지서'),e('정보공시 자료','gongsi')]},
 {no:15,name:'그 외',unit:'farm',docs:[e('이자 고지서'),e('이자 송금 내역'),e('표찰'),o('사업변경 신청서')]},
];

/* 단계별 시스템 메모 — 보탬e / e나라도움 */
const SYSMEMO={
 2:{b:'농가에게 위임장·신분증 사본 받아 정보취약계층관리(97016)에 등록',e:'업무대행 하려면 위임장과 금융정보제공동의서 필요'},
 5:{b:'자체공모사업등록(91034)에서 공모 내용 작성 후 [확정]',e:'기관자체공모관리에서 공모결과 등록'},
 7:{b:'자체공모사업선정결과(91042)에서 지방비·자부담 입력 후 [최종확정]',e:'보조사업자 지정 후 사업등록접수 → 사업등록확정'},
 8:{b:'수행사업계획신청(91043) → 수행사업계획검토(91044)에서 [접수]·[검토]',e:'교부신청 → 교부신청 접수'},
 9:{b:'온나라에서 교부검토보고 기안·결재',e:'교부결정 승인관리'},
 10:{b:'교부결정및통보(92029)에서 [교부결정]',e:'교부결정 및 통지'},
 11:{b:'e호조 공공민간(지방보조금)품의등록(21220) → [통보및품의연계]',e:'교부집행등록 및 교부이체 (예치형은 이체담당자가 OTP로 이체)'},
 12:{b:'집행관리(93001)에서 집행등록. 중요재산은 93011 등록 → 93013 공시',e:'집행등록. 상시점검으로 수시 검토받음'},
 13:{b:'집행마감(94001) → 검토대상 목록조회(94002)에서 [정산마감]',e:'집행마감 → 정산금액계산 → 정산보고서 생성·작성 → 확정'},
 14:{b:'실적보고서 등록(94008) → 실적보고서 심사(94009)에서 승인 전자결재요청',e:'정산보고서 확정 후 이자·잔액·수익금 반납'},
 15:{b:'이자는 세출과목으로 반납',e:'반납은 재원별로 경로가 다름'},
};

/* ================= 공용 도구 ================= */
let UID=1; const uid=()=>UID++;
const esc=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const won=n=>Number(n||0).toLocaleString();
const fmtNum=n=>(n===''||n==null||isNaN(+n))?'':Number(n).toLocaleString();
const toNum=v=>{const s=String(v).replace(/[^\d.\-]/g,'');if(s==='')return '';const n=parseFloat(s);return isNaN(n)?'':n;};
function hum(k){k=+k||0;if(!k)return '0원';const eok=Math.floor(k/100000),man=(k-eok*100000)/10;let s='';
  if(eok)s+=eok+'억';if(man)s+=(s?' ':'')+man.toLocaleString()+'만원';else if(eok)s+='원';return s;}
function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
const mmdd=d=>d?d.slice(5).replace('-','.'):'';
/* 날짜 칸 — 이것을 붙여야 브라우저가 연도를 네 자리로 받습니다 (안 붙이면 여섯 자리까지 들어갑니다) */
const DLIM='min="1900-01-01" max="2099-12-31"';
const $=(sel,root)=>(root||document).querySelector(sel);
const $$=(sel,root)=>[...(root||document).querySelectorAll(sel)];

/* ================= 서버 연결 ================= */
/* 파일에서 바로 열면(시안) 브라우저 안에서만 돌고 파일로 저장·불러오기를 합니다.
   서버로 열면(http://…:3010) 로그인이 진짜가 되고, 고칠 때마다 서버에 저절로 저장됩니다. */
const SERVER=/^https?:$/.test(location.protocol);
let ME=null, STATE_VERSION=0, SAVING=false, CONFLICT=false, RELOGIN=false, QUALI_LIST=[], SAVE_ERR='', HAS_ANY_USER=true;
async function api(url,opt){
  let r; try{ r=await fetch(url,Object.assign({credentials:'same-origin'},opt||{})); }catch(e){ return {ok:false,error:'서버에 연결하지 못했습니다.',net:true}; }
  let j; try{ j=await r.json(); }catch(e){ j={ok:false,error:`서버 응답을 읽지 못했습니다 (${r.status})`}; }
  if(!j.ok&&j.code==='NEED_LOGIN'&&LOGGED) sessionLost();
  return j;
}
const apiJSON=(url,method,body)=>api(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body||{})});
const hhmm=()=>{const d=new Date();return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;};
/* 주민등록번호 — 가려서 보이기 */
function fmtRrn(v){const d=String(v||'').replace(/\D/g,'').slice(0,13);return d.length>6?d.slice(0,6)+'-'+d.slice(6):d;}
function maskRrn(v){const d=String(v||'').replace(/\D/g,'');if(!d)return '';if(d.length<=6)return d;return d.slice(0,6)+'-'+d.slice(6,7)+'******';}

/* ================= 사업 · 수혜자 · 업체 · 계획 ================= */
const DEFAULT_CHECKS=['금융거래 확인서','경영체 등록증'];
/* 메모 — {날짜, 기한, 분류, 사업 별칭, 농가 이름, 제목, 내용, 상태} */
/*  상태 세 가지 :  '' 아직  →  '해결' 내가 처리해서 끝  →  '넘겨줌' 남에게 넘겨서 내 손을 떠남  */
let MEMOS=[], MEMO_CATS=['전화','부탁받음','서류','할 일'];
const M_ST=['','해결','넘겨줌'];
const M_NEXT={'':'해결','해결':'넘겨줌','넘겨줌':''};
const stLabel=v=>v||'아직';
const stClass=v=>v==='해결'?'on':(v==='넘겨줌'?'pass':'');
/* 상태 고르개 — 셋 중 아무거나 한 번 눌러 바로 바꿉니다 */
function stSegHTML(m){
  const cur=m.st||'';
  return `<span class="stseg">`+M_ST.map((v,i)=>`<button type="button" class="${cur===v?'on s'+i:''}" data-mset="${m.id}" data-st="${esc(v)}" title="${stLabel(v)}${euro(stLabel(v))} 바꾸기">${stLabel(v)}</button>`).join('')+`</span>`;
}
/* '해결로' · '넘겨줌으로' — 받침에 따라 조사를 고릅니다 (ㄹ 받침이거나 받침이 없으면 '로') */
function euro(w){const c=String(w||'').slice(-1).charCodeAt(0)-0xac00; if(c<0||c>11171) return '로'; const jong=c%28; return (jong===0||jong===8)?'로':'으로';}
const isFin=m=>!!m.st;                                  /* 아직이 아닌 것 = 끝난 것 */
const mkMemo=o=>{
  const m=Object.assign({id:uid(),date:today(),due:'',cat:'',alias:'',farm:'',title:'',body:'',st:'',stAt:''},o||{});
  /* 예전 자료는 아직/넘겨줌 두 가지였습니다 */
  if(m.done&&!m.st) m.st='넘겨줌';
  if(!m.stAt&&m.doneAt) m.stAt=m.doneAt;
  delete m.done; delete m.doneAt;
  if(!M_ST.includes(m.st)) m.st='';
  return m;
};
/* 수혜자(농가·회원). sel: '' 미정 · '선정' · '탈락'(심의에서 떨어짐) · '포기'(선정 뒤 그만둠 — 개소 사업)
   groupId: 단체 사업에서 소속 단체 · quit: 단체 사업에서 회원이 포기 · quitCk: 개소 사업 포기 서류 체크 */
const mkFarm=(name,o)=>{const f=Object.assign({id:uid(),role:'',name,rrn:'',addr:'',area:'',tel:'',sysId:'',sysPw:'',memo:'',sel:'',ck:{},groupId:null,quit:false,quitCk:{}},o||{});
  if(!['선정','탈락','포기'].includes(f.sel)) f.sel=''; f.quit=!!f.quit; if(!f.quitCk||typeof f.quitCk!=='object') f.quitCk={}; if(f.groupId!=null&&isNaN(+f.groupId)) f.groupId=null; return f;};
/* 단체 — 단체 사업의 "개체". sel 은 단체 단위로 정합니다 (미정 → 선정 → 탈락) */
const mkGroup=(name,o)=>{const g=Object.assign({id:uid(),name:name||'',sel:''},o||{}); if(g.sel!=='선정'&&g.sel!=='탈락') g.sel=''; return g;};
const QUIT_DOCS=['보조금 반납 확인','포기 공문'];   /* 개소 사업에서 농가가 포기하면 남는 서류 두 가지 */
const mkVendor=(name,tel,account)=>({id:uid(),name,tel:tel||'',account:account||'',calls:[]});
const mkLine=(farmId,o)=>Object.assign({id:uid(),farmId,item:'',qty:'',est:'',vendorId:null,recv:'',paid:'',actItem:'',act:'',method:'',vat:'',note:''},o||{});
const mkCrit=(o)=>Object.assign({items:'',form:'',areaMin:'',areaMax:'',needReg:false,needLocal:false,ageMin:'',ageMax:'',careerMin:'',noRepeat:'',free:''},o||{});
function mkProject(o){
  return Object.assign({farms:[],groups:[],vendors:[],lines:[],checks:DEFAULT_CHECKS.slice(),contractUnit:'farm',noVat:false,crit:mkCrit(),skip:[],owner:(ME&&ME.name)||'김유진',mine:true,
    _exp:new Set(),_vopen:false,_gclosed:new Set()},o);
}
function yearOf(p){
  if(p.start&&/^\d{4}/.test(p.start)) return +p.start.slice(0,4);
  const m=(p.full||'').match(/(\d{4})년/); if(m) return +m[1];
  if(p.end&&/^\d{4}/.test(p.end)) return +p.end.slice(0,4);
  return new Date().getFullYear();
}

/* 재원은 천원 단위 */
let PROJECTS=[
 mkProject({alias:'장미국화',full:'2026년 장미·국화 고품질 생산 시범사업',
  jeongchaek:'농업기술 보급',danwi:'소득기술 개발보급',sebu:'화훼 시범사업',pyeonseong:'307 민간이전',
  tong:'307-02',yongdo:'재료비',gukbi:0,dobi:24000,sibi:36000,jabudam:20000,
  start:'2026-03-01',end:'2026-11-30',gyeyakType:'물품·용역',
  crit:mkCrit({items:'장미, 국화',form:'시설',areaMin:300,needReg:true,needLocal:true,noRepeat:3,free:'시설 동고 5m 이상'})}),
 mkProject({alias:'ICT',full:'2026년 시설원예 ICT 융복합 확산 시범사업',
  jeongchaek:'농업기술 보급',danwi:'소득기술 개발보급',sebu:'시설원예 ICT',pyeonseong:'402 자본이전',
  tong:'402-02',yongdo:'자산취득비',gukbi:120000,dobi:0,sibi:0,jabudam:80000,
  start:'2026-03-01',end:'2026-12-15',gyeyakType:'물품·용역',
  crit:mkCrit({form:'시설',areaMin:1000,needReg:true,needLocal:true,ageMax:70,free:'스마트팜 교육 이수\n인터넷이 들어오는 하우스'})}),
 mkProject({alias:'꽃소비(자생)',full:'2026년 자생화 활용 생활 속 꽃 소비촉진 시범사업',
  tong:'307-02',yongdo:'재료비',gukbi:0,dobi:0,sibi:24000,jabudam:6000,
  start:'2026-04-01',end:'2026-10-31',gyeyakType:'물품·용역',
  crit:mkCrit({items:'자생화',needLocal:true,free:'단체(고유번호증) 회원'})}),
 mkProject({alias:'꽃소비(분화)',full:'2026년 분화류 소비확대 시범사업',
  tong:'307-02',yongdo:'재료비',gukbi:0,dobi:12000,sibi:18000,jabudam:10000,
  start:'2026-04-01',end:'2026-11-30',gyeyakType:'물품·용역',
  crit:mkCrit({items:'분화, 칼랑코에, 제라늄',needReg:true,needLocal:true})}),
 mkProject({alias:'꽃소비(절화)',full:'2026년 절화류 신수요 창출 시범사업',
  tong:'307-02',yongdo:'재료비',gukbi:0,dobi:14000,sibi:21000,jabudam:15000,
  start:'2026-04-01',end:'2026-11-30',gyeyakType:'물품·용역',
  crit:mkCrit({items:'절화, 장미, 국화',needLocal:true,free:'작목반 소속'})}),
 mkProject({alias:'꽃소비(국화)',full:'2026년 국화 소비촉진 및 품질고급화 시범사업',
  tong:'307-02',yongdo:'재료비',gukbi:0,dobi:20000,sibi:20000,jabudam:10000,
  start:'2026-03-01',end:'2026-11-30',gyeyakType:'물품·용역',
  crit:mkCrit({items:'국화',form:'시설',needReg:true,needLocal:true,noRepeat:2,free:'시설 동고 5m 이상'})}),
 mkProject({alias:'고품질절화',full:'2026년 고품질 절화 생산기반 조성 시범사업',
  tong:'402-01',yongdo:'시설비',gukbi:0,dobi:0,sibi:54000,jabudam:36000,
  start:'2026-03-01',end:'2026-11-30',gyeyakType:'건설공사',
  crit:mkCrit({items:'절화, 장미, 국화',form:'시설',areaMin:500,careerMin:3,needReg:true,needLocal:true,noRepeat:3})}),
];
PROJECTS.forEach(p=>p.year=yearOf(p));
if(SERVER) PROJECTS=[];   /* 서버에서는 예시 사업 없이 시작 — 내 자료는 로그인 뒤 서버에서 옵니다 */
const byAlias=a=>PROJECTS.find(p=>p.alias===a);

/* 예시 수혜자·업체·계획 — 화면을 보기 위한 가짜 자료 */
(function seedUnits(){ if(SERVER) return;
  /* 단체 사업 예시에는 단체를 붙입니다 (ensureGroups 가 이름 없는 단체 하나를 만들어 전원을 넣습니다) */
  const F=(p,names)=>{p.farms=names.map(n=>Array.isArray(n)?mkFarm(n[1],{role:n[0],sel:'선정'}):mkFarm(n,{sel:'선정'}));return p.farms;};
  const V=(p,name,tel,acct)=>{const v=mkVendor(name,tel,acct);p.vendors.push(v);return v;};
  const L=(p,f,v,item,qty,est,o)=>{const l=mkLine(f.id,Object.assign({item,qty,est,vendorId:v?v.id:null},o||{}));p.lines.push(l);return l;};
  let p,f,v1,v2,v3;

  p=byAlias('장미국화');
  f=F(p,['김정수','이미영','박상철','최은주','정한수','강미란','조성호','윤지혜','장민석','임순자','오경숙','서진우']);
  f[0].tel='010-****-0101'; f[0].addr='가남읍 예시로 12'; f[0].area='800'; f[0].sysId='kjs0101'; f[0].sysPw='botam1234'; f[0].ck={'금융거래 확인서':true,'경영체 등록증':true};
  v1=V(p,'여주농자재','031-***-0001','농협 ***-****-0001');
  v2=V(p,'경기원예자재','031-***-0002','');
  v3=V(p,'그린팜','031-***-0003','');
  v1.calls.push({date:'2026-08-20',memo:'세금계산서 8월분 발행 요청. 이번 주 안에 보내준다고 함'},
                {date:'2026-09-03',memo:'거래내역 확인증 3농가분 받음. 나머지 2농가는 아직'});
  v2.calls.push({date:'2026-09-01',memo:'견적서와 실제 납품 수량이 다름 — 다시 받기로'});
  f.slice(0,5).forEach(x=>L(p,x,v1,'장미 묘목 (삼바)',300,900000,{recv:'2026-05-12',paid:'2026-05-20',actItem:'장미 묘목 (삼바)',act:900000,method:'전용카드',vat:'면세'}));
  f.slice(5,9).forEach(x=>L(p,x,v2,'국화 삽수 (백마)',2000,600000,{recv:'2026-06-02',vat:'면세'}));
  f.slice(9).forEach(x=>L(p,x,v3,'양액 비료 세트',10,450000,{vat:'과세'}));
  /* 신청은 했지만 심의회에서 떨어진 두 사람 */
  p.farms.push(mkFarm('허남수',{sel:'탈락'}),mkFarm('배옥자',{sel:''}));

  p=byAlias('ICT');
  f=F(p,['신영식','권혜정','배준호']);
  v1=V(p,'스마트팜테크','02-***-0001',''); v2=V(p,'한국ICT농업','031-***-0004',''); v3=V(p,'팜링크','031-***-0005','');
  L(p,f[0],v1,'복합환경제어기',1,38000000,{recv:'2026-07-15',paid:'2026-07-30',actItem:'복합환경제어기',act:38000000,method:'계좌이체',vat:'과세'});
  L(p,f[1],v2,'양액기 + 센서',1,31000000,{recv:'2026-08-05',vat:'과세'});
  L(p,f[2],v3,'환경 모니터링 장비',1,29000000,{vat:'과세'});

  p=byAlias('꽃소비(자생)'); p.contractUnit='vendor'; p.noVat=true;
  f=F(p,[['대표','고은희'],['총무','문정숙'],['회원','홍성민'],['회원','남옥희'],['회원','노명자'],['회원','양승철'],
         ['회원','백현숙'],['회원','송기호'],['회원','안미경'],['회원','전상우'],['회원','하영란'],['회원','구본철'],
         ['회원','진혜숙'],['회원','마동수'],['회원','도경희'],['회원','허정민'],['회원','심재복'],['회원','표순옥']]);
  v1=V(p,'자생화원','031-***-0006','');
  f.slice(0,3).forEach(x=>L(p,x,v1,'자생화 모종 (구절초·벌개미취)',500,500000));

  p=byAlias('꽃소비(분화)'); p.contractUnit='vendor'; p.noVat=true;
  f=F(p,[['대표','김선희'],['총무','이병주'],['회원','박은정'],['회원','최광수'],['회원','정영자'],['회원','강태호']]);
  v1=V(p,'분화플라워','031-***-0007','');
  f.forEach(x=>L(p,x,v1,'분화 (칼랑코에 3.5치)',1200,1800000));

  p=byAlias('꽃소비(절화)');
  f=F(p,['조미숙']); v1=V(p,'절화도매','031-***-0008','');
  L(p,f[0],v1,'절화 포장재',3000,2400000);

  /* 올려주신 엑셀 모양 그대로 옮긴 예시 */
  p=byAlias('꽃소비(국화)'); p.contractUnit='vendor'; p.noVat=true;
  f=F(p,[['대표','박정순'],['총무','이경자'],['회원','김성태']]);
  f[0].addr='농산로 71'; f[0].area='1000'; f[0].tel='010-****-0001'; f[0].sysId='pjs0116'; f[0].sysPw='botam!2026'; f[0].ck={'금융거래 확인서':true,'경영체 등록증':true};
  f[1].addr='농산로 71'; f[1].area='2000'; f[1].tel='010-****-0002'; f[1].ck={'경영체 등록증':true};
  f[2].addr='농산로 71'; f[2].area='2000'; f[2].tel='010-****-0003'; f[2].ck={'경영체 등록증':true}; f[2].memo='통장 사본 다시 받기';
  v1=V(p,'베스트몸','',''); v2=V(p,'㈜보승농자재','010-****-0004',''); v3=V(p,'㈜코리아하이팜','031-***-0009','');
  [['8.10. 큐티버블앰버',2500,250000],['8.10. 화이트 버블',2500,250000],['8.10. 루미스타',2500,250000],['8.10. 라디버블',2500,250000],
   ['9.10. 큐티버블앰버',5000,500000],['9.10. 화이트 버블',5000,500000],['9.10. 루미스타',5000,500000],['9.10. 라디버블',5000,500000]]
   .forEach((x,i)=>L(p,f[0],v1,x[0],x[1],x[2],i<2?{recv:'2026-08-12',paid:'2026-08-14',actItem:x[0].replace(/^[\d.]+\s*/,''),act:x[2],method:'전용카드',vat:'면세'}:{vat:'면세'}));
  p.lineChagwang=L(p,f[0],v2,'차광시설','','',{vat:'과세'});
  [['5.8. 큐티버블',3000,300000],['5.8. 큐티버블앰버',3000,300000],['5.8. 화이트버블',4500,450000],['5.8. 루미스타',4500,450000],
   ['7.24. 큐티버블',3000,300000],['7.24. 큐티버블앰버',3000,300000],['7.24. 화이트버블',4500,450000],['7.24. 루미스타',4500,450000]]
   .forEach(x=>L(p,f[1],v1,x[0],x[1],x[2]));
  L(p,f[1],v3,'다겹 보온','','');
  [['5.8. 큐티버블',5000,500000],['5.8. 큐티버블앰버',5000,500000],['5.8. 화이트버블',5000,500000],
   ['7.24. 큐티버블',5000,500000],['7.24. 큐티버블앰버',5000,500000],['7.24. 화이트버블',5000,500000]]
   .forEach(x=>L(p,f[2],v1,x[0],x[1],x[2]));
  L(p,f[2],v2,'차광시설','','');
  p._exp.add(f[0].id);

  p=byAlias('고품질절화');
  f=F(p,['김태영','이현주']);
  v1=V(p,'절화자재상사','031-***-0010',''); v2=V(p,'여주시설건설','031-***-0011',''); v3=V(p,'대성하우스','031-***-0012','');
  L(p,f[0],v1,'절화 재배용 지주·네트',1,4500000,{vat:'과세'}); L(p,f[0],v2,'연동하우스 보강공사',1,40000000,{vat:'과세'});
  L(p,f[1],v1,'절화 재배용 지주·네트',1,4500000,{vat:'과세'}); L(p,f[1],v3,'하우스 측창 자동개폐',1,41000000,{vat:'과세'});
  /* 국화 사업은 단체 둘 — 여러 단체가 뽑히는 모양을 보기 위해 */
  p=byAlias('꽃소비(국화)'); const g1=mkGroup('여주 국화 작목반',{sel:'선정'}), g2=mkGroup('가남 국화 연구회',{sel:'선정'}); p.groups.push(g1,g2);
  p.farms.forEach(f=>f.groupId=g1.id);
  const extra=[['대표','한정희'],['회원','문성호'],['회원','오미란']].map(x=>mkFarm(x[1],{role:x[0],sel:'선정',groupId:g2.id})); p.farms.push(...extra);
  L(p,extra[0],p.vendors[0],'9.10. 큐티버블앰버',3000,300000,{vat:'면세'}); L(p,extra[1],p.vendors[0],'9.10. 루미스타',3000,300000,{vat:'면세'});
  PROJECTS.forEach(q=>{ if(isGroup(q)){ groupsOf(q).forEach(g=>{}); q.groupsMigrated=true; ensureGroups(q); } });
})();
/* 예시 메모 — 화면을 보기 위한 가짜 자료 */
(function seedMemos(){ if(SERVER) return;
  const d=n=>{const x=new Date();x.setDate(x.getDate()+n);return `${x.getFullYear()}-${String(x.getMonth()+1).padStart(2,'0')}-${String(x.getDate()).padStart(2,'0')}`;};
  MEMOS.push(
    mkMemo({date:d(0),due:d(1),cat:'전화',alias:'꽃소비(국화)',farm:'박정순',title:'통장 사본 다시 받기 — 농협 계좌 바뀜',body:'대표님 전화. 8월에 농협 통장을 새로 만들어서 교부신청서에 낸 사본이 옛날 것. 새 사본 사진으로 보내주기로 함. 받으면 8단계 통장 사본 다시 붙이기.'}),
    mkMemo({date:d(0),cat:'부탁받음',alias:'꽃소비(국화)',title:'팀장님 — 국화 사업 중간 실적 숫자 정리',body:'받음·입금 기준으로. 계획표 숫자 그대로 쓰면 됨. 목요일 팀 회의 전까지.',due:d(3)}),
    mkMemo({date:d(-3),cat:'서류',alias:'꽃소비(국화)',farm:'김성태',title:'김성태 회원 경영체 확인서 유효기간 지남',body:'농관원에서 다시 떼서 보내준다고 함. 오면 2단계 경영체 확인서 갈아 끼우기.',due:d(-1)}),
    mkMemo({date:d(-3),cat:'전화',alias:'ICT',farm:'신영식',title:'복합환경제어기 설치 날짜 미룸',body:'스마트팜테크 자재 지연. 사진대지는 설치 뒤에 받기로.'}),
    mkMemo({date:d(-5),cat:'할 일',alias:'꽃소비(국화)',farm:'박정순',title:'보승농자재 세금계산서 8월분 발행 확인',body:'발행 확인. 12단계에 붙임.',st:'해결',stAt:d(-4)}),
    mkMemo({date:d(-5),cat:'서류',alias:'장미국화',farm:'허남수',title:'허남수 탈락 통보 공문 발송',body:'심의회 결과 공문 나가면 같이. 전화로는 먼저 말씀드림.'}),
  );
})();

/* ================= 자동 판정 (시스템·계약·마감) ================= */
function pandan(p){
  const g=+p.gukbi||0, d=+p.dobi||0, s=+p.sibi||0, j=+p.jabudam||0;
  const total=g+d+s+j, bojo=g+d+s;
  const pct=x=>total?Math.round(x/total*100):0;
  const out={total,bojo,bojoRate:pct(bojo),jabuRate:pct(j),r:{g:pct(g),d:pct(d),s:pct(s),j:pct(j)},warns:[]};
  if(g>0){out.system='e나라도움';out.yechi='예치형';out.note='국비가 있어 e나라도움. 센터에서는 국비 사업을 예치형으로 처리합니다.';}
  else{out.system='보탬e';out.yechi='비예치형';out.note='국비가 없어 보탬e. 도비·시비 사업은 비예치형으로 처리합니다.';}
  const y=YONGDO.find(x=>x.name===p.yongdo);
  out.jaesan=!!(y&&y.jasan);
  if(out.jaesan) out.warns.push('재산이 생기는 사업입니다. 5~10년 사후관리 대상이라 농가가 마음대로 양도·폐기할 수 없습니다.');
  out.geomjeung=g>=100000;
  if(out.geomjeung) out.warns.push('국비 1억 이상이라 정산보고서를 회계법인에게 검증받아야 합니다. 검증기관은 사업 중에 미리 등록해두면 정산 때 몰리지 않습니다.');
  out.gongsi=(g>=10000)||((d+s)>=5000);
  out.jabu=j>0;
  const gy=GYEYAK.find(x=>x.type===p.gyeyakType)||GYEYAK[0];
  out.contractNote=`${gy.type}은 계약 한 건이 ${hum(gy.g2b)}을 넘으면 자체계약이 안 됩니다${gy.jungang?` (${hum(gy.jungang)} 이상은 중앙 조달)`:''}. 계약 한 건 = ${p.contractUnit==='vendor'?'단체 × 업체 (회원 전원이 그 업체에서 산 것을 전부 합쳐서)':'농가 × 업체 (그 농가가 그 업체에서 산 것을 전부 합쳐서)'}.`;
  return out;
}
/* ── 계약 — '계약 한 건' = 개체 × 업체 (본인 확정 2026-09-14 · 2026-09-17)
   단체 사업(대표 명의로 계산서): 단체마다 업체마다 한 계약 — 회원 전원이 그 업체에서 산 것을 전부 합침.
     같은 업체라도 단체가 다르면 따로. 같은 업체에서 두 번 사면 분리발주.
   개소 사업: 농가마다 계산서 → 농가 × 업체가 한 계약. 같은 업체를 여러 농가가 써도 따로. */
function g2bLimit(p){const gy=GYEYAK.find(x=>x.type===p.gyeyakType)||GYEYAK[0];return {g2b:gy.g2b*1000,jungang:gy.jungang?gy.jungang*1000:null,type:gy.type};}
/* 개체 열쇠 — 개소 사업은 농가 번호, 단체 사업은 'g단체번호' */
function entKeyOfFarm(p,f){ if(!f) return null; if(!isGroup(p)) return f.id; const g=groupOfFarm(p,f); return g?gkey(g):null; }
function contracts(p){
  const lim=g2bLimit(p), groups={};
  p.lines.forEach(l=>{ if(!l.vendorId) return; const f=p.farms.find(x=>x.id===l.farmId); const ek=entKeyOfFarm(p,f); if(ek==null) return;
    const key=`${ek}v${l.vendorId}`;
    const g=groups[key]||(groups[key]={key,entKey:ek,vendorId:l.vendorId,farmIds:new Set(),lines:[],sum:0}); g.farmIds.add(l.farmId); g.lines.push(l); g.sum+=(+l.est||+l.act||0); });
  return Object.values(groups).map(g=>{const v=p.vendors.find(x=>x.id===g.vendorId);
    return {...g,vendor:v,farmIds:[...g.farmIds],over:g.sum>lim.g2b,jungang:!!(lim.jungang&&g.sum>=lim.jungang),lim};});
}
function contractForEnt(p,entKey,vendorId){return contracts(p).find(c=>c.vendorId===vendorId&&String(c.entKey)===String(entKey));}
function contractFor(p,farmId,vendorId){const f=p.farms.find(x=>x.id===farmId); return contractForEnt(p,entKeyOfFarm(p,f),vendorId);}
function entHasG2B(p,entKey){return contracts(p).some(c=>c.over&&String(c.entKey)===String(entKey));}
function farmHasG2B(p,farmId){const f=p.farms.find(x=>x.id===farmId); const ek=entKeyOfFarm(p,f); return ek==null?false:entHasG2B(p,ek);}
function magam(p){
  if(!p.end) return [];
  const y=new Date(p.end).getFullYear();
  const endOfMonth=(yy,mm)=>new Date(yy,mm+1,0);
  const fmt=x=>`${x.getFullYear()}.${String(x.getMonth()+1).padStart(2,'0')}.${String(x.getDate()).padStart(2,'0')}`;
  const list=[
    {name:'실적보고서 제출',date:endOfMonth(y+1,1),memo:'회계연도 종료 후 2개월. 늦으면 다음 보조금이 깎입니다 (3개월 10%, 6개월 20%, 12개월 30%)'},
    {name:'정보공시',date:endOfMonth(y+1,3),memo:'회계연도 종료 후 4개월. 안 하면 시정명령, 불응하면 보조금 삭감'},
  ];
  const v=pandan(p);
  if(!v.gongsi) list.pop();
  if(v.jaesan) list.unshift({name:'중요재산 취득 보고',date:null,memo:'취득 후 15일 이내 보고, 접수 후 1개월 이내 공시 (국고 기준)'});
  return list.map(x=>({...x,fmt:x.date?fmt(x.date):'취득일 기준'}));
}
function ratioHTML(v){
  return `<div class="ratio">보조율 <b>${v.bojoRate}%</b> · 자부담 <b>${v.jabuRate}%</b>
    <span class="faint">— 국비 ${v.r.g} : 도비 ${v.r.d} : 시비 ${v.r.s} : 자부담 ${v.r.j}</span></div>`;
}

/* ================= 지원자격 판정 ================= */
function critEmpty(cr){return !(cr.items||cr.form||cr.areaMin!==''&&cr.areaMin!=null||cr.areaMax||cr.needReg||cr.needLocal||cr.ageMin||cr.ageMax||cr.careerMin||cr.noRepeat||cr.free);}
const splitList=s=>String(s||'').split(/[,\n·]/).map(x=>x.trim()).filter(Boolean);
/* a = 신청자 {item, form, area, reg, local, age, career, lastYears(마지막 수혜가 몇 년 전인지, ''=없음)} */
function elig(p,a){
  const cr=p.crit||mkCrit();
  if(critEmpty(cr)) return {none:true,ok:false,reasons:[],free:[]};
  const reasons=[];
  const items=splitList(cr.items);
  if(items.length){const it=(a.item||'').trim();
    if(!it) reasons.push('품목을 넣어주세요 ('+items.join('·')+')');
    else if(!items.some(x=>it.includes(x)||x.includes(it))) reasons.push(`품목이 다릅니다 (${items.join('·')}만)`);}
  if(cr.form&&a.form&&cr.form!==a.form) reasons.push(`재배형태 ${cr.form}만`);
  if(cr.form&&!a.form) reasons.push(`재배형태(${cr.form}) 확인`);
  const area=toNum(a.area);
  if(cr.areaMin!==''&&cr.areaMin!=null&&area!==''&&area<+cr.areaMin) reasons.push(`면적 ${won(cr.areaMin)}평 이상만`);
  if(cr.areaMax&&area!==''&&area>+cr.areaMax) reasons.push(`면적 ${won(cr.areaMax)}평 이하만`);
  if(cr.needReg&&a.reg==='no') reasons.push('경영체 등록이 되어 있어야 합니다');
  if(cr.needLocal&&a.local==='no') reasons.push('관내(여주시) 농가만');
  const age=toNum(a.age);
  if(cr.ageMin&&age!==''&&age<+cr.ageMin) reasons.push(`만 ${cr.ageMin}세 이상만`);
  if(cr.ageMax&&age!==''&&age>+cr.ageMax) reasons.push(`만 ${cr.ageMax}세 이하만`);
  const career=toNum(a.career);
  if(cr.careerMin&&career!==''&&career<+cr.careerMin) reasons.push(`영농경력 ${cr.careerMin}년 이상만`);
  if(cr.noRepeat&&a.lastYears!==''&&a.lastYears!=null&&+a.lastYears<+cr.noRepeat) reasons.push(`최근 ${cr.noRepeat}년 안에 같은 사업 수혜가 있으면 안 됩니다`);
  return {none:false,ok:!reasons.length,reasons,free:splitList(cr.free)};
}
function critSummary(cr){
  const out=[];
  if(cr.items) out.push('품목 '+splitList(cr.items).join('·'));
  if(cr.form) out.push('재배형태 '+cr.form);
  if(cr.areaMin!==''&&cr.areaMin!=null) out.push(`면적 ${won(cr.areaMin)}평 이상`);
  if(cr.areaMax) out.push(`면적 ${won(cr.areaMax)}평 이하`);
  if(cr.needReg) out.push('경영체 등록 필수');
  if(cr.needLocal) out.push('관내 농가만');
  if(cr.ageMin) out.push(`만 ${cr.ageMin}세 이상`);
  if(cr.ageMax) out.push(`만 ${cr.ageMax}세 이하`);
  if(cr.careerMin) out.push(`영농경력 ${cr.careerMin}년 이상`);
  if(cr.noRepeat) out.push(`최근 ${cr.noRepeat}년 중복수혜 제외`);
  return out;
}

/* ================= 서류 상태 ================= */
/* 개별 서류: S[별칭].u[수혜자·업체id][단계] = [0 아직 · 1 갖춤 · 2 해당없음 ...]  (그 단계의 개별 서류 순서대로)
   공통 서류: C[연도][단계] = {arr:[...], excl:[빠지는 사업 별칭]} */
const S={}, C={};
function docsCommon(si){return STAGES[si].docs.filter(d=>d.u==='common');}
/* ── 개체 — 개소 사업은 농가, 단체 사업은 단체 ──
   단위 열쇠: 농가는 숫자(농가 번호), 단체는 'g번호', 12단계 쌍은 '개체열쇠 v 업체번호' */
function isGroup(p){return p.contractUnit==='vendor';}   /* function 으로 둔 이유: 위쪽 예시 자료 코드가 먼저 부릅니다 */
function gkey(g){return 'g'+g.id;}
function isGkey(u){return /^g\d+/.test(String(u));}
function groupsOf(p){if(!p.groups) p.groups=[]; return p.groups;}
function groupOfFarm(p,f){return (f&&f.groupId!=null)?groupsOf(p).find(g=>g.id===f.groupId)||null:null;}
function membersOf(p,g){return p.farms.filter(f=>f.groupId===g.id);}
function repOf(p,g){return membersOf(p,g).find(f=>f.role==='대표')||null;}
function selGroups(p){return groupsOf(p).filter(g=>g.sel==='선정');}
function groupLabel(g){return g.name||'(이름 없는 단체)';}
/* 단체를 서류 단위로 쓸 때의 겉모양 — 농가 객체와 같은 자리(id·name·sel…)를 갖게 해서 목록 코드가 그대로 돕니다 */
function unitDesc(p,g){const ms=membersOf(p,g), rep=repOf(p,g); return {id:gkey(g),isGroup:true,g,name:groupLabel(g),role:'',tel:'',sel:g.sel,members:ms,rep,active:ms.filter(f=>!f.quit).length};}
/* 단체 사업인데 단체가 없으면(예전 자료·방금 등록) 이름 없는 단체 하나에 전원을 넣습니다. 예전 자료의 농가별 서류 체크는 단체로 옮깁니다 */
function ensureGroups(p){
  if(!p.groups) p.groups=[];
  if(!isGroup(p)) return;
  const orphan=p.farms.filter(f=>f.groupId==null||!p.groups.find(g=>g.id===f.groupId));
  if(!p.groups.length||orphan.length){
    let g=p.groups.find(x=>!x.name); if(!g){g=mkGroup(''); p.groups.push(g);}
    orphan.forEach(f=>f.groupId=g.id);
    if(!g.sel&&membersOf(p,g).some(f=>f.sel==='선정')) g.sel='선정';
  }
  if(!p.groupsMigrated){ migrateGroupDocs(p); p.groupsMigrated=true; }
}
function migrateGroupDocs(p){
  const b=bucket(p);
  groupsOf(p).forEach(g=>{
    const ms=membersOf(p,g), gk=gkey(g);
    STAGES.forEach((s,si)=>{
      if(!hasEach(si)) return;
      const gdocs=STAGES[si].docs.filter(d=>d.u==='each'&&d.gu!=='member');
      const merge=(fromKeys,toKey)=>{ const to=dmap(p,si,toKey);
        gdocs.forEach(d=>{ const vals=fromKeys.map(k=>((b.u[k]||{})[si]||{})[d.n]).filter(v=>v!=null); if(!vals.length||(d.n in to)) return;
          to[d.n]=vals.includes(1)?1:(vals.every(v=>v===2)?2:0); });
        FILES.forEach(f=>{const r=f.ref; if(r&&r.kind==='doc'&&r.a===p.alias&&r.si===si&&r.unit!=null&&fromKeys.includes(String(r.unit))&&gdocs.some(d=>d.n===r.doc)) r.unit=toKey;}); };
      if(s.pair){ const vids=new Set(); ms.forEach(f=>p.lines.filter(l=>l.farmId===f.id&&l.vendorId).forEach(l=>vids.add(l.vendorId)));
        vids.forEach(vid=>merge(ms.map(f=>`${f.id}v${vid}`),`${gk}v${vid}`)); }
      else merge(ms.map(f=>String(f.id)),gk);
    });
  });
}
function docsEach(p,si,unitId){
  const v=pandan(p), grp=isGroup(p), gk=unitId!=null&&isGkey(unitId);
  return STAGES[si].docs.filter(d=>{ if(d.u!=='each') return false;
    if(grp&&unitId!=null){ const want=d.gu==='member'?'member':'group'; if((gk?'group':'member')!==want) return false; }
    if(!d.if) return true;
    if(d.if==='g2b') return unitId!=null&&entHasG2B(p,String(unitId).split('v')[0]);
    return !!v[d.if]; });
}
/* 12단계는 개체 × 업체 한 쌍이 한 벌 — 단위 id는 '개체열쇠 v 업체id' */
const pairId=(entKey,vendorId)=>`${entKey}v${vendorId}`;
function entKeyOfUnit(u){return String(u).split('v')[0];}
function farmIdOfUnit(u){const k=entKeyOfUnit(u); return isGkey(k)?null:+k;}
function vendorIdOfUnit(u){const s=String(u).split('v');return s.length>1?+s[1]:null;}
/* 단위 열쇠 → 개체 (농가 또는 단체) */
function entityOfUnit(p,u){ const k=entKeyOfUnit(u);
  if(isGkey(k)){const g=groupsOf(p).find(x=>gkey(x)===k); return g?{kind:'group',g,desc:unitDesc(p,g),key:k,name:groupLabel(g)}:null;}
  const f=p.farms.find(x=>x.id===+k); return f?{kind:'farm',f,key:f.id,name:f.name}:null; }
function selFarms(p){return p.farms.filter(f=>f.sel==='선정');}
function farmVendors(p,f){const ids=[...new Set(p.lines.filter(l=>l.farmId===f.id&&l.vendorId).map(l=>l.vendorId))];return ids.map(id=>p.vendors.find(v=>v.id===id)).filter(Boolean);}
function groupVendors(p,g){const fids=new Set(membersOf(p,g).map(f=>f.id)); const ids=[...new Set(p.lines.filter(l=>fids.has(l.farmId)&&l.vendorId).map(l=>l.vendorId))];return ids.map(id=>p.vendors.find(v=>v.id===id)).filter(Boolean);}
function entVendors(p,ent){return ent.kind==='group'?groupVendors(p,ent.g):farmVendors(p,ent.f);}
function unitVendors(p,u){const ent=entityOfUnit(p,u); return ent?entVendors(p,ent):[];}
function hasEach(si){return STAGES[si].docs.some(d=>d.u==='each');}
function unitOf(p,si){return STAGES[si].unit;}
/* 2단계(사업신청서)는 신청자(신청 단체) 전원, 그 뒤 단계는 선정된 것만.
   개소 사업 → 농가, 단체 사업 → 단체 */
function unitsOf(p,si){const s=STAGES[si]; if(s.unit!=='farm') return [];
  if(isGroup(p)){ ensureGroups(p); return (s.all?groupsOf(p):selGroups(p)).map(g=>unitDesc(p,g)); }
  return s.all?p.farms:selFarms(p);}
/* 단체 사업 2단계의 회원별 서류(경영체 확인서) 대상 = 신청 단체의 회원 전원 */
function memberUnitsOf(p,si){ if(!isGroup(p)||!STAGES[si].all) return []; ensureGroups(p); return p.farms.filter(f=>groupOfFarm(p,f)); }
function unitById(p,si,key){ if(isGkey(key)){const g=groupsOf(p).find(x=>gkey(x)===String(key)); return g?unitDesc(p,g):null;} return p.farms.find(f=>f.id===+key)||null; }
function entWord(p){return isGroup(p)?'단체':'농가';}
function bucket(p){return S[p.alias]||(S[p.alias]={u:{}});}
/* 개별 서류 상태는 서류 이름으로 저장합니다 — 재원을 고쳐 조건부 서류가 붙고 빠져도 안 밀립니다 */
function dmap(p,si,unitId){const b=bucket(p), st=b.u[unitId]||(b.u[unitId]={}); return st[si]||(st[si]={});}
function arrFor(p,si,unitId){const m=dmap(p,si,unitId); return docsEach(p,si,unitId).map(d=>(d.n in m)?m[d.n]:(d.o?2:0));}
function setDoc(p,si,unitId,i,val){const d=docsEach(p,si,unitId)[i]; if(d) dmap(p,si,unitId)[d.n]=val;}
/* 단계 빼기 — 사업마다 안 쓰는 단계 */
function isSkipped(p,si){return (p.skip||[]).includes(STAGES[si].no);}
function stageUsed(p,si){
  if(hasEach(si)&&isSkipped(p,si)) return false;
  if(!hasEach(si)&&docsCommon(si).length&&!commonApplies(p.year,si,p)) return false;
  return true;
}
function setStageUsed(p,si,on){
  const no=STAGES[si].no; p.skip=(p.skip||[]).filter(x=>x!==no); if(!on&&hasEach(si)) p.skip.push(no);
  if(docsCommon(si).length){const st=cstore(p.year,si); st.excl=st.excl.filter(a=>a!==p.alias); if(!on) st.excl.push(p.alias);}
}
function cstore(year,si){const y=C[year]||(C[year]={});return y[si]||(y[si]={arr:docsCommon(si).map(()=>0),excl:[]});}
function docStat(arr){
  const have=arr.filter(v=>v===1).length, na=arr.filter(v=>v===2).length, need=arr.length-na;
  return {have,need,done:need>0&&have===need,any:have>0,empty:arr.length===0};
}
function cellStat(p,si){
  if(!hasEach(si)) return {kind:'none',have:0,need:0,done:false,any:false};
  if(isSkipped(p,si)) return {kind:'skip',have:0,need:0,done:false,any:false,skip:true};
  const units=unitsOf(p,si), L=unitOf(p,si), s=STAGES[si];
  const quit=isGroup(p)?p.farms.filter(f=>f.quit).length:p.farms.filter(f=>f.sel==='포기').length;
  if(!units.length) return {kind:L,units:0,doneUnits:0,have:0,need:0,done:false,any:false,nounit:true,quit};
  let have=0,need=0,doneUnits=0,any=false,none=true,pairs=0,donePairs=0;
  if(s.pair){
    units.forEach(u=>{const vs=unitVendors(p,u.id); let fd=vs.length>0;
      vs.forEach(v=>{const d=docStat(arrFor(p,si,pairId(u.id,v.id)));have+=d.have;need+=d.need;pairs++;if(d.done)donePairs++;if(!d.done)fd=false;if(d.any)any=true;if(!d.empty)none=false;});
      if(fd)doneUnits++;});
  }else units.forEach(u=>{const d=docStat(arrFor(p,si,u.id));have+=d.have;need+=d.need;if(d.done)doneUnits++;if(d.any)any=true;if(!d.empty)none=false;});
  /* 단체 사업 2단계 — 단체마다 내는 서류 + 회원마다 내는 서류(경영체 확인서) */
  let mUnits=0,mDone=0;
  if(isGroup(p)&&s.all){ memberUnitsOf(p,si).forEach(f=>{const d=docStat(arrFor(p,si,f.id));have+=d.have;need+=d.need;mUnits++;if(d.done)mDone++;if(d.any)any=true;if(!d.empty)none=false;}); }
  const done=doneUnits===units.length&&(!mUnits||mDone===mUnits);
  return {kind:L,units:units.length,doneUnits,have,need,done,any,nounit:false,none,pairs,donePairs,mUnits,mDone,quit};
}
function commonStat(year,si){const st=cstore(year,si);return docStat(st.arr);}
function commonApplies(year,si,p){return !cstore(year,si).excl.includes(p.alias);}
function projStat(p){
  let h=0,n=0;
  STAGES.forEach((s,si)=>{
    const c=cellStat(p,si); h+=c.have; n+=c.need;
    if(docsCommon(si).length&&commonApplies(p.year,si,p)){const d=commonStat(p.year,si);h+=d.have;n+=d.need;}
  });
  return {have:h,need:n};
}

/* 예시 진행 상태 */
(function seedProgress(){ if(SERVER) return;
  const upto={'장미국화':14,'ICT':11,'꽃소비(자생)':13,'꽃소비(분화)':10,'꽃소비(절화)':9,'꽃소비(국화)':8,'고품질절화':5};
  PROJECTS.forEach(p=>{
    const up=upto[p.alias]; if(up==null) return;
    STAGES.forEach((s,si)=>{
      if(!hasEach(si)) return;
      const us=unitsOf(p,si);
      const units=STAGES[si].pair?us.flatMap(u=>unitVendors(p,u.id).map(v=>pairId(u.id,v.id))):us.map(u=>u.id).concat(memberUnitsOf(p,si).map(f=>f.id));
      units.forEach((uid_,ui)=>{
        const dl=docsEach(p,si,uid_), full=()=>dl.map(d=>d.o?2:1), half=()=>dl.map((d,i)=>d.o?2:(i<Math.ceil(dl.length/2)?1:0));
        let arr=null;
        if(si<up) arr=full();
        else if(si===up){const fr=ui/units.length; arr=fr<0.5?full():(fr<0.8?half():null);}
        if(arr) arr.forEach((v,i)=>setDoc(p,si,uid_,i,v));
      });
    });
  });
  /* 2026년 공통 서류: 1~7단계는 다 갖춤, 4단계 현지조사표만 아직, 8단계 공통은 반쯤 */
  STAGES.forEach((s,si)=>{
    const cd=docsCommon(si); if(!cd.length) return;
    const st=cstore(2026,si);
    st.arr=cd.map((d,i)=>(si===3&&i===2)?0:(si===7?(i<3?1:0):1));
  });
})();

/* ================= 첨부 (스캔·사진) ================= */
/* ref = {kind:'doc', a, si, unit, doc} 개별 서류 · {kind:'cdoc', year, si, doc} 공통 서류 · {kind:'line', a, line} 계획표 물품 */
const FILES=[];
const fpick=$('#fpick');
let pickCb=null,pickRef=null;
fpick.addEventListener('change',async()=>{
  const fl=[...fpick.files]; fpick.value='';
  const cb=pickCb, ref=pickRef; pickCb=null; pickRef=null;
  if(!fl.length) return;
  const added=SERVER?await uploadFiles(fl,ref):addFiles(fl,ref); if(cb&&added.length) cb(added);
});
/* 서버 판: 파일 하나씩 몸통째로 보냅니다 (이름은 헤더에). 서버가 잠가서(암호화) 보관합니다 */
async function uploadFiles(list,ref){
  const out=[];
  for(const file of list){
    let r; try{ const res=await fetch('/api/files',{method:'POST',credentials:'same-origin',headers:{'x-file-name':encodeURIComponent(file.name),'Content-Type':file.type||'application/octet-stream'},body:file}); r=await res.json(); }catch(e){ r={ok:false,error:'서버에 연결하지 못했습니다.'}; }
    if(!r.ok){ if(r.code==='NEED_LOGIN') sessionLost(); else alert(`"${file.name}" 을 올리지 못했습니다: ${r.error||''}`); continue; }
    const f={id:r.file.id,name:r.file.name,type:r.file.type||'',size:r.file.size,blob:null,url:`/api/files/${r.file.id}`,tags:[],ref:JSON.parse(JSON.stringify(ref)),added:r.file.added||today()};
    FILES.push(f); out.push(f);
  }
  return out;
}
function pickFiles(ref,cb){pickRef=ref;pickCb=cb;fpick.click();}
function addFiles(list,ref){
  return list.map(file=>{const f={id:uid(),name:file.name,type:file.type||'',size:file.size,blob:file,url:URL.createObjectURL(file),
    tags:[],ref:JSON.parse(JSON.stringify(ref)),added:today()};FILES.push(f);return f;});
}
function sameRef(a,b){
  if(!a||!b||a.kind!==b.kind) return false;
  if(a.kind==='line') return a.a===b.a&&a.line===b.line;
  if(a.kind==='memo') return a.id===b.id;
  if(a.kind==='cdoc') return a.year===b.year&&a.si===b.si&&a.doc===b.doc;
  if(a.kind==='ddoc') return window.DIRECT?DIRECT.sameRef(a,b):(a.d===b.d&&a.e===b.e&&a.doc===b.doc);
  return a.a===b.a&&a.si===b.si&&String(a.unit==null?'':a.unit)===String(b.unit==null?'':b.unit)&&a.doc===b.doc;
}
function filesFor(ref){return FILES.filter(f=>sameRef(f.ref,ref));}
function removeFile(f){ if(SERVER&&f.id&&!f.blob) api(`/api/files/${f.id}`,{method:'DELETE'}); else { try{URL.revokeObjectURL(f.url);}catch(e){} } const i=FILES.indexOf(f); if(i>=0) FILES.splice(i,1);}
/* 이 스캔이 어느 해 것인가 — 붙어 있는 사업(또는 메모)의 해를 따릅니다 */
function fileYear(f){
  const r=f.ref||{};
  if(r.kind==='cdoc') return +r.year||null;
  if(r.kind==='ddoc') return window.DIRECT?DIRECT.fileYear(r):null;
  if(r.kind==='memo'){const m=MEMOS.find(x=>x.id===r.id); return m&&m.date?+String(m.date).slice(0,4):null;}
  if(r.a){const p=byAlias(r.a); if(p) return p.year;}
  return f.added?+String(f.added).slice(0,4):null;
}
function fileCtx(f){
  const r=f.ref;
  if(r.kind==='memo'){const m=MEMOS.find(x=>x.id===r.id); return m?{proj:m.alias||'메모',where:m.alias?`메모 · ${m.title}`:m.title,unit:m.farm||''}:{proj:'메모',where:r.id?'(지워진 메모)':'(아직 저장 안 한 메모)',unit:''};}
  if(r.kind==='cdoc'){const s=STAGES[r.si];return {proj:`${r.year}년 공통`,where:`${s.no}단계 ${s.name} · ${r.doc}`,unit:''};}
  if(r.kind==='ddoc') return window.DIRECT?DIRECT.fileCtx(r):{proj:'직접 사업',where:r.doc||'',unit:''};
  const p=byAlias(r.a); if(!p) return {proj:r.a,where:'(지워진 사업)',unit:''};
  if(r.kind==='line'){
    const ln=p.lines.find(l=>l.id===r.line), fm=ln&&p.farms.find(x=>x.id===ln.farmId);
    return {proj:p.alias,where:`계획표 · ${ln?(ln.item||'물품'):'(지워진 줄)'}`,unit:fm?fm.name:''};
  }
  const s=STAGES[r.si]; let unit='';
  if(r.unit!=null){const ent=entityOfUnit(p,r.unit), vid=vendorIdOfUnit(r.unit), v=vid?p.vendors.find(x=>x.id===vid):null;
    unit=[ent?ent.name:'',v?v.name:''].filter(Boolean).join(' · ');}
  return {proj:p.alias,where:`${s.no}단계 ${s.name} · ${r.doc}`,unit};
}
function fileSearchText(f){const c=fileCtx(f);return [f.name,...f.tags,c.proj,c.where,c.unit].join(' ').toLowerCase();}
const isImg=f=>/^image\//.test(f.type)&&!/heic|heif/i.test(f.type);
const isPdf=f=>f.type==='application/pdf'||/\.pdf$/i.test(f.name||'');
const extOf=f=>{const m=(f.name||'').match(/\.([a-z0-9]+)$/i);return m?m[1].toUpperCase():'파일';};
function thumbHTML(f,attrs,cls,tag){
  const T=tag||'button';
  return `<${T} ${T==='button'?'type="button"':''} class="thumb ${cls||''} ${isImg(f)?'':'file'}" ${attrs||''} title="${esc(f.name)}">${isImg(f)?`<img src="${f.url}" alt="">`:`<span class="pdf">${esc(extOf(f))}</span>`}</${T}>`;
}
function repaintFiles(){
  if(cur&&(cur.view==='docs'||cur.view==='common')) paintPanel();
  if(PAGE==='files') drawFiles();
  if(PAGE==='detail'&&subtab==='plan'){const p=byAlias(detailOf); if(p){renderFarmTable(p);refreshTotals(p);}}
  if(PAGE==='detail'&&subtab==='sum') drawDetail();
  if(PAGE==='grid') renderGrid();
  if(PAGE==='memo'){ paintMemoList(); paintMemoFormFiles(); }
  if(window.DIRECT) DIRECT.repaint();
}

/* ---------- 뷰어 ---------- */
const viewer=$('#viewer');
let VW=null;
function openViewer(ids,i,ref,title){
  VW={ids:ids.slice(),i:Math.max(0,Math.min(i||0,Math.max(ids.length-1,0))),ref:ref||null,title:title||''};
  renderViewer(); viewer.hidden=false; viewer.focus();
}
function closeViewer(){viewer.hidden=true;VW=null;}
function renderViewer(){
  if(!VW) return;
  const files=VW.ids.map(id=>FILES.find(f=>f.id===id)).filter(Boolean); VW.ids=files.map(f=>f.id);
  if(VW.i>=files.length) VW.i=Math.max(files.length-1,0);
  const f=files[VW.i], ctx=f?fileCtx(f):null;
  $('#v-title').textContent=VW.title||(ctx?`${ctx.proj} · ${ctx.where}`:'첨부');
  $('#v-count').textContent=files.length?`${VW.i+1} / ${files.length}`:'';
  const stage=$('#v-stage');
  if(!f) stage.innerHTML=`<div class="nopreview">아직 붙인 파일이 없습니다.<br>아래 [+ 추가]로 스캔이나 사진을 붙이세요.</div>`;
  else if(isImg(f)) stage.innerHTML=`<img src="${f.url}" alt="${esc(f.name)}" onerror="this.outerHTML='<div class=nopreview>이 그림 파일은 브라우저가 못 엽니다 (HEIC 등).<br>내려받아서 여세요.</div>'">`;
  else if(isPdf(f)&&SERVER) stage.innerHTML=`<div class="pdfbox"><object data="${f.url}" type="application/pdf" class="pdfobj"><div class="nopreview">이 브라우저에서는 PDF 미리보기가 꺼져 있습니다.<br>오른쪽 [내려받기]나 [새 창에서]로 여세요.</div></object></div>`;
  else if(isPdf(f)){
    /* 파일에서 바로 연 시안에서는 blob 주소의 PDF 가 흰 화면으로 나오는 브라우저가 있어, 파일 내용을 통째로 넣은 data 주소로 보여줍니다 */
    stage.innerHTML=`<div class="nopreview">PDF 여는 중…</div>`;
    const cur_=f;
    (f._data?Promise.resolve(f._data):blobToDataURL(f.blob).then(d=>{f._data=d;return d;})).then(d=>{
      if(!VW||VW.ids[VW.i]!==cur_.id) return;
      stage.innerHTML=`<div class="pdfbox"><object data="${d}" type="application/pdf" class="pdfobj"><div class="nopreview">이 브라우저에서는 PDF 미리보기가 꺼져 있습니다.<br>오른쪽 [내려받기]나 [새 창에서]로 여세요.</div></object></div>`;
    }).catch(()=>{stage.innerHTML=`<div class="nopreview">PDF를 읽지 못했습니다. 내려받아서 여세요.</div>`;});
  }
  else stage.innerHTML=`<div class="nopreview"><b>${esc(extOf(f))}</b> 파일은 브라우저가 미리보기를 못 합니다.<br>오른쪽 [내려받기]로 받아서 한글 등으로 여세요.</div>`;
  $('#v-side').innerHTML=f?`
    <div class="vname">${esc(f.name)}</div>
    <div class="vmeta">${esc(ctx.proj)} · ${esc(ctx.where)}${ctx.unit?` · ${esc(ctx.unit)}`:''}<br>${f.added} 붙임 · ${Math.max(1,Math.round(f.size/1024))}KB</div>
    <div class="vtags">${f.tags.map(t=>`<span class="chip">${esc(t)}<button type="button" class="chipx" data-deltag="${esc(t)}" title="태그 빼기">×</button></span>`).join('')||'<span style="color:#aab;font-size:12px">태그 없음</span>'}</div>
    <input id="v-tagin" placeholder="태그 적고 엔터 (쉼표로 여러 개: 차광시설, 설치 후)">
    <div class="vact"><a class="btn sm" href="${SERVER?f.url+'?dl=1':f.url}" download="${esc(f.name)}">내려받기</a>${isImg(f)||isPdf(f)?`<button type="button" class="btn sm" id="v-newwin">새 창에서</button>`:''}<button type="button" class="btn sm" id="v-del" style="color:var(--bad)">지우기</button></div>
    ${isImg(f)||isPdf(f)?'':'<div class="vmeta">한글(HWP)·엑셀 같은 파일은 브라우저가 못 열어서, 내려받은 뒤 그 프로그램으로 엽니다.</div>'}`
    :'';
  $('#v-strip').innerHTML=files.map((x,i)=>thumbHTML(x,`data-vi="${i}"`,i===VW.i?'on':'')).join('')
    +(VW.ref?`<button type="button" class="thumb add" id="v-add" title="파일 추가">+ 추가</button>`:'');
}
viewer.addEventListener('click',e=>{
  const t=e.target; if(!VW) return;
  if(t.id==='v-close'){closeViewer();return;}
  const vi=t.closest('[data-vi]'); if(vi){VW.i=+vi.dataset.vi;renderViewer();return;}
  if(t.id==='v-newwin'){const f=FILES.find(x=>x.id===VW.ids[VW.i]); if(f) openInNewWindow(f); return;}
  if(t.id==='v-add'){pickFiles(VW.ref,added=>{VW.ids.push(...added.map(x=>x.id));VW.i=VW.ids.length-1;renderViewer();repaintFiles();});return;}
  if(t.id==='v-del'){const f=FILES.find(x=>x.id===VW.ids[VW.i]); if(!f) return;
    if(!confirm(`"${f.name}"을 지웁니다. 되돌릴 수 없습니다.`)) return;
    removeFile(f); renderViewer(); repaintFiles(); if(!VW.ids.length&&!VW.ref) closeViewer(); return;}
  const dt=t.closest('[data-deltag]'); if(dt){const f=FILES.find(x=>x.id===VW.ids[VW.i]); if(!f) return;
    f.tags=f.tags.filter(x=>x!==dt.dataset.deltag); renderViewer(); if(PAGE==='files') drawFiles(); return;}
});
viewer.addEventListener('keydown',e=>{
  if(!VW) return;
  if(e.target.id==='v-tagin'){
    if(e.key==='Enter'){e.preventDefault();const f=FILES.find(x=>x.id===VW.ids[VW.i]); if(!f) return;
      e.target.value.split(',').map(x=>x.trim()).filter(Boolean).forEach(x=>{if(!f.tags.includes(x))f.tags.push(x);});
      renderViewer(); if(PAGE==='files') drawFiles(); const ti=$('#v-tagin'); if(ti) ti.focus();}
    return;
  }
  if(e.key==='ArrowRight'&&VW.i<VW.ids.length-1){VW.i++;renderViewer();}
  if(e.key==='ArrowLeft'&&VW.i>0){VW.i--;renderViewer();}
});

/* ================= 화면 틀 (차림표·로그인) ================= */
let PAGE='quali', detailOf=null, subtab='sum', YEAR=null, FQ='', FY=null, LOGGED=false;
const PUBLIC_PAGES=['quali'];
function setLogged(on){
  LOGGED=on; document.body.classList.toggle('publicOnly',!on);
  $('#loginWrap').hidden=true;
  showPage(on?'grid':'quali');
}
function showPage(id){
  if(!LOGGED&&!PUBLIC_PAGES.includes(id)) id='quali';
  PAGE=id; closePanel();
  $$('.page').forEach(pg=>pg.classList.toggle('on',pg.id==='page-'+id));
  const navId=id==='detail'?'grid':(id==='dnew'?'dsum':id);
  $$('#sideNav .tab').forEach(t=>t.classList.toggle('on',t.dataset.page===navId));
  const grp=$(`#sideNav [data-page="${navId}"]`)?.closest('.sideBlock')?.dataset.group;
  $$('#sideNav .sideBlock').forEach(b=>{const on=b.dataset.group===grp; b.classList.toggle('open',on); $('.group',b).classList.toggle('on',on);});
  const fn=({grid:drawGrid,new:drawNew,files:drawFiles,detail:drawDetail,vat:drawVat,memo:drawMemo,admin:drawAdmin,quali:drawQuali})[id];
  if(fn) fn(); else if(window.DIRECT) DIRECT.draw(id);   /* 직접 사업 화면들(dsum·dnew·dledger·dpay)은 direct.js 가 그립니다 */
  else { const pg=$('#page-'+id); if(pg) pg.innerHTML='<div class="card"><div class="empty">이 화면(direct.js)을 읽지 못했습니다. 새로고침해 보고, 계속 그러면 알려 주세요.</div></div>'; }
  window.scrollTo(0,0);
}
$('#sideNav').addEventListener('click',e=>{
  const b=e.target.closest('button'); if(!b) return;
  if(b.dataset.page==='new') startNew(); else if(b.dataset.page) showPage(b.dataset.page);
  else if(b.classList.contains('group')){const blk=b.closest('.sideBlock'); const first=$('.tab',blk); if(first) showPage(first.dataset.page);}
});
$('#brand').addEventListener('click',()=>{if(LOGGED) showPage('grid');});
$('#logout').addEventListener('click',async()=>{
  if(!SERVER){setLogged(false);return;}
  if(!CONFLICT&&stateSig()!==LAST_SIG){ const okk=await saveToServer(true); if(!okk&&!confirm('저장하지 못한 변경이 있습니다. 그래도 나갈까요? (나가면 그 변경은 사라집니다)')) return; }
  await api('/api/auth/logout',{method:'POST'}); location.reload();
});
$('#myPw').addEventListener('click',()=>{ if(SERVER) openPwModal(false); else alert('비밀번호 바꾸기는 서버로 옮긴 뒤에 됩니다.'); });
/* 시안(파일)에서는 무엇을 넣든(비워도) 들어갑니다. 서버에서는 진짜로 확인합니다. */
$('#loginForm').addEventListener('submit',async e=>{
  e.preventDefault(); const msg=$('#lgMsg'); msg.textContent='';
  if(!SERVER){ setLogged(true); return; }
  $('#lgGo').disabled=true;
  const r=await apiJSON('/api/auth/login','POST',{email:$('#lgEmail').value.trim(),password:$('#lgPw').value});
  $('#lgGo').disabled=false;
  if(!r.ok){ msg.textContent=r.error||'들어가지 못했습니다.'; return; }
  $('#lgPw').value=''; ME=r.user; $('#meName').textContent=ME.name||'';
  if(RELOGIN){ RELOGIN=false; $('#loginWrap').hidden=true; SAVE_ERR=''; paintSaveStat(); saveToServer(true); return; }
  $('#loginWrap').hidden=true; await enterApp();
});
$('#lgBack').addEventListener('click',()=>{$('#loginWrap').hidden=true;});
/* 로그인이 풀리면(한동안 안 써서) 화면은 그대로 두고 문만 다시 엽니다 — 다시 들어가면 하던 일이 이어집니다 */
function sessionLost(){ if(RELOGIN) return; RELOGIN=true; $('#lgMsg').textContent='로그인이 풀렸습니다 (한동안 안 쓰셔서). 다시 들어가면 하던 일이 그대로 이어집니다.'; openLogin(); }
/* 로그인 뒤 — 서버에서 내 자료를 받아 화면에 올립니다 */
async function enterApp(){
  $('#meName').textContent=ME.name||'';
  if(ME.mustChangePw){ openPwModal(true); return; }
  const st=await api('/api/state');
  if(!st.ok){ alert('자료를 불러오지 못했습니다: '+(st.error||'')); return; }
  STATE_VERSION=st.version||0; CONFLICT=false; SAVE_ERR='';
  if(st.data){ await applySnapshot(st.data,{quiet:true}); }
  else { PROJECTS=[]; FILES.length=0; MEMOS=[]; Object.keys(S).forEach(k=>delete S[k]); Object.keys(C).forEach(k=>delete C[k]); YEAR=null; detailOf=null; if(window.DIRECT) DIRECT.load(null); }
  LAST_SIG=stateSig(); LAST_SAVED=st.updatedAt?String(st.updatedAt).slice(5,16).replace('-','.'):'';
  setLogged(true); paintSaveStat();
  /* 나에게 넘어온 자료가 있으면 알려 줍니다 */
  api('/api/handover').then(r=>{ if(r.ok&&r.incoming&&r.incoming.length)
    setTimeout(()=>alert(`${r.incoming.map(h=>h.from_name).join(', ')} 님이 자료를 넘겼습니다.\n\n왼쪽 차림표의 [관리] → '넘겨받을 자료' 에서 받으세요.`),500); });
}
/* 지원자격 찾기는 담당자 전원의 사업 조건을 서버에서 받습니다 (개인정보 없음) */
async function refreshQuali(){
  const r=await api('/api/public/quali');
  if(r.ok){ QUALI_LIST=(r.projects||[]).map(p=>Object.assign({},p,{mine:true,crit:mkCrit(p.crit||{}),year:p.year||new Date().getFullYear()})); if(PAGE==='quali') drawQuali(); }
}
const qualiProjects=()=>SERVER?QUALI_LIST:PROJECTS.filter(p=>p.mine);
/* 비밀번호 바꾸기 — 임시 비밀번호로 처음 들어오면 저절로 뜹니다 */
function openPwModal(forced){
  const w=$('#pwWrap'); w.hidden=false; $('#pwForced').hidden=!forced; $('#pwClose').hidden=!!forced; $('#pwOut').hidden=!forced; $('#pwMsg').textContent='';
  $('#pwNow').value=''; $('#pwNew').value=''; $('#pwNew2').value=''; $('#pwNow').focus();
  w.dataset.forced=forced?'1':'';
}
$('#pwClose').addEventListener('click',()=>{$('#pwWrap').hidden=true;});
$('#pwOut').addEventListener('click',async()=>{ await api('/api/auth/logout',{method:'POST'}); location.reload(); });
$('#pwForm').addEventListener('submit',async e=>{
  e.preventDefault(); const msg=$('#pwMsg'); msg.textContent='';
  if($('#pwNew').value!==$('#pwNew2').value){ msg.textContent='새 비밀번호 두 개가 다릅니다.'; return; }
  const r=await apiJSON('/api/auth/password','POST',{current:$('#pwNow').value,next:$('#pwNew').value});
  if(!r.ok){ msg.textContent=r.error||'바꾸지 못했습니다.'; return; }
  const forced=$('#pwWrap').dataset.forced==='1'; $('#pwWrap').hidden=true;
  if(forced){ ME.mustChangePw=false; await enterApp(); } else alert('비밀번호를 바꿨습니다.');
});
function openLogin(){$('#loginWrap').hidden=false;$('#lgEmail').focus();}
/* 차림표가 제목줄 아래 붙도록 높이를 잽니다 (랩관리와 같은 방식) */
function fitSide(){const h=$('.topbar').offsetHeight;document.documentElement.style.setProperty('--topH',h+'px');document.documentElement.style.setProperty('--sideMax',`calc(100vh - ${h}px)`);}
window.addEventListener('resize',fitSide);

/* ================= 서류 진행현황 ================= */
function visibleProjects(){
  const mine=PROJECTS.filter(p=>p.mine);
  const years=[...new Set(mine.map(p=>p.year))].sort((a,b)=>b-a);
  if(!years.length) return {list:[],years,year:new Date().getFullYear()};
  if(YEAR==null||!years.includes(YEAR)) YEAR=years[0];
  return {list:mine.filter(p=>p.year===YEAR),years,year:YEAR};
}
function drawGrid(){
  const pg=$('#page-grid');
  pg.innerHTML=`<div class="card">
    <h2>서류 진행현황 <span class="pill done" id="gridYear"></span></h2>
    <div class="desc">칸의 숫자는 끝낸 <b>개체</b> 수 — 개소 사업이면 농가, 단체 사업이면 단체. 12단계는 개체 × 업체 "벌"로 셉니다. 사업 이름을 누르면 요약, 칸을 누르면 서류 목록, 단계 이름을 누르면 사업별로 모아 보기.</div>
    <div class="legend"><span><i></i>아직 없음</span><span><i class="part"></i>모으는 중</span><span><i class="done"></i>다 갖춤</span><span><i class="common"></i>해 공통 — 한 번 붙이면 그 해 사업 전부에</span>
      <span class="yearBtns" id="yearbar"></span>
      <span style="margin-left:auto" class="row"><button class="btn sm" id="clearall" style="color:var(--bad)">전체 비우기</button><button class="btn sm primary" id="addproj">사업 등록</button></span></div>
    <div class="gridWrap" id="gridWrap"></div>
  </div>`;
  $('#addproj').onclick=startNew;
  $('#clearall').onclick=()=>{
    const n=PROJECTS.filter(p=>p.mine).length;
    if(!n){alert('지울 사업이 없습니다.');return;}
    if(!confirm(`사업 ${n}건을 전부 지웁니다.\n수혜자·계획표·서류 체크·붙인 스캔도 같이 사라집니다. 되돌릴 수 없습니다.`)) return;
    PROJECTS=[]; Object.keys(S).forEach(k=>delete S[k]); FILES.slice().forEach(removeFile);
    renderGrid();
  };
  $('#gridWrap').addEventListener('click',e=>{
    const cm=e.target.closest('td.common .bare'); if(cm){showCommon(+cm.dataset.year,+cm.dataset.s);return;}
    const cell=e.target.closest('td.c[data-p] .bare'); if(cell){const td=cell.closest('td');showCell(td.dataset.p,+td.dataset.s);return;}
    const st=e.target.closest('[data-stage]'); if(st){showStage(+st.dataset.stage);return;}
    const ph=e.target.closest('[data-proj]'); if(ph){openDetail(ph.dataset.proj,'sum');return;}
    if(e.target.closest('#addproj2')||e.target.closest('#emptyadd')) startNew();
  });
  $('#yearbar').addEventListener('click',e=>{const b=e.target.closest('[data-year]'); if(!b) return; YEAR=+b.dataset.year; renderGrid();});
  renderGrid();
}
function layLabel(si){
  const cd=docsCommon(si).length, ea=hasEach(si), s=STAGES[si];
  if(cd&&!ea) return {t:'공통',c:true};
  const u=s.pair?'개체×업체':(s.all?'신청 단위':'개체별');
  return {t:cd?('공통·'+u):u,c:false};
}
function renderGrid(){
  if(PAGE!=='grid') return;
  const {list:mine,years,year}=visibleProjects();
  const yb=$('#yearbar'); if(yb) yb.innerHTML=years.length>1?years.map(y=>`<button class="btn sm ${y===year?'primary':''}" data-year="${y}">${y}년</button>`).join(''):'';
  const gy=$('#gridYear'); if(gy) gy.textContent=year+'년';
  const box=$('#gridWrap'); if(!box) return;
  if(!mine.length){
    box.innerHTML=`<div class="empty"><p style="margin:0 0 6px;font-size:15px">등록된 사업이 없습니다.</p><p style="margin:0 0 16px">사업을 등록하면 여기에 표가 그려집니다.</p><button class="btn primary" id="emptyadd">사업 등록</button></div>`;
    return;
  }
  const N=mine.length+1;
  let h=`<table class="prog"><thead><tr><th class="stg topleft">단계 \\ 사업</th>`;
  mine.forEach(p=>{const st=projStat(p), v=pandan(p);
    const selTxt=isGroup(p)?`단체 ${selGroups(p).length}/${groupsOf(p).length} · 회원 ${p.farms.length}`:`선정 ${selFarms(p).length}/${p.farms.length}`;
    h+=`<th class="ph"><button type="button" class="bare" data-proj="${esc(p.alias)}"><b>${esc(p.alias)}</b><small>서류 ${st.have}/${st.need}</small><small>${selTxt}</small><small>${v.system} · <span class="kind ${isGroup(p)?'grp':'ind'}">${isGroup(p)?'단체':'개소'}</span></small></button></th>`;});
  h+=`<th class="addh"><button type="button" class="bare" id="addproj2" title="사업 등록">+</button></th></tr></thead><tbody>`;
  let si=0;
  GROUPS.forEach(g=>{
    h+=`<tr class="band"><th>${esc(g.name)}</th><td colspan="${N}"></td></tr>`;
    for(let k=0;k<g.span;k++,si++){
      const s=STAGES[si], cd=docsCommon(si), ea=hasEach(si), lab=layLabel(si);
      const stg=(rs)=>`<th class="stg" ${rs?`rowspan="${rs}" style="height:74px"`:''}><button type="button" class="bare" data-stage="${si}"><span class="no">${s.no}</span><span class="sname">${esc(s.name)}</span><span class="lay ${lab.c?'c':''}">${lab.t}</span></button></th>`;
      if(cd.length){
        const st=cstore(year,si), d=docStat(st.arr);
        const cls=d.done?'done':(d.any?'part':'empty');
        const names=cd.map((x,i)=>`${esc(x.n)}${st.arr[i]===1?' ✓':st.arr[i]===2?' —':''}`).join(' · ');
        const files=cd.flatMap(x=>filesFor({kind:'cdoc',year,si,doc:x.n}));
        const excl=st.excl.filter(a=>mine.some(p=>p.alias===a));
        h+=`<tr>${stg(ea?2:0)}<td class="common ${cls} ${ea?'sub':''}" colspan="${N}"><button type="button" class="bare" data-year="${year}" data-s="${si}">${year}년 공통 · ${d.have}/${d.need}<span class="cm">${names}${excl.length?` — ${esc(excl.join(', '))} 제외`:''}</span>${files.slice(0,4).map(f=>thumbHTML(f,'','','span')).join('')}${files.length>4?`<span class="cm">+${files.length-4}</span>`:''}</button></td></tr>`;
        if(!ea) continue;
        h+='<tr>';
      }else h+=`<tr>${stg(0)}`;
      mine.forEach(p=>{
        const c=cellStat(p,si), grp=isGroup(p), W=grp?'단체':'농가';
        let cls,num,cap='';
        if(c.skip){cls='skip';num='안 씀';}
        else if(c.nounit){cls='nounit';num=grp?(s.all?'신청 단체 없음':'선정 단체 없음'):(s.all?'신청자 없음':'선정자 없음');}
        else if(c.none){cls='na';num='—';}
        else{cls=c.done?'done':(c.any?'part':'empty');
          if(s.pair){num=`${c.donePairs}/${c.pairs} 벌`;cap=`${W}×업체`;}
          else if(s.all&&grp){num=`${c.doneUnits}/${c.units} 단체`;cap=`회원 서류 ${c.mDone}/${c.mUnits}`;}
          else{num=c.doneUnits+'/'+c.units;cap=(s.all?'신청자':W)+(cd.length?` · ${docsEach(p,si).length}종`:'');}
          if(c.quit&&!s.all&&!s.pair) cap+=grp?` · 회원 포기 ${c.quit}`:` · 포기 ${c.quit}`;}
        const pct=c.need?Math.round(c.have/c.need*100):0;
        h+=`<td class="c ${cls}" data-p="${esc(p.alias)}" data-s="${si}"><button type="button" class="bare"><span class="lvl" style="height:${pct}%"></span><span class="n">${num}</span>${cap?`<span class="k">${cap}</span>`:''}</button></td>`;
      });
      h+='<td></td></tr>';
    }
  });
  h+='</tbody></table>';
  box.innerHTML=h;
  markActive();
}

/* ================= 옆 패널 ================= */
const panel=$('#panel'),scrim=$('#scrim'),ptitle=$('#ptitle'),psub=$('#psub'),pbody=$('#pbody'),pfoot=$('#pfoot');
let cur=null;
function openPanel(){panel.classList.add('open');scrim.classList.add('open');panel.setAttribute('aria-hidden','false');}
function closePanel(){panel.classList.remove('open');scrim.classList.remove('open');panel.setAttribute('aria-hidden','true');
  $$('.active').forEach(e=>e.classList.remove('active'));cur=null;}
$('#pclose').onclick=closePanel; scrim.onclick=closePanel;
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape') return;
  if(VW){closeViewer();return;}
  if(!$('#loginWrap').hidden){$('#loginWrap').hidden=true;return;}
  if(e.target.tagName!=='TEXTAREA') closePanel();
});
function markActive(){
  $$('.active').forEach(e=>e.classList.remove('active'));
  if(!cur) return;
  if(cur.view==='common'){const b=$(`td.common .bare[data-year="${cur.year}"][data-s="${cur.si}"]`); if(b) b.closest('td').classList.add('active');}
  else if(cur.a&&cur.si!=null){const el=$(`td.c[data-p="${CSS.escape(cur.a)}"][data-s="${cur.si}"]`); if(el) el.classList.add('active');}
}
const WHY={jaesan:'중요재산 사업이라',geomjeung:'국비 1억 이상이라',gongsi:'공시 대상이라',jabu:'자부담이 있어',g2b:'나라장터 계약이라'};
function sysmemoHTML(p,s){
  const memo=SYSMEMO[s.no]; if(!memo) return '';
  const sys=p?pandan(p).system:null;
  if(sys) return `<p class="sysmemo"><b>${sys}</b> — ${esc(sys==='보탬e'?memo.b:memo.e)}</p>`;
  return `<p class="sysmemo"><b>보탬e</b> — ${esc(memo.b)}<br><b>e나라도움</b> — ${esc(memo.e)}</p>`;
}
function paintPanel(){
  if(!cur) return;
  if(cur.view==='common') paintCommon();
  else if(cur.view==='units') paintUnits();
  else if(cur.view==='docfirst') paintDocFirst();
  else if(cur.view==='vendors') paintFarmVendors();
  else if(cur.view==='docs') paintDocs();
}
/* 포기 — 개소 사업: 선정 → 포기 (반납 확인·포기 공문 체크가 생기고 그 뒤 단계에서 빠짐). 단체 사업: 회원에게 표시 */
function toggleQuit(p,f){
  if(isGroup(p)){ f.quit=!f.quit; return; }
  if(f.sel==='포기') f.sel='선정'; else if(f.sel==='선정') f.sel='포기';
}
/* 공통 서류 */
function showCommon(year,si){cur={view:'common',year,si};paintCommon();openPanel();markActive();}
function paintCommon(){
  const {year,si}=cur, s=STAGES[si], cd=docsCommon(si), st=cstore(year,si);
  const {list:mine}=visibleProjects();
  ptitle.textContent=s.name; psub.textContent=`${year}년 공통 · ${s.no}단계 · 사업 ${mine.length-st.excl.filter(a=>mine.some(p=>p.alias===a)).length}건에 적용`;
  pbody.innerHTML=sysmemoHTML(null,s)
    +cd.map((d,i)=>{
      const val=st.arr[i], cls=val===1?'done':(val===2?'na':''), mark=val===1?'✓':(val===2?'—':'');
      const ref={kind:'cdoc',year,si,doc:d.n}, fs=filesFor(ref);
      return `<div class="doc ${cls}"><button type="button" class="tick" data-tick="${i}" aria-label="상태 바꾸기">${mark}</button>
        <span class="dname">${esc(d.n)}${fs.length?`<div class="thumbs">${fs.map((f,k)=>thumbHTML(f,`data-open="${k}" data-di="${i}"`)).join('')}<button type="button" class="thumb add" data-addscan="${i}" title="더 붙이기">+</button></div>`:''}</span>
        <button type="button" class="scan ${fs.length?'has':''}" data-scan="${i}">${fs.length?`스캔 ${fs.length}장`:'스캔 첨부'}</button></div>`;
    }).join('')
    +`<div class="apply"><b>적용되는 사업</b> — ${year}년 ${mine.length}건 <span class="faint">(빼고 싶은 사업은 눌러서 끄기)</span><br>
      ${mine.map(p=>`<button type="button" class="chk2 ${st.excl.includes(p.alias)?'':'on'}" data-excl="${esc(p.alias)}">${esc(p.alias)}</button>`).join('')}</div>
    <p class="note">공통 서류는 이 해에 한 번만 붙입니다. 붙이면 위에 켜진 사업들의 칸이 같이 채워지고, 스캔 찾기에서도 어느 사업으로 찾든 나옵니다. 네모를 누를 때마다 <b>아직 → 갖춤 → 해당없음</b> 순으로 바뀝니다.</p>`;
  const d=docStat(st.arr);
  pfoot.innerHTML=`<span>갖춘 서류 <b>${d.have}</b> / <b>${d.need}</b></span>`+(d.done?'<span style="color:var(--accent);font-weight:700">끝</span>':'');
}
/* 개별 서류 — 먼저 수혜자·업체 목록 */
function showCell(a,si){
  const p=byAlias(a); if(!p) return;
  if(isSkipped(p,si)){cur={a,si,view:'skip'}; const s=STAGES[si];
    ptitle.textContent=s.name; psub.textContent=`${a} · ${s.no}단계`;
    pbody.innerHTML=`<p class="note">이 사업에서는 <b>${esc(s.name)}</b> 단계를 안 쓰기로 해 두었습니다. 표에서 '안 씀'으로 보이고 서류 수에도 들어가지 않습니다.</p>
      <div class="note"><button type="button" class="btn sm" data-unskip="1">이 단계 다시 쓰기</button></div>`;
    pfoot.innerHTML='<span>뺀 단계</span>'; openPanel(); markActive(); return;}
  const keep=(cur&&cur.a===a&&cur.si===si)?{q:cur.q||'',sort:cur.sort||'reg',exp:cur.exp}:{q:'',sort:'reg'};
  if(isGroup(p)&&STAGES[si].all){ cur={a,si,unit:null,view:'docfirst',...keep}; paintDocFirst(); openPanel(); markActive(); return; }
  cur={a,si,unit:null,view:'units',...keep}; paintUnits(); openPanel(); markActive();
}
function showUnit(a,si,unitId){
  const keep=(cur&&cur.a===a&&cur.si===si)?{q:cur.q||'',sort:cur.sort||'reg',exp:cur.exp}:{q:'',sort:'reg'};
  cur={a,si,unit:unitId,view:'docs',...keep}; paintDocs(); openPanel(); markActive();
}
/* 12단계: 개체(농가·단체)를 누르면 그 개체가 거래한 업체들이 뜹니다 */
function showFarmVendors(a,si,entKey){
  const keep=(cur&&cur.a===a&&cur.si===si)?{q:cur.q||'',sort:cur.sort||'reg'}:{q:'',sort:'reg'};
  cur={a,si,ent:String(entKey),unit:null,view:'vendors',...keep}; paintFarmVendors(); openPanel(); markActive();
}
function paintFarmVendors(){
  const {a,si}=cur,p=byAlias(a),s=STAGES[si],ent=entityOfUnit(p,cur.ent); if(!ent){showCell(a,si);return;}
  const vs=entVendors(p,ent), W=entWord(p);
  const who=ent.kind==='group'?`${ent.name} (회원 ${ent.desc.members.length})`:`${ent.f.role?ent.f.role+' ':''}${ent.f.name}`;
  ptitle.textContent=s.name; psub.textContent=`${a} · ${s.no}단계 · ${who} · 업체 ${vs.length}곳`;
  pbody.innerHTML=`<button type="button" class="backlink" data-back="units">← ${W} 목록으로</button>`+sysmemoHTML(p,s)
    +(vs.length?vs.map(v=>{const d=docStat(arrFor(p,si,pairId(ent.key,v.id))), pct=d.need?Math.round(d.have/d.need*100):0;
        const c=contractForEnt(p,ent.key,v.id), last=v.calls.length?v.calls.map(x=>x.date).sort().slice(-1)[0]:null;
        const who2=ent.kind==='group'&&c?`회원 ${c.farmIds.length}명 구입`:'';
        const small=[v.tel,who2,c?`계약 ${fmtNum(c.sum)}원${c.over?' · 나라장터 대상':''}`:'',last?`마지막 통화 ${mmdd(last)}`:''].filter(Boolean).join(' · ');
        return `<div class="urow ${d.done?'done':''}" data-pair="${v.id}"><span class="un">${esc(v.name)}<small>${esc(small)}</small></span><span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${d.have}/${d.need}</span></div>`;}).join('')
      :`<p class="note">${ent.kind==='group'?'이 단체 회원들의':'이 농가는'} 계획표에 물품 줄이 없어 거래 업체가 없습니다. 계획표에서 물품 줄에 업체 이름을 적으면 여기에 뜹니다.</p>`)
    +`<p class="note">업체를 누르면 그 ${W}·업체 한 벌의 실적 서류와 통화 기록이 열립니다. ${isGroup(p)?'단체 사업이라 계약 금액은 이 단체 회원 전원이 그 업체에서 산 것을 합친 것이고, 같은 업체라도 다른 단체와는 따로 한 벌입니다.':'개소 사업이라 계약 금액은 이 농가 것만 합니다. 같은 업체를 다른 농가가 써도 따로 한 벌입니다.'}</p>`;
  const done=vs.filter(v=>docStat(arrFor(p,si,pairId(ent.key,v.id))).done).length;
  pfoot.innerHTML=`<span>끝낸 업체 <b>${done}</b> / <b>${vs.length}</b></span>`;
}
/* ── 단체 사업의 2단계: 서류마다 단위가 달라서(단체 · 회원 · 대표) 서류 → 사람 순서로 보여 줍니다 ── */
const GSEL_NEXT={'':'선정','선정':'탈락','탈락':''};
function paintDocFirst(){
  const {a,si}=cur,p=byAlias(a),s=STAGES[si]; ensureGroups(p);
  const gs=groupsOf(p), docs=STAGES[si].docs.filter(d=>d.u==='each'), ms=memberUnitsOf(p,si);
  if(!cur.exp){ cur.exp=new Set(); }
  ptitle.textContent=s.name; psub.textContent=`${a} · ${s.no}단계 · 신청 단체 ${gs.length}곳 · 회원 ${ms.length}명`;
  const rowsFor=(d,di)=>{
    if(d.gu==='member'){
      const byG=gs.map(g=>({g,fs:membersOf(p,g)}));
      return `<div class="bulk">일괄 적용: ${byG.filter(x=>x.fs.length).map(x=>`<button type="button" class="btn sm" data-bulk="${di}|${x.g.id}">${esc(groupLabel(x.g))} ${x.fs.length}명 전원 ✓</button>`).join('')}<button type="button" class="btn sm" data-bulk="${di}|all">전체 ${ms.length}명 ✓</button><span class="faint">누르면 한 번에 체크되고, 사람마다 다시 풀 수 있습니다</span></div>`
        +byG.map(x=>x.fs.map(f=>{const val=(dmap(p,si,f.id)[d.n])||0, fs=filesFor({kind:'doc',a,si,unit:f.id,doc:d.n});
          return `<div class="urow ${val===1?'done':''} ${f.quit?'out':''}"><button type="button" class="tick ${val===1?'on':val===2?'na':''}" data-dtick="${di}|${f.id}">${val===1?'✓':val===2?'—':''}</button><span class="un"><span class="role">${esc(groupLabel(x.g))}</span>${esc(f.name)||'(이름 없음)'}${f.role?` <small style="display:inline">${esc(f.role)}</small>`:''}</span><button type="button" class="scan ${fs.length?'has':''}" data-dscan="${di}|${f.id}">${fs.length?`스캔 ${fs.length}`:'스캔'}</button></div>`;}).join('')).join('')
        ||'<p class="note">아직 회원이 없습니다. 계획표에서 단체와 회원을 넣으세요.</p>';
    }
    return gs.map(g=>{const k=gkey(g), val=(dmap(p,si,k)[d.n])||0, rep=repOf(p,g), fs=filesFor({kind:'doc',a,si,unit:k,doc:d.n});
      const who=d.gu==='rep'?(rep?`대표 ${esc(rep.name)}`:'<b style="color:var(--bad)">대표 없음 — 계획표 구분에 "대표"를 적어 주세요</b>'):`회원 ${membersOf(p,g).length}명`;
      return `<div class="urow ${val===1?'done':''} ${g.sel==='탈락'?'out':''}"><button type="button" class="tick ${val===1?'on':val===2?'na':''}" data-dtick="${di}|${k}">${val===1?'✓':val===2?'—':''}</button><span class="un">${esc(groupLabel(g))}<small>${who}</small></span><button type="button" class="chk2 ${g.sel==='선정'?'on':''} ${g.sel==='탈락'?'bad':''}" data-gsel="${g.id}" title="누르면 미정 → 선정 → 탈락">${selLabel(g.sel)}</button><button type="button" class="scan ${fs.length?'has':''}" data-dscan="${di}|${k}">${fs.length?`스캔 ${fs.length}`:'스캔'}</button></div>`;}).join('')
      ||'<p class="note">아직 신청 단체가 없습니다. 계획표의 [+ 단체]로 넣으세요.</p>';
  };
  pbody.innerHTML=sysmemoHTML(p,s)
    +`<p class="note" style="padding-top:8px;padding-bottom:4px">단체 사업의 신청 서류는 <b>서류마다 내는 단위가 다릅니다</b> — 신청서는 단체마다 한 부, 경영체 확인서는 회원마다, 금융거래 확인서는 대표 것 한 부. 서류를 누르면 누가 냈는지 펼쳐집니다. 심의회 뒤에 단체의 <b>선정</b>을 눌러 두면 8단계부터는 선정된 단체만 셉니다.</p>`
    +docs.map((d,di)=>{
      const units=d.gu==='member'?ms.map(f=>f.id):gs.map(g=>gkey(g));
      const have=units.filter(u=>dmap(p,si,u)[d.n]===1).length, na=units.filter(u=>dmap(p,si,u)[d.n]===2).length, need=units.length-na;
      const done=need>0&&have===need, open=cur.exp.has(di)||(!cur.exp.size&&!done&&di===docs.findIndex((x,i)=>{const us=x.gu==='member'?ms.map(f=>f.id):gs.map(g=>gkey(g)); const h=us.filter(u=>dmap(p,si,u)[x.n]===1).length, n2=us.length-us.filter(u=>dmap(p,si,u)[x.n]===2).length; return !(n2>0&&h===n2);}));
      const badge=d.gu==='member'?'<span class="ubadge m">회원마다</span>':d.gu==='rep'?'<span class="ubadge r">대표 한 부</span>':'<span class="ubadge g">단체마다</span>';
      return `<div class="doc click ${done?'done':''}" data-dexp="${di}"><span class="tick" style="cursor:default">${done?'✓':''}</span><span class="dname">${esc(d.n)}${badge}<span class="why">${open?'접기':'눌러서 펼치기'}</span></span><span class="cnt">${have}/${need}</span></div>`
        +(open?`<div class="sublist">${rowsFor(d,di)}</div>`:'');
    }).join('')
    +`<p class="note">네모를 누를 때마다 <b>아직 → 갖춤 → 해당없음</b> 순으로 바뀝니다.</p>`;
  const c=cellStat(p,si);
  pfoot.innerHTML=`<span>단체 <b>${c.doneUnits}</b>/${c.units} · 회원 서류 <b>${c.mDone}</b>/${c.mUnits}</span>`+(c.done?'<span style="color:var(--accent);font-weight:700">이 단계는 끝</span>':'')
    +`<span class="row" style="margin-left:auto"><span class="stseg"><button type="button" class="on s1" style="cursor:default">선정 ${selGroups(p).length}</button><button style="cursor:default">미정 ${gs.filter(g=>!g.sel).length}</button><button class="${gs.some(g=>g.sel==='탈락')?'on s2':''}" style="cursor:default">탈락 ${gs.filter(g=>g.sel==='탈락').length}</button></span></span>`;
}
function paintUnits(){
  const {a,si}=cur,p=byAlias(a),s=STAGES[si],units=unitsOf(p,si),grp=isGroup(p),one=grp?'단체':(s.all?'신청자':'수혜자'),cnt=grp?'곳':'명';
  ptitle.textContent=s.name; psub.textContent=`${a} · ${s.no}단계 · ${one} ${units.length}${cnt}${s.all?'':(grp?` (신청 ${groupsOf(p).length}곳 중 선정)`:` (신청 ${p.farms.length}명 중 선정)`)}`;
  pbody.innerHTML=sysmemoHTML(p,s)
    +(docsCommon(si).length?`<p class="note" style="padding-top:8px;padding-bottom:4px">이 단계의 공통 서류(${docsCommon(si).map(d=>esc(d.n)).join(' · ')})는 표의 <b>${p.year}년 공통</b> 줄에서 다룹니다. 여기는 ${grp?'단체마다':'사람마다'} 한 벌인 서류만.</p>`:'')
    +(s.all?`<p class="note" style="padding-top:4px;padding-bottom:4px">신청자 전원이 보입니다. 심의회 뒤에 <b>선정</b>을 눌러 두면 8단계부터는 선정된 사람만 셉니다. 선정된 뒤 그만두면 <b>포기</b> — 반납 확인·포기 공문 체크가 생기고 그 뒤 단계에서는 빠집니다.</p>`:'')
    +(grp&&!s.all?`<p class="note" style="padding-top:4px;padding-bottom:4px">단체 사업이라 <b>단체마다 서류 한 부</b>입니다. 회원 ${p.farms.length}명을 따로 세지 않습니다.</p>`:'')
    +(s.pair?`<p class="note" style="padding-top:4px;padding-bottom:4px">${one}를 누르면 그 ${one}가 거래한 업체들이 뜨고, 업체마다 실적 서류 한 벌입니다.</p>`:'')
    +(units.length?`<div class="ptools">${units.length>8?`<input id="uq" placeholder="이름으로 찾기" value="${esc(cur.q)}">`:''}
        <div class="segs"><button type="button" class="seg ${cur.sort==='reg'?'on':''}" data-sort="reg">등록순</button><button type="button" class="seg ${cur.sort==='left'?'on':''}" data-sort="left">덜 갖춘 순</button></div></div>
      <div id="urows"></div>`
      :`<p class="note">${s.all?'이 사업에는 아직 등록된 신청자가 없습니다. 아래에서 추가하면 사람마다 서류 목록이 한 벌씩 생깁니다.':(grp?'아직 선정된 단체가 없습니다. 2단계(사업신청서) 칸이나 계획표에서 단체를 <b>선정</b>으로 표시하세요.':'아직 선정된 사람이 없습니다. 2단계(사업신청서) 칸이나 계획표에서 신청자를 <b>선정</b>으로 표시하세요.')}</p>`)
    +(s.all&&!grp?addUnitForm('farm',p):'');
  renderUnitRows(); paintUnitFoot();
  const q=$('#uq',pbody); if(q) q.addEventListener('input',()=>{cur.q=q.value;renderUnitRows();});
  bindAddUnit(pbody,p,'farm',()=>{paintUnits();renderGrid();markActive();});
}
const SEL_NEXT={'':'선정','선정':'탈락','탈락':'','포기':'선정'};
const selLabel=v=>v||'미정';
function renderUnitRows(){
  const box=$('#urows',pbody); if(!box||!cur) return;
  const {a,si}=cur,p=byAlias(a),s=STAGES[si],units=unitsOf(p,si);
  const statOf=u=>{ if(!s.pair) return docStat(arrFor(p,si,u.id));
    const vs=unitVendors(p,u.id); let have=0,need=0,done=vs.length>0,any=false; vs.forEach(v=>{const d=docStat(arrFor(p,si,pairId(u.id,v.id)));have+=d.have;need+=d.need;if(!d.done)done=false;if(d.any)any=true;});
    return {have,need,done:done&&need>0,any,vs}; };
  let list=units.map(u=>({u,d:statOf(u)}));
  const q=(cur.q||'').trim(); if(q) list=list.filter(x=>x.u.name.includes(q));
  if(cur.sort==='left') list.sort((x,y)=>(x.d.need?x.d.have/x.d.need:1)-(y.d.need?y.d.have/y.d.need:1));
  box.innerHTML=list.map(({u,d})=>{
    const pct=d.need?Math.round(d.have/d.need*100):0;
    const mb=u.isGroup?'':memoBadge(p.alias,u.name);
    const gsm=u.isGroup?`${u.rep?`대표 ${esc(u.rep.name)} · `:''}회원 ${u.members.length}명${u.members.length-u.active?` (포기 ${u.members.length-u.active})`:''}`:'';
    const small=(s.pair?(d.vs.length?`${gsm?gsm+' · ':''}업체 ${d.vs.length}곳: ${d.vs.map(v=>esc(v.name)).join(', ')}`:`${gsm?gsm+' · ':''}거래 업체 없음 — 계획표에 물품을 넣으세요`):(u.isGroup?gsm:esc(u.tel||'')))+(mb?` ${mb}`:'');
    const selBtn=s.all&&!u.isGroup?`<button type="button" class="chk2 ${u.sel==='선정'?'on':''} ${u.sel==='탈락'||u.sel==='포기'?'bad':''}" data-sel="${u.id}" title="누르면 미정 → 선정 → 탈락">${selLabel(u.sel)}</button>${u.sel==='선정'||u.sel==='포기'?`<button type="button" class="chk2 ${u.sel==='포기'?'bad':''}" data-quit="${u.id}" title="선정된 뒤 그만둔 경우">${u.sel==='포기'?'포기 취소':'포기'}</button>`:''}`:'';
    return `<div class="urow ${d.done?'done':''} ${u.sel==='탈락'||u.sel==='포기'?'out':''}" data-unit="${u.id}"><span class="un">${u.role?`<span class="role">${esc(u.role)}</span>`:''}${esc(u.name)||'<span class="faint">(이름 없음)</span>'}${small?`<small>${small}</small>`:''}</span>${selBtn}
      <span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${d.have}/${d.need}</span></div>`;
  }).join('')||'<p class="note">찾는 이름이 없습니다.</p>';
}
function paintUnitFoot(){
  const {a,si}=cur,p=byAlias(a),s=STAGES[si],c=cellStat(p,si),one=isGroup(p)?'단체':(s.all?'신청자':'농가');
  pfoot.innerHTML=c.nounit?`<span>${one} 없음</span>`:`<span>이 단계 끝낸 ${one} <b>${c.doneUnits}</b> / <b>${c.units}</b>${s.pair?` <span class="faint">· 한 벌 ${c.donePairs}/${c.pairs}</span>`:''}${c.quit&&!s.all?` <span class="faint">· 포기 ${c.quit}</span>`:''}</span>`+(c.done?'<span style="color:var(--accent);font-weight:700">이 단계는 끝</span>':'');
}
function addUnitForm(l,p){
  const L=LAYER[l], grp=p&&isGroup(p);
  return `<div class="addunit"><div class="row"><input class="au-name" placeholder="${L.one} 이름"><input class="au-tel tel" placeholder="전화 (선택)"><button type="button" class="btn sm au-add">추가</button></div>
    ${l==='farm'?`<button type="button" class="lnk au-bulkopen" style="margin-top:7px">여러 명 한꺼번에 넣기</button>
      <div class="bulkbox" hidden><textarea class="au-bulk" placeholder="${grp?'한 줄에 한 명씩 — 맨 앞은 소속 단체&#10;여주 절화 작목반, 대표 김OO, 전화번호&#10;여주 절화 작목반, 회원 이OO':'한 줄에 한 명씩&#10;대표 김OO, 전화번호&#10;회원 이OO'}"></textarea>
      <div class="row" style="margin-top:6px"><span class="hint grow">${grp?'맨 앞 칸은 단체 이름(단체가 낸 이름 그대로), 그다음이 사람입니다. 같은 단체 이름끼리 한 단체로 묶입니다. ':''}엑셀에서 열을 복사해 붙여넣어도 됩니다. 앞에 "대표 " "총무 "를 붙이면 구분으로 들어갑니다.</span><button type="button" class="btn sm au-bulkadd">한꺼번에 추가</button></div></div>`
      :`<div class="hint" style="margin-top:6px">연락처·계좌번호·통화 기록은 계획표 아래 '업체'에서 적습니다.</div>`}</div>`;
}
/* 붙여넣은 글 → 사람 목록. 단체 사업(grp)이면 맨 앞 칸이 소속 단체 */
function parseNames(text,grp){
  return String(text||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).map(line=>{
    const parts=line.split(/[,\t]/).map(x=>x.trim()); let group='';
    if(grp&&parts.length>=2){ group=parts.shift(); }
    let role='',name=parts[0]||'';
    const m=name.match(/^(대표|총무|회원|감사)\s+(.+)$/); if(m){role=m[1];name=m[2];}
    return {role,name,tel:parts[1]||'',group};
  }).filter(x=>x.name);
}
/* 단체 이름으로 단체를 찾거나 만듭니다 */
function groupByName(p,name){ name=(name||'').trim(); let g=groupsOf(p).find(x=>x.name===name); if(!g){g=mkGroup(name); p.groups.push(g);} return g; }
function addUnit(p,l,name,tel,role,group){
  if(l==='farm'){const u=mkFarm(name,{tel:tel||'',role:role||''}); if(isGroup(p)) u.groupId=groupByName(p,group||'').id; p.farms.push(u); return u;}
  const u=mkVendor(name,tel||'');p.vendors.push(u);return u;
}
function bindAddUnit(root,p,l,after){
  const box=$('.addunit',root); if(!box) return;
  const name=$('.au-name',box),tel=$('.au-tel',box);
  $('.au-add',box).onclick=()=>{const n=name.value.trim(); if(!n){name.focus();return;}
    if(l==='vendor'&&p.vendors.find(x=>x.name===n)){alert('같은 이름의 업체가 이미 있습니다.');return;}
    const x=parseNames(n,false)[0]||{role:'',name:n}; addUnit(p,l,x.name,tel.value.trim(),x.role,''); after();};
  name.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('.au-add',box).click();}});
  const bo=$('.au-bulkopen',box); if(bo) bo.onclick=()=>{const bb=$('.bulkbox',box);bb.hidden=!bb.hidden;if(!bb.hidden)$('textarea',bb).focus();};
  const ba=$('.au-bulkadd',box); if(ba) ba.onclick=()=>{const list=parseNames($('.au-bulk',box).value,isGroup(p)); if(!list.length) return; list.forEach(x=>addUnit(p,l,x.name,x.tel,x.role,x.group)); after();};
}
function docRef(i){const p=byAlias(cur.a);return {kind:'doc',a:cur.a,si:cur.si,unit:cur.unit==null?null:cur.unit,doc:docsEach(p,cur.si,cur.unit)[i].n};}
function paintDocs(){
  const {a,si,unit}=cur,p=byAlias(a),s=STAGES[si];
  const ent=entityOfUnit(p,unit), vid=vendorIdOfUnit(unit), v=vid?p.vendors.find(x=>x.id===vid):null;
  if(!ent||(s.pair&&!v)){showCell(a,si);return;}
  const dl=docsEach(p,si,unit), arr=arrFor(p,si,unit), W=entWord(p);
  const who=ent.kind==='group'?`${ent.name}${ent.desc.rep?` (대표 ${ent.desc.rep.name})`:''}`:`${ent.f.role?ent.f.role+' ':''}${ent.f.name||'(이름 없음)'}`;
  ptitle.textContent=s.name; psub.textContent=`${a} · ${s.no}단계 · ${who}${v?` · ${v.name}`:''}`;
  const c=v?contractForEnt(p,ent.key,v.id):null;
  const backTo=v?'vendors':(isGroup(p)&&s.all?'docfirst':'units');
  pbody.innerHTML=`<button type="button" class="backlink" data-back="${backTo}">← ${v?'업체 목록으로':(s.all?(isGroup(p)?'서류 목록으로':'신청자 목록으로'):`${W} 목록으로`)}</button>`
    +sysmemoHTML(p,s)
    +(v?callsHTML(p,v):'')
    +(c?`<p class="sysmemo">계약 <b>${fmtNum(c.sum)}원</b>${isGroup(p)?` (단체 회원 ${c.farmIds.length}명 합)`:''} — ${c.jungang?'<b style="color:var(--bad)">중앙 조달 대상</b>':c.over?`<b style="color:var(--bad)">나라장터 대상</b> (${c.lim.type} ${hum(c.lim.g2b/1000)} 초과)`:'자체계약 가능'}</p>`:'')
    +(dl.length?dl.map((d,i)=>{
      const val=arr[i],cls=val===1?'done':(val===2?'na':''),mark=val===1?'✓':(val===2?'—':'');
      const fs=filesFor({kind:'doc',a,si,unit,doc:d.n});
      const repNote=d.gu==='rep'&&ent.kind==='group'?`<span class="why">${ent.desc.rep?`대표 ${esc(ent.desc.rep.name)} 것 한 부`:'대표 없음 — 계획표 구분에 "대표"를 적어 주세요'}</span>`:'';
      return `<div class="doc ${cls}"><button type="button" class="tick" data-tick="${i}" aria-label="상태 바꾸기">${mark}</button>
        <span class="dname">${esc(d.n)}${d.o?'<span class="opt">해당시</span>':''}${d.if?`<span class="why">${WHY[d.if]||''} 붙은 서류</span>`:''}${repNote}
          ${fs.length?`<div class="thumbs">${fs.map((f,k)=>thumbHTML(f,`data-open="${k}" data-di="${i}"`)).join('')}<button type="button" class="thumb add" data-addscan="${i}" title="더 붙이기">+</button></div>`:''}</span>
        <button type="button" class="scan ${fs.length?'has':''}" data-scan="${i}">${fs.length?`스캔 ${fs.length}장`:'스캔 첨부'}</button></div>`;
    }).join(''):'<p class="note">이 사업에는 해당 없는 단계입니다.</p>')
    +`<p class="note">네모를 누를 때마다 <b>아직 → 갖춤 → 해당없음</b> 순으로 바뀝니다. 스캔은 사진·PDF 여러 장을 한 번에 붙일 수 있고, 붙인 것을 누르면 크게 보입니다.</p>`;
  const d=docStat(arr);
  const list=(v?entVendors(p,ent).map(x=>pairId(ent.key,x.id)):unitsOf(p,si).map(x=>x.id)).map(String), i=list.indexOf(String(unit));
  pfoot.innerHTML=(d.empty?'<span>해당 없음</span>':`<span>갖춘 서류 <b>${d.have}</b> / <b>${d.need}</b></span>`+(d.done?'<span style="color:var(--accent);font-weight:700">끝</span>':''))
    +`<span class="row" style="margin-left:auto"><button type="button" class="btn sm" data-nav="-1" ${i<=0?'disabled':''}>‹ 이전</button><button type="button" class="btn sm" data-nav="1" ${i>=list.length-1?'disabled':''}>다음 ›</button></span>`;
}
function callsHTML(p,v){
  const farms=[...new Set(p.lines.filter(l=>l.vendorId===v.id).map(l=>l.farmId))].map(id=>p.farms.find(f=>f.id===id)).filter(Boolean).map(f=>f.name);
  const sorted=v.calls.slice().sort((x,y)=>y.date.localeCompare(x.date));
  return `<div class="tel">${v.tel?`전화 <b>${esc(v.tel)}</b>`:'<span class="faint">전화번호 없음 — 계획표의 업체에서 적을 수 있습니다</span>'}${v.account?` · 계좌 ${esc(v.account)}`:''}${farms.length?`<br>맡은 농가: ${esc(farms.join(', '))}`:''}</div>
  <div class="calls"><h4>통화 기록 <span>${v.calls.length}건</span></h4>
    ${sorted.map(c=>`<div class="call"><span class="cd">${esc(c.date.replace(/-/g,'.'))}</span><span class="cm">${esc(c.memo)}</span><button type="button" class="cx" data-calldel="${v.calls.indexOf(c)}" title="지우기">×</button></div>`).join('')||'<p style="margin:0 0 4px;font-size:12px;color:var(--muted)">아직 통화 기록이 없습니다.</p>'}
    <div class="callform"><input type="date" id="c-date" ${DLIM} value="${today()}"><input type="text" id="c-memo" placeholder="그날 나눈 이야기"><button type="button" class="btn sm" data-calladd="1">기록</button></div></div>`;
}
function showCalls(a,vid){
  const p=byAlias(a), v=p.vendors.find(x=>x.id===vid); if(!v) return;
  cur={a,vid,view:'calls'};
  ptitle.textContent=v.name; psub.textContent=`${a} · 업체`;
  pbody.innerHTML=callsHTML(p,v)+`<p class="note">통화한 날과 그날 나눈 이야기를 적어두는 곳입니다. 서류 독촉, 납품 일정, 계산서 문제 같은 것.</p>`;
  pfoot.innerHTML=`<span>통화 <b>${v.calls.length}</b>건</span>`;
  openPanel();
}
function curVendor(){
  if(!cur) return null; const p=byAlias(cur.a); if(!p) return null;
  if(cur.view==='calls') return p.vendors.find(v=>v.id===cur.vid);
  if(cur.view==='docs'){const vid=vendorIdOfUnit(cur.unit); return vid?p.vendors.find(v=>v.id===vid):null;}
  return null;
}
function afterCallChange(v){
  if(cur.view==='calls'){showCalls(cur.a,v.id);
    const b=$(`#vcalls-${v.id}`); if(b){const last=v.calls.length?v.calls.map(c=>c.date).sort().slice(-1)[0]:null; b.textContent=(v.calls.length?`${v.calls.length}건 · 마지막 ${mmdd(last)}`:'기록 없음')+' — 열기';}}
  else paintDocs();
}
panel.addEventListener('click',e=>{
  if(!cur) return; const t=e.target;
  const tick=t.closest('[data-tick]'); if(tick){
    const i=+tick.dataset.tick;
    if(cur.view==='common'){const st=cstore(cur.year,cur.si); st.arr[i]=(st.arr[i]+1)%3; paintCommon();}
    else if(cur.view==='docs'){const p=byAlias(cur.a), arr=arrFor(p,cur.si,cur.unit); setDoc(p,cur.si,cur.unit,i,(arr[i]+1)%3); paintDocs();}
    renderGrid(); markActive(); return;}
  const refOf=(i)=>cur.view==='common'?{kind:'cdoc',year:cur.year,si:cur.si,doc:docsCommon(cur.si)[i].n}:docRef(i);
  const titleOf=(ref)=>cur.view==='common'?`${cur.year}년 공통 · ${STAGES[cur.si].name} · ${ref.doc}`:`${cur.a} · ${STAGES[cur.si].name} · ${ref.doc}`;
  const sc=t.closest('[data-scan]'); if(sc){const ref=refOf(+sc.dataset.scan), fs=filesFor(ref);
    if(fs.length) openViewer(fs.map(x=>x.id),0,ref,titleOf(ref)); else pickFiles(ref,added=>{paintPanel();renderGrid();markActive();openViewer(added.map(x=>x.id),0,ref,titleOf(ref));}); return;}
  const ad=t.closest('[data-addscan]'); if(ad){pickFiles(refOf(+ad.dataset.addscan),()=>{paintPanel();renderGrid();markActive();}); return;}
  const op=t.closest('[data-open]'); if(op){const ref=refOf(+op.dataset.di), fs=filesFor(ref); openViewer(fs.map(x=>x.id),+op.dataset.open,ref,titleOf(ref)); return;}
  const ex=t.closest('[data-excl]'); if(ex&&cur.view==='common'){const st=cstore(cur.year,cur.si), a=ex.dataset.excl;
    if(st.excl.includes(a)) st.excl=st.excl.filter(x=>x!==a); else st.excl.push(a); paintCommon(); renderGrid(); markActive(); return;}
  if(t.closest('[data-unskip]')&&cur.view==='skip'){const p=byAlias(cur.a); setStageUsed(p,cur.si,true); renderGrid(); showCell(cur.a,cur.si); return;}
  const g=t.closest('[data-goto]'); if(g){showCell(g.dataset.goto,+g.dataset.gs);return;}
  const gc=t.closest('[data-gotoc]'); if(gc){showCommon(+gc.dataset.gotoc,+gc.dataset.gs);return;}
  const fmb=t.closest('[data-farmmemo]'); if(fmb){closePanel(); gotoFarmMemos(fmb.dataset.farmmemoa,fmb.dataset.farmmemo); return;}
  const sb=t.closest('[data-sel]'); if(sb){const p=byAlias(cur.a), f=p.farms.find(x=>x.id===+sb.dataset.sel); if(f){f.sel=SEL_NEXT[f.sel||'']; renderUnitRows(); paintUnitFoot(); renderGrid(); markActive();} return;}
  const qb=t.closest('[data-quit]'); if(qb){const p=byAlias(cur.a), f=p.farms.find(x=>x.id===+qb.dataset.quit); if(f){toggleQuit(p,f); renderUnitRows(); paintUnitFoot(); renderGrid(); markActive();} return;}
  /* 단체 사업 2단계 (서류 → 사람) */
  if(cur.view==='docfirst'){
    const p=byAlias(cur.a);
    const dx=t.closest('[data-dexp]'); if(dx){const di=+dx.dataset.dexp; if(!cur.exp) cur.exp=new Set(); if(cur.exp.has(di)) cur.exp.delete(di); else cur.exp.add(di); if(!cur.exp.size) cur.exp.add(-1); paintDocFirst(); return;}
    const dt=t.closest('[data-dtick]'); if(dt){const [di,u]=dt.dataset.dtick.split('|'); const d=STAGES[cur.si].docs.filter(x=>x.u==='each')[+di]; const m=dmap(p,cur.si,u); m[d.n]=((m[d.n]||0)+1)%3; paintDocFirst(); renderGrid(); markActive(); return;}
    const ds=t.closest('[data-dscan]'); if(ds){const [di,u]=ds.dataset.dscan.split('|'); const d=STAGES[cur.si].docs.filter(x=>x.u==='each')[+di]; const ref={kind:'doc',a:cur.a,si:cur.si,unit:isGkey(u)?u:+u,doc:d.n}, fs=filesFor(ref), title=`${cur.a} · ${STAGES[cur.si].name} · ${d.n}`;
      if(fs.length) openViewer(fs.map(x=>x.id),0,ref,title); else pickFiles(ref,added=>{paintDocFirst();renderGrid();markActive();openViewer(added.map(x=>x.id),0,ref,title);}); return;}
    const bl=t.closest('[data-bulk]'); if(bl){const [di,g]=bl.dataset.bulk.split('|'); const d=STAGES[cur.si].docs.filter(x=>x.u==='each')[+di];
      memberUnitsOf(p,cur.si).filter(f=>g==='all'||f.groupId===+g).forEach(f=>{dmap(p,cur.si,f.id)[d.n]=1;}); paintDocFirst(); renderGrid(); markActive(); return;}
    const gs=t.closest('[data-gsel]'); if(gs){const g=groupsOf(p).find(x=>x.id===+gs.dataset.gsel); if(g){g.sel=GSEL_NEXT[g.sel||'']; paintDocFirst(); renderGrid(); markActive();} return;}
  }
  const ur=t.closest('[data-unit]'); if(ur){ if(STAGES[cur.si].pair) showFarmVendors(cur.a,cur.si,ur.dataset.unit); else showUnit(cur.a,cur.si,isGkey(ur.dataset.unit)?ur.dataset.unit:+ur.dataset.unit); return;}
  const pr=t.closest('[data-pair]'); if(pr){const ent=cur.ent; showUnit(cur.a,cur.si,pairId(ent,+pr.dataset.pair)); cur.ent=ent; return;}
  const bk=t.closest('[data-back]'); if(bk){ if(bk.dataset.back==='vendors') showFarmVendors(cur.a,cur.si,entKeyOfUnit(cur.unit)); else showCell(cur.a,cur.si); return;}
  const nav=t.closest('[data-nav]'); if(nav&&!nav.disabled){const p=byAlias(cur.a), s=STAGES[cur.si];
    const ek=entKeyOfUnit(cur.unit);
    const list=(s.pair?unitVendors(p,ek).map(v=>pairId(ek,v.id)):unitsOf(p,cur.si).map(u=>u.id)).map(String);
    const i=list.indexOf(String(cur.unit)), n=list[i+ +nav.dataset.nav]; if(n!=null) showUnit(cur.a,cur.si,(s.pair||isGkey(n))?n:+n); return;}
  const so=t.closest('[data-sort]'); if(so){cur.sort=so.dataset.sort;$$('[data-sort]',pbody).forEach(b=>b.classList.toggle('on',b===so));renderUnitRows();return;}
  const ca=t.closest('[data-calladd]'); if(ca){const v=curVendor(); if(!v) return; const d=$('#c-date',pbody).value, m=$('#c-memo',pbody).value.trim();
    if(!m){$('#c-memo',pbody).focus();return;} v.calls.push({date:d||today(),memo:m}); afterCallChange(v); return;}
  const cd=t.closest('[data-calldel]'); if(cd){const v=curVendor(); if(!v) return; v.calls.splice(+cd.dataset.calldel,1); afterCallChange(v); return;}
});
panel.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='c-memo'){e.preventDefault();const b=$('[data-calladd]',pbody);if(b)b.click();}});
/* 단계 이름 클릭 — 사업별로 모아 보기 */
function showStage(si){
  cur={si,view:'stage'}; const s=STAGES[si], {list:mine,year}=visibleProjects(), cd=docsCommon(si);
  ptitle.textContent=s.name; psub.textContent=`${s.no}단계 · 사업 ${mine.length}건`;
  let h='';
  if(cd.length){const d=commonStat(year,si); h+=`<div class="prow ${d.done?'done':''}" data-gotoc="${year}" data-gs="${si}"><span class="pn">${year}년 공통 서류</span><span class="bar"><i style="width:${d.need?Math.round(d.have/d.need*100):0}%"></i></span><span class="cnt">${d.have}/${d.need}</span></div>`;}
  if(hasEach(si)) h+=mine.map(p=>{const c=cellStat(p,si),pct=c.need?Math.round(c.have/c.need*100):0,grp=isGroup(p),L={one:grp?(s.all?'신청 단체':'선정 단체'):(s.all?'신청자':'선정자'),unit:grp?'단체':(s.all?'신청자':'농가')};
    const txt=c.skip?'안 씀':c.nounit?`${L.one} 없음`:c.none?'—':(s.pair?`${c.donePairs}/${c.pairs} 벌`:`${c.doneUnits}/${c.units} ${L.unit}`);
    return `<div class="prow ${c.done?'done':''}" data-goto="${esc(p.alias)}" data-gs="${si}"><span class="pn">${esc(p.alias)}</span><span class="bar"><i style="width:${pct}%"></i></span><span class="cnt">${txt}</span></div>`;}).join('');
  pbody.innerHTML=h+`<p class="note">덜 갖춘 사업부터 눌러서 바로 채울 수 있습니다.</p>`;
  const used=mine.filter(p=>!isSkipped(p,si)), tot=hasEach(si)?used.filter(p=>cellStat(p,si).done).length:null;
  pfoot.innerHTML=tot==null?`<span>이 단계는 공통 서류만 있습니다</span>`:`<span>이 단계를 끝낸 사업 <b>${tot}</b> / <b>${used.length}</b></span>`;
  openPanel();
}

/* ================= 사업 등록 ================= */
const NEW={alias:'',full:'',jeongchaek:'',danwi:'',sebu:'',pyeonseong:'',tong:'307-02',yongdo:'재료비',gukbi:'',dobi:'',sibi:'',jabudam:'',start:'',end:'',gyeyakType:'물품·용역',contractUnit:'farm',noVat:false,farmsText:'',crit:mkCrit()};
let EDIT_ALIAS=null;
function startNew(){EDIT_ALIAS=null;resetNew();showPage('new');}
function openEdit(p){
  EDIT_ALIAS=p.alias;
  ['alias','full','jeongchaek','danwi','sebu','pyeonseong','tong','yongdo','gukbi','dobi','sibi','jabudam','start','end','gyeyakType','contractUnit'].forEach(k=>NEW[k]=p[k]==null?'':p[k]);
  NEW.noVat=!!p.noVat;
  NEW.farmsText=''; NEW.crit=mkCrit(p.crit); showPage('new');
}
function renameAlias(p,newA){
  const old=p.alias; if(old===newA) return;
  if(S[old]){S[newA]=S[old];delete S[old];}
  FILES.forEach(f=>{if(f.ref.a===old) f.ref.a=newA;});
  Object.values(C).forEach(y=>Object.values(y).forEach(st=>{st.excl=st.excl.map(a=>a===old?newA:a);}));
  if(detailOf===old) detailOf=newA; p.alias=newA;
}
function resetNew(){Object.keys(NEW).forEach(k=>{NEW[k]=(k==='tong'?'307-02':k==='yongdo'?'재료비':k==='gyeyakType'?'물품·용역':k==='contractUnit'?'farm':k==='noVat'?false:k==='crit'?mkCrit():'');});}
function verdictHTML(p,title){
  const v=pandan(p), dl=magam(p);
  if(!v.total) return `<div class="card"><h2>${title||'자동 판정'}</h2><div class="empty">재원을 넣으면 판정이 나옵니다.</div></div>`;
  return `<div class="card"><h2>${title||'자동 판정'} <span class="faint" style="font-weight:400">넣으신 값에서 저절로 나온 것</span></h2>
    <dl class="kv" style="margin-top:8px">
      <dt>시스템</dt><dd><b>${v.system}</b> · ${v.yechi}<div class="faint" style="margin-top:2px">${esc(v.note)}</div></dd>
      <dt>총 사업비</dt><dd><b>${won(v.total)}</b>천원 <span class="faint">(${hum(v.total)}) · 보조 ${won(v.bojo)}천원</span>${ratioHTML(v)}</dd>
      <dt>계약</dt><dd class="faint" style="font-size:12.5px">${esc(v.contractNote)}</dd>
      <dt>해당 사항</dt><dd><div class="tags">
        <span class="tag ${v.jaesan?'on':''}">중요재산 ${v.jaesan?'대상':'아님'}</span><span class="tag ${v.geomjeung?'on':''}">정산검증 ${v.geomjeung?'의무':'해당없음'}</span>
        <span class="tag ${v.gongsi?'on':''}">정보공시 ${v.gongsi?'대상':'아님'}</span><span class="tag ${v.jabu?'on':''}">자부담 ${v.jabu?'있음':'없음'}</span></div></dd>
    </dl>
    ${dl.length?`<div class="dl">${dl.map(d=>`<div class="dlrow"><span class="dd">${d.fmt}</span><span class="dn">${esc(d.name)}<span class="dm">${esc(d.memo)}</span></span></div>`).join('')}</div>`:''}
    ${v.warns.length?`<ul class="warnlist">${v.warns.map(w=>`<li>${esc(w)}</li>`).join('')}</ul>`:''}
  </div>`;
}
function critFormHTML(cr,pre){
  const id=k=>`${pre}-${k}`;
  return `<div class="critGrid">
    <div class="f"><span>품목</span><input id="${id('items')}" value="${esc(cr.items)}" placeholder="예: 장미, 국화 (쉼표로)"><div class="hint">비우면 품목 제한 없음</div></div>
    <div class="f"><span>재배형태</span><select id="${id('form')}"><option value="" ${!cr.form?'selected':''}>무관</option><option ${cr.form==='시설'?'selected':''}>시설</option><option ${cr.form==='노지'?'selected':''}>노지</option></select></div>
    <div class="f"><span>면적 (평) 최소</span><input type="number" id="${id('areaMin')}" value="${cr.areaMin}" placeholder="없음"></div>
    <div class="f"><span>면적 (평) 최대</span><input type="number" id="${id('areaMax')}" value="${cr.areaMax}" placeholder="없음"></div>
    <div class="f"><span>연령 최소</span><input type="number" id="${id('ageMin')}" value="${cr.ageMin}" placeholder="없음"></div>
    <div class="f"><span>연령 최대</span><input type="number" id="${id('ageMax')}" value="${cr.ageMax}" placeholder="없음"></div>
    <div class="f"><span>영농경력 (년) 최소</span><input type="number" id="${id('careerMin')}" value="${cr.careerMin}" placeholder="없음"></div>
    <div class="f"><span>중복수혜 제한 (최근 N년)</span><input type="number" id="${id('noRepeat')}" value="${cr.noRepeat}" placeholder="없음"></div>
    <div class="f"><span>&nbsp;</span><label class="check"><input type="checkbox" id="${id('needReg')}" ${cr.needReg?'checked':''}> 경영체 등록 필수</label></div>
    <div class="f"><span>&nbsp;</span><label class="check"><input type="checkbox" id="${id('needLocal')}" ${cr.needLocal?'checked':''}> 관내(여주시) 농가만</label></div>
    <div class="f wide"><span>판정하지 않고 빨간 칸에 띄우기만 할 조건 (한 줄에 하나)</span><textarea id="${id('free')}" placeholder="예: 시설 동고 5m 이상&#10;작목반 소속">${esc(cr.free)}</textarea><div class="hint">"동고 5m 이상"처럼 프로그램이 판정할 수 없는 조건은 여기에. 지원자격 찾기에서 확인 필요로 보입니다.</div></div>
  </div>`;
}
function readCrit(pre){
  const g=k=>$(`#${pre}-${k}`);
  return mkCrit({items:g('items').value.trim(),form:g('form').value,areaMin:toNum(g('areaMin').value),areaMax:toNum(g('areaMax').value),
    ageMin:toNum(g('ageMin').value),ageMax:toNum(g('ageMax').value),careerMin:toNum(g('careerMin').value),noRepeat:toNum(g('noRepeat').value),
    needReg:g('needReg').checked,needLocal:g('needLocal').checked,free:g('free').value.trim()});
}
function drawNew(){
  const pg=$('#page-new'), editing=EDIT_ALIAS?byAlias(EDIT_ALIAS):null;
  if(EDIT_ALIAS&&!editing){EDIT_ALIAS=null;resetNew();}
  pg.innerHTML=`<div class="card"><h2>${editing?`사업 정보 고치기 <span class="pill grey">${esc(editing.alias)}</span>`:'사업 등록'}</h2><div class="desc">${editing?'고친 값은 판정·서류 목록에 바로 반영됩니다. 이미 체크한 서류는 이름 기준으로 그대로 남습니다.':'다섯 가지만 넣으면 시스템·계약방식·마감일·추가서류가 저절로 정해집니다.'}</div>
    <div class="frow">
      <div class="f"><span>별칭</span><input id="n-alias" value="${esc(NEW.alias)}" placeholder="예: 고품질절화"><div class="hint">표에 뜨는 짧은 이름</div></div>
      <div class="f" style="grid-column:1/-1"><span>정식 사업명</span><input id="n-full" value="${esc(NEW.full)}" placeholder="2026년 고품질 절화 생산기반 조성 시범사업"></div>
      <div class="f"><span>보조 종류</span><select id="n-tong">${BOJO_JONG.map(t=>`<option value="${t.code}" ${NEW.tong===t.code?'selected':''}>${t.code} ${t.name}</option>`).join('')}</select><div class="hint">우리 예산에 잡히는 방식</div></div>
      <div class="f"><span>용도</span><select id="n-yongdo">${YONGDO.map(y=>`<option ${NEW.yongdo===y.name?'selected':''}>${y.name}</option>`).join('')}</select><div class="hint">시설비·자산취득비면 중요재산이 따라붙습니다</div></div>
      <div class="f"><span>계약 종류</span><select id="n-gyeyak">${GYEYAK.map(g=>`<option ${NEW.gyeyakType===g.type?'selected':''}>${g.type}</option>`).join('')}</select><div class="hint">계약 한 건이 기준 금액을 넘으면 나라장터 — 계획표에서 계약마다 표시</div></div>
      <div class="f"><span>사업 단위</span><select id="n-contract"><option value="farm" ${NEW.contractUnit!=='vendor'?'selected':''}>개소 사업 — 농가마다</option><option value="vendor" ${NEW.contractUnit==='vendor'?'selected':''}>단체 사업 — 단체마다 (회원 전체 합)</option></select><div class="hint">단체 사업은 서류를 단체마다 한 부로 세고, 계약은 단체 × 업체마다 회원 구입을 전부 합쳐서 봅니다</div></div>
      <div class="f"><span>부가세</span><label class="check" style="margin-top:6px"><input type="checkbox" id="n-novat" ${NEW.noVat?'checked':''}> 고유번호증 단체 (환급 불가)</label></div>
      <div class="f"><span>사업 시작</span><input type="date" id="n-start" ${DLIM} value="${NEW.start}"></div>
      <div class="f"><span>사업 종료</span><input type="date" id="n-end" ${DLIM} value="${NEW.end}"></div>
    </div></div>
    <div class="card"><h2>예산 과목</h2><div class="desc">나중에 e호조에서 찾을 때 씁니다. 비워둬도 등록됩니다.</div>
    <div class="frow">
      <div class="f"><span>정책사업</span><input id="n-jeongchaek" value="${esc(NEW.jeongchaek)}" placeholder="예: 농업기술 보급"></div>
      <div class="f"><span>단위사업</span><input id="n-danwi" value="${esc(NEW.danwi)}" placeholder="예: 소득기술 개발보급"></div>
      <div class="f"><span>세부사업</span><input id="n-sebu" value="${esc(NEW.sebu)}" placeholder="예: 화훼 시범사업"></div>
      <div class="f"><span>편성목</span><input id="n-pyeonseong" value="${esc(NEW.pyeonseong)}" placeholder="예: 307 민간이전"></div>
    </div><div class="sum" id="n-gwamok"></div></div>
    <div class="card"><h2>재원 <span class="faint" style="font-weight:400">천원 단위</span></h2><div class="desc">예: 2,400만원이면 24000. 국비가 있으면 e나라도움, 없으면 보탬e로 정해집니다.</div>
    <div class="frow">
      <div class="f money"><span>국비 (천원)</span><input type="number" id="n-gukbi" value="${NEW.gukbi}" placeholder="0"></div>
      <div class="f money"><span>도비 (천원)</span><input type="number" id="n-dobi" value="${NEW.dobi}" placeholder="0"></div>
      <div class="f money"><span>시비 (천원)</span><input type="number" id="n-sibi" value="${NEW.sibi}" placeholder="0"></div>
      <div class="f money"><span>자부담 (천원)</span><input type="number" id="n-jabudam" value="${NEW.jabudam}" placeholder="0"></div>
    </div><div class="sum" id="n-sum"></div></div>
    ${editing?'':`<div class="card"><h2>수혜자 <span class="faint" style="font-weight:400">나중에 넣어도 됩니다</span></h2><div class="desc" id="n-farmsdesc"></div>
      <div class="f"><textarea id="n-farms">${esc(NEW.farmsText)}</textarea></div></div>`}
    <div class="card"><h2>지원자격 <span class="faint" style="font-weight:400">지원자격 찾기에 쓰입니다 · 나중에 넣어도 됩니다</span></h2><div class="desc">비워둔 항목은 제한이 없는 것으로 봅니다.</div>${critFormHTML(NEW.crit,'nc')}</div>
    <div id="n-verdict">${verdictHTML(NEW)}</div>
    <div class="row" style="margin-top:4px"><button class="btn primary" id="n-save">${editing?'저장':'등록'}</button><button class="btn" id="n-cancel">취소</button></div>`;
  const ids=['alias','full','jeongchaek','danwi','sebu','pyeonseong','tong','yongdo','gyeyak','contract','start','end','gukbi','dobi','sibi','jabudam','farms'];
  ids.forEach(id=>{const el=$('#n-'+id); if(!el) return; const ev=(el.tagName==='SELECT'||el.type==='date')?'change':'input';
    el.addEventListener(ev,()=>{NEW[id==='gyeyak'?'gyeyakType':id==='contract'?'contractUnit':id==='farms'?'farmsText':id]=el.value;$('#n-verdict').innerHTML=verdictHTML(NEW);paintSum();paintGwamok();paintFarmsHint();});});
  function paintFarmsHint(){const d=$('#n-farmsdesc'), ta=$('#n-farms'); if(!d||!ta) return; const grp=NEW.contractUnit==='vendor';
    d.innerHTML=grp?'한 줄에 한 명. <b>맨 앞 칸은 소속 단체</b>(단체가 낸 이름 그대로), 그다음이 사람. 같은 단체 이름끼리 한 단체로 묶이고, 단체가 여럿이면 여럿 다 됩니다. 앞에 "대표 " "총무 "를 붙이면 구분으로 들어갑니다.':'한 줄에 한 명. 앞에 "대표 " "총무 "를 붙이면 구분으로 들어갑니다. 엑셀에서 이름 열을 복사해 붙여넣어도 됩니다.';
    ta.placeholder=grp?'여주 절화 작목반, 대표 김OO\n여주 절화 작목반, 총무 이OO\n가남 화훼 연구회, 대표 박OO':'대표 김OO\n총무 이OO\n회원 박OO';}
  paintFarmsHint();
  $('#n-novat').addEventListener('change',()=>{NEW.noVat=$('#n-novat').checked;});
  function paintGwamok(){const el=$('#n-gwamok'); const t=BOJO_JONG.find(x=>x.code===NEW.tong);
    const parts=[NEW.jeongchaek,NEW.danwi,NEW.sebu,NEW.pyeonseong,t?t.code+' '+t.name:''].filter(x=>x&&x.trim());
    el.innerHTML=parts.length?`<span class="faint">과목</span> <b style="font-size:13px;font-weight:600">${parts.map(esc).join(' › ')}</b>`:`<span class="faint">채우면 여기에 한 줄로 보입니다.</span>`;}
  function paintSum(){const v=pandan(NEW);
    $('#n-sum').innerHTML=v.total?`<span>총 사업비 <b>${won(v.total)}</b>천원 <span class="faint">(${hum(v.total)})</span></span><span>보조 <b>${won(v.bojo)}</b>천원</span><span>자부담 <b>${won(NEW.jabudam||0)}</b>천원</span><span style="flex-basis:100%">${ratioHTML(v)}</span>`
      :`<span class="faint">재원을 넣으면 합계와 보조율이 나옵니다.</span>`;}
  paintSum(); paintGwamok();
  $('#n-cancel').onclick=()=>{const a=EDIT_ALIAS; EDIT_ALIAS=null; resetNew(); if(a) openDetail(a,'sum'); else showPage('grid');};
  $('#n-save').onclick=()=>{
    if(!NEW.alias.trim()){alert('별칭을 넣어주세요.');$('#n-alias').focus();return;}
    const dup=byAlias(NEW.alias.trim());
    if(dup&&(!editing||dup!==editing)){alert('같은 별칭의 사업이 이미 있습니다.');return;}
    if(editing){
      const {farmsText,crit,alias,...rest}=NEW;
      const wasGroup=isGroup(editing);
      Object.assign(editing,rest); editing.full=(NEW.full||'').trim()||NEW.alias.trim(); editing.crit=readCrit('nc');
      renameAlias(editing,NEW.alias.trim()); editing.year=yearOf(editing);
      if(isGroup(editing)&&!wasGroup){ editing.groupsMigrated=false; ensureGroups(editing); }   /* 개소 → 단체로 바꾸면 농가별 체크를 단체로 옮깁니다 */
      const a=editing.alias; EDIT_ALIAS=null; resetNew(); YEAR=editing.year; openDetail(a,'sum'); return;
    }
    const {farmsText,crit,...rest}=NEW;
    const p=mkProject({...rest,alias:NEW.alias.trim(),full:NEW.full.trim()||NEW.alias.trim(),crit:readCrit('nc')});
    p.year=yearOf(p); p.groupsMigrated=true;
    if(isGroup(p)) p.checks=p.checks.filter(c=>c!=='금융거래 확인서');   /* 단체 사업은 금융거래 확인서가 대표 한 부라 회원 체크 항목에서 뺍니다 */
    parseNames(farmsText,isGroup(p)).forEach(x=>{const f=mkFarm(x.name,{role:x.role,tel:x.tel}); if(isGroup(p)) f.groupId=groupByName(p,x.group).id; p.farms.push(f);});
    ensureGroups(p);
    PROJECTS.push(p); resetNew(); YEAR=p.year; openDetail(p.alias,'sum');
  };
}

/* ================= 사업 요약 / 계획표 ================= */
function openDetail(alias,tab){detailOf=alias;subtab=tab||'sum';showPage('detail');}
function drawDetail(){
  const pg=$('#page-detail'), p=byAlias(detailOf); if(!p){showPage('grid');return;}
  const bindEditTop=()=>{const b=$('#editTop'); if(b) b.onclick=()=>openEdit(p);};
  const head=`<button class="back" id="back">← 진행현황으로</button>
    <div class="dhead"><div><h1 class="lede">${esc(p.alias)} <span class="pill ${isGroup(p)?'received':'grey'}" style="font-size:12px;vertical-align:middle">${isGroup(p)?'단체 사업':'개소 사업'}</span></h1><p class="lede-sub">${esc(p.full)}</p></div>
      <button type="button" class="btn sm" id="editTop">✎ 사업 정보 고치기</button></div>
    <div class="tabs2"><button data-tab="sum" class="${subtab==='sum'?'on':''}">요약</button><button data-tab="plan" class="${subtab==='plan'?'on':''}">계획표</button></div>`;
  if(subtab==='plan'){pg.innerHTML=head+`<div id="plan"></div>`; renderPlan(p);}
  else{
    const st=projStat(p), t=BOJO_JONG.find(x=>x.code===p.tong), ps=planStats(p), v=pandan(p), nfiles=FILES.filter(f=>f.ref.a===p.alias).length, cs=critSummary(p.crit);
    pg.innerHTML=head+`<div class="card"><h2>사업 정보</h2>
      <dl class="kv" style="margin-top:8px">
        <dt>예산 과목</dt><dd>${[p.jeongchaek,p.danwi,p.sebu,p.pyeonseong].filter(x=>x&&x.trim()).map(esc).join(' › ')||'<span class="faint">안 넣음</span>'}</dd>
        <dt>보조 종류</dt><dd>${t?esc(t.code+' '+t.name):'—'}</dd>
        <dt>용도</dt><dd>${esc(p.yongdo||'—')}</dd>
        <dt>사업 기간</dt><dd>${p.start||'—'} ~ ${p.end||'—'} <span class="faint">(${p.year}년 사업)</span></dd>
        <dt>재원</dt><dd>국비 ${won(p.gukbi)} · 도비 ${won(p.dobi)} · 시비 ${won(p.sibi)} · 자부담 ${won(p.jabudam)} <span class="faint">(천원)</span>${ratioHTML(v)}</dd>
        <dt>담당</dt><dd>${esc(p.owner)}${p.from?` <span class="faint">· ${esc(p.from)} 님에게서 넘겨받음</span>`:''}</dd>
        <dt>서류</dt><dd><b>${st.have}</b> / ${st.need} <span class="faint">· 붙인 스캔·사진 ${nfiles}장</span></dd>
        <dt>신청·선정</dt><dd>${isGroup(p)?`단체 <b>${groupsOf(p).length}</b>곳 — 선정 <b>${selGroups(p).length}</b> · 탈락 ${groupsOf(p).filter(g=>g.sel==='탈락').length} · 미정 ${groupsOf(p).filter(g=>!g.sel).length} · 회원 <b>${p.farms.length}</b>명${p.farms.filter(f=>f.quit).length?` (포기 ${p.farms.filter(f=>f.quit).length})`:''} <span class="faint">— 선정은 단체 단위, 8단계부터는 선정된 단체만 셉니다</span>`
          :`신청 <b>${p.farms.length}</b>명 · 선정 <b>${selFarms(p).length}</b>명 · 탈락 ${p.farms.filter(f=>f.sel==='탈락').length}명 · 포기 ${p.farms.filter(f=>f.sel==='포기').length}명 · 미정 ${p.farms.filter(f=>!f.sel).length}명 <span class="faint">— 8단계부터는 선정된 사람만 셉니다</span>`}</dd>
        <dt>업체·물품</dt><dd>업체 <b>${p.vendors.length}</b>곳 · 물품 <b>${ps.n}</b>건 <span class="faint">(받음 ${ps.recv}/${ps.n} · 입금 ${ps.paid}/${ps.n})</span> <button class="lnk" data-tab="plan" style="margin-left:8px">계획표 열기</button></dd>
        <dt>계약</dt><dd>${p.contractUnit==='vendor'?'<b>단체 사업</b> — 단체 × 업체가 한 계약 (회원 전체 합). 서류도 단체마다 한 부':'<b>개소 사업</b> — 농가 × 업체가 한 계약. 서류는 농가마다 한 부'}${(()=>{const cs=contracts(p), over=cs.filter(c=>c.over);return ` · 계약 ${cs.length}건${over.length?` · <b style="color:var(--bad)">나라장터 대상 ${over.length}건</b> (${over.map(c=>esc(c.vendor?c.vendor.name:'')).join(', ')})`:''}`;})()}<div class="faint" style="margin-top:2px">${esc(v.contractNote)}</div></dd>
        <dt>부가세</dt><dd>${p.noVat?'<b>고유번호증 단체</b> — 부가세 환급 불가':'환급 대상 여부는 계획표 물품 줄마다 표시 (과세·영세율·면세)'}</dd>
      </dl><div class="row" style="margin-top:12px"><button class="btn sm" id="editProj">사업 정보 고치기</button><span class="hint">별칭·사업명·재원·기간·용도·계약 종류·예산 과목</span></div></div>
      <div class="card"><h2>이 사업에서 쓰는 단계 <span class="faint" style="font-weight:400">끄면 표에서 '안 씀'으로 보이고 서류 수에서 빠집니다</span></h2>
        <div class="critView">${STAGES.map((s,si)=>`<label class="chip click ${stageUsed(p,si)?'on':'off'}"><input type="checkbox" hidden data-stage-use="${si}" ${stageUsed(p,si)?'checked':''}>${stageUsed(p,si)?'☑':'☐'} ${s.no} ${esc(s.name)}</label>`).join(' ')}</div>
        <div class="hint" style="margin-top:8px">공통 서류만 있는 단계(1·3~7)를 끄면 그 해 공통 서류의 '적용되는 사업'에서 이 사업이 빠지는 것과 같습니다.</div></div>
      ${verdictHTML(p,'이 사업의 판정')}
      <div class="card"><h2>지원자격 <span class="faint" style="font-weight:400">지원자격 찾기에서 쓰는 조건</span></h2>
        <div id="critView"><div class="critView">${cs.length?cs.map(x=>`<span class="tag on">${esc(x)}</span>`).join(''):'<span class="faint">아직 조건이 없습니다 — 지원자격 찾기에서 "자격 정보 없음"으로 보입니다.</span>'}${splitList(p.crit.free).map(x=>`<span class="tag" style="color:var(--bad);border-color:#f0c9c4">확인 필요: ${esc(x)}</span>`).join('')}</div>
          <div class="row" style="margin-top:10px"><button class="btn sm" id="critEdit">조건 고치기</button></div></div>
        <div id="critForm" hidden>${critFormHTML(p.crit,'pc')}<div class="row" style="margin-top:10px"><button class="btn sm primary" id="critSave">저장</button><button class="btn sm" id="critCancel">취소</button></div></div>
      </div>
      <div class="row"><button class="btn" id="togrid">진행현황 표에서 보기</button><button class="btn" id="del" style="color:var(--bad)">이 사업 삭제</button></div>`;
    $('#togrid').onclick=()=>showPage('grid');
    $('#editProj').onclick=()=>openEdit(p);
    $$('[data-stage-use]',pg).forEach(cb=>cb.addEventListener('change',()=>{setStageUsed(p,+cb.dataset.stageUse,cb.checked);drawDetail();}));
    $('#critEdit').onclick=()=>{$('#critView').hidden=true;$('#critForm').hidden=false;};
    $('#critCancel').onclick=()=>drawDetail();
    $('#critSave').onclick=()=>{p.crit=readCrit('pc');drawDetail();};
    $('#del').onclick=()=>{
      if(!confirm(`"${p.alias}" 사업을 지웁니다.\n수혜자·계획표·서류 체크·붙인 스캔도 같이 사라집니다. 되돌릴 수 없습니다.`)) return;
      PROJECTS=PROJECTS.filter(x=>x.alias!==p.alias); delete S[p.alias]; FILES.filter(f=>f.ref.a===p.alias).forEach(removeFile); showPage('grid');};
  }
  $('#back').onclick=()=>showPage('grid');
  bindEditTop();
  $$('[data-tab]',pg).forEach(b=>b.onclick=()=>{subtab=b.dataset.tab;drawDetail();window.scrollTo(0,0);});
}

/* ---------- 계획표 ---------- */
function planStats(p,farmId){
  const ls=farmId?p.lines.filter(l=>l.farmId===farmId):p.lines;
  const s={n:ls.length,est:0,act:0,recv:0,paid:0};
  ls.forEach(l=>{s.est+=+l.est||0;s.act+=+l.act||0;if(l.recv)s.recv++;if(l.paid)s.paid++;});
  return s;
}
const REVEAL=new Set(); let EDITING=null;
function sysName(p){return pandan(p).system;}
function renderPlan(p){
  const box=$('#plan'); REVEAL.clear(); EDITING=null; ensureGroups(p);
  box.innerHTML=`<div class="planbar" id="planbar"></div>
    ${isGroup(p)?`<p class="hint" style="margin:-6px 0 10px">단체 사업 — 회원 한 명 한 명의 구입 줄은 그대로 적고, 프로그램이 <b>단체 × 업체</b>로 합쳐서 계약 판정과 12단계 실적 한 벌을 만듭니다. 선정은 단체 단위, 회원이 그만두면 <b>포기</b> 표시 뒤 물품 줄을 다른 회원에게 옮깁니다.</p>`:''}
    <div class="checksbar">${isGroup(p)?'회원':'수혜자'}마다 체크할 것: <span id="cklist"></span><input id="ck-new" placeholder="항목 추가 (예: 위임장)"><button class="btn sm" id="ck-add">추가</button></div>
    <div class="card" style="padding:0;overflow:hidden"><div class="tableWrap" style="border:0;border-radius:0" id="farmWrap"></div></div>
    <div class="card"><div class="vsec" id="vsec"></div><div id="vtab" hidden></div></div>
    <datalist id="dl-vendors"></datalist>
    <datalist id="dl-role"><option value="대표"><option value="총무"><option value="회원"><option value="감사"></datalist>
    <datalist id="dl-method"><option value="전용카드"><option value="계좌이체"></datalist>`;
  renderChecks(p); renderFarmTable(p); renderVendorSec(p); refreshTotals(p); refreshDatalist(p);

  /* 값이 바뀔 때 — 화면을 다시 그리지 않고 자료만 고치고 합계만 갱신 */
  box.addEventListener('change',e=>{
    const el=e.target, k=el.dataset.k, f=el.dataset.f; if(!k) return;
    if(k==='line'){
      const ln=p.lines.find(x=>x.id===+el.dataset.id); if(!ln) return;
      if(f==='vendor'){const name=el.value.trim(); let v=name?p.vendors.find(x=>x.name===name):null;
        if(name&&!v){v=mkVendor(name);p.vendors.push(v);} ln.vendorId=v?v.id:null; el.value=v?v.name:''; renderVendorSec(p); refreshDatalist(p);}
      else if(f==='qty'||f==='est'||f==='act'){ln[f]=toNum(el.value);el.value=fmtNum(ln[f]);}
      else ln[f]=el.value;
      if(f==='vat') el.className='vatsel '+(ln.vat?'v-'+ln.vat:'');
      if(f==='recv'||f==='paid') el.closest('tr').classList.toggle('ok',!!(ln.recv&&ln.paid));
      refreshTotals(p); refreshFarmBits(p); if(f==='vendor'||f==='est'||f==='act') renderVendorSec(p);
    }else if(k==='vendor'){
      const v=p.vendors.find(x=>x.id===+el.dataset.id); if(!v) return; const val=el.value.trim();
      if(f==='name'&&!val){el.value=v.name;return;} v[f]=val;
      $$('tr.lrow',box).forEach(tr=>{const ln=p.lines.find(x=>x.id===+tr.dataset.line); if(ln&&ln.vendorId===v.id){const i=$('input[data-f="vendor"]',tr); if(i) i.value=v.name;}});
      refreshDatalist(p); const vs=$('#vsec',box); if(vs) renderVsecHead(p);
    }else if(k==='ck'){
      const fm=p.farms.find(x=>x.id===+el.dataset.id); if(!fm) return; fm.ck[el.dataset.name]=el.checked; el.closest('label').classList.toggle('on',el.checked); el.closest('label').classList.toggle('off',!el.checked);
    }else if(k==='moveto'){
      const from=p.farms.find(x=>x.id===+el.dataset.id), to=p.farms.find(x=>x.id===+el.value); if(!from||!to) return;
      const ls=p.lines.filter(l=>l.farmId===from.id); if(!ls.length) return;
      if(!confirm(`${from.name||'이 회원'}의 물품 ${ls.length}줄을 ${to.name||'그 회원'}에게 옮깁니다. 옮겨 받은 분의 구입(자부담)이 그만큼 늘어난 것으로 봅니다.`)){el.value='';return;}
      ls.forEach(l=>l.farmId=to.id); p._exp.add(to.id); renderFarmTable(p); renderVendorSec(p); refreshTotals(p);
    }
  });
  /* 엔터 = 바로 아랫줄 같은 칸으로 (엑셀처럼) */
  box.addEventListener('keydown',e=>{
    if(e.key!=='Enter') return; const el=e.target;
    if(el.tagName==='INPUT'&&el.dataset.k==='line'){e.preventDefault(); el.blur();
      const rows=$$('tr.lrow',box), i=rows.indexOf(el.closest('tr')); const next=rows[i+1]&&$(`input[data-f="${el.dataset.f}"]`,rows[i+1]); if(next){next.focus();next.select&&next.select();} return;}
    if(el.closest('tr.fedit')&&el.tagName==='INPUT'){e.preventDefault(); const b=$('[data-esave]',el.closest('tr')); if(b) b.click();}
  });
  box.addEventListener('click',e=>{
    const t=e.target;
    const tg=t.closest('[data-toggle]'); if(tg){const id=+tg.dataset.toggle; if(p._exp.has(id)) p._exp.delete(id); else p._exp.add(id); renderFarmTable(p); refreshTotals(p); return;}
    if(t.id==='expAll'){const all=p.farms.every(f=>p._exp.has(f.id)); p.farms.forEach(f=>all?p._exp.delete(f.id):p._exp.add(f.id)); renderFarmTable(p); refreshTotals(p); return;}
    const sf=t.closest('[data-selfarm]'); if(sf){const fm=p.farms.find(x=>x.id===+sf.dataset.selfarm); if(fm){fm.sel=SEL_NEXT[fm.sel||''];renderFarmTable(p);refreshTotals(p);} return;}
    const qf=t.closest('[data-quitfarm]'); if(qf){const fm=p.farms.find(x=>x.id===+qf.dataset.quitfarm); if(fm){toggleQuit(p,fm);renderFarmTable(p);refreshTotals(p);} return;}
    const qc=t.closest('[data-quitck]'); if(qc){const [id,name]=qc.dataset.quitck.split('|'); const fm=p.farms.find(x=>x.id===+id); if(fm){fm.quitCk[name]=!fm.quitCk[name];renderFarmTable(p);} return;}
    const gs=t.closest('[data-gsel]'); if(gs){const g=groupsOf(p).find(x=>x.id===+gs.dataset.gsel); if(g){g.sel=GSEL_NEXT[g.sel||''];renderFarmTable(p);refreshTotals(p);} return;}
    const gt=t.closest('[data-gtoggle]'); if(gt){const id=+gt.dataset.gtoggle; if(p._gclosed.has(id)) p._gclosed.delete(id); else p._gclosed.add(id); renderFarmTable(p); return;}
    const gr=t.closest('[data-grename]'); if(gr){const g=groupsOf(p).find(x=>x.id===+gr.dataset.grename); if(!g) return; const n=prompt('단체 이름 (단체가 낸 이름 그대로)',g.name); if(n==null) return; g.name=n.trim(); renderFarmTable(p); refreshTotals(p); return;}
    const gd=t.closest('[data-delgroup]'); if(gd&&!gd.disabled){const g=groupsOf(p).find(x=>x.id===+gd.dataset.delgroup); if(!g) return;
      if(membersOf(p,g).length){alert('회원이 있는 단체는 지울 수 없습니다. 회원을 먼저 다른 단체로 옮기거나 빼 주세요.');return;}
      if(!confirm(`단체 "${groupLabel(g)}"을 지웁니다. 이 단체의 서류 체크·스캔도 같이 사라집니다.`)) return;
      p.groups=p.groups.filter(x=>x!==g); delete bucket(p).u[gkey(g)]; FILES.filter(f=>f.ref.a===p.alias&&f.ref.kind==='doc'&&String(f.ref.unit||'').split('v')[0]===gkey(g)).forEach(removeFile);
      renderFarmTable(p); refreshTotals(p); return;}
    if(t.id==='addgroup'){const n=prompt('새 단체 이름 (단체가 낸 이름 그대로)',''); if(n==null) return; const g=mkGroup(n.trim()); p.groups.push(g); renderFarmTable(p); refreshTotals(p); return;}
    const fmb=t.closest('[data-farmmemo]'); if(fmb){gotoFarmMemos(fmb.dataset.farmmemoa,fmb.dataset.farmmemo);return;}
    const rv=t.closest('[data-reveal]'); if(rv){const id=+rv.dataset.reveal; if(REVEAL.has(id)) REVEAL.delete(id); else REVEAL.add(id); renderFarmTable(p); refreshTotals(p); return;}
    const ed=t.closest('[data-edit]'); if(ed){EDITING=+ed.dataset.edit; renderFarmTable(p); refreshTotals(p); const first=$('tr.fedit input[data-ef="name"]',box); if(first) first.focus(); return;}
    const ec=t.closest('[data-ecancel]'); if(ec){EDITING=null; renderFarmTable(p); refreshTotals(p); return;}
    const es=t.closest('[data-esave]'); if(es){const fm=p.farms.find(x=>x.id===+es.dataset.esave); if(!fm) return;
      const tr=es.closest('tr'); ['role','name','rrn','addr','area','tel','sysId','sysPw','memo'].forEach(k=>{const i=$(`[data-ef="${k}"]`,tr); if(i) fm[k]=k==='rrn'?fmtRrn(i.value):i.value.trim();});
      const gsel=$('[data-ef="groupId"]',tr); if(gsel){ if(gsel.value==='__new'){const n=prompt('새 단체 이름 (단체가 낸 이름 그대로)',''); fm.groupId=groupByName(p,(n||'').trim()).id;} else fm.groupId=+gsel.value; }
      EDITING=null; renderFarmTable(p); refreshTotals(p); return;}
    const pw=t.closest('[data-pwtoggle]'); if(pw){const i=$('[data-ef="sysPw"]',pw.closest('.pwrow')); i.type=i.type==='password'?'text':'password'; pw.textContent=i.type==='password'?'보기':'가리기'; return;}
    const al=t.closest('[data-addline]'); if(al){const ln=mkLine(+al.dataset.addline); p.lines.push(ln); p._exp.add(ln.farmId); renderFarmTable(p); refreshTotals(p);
      const inp=$(`tr[data-line="${ln.id}"] input[data-f="item"]`,box); if(inp) inp.focus(); return;}
    const dl=t.closest('[data-delline]'); if(dl){const ln=p.lines.find(x=>x.id===+dl.dataset.delline); if(!ln) return;
      const nf=filesFor({kind:'line',a:p.alias,line:ln.id}).length, hasStuff=ln.item||ln.est||ln.recv||ln.paid||ln.act||nf;
      if(hasStuff&&!confirm(`"${ln.item||'이 줄'}"을 지웁니다.${nf?` 붙인 사진 ${nf}장도 같이 사라집니다.`:''} 되돌릴 수 없습니다.`)) return;
      p.lines=p.lines.filter(x=>x!==ln); filesFor({kind:'line',a:p.alias,line:ln.id}).forEach(removeFile); renderFarmTable(p); renderVendorSec(p); refreshTotals(p); return;}
    const df=t.closest('[data-delfarm]'); if(df){const fm=p.farms.find(x=>x.id===+df.dataset.delfarm); if(!fm) return;
      const n=p.lines.filter(l=>l.farmId===fm.id).length;
      if(!confirm(`"${fm.name||'이 수혜자'}"를 뺍니다.${n?` 물품 ${n}줄과`:''} 이 사람의 서류 체크·스캔도 같이 사라집니다.`)) return;
      p.farms=p.farms.filter(x=>x!==fm); p.lines.filter(l=>l.farmId===fm.id).forEach(l=>filesFor({kind:'line',a:p.alias,line:l.id}).forEach(removeFile));
      p.lines=p.lines.filter(l=>l.farmId!==fm.id); delete bucket(p).u[fm.id]; FILES.filter(f=>f.ref.a===p.alias&&f.ref.kind==='doc'&&f.ref.unit===fm.id).forEach(removeFile);
      renderFarmTable(p); renderVendorSec(p); refreshTotals(p); return;}
    if(t.id==='addfarm'){const fm=mkFarm(''); if(isGroup(p)){ensureGroups(p); const gs=groupsOf(p); if(!gs.length){const n=prompt('먼저 단체 이름을 넣어 주세요 (단체가 낸 이름 그대로)',''); if(n==null) return; p.groups.push(mkGroup(n.trim()));} fm.groupId=groupsOf(p)[groupsOf(p).length-1].id;}
      p.farms.push(fm); EDITING=fm.id; renderFarmTable(p); refreshTotals(p); const i=$('tr.fedit input[data-ef="name"]',box); if(i){i.focus();i.scrollIntoView({block:'center'});} return;}
    if(t.id==='vtoggle'){p._vopen=!p._vopen; renderVendorSec(p); return;}
    const dv=t.closest('[data-delvendor]'); if(dv&&!dv.disabled){const v=p.vendors.find(x=>x.id===+dv.dataset.delvendor); if(!v) return;
      if(!confirm(`업체 "${v.name}"을 지웁니다. 통화 기록과 12단계 서류 체크·스캔도 같이 사라집니다.`)) return;
      p.vendors=p.vendors.filter(x=>x!==v); delete bucket(p).u[v.id]; FILES.filter(f=>f.ref.a===p.alias&&f.ref.kind==='doc'&&f.ref.unit===v.id).forEach(removeFile);
      renderVendorSec(p); refreshDatalist(p); refreshTotals(p); return;}
    if(t.id==='v-add'){const n=$('#v-name',box).value.trim(); if(!n){$('#v-name',box).focus();return;}
      if(p.vendors.find(x=>x.name===n)){alert('같은 이름의 업체가 이미 있습니다.');return;}
      p.vendors.push(mkVendor(n,$('#v-tel',box).value.trim(),$('#v-acct',box).value.trim())); renderVendorSec(p); refreshDatalist(p); refreshTotals(p); return;}
    const cl=t.closest('[data-calls]'); if(cl){showCalls(p.alias,+cl.dataset.calls);return;}
    const lf=t.closest('[data-linefiles]'); if(lf){const ln=p.lines.find(x=>x.id===+lf.dataset.linefiles); if(!ln) return;
      const fm=p.farms.find(x=>x.id===ln.farmId), ref={kind:'line',a:p.alias,line:ln.id}, fs=filesFor(ref), title=`${fm?fm.name+' · ':''}${ln.item||'물품'} 사진`;
      if(fs.length) openViewer(fs.map(x=>x.id),0,ref,title); else pickFiles(ref,added=>{renderFarmTable(p);refreshTotals(p);openViewer(added.map(x=>x.id),0,ref,title);}); return;}
    if(t.id==='ck-add'){const inp=$('#ck-new',box), n=inp.value.trim(); if(!n){inp.focus();return;} if(p.checks.includes(n)){alert('이미 있는 항목입니다.');return;}
      p.checks.push(n); inp.value=''; renderChecks(p); renderFarmTable(p); refreshTotals(p); return;}
    const dc=t.closest('[data-delck]'); if(dc){const n=dc.dataset.delck, cnt=p.farms.filter(f=>f.ck[n]).length;
      if(cnt&&!confirm(`"${n}" 항목을 뺍니다. ${cnt}명에게 체크되어 있는데 그것도 사라집니다.`)) return;
      p.checks=p.checks.filter(x=>x!==n); p.farms.forEach(f=>delete f.ck[n]); renderChecks(p); renderFarmTable(p); refreshTotals(p); return;}
  });
  $('#ck-new',box).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('#ck-add',box).click();}});
}
function renderChecks(p){$('#cklist').innerHTML=p.checks.map(c=>`<span class="chip">${esc(c)}<button type="button" class="chipx" data-delck="${esc(c)}" title="항목 빼기">×</button></span>`).join('')||'<span class="faint">없음</span>';}
function refreshDatalist(p){const d=$('#dl-vendors'); if(d) d.innerHTML=p.vendors.map(v=>`<option value="${esc(v.name)}">`).join('');}
function chipsHTML(p,f){return p.checks.map(c=>`<label class="chip click ${f.ck[c]?'on':'off'}" title="누르면 바뀝니다"><input type="checkbox" hidden data-k="ck" data-name="${esc(c)}" data-id="${f.id}" ${f.ck[c]?'checked':''}>${f.ck[c]?'☑':'☐'} ${esc(c)}</label>`).join(' ');}
/* 단체 하나의 업체별 묶음 — 회원 전원의 구입을 업체마다 합친 것 (계약 판정 · 12단계 한 벌) */
function groupVendHTML(p,g){
  const cs=contracts(p).filter(c=>String(c.entKey)===gkey(g)), si12=STAGES.findIndex(s=>s.pair);
  if(!cs.length) return `<div class="gvbox"><span class="faint">회원 물품 줄에 업체를 적으면 여기에 업체별 합계와 계약 판정이 뜹니다.</span></div>`;
  return `<div class="gvbox"><table class="vend"><thead><tr><th>업체 (단체 × 업체 = 계약 한 건)</th><th style="width:80px">구입 회원</th><th style="width:110px;text-align:right">합계 (원)</th><th style="width:230px">계약 판정 (합계 기준)</th><th style="width:170px">12단계 실적 한 벌</th></tr></thead><tbody>
    ${cs.map(c=>{const d=si12>=0?docStat(arrFor(p,si12,pairId(gkey(g),c.vendorId))):null;
      return `<tr><td><b>${esc(c.vendor?c.vendor.name:'')}</b>${c.vendor&&c.vendor.tel?` <span class="faint">${esc(c.vendor.tel)}</span>`:''}</td><td>${c.farmIds.length}명</td><td class="num">${fmtNum(c.sum)||0}</td>
        <td><span class="cmark ${c.over?'over':''}" style="margin:0">${c.jungang?'중앙 조달 대상':c.over?`나라장터 대상 (${c.lim.type} ${hum(c.lim.g2b/1000)} 초과)`:'자체계약 가능'}</span></td>
        <td>${d&&!d.empty?`<span class="${d.done?'':'faint'}">${d.done?'✓ 다 갖춤':`${d.have}/${d.need}`}</span>`:'<span class="faint">—</span>'}</td></tr>`;}).join('')}
  </tbody></table><div class="hint" style="padding:6px 10px 0">같은 업체라도 다른 단체와는 따로 한 벌이고, 금액도 합치지 않습니다.</div></div>`;
}
function groupHeadHTML(p,g){
  const ms=membersOf(p,g), rep=repOf(p,g), quit=ms.filter(f=>f.quit).length, sum=ms.reduce((s,f)=>{const st=planStats(p,f.id);return s+st.est;},0), vs=groupVendors(p,g), closed=p._gclosed.has(g.id);
  return `<span class="chk2 ${g.sel==='선정'?'on':''} ${g.sel==='탈락'?'bad':''}" data-gsel="${g.id}" title="누르면 미정 → 선정 → 탈락" style="cursor:pointer">${selLabel(g.sel)}</span>
    <span class="gname">${esc(groupLabel(g))}</span><button type="button" class="btn sm ghost" data-grename="${g.id}" title="단체 이름 고치기">✎</button>
    <span class="gmeta" data-gsum="${g.id}">${rep?`대표 <b>${esc(rep.name)}</b>`:'<b style="color:var(--bad)">대표 없음</b> <span class="faint">(구분에 "대표"를 적어 주세요)</span>'} · 회원 <b>${ms.length}</b>명${quit?` <span class="faint">(포기 ${quit})</span>`:''} · 견적 합계 <b>${fmtNum(sum)||0}</b>원 · 업체 <b>${vs.length}</b>곳</span>
    <span class="right"><button type="button" class="btn sm" data-gtoggle="${g.id}">${closed?`회원 ${ms.length}명 펼치기 ▾`:'회원 접기 ▴'}</button><button type="button" class="btn sm ghost" data-delgroup="${g.id}" ${ms.length?'disabled title="회원이 있어 못 지웁니다"':'title="단체 지우기"'} style="color:var(--bad)">×</button></span>`;
}
function renderFarmTable(p){
  const box=$('#farmWrap'); if(!box) return;
  const sys=sysName(p), allOpen=p.farms.length&&p.farms.every(f=>p._exp.has(f.id)), grp=isGroup(p);
  if(grp) ensureGroups(p);
  let h=`<table class="farms"><colgroup><col style="width:46px"><col style="width:${grp?'70px':'54px'}"><col style="width:80px"><col style="width:136px"><col><col style="width:60px"><col style="width:104px"><col style="width:142px"><col style="width:108px"><col style="width:150px"><col style="width:96px"></colgroup><thead><tr><th>구분</th><th>${grp?'참여':'선정'}</th><th>성함</th><th>주민등록번호</th><th>필지주소</th><th class="num">면적(평)</th><th>전화번호</th><th>체크</th><th>${sys} 계정</th><th>물품</th><th class="act"><button type="button" class="btn sm" id="expAll">${allOpen?'전부 접기':'전부 펼치기'}</button></th></tr></thead><tbody>`;
  if(!p.farms.length&&!(grp&&groupsOf(p).length)) h+=`<tr><td colspan="11"><div class="empty">${grp?'단체와 회원이 없습니다. 위의 [+ 단체]로 단체를 만들고 [+ 회원]으로 회원을 넣습니다.':'수혜자가 없습니다. 위의 [+ 수혜자]를 누르면 첫 줄이 생깁니다.'}</div></td></tr>`;
  const farmRow=f=>{
    if(EDITING===f.id){
      return `<tr class="fedit" data-fid="${f.id}"><td colspan="11"><div class="eform">
        ${grp?`<div class="f"><span>소속 단체</span><select data-ef="groupId">${groupsOf(p).map(g=>`<option value="${g.id}" ${f.groupId===g.id?'selected':''}>${esc(groupLabel(g))}</option>`).join('')}<option value="__new">+ 새 단체…</option></select></div>`:''}
        <div class="f"><span>구분</span><input list="dl-role" data-ef="role" value="${esc(f.role)}" placeholder="대표·총무·회원"></div>
        <div class="f"><span>성함</span><input data-ef="name" value="${esc(f.name)}" placeholder="성함"></div>
        <div class="f"><span>주민등록번호</span><input data-ef="rrn" value="${esc(f.rrn)}" placeholder="앞 6자리-뒤 7자리" inputmode="numeric"></div>
        <div class="f wide"><span>필지주소</span><input data-ef="addr" value="${esc(f.addr)}" placeholder="필지주소"></div>
        <div class="f"><span>면적(평)</span><input data-ef="area" value="${esc(f.area)}" placeholder="평" inputmode="numeric"></div>
        <div class="f"><span>전화번호</span><input data-ef="tel" value="${esc(f.tel)}" placeholder="전화번호"></div>
        <div class="f"><span>${sys} 아이디</span><input data-ef="sysId" value="${esc(f.sysId)}" placeholder="아이디" autocomplete="off"></div>
        <div class="f"><span>${sys} 비밀번호</span><div class="pwrow"><input type="password" data-ef="sysPw" value="${esc(f.sysPw)}" placeholder="비밀번호" autocomplete="new-password"><button type="button" class="eye" data-pwtoggle="1">보기</button></div></div>
        <div class="f wide"><span>메모</span><input data-ef="memo" value="${esc(f.memo)}" placeholder="예: 통장 사본 다시 받기"></div>
        <div class="f wide"><span>체크</span><div>${chipsHTML(p,f)}</div></div>
      </div><div class="eact"><button type="button" class="btn sm primary" data-esave="${f.id}">저장</button><button type="button" class="btn sm" data-ecancel="1">취소</button>
        <span class="hint">주민등록번호와 비밀번호는 저장 후 가려서 보이고, [보기]를 눌러야 드러납니다. 서버로 옮길 때는 암호화해서 저장합니다.</span></div></td></tr>`;
    }
    const open=p._exp.has(f.id), rev=REVEAL.has(f.id), fs=planStats(p,f.id), out=grp?f.quit:(f.sel==='탈락'||f.sel==='포기');
    const nLines=p.lines.filter(l=>l.farmId===f.id).length;
    /* 선정 칸 — 개소: 미정→선정→탈락 + (선정이면) 포기 · 단체: 회원 포기 표시 + 물품 줄 옮기기 */
    const selCell=grp
      ?`<button type="button" class="chk2 ${f.quit?'bad':''}" data-quitfarm="${f.id}" title="회원이 그만둔 경우">${f.quit?'포기 취소':'포기'}</button>${f.quit&&nLines?`<select data-k="moveto" data-id="${f.id}" style="margin-top:4px;font-size:11.5px;padding:2px 4px"><option value="">물품 ${nLines}줄 옮길 회원…</option>${membersOf(p,groupOfFarm(p,f)||{id:-1}).filter(x=>x!==f&&!x.quit).map(x=>`<option value="${x.id}">${esc(x.name)}</option>`).join('')}</select>`:''}`
      :`<button type="button" class="chk2 ${f.sel==='선정'?'on':''} ${f.sel==='탈락'||f.sel==='포기'?'bad':''}" data-selfarm="${f.id}" title="누르면 미정 → 선정 → 탈락">${selLabel(f.sel)}</button>${f.sel==='선정'||f.sel==='포기'?`<button type="button" class="chk2 ${f.sel==='포기'?'bad':''}" data-quitfarm="${f.id}" title="선정된 뒤 그만둔 경우" style="margin-top:2px">${f.sel==='포기'?'포기 취소':'포기'}</button>`:''}`;
    const ckCell=(!grp&&f.sel==='포기')?`<span class="faint" style="display:block;font-size:11px">포기 서류</span>${QUIT_DOCS.map(n=>`<span class="chip click ${f.quitCk[n]?'on':'off'}" data-quitck="${f.id}|${esc(n)}">${f.quitCk[n]?'☑':'☐'} ${esc(n)}</span>`).join(' ')}`:chipsHTML(p,f);
    return `<tr class="farmrow ${open?'open':''} ${out?'out':''}" data-fid="${f.id}">
      <td class="role">${esc(f.role)}</td><td>${selCell}</td><td class="nm">${esc(f.name)||'<span class="faint">(이름 없음)</span>'}${f.memo?`<div class="hint">${esc(f.memo)}</div>`:''}${memoBadge(p.alias,f.name)?`<div>${memoBadge(p.alias,f.name)}</div>`:''}</td>
      <td class="rrn">${f.rrn?`<span class="mask">${rev?esc(fmtRrn(f.rrn)):esc(maskRrn(f.rrn))}</span><button type="button" class="eye" data-reveal="${f.id}">${rev?'가리기':'보기'}</button>`:'<span class="faint">—</span>'}</td>
      <td>${esc(f.addr)||'<span class="faint">—</span>'}</td><td class="num">${fmtNum(toNum(f.area))||esc(f.area)||'<span class="faint">—</span>'}</td><td class="tel">${esc(f.tel)||'<span class="faint">—</span>'}</td>
      <td class="ck">${ckCell}</td>
      <td>${f.sysId?`<span class="mask">${esc(f.sysId)}</span> / <span class="mask">${rev?esc(f.sysPw||'(비밀번호 없음)'):'••••••'}</span>${f.rrn?'':`<button type="button" class="eye" data-reveal="${f.id}">${rev?'가리기':'보기'}</button>`}`:'<span class="faint">아직 없음</span>'}</td>
      <td class="msum">${msumHTML(fs)}</td>
      <td class="act"><button type="button" class="btn sm ${open?'primary':''}" data-toggle="${f.id}">${open?'접기 ▴':'펼치기 ▾'}</button><button type="button" class="btn sm ghost" data-edit="${f.id}" title="고치기">✎</button><button type="button" class="btn sm ghost" data-delfarm="${f.id}" title="빼기" style="color:var(--bad)">×</button></td></tr>`
    +(open?(()=>{
      const lines=p.lines.filter(l=>l.farmId===f.id);
      const cs=farmVendors(p,f).map(v=>contractFor(p,f.id,v.id)).filter(Boolean);
      return `<tr class="items"><td colspan="11"><div class="itbox"><div class="itScroll"><table class="items">
        <thead><tr><th style="width:170px">구입물품 (견적)</th><th style="width:64px">수량</th><th style="width:96px">구매액 (견적)</th><th style="width:120px">업체</th><th style="width:112px">물건 받은 날짜</th><th style="width:112px">입금 날짜</th><th style="width:130px">구입물품 (실제)</th><th style="width:96px">구매액 (실제)</th><th style="width:84px">구매방법</th><th style="width:78px">부가세</th><th style="width:60px">사진</th><th style="min-width:80px">비고</th><th style="width:28px"></th></tr></thead>
        <tbody>${lines.map(l=>lineRow(p,l)).join('')||`<tr><td colspan="13" class="ro faint">아직 물품 줄이 없습니다.</td></tr>`}</tbody></table></div>
        <div class="addl"><button type="button" data-addline="${f.id}">+ 물품 줄 추가</button></div>
        <div class="ifoot cm" data-cmfarm="${f.id}" ${cs.length?'':'hidden'}>${cmarksHTML(p,cs)}</div>
        <div class="ifoot">업체 연락처·계좌번호는 아래 '업체'에서 한 번만 적습니다. 엔터를 치면 아랫줄 같은 칸으로 내려갑니다. 부가세 칸은 다음 해 환급 신청 때 씁니다.</div></div></td></tr>`;})():'');
  };
  if(!grp){ p.farms.forEach(f=>{h+=farmRow(f);}); }
  else{
    groupsOf(p).forEach(g=>{
      const ms=membersOf(p,g), closed=p._gclosed.has(g.id);
      h+=`<tr class="grow ${g.sel==='탈락'?'out':''}" data-gid="${g.id}"><td colspan="11"><div class="grpHead">${groupHeadHTML(p,g)}</div></td></tr>`;
      if(!closed){
        if(!ms.length) h+=`<tr><td colspan="11" class="faint" style="padding:8px 14px">아직 회원이 없습니다. 위 [+ 회원]으로 넣고 소속 단체를 고르세요.</td></tr>`;
        ms.forEach(f=>{h+=farmRow(f);});
        h+=`<tr class="gvend" data-gvend="${g.id}"><td colspan="11">${groupVendHTML(p,g)}</td></tr>`;
      }
    });
  }
  h+='</tbody></table>';
  box.innerHTML=h;
}
function cmarksHTML(p,cs){return cs.map(c=>`<span class="cmark ${c.over?'over':''}">${esc(c.vendor?c.vendor.name:'')} 계약 <b>${fmtNum(c.sum)}</b>원${p.contractUnit==='vendor'?` (단체 회원 ${c.farmIds.length}명 합)`:''} — ${c.jungang?'중앙 조달 대상':c.over?`나라장터 대상 (${c.lim.type} ${hum(c.lim.g2b/1000)} 초과)`:'자체계약 가능'}</span>`).join(' ');}
function msumHTML(fs){return fs.n?`<b>${fs.n}</b>건 · 견적 ${fmtNum(fs.est)||0}<br>실제 ${fmtNum(fs.act)||0}<br>받음 ${fs.recv}/${fs.n} · 입금 ${fs.paid}/${fs.n}`:'<span class="faint">물품 없음</span>';}
/* 금액·업체가 바뀌면 화면을 다시 그리지 않고 농가 줄 요약과 계약 표시만 고칩니다 */
function refreshFarmBits(p){
  $$('tr.farmrow').forEach(tr=>{const f=p.farms.find(x=>x.id===+tr.dataset.fid); const td=$('td.msum',tr); if(f&&td) td.innerHTML=msumHTML(planStats(p,f.id));});
  $$('[data-cmfarm]').forEach(box=>{const f=p.farms.find(x=>x.id===+box.dataset.cmfarm); if(!f) return; const cs=farmVendors(p,f).map(v=>contractFor(p,f.id,v.id)).filter(Boolean); box.hidden=!cs.length; box.innerHTML=cmarksHTML(p,cs);});
  if(isGroup(p)){
    $$('tr.grow .grpHead').forEach(el=>{const g=groupsOf(p).find(x=>x.id===+el.closest('tr').dataset.gid); if(g) el.innerHTML=groupHeadHTML(p,g);});
    $$('[data-gvend]').forEach(td=>{const g=groupsOf(p).find(x=>x.id===+td.dataset.gvend); if(g) $('td',td).innerHTML=groupVendHTML(p,g);});
  }
}
function lineRow(p,l){
  const v=l.vendorId?p.vendors.find(x=>x.id===l.vendorId):null, nf=filesFor({kind:'line',a:p.alias,line:l.id}).length;
  return `<tr class="lrow ${l.recv&&l.paid?'ok':''}" data-line="${l.id}">
    <td><input data-k="line" data-f="item" data-id="${l.id}" value="${esc(l.item)}" placeholder="물품"></td>
    <td><input class="num" data-k="line" data-f="qty" data-id="${l.id}" value="${fmtNum(l.qty)}" inputmode="numeric"></td>
    <td><input class="num" data-k="line" data-f="est" data-id="${l.id}" value="${fmtNum(l.est)}" inputmode="numeric"></td>
    <td><input list="dl-vendors" data-k="line" data-f="vendor" data-id="${l.id}" value="${v?esc(v.name):''}" placeholder="업체"></td>
    <td><input type="date" ${DLIM} data-k="line" data-f="recv" data-id="${l.id}" value="${l.recv}"></td>
    <td><input type="date" ${DLIM} data-k="line" data-f="paid" data-id="${l.id}" value="${l.paid}"></td>
    <td><input data-k="line" data-f="actItem" data-id="${l.id}" value="${esc(l.actItem)}"></td>
    <td><input class="num" data-k="line" data-f="act" data-id="${l.id}" value="${fmtNum(l.act)}" inputmode="numeric"></td>
    <td><input list="dl-method" data-k="line" data-f="method" data-id="${l.id}" value="${esc(l.method)}"></td>
    <td><select data-k="line" data-f="vat" data-id="${l.id}" class="vatsel ${l.vat?'v-'+l.vat:''}"><option value="" ${!l.vat?'selected':''}>미정</option><option ${l.vat==='과세'?'selected':''}>과세</option><option ${l.vat==='영세율'?'selected':''}>영세율</option><option ${l.vat==='면세'?'selected':''}>면세</option></select></td>
    <td class="ro"><button type="button" class="lnk" data-linefiles="${l.id}">${nf?`사진 ${nf}`:'+ 사진'}</button></td>
    <td><input data-k="line" data-f="note" data-id="${l.id}" value="${esc(l.note)}"></td>
    <td class="del"><button type="button" data-delline="${l.id}" title="줄 지우기">×</button></td></tr>`;
}
function renderVsecHead(p){
  const vs=$('#vsec'); if(!vs) return;
  vs.innerHTML=`<b>업체 ${p.vendors.length}곳</b><span class="names">${p.vendors.map(v=>esc(v.name)).join(' · ')||'아직 없음'} — 연락처·계좌번호·통화 기록</span><button type="button" class="btn sm ${p._vopen?'primary':''}" id="vtoggle">${p._vopen?'접기 ▴':'펼치기 ▾'}</button>`;
}
function renderVendorSec(p){
  renderVsecHead(p);
  const box=$('#vtab'); if(!box) return; box.hidden=!p._vopen; if(!p._vopen) return;
  const lim=g2bLimit(p);
  const rows=p.vendors.map(v=>{const ls=p.lines.filter(l=>l.vendorId===v.id), est=ls.reduce((s,l)=>s+(+l.est||0),0), last=v.calls.length?v.calls.map(c=>c.date).sort().slice(-1)[0]:null;
    const farmsN=new Set(ls.map(l=>l.farmId)).size, over=contracts(p).some(c=>c.vendorId===v.id&&c.over);
    return `<tr><td><input data-k="vendor" data-f="name" data-id="${v.id}" value="${esc(v.name)}"></td><td><input data-k="vendor" data-f="tel" data-id="${v.id}" value="${esc(v.tel)}" placeholder="연락처"></td>
      <td><input data-k="vendor" data-f="account" data-id="${v.id}" value="${esc(v.account)}" placeholder="계좌번호"></td><td class="ro">${ls.length}건 · 농가 ${farmsN} · ${fmtNum(est)||0}원${over?' · <b style="color:var(--bad)">나라장터</b>':''}</td>
      <td class="ro"><button type="button" class="lnk" data-calls="${v.id}" id="vcalls-${v.id}">${v.calls.length?`${v.calls.length}건 · 마지막 ${mmdd(last)}`:'기록 없음'} — 열기</button></td>
      <td class="del"><button type="button" data-delvendor="${v.id}" ${ls.length?'disabled title="물품 줄에서 쓰고 있어 못 지웁니다"':'title="업체 지우기"'}>×</button></td></tr>`;}).join('');
  box.innerHTML=`<div class="tableWrap" style="margin-top:12px"><table class="vtab"><thead><tr><th>업체명</th><th>연락처</th><th>계좌번호</th><th>${p.contractUnit==='vendor'?'물품 (견적 합계 — 계약 판정은 단체마다)':'물품 (견적 합계)'}</th><th>통화 기록</th><th></th></tr></thead><tbody>${rows}
    <tr><td colspan="6"><div class="addv"><input id="v-name" placeholder="업체명"><input id="v-tel" placeholder="연락처"><input id="v-acct" placeholder="계좌번호"><button type="button" class="btn sm" id="v-add">업체 추가</button></div></td></tr></tbody></table></div>
    <div class="hint" style="margin-top:8px">물품 줄에 업체 이름을 적으면 여기에 저절로 생깁니다. 12단계(실적 보고) 서류는 ${isGroup(p)?'단체':'농가'} × 업체 묶음마다 한 벌씩 생깁니다.</div>`;
}
function refreshTotals(p){
  const bar=$('#planbar'); if(!bar) return;
  const s=planStats(p), v=pandan(p), budget=v.total*1000, pct=budget?Math.round(s.est/budget*100):null;
  const grp=isGroup(p);
  bar.innerHTML=`<span>${grp?`단체 <b>${groupsOf(p).length}</b>곳 (선정 ${selGroups(p).length}) · 회원 <b>${p.farms.length}</b>명`:`수혜자 <b>${p.farms.length}</b>명`} · 물품 <b>${s.n}</b>건 · 업체 <b>${p.vendors.length}</b>곳</span>
    <span>견적 합계 <b>${fmtNum(s.est)||0}</b>원${budget?` <span class="${s.est>budget?'over':''}">(사업비 ${fmtNum(budget)}원의 ${pct}%)</span>`:''}</span>
    <span>실제 합계 <b>${fmtNum(s.act)||0}</b>원</span><span>물건 받음 <b>${s.recv}</b>/${s.n} · 입금 <b>${s.paid}</b>/${s.n}</span>
    <span class="row" style="margin-left:auto">${grp?`<button class="btn sm" id="addgroup">+ 단체</button>`:''}<button class="btn sm primary" id="addfarm">${grp?'+ 회원':'+ 수혜자'}</button></span>`;
}

/* ================= 스캔 찾기 ================= */
function drawFiles(){
  const pg=$('#page-files'), q=FQ.trim().toLowerCase();
  const tagCount={}; FILES.forEach(f=>f.tags.forEach(t=>tagCount[t]=(tagCount[t]||0)+1));
  const tags=Object.keys(tagCount).sort((a,b)=>tagCount[b]-tagCount[a]);
  const years=[...new Set(FILES.map(fileYear).filter(Boolean))].sort((a,b)=>b-a);
  if(FY!=null&&!years.includes(FY)) FY=null;
  const list=FILES.filter(f=>(!q||fileSearchText(f).includes(q))&&(FY==null||fileYear(f)===FY)).sort((a,b)=>b.id-a.id);
  const keep=$('#fq'), hadFocus=keep&&document.activeElement===keep, selStart=keep?keep.selectionStart:null;
  pg.innerHTML=`<div class="card"><h2>스캔 찾기</h2><div class="desc">붙여둔 스캔·사진을 태그, 파일 이름, 사업, 단계, 서류, 농가·업체 이름으로 찾습니다. 붙이는 곳은 서류 목록의 [스캔 첨부]와 계획표의 [사진].</div>
    <div class="fsearch"><input id="fq" placeholder="예: 차광시설, 박정순, 세금계산서, 꽃소비" value="${esc(FQ)}"><span>${list.length} / ${FILES.length}장</span></div>
    ${years.length>1?`<div class="tagcloud">연도 <button type="button" class="tag ${FY==null?'on':''}" data-fyear="">전부</button>${years.map(y=>`<button type="button" class="tag ${FY===y?'on':''}" data-fyear="${y}">${y}년</button>`).join('')}<span style="margin-left:6px">해가 바뀌어도 지워지지 않습니다. 사업이 붙은 해로 나눕니다.</span></div>`:''}
    <div class="tagcloud">${tags.length?'태그: '+tags.map(t=>`<button type="button" data-tag="${esc(t)}" class="${q===t.toLowerCase()?'on':''}">${esc(t)} <span style="opacity:.6">${tagCount[t]}</span></button>`).join(''):'아직 태그가 없습니다. 뷰어에서 사진마다 태그를 달 수 있습니다.'}</div>
    ${list.length?`<div class="fgrid">${list.map((f,i)=>{const c=fileCtx(f);return `<button type="button" class="fcard" data-open="${i}"><div class="fimg">${isImg(f)?`<img src="${f.url}" alt="">`:`<span class="pdf">${f.type==='application/pdf'?'PDF':'파일'}</span>`}</div>
        <div class="fbody"><div class="fname">${esc(f.name)}</div><div class="fctx">${esc(c.proj)} · ${esc(c.where)}${c.unit?` · ${esc(c.unit)}`:''}</div>${f.tags.length?`<div class="ftags">${f.tags.map(t=>`<span class="chip">${esc(t)}</span>`).join('')}</div>`:''}</div></button>`;}).join('')}</div>`
      :`<div class="empty">${FILES.length?'찾는 것이 없습니다.':'아직 붙인 스캔·사진이 없습니다.'}</div>`}</div>`;
  const fq=$('#fq'); fq.addEventListener('input',()=>{FQ=fq.value;drawFiles();});
  if(hadFocus){fq.focus();if(selStart!=null)fq.setSelectionRange(selStart,selStart);}
  $('.card',pg).addEventListener('click',e=>{
    const fy=e.target.closest('[data-fyear]'); if(fy){FY=fy.dataset.fyear?+fy.dataset.fyear:null;drawFiles();return;}
    const tg=e.target.closest('[data-tag]'); if(tg){FQ=(q===tg.dataset.tag.toLowerCase())?'':tg.dataset.tag;drawFiles();return;}
    const op=e.target.closest('[data-open]'); if(op) openViewer(list.map(f=>f.id),+op.dataset.open,null,'찾은 스캔·사진');
  });
}

/* ================= 준비 중 화면 ================= */
function drawVat(){
  const pg=$('#page-vat'), years=[...new Set(PROJECTS.filter(p=>p.mine).map(p=>p.year))].sort((a,b)=>b-a);
  const blocks=years.map(y=>{
    const ps=PROJECTS.filter(p=>p.mine&&p.year===y);
    const rows=[]; let unmarked=0;
    ps.forEach(p=>{p.lines.forEach(l=>{ if(!l.vat){unmarked++;return;} if(l.vat!=='과세') return; const f=p.farms.find(x=>x.id===l.farmId), v=p.vendors.find(x=>x.id===l.vendorId);
      rows.push({p,f,v,l,amt:+l.act||+l.est||0}); });});
    const byProj={}; rows.forEach(r=>{(byProj[r.p.alias]=byProj[r.p.alias]||[]).push(r);});
    const total=rows.filter(r=>!r.p.noVat).reduce((s,r)=>s+r.amt,0);
    return `<div class="card"><h2>${y}년 사업 — 다음 해(${y+1}년) 환급 신청 대상 <span class="pill done">${rows.filter(r=>!r.p.noVat).length}건 · ${fmtNum(total)||0}원</span></h2>
      <div class="desc">계획표에서 <b>과세</b>로 표시한 물품이 모입니다 (금액은 실제 구매액, 없으면 견적). 영세율·면세는 환급 대상이 아니라 빠지고, 미정은 아직 표시 안 한 것입니다${unmarked?` — <b style="color:var(--warn)">미정 ${unmarked}건</b>`:''}.</div>
      ${Object.keys(byProj).length?Object.entries(byProj).map(([a,rs])=>{const p=rs[0].p;
        return `<h3 style="margin:14px 0 6px;font-size:14px">${esc(a)} ${p.noVat?'<span class="pill fail">고유번호증 단체 — 환급 불가</span>':`<span class="faint">${rs.length}건 · ${fmtNum(rs.reduce((s,r)=>s+r.amt,0))}원</span>`}</h3>
        <div class="tableWrap"><table><thead><tr><th>농가</th><th>물품</th><th>업체</th><th class="num">금액 (원)</th><th>입금 날짜</th><th>비고</th></tr></thead><tbody>
        ${rs.map(r=>`<tr class="${p.noVat?'voided':''}"><td>${r.f?esc(r.f.name):'—'}</td><td>${esc(r.l.actItem||r.l.item)}</td><td>${r.v?esc(r.v.name):'—'}</td><td class="num">${fmtNum(r.amt)||0}</td><td>${r.l.paid||'<span class="faint">아직</span>'}</td><td>${esc(r.l.note)}</td></tr>`).join('')}
        </tbody></table></div>`;}).join(''):'<div class="empty">과세로 표시된 물품이 아직 없습니다.</div>'}
    </div>`;
  }).join('');
  pg.innerHTML=`<div class="card"><h2>부가세 환급</h2><div class="desc">사업이 끝난 다음 해에 도는 별도 업무입니다. 지금은 <b>누구의 어떤 물품을 환급받아야 하는지</b>만 계획표에서 모아 보여주고, 신청·고지서·납부 관리는 서버로 옮긴 뒤에 붙입니다.</div>
    <div class="dashNote">농협 경제부는 분기별로, 분기 초 며칠만 신청을 받고 마지막 분기는 잘 안 받아줍니다. 환급은 신청 다음 달 중순쯤 입금되고, 환급 통장은 지정할 수 없으니 신청 전에 농가에 사업통장으로 받고 싶다고 미리 말해야 합니다. 국내산 구근은 면세, 수입산 구근은 과세 10%. 고유번호증 단체는 환급 불가.</div></div>${blocks||'<div class="card"><div class="empty">등록된 사업이 없습니다.</div></div>'}`;
}
/* ================= 메모 ================= */
/* 농가 전화, 부탁받은 일, 잊으면 안 되는 것.
   '해결' = 내가 처리해서 끝 · '넘겨줌' = 남에게 넘겨서 내 손을 떠남 */
const MF={q:'',status:'open',cat:'',alias:'',farm:'',year:null};   /* 목록 거르기 */
let MFLASH=null;                                         /* 방금 상태를 바꿔 목록에서 빠진 메모 — 되돌리기용 */
let MEDIT=null;                                          /* 고치는 중인 메모 id */
const DOW=['일','월','화','수','목','금','토'];
function kdate(d){ if(!d) return ''; const x=new Date(d+'T00:00:00'); return `${x.getMonth()+1}월 ${x.getDate()}일 (${DOW[x.getDay()]})`; }
function memoCatClass(cat){const i=MEMO_CATS.indexOf(cat); return i<0?'c0':'c'+(i%5);}
function memosFor(alias,farmName){return MEMOS.filter(m=>m.farm&&m.farm===farmName&&(!alias||!m.alias||m.alias===alias));}
function allFarmNames(alias){
  const ps=alias?PROJECTS.filter(p=>p.alias===alias):PROJECTS.filter(p=>p.mine);
  return [...new Set(ps.flatMap(p=>p.farms.map(f=>f.name)).filter(Boolean))];
}
function memoFiltered(){
  const q=MF.q.trim().toLowerCase();
  return MEMOS.filter(m=>{
    if(!inStatus(m)) return false;
    if(MF.year!=null&&+String(m.date).slice(0,4)!==MF.year) return false;
    if(MF.cat&&m.cat!==MF.cat) return false; if(MF.alias&&m.alias!==MF.alias) return false; if(MF.farm&&m.farm!==MF.farm) return false;
    if(q&&![m.title,m.body,m.farm,m.alias,m.cat].join(' ').toLowerCase().includes(q)) return false;
    return true;
  }).sort((a,b)=>(isFin(a)-isFin(b))||b.date.localeCompare(a.date)||b.id-a.id);   /* 끝난 것은 뒤로 */
}
/* 위쪽 단추(아직·해결·넘겨줌·전부)에 걸리는지 */
function inStatus(m){
  if(MF.status==='all') return true;
  if(MF.status==='open') return !m.st;
  return m.st===MF.status;
}
const memoRef=id=>({kind:'memo',id});
function memoFiles(id){return filesFor(memoRef(id));}
function dropPendingMemoFiles(){ FILES.filter(f=>f.ref&&f.ref.kind==='memo'&&!f.ref.id).forEach(removeFile); }
function drawMemo(){
  const pg=$('#page-memo'); dropPendingMemoFiles(); MFLASH=null;
  pg.innerHTML=`<div class="lede">메모</div>
    <div class="lede-sub">농가 전화, 부탁받은 일, 잊으면 안 되는 것을 그때그때 적어 둡니다. 분류는 직접 늘리고, 끝난 것은 <b>해결</b>, 남에게 넘긴 것은 <b>넘겨줌</b>으로 넘깁니다.</div>
    <div class="memoWrap">
      <div class="memoMain">
        <div class="mtools"><input id="mq" placeholder="농가 이름 · 제목 · 내용으로 찾기" value="${esc(MF.q)}"><div class="segs" id="mstatus"></div></div>
        <div class="catbar" id="mcats"></div>
        <div id="mfarmflag"></div>
        <div class="card mlist" id="mlist" style="padding:0;overflow:hidden"></div>
        <p class="hint" style="margin-top:8px">메모마다 <b>아직 · 해결 · 넘겨줌</b> 중에서 바로 고르면 됩니다. 아직이 아닌 것은 목록 뒤로 빠지고, 위의 '해결'·'넘겨줌'을 누르면 모아 볼 수 있습니다. 농가 이름을 누르면 그 사람 메모만, 기한이 지난 것은 빨갛게 보입니다.</p>
      </div>
      <div class="memoSide"><div class="card" id="memoForm"></div></div>
    </div>
    <datalist id="dl-memofarm"></datalist>`;
  paintMemoForm(); paintMemoTools(); paintMemoList();
  $('#mq').addEventListener('input',()=>{MF.q=$('#mq').value; MFLASH=null; paintMemoList();});
  pg.addEventListener('click',memoClick);
  pg.addEventListener('keydown',e=>{ if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)&&e.target.closest('#memoForm')){e.preventDefault(); saveMemoForm();} });
  pg.addEventListener('change',e=>{
    if(e.target.id==='mf-cat'){ if(e.target.value==='__new'){ $('#mf-newcat').hidden=false; $('#mf-newcat input').focus(); } else $('#mf-newcat').hidden=true; }
    if(e.target.id==='mf-alias') fillMemoFarmList($('#mf-alias').value);
  });
}
function fillMemoFarmList(alias){ const dl=$('#dl-memofarm'); if(dl) dl.innerHTML=allFarmNames(alias).map(n=>`<option value="${esc(n)}">`).join(''); }
function paintMemoForm(){
  const box=$('#memoForm'); if(!box) return;
  const m=MEDIT!=null?MEMOS.find(x=>x.id===MEDIT):null, v=m||mkMemo({cat:MEMO_CATS[0]||''});
  const mine=PROJECTS.filter(p=>p.mine);
  box.innerHTML=`<h2 style="margin-top:0">${m?'메모 고치기':'새 메모'}</h2>
    <div class="mform">
      <div class="f"><span>날짜</span><input type="date" id="mf-date" ${DLIM} value="${esc(v.date)}"></div>
      <div class="f"><span>기한 (선택)</span><input type="date" id="mf-due" ${DLIM} value="${esc(v.due)}"></div>
      <div class="f wide"><span>분류</span><select id="mf-cat">${MEMO_CATS.map(c=>`<option ${v.cat===c?'selected':''}>${esc(c)}</option>`).join('')}<option value="__new">── 새 분류 만들기…</option></select>
        <div id="mf-newcat" hidden style="margin-top:6px"><input placeholder="새 분류 이름 (예: 병해충 상담)"></div></div>
      <div class="f wide"><span>사업 (선택)</span><select id="mf-alias"><option value="">(사업 없음)</option>${mine.map(p=>`<option value="${esc(p.alias)}" ${v.alias===p.alias?'selected':''}>${esc(p.alias)}</option>`).join('')}</select></div>
      <div class="f wide"><span>농가 (선택)</span><input id="mf-farm" list="dl-memofarm" value="${esc(v.farm)}" placeholder="이름" autocomplete="off"></div>
      <div class="f wide"><span>제목</span><input id="mf-title" value="${esc(v.title)}" placeholder="한 줄로"></div>
      <div class="f wide"><span>내용</span><textarea id="mf-body" placeholder="나눈 이야기, 해야 할 것, 언제까지">${esc(v.body)}</textarea></div>
      <div class="f wide"><span>사진 · 스캔 (선택)</span><div class="thumbs" id="mf-files"></div></div>
    </div>
    <div class="row"><button type="button" class="btn primary" id="mf-save">${m?'고친 것 저장':'적어 두기'}</button>${m?'<button type="button" class="btn" id="mf-cancel">취소</button>':''}<span class="hint">농가 이름을 적어 두면 나중에 그 이름으로 한꺼번에 찾을 수 있습니다. 사업·농가는 비워 둬도 됩니다. Ctrl+Enter로도 저장됩니다.</span></div>`;
  fillMemoFarmList(v.alias); paintMemoFormFiles();
}
/* 폼의 사진 줄 — 새 메모면 아직 번호가 없는(id 0) 임시 꼬리표로 붙여 두었다가 저장할 때 메모 번호를 답니다 */
function paintMemoFormFiles(){
  const box=$('#mf-files'); if(!box) return;
  const fs=memoFiles(MEDIT!=null?MEDIT:0);
  box.innerHTML=fs.map((f,k)=>thumbHTML(f,`data-mfopen="${k}"`)).join('')+`<button type="button" class="thumb add" id="mf-pick" title="사진·스캔 붙이기">+ 사진</button>`+(fs.length?`<span class="hint" style="align-self:center">${fs.length}장 · 누르면 크게, 크게 본 화면에서 지울 수 있습니다</span>`:'');
}
function saveMemoForm(){
  const title=$('#mf-title').value.trim(), body=$('#mf-body').value.trim();
  if(!title&&!body){ $('#mf-title').focus(); return; }
  let cat=$('#mf-cat').value;
  if(cat==='__new'){ cat=$('#mf-newcat input').value.trim(); if(!cat){ $('#mf-newcat input').focus(); return; } if(!MEMO_CATS.includes(cat)) MEMO_CATS.push(cat); }
  const vals={date:$('#mf-date').value||today(),due:$('#mf-due').value||'',cat,alias:$('#mf-alias').value,farm:$('#mf-farm').value.trim(),title:title||body.split('\n')[0].slice(0,40),body};
  if(MEDIT!=null){ const m=MEMOS.find(x=>x.id===MEDIT); if(m) Object.assign(m,vals); MEDIT=null; }
  else { const m=mkMemo(vals); MEMOS.push(m); memoFiles(0).forEach(f=>{f.ref.id=m.id;}); }
  paintMemoForm(); paintMemoTools(); paintMemoList(); markActive();
  $('#mf-title').focus();
}
function paintMemoTools(){
  const st=$('#mstatus'); if(!st) return;
  const nSt=v=>MEMOS.filter(m=>(m.st||'')===v).length;
  st.innerHTML=`<button type="button" class="seg ${MF.status==='open'?'on':''}" data-mstatus="open">아직 ${nSt('')}</button><button type="button" class="seg ${MF.status==='해결'?'on':''}" data-mstatus="해결">해결 ${nSt('해결')}</button><button type="button" class="seg ${MF.status==='넘겨줌'?'on':''}" data-mstatus="넘겨줌">넘겨줌 ${nSt('넘겨줌')}</button><button type="button" class="seg ${MF.status==='all'?'on':''}" data-mstatus="all">전부 ${MEMOS.length}</button>`;
  const cnt=c=>MEMOS.filter(m=>m.cat===c&&inStatus(m)).length;
  const mine=PROJECTS.filter(p=>p.mine), used=new Set(MEMOS.map(m=>m.alias).filter(Boolean));
  const myears=[...new Set(MEMOS.map(m=>+String(m.date).slice(0,4)).filter(Boolean))].sort((a,b)=>b-a);
  if(MF.year!=null&&!myears.includes(MF.year)) MF.year=null;
  $('#mcats').innerHTML=`분류 <button type="button" class="tag ${!MF.cat?'on':''}" data-mcat="">전부</button>${MEMO_CATS.map(c=>`<button type="button" class="tag ${MF.cat===c?'on':''}" data-mcat="${esc(c)}">${esc(c)} ${cnt(c)}</button>`).join('')}<button type="button" class="lnk" id="mcatedit" style="margin-left:6px">분류 고치기</button>
    ${myears.length>1?`<span class="row" style="margin-left:10px">연도 <button type="button" class="tag ${MF.year==null?'on':''}" data-myear="">전부</button>${myears.map(y=>`<button type="button" class="tag ${MF.year===y?'on':''}" data-myear="${y}">${y}년</button>`).join('')}</span>`:''}
    <span style="margin-left:auto" class="row">사업 <button type="button" class="tag ${!MF.alias?'on':''}" data-malias="">전부</button>${mine.filter(p=>used.has(p.alias)).map(p=>`<button type="button" class="tag ${MF.alias===p.alias?'on':''}" data-malias="${esc(p.alias)}">${esc(p.alias)}</button>`).join('')}</span>
    <div id="mcatbox" hidden style="flex-basis:100%"></div>`;
  $('#mfarmflag').innerHTML=MF.farm?`<div class="note" style="padding:6px 0 10px"><b>${esc(MF.farm)}</b> 메모만 보는 중 <button type="button" class="lnk" data-mfarmclear="1" style="margin-left:6px">전부 보기</button></div>`:'';
}
function paintMemoCatBox(){
  const box=$('#mcatbox'); if(!box) return; box.hidden=false;
  box.innerHTML=`<div class="catedit">${MEMO_CATS.map((c,i)=>{const n=MEMOS.filter(m=>m.cat===c).length;
      return `<div class="row"><input data-catname="${i}" value="${esc(c)}"><span class="hint">${n}건</span><button type="button" class="btn sm" data-catren="${i}">이름 바꾸기</button><button type="button" class="btn sm ghost" data-catdel="${i}" ${n?'disabled title="이 분류로 적힌 메모가 있어 지울 수 없습니다"':''} style="color:var(--bad)">지우기</button></div>`;}).join('')}
    <div class="row"><input id="mcat-new" placeholder="새 분류 이름"><button type="button" class="btn sm" id="mcat-add">추가</button><button type="button" class="btn sm ghost" id="mcat-close">닫기</button></div>
    <div class="hint">이름을 바꾸면 그 분류로 적어 둔 메모도 같이 바뀝니다. 메모가 있는 분류는 지울 수 없습니다.</div></div>`;
}
function paintMemoList(){
  const box=$('#mlist'); if(!box) return;
  const list=memoFiltered(), td=today();
  const flash=MFLASH?`<div class="mflash">'${esc(MFLASH.title)}' — <b>${esc(stLabel(MFLASH.now))}</b>${euro(stLabel(MFLASH.now))} 옮겼습니다. 지금 보는 목록에서는 빠집니다. <button type="button" class="lnk" data-munflash="1">되돌리기</button></div>`:'';
  if(!list.length){ box.innerHTML=flash+`<div class="empty">${MEMOS.length?'조건에 맞는 메모가 없습니다.':'아직 메모가 없습니다. 위에서 첫 메모를 적어 보세요.'}</div>`; return; }
  let h=flash, lastDate=null, finShown=false;
  list.forEach(m=>{
    if(isFin(m)&&!finShown){ finShown=true; lastDate=null; h+=`<div class="mday fin">끝난 것 — 해결 · 넘겨줌</div>`; }
    if(m.date!==lastDate){ lastDate=m.date; h+=`<div class="mday">${kdate(m.date)}${m.date===td?' · 오늘':''}</div>`; }
    const late=!m.st&&m.due&&m.due<td;
    const who=[m.alias?`<button type="button" class="lnk faintlnk" data-malias="${esc(m.alias)}">${esc(m.alias)}</button>`:'',m.farm?`<button type="button" class="lnk" data-mfarm="${esc(m.farm)}"><b>${esc(m.farm)}</b></button>`:''].filter(Boolean).join(' · ');
    h+=`<div class="memo ${m.st?'done':''} ${late?'late':''}" data-memo="${m.id}">
      <span class="mcat ${memoCatClass(m.cat)}">${esc(m.cat||'분류 없음')}</span>
      <div><span class="mtitle">${esc(m.title)}</span>${who?`<span class="mwho">${who}</span>`:''}</div>
      <div class="mact">${m.due?`<span class="mdue ${late?'late':''}">${mmdd(m.due)}까지</span>`:''}${stSegHTML(m)}<button type="button" class="btn sm ghost" data-mscan="${m.id}" title="사진·스캔 붙이기">사진</button><button type="button" class="btn sm ghost" data-medit="${m.id}" title="고치기">✎</button><button type="button" class="btn sm ghost" data-mdel="${m.id}" title="지우기" style="color:var(--bad)">×</button></div>
      ${m.body?`<div class="mbody">${esc(m.body)}</div>`:''}
      ${(()=>{const fs=memoFiles(m.id); return fs.length?`<div class="mfiles thumbs">${fs.map((f,k)=>thumbHTML(f,`data-mopen="${k}" data-mid="${m.id}"`)).join('')}<button type="button" class="thumb add" data-mscan="${m.id}" title="더 붙이기">+</button></div>`:'';})()}</div>`;
  });
  box.innerHTML=h;
}
function memoClick(e){
  const t=e.target;
  if(t.id==='mf-save'){saveMemoForm();return;}
  if(t.id==='mf-cancel'){MEDIT=null;dropPendingMemoFiles();paintMemoForm();return;}
  if(t.id==='mf-pick'){ pickFiles(memoRef(MEDIT!=null?MEDIT:0),()=>{paintMemoFormFiles();paintMemoList();}); return; }
  const fo=t.closest('[data-mfopen]'); if(fo){ const id=MEDIT!=null?MEDIT:0, fs=memoFiles(id); openViewer(fs.map(x=>x.id),+fo.dataset.mfopen,memoRef(id),id?`메모 · ${(MEMOS.find(x=>x.id===id)||{}).title||''}`:'새 메모 사진'); return; }
  const ms_=t.closest('[data-mscan]'); if(ms_){ const id=+ms_.dataset.mscan; pickFiles(memoRef(id),()=>{paintMemoList();}); return; }
  const mo=t.closest('[data-mopen]'); if(mo){ const id=+mo.dataset.mid, fs=memoFiles(id), m=MEMOS.find(x=>x.id===id); openViewer(fs.map(x=>x.id),+mo.dataset.mopen,memoRef(id),`메모 · ${m?m.title:''}`); return; }
  const ms=t.closest('[data-mstatus]'); if(ms){MF.status=ms.dataset.mstatus;MFLASH=null;paintMemoTools();paintMemoList();return;}
  const mc=t.closest('[data-mcat]'); if(mc){MF.cat=mc.dataset.mcat;MFLASH=null;paintMemoTools();paintMemoList();return;}
  const my=t.closest('[data-myear]'); if(my){MF.year=my.dataset.myear?+my.dataset.myear:null;MFLASH=null;paintMemoTools();paintMemoList();return;}
  const ma=t.closest('[data-malias]'); if(ma){MF.alias=ma.dataset.malias; paintMemoTools();paintMemoList();return;}
  const mf=t.closest('[data-mfarm]'); if(mf){MF.farm=mf.dataset.mfarm;MF.status='all';paintMemoTools();paintMemoList();window.scrollTo({top:$('#mfarmflag').offsetTop-80,behavior:'smooth'});return;}
  if(t.closest('[data-mfarmclear]')){MF.farm='';paintMemoTools();paintMemoList();return;}
  const md=t.closest('[data-mset]'); if(md){const m=MEMOS.find(x=>x.id===+md.dataset.mset), to=md.dataset.st||'';
    if(m&&(m.st||'')!==to){
      const was=m.st||''; m.st=to; m.stAt=to?today():'';
      MFLASH=inStatus(m)?null:{id:m.id,was,now:m.st,title:m.title};
      paintMemoTools();paintMemoList();markActive();
    }
    return;}
  if(t.closest('[data-munflash]')){ const f=MFLASH; MFLASH=null; if(f){const m=MEMOS.find(x=>x.id===f.id); if(m){m.st=f.was;m.stAt=m.st?today():'';}} paintMemoTools();paintMemoList();markActive();return;}
  const me=t.closest('[data-medit]'); if(me){MEDIT=+me.dataset.medit;paintMemoForm();window.scrollTo({top:0,behavior:'smooth'});$('#mf-title').focus();return;}
  const mx=t.closest('[data-mdel]'); if(mx){const m=MEMOS.find(x=>x.id===+mx.dataset.mdel); if(!m) return; const nf=memoFiles(m.id).length; if(!confirm(`"${m.title}" 메모를 지웁니다${nf?` (붙인 사진 ${nf}장도 같이)`:''}. 되돌릴 수 없습니다.`)) return; memoFiles(m.id).forEach(removeFile); MEMOS=MEMOS.filter(x=>x!==m); if(MEDIT===m.id){MEDIT=null;paintMemoForm();} paintMemoTools();paintMemoList();markActive();return;}
  if(t.id==='mcatedit'){paintMemoCatBox();return;}
  if(t.id==='mcat-close'){$('#mcatbox').hidden=true;return;}
  if(t.id==='mcat-add'){const v=$('#mcat-new').value.trim(); if(!v) return; if(!MEMO_CATS.includes(v)) MEMO_CATS.push(v); paintMemoTools();paintMemoCatBox();paintMemoForm();markActive();return;}
  const cr=t.closest('[data-catren]'); if(cr){const i=+cr.dataset.catren, v=$(`[data-catname="${i}"]`).value.trim(); if(!v||v===MEMO_CATS[i]) return; if(MEMO_CATS.includes(v)){alert('같은 이름의 분류가 이미 있습니다.');return;}
    const old=MEMO_CATS[i]; MEMO_CATS[i]=v; MEMOS.forEach(m=>{if(m.cat===old)m.cat=v;}); if(MF.cat===old) MF.cat=v; paintMemoTools();paintMemoCatBox();paintMemoForm();paintMemoList();markActive();return;}
  const cd=t.closest('[data-catdel]'); if(cd&&!cd.disabled){const i=+cd.dataset.catdel; if(MEMOS.some(m=>m.cat===MEMO_CATS[i])) return; const old=MEMO_CATS[i]; MEMO_CATS.splice(i,1); if(MF.cat===old) MF.cat=''; paintMemoTools();paintMemoCatBox();paintMemoForm();markActive();return;}
}
/* 다른 화면에서 "메모 n" 을 누르면 그 농가 메모만 보이게 */
function gotoFarmMemos(alias,farmName){ MF.q=''; MF.status='all'; MF.cat=''; MF.alias=''; MF.farm=farmName; showPage('memo'); }
function memoBadge(alias,farmName){
  const ms=memosFor(alias,farmName); if(!ms.length) return '';
  const open=ms.filter(m=>!m.st).length;
  return `<button type="button" class="lnk mbadge ${open?'':'quiet'}" data-farmmemo="${esc(farmName)}" data-farmmemoa="${esc(alias)}" title="이 농가 메모 보기">메모 ${open?open:ms.length}${open?'':' (끝남)'}</button>`;
}
function drawAdmin(){
  const pg=$('#page-admin');
  if(!SERVER){
    pg.innerHTML=`<div class="card"><h2>자료 저장·불러오기</h2>
  <div class="desc">서버가 붙기 전까지는 입력한 것이 이 파일(브라우저) 안에만 있어서, 창을 닫거나 새로고침하면 사라집니다. 일하다가 [저장]을 누르면 지금까지 넣은 것(스캔·사진 포함)이 파일 하나로 내려받아지고, 다음에 열 때 [불러오기]로 그 파일을 고르면 이어집니다.</div>
  <div class="row"><button class="btn primary" id="saveAll2">저장 — 파일로 내려받기</button><button class="btn" id="loadAll2">불러오기 — 저장한 파일 고르기</button><span class="hint" id="saveInfo"></span></div>
  <div class="hint" style="margin-top:10px">파일 이름은 이사돔_자료_날짜_시각.json 이고 내려받기 폴더에 들어갑니다. 저장 안 한 변경이 있으면 창을 닫을 때 한 번 물어봅니다. 스캔을 많이 붙이면 파일이 커집니다.</div></div>
  <div class="card"><h2>관리 <span class="faint" style="font-weight:400">서버로 옮길 때 만듭니다</span></h2><div class="soon">계정·비밀번호 바꾸기, 단계와 서류 목록 고치기, 되돌리기.</div></div>`;
    $('#saveAll2').onclick=saveAll; $('#loadAll2').onclick=()=>$('#fload').click(); paintSaveStat(); return;
  }
  pg.innerHTML=`<div class="card"><h2>내 자료</h2>
    <div class="desc">고칠 때마다 3초 안에 서버에 저절로 저장됩니다 (위 오른쪽 '저장됨' 표시). 자료는 잠가서(암호화) 보관하고, 서버가 날마다 첫 저장 직전의 모습을 한 벌씩 남겨 둡니다 — 실수하면 아래에서 되돌릴 수 있습니다.</div>
    <div class="row"><span class="hint" id="saveInfo"></span></div>
    <div class="row" style="margin-top:10px"><button class="btn" id="saveAll2">파일로 내려받기 (여분 백업)</button><button class="btn" id="loadAll2">예전 파일에서 가져오기</button></div>
    <div class="hint" style="margin-top:8px">내려받는 파일에는 첨부 스캔은 안 들어갑니다 (스캔은 서버의 uploads 폴더와 백업에 있습니다). '가져오기'는 시안에서 쓰던 이사돔_자료_….json 을 서버로 옮길 때 한 번 씁니다 — 지금 서버 자료를 그 파일 내용으로 바꿉니다.</div></div>
  <div class="card"><h2>되돌리기 <span class="faint" style="font-weight:400">날마다 한 벌</span></h2>
    <div class="desc">그날 처음 저장하기 직전의 모습입니다. 되돌리면 지금 자료도 오늘 것으로 한 벌 남겨 두니, 다시 앞으로 올 수도 있습니다.</div>
    <div id="bkList" class="hint">불러오는 중…</div></div>
  <div class="card" id="hoIn" hidden></div>
  <div class="card"><h2>내 자료 넘겨주기 <span class="faint" style="font-weight:400">전보 · 인계</span></h2>
    <div class="desc">내 사업·농가·계획표·서류·메모·스캔을 통째로 다른 분에게 넘깁니다. <b>넘기는 본인만 할 수 있습니다</b> — 관리자라도 남의 자료를 끌어올 수는 없고, 여기서 내 비밀번호를 한 번 더 넣어야 넘어갑니다. 넘긴 뒤에도 내 쪽 자료는 그대로 남습니다.</div>
    <div class="row"><select id="ho-to" style="min-width:190px"></select><input id="ho-note" placeholder="한마디 (선택) — 예: 2026년 화훼 세 건" style="flex:1 1 180px"><input type="password" id="ho-pw" placeholder="내 비밀번호" style="width:150px" autocomplete="current-password"><button type="button" class="btn primary sm" id="ho-go">넘겨주기</button></div>
    <div class="hint" id="ho-msg" style="margin-top:7px"></div>
    <div id="ho-out" style="margin-top:10px"></div></div>
  <div class="card" id="userCard" ${ME&&ME.role==='admin'?'':'hidden'}><h2>계정 <span class="faint" style="font-weight:400">관리자만</span></h2>
    <div class="desc"><b>관리자</b>는 계정을 만들고 권한을 바꿀 수 있습니다. <b>직원</b>은 자기 사업·메모만 넣고 고칩니다 — 남의 자료는 누구도 볼 수 없습니다.<br>
      계정을 만들면 임시 비밀번호가 나옵니다. 그 분이 처음 들어올 때 자기 비밀번호로 바꾸게 됩니다. 계정은 지우지 않고 '끄기'만 합니다 (자료는 남습니다).</div>
    <div id="userList" class="hint">불러오는 중…</div>
    <div class="row" style="margin-top:12px"><input id="nu-name" placeholder="이름" style="width:120px"><input id="nu-email" placeholder="이메일 (아이디)" style="width:220px"><select id="nu-role"><option value="staff">직원</option><option value="admin">관리자</option></select><button class="btn primary sm" id="nu-add">계정 만들기</button><span class="hint" id="nu-msg"></span></div></div>
  <div class="card"><h2>서버</h2><div class="hint" id="srvInfo"></div></div>`;
  $('#saveAll2').onclick=saveAll; $('#loadAll2').onclick=()=>$('#fload').click(); paintSaveStat();
  api('/api/auth/me').then(r=>{ $('#srvInfo').innerHTML=r.ok?`지금 들어와 있는 사람 <b>${esc(ME.name)}</b> — ${ME.role==='admin'?'관리자 (계정 관리까지)':'직원 (내 사업·메모)'}<br>자료 저장: ${r.db==='mysql'?'MariaDB':'sqlite 파일'} · 로그인 유지 ${r.sessionHours}시간 · 코드 ${esc(r.codeStamp||'')} · 주소 ${esc(location.host)}`:''; });
  paintBackups(); paintHandover(); if(ME&&ME.role==='admin') paintUsers();
  pg.onclick=async e=>{
    const t=e.target;
    const rs=t.closest('[data-restore]'); if(rs){ const day=rs.dataset.restore;
      if(!confirm(`${day} 아침 상태로 되돌립니다. 지금 자료는 오늘 복사본으로 남깁니다. 계속할까요?`)) return;
      const r=await apiJSON('/api/state/restore','POST',{day}); if(!r.ok){alert(r.error||'되돌리지 못했습니다.');return;}
      STATE_VERSION=r.version; await applySnapshot(r.data||{projects:[]},{quiet:true}); LAST_SIG=stateSig(); LAST_SAVED=hhmm(); CONFLICT=false; SAVE_ERR='';
      showPage('admin'); alert(`${day} 상태로 되돌렸습니다.`); return; }
    if(t.id==='ho-go'){ await sendHandover(); return; }
    const hc=t.closest('[data-hocancel]'); if(hc){
      if(!confirm(hc.dataset.mine==='1'?'넘겨준 것을 물립니다. 상대방 화면에서 사라집니다.':'이 자료를 안 받겠다고 합니다. 넘긴 분 화면에 "물림"으로 보입니다.')) return;
      const r=await apiJSON(`/api/handover/${hc.dataset.hocancel}/cancel`,'POST',{}); if(!r.ok){alert(r.error||'실패');return;} paintHandover(); return; }
    const ha=t.closest('[data-hoaccept]'); if(ha){ await acceptHandover(+ha.dataset.hoaccept, ha.dataset.hname||''); return; }
    if(t.id==='nu-add'){ const name=$('#nu-name').value.trim(), email=$('#nu-email').value.trim(); const msg=$('#nu-msg');
      if(!name||!email){msg.textContent='이름과 이메일을 넣어주세요.';return;}
      const r=await apiJSON('/api/users','POST',{name,email,role:$('#nu-role').value}); if(!r.ok){msg.textContent=r.error||'만들지 못했습니다.';return;}
      $('#nu-name').value=''; $('#nu-email').value=''; msg.textContent='';
      alert(`계정을 만들었습니다.\n\n아이디: ${email}\n임시 비밀번호: ${r.tempPassword}\n\n이 비밀번호를 그 분께 전해 주세요. 처음 들어올 때 바꾸게 됩니다.`); paintUsers(); return; }
    const rp=t.closest('[data-resetpw]'); if(rp){ const id=+rp.dataset.resetpw; if(!confirm('이 계정의 비밀번호를 초기화합니다. 새 임시 비밀번호가 나옵니다.')) return;
      const r=await apiJSON(`/api/users/${id}`,'PATCH',{resetPassword:true}); if(!r.ok){alert(r.error||'실패');return;} alert(`새 임시 비밀번호: ${r.tempPassword}\n\n그 분께 전해 주세요.`); paintUsers(); return; }
    const ta=t.closest('[data-toggleactive]'); if(ta){ const id=+ta.dataset.toggleactive, on=ta.dataset.on==='1';
      if(on&&!confirm('이 계정을 끕니다. 그 분은 더 못 들어오지만 자료는 남습니다.')) return;
      const r=await apiJSON(`/api/users/${id}`,'PATCH',{isActive:!on}); if(!r.ok){alert(r.error||'실패');return;} paintUsers(); return; }
  };
  pg.onchange=async e=>{ const rl=e.target.closest('[data-role]'); if(rl){ const r=await apiJSON(`/api/users/${rl.dataset.role}`,'PATCH',{role:rl.value}); if(!r.ok) alert(r.error||'실패'); paintUsers(); } };
}
/* 남의 자료 한 벌을 내 자료 뒤에 붙입니다 — 번호와 별칭이 겹치지 않게 새로 답니다 */
function mergeSnapshot(snap, fileMap, fromName){
  const aliasMap={}, unitMap={}, lineMap={}, memoMap={}, renamed=[];
  const remapUnit=(key,maps)=>{
    const t=String(key), m=t.match(/^(g?\d+)v(\d+)$/);
    const ent=k=>{ if(/^g\d+$/.test(k)){const g=maps.g[+k.slice(1)]; return g==null?null:'g'+g;} const f=maps.f[+k]; return f==null?null:f; };
    if(m){ const e=ent(m[1]), v=maps.v[+m[2]]; return (e!=null&&v!=null)?`${e}v${v}`:null; }
    const e=ent(t); if(e!=null) return e;
    const v=maps.v[+t]; return v==null?null:v;   /* 예전 판에서 업체 번호로 적어 둔 것도 살립니다 */
  };
  /* 사업 */
  (snap.projects||[]).forEach(raw=>{
    const q=mkProject(raw);
    q._exp=new Set(); q._vopen=false; q.crit=mkCrit(raw.crit||{}); q.skip=(raw.skip||[]).slice();
    q.checks=(raw.checks||DEFAULT_CHECKS).slice(); q.contractUnit=raw.contractUnit||'farm'; q.noVat=!!raw.noVat;
    let a=raw.alias||'사업';
    if(byAlias(a)){ const base=`${a} (${fromName})`; let n=base, i=2; while(byAlias(n)) n=`${base} ${i++}`; renamed.push(`${a} → ${n}`); a=n; }
    aliasMap[raw.alias]=a; q.alias=a; q.from=fromName; q.owner=(ME&&ME.name)||q.owner; q.mine=true;
    const fm={}, vm={}, gm={};
    q.groups=(raw.groups||[]).map(g=>{const ng=mkGroup(g.name,g); ng.id=uid(); gm[g.id]=ng.id; return ng;});
    q.farms=(raw.farms||[]).map(f=>{const nf=mkFarm(f.name||'',f); nf.id=uid(); nf.ck=Object.assign({},f.ck||{}); nf.quitCk=Object.assign({},f.quitCk||{}); nf.groupId=(f.groupId!=null&&gm[f.groupId]!=null)?gm[f.groupId]:null; fm[f.id]=nf.id; return nf;});
    q.vendors=(raw.vendors||[]).map(v=>{const nv=mkVendor(v.name||'',v.tel,v.account); nv.calls=(v.calls||[]).map(c=>Object.assign({},c)); vm[v.id]=nv.id; return nv;});
    q.lines=(raw.lines||[]).map(l=>{const nl=mkLine(fm[l.farmId],l); nl.id=uid(); nl.farmId=fm[l.farmId]!=null?fm[l.farmId]:null; nl.vendorId=(l.vendorId!=null&&vm[l.vendorId]!=null)?vm[l.vendorId]:null; lineMap[l.id]=nl.id; return nl;});
    q.year=raw.year||yearOf(q);
    unitMap[raw.alias]={f:fm,v:vm,g:gm};
    q._gclosed=new Set();
    PROJECTS.push(q);
  });
  /* 서류 상태 */
  Object.entries(snap.S||{}).forEach(([oldA,b])=>{
    const a=aliasMap[oldA]; if(!a) return;
    const maps=unitMap[oldA]||{f:{},v:{},g:{}}, nb=S[a]||(S[a]={u:{}});
    Object.entries((b&&b.u)||{}).forEach(([oldUnit,st])=>{
      const nu=remapUnit(oldUnit,maps); if(nu==null) return;
      nb.u[nu]=JSON.parse(JSON.stringify(st));
    });
  });
  /* 해 공통 서류 — 내 것이 이미 있으면 그대로 두고, 뺀 사업 목록만 합칩니다 */
  Object.entries(snap.C||{}).forEach(([year,ys])=>{
    Object.entries(ys||{}).forEach(([si,st])=>{
      const y=C[year]||(C[year]={});
      if(!y[si]) y[si]={arr:(st.arr||[]).slice(),excl:(st.excl||[]).map(x=>aliasMap[x]).filter(Boolean)};
      else (st.excl||[]).forEach(x=>{const a=aliasMap[x]; if(a&&!y[si].excl.includes(a)) y[si].excl.push(a);});
    });
  });
  /* 직접 사업 */
  const directIn=(window.DIRECT&&snap.direct)?DIRECT.merge(snap.direct,fromName):[];
  /* 메모 */
  (snap.memoCats||[]).forEach(c=>{ if(c&&!MEMO_CATS.includes(c)) MEMO_CATS.push(c); });
  (snap.memos||[]).forEach(raw=>{
    const m=mkMemo(raw); const oldId=raw.id; m.id=uid();
    m.alias=raw.alias?(aliasMap[raw.alias]||''):'';
    memoMap[oldId]=m.id; MEMOS.push(m);
  });
  /* 첨부 — 서버가 복사해 둔 새 번호로 갈아 끼웁니다 */
  let nFiles=0;
  (snap.files||[]).forEach(x=>{
    const nid=fileMap[x.id]; if(!nid||!x.ref) return;
    const r=x.ref; let ref=null;
    if(r.kind==='cdoc') ref={kind:'cdoc',year:r.year,si:r.si,doc:r.doc};
    else if(r.kind==='memo'){ const id=memoMap[r.id]; if(id) ref={kind:'memo',id}; }
    else if(r.kind==='line'){ const a=aliasMap[r.a], line=lineMap[r.line]; if(a&&line) ref={kind:'line',a,line}; }
    else if(r.kind==='ddoc'){ ref=window.DIRECT?DIRECT.remapRef(r):null; }
    else if(r.kind==='doc'){ const a=aliasMap[r.a]; const maps=unitMap[r.a];
      if(a&&maps){ const u=r.unit==null?null:remapUnit(r.unit,maps); if(r.unit==null||u!=null) ref={kind:'doc',a,si:r.si,unit:u,doc:r.doc}; } }
    if(!ref) return;
    FILES.push({id:nid,name:x.name,type:x.type||'',size:x.size||0,blob:null,url:`/api/files/${nid}`,tags:(x.tags||[]).slice(),ref,added:x.added||today()});
    nFiles++;
  });
  PROJECTS.forEach(p=>ensureGroups(p));
  YEAR=null; detailOf=null;
  return {projects:(snap.projects||[]).length, memos:(snap.memos||[]).length, files:nFiles, renamed, direct:directIn.length};
}
/* 내 자료를 다른 분에게 넘깁니다 — 본인 비밀번호를 한 번 더 확인합니다 */
async function sendHandover(){
  const to=$('#ho-to').value, msg=$('#ho-msg');
  msg.style.color=''; msg.textContent='';
  if(!to){ msg.textContent='받을 분을 고르세요.'; return; }
  const pw=$('#ho-pw').value; if(!pw){ msg.textContent='내 비밀번호를 넣어 주세요.'; $('#ho-pw').focus(); return; }
  const name=$('#ho-to').selectedOptions[0].textContent;
  if(!confirm(`내 자료를 ${name} 에게 넘깁니다.\n\n · 사업 ${PROJECTS.filter(p=>p.mine).length}건 · 메모 ${MEMOS.length}건 · 스캔 ${FILES.length}장이 통째로 갑니다\n · 그분이 '받기'를 눌러야 들어갑니다. 그 전에는 물릴 수 있습니다\n · 내 쪽 자료는 그대로 남습니다\n\n계속할까요?`)) return;
  if(stateSig()!==LAST_SIG) await saveToServer(true);   /* 지금까지 고친 것까지 넘깁니다 */
  const r=await apiJSON('/api/handover','POST',{toUserId:+to,password:pw,note:$('#ho-note').value.trim()});
  $('#ho-pw').value='';
  if(!r.ok){ msg.style.color='var(--bad)'; msg.textContent=r.error||'넘기지 못했습니다.'; return; }
  $('#ho-note').value=''; $('#ho-to').value='';
  msg.style.color='var(--accent)'; msg.textContent=`${r.to} 님에게 넘겼습니다 (${r.summary}). 그분이 받으면 상태가 바뀝니다.`;
  paintHandover();
}
const HO_TAKEN=new Set();
/* 나에게 온 자료를 받아 내 자료 뒤에 붙입니다 */
async function acceptHandover(id, fromName){
  if(HO_TAKEN.has(id)){ alert('이미 받았습니다. 화면 오른쪽 위의 저장 표시를 확인해 주세요.'); return; }
  if(!confirm(`${fromName} 님이 넘긴 자료를 받습니다.\n\n · 내 사업은 그대로 두고 뒤에 더해집니다\n · 이름이 겹치는 사업은 "○○ (${fromName})" 으로 구분해 들어옵니다\n\n계속할까요?`)) return;
  const r=await apiJSON(`/api/handover/${id}/accept`,'POST',{});
  if(!r.ok){ alert(r.error||'받지 못했습니다.'); return; }
  HO_TAKEN.add(id);
  const n=mergeSnapshot(r.data, r.fileMap||{}, r.from||fromName);
  LAST_SIG='';
  if(!await saveToServer(true)){ alert('받기는 했는데 서버에 저장하지 못했습니다.\n화면 오른쪽 위의 저장 표시를 확인해 주세요. 저장되면 그대로 남습니다.'); return; }
  await apiJSON(`/api/handover/${id}/done`,'POST',{});
  alert(`${r.from||fromName} 님의 자료를 받았습니다.\n\n사업 ${n.projects}건 · 메모 ${n.memos}건 · 스캔 ${n.files}장${n.renamed.length?`\n\n이름이 겹쳐 바꾼 사업: ${n.renamed.join(', ')}`:''}`);
  showPage('grid');
}
const HO_ST={pending:'기다리는 중',taken:'받았음',cancelled:'물림'};
async function paintHandover(){
  const sel=$('#ho-to'); if(!sel) return;
  const pl=await api('/api/handover/people');
  if(pl.ok) sel.innerHTML=`<option value="">받을 분 고르기</option>`+pl.rows.map(u=>`<option value="${u.id}">${esc(u.name)} (${esc(u.email)})</option>`).join('');
  const r=await api('/api/handover'); if(!r.ok) return;
  const out=$('#ho-out');
  out.innerHTML=r.outgoing.length?`<div class="tableWrap"><table><thead><tr><th>받는 분</th><th>넘긴 날</th><th>무엇</th><th>상태</th><th></th></tr></thead><tbody>${r.outgoing.map(h=>`<tr class="${h.status==='pending'?'':'faint'}">
    <td><b>${esc(h.to_name)}</b></td><td class="nowrap">${esc(String(h.created_at).slice(0,16))}</td><td>${esc(h.summary||'')}${h.note?`<div class="hint">${esc(h.note)}</div>`:''}</td>
    <td>${h.status==='pending'?'<span class="pill received">기다리는 중</span>':(h.status==='taken'?`<span class="pill pass">받았음</span>`:'<span class="pill grey">물림</span>')}</td>
    <td>${h.status==='pending'?`<button type="button" class="btn sm ghost" data-hocancel="${h.id}" data-mine="1" style="color:var(--bad)">물리기</button>`:''}</td></tr>`).join('')}</tbody></table></div>`:'';
  const box=$('#hoIn'); if(!box) return;
  box.hidden=!r.incoming.length;
  box.innerHTML=r.incoming.length?`<h2>넘겨받을 자료 <span class="pill received">${r.incoming.length}건</span></h2>
    <div class="desc">다른 분이 나에게 넘긴 자료입니다. [받기]를 누르면 내 사업 뒤에 더해집니다.</div>
    ${r.incoming.map(h=>`<div class="hoRow"><div><b>${esc(h.from_name)}</b> 님 · ${esc(String(h.created_at).slice(0,16))}<div class="hint">${esc(h.summary||'')}${h.note?` — ${esc(h.note)}`:''}${h.by_tool?' <b style="color:var(--warn)">※ 서버 컴퓨터에서 넘긴 것입니다</b>':''}</div></div>
      <div class="row"><button type="button" class="btn primary sm" data-hoaccept="${h.id}" data-hname="${esc(h.from_name)}">받기</button><button type="button" class="btn sm ghost" data-hocancel="${h.id}" style="color:var(--bad)">안 받기</button></div></div>`).join('')}`:'';
}
async function paintBackups(){
  const box=$('#bkList'); if(!box) return;
  const r=await api('/api/state/backups'); if(!r.ok){box.textContent=r.error||'';return;}
  if(!r.rows.length){box.textContent='아직 복사본이 없습니다. 내일부터 하루 한 벌씩 생깁니다.';return;}
  box.innerHTML=`<table><thead><tr><th>날짜</th><th class="num">크기</th><th></th></tr></thead><tbody>${r.rows.map(b=>`<tr><td>${esc(b.day)}</td><td class="num">${Math.max(1,Math.round(b.bytes/1024))}KB</td><td><button type="button" class="btn sm" data-restore="${esc(b.day)}">이 날 아침 상태로 되돌리기</button></td></tr>`).join('')}</tbody></table>`;
}
async function paintUsers(){
  const box=$('#userList'); if(!box) return;
  const r=await api('/api/users'); if(!r.ok){box.textContent=r.error||'';return;}
  box.innerHTML=`<div class="tableWrap"><table><thead><tr><th>이름</th><th>아이디(이메일)</th><th>권한</th><th>상태</th><th>마지막 로그인</th><th>자료</th><th></th></tr></thead><tbody>${r.rows.map(u=>`<tr class="${u.is_active?'':'faint'}">
    <td><b>${esc(u.name)}</b>${u.id===r.me?' <span class="pill done">나</span>':''}${u.online?' <span class="pill pass">접속 중</span>':''}</td><td>${esc(u.email)}</td>
    <td><select data-role="${u.id}" ${u.id===r.me?'disabled':''}><option value="staff" ${u.role==='staff'?'selected':''}>직원</option><option value="admin" ${u.role==='admin'?'selected':''}>관리자</option></select></td>
    <td>${u.is_active?(u.must_change_pw?'<span class="pill grey">임시 비밀번호</span>':'쓰는 중'):'<span class="pill grey">꺼짐</span>'}</td>
    <td class="nowrap">${u.last_login_at?esc(String(u.last_login_at).slice(0,16)):'-'}</td><td class="nowrap">${u.state_bytes?`${Math.round(u.state_bytes/1024)}KB · ${esc(String(u.state_at||'').slice(0,10))}`:'없음'}</td>
    <td class="nowrap"><button type="button" class="btn sm" data-resetpw="${u.id}">비밀번호 초기화</button> ${u.id===r.me?'':`<button type="button" class="btn sm ghost" data-toggleactive="${u.id}" data-on="${u.is_active?1:0}">${u.is_active?'끄기':'켜기'}</button>`}</td></tr>`).join('')}</tbody></table></div>`;
}

/* ================= 지원자격 찾기 (로그인 전에도) ================= */
const QA={item:'',form:'',area:'',reg:'',local:'',age:'',career:'',lastYears:''};
function drawQuali(){
  const pg=$('#page-quali'); const years=[...new Set(qualiProjects().map(p=>p.year))].sort((a,b)=>b-a); const year=years[0]||new Date().getFullYear();
  pg.innerHTML=`<div class="card"><h2>지원자격 찾기 <span class="pill done">${year}년 사업</span></h2>
    <div class="desc">농가 조건을 넣으면 올해 신청할 수 있는 시범사업을 골라 줍니다. 로그인 없이 누구나 볼 수 있습니다. 비워둔 칸은 그 조건을 따지지 않습니다.</div>
    <div class="qGrid">
      <div class="f"><span>품목</span><input id="q-item" value="${esc(QA.item)}" placeholder="예: 국화"></div>
      <div class="f"><span>재배형태</span><select id="q-form"><option value="" ${!QA.form?'selected':''}>모름</option><option ${QA.form==='시설'?'selected':''}>시설</option><option ${QA.form==='노지'?'selected':''}>노지</option></select></div>
      <div class="f"><span>면적 (평)</span><input type="number" id="q-area" value="${QA.area}" placeholder="예: 1000"></div>
      <div class="f"><span>경영체 등록</span><select id="q-reg"><option value="" ${!QA.reg?'selected':''}>모름</option><option value="yes" ${QA.reg==='yes'?'selected':''}>등록됨</option><option value="no" ${QA.reg==='no'?'selected':''}>안 됨</option></select></div>
      <div class="f"><span>관내 여부</span><select id="q-local"><option value="" ${!QA.local?'selected':''}>모름</option><option value="yes" ${QA.local==='yes'?'selected':''}>여주시</option><option value="no" ${QA.local==='no'?'selected':''}>관외</option></select></div>
      <div class="f"><span>연령 (만)</span><input type="number" id="q-age" value="${QA.age}" placeholder="예: 52"></div>
      <div class="f"><span>영농경력 (년)</span><input type="number" id="q-career" value="${QA.career}" placeholder="예: 8"></div>
      <div class="f"><span>최근 같은 사업 수혜</span><select id="q-last"><option value="" ${QA.lastYears===''?'selected':''}>없음 / 모름</option><option value="0" ${QA.lastYears==='0'?'selected':''}>올해</option><option value="1" ${QA.lastYears==='1'?'selected':''}>1년 전</option><option value="2" ${QA.lastYears==='2'?'selected':''}>2년 전</option><option value="3" ${QA.lastYears==='3'?'selected':''}>3년 전</option><option value="5" ${QA.lastYears==='5'?'selected':''}>그보다 전</option></select></div>
    </div>
    <div class="qRes" id="qRes"></div>
    <p class="dimLine" style="margin-top:18px">여주시농업기술센터 <a href="https://www.yeoju.go.kr/" target="_blank" rel="noopener">누리집</a><span class="dot egg" id="eggDot" title="">·</span></p>
  </div>`;
  const ids={item:'q-item',form:'q-form',area:'q-area',reg:'q-reg',local:'q-local',age:'q-age',career:'q-career',lastYears:'q-last'};
  Object.entries(ids).forEach(([k,id])=>{const el=$('#'+id); el.addEventListener(el.tagName==='SELECT'?'change':'input',()=>{QA[k]=el.value;renderQuali(year);});});
  $('#eggDot').addEventListener('click',()=>{if(LOGGED) showPage('grid'); else openLogin();});
  renderQuali(year);
}
function renderQuali(year){
  const box=$('#qRes'); if(!box) return;
  const list=qualiProjects().filter(p=>p.year===year);
  const filled=Object.values(QA).some(v=>v!==''&&v!=null);
  if(!list.length){box.innerHTML='<div class="empty">올해 등록된 사업이 없습니다.</div>';return;}
  const rs=list.map(p=>({p,r:elig(p,QA)}));
  const ok=rs.filter(x=>!x.r.none&&x.r.ok), no=rs.filter(x=>!x.r.none&&!x.r.ok), none=rs.filter(x=>x.r.none);
  const red=ok.filter(x=>x.r.free.length);
  box.innerHTML=(filled?`<div class="qSum"><span class="ok">신청 가능 <b>${ok.length}</b>건</span><span class="no">안 됨 <b>${no.length}</b>건</span>${red.length?`<span class="red">확인 필요 <b>${red.length}</b>건</span>`:''}${none.length?`<span class="faint">자격 정보 없음 ${none.length}건</span>`:''}</div>`
    :`<div class="dashHint">위 칸을 채우면 여기에 사업별로 신청 가능 여부가 나옵니다. 아래는 올해 사업의 조건입니다.</div>`)
    +rs.sort((a,b)=>(a.r.none?2:a.r.ok?0:1)-(b.r.none?2:b.r.ok?0:1)).map(({p,r})=>{
      const cs=critSummary(p.crit);
      const cls=r.none?'none':(filled?(r.ok?'ok':'no'):'');
      const head=filled&&!r.none?`<span class="pill ${r.ok?'pass':'grey'}">${r.ok?'신청 가능':'안 됨'}</span>`:(r.none?'<span class="pill grey">자격 정보 없음</span>':'');
      return `<div class="qCard ${cls}"><h3>${esc(p.alias)} ${head}</h3><div class="sub">${esc(p.full)}</div>
        ${cs.length?`<ul>${cs.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:(r.none?'<div class="faint" style="margin-top:4px">담당자가 아직 조건을 넣지 않았습니다.</div>':'')}
        ${filled&&r.reasons.length?`<ul>${r.reasons.map(x=>`<li class="why">${esc(x)}</li>`).join('')}</ul>`:''}
        ${r.free.length?`<div class="qRed"><b>확인이 필요한 조건 — 프로그램이 판정하지 못하는 것</b>${r.free.map(x=>esc(x)).join(' · ')}</div>`:''}</div>`;
    }).join('');
}

/* ================= 예시 스캔 (가짜 그림) ================= */
(function seedFiles(){ if(SERVER) return;
  function make(text,color,cb){
    const c=document.createElement('canvas');c.width=620;c.height=820;const x=c.getContext('2d');
    x.fillStyle='#fff';x.fillRect(0,0,620,820);x.fillStyle=color;x.fillRect(0,0,620,96);
    x.fillStyle='#fff';x.font='bold 34px sans-serif';x.fillText(text,30,62);
    x.fillStyle='#444';x.font='21px sans-serif';x.fillText('(예시 이미지 — 실제 스캔은 여기에 붙습니다)',30,150);
    x.strokeStyle='#ccc';for(let i=0;i<11;i++){x.beginPath();x.moveTo(30,220+i*48);x.lineTo(590,220+i*48);x.stroke();}
    x.strokeStyle='#d33';x.lineWidth=3;x.beginPath();x.arc(520,700,42,0,Math.PI*2);x.stroke();x.fillStyle='#d33';x.font='bold 20px sans-serif';x.fillText('인',508,708);
    c.toBlob(b=>cb(new File([b],text+'.png',{type:'image/png'})),'image/png');
  }
  const p=byAlias('꽃소비(국화)'), p2=byAlias('장미국화'); if(!p||!p2) return;
  const vBest=p.vendors.find(v=>v.name==='베스트몸'), vBo=p.vendors.find(v=>v.name==='㈜보승농자재');
  const jobs=[
    ['추진계획 공문','#49642B',{kind:'cdoc',year:2026,si:0,doc:'소득기술분야 시범사업 추진계획 공문'},['공문','추진계획','2026']],
    ['현지조사 계획 공문','#49642B',{kind:'cdoc',year:2026,si:2,doc:'소득팀 현지조사 계획 공문'},['공문','현지조사']],
    ['베스트몸 견적서','#1c4e80',{kind:'doc',a:p.alias,si:11,unit:vBest.id,doc:'견적서'},['견적서','베스트몸','국화']],
    ['박정순 교부신청서','#1c4e80',{kind:'doc',a:p.alias,si:7,unit:p.farms[0].id,doc:'지방보조금 교부 신청서'},['교부신청서','박정순']],
    ['차광시설 설치 사진','#9a6700',{kind:'line',a:p.alias,line:p.lineChagwang.id},['차광시설','설치 후','박정순','보승농자재']],
    ['보승농자재 사업자등록증','#6d7480',{kind:'doc',a:p.alias,si:11,unit:vBo.id,doc:'사업자등록증'},['사업자등록증','보승농자재']],
    ['김정수 통장 사본','#6d7480',{kind:'doc',a:p2.alias,si:7,unit:p2.farms[0].id,doc:'통장 사본'},['통장사본','김정수']],
    ['박정순 새 통장 사진','#9a6700',{kind:'memo',id:MEMOS.length?MEMOS[0].id:0},['통장','박정순','메모']],
  ];
  let n=0;
  jobs.forEach(([text,color,ref,tags])=>make(text,color,file=>{const [f]=addFiles([file],ref); f.tags=tags.slice(); f.added='2026-09-10';
    if(++n===jobs.length){if(PAGE==='files')drawFiles();if(PAGE==='grid')renderGrid();if(cur)paintPanel();LAST_SIG=stateSig();paintSaveStat();}}));
})();


/* ================= 저장 · 불러오기 (파일) ================= */
let LAST_SIG='', LAST_SAVED='';
function snapshot(withFiles){
  return {app:'isadom',ver:4,savedAt:new Date().toISOString(),uid:UID,year:YEAR,
    projects:PROJECTS.map(p=>{const {_exp,_vopen,_gclosed,lineChagwang,...rest}=p; return {...rest,_exp:[...(_exp||[])]};}),
    S, C, memos:MEMOS, memoCats:MEMO_CATS, direct:window.DIRECT?DIRECT.serialize():(snapshot._directKeep||null),
    files:FILES.map(f=>({id:f.id,name:f.name,type:f.type,size:f.size,tags:f.tags,ref:f.ref,added:f.added,data:withFiles?(f._data||null):null}))};
}
function stateSig(){const s=snapshot(false); delete s.savedAt; return JSON.stringify(s);}
function paintSaveStat(){
  const dirty=LOGGED&&stateSig()!==LAST_SIG;
  const el=$('#saveStat'), info=$('#saveInfo');
  if(SERVER){
    let text='', bad=false;
    if(CONFLICT){text='저장 막힘 — 새로고침 필요';bad=true;}
    else if(SAVING) text='저장 중…';
    else if(SAVE_ERR){text=`저장 못 함 — ${SAVE_ERR}`;bad=true;}
    else if(dirty) text='곧 저장';
    else text=LAST_SAVED?`${LAST_SAVED} 저장됨`:'';
    if(el){el.textContent=text;el.classList.toggle('dirty',bad||dirty);}
    if(info) info.textContent=text;
    if(dirty&&!SAVING&&!CONFLICT&&!RELOGIN) saveToServer();
    return;
  }
  if(el){el.textContent=dirty?'저장 안 됨':(LAST_SAVED?`${LAST_SAVED} 저장`:'');el.classList.toggle('dirty',dirty);}
  if(info) info.textContent=dirty?'아직 저장하지 않은 변경이 있습니다.':(LAST_SAVED?`마지막 저장 ${LAST_SAVED}`:'');
}
/* 서버에 저장 — 고친 것이 있으면 3초 안에 저절로 갑니다. force 면 무조건 */
async function saveToServer(force){
  if(!SERVER||!LOGGED||SAVING||CONFLICT||RELOGIN) return false;
  const sig=stateSig(); if(!force&&sig===LAST_SIG) return true;
  SAVING=true; const el=$('#saveStat'); if(el) el.textContent='저장 중…';
  const r=await apiJSON('/api/state','PUT',{baseVersion:STATE_VERSION,data:snapshot(false)});
  SAVING=false;
  if(r.ok){ STATE_VERSION=r.version; LAST_SIG=sig; LAST_SAVED=hhmm(); SAVE_ERR=''; paintSaveStat(); return true; }
  if(r.code==='CONFLICT'){ CONFLICT=true; paintSaveStat();
    alert('다른 창(또는 다른 컴퓨터)에서 먼저 저장된 자료가 있어서, 이 화면은 더 저장하지 못합니다.\n\n이 창을 새로고침하면 그쪽 자료가 보입니다. 지금 화면의 내용을 남기고 싶으면 새로고침 전에 [관리 → 파일로 내려받기]로 받아 두세요.'); return false; }
  if(r.code==='NEED_LOGIN'){ paintSaveStat(); return false; }
  SAVE_ERR=r.error||'서버 오류'; paintSaveStat(); return false;
}
/* 새 창에서 보기 — 파일에서 바로 연 시안에서는 blob 주소를 새 창에 못 띄우는 브라우저가 있어, 빈 창을 먼저 열고 그 안에 파일 내용을 통째로 넣습니다 */
async function openInNewWindow(f){
  if(SERVER){ window.open(f.url,'_blank'); return; }
  const w=window.open('','_blank'); if(!w){alert('새 창이 막혔습니다. 브라우저 주소창 오른쪽의 팝업 차단을 풀어 주세요.');return;}
  try{
    w.document.write(`<!doctype html><title>${esc(f.name)}</title><p style="font-family:sans-serif;padding:20px">여는 중…</p>`);
    const d=f._data||(f._data=await blobToDataURL(f.blob));
    const body=isImg(f)?`<img src="${d}" alt="" style="max-width:100%;display:block;margin:0 auto">`:`<embed src="${d}" type="application/pdf" style="width:100vw;height:100vh">`;
    w.document.open(); w.document.write(`<!doctype html><title>${esc(f.name)}</title><style>body{margin:0;background:#2a2d2b}</style>${body}`); w.document.close();
  }catch(e){ try{w.document.body.innerHTML='<p style="font-family:sans-serif;padding:20px">이 파일은 새 창에서 열지 못했습니다. [내려받기]로 받아서 여세요.</p>';}catch(_){} }
}
function blobToDataURL(blob){return new Promise((res,rej)=>{const r=new FileReader();r.onload=()=>res(r.result);r.onerror=rej;r.readAsDataURL(blob);});}
function dataURLToBlob(d){const [h,b64]=d.split(',');const mime=(h.match(/data:([^;]+)/)||[])[1]||'application/octet-stream';const bin=atob(b64);const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new Blob([u],{type:mime});}
async function saveAll(){
  for(const f of FILES){ if(!f._data&&f.blob){ try{ f._data=await blobToDataURL(f.blob);}catch(e){ f._data=null; } } }
  const snap=snapshot(true), text=JSON.stringify(snap);
  const d=new Date(), stamp=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}_${String(d.getHours()).padStart(2,'0')}${String(d.getMinutes()).padStart(2,'0')}`;
  const blob=new Blob([text],{type:'application/json'}), url=URL.createObjectURL(blob);
  const a=document.createElement('a'); a.href=url; a.download=`이사돔_자료_${stamp}.json`; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),4000);
  if(SERVER) return;   /* 서버 판에서는 여분 백업일 뿐 — 저장 표시는 서버 기준 */
  LAST_SIG=stateSig(); LAST_SAVED=`${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; paintSaveStat();
}
function loadFromText(text){
  let snap; try{ snap=JSON.parse(text); }catch(e){ alert('이사돔 저장 파일이 아닙니다 (읽을 수 없음).'); return false; }
  if(!snap||snap.app!=='isadom'||!Array.isArray(snap.projects)){alert('이사돔 저장 파일이 아닙니다.');return false;}
  return applySnapshot(snap,{fromFile:true}).then(async()=>{ if(SERVER){ LAST_SIG=''; await saveToServer(true); } return true; });   /* 서버 판은 가져온 것을 곧바로 저장 */
}
/* 자료 덩어리(snapshot)를 화면에 올립니다 — 파일에서 왔든 서버에서 왔든 같은 길 */
async function applySnapshot(snap,opt){
  opt=opt||{};
  closePanel(); closeViewer();
  FILES.slice().forEach(f=>{ if(!SERVER||(opt.fromFile&&f.id&&!f.blob)) removeFile(f); else { const i=FILES.indexOf(f); if(i>=0) FILES.splice(i,1); } });
  PROJECTS=snap.projects.map(p=>{const q=mkProject(p); q._exp=new Set(p._exp||[]); q._vopen=false; q._gclosed=new Set(); q.crit=mkCrit(p.crit||{}); q.skip=p.skip||[]; q.checks=p.checks||DEFAULT_CHECKS.slice(); q.contractUnit=p.contractUnit||'farm'; q.noVat=!!p.noVat; q.groups=(p.groups||[]).map(g=>mkGroup(g.name,g)); q.farms=(p.farms||[]).map(f=>mkFarm(f.name||'',f)); q.lines=(p.lines||[]).map(l=>mkLine(l.farmId,l)); q.year=p.year||yearOf(q); return q;});
  Object.keys(S).forEach(k=>delete S[k]); Object.assign(S,snap.S||{});
  Object.keys(C).forEach(k=>delete C[k]); Object.assign(C,snap.C||{});
  if(window.DIRECT) DIRECT.load(snap.direct||null); else snapshot._directKeep=snap.direct||null;   /* direct.js 가 없어도 자료를 잃지 않게 붙들어 둡니다 */
  MEMOS=(snap.memos||[]).map(m=>mkMemo(m));   /* 예전 파일의 아직/넘겨줌도 여기서 새 상태로 바뀝니다 */ MEMO_CATS=Array.isArray(snap.memoCats)&&snap.memoCats.length?snap.memoCats.slice():['전화','부탁받음','서류','할 일']; MEMOS.forEach(m=>{if(m.cat&&!MEMO_CATS.includes(m.cat)) MEMO_CATS.push(m.cat);}); MEDIT=null; Object.assign(MF,{q:'',status:'open',cat:'',alias:'',farm:''});
  for(const x of (snap.files||[])){
    if(SERVER&&!x.data){ if(x.id) FILES.push({id:x.id,name:x.name,type:x.type||'',size:x.size||0,blob:null,url:`/api/files/${x.id}`,tags:x.tags||[],ref:x.ref,added:x.added||today()}); continue; }
    if(!x.data) continue;
    const blob=dataURLToBlob(x.data);
    if(SERVER){ /* 예전 파일에 들어 있던 스캔은 서버에 올려 둡니다 */
      const [f]=await uploadFiles([new File([blob],x.name||'파일',{type:x.type||blob.type})],x.ref||{kind:'doc'});
      if(f){ f.tags=x.tags||[]; f.added=x.added||f.added; }
      continue; }
    FILES.push({id:x.id,name:x.name,type:x.type||blob.type,size:x.size||blob.size,blob,_data:x.data,url:URL.createObjectURL(blob),tags:x.tags||[],ref:x.ref,added:x.added||today()});
  }
  let maxId=0; PROJECTS.forEach(p=>{p.farms.forEach(f=>maxId=Math.max(maxId,f.id||0));groupsOf(p).forEach(g=>maxId=Math.max(maxId,g.id||0));p.vendors.forEach(v=>maxId=Math.max(maxId,v.id||0));p.lines.forEach(l=>maxId=Math.max(maxId,l.id||0));}); FILES.forEach(f=>maxId=Math.max(maxId,f.id||0)); MEMOS.forEach(m=>maxId=Math.max(maxId,m.id||0));
  UID=Math.max(snap.uid||1,maxId+1);
  PROJECTS.forEach(p=>ensureGroups(p));   /* 단체 사업의 예전 자료(농가별 체크)는 여기서 단체로 옮겨집니다 */
  YEAR=snap.year||null; detailOf=null;
  LAST_SIG=stateSig(); const t=snap.savedAt?new Date(snap.savedAt):null; LAST_SAVED=t?`${String(t.getMonth()+1).padStart(2,'0')}.${String(t.getDate()).padStart(2,'0')} ${String(t.getHours()).padStart(2,'0')}:${String(t.getMinutes()).padStart(2,'0')}`:'';
  if(!opt.quiet){ if(!LOGGED) setLogged(true); else showPage(PAGE==='detail'?'grid':PAGE); }
  paintSaveStat(); return true;
}
$('#fload').addEventListener('change',()=>{
  const f=$('#fload').files[0]; $('#fload').value=''; if(!f) return;
  if(stateSig()!==LAST_SIG&&!confirm('지금 화면에 저장 안 한 변경이 있습니다. 불러오면 그것은 사라집니다. 계속할까요?')) return;
  const r=new FileReader(); r.onload=async()=>{ if(await loadFromText(r.result)) alert(`불러왔습니다 — 사업 ${PROJECTS.length}건, 스캔·사진 ${FILES.length}장, 메모 ${MEMOS.length}건`); }; r.readAsText(f,'utf-8');
});
$('#saveAll').addEventListener('click',()=>{ if(SERVER) saveToServer(true); else saveAll(); });
$('#loadAll').addEventListener('click',()=>$('#fload').click());
window.addEventListener('beforeunload',e=>{ if(LOGGED&&stateSig()!==LAST_SIG){ e.preventDefault(); e.returnValue=''; } });
setInterval(paintSaveStat,3000);

/* ================= 시작 ================= */
fitSide();
(async function boot(){
  if(!SERVER){ setLogged(false); LAST_SIG=stateSig(); return; }
  document.body.classList.add('serverMode');
  $('#lgEmail').placeholder='이메일'; $('#lgPw').placeholder='비밀번호';
  await refreshQuali();
  const me=await api('/api/auth/me');
  HAS_ANY_USER=me.hasAnyUser!==false;
  $('#lgHint').textContent=HAS_ANY_USER?'계정은 관리자가 만들어 드립니다. 비밀번호를 잊으면 관리자에게 초기화를 부탁하세요.':'아직 계정이 하나도 없습니다. 서버 컴퓨터의 명령창에서  node db\\make_admin.js  로 관리자 계정을 먼저 만들어 주세요.';
  if(me.ok&&me.user){ ME=me.user; await enterApp(); } else setLogged(false);
  paintSaveStat();
})();
