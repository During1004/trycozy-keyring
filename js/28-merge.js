/* ──────────────────────────────────────────────────────────
   28-merge.js
   더다움 "합쳐 보기" — 매대 주문 여러 건을 화면에서 한 블럭으로
   (2026-08-24 사용자 요청: "여러 블럭이 하나 블럭으로 됐으면")

   ★ 화면에서만 합칩니다. 저장소는 손대지 않습니다.
     원본 주문번호가 그대로 살아 있어야 전자랜드 `내 주문` 추적과
     되짚기가 안 깨집니다. 펼치기를 누르면 즉시 원래대로 돌아옵니다.
   ────────────────────────────────────────────────────────── */
import { S, esc, A } from "./00-core.js";

/* ── 바코드로 묶어 수량만 더한다 ───────────────────────────── */
function mergeLines(list){
  const m = new Map();
  list.forEach(o => (o.lines || []).forEach(l => {
    const cur = m.get(l.b);
    if (cur){ cur.q += (l.q || 0); if (!cur._nos.includes(o.no)) cur._nos.push(o.no); }
    else m.set(l.b, { ...l, q: l.q || 0, _nos: [o.no] });
  }));
  return [...m.values()];
}
/* 합친 줄들의 금액 — 18-inbox 의 sums 와 같은 셈법 */
function mergeSums(lines){
  let cons = 0, e = 0, t = 0, eN = 0, tN = 0;
  lines.forEach(l => {
    const q = l.q || 0, p = A.priceOf(l.b);
    cons += A.won(l.p) * q;
    if (p && p.e != null){ e += p.e * q; eN++; }
    if (p && p.t != null){ t += p.t * q; tN++; }
  });
  return { cons, e, t, eN, tN, all: lines.length };
}
const hasP = lines => !!(A.PRICE && lines.some(l => { const p = A.priceOf(l.b); return p && (p.e != null || p.t != null); }));

