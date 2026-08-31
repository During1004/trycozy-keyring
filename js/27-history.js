/* ──────────────────────────────────────────────────────────
   27-history.js
   더다움 · 주문 내역 (2026-08-24 더다움 요청)

   ★ 왜 따로 만들었나
     `처리할 것` 화면은 오늘 할 일을 보는 곳입니다. 지난 주문이 거기 쌓이면
     오늘 뭘 해야 하는지 안 보입니다. 그래서 **찾아보는 화면을 따로** 뒀습니다.
   ★ 카드 모양은 `18-inbox.js` 의 orderCard 를 그대로 씁니다 — 두 벌이 되면
     한쪽만 고쳐져 어긋납니다.
   ⚠ 18-inbox / 24-bulk 가 등록된 뒤에 실행돼야 합니다 (main.js 순서).

   보관 규칙 (05-5 문서)
     · 받는 분 정보 : 출고 후 30일이면 사라집니다
     · 주문 자체    : 출고 후 90일이면 사라집니다 (월별집계만 남음)
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";

const F = { q: "", qRaw: "", st: "all", days: "all" };
const norm = s => String(s || "").toLowerCase().replace(/[\s_·\-]/g, "");

/* 주문번호 앞 8자리(YYYYMMDD)가 가장 믿을 만한 날짜입니다.
   `_iso` 는 저장소에서 온 건에만 있고, 로컬 주문에는 없습니다. */
function ymdOf(o){
  const m = String(o.no || "").match(/^(\d{4})(\d{2})(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  if (o._iso) return new Date(o._iso);
  return null;
}
function daysAgo(o){
  const d = ymdOf(o);
  if (!d) return 0;
  return Math.floor((Date.now() - d.getTime()) / 86400000);
}
function hit(o){
  if (F.st !== "all" && String(o.status) !== F.st) return false;
  if (F.days !== "all" && daysAgo(o) > +F.days) return false;
  if (!F.q) return true;
  const bag = norm(o.no) + norm(o.mode) + norm(o.to && o.to.name) + norm(o.to && o.to.tel)
            + o.lines.map(l => norm(l.b) + norm(l.c) + norm(l.n) + norm(l.d) + norm(l.s)).join("");
  return bag.includes(F.q);
}

const ST = ["접수 대기", "접수 완료", "승인 완료", "출고 완료"];
const sorted = () => A.ORDERS.slice().sort((a, b) => String(b.no).localeCompare(String(a.no)));

/* ★ 조건칸은 한 번만 그립니다.
   글자를 칠 때마다 통째로 다시 그리면 커서가 튀고 한글 입력이 끊깁니다.
   바뀌는 것은 아래 목록(#histList)과 개수(#histCount) 둘뿐입니다. */
function shell(){
  return `
  <div class="hist-top">
    <div class="hist-find">
      <input id="hq" type="search" value="${esc(F.qRaw)}" autocomplete="off"
             placeholder="주문번호 · 받는 분 · 상품명 · 바코드로 찾기">
    </div>
    <div class="hist-sel">
      <select id="hst" aria-label="상태">
        <option value="all">상태 전체</option>
        ${ST.map((s, i) => `<option value="${i}"${F.st === String(i) ? " selected" : ""}>${s}</option>`).join("")}
      </select>
      <select id="hdays" aria-label="기간">
        <option value="all"${F.days === "all" ? " selected" : ""}>기간 전체</option>
        <option value="0"${F.days === "0" ? " selected" : ""}>오늘</option>
        <option value="7"${F.days === "7" ? " selected" : ""}>최근 7일</option>
        <option value="30"${F.days === "30" ? " selected" : ""}>최근 30일</option>
        <option value="90"${F.days === "90" ? " selected" : ""}>최근 90일</option>
      </select>
      <button type="button" class="hist-clear" id="hclr">조건 지우기</button>
    </div>
    <p class="hist-count" id="histCount"></p>
  </div>
  <p class="hist-keep">받는 분 정보는 <b>출고 30일</b>, 주문 자체는 <b>출고 90일</b>이면 자동으로 지워집니다.
     남겨야 할 자료는 그 전에 <b>엑셀로 받아 두세요</b>.</p>
  <div id="histList"></div>`;
}

/* 목록만 다시 그립니다 */
function paint(){
  const all = sorted(), list = all.filter(hit);
  const c = $("histCount");
  if (c) c.innerHTML = `<b>${list.length}</b>건 보임 · 전체 ${all.length}건`;
  const box = $("histList");
  if (box) box.innerHTML = list.length
    /* ★ 묶음(o.mg)은 주문내역에서도 한 블럭으로 — 3개월 기록을 되짚을 때 합친 그대로 보입니다 */
    ? A.groupByMg(list).map(g => g.length > 1 ? A.mergedCard(g, 1) : A.orderCard(g[0], 1)).join("")
    : `<p class="empty">${all.length ? "조건에 맞는 주문이 없습니다.<br>위 조건을 지우고 다시 보세요."
                                     : "아직 주문이 없습니다."}</p>`;
  const on = !!(F.qRaw || F.st !== "all" || F.days !== "all");
  const clr = $("hclr");
  if (clr) clr.hidden = !on;
  A.bindBulkBar && A.bindBulkBar(1, list);   /* 카드 안 버튼은 18-inbox 의 위임 처리에 걸립니다 */
}

/* 탭의 숫자만 갱신 — 어느 탭을 보고 있든 맞아야 합니다 */
function syncTabs(){
  const tab = $("subHist");
  if (tab) tab.innerHTML = `주문 내역<b>${A.ORDERS.length}</b>`;
  const work = $("subWork");
  if (work) work.innerHTML = `처리할 것<b>${A.ORDERS.filter(o => o.status === 0).length}</b>`;
}

function renderHistory(){
  const box = $("v1b");
  if (!box) return;
  syncTabs();
  /* 조건칸이 아직 없을 때만 새로 그립니다 (입력 중이면 건드리지 않습니다) */
  if (!$("hq")){ box.innerHTML = shell(); bind(); }
  paint();
}

function bind(){
  const q = $("hq");
  if (q) q.oninput = () => { F.qRaw = q.value; F.q = norm(q.value); paint(); };
  if ($("hst"))   $("hst").onchange   = e => { F.st = e.target.value; paint(); };
  if ($("hdays")) $("hdays").onchange = e => { F.days = e.target.value; paint(); };
  if ($("hclr"))  $("hclr").onclick   = () => {
    F.q = ""; F.qRaw = ""; F.st = "all"; F.days = "all";
    if ($("hq")) $("hq").value = "";
    if ($("hst")) $("hst").value = "all";
    if ($("hdays")) $("hdays").value = "all";
    paint();
  };
}

/* ── 더다움 화면 안 탭 전환 ──────────────────────────────── */
function setSub1(v){
  S.SUB1 = (v === "hist") ? "hist" : "work";
  $("v1").hidden  = (S.SUB1 !== "work");
  $("v1b").hidden = (S.SUB1 !== "hist");
  document.querySelectorAll("#subtabs1 button").forEach(b =>
    b.setAttribute("aria-pressed", String(b.dataset.sub1 === S.SUB1)));
  syncTabs();
  if (S.SUB1 === "hist") renderHistory(); else A.renderInbox(1);
  window.scrollTo({ top: 0 });
}
document.querySelectorAll("#subtabs1 button").forEach(b => b.onclick = () => setSub1(b.dataset.sub1));


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { renderHistory, setSub1, syncHistTabs: syncTabs });
