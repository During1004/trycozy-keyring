/* ──────────────────────────────────────────────────────────
   28-merge.js
   더다움 — 묶음(합치기) · 단계 이동 · 대시보드 클릭
   (2026-08-24 사용자 지시)

   ★ 묶음은 **저장소에 남습니다** (`주문.묶음`).
     화면용 토글이 아니라, 접수 전 → 넘길 것 → 넘김 → 주문내역까지
     합쳐진 채로 따라갑니다. 3개월 기록을 되짚을 때 그대로 보입니다.

   ★ 단계
       ① 접수 전  [⊕ 합치기] [✓ 접수]
       ② 넘길 것 [① 엑셀 다운로드] [② 트라이코지로 넘기기] [↩ 접수 전으로]
       ③ 발송    (손댈 것 없음)
     `자료받음(dl)` = 접수했다 · `엑셀받음(xl)` = 엑셀을 받았다. 둘은 별개입니다.
   ────────────────────────────────────────────────────────── */
import { S, esc, A } from "./00-core.js";

/* ── 묶음끼리 모으기 — 순서는 원래 목록 순서를 지킵니다 ────── */
function groupByMg(list){
  const out = [], seen = new Map();
  list.forEach(o => {
    if (!o.mg){ out.push([o]); return; }
    const g = seen.get(o.mg);
    if (g) g.push(o);
    else { const a = [o]; seen.set(o.mg, a); out.push(a); }
  });
  return out;
}
/* ── 바코드로 묶어 수량 더하기 ─────────────────────────────── */
function mergeLines(list){
  const m = new Map();
  list.forEach(o => (o.lines || []).forEach(l => {
    const cur = m.get(l.b);
    if (cur){ cur.q += (l.q || 0); if (!cur._nos.includes(o.no)) cur._nos.push(o.no); }
    else m.set(l.b, { ...l, q: l.q || 0, _nos: [o.no] });
  }));
  return [...m.values()];
}
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

/* ── 묶음 블럭 ─────────────────────────────────────────────── */
function mergedCard(list, role){
  const lines = mergeLines(list);
  const nos   = list.map(o => o.no);
  const st    = list[0].status;
  const dl    = list.every(o => o.dl);
  const xl    = list.every(o => o.xl);
  const total = lines.reduce((s,l) => s + l.q, 0);
  const price = role !== 0 && hasP(lines);
  const m     = mergeSums(lines);
  const part  = n => n < m.all ? `<i class="pnote">${m.all - n}종 값 없음</i>` : "";
  const split = lines.filter(l => l._nos.length > 1).length;
  const allSel = list.every(o => S.SEL.has(o.no));
  const stage = st >= 1 ? "s3" : dl ? "s2" : "s1";

  return `
  <article class="order mA merged ${stage}${st === 3 ? " shipped" : ""}">
    <div class="order-top">
      <div>
        <h3><span class="mchip mg">묶음</span>매대 ${list.length}건이 한 묶음</h3>
        <p class="meta">아래 표는 <b>상품별로 더한 수량</b>입니다 · 주문번호 ${nos.length}개는 그대로 살아 있습니다</p>
      </div>
      <span class="badges">
        ${st === 0 ? `<span class="badge dl ${dl ? "yes" : "no"}">${dl ? "접수함" : "접수 전"}</span>` : ""}
        ${st === 0 && dl && xl ? `<span class="badge xl">엑셀 받음</span>` : ""}
        ${st === 0 ? "" : `<span class="badge ${A.STATUS[st].cls}">${A.STATUS[st].label}</span>`}
        ${A.canPick(list[0], role) ? `<label class="selbox"><input type="checkbox" data-mgsel="${nos.join(",")}"${allSel ? " checked" : ""}></label>` : ""}
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
      split ? ` · <b class="hi">${split}종</b>이 여러 주문에 걸쳐 합쳐졌습니다` : ""} · 소비자가 ${A.money(m.cons)}</p>
    ${role === 1 && st === 0 && !dl ? `<div class="btns">
      <button class="act s1 sm" data-mgconf="${nos.join(",")}" type="button">✓ 묶음 ${list.length}건 <span class="kw">접수</span></button>
      <button class="act mgc sm line" data-mgun2="${nos.join(",")}" type="button">묶음 풀기</button>
    </div>` : ""}
    ${role === 1 && st === 0 && dl ? `<div class="btns">
      <button class="act xlc sm${xl ? " line" : ""}" data-mgdl="${nos.join(",")}" type="button">${xl ? "✓ 엑셀 다시 받기" : "① 엑셀 다운로드"}</button>
      <button class="act s2 sm" data-mgok="${nos.join(",")}" type="button">② 묶음 ${list.length}건 넘기기</button>
    </div>
    <div class="btns">
      <button class="act ghost sm back" data-mgun="${nos.join(",")}" type="button">↩ 접수 전으로 되돌리기</button>
      <button class="act mgc sm line" data-mgun2="${nos.join(",")}" type="button">묶음 풀기</button>
    </div>` : ""}
  </article>`;
}

