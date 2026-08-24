/* ──────────────────────────────────────────────────────────
   03-settings.js
   설정 한 뭉치 — 수량 단위·정렬·스캔 방식. PC↔폰 연동을 붙이는 자리
   ────────────────────────────────────────────────────────── */
import { A } from "./00-core.js";
/* ══════════════════════════════════════════════════════════════
   설정 한 뭉치 — PC · 폰이 같은 값을 쓰게 하려면 여기만 갈아끼우면 된다.
   지금은 브라우저(localStorage)에 저장.
   서버 연동 시:
     loadSettings() → await fetch(API + "?code=" + 접속코드) 로 교체
     saveSettings() → await fetch(API, {method:"POST", body:...}) 로 교체
   저장 단위는 "주문처(접속 코드)" 이므로, 같은 링크를 쓰는 PC 와 폰이
   자동으로 같은 설정을 받게 된다.
   ══════════════════════════════════════════════════════════════ */
const SET_KEY = "trycozy.keyring.settings.v1";
const SETTINGS = {
  step:     { A: 10, B: 1 },   // ＋/－ 한 번에 오르내리는 수량 (개인 배송은 1 고정)
  scanMode: { A: "qty", B: "one" },
  view:     "list",            // 보기 방식 list(목록형·기본) | compact(촘촘히) | photo(사진 크게)
  dens:     null,              // (옛 값) 촘촘 여부. view 로 대체됨
  sort:     "db",              // db | name | code
  savedAt:  0,
};
function loadSettings(){
  try{
    const o = JSON.parse(localStorage.getItem(SET_KEY) || "null");
    if (o){
      if (o.step)     Object.assign(SETTINGS.step, o.step);
      if (o.scanMode) Object.assign(SETTINGS.scanMode, o.scanMode);
      if (o.sort)     SETTINGS.sort = o.sort;
      if (o.dens !== undefined) SETTINGS.dens = o.dens;
      if (o.view) SETTINGS.view = o.view;
      SETTINGS.savedAt = o.savedAt || 0;
    }
  }catch(e){}
  SETTINGS.step.B = 1;         // 개인 배송은 항상 1개 단위
}
function saveSettings(){
  SETTINGS.savedAt = Date.now();
  try{ localStorage.setItem(SET_KEY, JSON.stringify(SETTINGS)); }catch(e){}
  const el = document.getElementById("stepSync");
  if (el) el.textContent = "마지막 저장 " + new Date(SETTINGS.savedAt)
    .toLocaleString("ko-KR",{month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit"});
}
loadSettings();
const stepOf = p => Math.max(1, SETTINGS.step[p] || 1);


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { SETTINGS, saveSettings, stepOf });
