/* ──────────────────────────────────────────────────────────
   11-scan.js
   바코드 스캔 — 물리 키(e.code) 기반 · 오스캔 복구
   ────────────────────────────────────────────────────────── */
import { $, S, A } from "./00-core.js";
/* ── 정렬 ── */
$("sortSel").value = A.SETTINGS.sort;
$("sortSel").onchange = ()=>{
  A.SETTINGS.sort = $("sortSel").value;
  A.saveSettings();
  A.renderGrids();
  A.applyFilter();
};

/* 스캔 방식 — 매대 보충은 "수량 입력"(종이에 적어온 수를 침), 개인 배송은 "단위만큼 +" 가 기본 */
const SCANMODE = A.SETTINGS.scanMode;
function setScanMode(m){
  SCANMODE[S.PAGE] = m;
  document.querySelectorAll("[data-sm]").forEach(b=>
    b.setAttribute("aria-pressed", String(b.dataset.sm === m)));
  $("scanNote").textContent = m === "qty"
    ? "바코드를 찍으면 그 상품의 수량 칸으로 커서가 들어갑니다. 숫자 치고 Enter 를 누르면 다시 스캔 칸으로 돌아옵니다."
    : `바코드를 찍을 때마다 그 상품 수량이 ${A.stepOf(S.PAGE)}개씩 올라갑니다.`;
  A.saveSettings();
  A.cfgSummary();
}
document.querySelectorAll("[data-sm]").forEach(b=> b.onclick = ()=> setScanMode(b.dataset.sm));

/* 스캔한 상품의 수량 칸으로 커서 이동 + 값 전체 선택(치면 덮어쓰기) */
function focusQty(i){
  const c = $(S.PAGE === "A" ? "gridA" : "gridB").querySelector(`.cap[data-i="${i}"]`);
  if (!c) return;
  const inp = c.querySelector("input.q");
  c.classList.add("typing");
  inp.focus(); inp.select();
  inp.addEventListener("blur", ()=> c.classList.remove("typing"), {once:true});
}

/* 오스캔을 되돌릴 때 쓸 "타이핑 시작 전 수량" 기억 */
document.addEventListener("focusin", e=>{
  const inp = e.target.closest && e.target.closest("input.q");
  if (inp) inp._orig = A.QTY[inp.dataset.p][+inp.dataset.i] || 0;
});
document.addEventListener("input", e=>{
  const inp = e.target.closest("input.q");
  if (!inp) return;
  /* ★ 커서가 수량 칸에 있는 채로 다음 바코드를 찍는 사고 대비.
     8자리 이상 숫자가 들어왔는데 그게 등록된 바코드면 스캔으로 처리한다. */
  const raw = String(inp.value || "").trim();
  /* ★ 커서가 수량 칸에 있는 채로 다음 바코드를 찍는 사고 대비.
     리더기는 한 글자씩 때려넣으므로 즉시 판정하면 "88097104" 같은 중간값에 걸린다.
     5자리 넘어가면 수량으로 인정하지 않고 잠깐 붙들었다가 판정한다. */
  clearTimeout(inp._misT);
  if (raw.length >= 5){
    inp._misT = setTimeout(()=>{
      const v = String(inp.value || "").trim();
      A.setQty(inp.dataset.p, +inp.dataset.i, inp._orig || 0); // 타이핑 전 수량으로 되돌림
      inp.value = inp._orig || 0;
      const j = A.ITEMS.findIndex(it => it.b === v);
      if (j >= 0){ takeScan(j); return; }
      const w = A.WAIT.find(it => it.b === v);
      $("scanNote").textContent = w ? `아직 주문할 수 없는 상품입니다 — ${w.g} · ${w.d} (전자랜드 코드 대기)`
        : /^\d{8,}$/.test(v) ? `등록되지 않은 바코드입니다 — ${v}`
        : `수량이 너무 큽니다 — ${v}`;
      inp.blur(); scanEl.focus();
    }, 180);
    return;                       // 판정 전까지 수량에 반영하지 않는다
  }
  A.setQty(inp.dataset.p, +inp.dataset.i, inp.value);
});
/* 수량 칸에서 Enter · Esc → 스캔 칸으로 복귀 (연속 작업) */
document.addEventListener("keydown", e=>{
  const inp = e.target.closest && e.target.closest("input.q");
  if (!inp) return;
  if (e.key === "Enter" || e.key === "Escape"){
    e.preventDefault();
    clearTimeout(inp._misT);
    A.setQty(inp.dataset.p, +inp.dataset.i, inp.value);
    inp.blur();
    scanEl.focus();
  }
});
document.addEventListener("blur", e=>{
  const inp = e.target.closest && e.target.closest("input.q");
  if (inp) inp.value = A.QTY[inp.dataset.p][+inp.dataset.i] || 0;
}, true);