/* ══════════════════════════════════════════════════════════════
   단계 옮기기
   ══════════════════════════════════════════════════════════════ */
const ordersOf = s => String(s || "").split(",").map(n => A.ORDERS.find(o => o.no === n)).filter(Boolean);
const redraw = () => { A.renderInbox(1); A.renderInbox(2); A.renderMine?.(); A.renderHistory?.(); };

/* ⊕ 합치기 — 고른 매대 주문에 같은 묶음 이름을 붙입니다 */
function askMerge(list){
  const able = list.filter(o => !o.to && o.status === 0 && !o.dl);
  if (able.length < 2) return;
  const name = "M-" + able.map(o => o.no).sort()[0];
  A.openSheet(`<b class="big">⊕ 합치기</b>
    <p class="sum">매대 <b>${able.length}</b> 건을 <b>한 묶음</b>으로 만듭니다. 같은 상품은 수량이 더해져 보입니다.</p>
    ${A.listHtml(able)}
    <p class="ask">묶은 뒤에도 <b>주문번호는 그대로 살아 있고</b>, <b>묶음 풀기</b>로 언제든 되돌립니다.<br>
       ③ 넘김 · 주문내역에도 묶인 채로 남습니다. 합칠까요?</p>`,
    () => {
      able.forEach(o => { o.mg = name; A.store?.onPatch(o, { mg:name }); });   /* [저장소 고리] */
      S.SEL.clear(); redraw();
    }, "", `${able.length}건 합치기`);
}
/* 묶음 풀기 */
function askUnmerge(list){
  const able = list.filter(o => o.mg);
  if (!able.length) return;
  A.openSheet(`<b class="big">묶음 풀기</b>
    <p class="sum"><b>${able.length}</b> 건을 낱개로 되돌립니다.</p>
    ${A.listHtml(able)}
    <p class="ask">주문 내용·수량·단계는 그대로입니다. 화면에서만 낱개로 갈라집니다. 풀까요?</p>`,
    () => {
      able.forEach(o => { o.mg = null; A.store?.onPatch(o, { mg:null }); });   /* [저장소 고리] */
      S.SEL.clear(); redraw();
    }, "", "묶음 풀기");
}
/* ✓ 접수 — ① 접수 전 → ② 넘길 것 */
function askConfirm(list){
  const able = list.filter(o => o.status === 0 && !o.dl);
  if (!able.length) return;
  A.openSheet(`<b class="big">✓ 접수</b>
    <p class="sum"><b>${able.length}</b> 건을 <b>② 넘길 것</b> 으로 보냅니다.</p>
    ${A.listHtml(able)}
    <p class="ask"><b>② 넘길 것</b> 에서 <b>엑셀을 받고 트라이코지로 넘기게</b> 됩니다.<br>
       잘못 눌러도 <b>↩ 접수 전으로 되돌리기</b> 가 있습니다. 보낼까요?</p>`,
    () => {
      able.forEach(o => { o.dl = true; A.store?.onPatch(o, { dl:true }); });   /* [저장소 고리] */
      S.SEL.clear(); redraw();
      /* ★ 2026-08-31 — 화면은 옮기지 않습니다. 자료가 많을 때 카드로 스크롤해 버리면
         위에서부터 훑던 자리를 잃습니다. 어디로 갔는지만 아래에 한 줄 띄웁니다. */
      notice(`✓ ${able.length}건 접수 — ② 넘길 것 으로 옮겼습니다`);
    }, "ac", `${able.length}건 접수`);
}
/* ↩ 접수 전으로 되돌리기 — 접수·엑셀 표시만 지웁니다 */
function askUnconfirm(list){
  const able = list.filter(o => o.status === 0 && o.dl);
  if (!able.length) return;
  A.openSheet(`<b class="big">↩ 접수 전으로 되돌리기</b>
    <p class="sum"><b>${able.length}</b> 건을 <b>① 접수 전</b> 으로 내립니다.</p>
    ${A.listHtml(able)}
    <p class="ask">접수·엑셀 표시가 지워집니다. 다시 묶어서 처리하면 됩니다.<br>
       <b>주문 내용·수량·주문번호·묶음은 그대로입니다.</b> 되돌릴까요?</p>`,
    () => {
      able.forEach(o => { o.dl = false; o.xl = false; A.store?.onPatch(o, { dl:false, xl:false }); });   /* [저장소 고리] */
      S.SEL.clear(); redraw();
    }, "", "되돌리기");
}

