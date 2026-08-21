/* ──────────────────────────────────────────────────────────
   06-qty-edit.js
   수량 조작 — 한 곳으로 모은다 (− / + / 직접 입력 / 스캔)
   ────────────────────────────────────────────────────────── */
import { $, S, A } from "./00-core.js";
/* ── 수량 조작 : − / + / 직접 입력 ─────────────────────────── */
function setQty(p, i, v){
  v = Math.max(0, Math.min(9999, Math.floor(Number(v) || 0)));
  const was = A.QTY[p][i] || 0;
  A.QTY[p][i] = v;
  if (was === 0 && v > 0) A.touch(p, i);
  A.paintQty($(p === "A" ? "gridA" : "gridB"), i, v);
  if (p === S.PAGE) A.refresh();
  A.renderCart();
  A.syncPickChip();
  A.saveDraft();
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { setQty });
