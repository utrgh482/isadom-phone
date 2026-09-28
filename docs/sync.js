/* =====================================================================
 *  이사돔 — PC ↔ 핸드폰 주고받기  sync.js  v1.1 (2026-09-28)
 *  PC 이사돔과 핸드폰 이사돔이 같이 읽는 파일입니다 (app.js 는 고치지 않고 감싸서 덧붙임).
 *   1) 잠금 부품 (ISDCRYPT): SHA-256 · HMAC · PBKDF2 · 흐름 잠금 · ZIP 담기 — 순수 자바스크립트.
 *      (사무실 PC 이사돔은 http:// 로 열려서 브라우저의 내장 잠금(WebCrypto)이 꺼져 있기 때문에 직접 만들었습니다.
 *       양쪽이 같은 부품을 써야 하므로 핸드폰에서도 이것을 씁니다.)
 *   2) 주고받기 (SYNC): 할일·메모·상담·현황 건마다 "고친 시각"을 매겨 두고, 잠긴 파일 하나로 주고받으며
 *      나중 것이 이기는 규칙으로 합칩니다. PC → 핸드폰은 글만(개인정보 칸 뺌), 핸드폰 → PC 는 고친 것 + 새 사진.
 *   3) 자동 우편함 (v1.1): 깃허브 비공개 저장소 하나를 우편함으로 써서, 같은 잠긴 덩어리를 프로그램이 알아서 넣고 꺼냅니다
 *      (PC 이사돔이 열려 있는 동안 · 핸드폰 앱이 열려 있는 동안, 3분마다). 밴드 파일 방식은 그대로 남아 있어 언제든 손으로도 됩니다.
 * ===================================================================== */

/* ---------- 1) 잠금 부품 ---------- */
(function(){
'use strict';
const K=new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
const H0=new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
/* SHA-256 압축 함수 — 상태 H(32비트 8개)에 64바이트 블록 하나를 넣습니다. 스크래치 W 는 하나를 돌려 씁니다 */
const W=new Uint32Array(64);
function compress(H,d,o){
  for(let i=0;i<16;i++,o+=4) W[i]=(d[o]<<24)|(d[o+1]<<16)|(d[o+2]<<8)|d[o+3];
  for(let i=16;i<64;i++){ const a=W[i-15],b=W[i-2]; const s0=((a>>>7)|(a<<25))^((a>>>18)|(a<<14))^(a>>>3); const s1=((b>>>17)|(b<<15))^((b>>>19)|(b<<13))^(b>>>10); W[i]=(W[i-16]+s0+W[i-7]+s1)|0; }
  let a=H[0]|0,b=H[1]|0,c=H[2]|0,dd=H[3]|0,e=H[4]|0,f=H[5]|0,g=H[6]|0,h=H[7]|0;
  for(let i=0;i<64;i++){
    const S1=((e>>>6)|(e<<26))^((e>>>11)|(e<<21))^((e>>>25)|(e<<7)), ch=(e&f)^(~e&g), t1=(h+S1+ch+K[i]+W[i])|0;
    const S0=((a>>>2)|(a<<30))^((a>>>13)|(a<<19))^((a>>>22)|(a<<10)), mj=(a&b)^(a&c)^(b&c), t2=(S0+mj)|0;
    h=g; g=f; f=e; e=(dd+t1)|0; dd=c; c=b; b=a; a=(t1+t2)|0;
  }
  H[0]+=a; H[1]+=b; H[2]+=c; H[3]+=dd; H[4]+=e; H[5]+=f; H[6]+=g; H[7]+=h;
}
/* SHA-256 — 조각을 이어 넣을 수 있고(update), 중간 상태를 복사(clone)할 수 있습니다 */
class Sha256{
  constructor(){ this.h=new Uint32Array(H0); this.buf=new Uint8Array(64); this.blen=0; this.len=0; }
  clone(){ const c=new Sha256(); c.h.set(this.h); c.buf.set(this.buf); c.blen=this.blen; c.len=this.len; return c; }
  update(d){
    let i=0; this.len+=d.length;
    if(this.blen){ const n=Math.min(64-this.blen,d.length); this.buf.set(d.subarray(0,n),this.blen); this.blen+=n; i=n; if(this.blen<64) return this; compress(this.h,this.buf,0); this.blen=0; }
    for(;i+64<=d.length;i+=64) compress(this.h,d,i);
    if(i<d.length){ this.buf.set(d.subarray(i)); this.blen=d.length-i; }
    return this;
  }
  digest(){
    const bits=this.len*8, padLen=(this.blen<56?56-this.blen:120-this.blen), pad=new Uint8Array(padLen+8); pad[0]=0x80;
    const hi=Math.floor(bits/4294967296), lo=bits>>>0, p=padLen;
    pad[p]=hi>>>24; pad[p+1]=hi>>>16; pad[p+2]=hi>>>8; pad[p+3]=hi; pad[p+4]=lo>>>24; pad[p+5]=lo>>>16; pad[p+6]=lo>>>8; pad[p+7]=lo;
    this.update(pad);
    const out=new Uint8Array(32); for(let i=0;i<8;i++){ const v=this.h[i]; out[i*4]=v>>>24; out[i*4+1]=v>>>16; out[i*4+2]=v>>>8; out[i*4+3]=v; } return out;
  }
}
const sha256=d=>new Sha256().update(d).digest();
/* HMAC 열쇠 준비 — 안쪽·바깥쪽 상태를 미리 만들어 둡니다 */
function hmacPads(key){
  if(key.length>64) key=sha256(key);
  const ip=new Uint8Array(64), op=new Uint8Array(64); for(let i=0;i<64;i++){ const k=key[i]||0; ip[i]=k^0x36; op[i]=k^0x5c; }
  const Hi=new Uint32Array(H0); compress(Hi,ip,0); const Ho=new Uint32Array(H0); compress(Ho,op,0); return {Hi,Ho};
}
/* 긴 글의 HMAC (스트리밍) */
function hmacKeyed(key){
  const {Hi,Ho}=hmacPads(key);
  return msg=>{ const inner=new Sha256(); inner.h.set(Hi); inner.len=64; const ih=inner.update(msg).digest(); const outer=new Sha256(); outer.h.set(Ho); outer.len=64; return outer.update(ih).digest(); };
}
const hmac=(key,msg)=>hmacKeyed(key)(msg);
/* 짧은 글(55바이트 이하)의 HMAC — 블록 두 번으로 끝. 할당 없이 돌려 쓰는 버퍼로 (PBKDF2·열쇠 흐름용). 결과는 32바이트 out 에 */
function hmacShort(key){
  const {Hi,Ho}=hmacPads(key), b1=new Uint8Array(64), b2=new Uint8Array(64), st=new Uint32Array(8);
  b2[32]=0x80; b2[62]=0x03; b2[63]=0x00;   /* 바깥쪽: 64 + 32 바이트 = 768비트 */
  return (msg,out)=>{
    const n=msg.length; st.set(Hi); b1.fill(0); b1.set(msg); b1[n]=0x80; const bits=(64+n)*8; b1[62]=(bits>>>8)&255; b1[63]=bits&255; compress(st,b1,0);
    for(let i=0;i<8;i++){ const v=st[i]; b2[i*4]=v>>>24; b2[i*4+1]=v>>>16; b2[i*4+2]=v>>>8; b2[i*4+3]=v; }
    st.set(Ho); compress(st,b2,0);
    for(let i=0;i<8;i++){ const v=st[i]; out[i*4]=v>>>24; out[i*4+1]=v>>>16; out[i*4+2]=v>>>8; out[i*4+3]=v; }
    return out;
  };
}
function pbkdf2(pw,salt,iter,dkLen){
  const prf=hmacShort(pw), out=new Uint8Array(dkLen), u=new Uint8Array(32), t=new Uint8Array(32); let off=0;
  for(let bi=1;off<dkLen;bi++){
    const s=new Uint8Array(salt.length+4); s.set(salt); s[salt.length]=bi>>>24; s[salt.length+1]=bi>>>16; s[salt.length+2]=bi>>>8; s[salt.length+3]=bi;
    prf(s,u); t.set(u);
    for(let i=1;i<iter;i++){ prf(u,u); for(let j=0;j<32;j++) t[j]^=u[j]; }
    out.set(t.subarray(0,Math.min(32,dkLen-off)),off); off+=32;
  }
  return out;
}
const enc=s=>new TextEncoder().encode(s), dec=u=>new TextDecoder().decode(u);
const rnd=n=>{ const u=new Uint8Array(n); (globalThis.crypto||{}).getRandomValues?crypto.getRandomValues(u):u.forEach((_,i)=>u[i]=Math.floor(Math.random()*256)); return u; };
const concat=(...arrs)=>{ const n=arrs.reduce((s,a)=>s+a.length,0), out=new Uint8Array(n); let o=0; for(const a of arrs){ out.set(a,o); o+=a.length; } return out; };
const eq=(a,b)=>{ if(a.length!==b.length) return false; let d=0; for(let i=0;i<a.length;i++) d|=a[i]^b[i]; return d===0; };
/* 흐름 잠금: 열쇠 흐름 조각(32바이트) = HMAC(K, nonce || 번호). 1MB 마다 잠깐 쉬어 화면이 굳지 않게 합니다 */
async function xorStream(key,nonce,data,onProgress){
  const prf=hmacShort(key), out=new Uint8Array(data.length), blk=new Uint8Array(nonce.length+4), ks=new Uint8Array(32); blk.set(nonce); const nb=Math.ceil(data.length/32);
  for(let j=0;j<nb;j++){
    blk[nonce.length]=j>>>24; blk[nonce.length+1]=j>>>16; blk[nonce.length+2]=j>>>8; blk[nonce.length+3]=j;
    prf(blk,ks); const o=j*32, n=Math.min(32,data.length-o); for(let i=0;i<n;i++) out[o+i]=data[o+i]^ks[i];
    if((j&32767)===32767){ if(onProgress) onProgress(o/data.length); await new Promise(r=>setTimeout(r,0)); }
  }
  return out;
}
async function gzip(u8){ if(typeof CompressionStream==='undefined') return null; try{ const cs=new CompressionStream('gzip'); const w=cs.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(cs.readable).arrayBuffer()); }catch(e){ return null; } }
async function gunzip(u8){ if(typeof DecompressionStream==='undefined') throw new Error('이 브라우저는 압축을 풀지 못합니다'); const ds=new DecompressionStream('gzip'); const w=ds.writable.getWriter(); w.write(u8); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
const MAGIC=[0x49,0x53,0x44,0x32];   /* "ISD2" */
const ITER=100000;
/* 잠그기: 머리(ISD2·표시·소금 16·nonce 16) + 잠긴 본문 + 도장 32 (HMAC 으로 머리+본문을 봉인) */
async function lock(obj,pw,onProgress){
  let plain=enc(JSON.stringify(obj)), flags=0; const gz=await gzip(plain); if(gz&&gz.length<plain.length){ plain=gz; flags|=1; }
  const salt=rnd(16), nonce=rnd(16), dk=pbkdf2(enc(String(pw)),salt,ITER,64), mac=hmacKeyed(dk.subarray(32,64));
  const head=new Uint8Array(37); head.set(MAGIC); head[4]=flags; head.set(salt,5); head.set(nonce,21);
  const ct=await xorStream(dk.subarray(0,32),nonce,plain,onProgress), body=concat(head,ct);
  return concat(body,mac(body));
}
async function unlock(u8,pw,onProgress){
  if(!(u8 instanceof Uint8Array)) u8=new Uint8Array(u8);
  if(u8.length<69||u8[0]!==MAGIC[0]||u8[1]!==MAGIC[1]||u8[2]!==MAGIC[2]||u8[3]!==MAGIC[3]) throw new Error('이사돔 주고받기 파일이 아닙니다.');
  const flags=u8[4], salt=u8.subarray(5,21), nonce=u8.subarray(21,37), ct=u8.subarray(37,u8.length-32), tag=u8.subarray(u8.length-32);
  const dk=pbkdf2(enc(String(pw)),salt,ITER,64), mac=hmacKeyed(dk.subarray(32,64));
  if(!eq(tag,mac(u8.subarray(0,u8.length-32)))) throw new Error('비밀번호가 다르거나 파일이 손상되었습니다.');
  let plain=await xorStream(dk.subarray(0,32),nonce,ct,onProgress); if(flags&1) plain=await gunzip(plain);
  return JSON.parse(dec(plain));
}
/* ZIP 담기 (압축 없이 그대로) — 밴드가 낯선 확장자를 막을 수 있어 .zip 안에 isadom.isd 로 넣습니다 */
const CRC_T=(()=>{ const t=new Uint32Array(256); for(let n=0;n<256;n++){ let c=n; for(let k=0;k<8;k++) c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1); t[n]=c>>>0; } return t; })();
function crc32(u8){ let c=0xFFFFFFFF; for(let i=0;i<u8.length;i++) c=CRC_T[(c^u8[i])&0xFF]^(c>>>8); return (c^0xFFFFFFFF)>>>0; }
function zipStore(name,data){
  const nm=enc(name), d=new Date(), dt=((d.getHours()<<11)|(d.getMinutes()<<5)|(d.getSeconds()>>1))&0xFFFF, dd=(((d.getFullYear()-1980)<<9)|((d.getMonth()+1)<<5)|d.getDate())&0xFFFF, crc=crc32(data);
  const lh=new Uint8Array(30+nm.length), v=new DataView(lh.buffer);
  v.setUint32(0,0x04034b50,true); v.setUint16(4,20,true); v.setUint16(6,0x0800,true); v.setUint16(8,0,true); v.setUint16(10,dt,true); v.setUint16(12,dd,true); v.setUint32(14,crc,true); v.setUint32(18,data.length,true); v.setUint32(22,data.length,true); v.setUint16(26,nm.length,true); v.setUint16(28,0,true); lh.set(nm,30);
  const ch=new Uint8Array(46+nm.length), c=new DataView(ch.buffer);
  c.setUint32(0,0x02014b50,true); c.setUint16(4,20,true); c.setUint16(6,20,true); c.setUint16(8,0x0800,true); c.setUint16(10,0,true); c.setUint16(12,dt,true); c.setUint16(14,dd,true); c.setUint32(16,crc,true); c.setUint32(20,data.length,true); c.setUint32(24,data.length,true); c.setUint16(28,nm.length,true); c.setUint16(30,0,true); c.setUint16(32,0,true); c.setUint16(34,0,true); c.setUint16(36,0,true); c.setUint32(38,0,true); c.setUint32(42,0,true); ch.set(nm,46);
  const cdOff=lh.length+data.length, eo=new Uint8Array(22), e=new DataView(eo.buffer);
  e.setUint32(0,0x06054b50,true); e.setUint16(4,0,true); e.setUint16(6,0,true); e.setUint16(8,1,true); e.setUint16(10,1,true); e.setUint32(12,ch.length,true); e.setUint32(16,cdOff,true); e.setUint16(20,0,true);
  return concat(lh,data,ch,eo);
}
function zipRead(u8){
  if(!(u8 instanceof Uint8Array)) u8=new Uint8Array(u8);
  const v=new DataView(u8.buffer,u8.byteOffset,u8.byteLength); let p=-1;
  for(let i=u8.length-22;i>=Math.max(0,u8.length-65557);i--){ if(v.getUint32(i,true)===0x06054b50){ p=i; break; } }
  if(p<0) throw new Error('zip 파일이 아닙니다.');
  const n=v.getUint16(p+10,true); let o=v.getUint32(p+16,true); const entries=[];
  for(let i=0;i<n;i++){
    if(v.getUint32(o,true)!==0x02014b50) throw new Error('zip 목록이 깨졌습니다.');
    const method=v.getUint16(o+10,true), csize=v.getUint32(o+20,true), usize=v.getUint32(o+24,true), nl=v.getUint16(o+28,true), el=v.getUint16(o+30,true), cl=v.getUint16(o+32,true), lo=v.getUint32(o+42,true);
    entries.push({name:dec(u8.subarray(o+46,o+46+nl)),method,csize,usize,lo}); o+=46+nl+el+cl;
  }
  const data=async e=>{ const lnl=v.getUint16(e.lo+26,true), lel=v.getUint16(e.lo+28,true), start=e.lo+30+lnl+lel, raw=u8.subarray(start,start+e.csize);
    if(e.method===0) return raw;
    if(e.method===8&&typeof DecompressionStream!=='undefined'){ const ds=new DecompressionStream('deflate-raw'); const w=ds.writable.getWriter(); w.write(raw); w.close(); return new Uint8Array(await new Response(ds.readable).arrayBuffer()); }
    throw new Error('이 zip 의 압축 방식은 읽지 못합니다.'); };
  return {entries,data};
}
const toHex=u=>[...u].map(b=>b.toString(16).padStart(2,'0')).join('');
globalThis.ISDCRYPT={sha256,hmac,pbkdf2,lock,unlock,zipStore,zipRead,crc32,toHex,enc,dec,concat,rnd,ITER};
})();

