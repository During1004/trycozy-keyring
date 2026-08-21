/* ──────────────────────────────────────────────────────────
   04-grid.js
   상품 목록 그리기 — 카드·상품군 머리·담은 것 재정렬
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";
/* ── 카드 렌더 ─────────────────────────────────────────────── */
function cardHtml(it, i, p){
  return `
  <div class="cap" data-i="${i}" data-g="${esc(it.g)}">
    <div class="cap-face">
      ${A.IMG[i] ? `<img src="${A.IMG[i]}" alt="${esc(it.d)}" loading="lazy">` : ""}
      ${it.w ? `<span class="nodb">기종 확인</span>` : ""}
      <span class="legend" data-legend>0</span>
    </div>
    <div class="cap-body">
      <div class="cap-name">${esc(it.d)}</div>
      <div class="cap-sub">${esc(it.g)}</div>
      <div class="cap-meta"><span class="cap-code">${it.b}</span>${it.p ? `<b class="cap-price">${esc(it.p)}</b>` : ""}</div>
      <div class="step">
        <button type="button" class="minus" data-d="-1" data-i="${i}" data-p="${p}" aria-label="${esc(it.d)} 빼기" disabled>−</button>
        <input class="q z" type="number" min="0" inputmode="numeric" value="0" data-i="${i}" data-p="${p}" aria-label="${esc(it.d)} 수량">
        <button type="button" class="plus" data-d="1" data-i="${i}" data-p="${p}" aria-label="${esc(it.d)} 더하기">+</button>
      </div>
    </div>
  </div>`;
}
/* ── 표시 순서 · 상품군 묶음 ─────────────────────────────────
   순서는 데이터(DB 표시순서 열)가 정한다. it.o 가 없으면 등록 순서.
   나중에 DB 에서 순서만 바꾸면 화면이 그대로 따라간다. */
function sortedIdx(){
  const idx = A.ITEMS.map((_,i)=>i);
  const key = A.SETTINGS.sort;
  if (key === "name") idx.sort((x,y)=> (A.ITEMS[x].g+A.ITEMS[x].d).localeCompare(A.ITEMS[y].g+A.ITEMS[y].d, "ko"));
  else if (key === "code") idx.sort((x,y)=> A.ITEMS[x].b.localeCompare(A.ITEMS[y].b));
  else idx.sort((x,y)=>{                       // 표시순서(DB K열) — "AA-01" 같은 문자열
    const ox = String(A.ITEMS[x].o ?? ""), oy = String(A.ITEMS[y].o ?? "");
    return ox.localeCompare(oy) || (x - y);
  });
  return idx;
}
/* 상품군이 바뀌는 자리마다 머리를 끼워 넣는다 (전체 보기에서 시리즈가 뭉쳐 보이도록) */
function gridHtml(p){
  const out = [];
  let cur = null;
  for (const i of sortedIdx()){
    const it = A.ITEMS[i];
    if (it.g !== cur){
      cur = it.g;
      const n = A.ITEMS.filter(x=>x.g===cur).length;
      out.push(`<h3 class="grp" data-grp="${esc(cur)}"><b>${esc(cur)}</b><span>${n}종</span></h3>`);
    }
    out.push(cardHtml(it, i, p));
  }
  return out.join("");
}
/* 정렬된 원래 순서를 기억해 뒀다가, 담은 것 보기에서 벗어나면 그대로 되돌린다 */
const CANON = { A: [], B: [] };
function snapshotOrder(){
  ["A","B"].forEach(p=> CANON[p] = [...$(p==="A"?"gridA":"gridB").children]);
}
/* 담은 것 보기 = 최근에 찍은 상품이 맨 위. 새로 찍으면 기존 것들이 아래로 밀린다. */
function orderGrid(p){
  const g = $(p === "A" ? "gridA" : "gridB");
  const frag = document.createDocumentFragment();
  if (S.FILTER === "__picked"){
    A.pickedOf(p).forEach(i=>{
      const c = g.querySelector(`.cap[data-i="${i}"]`);
      if (c) frag.appendChild(c);            // 최신부터 차례로
    });
  }
  CANON[p].forEach(n=>{ if (n.parentNode === g) frag.appendChild(n); });
  g.appendChild(frag);
}
function renderGrids(){
  $("gridA").innerHTML = gridHtml("A");
  $("gridB").innerHTML = gridHtml("B");
  ["A","B"].forEach(p=>{
    const g = $(p==="A"?"gridA":"gridB");
    Object.entries(A.QTY[p]).forEach(([i,v])=>{ if (v>0) paintQty(g, +i, v); });
  });
  snapshotOrder();
}
/* 카드 표시만 갱신 (수량 상태는 QTY 가 진실) */
function paintQty(grid, i, v){
  const c = grid.querySelector(`.cap[data-i="${i}"]`);
  if (!c) return;
  c.classList.toggle("on", v > 0);
  c.querySelector("[data-legend]").textContent = v;
  const inp = c.querySelector("input.q");
  if (document.activeElement !== inp) inp.value = v;
  inp.classList.toggle("z", v === 0);
  c.querySelector(".minus").disabled = v === 0;
}
renderGrids();


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { orderGrid, paintQty, renderGrids });
