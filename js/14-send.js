/* ──────────────────────────────────────────────────────────
   14-send.js
   주문 전송 — 확인 시트 · 보낸 뒤 안내줄 · 되돌리기
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";
/* ── 주문 전송 ─────────────────────────────────────────────── */
const ORDERS = [];
/* seq 는 00-state.js 의 S.seq 로 옮겼습니다 */
const SHIP_IDS = ["sName","sTel","sZip","sAddr","sAddr2","sMemo"];
/* LAST 는 00-state.js 의 S.LAST 로 옮겼습니다 */ // 방금 보낸 주문 (되돌리기 대상)

/* ── 확인 시트 ─────────────────────────────────────────────── */
const sheet = $("sheet");
function closeSheet(){ sheet.hidden = true; $("sheetBody").innerHTML = ""; S.SHIPIMG = null; }
function openSheet(html, onYes, tone, label){
  $("sheetBody").innerHTML = html;
  const yes = $("sheetYes");
  yes.className = "act sm " + (tone || "");
  yes.textContent = label || "보내기";
  yes.onclick = ()=>{ onYes(); closeSheet(); };   // 값을 먼저 읽고 나서 비운다
  sheet.hidden = false;
}
$("sheetNo").onclick = closeSheet;
sheet.addEventListener("click", e=>{ if (e.target === sheet) closeSheet(); });
document.addEventListener("keydown", e=>{ if (e.key === "Escape" && !sheet.hidden) closeSheet(); });

/* ── 보내기 = 확인 한 번 거친다 (전자랜드는 엑셀을 강제하지 않는다) ── */
$("send").onclick = ()=>{
  const q = A.QTY[S.PAGE];
  const lines = A.ITEMS.map((it,i)=>({...it, idx:i, img:A.IMG[i], q:q[i]||0})).filter(r=>r.q>0);
  if (!lines.length) return;
  if (A.isShip() && !A.shipReady()){
    A.shipForm.scrollIntoView({block:"center",behavior:"smooth"});
    setTimeout(()=>$(A.REQ.find(id=>!$(id).value.trim())).focus(), 350);
    return;
  }
  const ship = A.isShip();
  const n   = lines.reduce((s,l)=>s+l.q,0);
  const sum = lines.reduce((s,l)=>s+(Number(String(l.p||"").replace(/[^0-9]/g,""))||0)*l.q,0);
  const to  = ship ? {name:$("sName").value, tel:A.fmtTel($("sTel").value), zip:$("sZip").value,
                      addr:$("sAddr").value, addr2:$("sAddr2").value, memo:$("sMemo").value} : null;
  openSheet(
    `<b class="big">${ship ? "개인 배송" : "매대 보충"}</b>
     <p class="sum">${lines.length} 품목 · 총 <b>${n}</b> 개${ship ? "" : " · 소비자가 " + A.money(sum)}</p>
     ${to ? `<p class="to"><b>${esc(to.name)}</b> · ${esc(to.tel)}<br>${to.zip ? "["+esc(to.zip)+"] " : ""}${esc(to.addr)}${to.addr2 ? " " + esc(to.addr2) : ""}</p>` : ""}
     <p class="ask">이대로 보낼까요?</p>`,
    ()=>doSend(lines, to),
    ship ? "cy" : "ac");
};

function doSend(lines, to){
  const d = new Date(), page = S.PAGE, q = A.QTY[page];
  const o = {
    no: "ORD-" + String(S.seq++).padStart(4,"0"),
    at: d.toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"}),
    mmdd: String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0"),
    yyyymmdd: String(d.getFullYear()) + String(d.getMonth()+1).padStart(2,"0") + String(d.getDate()).padStart(2,"0"),
    mode: to ? "개인 배송" : "매대 보충",
    to, lines, status: 0,
    _page: page, _q: {...q}          // 되돌리기용 — 담았던 수량 그대로
  };
  ORDERS.unshift(o);
  /* [저장소 고리] 22-store.js 가 켜져 있을 때만 동작합니다 */
  A.store?.onNew(o);
  Object.keys(q).forEach(i => { if (q[i]) A.setQty(page, +i, 0); });
  if (to) SHIP_IDS.forEach(id=>$(id).value="");
  const left = Object.values(A.QTY.A).concat(Object.values(A.QTY.B)).reduce((x,y)=>x+y,0);
  if (left === 0) A.clearDraft(); else A.saveDraft();
  S.LAST = o;
  showSent(); A.renderMine();
  window.scrollTo({top:0, behavior:"smooth"});
}

/* ── 보낸 뒤 안내줄 — 주문서는 선택, 되돌리기는 더다움 확인 전까지 ── */
function showSent(){
  const bar = $("sentBar"), o = S.LAST;
  if (!o){ bar.hidden = true; return; }
  const done = o.status > 0;
  const n = o.lines.reduce((s,l)=>s+l.q,0);
  bar.className = "sentbar " + (o.to ? "mB" : "mA");
  bar.hidden = false;
  bar.innerHTML = `
    <p class="ttl"><b>${o.no}</b> · ${o.mode} · ${o.lines.length}품목 ${n}개 보냈습니다</p>
    <div class="btns">
      <button class="act form sm" data-form="${o.no}" type="button">주문서 받기</button>
      ${done
        ? `<button class="act sm" type="button" disabled>되돌리기 · 더다움이 접수함</button>`
        : `<button class="act ghost sm" id="undoBtn" type="button">되돌리기</button>`}
    </div>`;
  if (!done) $("undoBtn").onclick = undoLast;
}

/* 되돌리기 — 확인 대기(status 0) 건이면 어느 것이든.
   ⚠ 담긴 수량을 덮어쓰지 않고 **더합니다.** 새로 담는 중에 옛 주문을 취소해도 안 날아갑니다. */
function undoOrder(o){
  if (!o || o.status > 0){ showSent(); A.renderMine(); return; }
  const n0 = o.lines.reduce((s,l)=>s+l.q,0);
  openSheet(
    `<b class="big">${o.no} 되돌리기</b>
     <p class="sum">${o.mode} · ${o.lines.length} 품목 · 총 <b>${n0}</b> 개<br>
     주문을 취소하고 그 수량을 <b>담은 것</b>으로 되살립니다.</p>
     <p class="ask">되돌릴까요?</p>`,
    ()=>{
      const i = ORDERS.indexOf(o);
      if (i >= 0) ORDERS.splice(i, 1);
      A.store?.onDelete(o);   /* [저장소 고리] */
      const n = +(String(o.no).match(/\d+/) || [0])[0];
      if (n === S.seq - 1) S.seq = n;                       // 마지막 번호였으면 번호도 되돌린다
      A.setPage(o._page);
      Object.entries(o._q).forEach(([k,v])=> A.setQty(o._page, +k, (A.QTY[o._page][k] || 0) + v));
      if (o.to){
        const F = {sName:"name", sTel:"tel", sZip:"zip", sAddr:"addr", sAddr2:"addr2", sMemo:"memo"};
        SHIP_IDS.forEach(id => $(id).value = o.to[F[id]] || "");
      }
      if (S.LAST === o) S.LAST = null;
      showSent(); A.saveDraft(); A.refresh(); A.renderInbox(1); A.renderMine();
      if (S.SUB !== "order") A.setSub("order");
    }, "ac");
}
const undoLast = ()=> undoOrder(S.LAST);


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { ORDERS, openSheet, showSent, undoOrder });
