/* ──────────────────────────────────────────────────────────
   07-cart.js
   PC 우측 "담은 목록" 패널
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";
/* ── PC 우측 "담은 목록" 패널 ─────────────────────────────────
   넓은 화면에서 스크롤 없이 지금 뭘 담았는지 계속 보인다. */
function renderCart(){
  const box = $("cartBox");
  if (!box) return;
  const q = A.QTY[S.PAGE];
  const picked = A.pickedOf(S.PAGE);                       // 최신 먼저
  const kinds = picked.length, total = picked.reduce((s,i)=>s+q[i],0);
  box.innerHTML =
    `<h4>담은 목록 <span>${kinds} 품목 · ${total} 개</span></h4>` +
    (picked.length
      ? `<div class="cartlist">` + picked.map(i=>{
          const it = A.ITEMS[i];
          return `<div class="cartrow">
            ${A.IMG[i] ? `<img src="${A.IMG[i]}" alt="">` : ""}
            <b>${esc(it.d)}<i>${esc(it.g)}${it.p ? ` · <span class="price">${esc(it.p)}</span>` : ""}</i></b>
            <u>${q[i]}</u>
            <button type="button" data-drop="${i}" aria-label="${esc(it.d)} 빼기">×</button>
          </div>`;
        }).join("") + `</div>`
      : `<p class="cartempty">아직 담은 상품이 없습니다.</p>`)
    + (picked.length ? `<div class="cartsum"><span>소비자가 합계</span><b>${A.money(picked.reduce((s,i)=>s+A.won(i)*q[i],0))}</b></div>` : "");
}
document.addEventListener("click", e=>{
  const d = e.target.closest("[data-drop]");
  if (d) A.setQty(S.PAGE, +d.dataset.drop, 0);
});


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { renderCart });
