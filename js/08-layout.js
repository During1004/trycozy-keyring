/* ──────────────────────────────────────────────────────────
   08-layout.js
   화면 배치 — 밀도 토글 · sticky 높이 · PC/폰 재배치
   ────────────────────────────────────────────────────────── */
import { $, S, A } from "./00-core.js";
/* ── 화면 폭에 따라 받는 분 칸 / 전송바 위치 이동 ─────────────
   폰: 상품 아래(v7 확정 배치) · PC: 우측 조작 패널 안 */
/* ── 보기 방식 (목록형 / 촘촘히 / 사진 크게) ─────────────────
   2026-08-24 전자랜드 요청으로 "목록형" 추가. 기본값이 목록형입니다.
     list    사진 작게 · 한 줄에 한 상품   ← 기본
     compact 사진 낮게 · 여러 열
     photo   사진 크게 · 여러 열
   선택은 브라우저에 기억됩니다. */
const VIEWS = ["list","compact","photo"];
function setView(v){
  if (!VIEWS.includes(v)) v = "list";
  document.body.classList.toggle("viewlist", v === "list");
  document.body.classList.toggle("compact",  v === "compact");
  const sel = $("viewSel");
  if (sel) sel.value = v;
  A.SETTINGS.view = v; A.saveSettings();
  if (typeof S.PAGE !== "undefined") A.refresh();
}
if ($("viewSel")) $("viewSel").onchange = ()=> setView($("viewSel").value);
/* 옛 이름 — 21-role.js 등에서 부르던 것. 켜면 촘촘히, 끄면 사진 크게 */
function setDens(on){ setView(on ? "compact" : "photo"); }

/* 상품군 머리가 상단 헤더 바로 아래에 붙도록 실제 높이를 재서 넣는다 */
function syncStick(){
  const top = document.querySelector(".top");
  const h = top ? Math.round(top.getBoundingClientRect().height) : 100;
  document.documentElement.style.setProperty("--stick", h + "px");
}
window.addEventListener("resize", syncStick);

const mqPC = window.matchMedia("(min-width:1024px)");
function relayout(){
  const pc = mqPC.matches, side = $("side"), v0 = $("v0");
  const ship = $("shipForm"), bar = $("bar");
  if (pc){ side.appendChild(ship); side.appendChild(bar); }
  else   { v0.appendChild(ship);  document.body.appendChild(bar); }
  document.body.style.paddingBottom = pc ? "24px" : "";
}
mqPC.addEventListener("change", relayout);


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { mqPC, relayout, setDens, setView, syncStick });
