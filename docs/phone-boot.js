/* =====================================================================
 *  이사돔 핸드폰 — 시동 phone-boot.js  v1 (2026-09-28)
 *  app.js 보다 먼저 읽힙니다. 핸드폰 안의 작은 서버(sw.js)를 켜고, 처음 여는 것이면 서버가 준비된 뒤 한 번 다시 엽니다.
 *  (처음 한 번은 서버가 아직 없어서 app.js 가 /api 를 못 찾기 때문 — 그 사이엔 "준비 중" 화면을 덮어 둡니다)
 * ===================================================================== */
(function(){
  window.ISADOM_PHONE=true;
  const cover=document.createElement('div'); cover.id='pboot';
  cover.innerHTML='<div><b>이사돔</b><span>핸드폰 준비 중…</span></div>';
  cover.style.cssText='position:fixed;inset:0;background:#f5f6f8;z-index:9999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;color:#16435A;text-align:center';
  cover.querySelector('b').style.cssText='display:block;font-size:34px;margin-bottom:6px'; cover.querySelector('span').style.cssText='color:#6d7480;font-size:14px';
  if(!('serviceWorker' in navigator)){
    document.addEventListener('DOMContentLoaded',()=>{ document.body.appendChild(cover); cover.querySelector('span').textContent='이 브라우저는 핸드폰 저장 공간(서비스 워커)을 지원하지 않아 이사돔 핸드폰을 쓸 수 없습니다. 크롬으로 열어 주세요.'; });
    return;
  }
  const first=!navigator.serviceWorker.controller;
  if(first) document.addEventListener('DOMContentLoaded',()=>document.body.appendChild(cover));
  navigator.serviceWorker.register('sw.js').then(reg=>{
    if(!first) return;
    /* 처음: 서버가 이 페이지를 맡는(controllerchange) 순간 다시 엽니다 */
    let done=false; const go=()=>{ if(done) return; done=true; location.reload(); };
    navigator.serviceWorker.addEventListener('controllerchange',go);
    setTimeout(()=>{ if(!navigator.serviceWorker.controller){ const s=cover.querySelector('span'); if(s) s.textContent='준비가 오래 걸립니다 — 인터넷을 확인하고 앱을 닫았다 다시 열어 주세요.'; } },15000);
  }).catch(err=>{
    document.addEventListener('DOMContentLoaded',()=>{ if(!cover.parentNode) document.body.appendChild(cover); cover.querySelector('span').textContent='핸드폰 저장 공간을 켜지 못했습니다: '+(err&&err.message||err); });
  });
  if(navigator.storage&&navigator.storage.persist) navigator.storage.persist().catch(()=>{});   /* 저장 공간이 저절로 비워지지 않게 */
})();
