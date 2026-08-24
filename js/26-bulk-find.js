/* ──────────────────────────────────────────────────────────
   26-bulk-find.js
   OR 일괄검색 — 바코드·상품코드를 여러 개 붙여넣어 그것만 보기
   (2026-08-24 전자랜드 요청. 거래처 발주 시스템의 "OR일괄검색" 과 같은 것)

   ★ 어떤 형태로 붙여넣어도 됩니다
       줄바꿈 / 쉼표 / 쉼표+공백 / 탭 / 띄어쓰기 — 전부 구분자로 봅니다.
       숫자·영문이 아닌 글자는 모두 구분자로 취급하므로
       엑셀 열을 그대로 복사해 붙여도 됩니다.
   ★ 바코드(13자리)와 상품코드(TRYKYE001) 둘 다 찾습니다.
   ★ 못 찾은 것은 목록으로 보여줍니다 — 조용히 빠뜨리지 않습니다.
   ⚠ 05-filter.js 뒤에 실행돼야 합니다 (칩 클릭 동작을 덮어씁니다).
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";

/* 바코드·상품코드 → 목록 번호. 대문자로 맞춰 둡니다 */
const KEY = new Map();
A.ITEMS.forEach((it,i)=>{
  if (it.b) KEY.set(String(it.b).toUpperCase(), i);
  if (it.c) KEY.set(String(it.c).toUpperCase(), i);
});

/* 붙여넣은 덩어리에서 코드만 뽑아냅니다 (순서 유지 · 중복 제거) */
function tokens(txt){
  const out = [], seen = new Set();
  String(txt || "").toUpperCase().split(/[^0-9A-Z]+/).forEach(t=>{
    if (!t || seen.has(t)) return;
    seen.add(t); out.push(t);
  });
  return out;
}

function chip(){
  const c = $("bulkChip");
  if (!c) return;
  const n = S.BULK ? S.BULK.size : 0;
  c.hidden = !n;
  const b = c.querySelector("[data-bulkn]");
  if (b) b.textContent = n;
  c.setAttribute("aria-pressed", String(S.FILTER === "__bulk"));
}

function clearBulk(){
  S.BULK = null;
  chip();
  A.setFilter("");
}

/* ── 붙여넣기 창 ───────────────────────────────────────────── */
function openBulk(){
  A.openSheet(`
    <b class="big">바코드 여러 개로 찾기</b>
    <p class="sum">엑셀·메모에서 <b>복사해 붙여넣기</b> 하세요. 넣은 것만 목록에 남습니다.</p>
    <textarea id="bulkTa" class="bulkta" rows="7" spellcheck="false"
      placeholder="8809710471634&#10;8809710471641&#10;8809710471658"></textarea>
    <details class="bulkhelp">
      <summary>어떤 형태로 넣어도 됩니다 — 예시 보기</summary>
      <div>
        <p>아래 넷은 <b>전부 같게 동작</b>합니다. 형태를 맞출 필요가 없습니다.</p>
        <pre>8809710471634
8809710471641</pre>
        <pre>8809710471634,8809710471641,</pre>
        <pre>8809710471634, 8809710471641,</pre>
        <pre>8809710471634  8809710471641</pre>
        <p><b>상품코드도 됩니다.</b> <code>TRYKYE001</code> 처럼 섞어 넣어도 찾습니다.</p>
        <p>엑셀에서 바코드 열을 통째로 긁어 붙여넣어도 됩니다.
           숫자·영문이 아닌 글자는 알아서 걸러냅니다.</p>
        <p><b>목록에 없는 코드</b>는 지우지 않고 따로 보여드립니다.</p>
      </div>
    </details>`,
    ()=>{
      const raw = ($("bulkTa") && $("bulkTa").value) || "";
      const list = tokens(raw);
      if (!list.length) return;
      const hit = new Set(), miss = [];
      list.forEach(t=>{
        const i = KEY.get(t);
        if (i === undefined) miss.push(t); else hit.add(i);
      });
      S.BULK = hit;
      A.setFilter("__bulk");
      chip();
      /* 결과 알림 — 못 찾은 게 있으면 반드시 보여줍니다 */
      setTimeout(()=> report(list.length, hit.size, miss), 40);
    },
    "", "이것만 보기");
  setTimeout(()=>{ const t = $("bulkTa"); if (t) t.focus(); }, 30);
}

function report(total, found, miss){
  if (!miss.length){
    if (found) return;                       // 전부 찾았으면 조용히 넘어갑니다
    return A.openSheet(
      `<b class="big">하나도 못 찾았습니다</b>
       <p class="sum">넣으신 ${total}개 모두 목록에 없는 코드입니다.<br>
       바코드나 상품코드가 맞는지 확인해 주세요.</p>`,
      ()=>{}, "ghost", "닫기");
  }
  A.openSheet(
    `<b class="big">${found}종 찾음 · ${miss.length}개 못 찾음</b>
     <p class="sum">넣으신 ${total}개 중 <b>${found}종</b>을 목록에 남겼습니다.<br>
     아래는 목록에 없는 코드입니다. 오타이거나 아직 등록되지 않은 상품입니다.</p>
     <pre class="bulkmiss">${esc(miss.join("\n"))}</pre>`,
    ()=>{}, "ghost", "닫기");
}

if ($("bulkBtn")) $("bulkBtn").onclick = openBulk;
/* 칩 — 누르면 그것만 보기 / 이미 보고 있으면 지우기 (05-filter 의 기본 동작을 덮습니다) */
if ($("bulkChip")) $("bulkChip").onclick = ()=>{
  if (S.FILTER === "__bulk") clearBulk();
  else if (S.BULK && S.BULK.size) A.setFilter("__bulk");
  else openBulk();
};
/* 다른 칩·시리즈를 고르면 칩의 눌림 표시만 풀어 줍니다 (결과는 남겨 둡니다).
   ⚠ 05-filter.js 는 자기 안의 setFilter 를 직접 부르므로 A.setFilter 를 감싸도 안 걸립니다.
      그래서 줄 전체의 클릭·선택을 듣고 한 박자 뒤에 칩만 다시 그립니다. */
const _row = document.querySelector(".findrow");
if (_row) _row.addEventListener("click", ()=> setTimeout(chip, 0));
if ($("serSel")) $("serSel").addEventListener("change", ()=> setTimeout(chip, 0));

chip();


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { openBulk, clearBulk, bulkTokens: tokens });
