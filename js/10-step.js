/* ──────────────────────────────────────────────────────────
   10-step.js
   수량 단위 (매대 보충 전용) · 폰 설정 접기
   ────────────────────────────────────────────────────────── */
import { $, A } from "./00-core.js";
/* ── 수량 단위 (매대 보충 전용) ─────────────────────────────── */
function setStep(v, save){
  v = Math.max(1, Math.min(999, Math.floor(Number(v) || 1)));
  A.SETTINGS.step.A = v;
  document.querySelectorAll("[data-step]").forEach(b=>
    b.setAttribute("aria-pressed", String(+b.dataset.step === v)));
  const ci = $("stepCustom");
  if (document.activeElement !== ci) ci.value = [1,5,10,20].includes(v) ? "" : v;
  $("stepHint").textContent = `＋ / － 버튼과 스캔이 ${v}개씩 움직입니다.`;
  if (save !== false) A.saveSettings();
  cfgSummary();
  A.refresh();
}
document.querySelectorAll("[data-step]").forEach(b=> b.onclick = ()=> setStep(+b.dataset.step));
$("stepCustom").addEventListener("input", e=>{
  const v = e.target.value.replace(/[^0-9]/g,"");
  e.target.value = v;
  if (v) setStep(v);
});
$("stepCustom").addEventListener("keydown", e=>{ if (e.key === "Enter"){ e.preventDefault(); e.target.blur(); } });

/* ── 폰: 설정 접기 ─────────────────────────────────────────── */
$("cfgBar").onclick = ()=>{
  const open = !document.body.classList.contains("cfgopen");
  document.body.classList.toggle("cfgopen", open);
  $("cfgBar").setAttribute("aria-expanded", String(open));
  $("cfgBar").querySelector("span").textContent = open ? "닫기 ⌃" : "설정 ⌄";
};
function cfgSummary(){
  const el = $("cfgSummary");
  if (!el) return;
  el.textContent = A.isShip()
    ? `개인 배송 · 찍으면 ${A.SCANMODE.B === "qty" ? "수량 입력" : "1개씩 +"}`
    : `단위 ${A.stepOf("A")} · 찍으면 ${A.SCANMODE.A === "qty" ? "수량 입력" : `${A.stepOf("A")}개씩 +`}`;
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { cfgSummary, setStep });
