/* ──────────────────────────────────────────────────────────
   02-qty-state.js
   페이지별로 완전히 분리된 수량 (A 매대 보충 / B 개인 배송)
   ────────────────────────────────────────────────────────── */
import { S, A } from "./00-core.js";
/* ── 페이지별로 완전히 분리된 수량 ───────────────────────────── */
const QTY  = { A: {}, B: {} };     // A 매대 보충 / B 개인 배송
const PICK = { A: [], B: [] };     // 담은/찍은 순서. 뒤로 갈수록 최신 → 화면에는 역순으로 뿌린다
function touch(p, i){
  const arr = PICK[p], k = arr.indexOf(i);
  if (k >= 0) arr.splice(k, 1);
  arr.push(i);
}
const pickedOf = p => PICK[p].filter(i => (QTY[p][i] || 0) > 0).slice().reverse();
/* 소비자가 "12,900원" → 12900 */
const won = i => Number(String(A.ITEMS[i].p || "").replace(/[^0-9]/g,"")) || 0;
const money = n => n.toLocaleString("ko-KR") + "원";
/* PAGE 는 00-state.js 의 S.PAGE 로 옮겼습니다 */
const isShip = () => S.PAGE === "B";


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { QTY, isShip, money, pickedOf, touch, won });