/* ── 바코드 스캔 → 현재 페이지 수량 +1 ───────────────────────
   ★ 한/영(IME) 상태와 무관하게 동작.
   조합된 글자(e.key)가 아니라 눌린 물리 키(e.code)로 코드를 재구성한다.
   한글 상태로 스캔해도 코드가 깨지지 않는다.
   안드로이드 소프트 키보드는 e.code 가 비어 오므로(S.physKeys=false)
   입력칸 값에서 영문+숫자만 뽑아 쓴다. — 미미라인 주문앱에서 검증된 방식 */
const scanEl = $("scan");
/* scanBuf 는 00-state.js 의 S.scanBuf 로 옮겼습니다 */
function codeChar(e){
  const c = e.code || "";
  if (/^Key[A-Z]$/.test(c)) return c.slice(3);      // KeyE → E
  if (/^Digit[0-9]$/.test(c)) return c.slice(5);    // Digit5 → 5
  if (/^Numpad[0-9]$/.test(c)) return c.slice(6);   // Numpad5 → 5
  if (c === "Minus" || c === "NumpadSubtract") return "-";
  return null;                                      // 한글 자모 등은 버림
}
function syncScan(){
  if (S.physKeys){ if (scanEl.value !== S.scanBuf) scanEl.value = S.scanBuf; return; }
  S.scanBuf = (scanEl.value || "").toUpperCase().replace(/[^A-Z0-9-]/g, "");
}
scanEl.addEventListener("input", syncScan);
scanEl.addEventListener("compositionend", syncScan);
scanEl.addEventListener("paste", e=>{
  e.preventDefault();
  const t = ((e.clipboardData||window.clipboardData)||{getData:()=>""}).getData("text") || "";
  S.scanBuf = t.toUpperCase().replace(/[^A-Z0-9-]/g, "");
  scanEl.value = S.scanBuf;
});
scanEl.addEventListener("keydown", e=>{
  if (e.ctrlKey || e.altKey || e.metaKey) return;
  if (e.code === "Backspace"){ S.scanBuf = S.scanBuf.slice(0,-1); return; }
  if (!(e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter")){
    const ch = codeChar(e);
    if (ch !== null){ S.physKeys = true; S.scanBuf += ch; }
    return;
  }
  e.preventDefault();
  const v = (S.scanBuf || scanEl.value || "").trim();
  S.scanBuf = ""; S.physKeys = false;
  const i = A.ITEMS.findIndex(it => it.b === v || it.c === v.toUpperCase());
  if (i >= 0) takeScan(i);
  else {
    const w = A.WAIT.find(it => it.b === v);
    $("scanNote").textContent = w ? `아직 주문할 수 없는 상품입니다 — ${w.g} · ${w.d} (전자랜드 코드 대기)`
                                  : v ? `등록되지 않은 바코드입니다 — ${v}` : "바코드를 다시 찍어주세요";
  }
  scanEl.value = "";
  if (SCANMODE[S.PAGE] !== "qty" || i < 0) scanEl.focus();   // 수량 입력 모드면 수량 칸이 포커스를 가져감
});

/* 스캔 1건 처리 — 스캔 칸에서든, 수량 칸 오입력에서든 여기로 모인다 */
function takeScan(i){
  /* 찍은 순간 "담은 것" 목록으로 전환 — 종이 보고 찍는 흐름에서는 이 화면이 곧 주문서 */
  if (S.FIND){ $("find").value = ""; S.FIND = ""; $("findClear").hidden = true; }
  if (S.FILTER !== "__picked") A.setFilter("__picked");
  const st = SCANMODE[S.PAGE] === "qty" ? 1 : A.stepOf(S.PAGE);
  A.setQty(S.PAGE, i, (A.QTY[S.PAGE][i] || 0) + st);
  A.touch(S.PAGE, i);              // 이미 담긴 상품이라도 다시 찍으면 맨 위로 올린다
  A.applyFilter();
  const c = $(S.PAGE === "A" ? "gridA" : "gridB").querySelector(`.cap[data-i="${i}"]`);
  c.classList.remove("hit"); void c.offsetWidth; c.classList.add("hit");
  c.scrollIntoView({block:"center", behavior:"smooth"});
  $("scanNote").textContent = SCANMODE[S.PAGE] === "qty"
    ? `${A.ITEMS[i].g} · ${A.ITEMS[i].d} — 수량을 치고 Enter`
    : `${A.ITEMS[i].g} · ${A.ITEMS[i].d} +${st}  (합계 ${A.QTY[S.PAGE][i]})`;
  if (SCANMODE[S.PAGE] === "qty") setTimeout(()=>focusQty(i), 60);
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { SCANMODE, setScanMode });