/* ── 화면 어디에 있든 한 곳에서 받습니다 ───────────────────── */
document.addEventListener("click", e => {
  const t = (a) => e.target.closest("[data-" + a + "]");
  let x;
  if ((x = t("dsec"))){ const i = +x.dataset.dsec; S.DSEC = (S.DSEC === i) ? null : i; A.renderInbox(1); return; }
  if ((x = t("mgdl"))){  A.dlBulkForm(ordersOf(x.dataset.mgdl), x); return; }
  if ((x = t("mgok")) && !x.disabled){ A.askHandOver(ordersOf(x.dataset.mgok)); return; }
  if ((x = t("mgconf"))){ askConfirm(ordersOf(x.dataset.mgconf)); return; }
  if ((x = t("mgun"))){   askUnconfirm(ordersOf(x.dataset.mgun)); return; }
  if ((x = t("mgun2"))){  askUnmerge(ordersOf(x.dataset.mgun2)); return; }
  if ((x = t("conf"))){   askConfirm(ordersOf(x.dataset.conf)); return; }
  if ((x = t("unconf"))){ askUnconfirm(ordersOf(x.dataset.unconf)); }
});
/* 묶음 블럭의 체크칸 — 안에 든 것 전부를 같이 켜고 끕니다 */
document.addEventListener("change", e => {
  const c = e.target.closest("[data-mgsel]");
  if (!c) return;
  ordersOf(c.dataset.mgsel).forEach(o => c.checked ? S.SEL.add(o.no) : S.SEL.delete(o.no));
  redraw();
});


/* ══════════════════════════════════════════════════════════════
   알림 한 줄 (2026-08-31) — 화면을 옮기지 않고 결과만 알립니다.
   ⚠ 스크롤로 카드를 따라가게 하면 자료가 많을 때 보던 자리를 잃습니다.
      그래서 아래쪽에 2.6초 떴다 사라지는 줄 하나만 씁니다.
   ══════════════════════════════════════════════════════════════ */
let noticeT = 0;
function notice(msg){
  let el = document.getElementById("notice");
  if (!el){
    el = document.createElement("div");
    el.id = "notice"; el.className = "notice"; el.setAttribute("role", "status");
    document.body.appendChild(el);
  }
  el.textContent = msg;
  el.classList.remove("on"); void el.offsetWidth;   /* 연달아 눌러도 처음부터 다시 */
  el.classList.add("on");
  clearTimeout(noticeT);
  noticeT = setTimeout(() => el.classList.remove("on"), 2600);
}

/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { askConfirm, askMerge, askUnconfirm, askUnmerge, groupByMg, mergeLines, mergedCard, notice });
