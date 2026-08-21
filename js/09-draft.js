/* ──────────────────────────────────────────────────────────
   09-draft.js
   작성 중인 주문 자동 보관 (브라우저 localStorage)
   ────────────────────────────────────────────────────────── */
import { $, S, A } from "./00-core.js";
/* ── 작성 중인 주문 자동 보관 (브라우저 localStorage) ─────────
   폰을 잠그거나 실수로 새로고침해도 담아둔 수량이 날아가지 않는다.
   페이지(A/B)별로 따로 보관 — 수량이 절대 섞이지 않는다. */
const DRAFT_KEY = "trycozy.keyring.draft.v1";
/* draftReady 는 00-state.js 의 S.draftReady 로 옮겼습니다 */
function saveDraft(){
  if (!S.draftReady) return;
  try{
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      A: A.QTY.A, B: A.QTY.B,
      to: {name:$("sName").value, tel:$("sTel").value, zip:$("sZip").value,
           addr:$("sAddr").value, addr2:$("sAddr2").value, memo:$("sMemo").value},
      ts: Date.now()
    }));
  }catch(e){}
}
/* 이 브라우저에 얼마나 오래 들고 있을지 (개인정보 보관 기준과 같은 취지)
   · 수량   : 7일  — 그 뒤엔 통째로 버립니다
   · 받는 분: 1일  — 주소·전화가 기기에 오래 남지 않게 */
const DRAFT_KEEP_MS = 7 * 24 * 60 * 60 * 1000;
const DRAFT_TO_MS   = 1 * 24 * 60 * 60 * 1000;

function loadDraft(){
  let o = null;
  try{ o = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null"); }catch(e){}
  S.draftReady = true;
  if (!o) return;
  const age = Date.now() - (o.ts || 0);
  if (age > DRAFT_KEEP_MS){ clearDraft(); return; }      // 오래된 작성분은 버립니다
  if (age > DRAFT_TO_MS) o.to = null;                    // 받는 분만 먼저 버립니다
  let n = 0;
  ["A","B"].forEach(p=>{
    Object.entries(o[p] || {}).forEach(([i,v])=>{
      if (v > 0 && A.ITEMS[i]){ A.setQty(p, +i, v); n += v; }
    });
  });
  if (o.to) [["sName","name"],["sTel","tel"],["sZip","zip"],["sAddr","addr"],["sAddr2","addr2"],["sMemo","memo"]]
    .forEach(([id,k])=>{ const el = $(id); if (el && o.to[k]) el.value = o.to[k]; });
  if (n) $("scanNote").textContent = `이전에 담아둔 ${n}개를 그대로 불러왔습니다.`;
}
function clearDraft(){ try{ localStorage.removeItem(DRAFT_KEY); }catch(e){} }
document.addEventListener("click", e=>{
  const s = e.target.closest(".step [data-d]");
  if (!s) return;
  const p = s.dataset.p, i = +s.dataset.i;
  const step = A.stepOf(p);                       // 매대 보충 기본 10, 개인 배송 1
  const cur = A.QTY[p][i] || 0;
  const d = +s.dataset.d;
  /* 단위가 10인데 7개 담겨 있으면 － 는 0 으로, ＋ 는 10 으로 (단위에 맞춰 정렬) */
  let next = d > 0 ? Math.floor(cur / step) * step + step
                   : Math.ceil(cur / step) * step - step;
  A.setQty(p, i, Math.max(0, next));
});

/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { clearDraft, loadDraft, saveDraft });
