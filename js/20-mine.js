/* ──────────────────────────────────────────────────────────
   20-mine.js
   전자랜드 · 내 주문 탭
   ────────────────────────────────────────────────────────── */
import { $, S, A } from "./00-core.js";
/* ── 전자랜드 · 내 주문 ─────────────────────────────────────
   보낸 주문이 최신순으로 쌓이고 상태가 그대로 보입니다.
   주문서는 더다움이 받는 것과 같은 파일 — 그게 곧 보고 자료입니다. */
function renderMine(){
  const box = $("v0b");
  syncSub();
  if (!A.ORDERS.length){ box.innerHTML = `<p class="empty">보낸 주문이 여기에 쌓입니다.<br>주문서는 여기서 언제든 다시 받을 수 있습니다.</p>`; return; }
  const wait = A.ORDERS.filter(o=>o.status===0).length;
  const list = A.tabCut(0, A.ORDERS);                 /* 보고 있는 갈래만 */
  box.innerHTML = A.stateBanner(0, A.ORDERS) + A.tabBar(0, A.ORDERS) + A.bulkBar(0, list)
    + `<p class="sect">보낸 주문 ${list.length}건${wait ? ` · 확인 대기 ${wait}건` : ""}</p>`
    + list.map(o=>A.orderCard(o, 0)).join("");
  A.bindBulkBar(0, list);
}
function syncSub(){
  const wait = A.ORDERS.filter(o=>o.status===0).length;
  $("subMine").innerHTML = `내 주문<b>${A.ORDERS.length}${wait ? " · 대기 " + wait : ""}</b>`;
}
document.addEventListener("click", e=>{
  const ok=e.target.closest("[data-ok]"), ap=e.target.closest("[data-appr]"),
        dn=e.target.closest("[data-done]"), fm=e.target.closest("[data-form]"),
        ud=e.target.closest("[data-undo]"), rj=e.target.closest("[data-rej]"),
        st=e.target.closest("[data-store]"), cu=e.target.closest("[data-cust]");
  if (ud) A.undoOrder(A.ORDERS.find(o=>o.no===ud.dataset.undo));
  if (ok){ const o = A.ORDERS.find(x=>x.no===ok.dataset.ok);
           o.status = 1; A.store?.onPatch(o, {status:1});   /* [저장소 고리] */
           A.renderInbox(1); A.showSent(); renderMine(); }
  if (ap) A.askApprove(A.ORDERS.find(o=>o.no===ap.dataset.appr));
  if (rj) A.askReject(A.ORDERS.find(o=>o.no===rj.dataset.rej));
  if (dn) A.askShipOut(A.ORDERS.find(o=>o.no===dn.dataset.done));
  if (fm) A.dlOrderForm(A.ORDERS.find(o=>o.no===fm.dataset.form), fm, fm.dataset.mark === "1");
  if (st) A.dlStore(A.pickAppr(st.dataset.store), st);
  if (cu) A.dlCust(A.pickAppr(cu.dataset.cust), cu);
});
/* SUB 는 00-state.js 의 S.SUB 로 옮겼습니다 */ // 전자랜드 화면 안 — "order" | "mine"
function setSub(v){
  S.SUB = v;
  $("v0").hidden  = (v !== "order");
  $("v0b").hidden = (v !== "mine");
  $("bar").hidden = (v !== "order");
  document.body.style.paddingBottom = A.mqPC.matches ? "24px" : (v === "order" ? "104px" : "40px");
  document.querySelectorAll("#subtabs button").forEach(b=>
    b.setAttribute("aria-pressed", String(b.dataset.sub === v)));
  if (v === "mine") renderMine(); else A.showSent();
  window.scrollTo({top:0});
}
document.querySelectorAll("#subtabs button").forEach(b=> b.onclick = ()=>setSub(b.dataset.sub));


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { renderMine, setSub });
