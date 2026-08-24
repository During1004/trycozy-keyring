/* ──────────────────────────────────────────────────────────
   05-filter.js
   찾기 · 시리즈 선택 · 담은 것 보기
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";
/* ── 찾기 · 시리즈 선택 ─────────────────────────────────────
   칩을 옆으로 늘어놓으면 시리즈가 늘어날수록 폰은 가로 스크롤이,
   PC 는 세로 줄 수가 계속 늘어난다. 그래서
     · 시리즈 = 드롭다운 (아무리 늘어도 한 칸)
     · 이름·바코드 = 검색창 (종류가 몇백 개가 돼도 세 글자면 찾음)
   두 가지로 바꾸고, 칩은 상태를 보여주는 "전체 / 담은 것" 둘만 남겼다. */
const SERIES = [...new Set(A.ITEMS.map(it=>it.g))];
$("serSel").innerHTML = `<option value="">시리즈 전체 (${SERIES.length}종류)</option>` +
  SERIES.map(g=>`<option value="${esc(g)}">${esc(g)} · ${A.ITEMS.filter(i=>i.g===g).length}</option>`).join("");

/* FILTER 는 00-state.js 의 S.FILTER 로 옮겼습니다 */ // "" | "__picked" | 시리즈명
/* FIND 는 00-state.js 의 S.FIND 로 옮겼습니다 */ // 검색어
const norm = s => String(s||"").toLowerCase().replace(/[\s_·\-]/g,"");
function matchFind(it){
  if (!S.FIND) return true;
  return (norm(it.d)+norm(it.g)+norm(it.n)+norm(it.b)+norm(it.c)+norm(it.s)).includes(S.FIND);
}
function setFilter(v){
  S.FILTER = v;
  document.querySelectorAll(".findrow .chip").forEach(x=>
    x.setAttribute("aria-pressed", String(x.dataset.g === v)));
  const ser = $("serSel");
  ser.value = (v === "" || v === "__picked") ? "" : v;
  ser.classList.toggle("on", !!ser.value);
  applyFilter();
}
document.querySelectorAll(".findrow .chip").forEach(b=> b.onclick = ()=> setFilter(b.dataset.g));
$("serSel").onchange = ()=> setFilter($("serSel").value);
$("find").addEventListener("input", ()=>{
  S.FIND = norm($("find").value);
  $("findClear").hidden = !$("find").value;
  applyFilter();
});
$("findClear").onclick = ()=>{ $("find").value = ""; S.FIND = ""; $("findClear").hidden = true; applyFilter(); $("find").focus(); };
$("find").addEventListener("keydown", e=>{ if (e.key === "Escape") $("findClear").click(); });
$("findBtn").onclick = ()=>{
  const open = !document.body.classList.contains("findopen");
  document.body.classList.toggle("findopen", open);
  $("findBtn").setAttribute("aria-expanded", String(open));
  if (open) $("find").focus();
  else if (S.FIND) $("findClear").click();
};

function applyFilter(){
  A.orderGrid("A"); A.orderGrid("B");
  let n = 0;
  [["gridA","A"],["gridB","B"]].forEach(([id,pg])=>{
    const q = A.QTY[pg];
    $(id).querySelectorAll(".cap").forEach(c=>{
      const i = +c.dataset.i;
      const it = A.ITEMS[i];
      const byFilter = S.FILTER === "__picked" ? (q[i] || 0) > 0
                     : S.FILTER === "__bulk"   ? !!(S.BULK && S.BULK.has(i))
                     : (!S.FILTER || it.g === S.FILTER);
      const show = byFilter && matchFind(it);
      c.hidden = !show;
      if (pg === S.PAGE && show) n++;
    });
  });
  /* 카드가 하나도 안 남은 상품군 머리는 숨긴다 */
  ["gridA","gridB"].forEach(id=>{
    $(id).querySelectorAll(".grp").forEach(hd=>{
      let el = hd.nextElementSibling, any = false;
      while (el && !el.classList.contains("grp")){
        if (el.classList.contains("cap") && !el.hidden){ any = true; break; }
        el = el.nextElementSibling;
      }
      hd.hidden = !any || S.FILTER === "__picked" || S.FILTER === "__bulk";   // 담은 것·일괄검색은 머리 없이 목록만
    });
  });
  $("count").textContent = n + " 품목";
  const all = document.querySelector("[data-alln]");
  if (all) all.textContent = A.ITEMS.length;
  $("listTitle").textContent = (A.isShip() ? "개인 배송" : "매대 보충")
    + (S.FIND ? ` · "${$("find").value.trim()}" 검색`
      : S.FILTER === "__bulk"   ? ` · 일괄검색 ${S.BULK ? S.BULK.size : 0}종`
      : (S.FILTER && S.FILTER !== "__picked") ? ` · ${S.FILTER}` : "");
}
/* 담은 것 칩의 숫자 갱신 + 목록 즉시 반영
   ★ 숫자 칸에 타이핑 중일 때는 다시 걸러내지 않는다.
      0 을 지우는 순간 카드가 사라져 입력이 끊기기 때문. */
function syncPickChip(){
  const n = Object.values(A.QTY[S.PAGE]).filter(v=>v>0).length;
  const el = document.querySelector("[data-pickn]");
  if (el) el.textContent = n;
  if (S.FILTER === "__picked" && !(document.activeElement && document.activeElement.classList.contains("q")))
    applyFilter();
}
applyFilter();


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { applyFilter, setFilter, syncPickChip });