/* ---------- 2) 주고받기 ---------- */
(function(){
'use strict';
if(!window.DIRECT||!window.TODO||!window.CONSULT){ console.warn('sync.js: direct.js·todo.js·consult.js 뒤에 읽혀야 합니다'); return; }
const SV='v1.1.1 (2026-09-28)';
const PHONE=!!window.ISADOM_PHONE;
const PHONE_BASE=2000000000;                 /* 핸드폰에서 새로 만드는 번호는 20억부터 — PC 번호(작은 수)와 겹치지 않게 */
const CR=globalThis.ISDCRYPT;   /* 암호 부품 (app.js 의 공통 서류 C 와 이름이 겹치지 않게 CR) */
const iso=()=>new Date().toISOString();
const q=(s,r)=>(r||document).querySelector(s);
const E=s=>String(s==null?'':s).replace(/[&<>"]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]));
const clone=o=>JSON.parse(JSON.stringify(o));
const DS=DIRECT.DS;
/* 글자 → 짧은 지문 (cyrb53) — 내용이 바뀌었는지 볼 때 */
function hash(str){ let h1=0xdeadbeef^7, h2=0x41c6ce57^7; for(let i=0;i<str.length;i++){ const ch=str.charCodeAt(i); h1=Math.imul(h1^ch,2654435761); h2=Math.imul(h2^ch,1597334677); }
  h1=Math.imul(h1^(h1>>>16),2246822507); h1^=Math.imul(h2^(h2>>>13),3266489909); h2=Math.imul(h2^(h2>>>16),2246822507); h2^=Math.imul(h1^(h1>>>13),3266489909); return (h2>>>0).toString(36)+(h1>>>0).toString(36); }

/* ---------- 주고받는 네 가지와 그 "모양"(핸드폰에도 있는 칸만) ---------- */
const TYPES={
  todo:{ name:'할 일', list:()=>TODO.list(),
    shape:x=>({id:String(x.id),title:x.title,plan:x.plan,due:x.due,proj:x.proj,memo:x.memo,subs:x.subs||[],done:!!x.done,doneAt:x.doneAt||'',made:x.made||''}) },
  memo:{ name:'메모', list:()=>MEMOS,   /* 농가 칸은 PC 에서만 — 모양에서 뺌 */
    shape:m=>({id:m.id,date:m.date||'',due:m.due||'',cat:m.cat||'',alias:m.alias||'',title:m.title||'',body:m.body||'',st:m.st||'',stAt:m.stAt||''}) },
  consult:{ name:'상담', list:()=>CONSULT.list(),   /* 농가명·전화번호는 PC 에서만 — 모양에서 뺌 */
    shape:c=>({id:c.id,title:c.title||'',addr:c.addr||'',date:c.date||'',issue:c.issue||'',memo:c.memo||'',tags:c.tags||[],visit:c.visit||{date:'',memo:''},refs:c.refs||[],follow:c.follow||{date:'',memo:''},made:c.made||'',from:c.from||''}) },
  case:{ name:'현황 건', list:()=>{ const out=[]; (DS.projects||[]).forEach(p=>(p.cases||[]).forEach(c=>out.push(Object.assign({dp:p.id},c)))); return out; },
    shape:c=>({id:c.id,dp:c.dp,no:c.no,name:c.name||'',tag:c.tag||'',kind:c.kind||'',start:c.start||'',amt:c.amt==null?'':c.amt,vendor:c.vendor||'',memo:c.memo||'',steps:c.steps||{},docs:c.docs||{}}) },
};
const TKEYS=Object.keys(TYPES);
const hOf=(t,x)=>hash(JSON.stringify(TYPES[t].shape(x)));

/* ---------- 주고받기 장부 SY — 저장 덩어리 direct.sync 에 실림 (기기마다 따로) ---------- */
function normSY(d){ d=d&&typeof d==='object'?d:{}; const o={v:1,meta:{},tomb:{},last:{sent:String((d.last&&d.last.sent)||''),recv:String((d.last&&d.last.recv)||''),recvMade:String((d.last&&d.last.recvMade)||'')},ack:Array.isArray(d.ack)?d.ack.slice():[],sent:Array.isArray(d.sent)?d.sent.slice():[],log:Array.isArray(d.log)?d.log.slice(0,30):[]};
  TKEYS.forEach(t=>{ o.meta[t]=(d.meta&&d.meta[t]&&typeof d.meta[t]==='object')?d.meta[t]:{}; o.tomb[t]=(d.tomb&&d.tomb[t]&&typeof d.tomb[t]==='object')?d.tomb[t]:{}; });
  const m=d.mail; o.mail=(m&&typeof m==='object'&&m.owner)?{owner:String(m.owner||''),repo:String(m.repo||''),branch:String(m.branch||'main'),token:String(m.token||''),pw:String(m.pw||''),api:String(m.api||''),on:!!m.on,share:m.share!==false,fromPc:!!m.fromPc,
    gotSha:String(m.gotSha||''),mySha:String(m.mySha||''),pushedSig:String(m.pushedSig||''),lastPull:String(m.lastPull||''),lastPush:String(m.lastPush||''),err:String(m.err||''),errAt:String(m.errAt||''),log:Array.isArray(m.log)?m.log.slice(0,20):[]}:null;
  return o; }
let SY=normSY(null);
const _ser=DIRECT.serialize, _load=DIRECT.load;
DIRECT.serialize=function(){ const o=_ser.apply(this,arguments); o.sync=clone(SY); return o; };
DIRECT.load=function(d){ _load.apply(this,arguments); SY=normSY(d&&d.sync); };

/* 고친 시각 매기기 — 자동 저장이 3초마다 부르는 stateSig 에 끼어들어, 바뀐 건에 지금 시각을 적습니다 */
function stamp(){
  try{
    const now=iso(), old=new Date(Date.now()-180*86400000).toISOString();
    for(const t of TKEYS){
      const meta=SY.meta[t], tomb=SY.tomb[t], seen=new Set();
      for(const x of TYPES[t].list()){ const id=String(x.id); seen.add(id); const h=hOf(t,x); const m=meta[id]; if(!m||m.h!==h) meta[id]={h,u:now}; if(tomb[id]) delete tomb[id]; }
      for(const id of Object.keys(meta)) if(!seen.has(id)){ tomb[id]=now; delete meta[id]; }
      for(const id of Object.keys(tomb)) if(tomb[id]<old) delete tomb[id];
    }
  }catch(e){ console.warn('sync stamp',e); }
}
const _sig=window.stateSig;
window.stateSig=function(){ stamp(); return _sig.apply(this,arguments); };

/* ---------- 번호 범위: 핸드폰은 20억부터, PC 는 그 아래 ---------- */
function allIds(){ const ids=[]; const push=v=>{ if(typeof v==='number'&&isFinite(v)) ids.push(v); };
  (PROJECTS||[]).forEach(p=>{ (p.farms||[]).forEach(f=>push(f.id)); (p.groups||[]).forEach(g=>push(g.id)); (p.vendors||[]).forEach(v=>push(v.id)); (p.lines||[]).forEach(l=>push(l.id)); });
  FILES.forEach(f=>push(f.id)); (MEMOS||[]).forEach(m=>push(m.id)); CONSULT.list().forEach(c=>{ push(c.id); (c.refs||[]).forEach(r=>push(r.id)); });
  (DS.projects||[]).forEach(p=>{ push(p.id); ['budgets','entries','workers','grants','cases'].forEach(k=>(p[k]||[]).forEach(x=>push(x.id))); });
  return ids; }
function fixUid(snapUid){   /* 번호표는 절대 뒤로 돌리지 않습니다 (지운 건의 번호를 새 건이 다시 받으면 합칠 때 헷갈림) */
  const ids=allIds(), cur=(typeof UID==='number')?UID:1;
  if(PHONE){ let m=PHONE_BASE; if(cur>=PHONE_BASE&&cur<PHONE_BASE*2) m=cur; ids.forEach(i=>{ if(i>=PHONE_BASE&&i<PHONE_BASE*2&&i+1>m) m=i+1; }); UID=m; }
  else { let m=1; if(+snapUid>0&&+snapUid<PHONE_BASE) m=+snapUid; if(cur>=1&&cur<PHONE_BASE&&cur>m) m=cur; ids.forEach(i=>{ if(i<PHONE_BASE&&i+1>m) m=i+1; }); UID=m; }
}
const _as=window.applySnapshot; if(typeof _as==='function') window.applySnapshot=async function(snap,opt){ const r=await _as.apply(this,arguments); try{ fixUid(snap&&snap.uid); }catch(e){} return r; };
const _ea=window.enterApp; if(typeof _ea==='function') window.enterApp=async function(){ const r=await _ea.apply(this,arguments); try{ fixUid(); }catch(e){} return r; };
try{ fixUid(); }catch(e){}
if(typeof SERVER!=='undefined'&&!SERVER){ try{ LAST_SIG=stateSig(); }catch(e){} }   /* 파일로 연 시안: 첫 도장 때문에 '저장 안 됨'이 뜨지 않게 */

/* ---------- 보낼 것 만들기 ---------- */
const lastExchange=()=>[SY.last.sent,SY.last.recv].filter(Boolean).sort().pop()||'';
function twPayload(){ const now=iso(), tw={}; for(const t of TKEYS){ const items=TYPES[t].list().map(x=>TYPES[t].shape(x)), u={}; items.forEach(x=>{ const m=SY.meta[t][String(x.id)]; u[String(x.id)]=m?m.u:now; }); tw[t]={items,u}; } return tw; }
/* PC → 핸드폰: 표·요약용 사업(농가 이름·주민번호·주소·전화·보탬e 계정·업체 이름·통화 기록은 비움) + 직접 사업(근로자·출근부 뺌, 지출 줄의 거래처 비움) */
function roPayload(){
  const projects=(PROJECTS||[]).map(p=>{ const {_exp,_vopen,_gclosed,lineChagwang,...rest}=p; return Object.assign(clone(rest),{_exp:[],
    farms:(p.farms||[]).map(f=>({id:f.id,role:f.role||'',name:'',rrn:'',addr:'',area:f.area||'',tel:'',sysId:'',sysPw:'',memo:'',sel:f.sel||'',ck:clone(f.ck||{}),groupId:f.groupId==null?null:f.groupId,quit:!!f.quit,quitCk:clone(f.quitCk||{})})),
    groups:(p.groups||[]).map(g=>clone(g)), vendors:(p.vendors||[]).map(v=>({id:v.id,name:'',tel:'',account:'',calls:[]})), lines:(p.lines||[]).map(l=>Object.assign(clone(l),{note:''}))}); });
  const dprojects=(DS.projects||[]).map(p=>Object.assign(clone(p),{workers:[],months:{},cases:[],entries:(p.entries||[]).map(e=>Object.assign(clone(e),{vendor:''}))}));
  return {projects,S:clone(S),C:clone(C),memoCats:(MEMO_CATS||[]).slice(),year:(typeof YEAR!=='undefined')?YEAR:null,direct:{projects:dprojects,rates:clone(DS.rates||{}),holidays:clone(DS.holidays||{}),tags:clone(DS.tags||[])},ctags:clone(CONSULT.tags())};
}
const whoAmI=()=>((typeof ME!=='undefined'&&ME&&ME.name)||(PHONE?'핸드폰':'PC'));
async function buildPcToPhone(){ stamp(); const p={app:'isadom-sync',dir:'pc2phone',ver:1,made:iso(),from:whoAmI(),sv:SV,ro:roPayload(),tw:twPayload(),tomb:clone(SY.tomb),ack:SY.ack.slice(),memoCats:(MEMO_CATS||[]).slice(),ctags:clone(CONSULT.tags()),dtags:clone(DS.tags||[])};
  const m=SY.mail; if(m&&m.owner&&m.repo&&m.token&&m.share!==false) p.mail={owner:m.owner,repo:m.repo,branch:m.branch||'main',token:m.token,api:m.api||''};   /* 핸드폰이 같은 우편함을 쓰도록 (비밀번호는 이 파일을 연 것과 같게) */
  return p; }
/* 핸드폰 → PC: 고친 것 네 가지 + 아직 안 보낸 새 사진(상담·메모에 붙은 것). 사진은 긴 변 2000px 로 줄여서 */
const isPhotoRef=r=>!!r&&((r.kind==='memo'&&+r.id>0)||(r.kind==='ddoc'&&r.s!=null));
function pendingPhotos(){ return FILES.filter(f=>f.id&&isPhotoRef(f.ref)&&!SY.sent.includes(f.id)); }
async function shrink(blob){
  try{ if(!/^image\/(jpeg|png|webp|heic|heif)/i.test(blob.type)) return null; const bm=await createImageBitmap(blob,{imageOrientation:'from-image'}); const mx=Math.max(bm.width,bm.height); if(mx<=2000&&blob.size<1500000){ bm.close(); return null; }
    const sc=Math.min(1,2000/mx), cv=document.createElement('canvas'); cv.width=Math.round(bm.width*sc); cv.height=Math.round(bm.height*sc); cv.getContext('2d').drawImage(bm,0,0,cv.width,cv.height); bm.close();
    return await new Promise(res=>cv.toBlob(res,'image/jpeg',0.85)); }catch(e){ return null; }
}
const b64Of=blob=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(String(fr.result).split(',')[1]||''); fr.onerror=rej; fr.readAsDataURL(blob); });
function b64ToBlob(b64,type){ const bin=atob(b64), u=new Uint8Array(bin.length); for(let i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new Blob([u],{type:type||'application/octet-stream'}); }
async function photoPayload(onProgress){
  const out=[], list=pendingPhotos(); let i=0;
  for(const f of list){ i++; if(onProgress) onProgress(i,list.length);
    try{ const blob=f.blob||await (await fetch(f.url)).blob(); let data=blob, type=f.type||blob.type||'', name=f.name||'사진';
      const small=await shrink(blob); if(small){ data=small; type='image/jpeg'; name=name.replace(/\.[^.]+$/,'')+'.jpg'; }
      if(data.size>30*1024*1024) continue;   /* 30MB 넘는 것은 안 보냄 */
      out.push({fid:f.id,name,type,size:data.size,tags:(f.tags||[]).slice(),ref:clone(f.ref),added:f.added||'',data:await b64Of(data)}); }
    catch(e){ console.warn('사진 싣기 실패',f&&f.name,e); } }
  return out;
}
async function buildPhoneToPc(onProgress){ stamp(); return {app:'isadom-sync',dir:'phone2pc',ver:1,made:iso(),from:whoAmI(),sv:SV,tw:twPayload(),tomb:clone(SY.tomb),memoCats:(MEMO_CATS||[]).slice(),ctags:clone(CONSULT.tags()),dtags:clone(DS.tags||[]),photos:await photoPayload(onProgress)}; }

/* ---------- 합치기: 건마다 나중에 고친 것이 남고, 양쪽 다 고쳤으면 세어 둡니다 ---------- */
function mergeType(t,inc,incTomb,lastX){
  inc=inc||{items:[],u:{}}; incTomb=incTomb||{};
  const local=TYPES[t].list(), L=new Map(local.map(x=>[String(x.id),x])), R=new Map((inc.items||[]).map(x=>[String(x.id),x])), meta=SY.meta[t], tomb=SY.tomb[t];
  const out=[], adopt=[], del=[], n={added:0,changed:0,removed:0,conflict:0,kept:0};
  const localU=id=>(meta[id]&&meta[id].u)||'';
  for(const [id,l] of L){ const r=R.get(id);
    if(r){ const lh=hOf(t,l), rh=hash(JSON.stringify(TYPES[t].shape(r))), lu=localU(id), ru=String(inc.u[id]||'');
      if(lh===rh){ out.push(l); n.kept++; continue; }
      if(lastX&&lu>lastX&&ru>lastX) n.conflict++;
      if(ru>lu){ out.push(Object.assign(clone(l),TYPES[t].shape(r))); adopt.push({id,u:ru}); n.changed++; } else out.push(l); }
    else { const tu=incTomb[id]; if(tu&&String(tu)>localU(id)){ del.push({id,u:String(tu)}); n.removed++; } else out.push(l); } }
  for(const [id,r] of R){ if(L.has(id)) continue; const tu=tomb[id], ru=String(inc.u[id]||''); if(tu&&tu>ru) continue; out.push(TYPES[t].shape(r)); adopt.push({id,u:ru}); n.added++; }
  return {out,adopt,del,n};
}
const unionTags=(a,b)=>{ const out=(a||[]).map(t=>typeof t==='string'?{n:t,end:t==='완료'}:{n:String(t.n||''),end:!!t.end}).filter(t=>t.n); (b||[]).forEach(t=>{ const x=typeof t==='string'?{n:t,end:t==='완료'}:{n:String(t.n||''),end:!!t.end}; if(x.n&&!out.some(o=>o.n===x.n)) out.push(x); }); return out; };
const unionCats=(a,b)=>{ const out=(a||[]).slice(); (b||[]).forEach(c=>{ if(c&&!out.includes(c)) out.push(c); }); return out; };
function afterApply(merged){   /* 받아들인 건에는 상대의 고친 시각을, 지운 건에는 상대의 지운 시각을 적어 둡니다 */
  for(const t of TKEYS){ const cur=new Map(TYPES[t].list().map(x=>[String(x.id),x]));
    merged[t].adopt.forEach(({id,u})=>{ const x=cur.get(String(id)); if(x) SY.meta[t][String(id)]={h:hOf(t,x),u}; });
    merged[t].del.forEach(({id,u})=>{ SY.tomb[t][String(id)]=u; delete SY.meta[t][String(id)]; }); }
}
const sumN=(merged)=>{ const s={}; for(const t of TKEYS) s[t]=merged[t].n; return s; };
function tellN(s){ return TKEYS.map(t=>{ const n=s[t]; const parts=[]; if(n.added) parts.push(`새로 ${n.added}`); if(n.changed) parts.push(`바뀜 ${n.changed}`); if(n.removed) parts.push(`지움 ${n.removed}`); return parts.length?`${TYPES[t].name} ${parts.join('·')}`:''; }).filter(Boolean).join(' / ')||'바뀐 것 없음'; }
const conflicts=s=>TKEYS.reduce((a,t)=>a+(s[t].conflict||0),0);
function addLog(e){ SY.log.unshift(e); SY.log=SY.log.slice(0,30); }
async function fillFileData(){ for(const f of FILES){ if(!f._data&&f.blob){ try{ f._data=await blobToDataURL(f.blob); }catch(e){ f._data=null; } } } }
async function applyMerged(build){   /* 새 자료 덩어리를 만들어 app.js 의 applySnapshot 으로 올립니다 (서버 판·파일 판 모두) */
  const server=(typeof SERVER!=='undefined')&&SERVER; if(!server) await fillFileData();
  const snap=snapshot(!server); snap.S=clone(S); snap.C=clone(C);   /* ★ snapshot() 의 S·C 는 원본 그대로라, 복사해 두지 않으면 applySnapshot 이 비우고 다시 채울 때 빈 것이 됨 (9/28 저녁 발견) */
  build(snap); snap.direct.sync=clone(SY);
  await applySnapshot(snap,{quiet:true});
}
/* 이미 받은 것보다 먼저 만든 파일이면 막습니다 (옛 파일을 잘못 고른 경우 — 표·요약이 옛것으로 돌아가는 것을 막음) */
function notOlder(p){ if(SY.last.recvMade&&p.made&&String(p.made)<SY.last.recvMade) throw new Error(`이미 받은 파일(${fmtT(SY.last.recvMade)})보다 먼저 만든 파일입니다 (${fmtT(p.made)}). 최근 파일을 골라 주세요.`); }
/* 핸드폰: PC 에서 온 것 받기 */
async function importFromPC(p,opt){
  if(!p||p.app!=='isadom-sync'||p.dir!=='pc2phone') throw new Error('PC 에서 만든 파일이 아닙니다 (핸드폰용 파일을 골라 주세요).');
  opt=opt||{}; if(!opt.mailbox) notOlder(p);   /* 손으로 고른 파일만 옛 파일 검사 (우편함은 늘 최신 것 하나라 sha 로 봄) */
  if(p.mail&&p.mail.owner&&p.mail.token&&opt.pw){ const m=SY.mail||{}; if(!m.owner||m.fromPc){ SY.mail=normSY({mail:Object.assign({},m,{owner:p.mail.owner,repo:p.mail.repo,branch:p.mail.branch||'main',token:p.mail.token,api:p.mail.api||'',pw:opt.pw,on:true,fromPc:true})}).mail; MAIL_NEW=true; } }   /* PC 가 실어 보낸 우편함 설정 — 비밀번호는 이 파일을 연 것 */
  stamp(); const lastX=lastExchange(), merged={}; for(const t of TKEYS) merged[t]=mergeType(t,p.tw&&p.tw[t],p.tomb&&p.tomb[t],lastX);
  SY.last.recv=iso(); SY.last.recvMade=String(p.made||''); (p.ack||[]).forEach(id=>{ if(!SY.sent.includes(id)) SY.sent.push(id); });
  await applyMerged(snap=>{
    const ro=p.ro||{}; snap.projects=ro.projects||[]; snap.S=ro.S||{}; snap.C=ro.C||{}; if(ro.year) snap.year=ro.year; snap.memoCats=unionCats(snap.memoCats,p.memoCats||ro.memoCats);
    snap.memos=merged.memo.out.map(m=>Object.assign({farm:''},m));
    const d=snap.direct||{}, rd=ro.direct||{}; const dprojects=(rd.projects||[]).map(x=>Object.assign(clone(x),{cases:[]}));
    merged.case.out.forEach(c=>{ const pj=dprojects.find(x=>x.id===c.dp); if(pj){ const {dp,...rest}=c; pj.cases.push(rest); } });
    snap.direct=Object.assign({},d,{projects:dprojects,rates:rd.rates||d.rates,holidays:rd.holidays||d.holidays,tags:unionTags(rd.tags||d.tags,d.tags),todos:merged.todo.out,
      consults:{tags:unionTags(p.ctags||ro.ctags,(d.consults||{}).tags),list:merged.consult.out.map(c=>Object.assign({farm:'',tel:''},c))}});
  });
  afterApply(merged); const s=sumN(merged); addLog({t:iso(),dir:'in',from:p.from||'',made:p.made||'',n:s,conf:conflicts(s)});
  await saveToServer(true); return {n:s,conf:conflicts(s),made:p.made,from:p.from,mail:!!p.mail};
}
/* PC: 핸드폰에서 온 것 받기 — 상담의 농가명·전화번호, 메모의 농가 칸은 PC 것이 그대로 남습니다 */
async function importFromPhone(p,onPhoto,opt){
  if(!p||p.app!=='isadom-sync'||p.dir!=='phone2pc') throw new Error('핸드폰에서 만든 파일이 아닙니다 (PC 로 보낼 파일을 골라 주세요).');
  opt=opt||{}; if(!opt.mailbox) notOlder(p);
  stamp(); const lastX=lastExchange(), merged={}; for(const t of TKEYS) merged[t]=mergeType(t,p.tw&&p.tw[t],p.tomb&&p.tomb[t],lastX);
  SY.last.recv=iso(); SY.last.recvMade=String(p.made||'');
  await applyMerged(snap=>{
    snap.memos=merged.memo.out.map(m=>Object.assign({farm:''},m)); snap.memoCats=unionCats(snap.memoCats,p.memoCats);
    const d=snap.direct||{}; const dprojects=(d.projects||[]).map(x=>{ const {cases,...rest}=x; return Object.assign(rest,{cases:merged.case.out.filter(c=>c.dp===x.id).map(c=>{ const {dp,...r}=c; return r; })}); });
    snap.direct=Object.assign({},d,{projects:dprojects,tags:unionTags(d.tags,p.dtags),todos:merged.todo.out,consults:{tags:unionTags((d.consults||{}).tags,p.ctags),list:merged.consult.out.map(c=>Object.assign({farm:'',tel:''},c))}});
  });
  afterApply(merged);
  /* 사진 — 같은 사진을 두 번 받지 않고(ack), 붙을 자리(상담·메모)가 없으면 건너뜁니다 */
  let nPhoto=0, skipped=0; const photos=p.photos||[]; let i=0;
  for(const ph of photos){ i++; if(onPhoto) onPhoto(i,photos.length); if(!ph||SY.ack.includes(ph.fid)) continue;
    const r=ph.ref||{}; const has=(r.kind==='memo')?MEMOS.some(m=>m.id===r.id):(r.kind==='ddoc'&&r.s!=null)?CONSULT.list().some(c=>c.id===r.s):false;
    if(!has){ SY.ack.push(ph.fid); skipped++; continue; }
    try{ const blob=b64ToBlob(ph.data,ph.type), file=new File([blob],ph.name||'사진',{type:ph.type||blob.type});
      const server=(typeof SERVER!=='undefined')&&SERVER; const added=server?await uploadFiles([file],r):addFiles([file],r);
      if(added&&added.length){ added[0].tags=(ph.tags||[]).slice(); if(ph.added) added[0].added=ph.added; nPhoto++; SY.ack.push(ph.fid); } }
    catch(e){ console.warn('사진 받기 실패',ph&&ph.name,e); } }
  const s=sumN(merged); addLog({t:iso(),dir:'in',from:p.from||'',made:p.made||'',n:s,conf:conflicts(s),photos:nPhoto});
  await saveToServer(true); try{ if(window.DIRECT) DIRECT.repaint(); }catch(e){} return {n:s,conf:conflicts(s),photos:nPhoto,skipped,made:p.made,from:p.from};
}

/* ---------- 파일 ↔ 덩어리 ---------- */
const stampName=()=>{ const d=new Date(), p2=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}_${p2(d.getHours())}${p2(d.getMinutes())}`; };
async function packFile(payload,pw,onProgress){ const locked=await CR.lock(payload,pw,onProgress); return CR.zipStore('isadom.isd',locked); }
async function unpackFile(u8,pw,onProgress){ u8=new Uint8Array(u8); let raw=u8; if(u8.length>4&&u8[0]===0x50&&u8[1]===0x4b){ const z=CR.zipRead(u8); const e=z.entries.find(x=>/\.isd$/i.test(x.name))||z.entries[0]; if(!e) throw new Error('zip 안이 비어 있습니다.'); raw=await z.data(e); } return CR.unlock(raw,pw,onProgress); }
function b64Chunks(u8){ let s=''; for(let i=0;i<u8.length;i+=0x8000) s+=String.fromCharCode.apply(null,u8.subarray(i,i+0x8000)); return btoa(s); }
function giveFile(u8,name){
  if(PHONE&&window.IsadomApp&&typeof IsadomApp.saveFile==='function'){ IsadomApp.saveFile(name,b64Chunks(u8),'application/zip'); return '다운로드 폴더'; }
  const blob=new Blob([u8],{type:'application/zip'}), url=URL.createObjectURL(blob), a=document.createElement('a'); a.href=url; a.download=name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(()=>URL.revokeObjectURL(url),4000); return '내려받기 폴더';
}
const readFile=f=>new Promise((res,rej)=>{ const fr=new FileReader(); fr.onload=()=>res(new Uint8Array(fr.result)); fr.onerror=rej; fr.readAsArrayBuffer(f); });

/* ---------- 비밀번호 창 ---------- */
let PW_CACHE='';
function askPw(o){ o=o||{}; return new Promise(res=>{
  let w=q('#syPw'); if(!w){ w=document.createElement('div'); w.id='syPw'; w.className='loginWrap syPw'; w.hidden=true;
    w.innerHTML=`<form class="loginBox" autocomplete="off" novalidate><h1 id="syPw-t"></h1><p class="desc" id="syPw-m"></p><label class="fld">잠금 비밀번호<input id="syPw-a" type="password" autocomplete="off"></label><label class="fld" id="syPw-l2">비밀번호 한 번 더<input id="syPw-b" type="password" autocomplete="off"></label><div class="msg" id="syPw-msg"></div><button class="btn primary" type="submit" id="syPw-go">확인</button><button type="button" class="lgBack" id="syPw-x">취소</button></form>`;
    document.body.appendChild(w); }
  q('#syPw-t').textContent=o.title||'잠금 비밀번호'; q('#syPw-m').textContent=o.msg||''; q('#syPw-l2').hidden=!o.confirm; q('#syPw-a').value=PW_CACHE; q('#syPw-b').value=''; q('#syPw-msg').textContent=''; q('#syPw-go').textContent=o.button||'확인'; w.hidden=false;
  setTimeout(()=>{ try{ q(PW_CACHE?'#syPw-b':'#syPw-a').focus(); if(!o.confirm) q('#syPw-a').focus(); }catch(e){} },30);
  const done=v=>{ w.hidden=true; form.onsubmit=null; q('#syPw-x').onclick=null; res(v); };
  const form=q('form',w); form.onsubmit=e=>{ e.preventDefault(); const a=q('#syPw-a').value; if(a.length<4){ q('#syPw-msg').textContent='비밀번호는 4글자 이상으로 해 주세요.'; return; } if(o.confirm&&a!==q('#syPw-b').value){ q('#syPw-msg').textContent='비밀번호 두 개가 다릅니다.'; return; } PW_CACHE=a; done(a); };
  q('#syPw-x').onclick=()=>done(null);
}); }

/* ---------- 3) 자동 우편함 — 깃허브 비공개 저장소 (Git 데이터 API: blob → tree → 부모 없는 commit → ref 를 강제로 옮김 = 저장소에 늘 최신 것 하나만) ---------- */
const MAIL_MIN=3, PC_FILE='pc-outbox.isd', PH_FILE='phone-outbox.isd';
let MAIL_BUSY=false, MAIL_NEW=false, LAST_INPUT=0, MAIL_LASTRUN=0;
document.addEventListener('input',()=>{ LAST_INPUT=Date.now(); },true); document.addEventListener('keydown',()=>{ LAST_INPUT=Date.now(); },true);
const mailOn=()=>{ const m=SY.mail; return !!(m&&m.on&&m.owner&&m.repo&&m.token&&m.pw); };
const ghApi=(m)=>String((m&&m.api)||'https://api.github.com').replace(/\/$/,'');
function ghHeaders(m,raw,json){ const h={'Accept':raw?'application/vnd.github.raw+json':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}; if(m&&m.token) h['Authorization']='Bearer '+m.token; if(json) h['Content-Type']='application/json'; return h; }
async function gh(m,method,path,body,o){ o=o||{}; let r; try{ r=await fetch(ghApi(m)+path,{method,headers:ghHeaders(m,o.raw,!!body),body:body?JSON.stringify(body):undefined,cache:'no-store'}); }
  catch(e){ throw new Error('깃허브에 닿지 못했습니다 (인터넷·사무실 차단 확인): '+(e&&e.message||e)); }
  if(r.status===404&&o.allow404) return {status:404};
  if(!r.ok){ let t=''; try{ t=(await r.json()).message||''; }catch(e){} if(r.status===401) t='토큰이 틀리거나 만료됐습니다'; if(r.status===403&&!t) t='권한이 없습니다 (토큰의 Contents 쓰기 권한)'; if(r.status===404) t='저장소를 못 찾았습니다 (이름·토큰 권한 확인)'; throw new Error(`깃허브 ${r.status}${t?' — '+t:''}`); }
  return o.raw?{status:r.status,bytes:new Uint8Array(await r.arrayBuffer())}:{status:r.status,json:await r.json()}; }
const repoPath=m=>`/repos/${encodeURIComponent(m.owner)}/${encodeURIComponent(m.repo)}`;
async function ghTree(m){ const br=m.branch||'main'; const ref=await gh(m,'GET',`${repoPath(m)}/git/ref/heads/${encodeURIComponent(br)}`,null,{allow404:true}); if(ref.status===404) return {commit:null,tree:null,files:{}};
  const cs=ref.json.object.sha, c=await gh(m,'GET',`${repoPath(m)}/git/commits/${cs}`), ts=c.json.tree.sha, t=await gh(m,'GET',`${repoPath(m)}/git/trees/${ts}`), files={};
  (t.json.tree||[]).forEach(e=>{ if(e.type==='blob') files[e.path]={sha:e.sha,size:e.size}; }); return {commit:cs,tree:ts,files}; }
async function ghGetBlob(m,sha){ const r=await gh(m,'GET',`${repoPath(m)}/git/blobs/${sha}`,null,{raw:true}); return r.bytes; }
async function ghPutFile(m,name,u8){
  const b=await gh(m,'POST',`${repoPath(m)}/git/blobs`,{content:b64Chunks(u8),encoding:'base64'});
  const cur=await ghTree(m), treeBody={tree:[{path:name,mode:'100644',type:'blob',sha:b.json.sha}]}; if(cur.tree) treeBody.base_tree=cur.tree;
  const t=await gh(m,'POST',`${repoPath(m)}/git/trees`,treeBody);
  const c=await gh(m,'POST',`${repoPath(m)}/git/commits`,{message:`${name} ${iso()}`,tree:t.json.sha,parents:[]});
  const br=m.branch||'main';
  if(cur.commit) await gh(m,'PATCH',`${repoPath(m)}/git/refs/heads/${encodeURIComponent(br)}`,{sha:c.json.sha,force:true}); else await gh(m,'POST',`${repoPath(m)}/git/refs`,{ref:'refs/heads/'+br,sha:c.json.sha});
  return b.json.sha; }
/* 연결 시험: ① 깃허브 창구가 열리는지(토큰 없이) ② 저장소·토큰·쓰기 권한 */
async function mailTest(cfg){ const out=[]; const api=ghApi(cfg);
  try{ const r=await fetch(api+'/rate_limit',{cache:'no-store'}); out.push(r.ok?'① 깃허브 창구(api.github.com) 연결 ○':`① 깃허브 창구 응답 ${r.status}`); if(!r.ok) return out; }
  catch(e){ out.push('① 깃허브 창구(api.github.com)에 못 닿음 — 사무실 인터넷이 막았을 수 있습니다: '+(e&&e.message||e)); return out; }
  if(!(cfg.owner&&cfg.repo&&cfg.token)){ out.push('② 저장소·토큰을 넣으면 접근도 확인합니다'); return out; }
  try{ const r=await gh(cfg,'GET',repoPath(cfg)); const j=r.json; out.push(`② 저장소 ○ ${j.full_name||cfg.owner+'/'+cfg.repo} · ${j.private?'비공개':'⚠ 공개 저장소입니다 (잠긴 덩어리라 내용은 안 보이지만 비공개를 권함)'} · 쓰기 ${(j.permissions&&j.permissions.push)?'○':'✕ — 토큰에 Contents 쓰기(Read and write) 권한이 필요합니다'}`);
    const t=await ghTree(cfg); out.push(t.commit?`③ 우편함 안: ${Object.keys(t.files).filter(f=>/outbox/.test(f)).join(', ')||'(아직 비어 있음)'}`:'③ 우편함이 비어 있습니다 (첫 보내기 때 채워짐)'); }
  catch(e){ out.push('② 저장소 확인 실패: '+(e&&e.message||e)); }
  return out; }
function userBusy(){ const a=document.activeElement; const typing=!!(a&&/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)&&!a.closest('#syPw,#syMail,#plock')); const panel=q('#panel')&&q('#panel').classList.contains('open'); const viewer=q('#viewer')&&!q('#viewer').hidden; return typing||panel||viewer||(Date.now()-LAST_INPUT<20000)||!!BUSY; }
function preSig(){ if(PHONE) return hash(JSON.stringify({tw:twPayload(),tomb:SY.tomb,ph:pendingPhotos().map(f=>f.id)})); return hash(JSON.stringify({tw:twPayload(),tomb:SY.tomb,ack:SY.ack,ro:roPayload(),mail:!!(SY.mail&&SY.mail.share!==false)})); }
function mailLog(e){ const m=SY.mail; if(!m) return; m.log=[e].concat(m.log||[]).slice(0,20); }
async function mailCycle(mode){   /* 'auto'(3분마다·조용히) 또는 'manual'(단추) — 받기 → 보내기 */
  if(!mailOn()||MAIL_BUSY) return null; if(typeof LOGGED!=='undefined'&&!LOGGED) return null; if(mode==='auto'&&(document.hidden||userBusy())) return null;
  /* ※ 가져오기(applySnapshot → DIRECT.load)를 거치면 SY 가 새 객체로 바뀌므로, SY.mail 은 그때그때 다시 읽습니다 (M()) */
  const M=()=>SY.mail||{};
  MAIL_BUSY=true; MAIL_LASTRUN=Date.now(); const out={pulled:null,pushed:false,err:''}; const say=t=>{ if(mode==='manual') msg('#sy-mail-msg',t); };
  try{
    say('우편함 보는 중…'); const tree=await ghTree(M());
    const theirs=PHONE?PC_FILE:PH_FILE, mine=PHONE?PH_FILE:PC_FILE, f=tree.files[theirs];
    if(f&&f.sha!==M().gotSha){ say('받는 중…'); stamp(); const bytes=await ghGetBlob(M(),f.sha); let payload; try{ payload=await CR.unlock(bytes,M().pw); }catch(e){ throw new Error('우편함 파일을 못 열었습니다 — 양쪽 자동 우편함 비밀번호가 같은지 확인해 주세요'); }
      const r=PHONE?await importFromPC(payload,{mailbox:true}):await importFromPhone(payload,null,{mailbox:true}); M().gotSha=f.sha; M().lastPull=iso(); out.pulled=r; mailLog({t:iso(),dir:'in',n:r.n,conf:r.conf,photos:r.photos||0});
      if(mode==='auto'&&typeof PAGE!=='undefined'&&PAGE&&PAGE!=='psync'){ try{ const y=window.scrollY; showPage(PAGE==='detail'?'grid':PAGE); window.scrollTo(0,y); }catch(e){} } }
    const pre=preSig(), mineF=tree.files[mine], need=(pre!==M().pushedSig)||(!!M().mySha&&(!mineF||mineF.sha!==M().mySha));
    if(need){ say('보내는 중…'); const payload=PHONE?await buildPhoneToPc():await buildPcToPhone(); const u8=await CR.lock(payload,M().pw); const sha=await ghPutFile(M(),mine,u8); M().mySha=sha; M().pushedSig=pre; M().lastPush=iso(); SY.last.sent=M().lastPush; out.pushed=true; mailLog({t:iso(),dir:'out',size:u8.length,photos:PHONE?(payload.photos||[]).length:0}); }
    M().err=''; M().errAt='';
  }catch(e){ out.err=e&&e.message||String(e); M().err=out.err; M().errAt=iso(); }
  MAIL_BUSY=false; if(typeof saveToServer==='function') saveToServer(true);
  if(typeof PAGE!=='undefined'&&PAGE==='psync'){ drawPage(); if(mode==='manual') msg('#sy-mail-msg',out.err?'안 됐습니다: '+out.err:(out.pulled||out.pushed)?[out.pulled?`받음: ${tellN(out.pulled.n)}${out.pulled.photos?` · 사진 ${out.pulled.photos}장`:''}${out.pulled.conf?` · 양쪽이 달라 나중 것으로 맞춘 건 ${out.pulled.conf}개`:''}`:'',out.pushed?'보냄 ○':''].filter(Boolean).join(' / '):'새로 주고받을 것이 없습니다.',!!out.err); }
  return out; }
setInterval(()=>{ if(!mailOn()) return; if(Date.now()-MAIL_LASTRUN<MAIL_MIN*60000) return; mailCycle('auto'); },30000);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&mailOn()&&Date.now()-MAIL_LASTRUN>60000) setTimeout(()=>mailCycle('auto'),2500); });
setTimeout(()=>{ if(mailOn()) mailCycle('auto'); },15000);   /* 열고 15초 뒤 한 번 */
/* 설정 창 */
function mailSettings(){ return new Promise(res=>{
  let w=q('#syMail'); if(!w){ w=document.createElement('div'); w.id='syMail'; w.className='loginWrap syPw'; w.hidden=true;
    w.innerHTML=`<form class="loginBox" autocomplete="off" novalidate style="max-width:440px"><h1>자동 우편함 설정</h1><p class="desc">깃허브에 만든 <b>비공개 저장소</b>와 <b>토큰</b>을 넣습니다. 우편함에는 비밀번호 없이는 못 여는 덩어리만 놓입니다.</p>
      <label class="fld">저장소 (아이디/이름)<input id="sm-repo" placeholder="예: utrgh482/isadom-mailbox"></label>
      <label class="fld">토큰 (github_pat_… 또는 ghp_…)<input id="sm-token" type="password" autocomplete="off"></label>
      <label class="fld">자동 우편함 비밀번호 (4글자 이상 — 양쪽이 같아야 함)<input id="sm-pw" type="password" autocomplete="off"></label>
      <label class="fld" style="display:flex;gap:8px;align-items:center;font-weight:600"><input type="checkbox" id="sm-on" style="width:auto;margin:0"> 켜기 (열어 두면 3분마다 저절로 주고받기)</label>
      <div class="msg" id="sm-msg"></div>
      <div class="row"><button class="btn primary" type="submit" id="sm-save">저장</button><button type="button" class="btn" id="sm-test">연결 시험</button><button type="button" class="btn" id="sm-x">취소</button></div>
      <p class="hint" style="margin-top:12px">토큰 만들기: github.com → 오른쪽 위 사진 → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token → Repository access 에서 우편함 저장소만 고르고 → Permissions › Repository permissions › <b>Contents: Read and write</b> → Generate. 만료일이 있으니 그때 새 토큰으로 바꿔 넣습니다.</p></form>`;
    document.body.appendChild(w); }
  const m=SY.mail||{}; q('#sm-repo').value=m.owner?`${m.owner}/${m.repo}`:''; q('#sm-token').value=m.token||''; q('#sm-pw').value=m.pw||''; q('#sm-on').checked=m.on!==false; q('#sm-msg').textContent=''; w.hidden=false; setTimeout(()=>{ try{ q(m.owner?'#sm-token':'#sm-repo').focus(); }catch(e){} },30);
  const read=()=>{ const rp=q('#sm-repo').value.trim().replace(/^https?:\/\/github\.com\//,'').replace(/\.git$/,'').replace(/\/+$/,''); const [owner,repo]=rp.split('/'); return {owner:(owner||'').trim(),repo:(repo||'').trim(),branch:(m.branch||'main'),token:q('#sm-token').value.trim(),pw:q('#sm-pw').value,api:m.api||'',on:q('#sm-on').checked}; };
  const done=v=>{ w.hidden=true; form.onsubmit=null; q('#sm-x').onclick=null; q('#sm-test').onclick=null; res(v); };
  const form=q('form',w);
  q('#sm-test').onclick=async()=>{ const c=read(); q('#sm-msg').textContent='시험 중…'; const lines=await mailTest(c); q('#sm-msg').innerHTML=lines.map(E).join('<br>'); };
  form.onsubmit=e=>{ e.preventDefault(); const c=read(); const bad=!c.owner||!c.repo?'저장소를 아이디/이름 꼴로 넣어 주세요.':!c.token?'토큰을 넣어 주세요.':c.pw.length<4?'비밀번호는 4글자 이상으로 해 주세요.':''; if(bad){ q('#sm-msg').textContent=bad; return; }
    SY.mail=normSY({mail:Object.assign({},m,c,{fromPc:false,pushedSig:'',mySha:m.owner===c.owner&&m.repo===c.repo?m.mySha:'',gotSha:m.owner===c.owner&&m.repo===c.repo?m.gotSha:'',err:''})}).mail; PW_CACHE=c.pw; if(typeof saveToServer==='function') saveToServer(true); done(SY.mail); };
  q('#sm-x').onclick=()=>done(null);
}); }
function mailCardHTML(){ const m=SY.mail; const on=mailOn();
  const st=!m?'설정 안 됨':(on?`켜짐 · ${E(m.owner)}/${E(m.repo)}${m.fromPc?' (PC 에서 받은 설정)':''}`:`꺼짐 · ${E(m.owner||'')}/${E(m.repo||'')}${!m.pw?' · 비밀번호 없음':''}`);
  return `<div class="card" id="sy-mailcard"><h2>자동 우편함 <span class="pill grey">깃허브</span></h2>
    <p class="desc">${PHONE?'앱을 열어 두면 3분마다 PC 이사돔과 저절로 주고받습니다(PC 이사돔도 열려 있을 때). 밴드로 파일을 옮길 필요가 없습니다.':'이 화면이 열려 있는 동안 3분마다 핸드폰과 저절로 주고받습니다(핸드폰 앱도 열려 있을 때). 우편함은 유진 님 깃허브의 비공개 저장소이고, 놓이는 것은 아래 파일 방식과 똑같은 잠긴 덩어리입니다. 밴드 파일 방식은 그대로 남아 있어 언제든 손으로도 됩니다.'}</p>
    <div class="kv2"><span>상태</span><b>${st}</b><span>마지막 받음</span><b>${E(fmtT(m&&m.lastPull))}</b><span>마지막 보냄</span><b>${E(fmtT(m&&m.lastPush))}</b>${m&&m.err?`<span>오류</span><b class="bad">${E(m.err)} <small>(${E(fmtT(m.errAt))})</small></b>`:''}</div>
    <div class="row" style="margin-top:10px"><button type="button" class="btn primary" id="sy-mail-now" ${on&&!MAIL_BUSY?'':'disabled'}>${MAIL_BUSY?'주고받는 중…':'지금 주고받기'}</button><button type="button" class="btn" id="sy-mail-set">${m?'설정 고치기':'설정'}</button><button type="button" class="btn" id="sy-mail-test">연결 시험</button>${m?`<button type="button" class="btn" id="sy-mail-toggle">${m.on?'끄기':'켜기'}</button>`:''}</div>
    <div class="msg" id="sy-mail-msg"></div>
    ${m&&m.log&&m.log.length?`<details style="margin-top:8px"><summary class="hint" style="cursor:pointer">자동 우편함 기록 ${m.log.length}건</summary><table class="sylog">${m.log.map(e=>`<tr><td>${E(fmtT(e.t))}</td><td>${e.dir==='in'?'받음':'보냄'}</td><td>${e.dir==='in'?E(tellN(e.n||{}))+(e.photos?` · 사진 ${e.photos}장`:'')+(e.conf?` · <b>나중 것으로 맞춘 건 ${e.conf}개</b>`:''):`${Math.round((e.size||0)/1024)}KB${e.photos?` · 사진 ${e.photos}장`:''}`}</td></tr>`).join('')}</table></details>`:''}
    ${!PHONE&&!m?'<p class="hint" style="margin-top:8px">처음 한 번: ① 깃허브에서 비공개 저장소(예: isadom-mailbox, README 포함)를 만들고 ② 토큰을 만들어 ③ [설정]에 넣고 [연결 시험] → [저장] ④ 그다음 [핸드폰으로 보낼 파일 만들기]를 한 번 더 해서 밴드로 핸드폰에 넣으면, 핸드폰이 설정을 받아 자동으로 바뀝니다.</p>':''}
    ${PHONE&&!m?'<p class="hint" style="margin-top:8px">PC 이사돔 [핸드폰]에서 자동 우편함을 설정한 뒤 만든 파일을 한 번 가져오면 설정이 따라옵니다. 직접 넣으려면 [설정].</p>':''}
  </div>`; }
function wireMailCard(){
  const now=q('#sy-mail-now'); if(now) now.onclick=()=>mailCycle('manual');
  const set=q('#sy-mail-set'); if(set) set.onclick=async()=>{ const r=await mailSettings(); if(r){ drawPage(); msg('#sy-mail-msg','저장했습니다.'+(PHONE?'':' 이제 [핸드폰으로 보낼 파일 만들기]를 한 번 더 해서 핸드폰에 넣어 주세요 — 핸드폰이 우편함 설정을 받습니다.')); if(mailOn()) setTimeout(()=>mailCycle('manual'),800); } };
  const test=q('#sy-mail-test'); if(test) test.onclick=async()=>{ msg('#sy-mail-msg','시험 중…'); const lines=await mailTest(SY.mail||{}); const el=q('#sy-mail-msg'); if(el){ el.innerHTML=lines.map(E).join('<br>'); el.classList.remove('bad'); } };
  const tg=q('#sy-mail-toggle'); if(tg) tg.onclick=()=>{ if(!SY.mail) return; SY.mail.on=!SY.mail.on; if(typeof saveToServer==='function') saveToServer(true); drawPage(); };
}

/* ---------- 화면 (#page-psync) — PC 와 핸드폰이 다르게 ---------- */
const fmtT=s=>{ if(!s) return '—'; const d=new Date(s); return isNaN(d)?String(s):d.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'}); };
function changedSince(){ const x=lastExchange(); const n={}; for(const t of TKEYS){ let c=0; const meta=SY.meta[t]; Object.keys(meta).forEach(id=>{ if(!x||meta[id].u>x) c++; }); Object.keys(SY.tomb[t]).forEach(id=>{ if(!x||SY.tomb[t][id]>x) c++; }); n[t]=c; } return n; }
function logHTML(){ if(!SY.log.length) return '<div class="hint">아직 주고받은 적이 없습니다.</div>';
  return `<table class="sylog"><thead><tr><th>언제</th><th>무엇</th><th>내용</th></tr></thead><tbody>${SY.log.map(e=>`<tr><td>${E(fmtT(e.t))}</td><td>${e.dir==='out'?(PHONE?'PC 로 보낼 파일 만듦':'핸드폰으로 보낼 파일 만듦'):(PHONE?'PC 에서 받음':'핸드폰에서 받음')}</td><td>${e.dir==='out'?E(e.note||''):E(tellN(e.n||{}))}${e.photos?` · 사진 ${e.photos}장`:''}${e.conf?` · <b>양쪽이 달라 나중 것으로 맞춘 건 ${e.conf}개</b>`:''}</td></tr>`).join('')}</tbody></table>`; }
let BUSY='';
function drawPage(){
  const pg=q('#page-psync'); if(!pg) return; const ch=changedSince(), chTxt=TKEYS.map(t=>ch[t]?`${TYPES[t].name} ${ch[t]}`:'').filter(Boolean).join(' · ')||'없음';
  if(PHONE){
    const pend=pendingPhotos();
    pg.innerHTML=`<div class="lede">PC 와 주고받기</div><div class="lede-sub">사무실 PC 이사돔과 이 핸드폰은 서로 연결되지 않습니다. 잠긴 덩어리를 <b>자동 우편함</b>(깃허브)이나 <b>밴드</b> 파일로 주고받아 맞춥니다.</div>
      ${mailCardHTML()}
      <div class="card"><h2>1. PC 에서 온 파일 가져오기</h2><p class="desc">밴드에서 내려받은 <b>이사돔_핸드폰으로_….zip</b> 을 고르고 잠금 비밀번호를 넣으면, 지도사업 표·사업 요약·직접 사업 숫자가 새로 들어오고 할일·메모·상담·현황 건은 나중에 고친 것이 남도록 합쳐집니다.</p>
        <div class="row"><button type="button" class="btn primary" id="sy-in" ${BUSY?'disabled':''}>${BUSY==='in'?'가져오는 중…':'파일 고르기'}</button><span class="hint">마지막 가져옴 ${E(fmtT(SY.last.recv))}</span></div><div class="msg" id="sy-in-msg"></div></div>
      <div class="card"><h2>2. PC 로 보낼 파일 만들기</h2><p class="desc">이 핸드폰에서 고친 것과 새 사진을 잠긴 파일 하나로 만들어 다운로드 폴더에 둡니다. 밴드에 올린 뒤 PC 이사돔의 [핸드폰] → [핸드폰에서 가져오기]로 받습니다.</p>
        <div class="kv2"><span>고친 것</span><b>${E(chTxt)}</b><span>보낼 사진</span><b>${pend.length}장 <span class="hint">(긴 변 2000px 로 줄여서 · 원본은 핸드폰에)</span></b></div>
        <div class="row" style="margin-top:10px"><button type="button" class="btn primary" id="sy-out" ${BUSY?'disabled':''}>${BUSY==='out'?'만드는 중…':'파일 만들기'}</button><span class="hint">마지막 만듦 ${E(fmtT(SY.last.sent))}</span></div><div class="msg" id="sy-out-msg"></div></div>
      <div class="card"><h2>지난 기록</h2>${logHTML()}</div>
      <div class="card" id="sy-phoneinfo"><h2>이 핸드폰 안</h2><div class="kv2" id="sy-kv"><span>불러오는 중…</span></div><p class="hint">자료는 이 핸드폰 안(앱 저장 공간)에만 있습니다. 앱을 지우면 같이 지워지니, 고친 것은 PC 로 보내 두세요.</p></div>`;
    fetch('/api/phone/info').then(r=>r.json()).catch(()=>({})).then(info=>{ const kv=q('#sy-kv'); if(!kv) return; kv.innerHTML=`<span>자료 판</span><b>${info&&info.version!=null?info.version:'—'}</b><span>마지막 저장</span><b>${info&&info.updatedAt?E(String(info.updatedAt).slice(5,16)):'—'}</b><span>사진·파일</span><b>${info&&info.files!=null?`${info.files}장 · ${Math.round((info.bytes||0)/1024/1024*10)/10}MB`:'—'}</b><span>핸드폰 서버</span><b>${E(info&&info.sw||'—')}</b><span>주고받기</span><b>${E(SV)}</b>`; });
  } else {
    pg.innerHTML=`<div class="lede">핸드폰과 주고받기</div><div class="lede-sub">핸드폰 이사돔과 이 PC 는 서로 연결되지 않습니다. 잠긴 덩어리를 <b>자동 우편함</b>(깃허브 비공개 저장소)이나 <b>밴드</b> 파일로 주고받아 맞춥니다. 핸드폰에는 <b>글만</b> 가고, 핸드폰에서는 고친 것과 <b>새 사진</b>이 옵니다.</div>
      ${mailCardHTML()}
      <div class="card"><h2>핸드폰으로 보내기 (밴드 파일)</h2>
        <p class="desc"><b>가는 것</b>: 지도사업 진행현황 표와 사업 요약(농가 이름·주민번호·주소·전화·보탬e 계정·업체 이름·통화 기록은 <u>비워서</u>) · 직접 사업 요약·가계부 숫자(근로자·출근부는 안 가고, 지출 줄의 거래처는 비워서) · 현황 건 · 할일 · 메모(농가 칸 빼고) · 상담(농가명·전화번호 빼고, 주소는 감) · 지원자격 조건.<br><b>안 가는 것</b>: 스캔·사진, 계획표, 월급 계산기, 부가세, 관리.</p>
        <div class="row"><button type="button" class="btn primary" id="sy-out" ${BUSY?'disabled':''}>${BUSY==='out'?'만드는 중…':'핸드폰으로 보낼 파일 만들기'}</button><span class="hint">마지막 만듦 ${E(fmtT(SY.last.sent))} · 그 뒤 고친 것: ${E(chTxt)}</span></div><div class="msg" id="sy-out-msg"></div>
        <p class="hint">만든 파일(이사돔_핸드폰으로_날짜.zip)을 밴드에 올리고, 핸드폰 이사돔 [더보기] → [PC 와 주고받기] → [파일 고르기]로 받습니다. 잠금 비밀번호는 양쪽이 같아야 합니다.</p></div>
      <div class="card"><h2>핸드폰에서 가져오기 (밴드 파일)</h2>
        <p class="desc">핸드폰이 만든 <b>이사돔_PC로_….zip</b>(밴드에서 내려받은 것)을 고릅니다. 할일·메모·상담·현황 건은 나중에 고친 것이 남고(양쪽이 다르면 몇 개인지 알려 줍니다), 핸드폰에서 찍은 새 사진은 상담·메모에 붙습니다. 상담의 농가명·전화번호, 메모의 농가 칸은 PC 것이 그대로 남습니다.</p>
        <div class="row"><button type="button" class="btn primary" id="sy-in" ${BUSY?'disabled':''}>${BUSY==='in'?'가져오는 중…':'핸드폰에서 온 파일 고르기'}</button><span class="hint">마지막 가져옴 ${E(fmtT(SY.last.recv))} · 받은 사진 ${SY.ack.length}장</span></div><div class="msg" id="sy-in-msg"></div></div>
      <div class="card"><h2>지난 기록</h2>${logHTML()}</div>`;
  }
  let fi=q('#sy-file'); if(!fi){ fi=document.createElement('input'); fi.type='file'; fi.id='sy-file'; fi.accept=PHONE?'*/*':'.zip,.isd,application/zip,application/octet-stream'; fi.hidden=true; document.body.appendChild(fi); }   /* 핸드폰은 모든 파일 — 파일 고르는 앱이 zip 을 걸러 버리지 않게 */
  wireMailCard();
  const bo=q('#sy-out'); if(bo) bo.onclick=()=>doExport();
  const bi=q('#sy-in'); if(bi) bi.onclick=()=>{ fi.value=''; fi.onchange=()=>{ const f=fi.files[0]; fi.value=''; if(f) doImport(f); }; fi.click(); };
}
const msg=(id,t,bad)=>{ const el=q(id); if(el){ el.textContent=t; el.classList.toggle('bad',!!bad); } };
async function doExport(){
  if(BUSY) return;
  if(!PW_CACHE&&SY.mail&&SY.mail.pw) PW_CACHE=SY.mail.pw;   /* 자동 우편함 비밀번호와 같게 (핸드폰이 설정을 받으려면 같아야 함) */
  const pw=await askPw({title:PHONE?'PC 로 보낼 파일 잠그기':'핸드폰으로 보낼 파일 잠그기',msg:'받는 쪽에서 같은 비밀번호를 넣어야 열립니다. (이사돔 로그인 비밀번호와 달라도 됩니다)',confirm:!PW_CACHE,button:'파일 만들기'}); if(!pw) return;
  BUSY='out'; drawPage();
  try{
    const payload=PHONE?await buildPhoneToPc((i,n)=>msg('#sy-out-msg',`사진 줄이는 중 ${i}/${n}…`)):await buildPcToPhone();
    msg('#sy-out-msg','잠그는 중…'); const u8=await packFile(payload,pw,f=>msg('#sy-out-msg',`잠그는 중… ${Math.round(f*100)}%`));
    const name=`이사돔_${PHONE?'PC로':'핸드폰으로'}_${stampName()}.zip`; const where=giveFile(u8,name);
    SY.last.sent=iso(); const note=PHONE?`${TKEYS.map(t=>`${TYPES[t].name} ${payload.tw[t].items.length}`).join(' · ')} · 사진 ${payload.photos.length}장 · ${Math.round(u8.length/1024)}KB`:`사업 ${payload.ro.projects.length} · ${TKEYS.map(t=>`${TYPES[t].name} ${payload.tw[t].items.length}`).join(' · ')} · ${Math.round(u8.length/1024)}KB`;
    addLog({t:SY.last.sent,dir:'out',note}); if(typeof saveToServer==='function') saveToServer(true);
    BUSY=''; drawPage(); msg('#sy-out-msg',`${where}에 ${name} 을 만들었습니다 (${Math.round(u8.length/1024)}KB). 밴드에 올려 주세요.`);
  }catch(e){ BUSY=''; drawPage(); msg('#sy-out-msg','만들지 못했습니다: '+(e&&e.message||e),true); }
}
async function doImport(file){
  if(BUSY) return;
  const pw=await askPw({title:PHONE?'PC 에서 온 파일 열기':'핸드폰에서 온 파일 열기',msg:`${file.name} — 만들 때 넣은 잠금 비밀번호`,button:'가져오기'}); if(!pw) return;
  BUSY='in'; drawPage();
  try{
    msg('#sy-in-msg','여는 중…'); const u8=await readFile(file); const payload=await unpackFile(u8,pw,f=>msg('#sy-in-msg',`여는 중… ${Math.round(f*100)}%`));
    msg('#sy-in-msg','합치는 중…');
    const r=PHONE?await importFromPC(payload,{pw}):await importFromPhone(payload,(i,n)=>msg('#sy-in-msg',`사진 받는 중 ${i}/${n}…`));
    BUSY=''; drawPage();
    const parts=[`가져왔습니다 (${E(r.from||'')} · ${fmtT(r.made)} 에 만든 파일).`,tellN(r.n)]; if(r.photos) parts.push(`사진 ${r.photos}장 붙임`); if(r.skipped) parts.push(`(붙을 자리가 없어 건너뛴 사진 ${r.skipped}장)`); if(r.conf) parts.push(`양쪽이 달라 나중 것으로 맞춘 건 ${r.conf}개`); if(PHONE) parts.push('표·요약·직접 사업 숫자는 PC 것으로 새로 받았습니다.'); if(PHONE&&MAIL_NEW){ MAIL_NEW=false; parts.push('PC 의 자동 우편함 설정을 받았습니다 — 이제부터는 앱을 열어 두면 3분마다 저절로 주고받습니다.'); setTimeout(()=>mailCycle('manual'),1500); }
    msg('#sy-in-msg',parts.join(' '));
  }catch(e){ BUSY=''; drawPage(); msg('#sy-in-msg','가져오지 못했습니다: '+(e&&e.message||e),true); }
}
const _draw=DIRECT.draw; DIRECT.draw=function(id){ if(id==='psync'){ drawPage(); return; } return _draw.apply(this,arguments); };

window.SYNC={version:SV,PHONE_BASE,stamp,buildPcToPhone,buildPhoneToPc,importFromPC,importFromPhone,packFile,unpackFile,drawPage,doExport,doImport,askPw,state:()=>SY,changedSince,pendingPhotos,lastExchange,hash,TYPES,fixUid,mergeType,
  MAIL:{cycle:mailCycle,test:mailTest,settings:mailSettings,on:mailOn,set:(c)=>{ SY.mail=normSY({mail:Object.assign({},SY.mail||{},c)}).mail; return SY.mail; },busy:()=>MAIL_BUSY,userBusy,pre:preSig,_parts:()=>PHONE?{tw:twPayload(),tomb:SY.tomb,ph:pendingPhotos().map(f=>f.id)}:{tw:twPayload(),tomb:SY.tomb,ack:SY.ack,ro:roPayload()}}};
})();