/* ── 합본 카드 ─────────────────────────────────────────────── */
function mergedCard(list, role){
  const lines = mergeLines(list);
  const nos   = list.map(o => o.no);
  const ready = list.every(o => o.dl);        /* 전부 엑셀을 받았을 때만 넘길 수 있습니다 */
  const got   = list.filter(o => o.dl).length;
  const st    = list[0].status;
  const total = lines.reduce((s,l) => s + l.q, 0);
  const price = role !== 0 && hasP(lines);
  const m     = mergeSums(lines);
  const part  = n => n < m.all ? `<i class="pnote">${m.all - n}종 값 없음</i>` : "";
  const split = lines.filter(l => l._nos.length > 1).length;   /* 여러 주문에 걸친 상품 수 */

  return `
  <article class="order mA merged">
    <div class="order-top">
      <div>
        <h3><span class="mchip mg">합본</span>매대 ${list.length}건을 하나로</h3>
        <p class="meta">주문번호 ${nos.length}개 · 아래 표는 <b>상품별로 더한 수량</b>입니다</p>
      </div>
      <span class="badges">
        <span class="badge dl ${ready ? "yes" : "no"}">${ready ? "전부 확인함" : `${got}/${list.length} 확인함`}</span>
        <span class="badge ${A.STATUS[st].cls}">${A.STATUS[st].label}</span>
      </span>
    </div>
    <p class="mgnos"><span class="eyebrow">합친 주문</span>${nos.map(n=>`<code>${esc(n)}</code>`).join("")}</p>
    ${A.flowHtml(st)}
    <div class="xlwrap"><table class="xltab">
      <thead><tr><th>25자</th><th>영문 코드10자이내</th><th>바코드</th><th>이미지</th><th>상품명</th><th>기종</th><th>디자인</th><th>발주수량<br><i>합계</i></th><th>주문 수</th>${
        price ? `<th class="pth">전자랜드<br>입고가</th><th class="pth">트라이코지<br>입고가</th>` : ""}</tr></thead>
      <tbody>${lines.map(l=>`<tr${l._nos.length>1 ? ' class="mgrow"' : ""}>
        <td class="c25">${esc(l.s || "")}</td>
        <td class="ccode">${esc(l.c || "")}</td>
        <td class="cbar">${l.b}</td>
        <td class="cimg">${l.img ? `<img src="${l.img}" alt="">` : ""}</td>
        <td class="cname">${esc(l.n || "")}</td>
        <td class="cmod">${esc(l.m || "")}</td>
        <td class="cdes">${esc(l.d || "")}</td>
        <td class="cqty">${l.q}</td>
        <td class="cmgn">${l._nos.length > 1 ? `<b>${l._nos.length}건</b>` : "1건"}</td>${
        price ? (()=>{ const p = A.priceOf(l.b) || {};
          return `<td class="cp">${p.e != null ? A.money(p.e) : "<i>—</i>"}</td>`
               + `<td class="cp">${p.t != null ? A.money(p.t) : "<i>—</i>"}</td>`; })() : ""}</tr>`).join("")}</tbody>
    </table></div>
    ${price ? `<div class="mny">
      <span class="eyebrow">금액</span>
      <div class="mny-g">
        <b><em>소비자가</em>${A.money(m.cons)}</b>
        ${m.eN ? `<b class="me"><em>전자랜드 입고가</em>${A.money(m.e)}${part(m.eN)}</b>` : ""}
        ${m.tN ? `<b class="mt"><em>트라이코지 입고가</em>${A.money(m.t)}${part(m.tN)}</b>` : ""}
        ${m.eN && m.tN ? `<b class="mg"><em>더다움 남는 것</em>${A.money(m.e - m.t)}</b>` : ""}
      </div></div>` : ""}
    <p class="xlnote">${lines.length} 품목 · 합계 <b>${total}</b> 개${
      split ? ` · <b class="hi">${split}종</b>이 여러 주문에 걸쳐 있어 합쳐졌습니다` : ""} · 소비자가 ${A.money(m.cons)}</p>
    ${role === 1 && st === 0 ? `<div class="btns">
      <button class="act form sm" data-mgdl="${nos.join(",")}" type="button">① 엑셀 합본 받기<em>매대 파일 1개${ready ? " · 받음 ✓" : ""}</em></button>
      <button class="act sm" data-mgok="${nos.join(",")}" type="button"${ready ? "" : " disabled"}>② 확인하고 트라이코지로 넘기기<em>${ready ? `${list.length}건 한 번에 넘김` : "먼저 ① 엑셀을 받으세요"}</em></button>
    </div>` : ""}
  </article>`;
}

/* ── 켜고 끄기 ─────────────────────────────────────────────── */
function mergeToggle(role){
  if (role !== 1) return "";
  return `<button type="button" class="mgtog${S.MERGE ? " on" : ""}" id="mgTog${role}"
    title="매대 주문 여러 건을 상품별로 더해 한 블럭으로 봅니다">${S.MERGE ? "펼쳐 보기" : "합쳐 보기"}</button>`;
}
function bindMergeToggle(role){
  const b = document.getElementById("mgTog" + role);
  if (b) b.onclick = ()=>{ S.MERGE = !S.MERGE; A.renderInbox(1); };
}

/* ── 합본 카드 버튼 (화면 어디에 있든 한 곳에서 받습니다) ──── */
const ordersOf = s => String(s || "").split(",").map(n => A.ORDERS.find(o => o.no === n)).filter(Boolean);
/* 대시보드 3칸 — 누르면 그 구획만, 한 번 더 누르면 전부 */
document.addEventListener("click", e => {
  const s = e.target.closest("[data-dsec]");
  if (s){ const i = +s.dataset.dsec; S.DSEC = (S.DSEC === i) ? null : i; A.renderInbox(1); return; }
  const d = e.target.closest("[data-mgdl]");
  if (d){ A.dlBulkForm(ordersOf(d.dataset.mgdl), d); return; }
  const k = e.target.closest("[data-mgok]");
  if (k && !k.disabled) A.askHandOver(ordersOf(k.dataset.mgok));
});


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { bindMergeToggle, mergeLines, mergeToggle, mergedCard });
