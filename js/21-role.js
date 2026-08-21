/* ──────────────────────────────────────────────────────────
   21-role.js
   업체별 화면 — 실제 배포 모양 + 첫 실행(부팅)
   ────────────────────────────────────────────────────────── */
import { $, S, A } from "./00-core.js";
/* ── 업체별 화면 — 실제 배포 모양 ────────────────────────────
   `?as=전자랜드` / `?as=더다움` / `?as=트라이코지` (0·1·2 도 됩니다)
   붙이면 상단 역할 탭이 사라지고 그 업체 화면만 뜹니다.
   아무것도 안 붙이면 지금처럼 3탭이 다 보입니다(시안용).
   ⚠ 이건 **보여주기용**입니다. 세 화면이 한 파일 안에 다 있어서
      개발자도구로 열면 그대로 보입니다. 실제 검문은 저장소가 해야 합니다. */
const AS = (()=>{
  const v = new URLSearchParams(location.search).get("as");
  if (!v) return null;
  const k = decodeURIComponent(v).trim().toLowerCase();
  const map = {"전자랜드":0, "더다움":1, "트라이코지":2,
               "0":0, "1":1, "2":2, "elc":0, "dadaum":1, "trycozy":2};
  return k in map ? map[k] : null;
})();
const ROLE_NAME = ["전자랜드","더다움","트라이코지"];

function setRole(r){
  if (AS !== null) r = AS;                 // 업체 화면으로 고정 — 탭으로 못 넘어간다
  document.querySelectorAll(".chain button").forEach(b=>b.setAttribute("aria-pressed", String(+b.dataset.role===r)));
  [1,2].forEach(i=> $("v"+i).hidden = (i!==r));
  $("subtabs").hidden = (r!==0);
  if (r === 0) A.setSub(S.SUB);
  else {
    $("v0").hidden = true; $("v0b").hidden = true; $("bar").hidden = true;
    document.body.style.paddingBottom = A.mqPC.matches ? "24px" : "40px";
    A.renderInbox(r);
  }
  window.scrollTo({top:0});
}
document.querySelectorAll(".chain button").forEach(b=> b.onclick = ()=>setRole(+b.dataset.role));
A.setDens(A.SETTINGS.dens === null ? !A.mqPC.matches : A.SETTINGS.dens);
A.syncStick();
A.relayout();
A.loadDraft();
A.renderCart();
A.setPage("A");
if (AS !== null){
  document.querySelector(".chain").hidden = true;
  document.querySelector(".brand").innerHTML =
    `TRYCOZY <em>/</em> 키캡 키링 주문 <b class="who">${ROLE_NAME[AS]}</b>`;
}
setRole(AS ?? 0);

/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { setRole, AS, ROLE_NAME });
