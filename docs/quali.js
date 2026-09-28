/* =====================================================================
 *  이사돔 — 지원자격 보탬  quali.js  v1 (2026-09-22)
 *  ① 사업 등록·고치기 화면의 지원자격 칸에 [지원자격 전부 지우기] — 품목·재배형태·면적·연령·경력·중복수혜·경영체·관내·빨간 칸 조건을 한 번에 비움 ([등록/저장]을 눌러야 반영)
 *  ② 사업 요약의 '조건 고치기' 안에도 [전부 지우기] — 누르면 바로 비워져 저장되고, 지원자격 찾기에는 "자격 정보 없음"으로 보임
 *  ③ 지원자격 찾기 화면에 [조건 전부 지우기] — 농가 조건 입력 칸(품목·면적·연령…)을 한 번에 비움
 *  app.js 의 drawNew · drawDetail · drawQuali 를 감싸서(wrap) 단추만 덧붙입니다 — app.js 는 고치지 않았습니다. 이 파일이 없어도 나머지는 그대로 돕니다.
 * ===================================================================== */
(function(){
'use strict';
const q=(s,r)=>(r||document).querySelector(s);
/* 지원자격 칸(접두어 pre)을 전부 비웁니다 */
function clearCrit(pre){
  ['items','areaMin','areaMax','ageMin','ageMax','careerMin','noRepeat','free'].forEach(k=>{ const el=q(`#${pre}-${k}`); if(el) el.value=''; });
  const f=q(`#${pre}-form`); if(f) f.value='';
  ['needReg','needLocal'].forEach(k=>{ const el=q(`#${pre}-${k}`); if(el) el.checked=false; });
}
/* ① 사업 등록·고치기 */
const _drawNew=window.drawNew;
if(typeof _drawNew==='function') window.drawNew=function(){ const r=_drawNew.apply(this,arguments);
  const grid=q('#nc-items') && q('#nc-items').closest('.critGrid'); if(grid&&!q('#nc-clear')){
    const row=document.createElement('div'); row.className='row'; row.style.marginTop='10px';
    row.innerHTML=`<button type="button" class="btn sm ghost" id="nc-clear" style="color:var(--bad)">지원자격 전부 지우기</button><span class="hint">칸을 전부 비웁니다. 아래 [등록/저장]을 눌러야 반영됩니다.</span>`;
    grid.insertAdjacentElement('afterend',row);
    q('#nc-clear').onclick=()=>{ if(!confirm('이 사업의 지원자격 조건 칸을 전부 비웁니다. (아래 [등록/저장]을 눌러야 반영됩니다)')) return; clearCrit('nc'); };
  } return r; };
/* ② 사업 요약 — 조건 고치기 */
const _drawDetail=window.drawDetail;
if(typeof _drawDetail==='function') window.drawDetail=function(){ const r=_drawDetail.apply(this,arguments);
  const save=q('#critSave'); if(save&&!q('#pc-clear')){
    const b=document.createElement('button'); b.type='button'; b.className='btn sm ghost'; b.id='pc-clear'; b.style.color='var(--bad)'; b.textContent='전부 지우기';
    save.parentElement.appendChild(b);
    b.onclick=()=>{ const p=(typeof detailOf!=='undefined'&&detailOf)?byAlias(detailOf):null; if(!p) return;
      if(!confirm(`"${p.alias}" 사업의 지원자격 조건을 전부 지웁니다. 지원자격 찾기에는 "자격 정보 없음"으로 보입니다.`)) return;
      p.crit=mkCrit(); drawDetail(); };
  } return r; };
/* ③ 지원자격 찾기 — 입력한 농가 조건 전부 지우기 */
function addQualiClear(){
  const grid=q('#page-quali .qGrid'); if(!grid||q('#q-clear')) return;
  const row=document.createElement('div'); row.className='row'; row.style.marginTop='10px';
  row.innerHTML=`<button type="button" class="btn sm ghost" id="q-clear">조건 전부 지우기</button><span class="hint">위 칸을 모두 비워 처음부터 다시 넣습니다.</span>`;
  grid.insertAdjacentElement('afterend',row);
  q('#q-clear').onclick=()=>{ if(typeof QA!=='undefined') Object.keys(QA).forEach(k=>QA[k]=''); drawQuali(); const i=q('#q-item'); if(i) i.focus(); };
}
const _drawQuali=window.drawQuali;
if(typeof _drawQuali==='function') window.drawQuali=function(){ const r=_drawQuali.apply(this,arguments); addQualiClear(); return r; };
addQualiClear();   /* 파일로 연 시안은 app.js 가 먼저 그려 놓으므로 지금 한 번 */
window.QUALIX={clearCrit};
})();
