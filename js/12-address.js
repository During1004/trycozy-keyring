/* ──────────────────────────────────────────────────────────
   12-address.js
   개인 배송 받는 분 + 주소 찾기 (카카오 우편번호)
   ────────────────────────────────────────────────────────── */
import { $, A } from "./00-core.js";
/* ── 페이지 전환 ───────────────────────────────────────────── */
const shipForm = $("shipForm");
const REQ = ["sName","sTel","sZip","sAddr"];
const shipReady = () => REQ.every(id => $(id).value.trim() !== "");

/* ══════════════════════════════════════════════════════════════
   주소 찾기 — 카카오(구 다음) 우편번호 서비스
   · 키 발급·사용량 제한 없음, 행정안전부 도로명주소 원본을 그대로 씀
   · 구 daum CDN 은 2026-05 종료 → t1.kakaocdn.net 사용
   · 스크립트를 못 받으면(사내망 차단 등) 직접 입력으로 자동 전환
   ══════════════════════════════════════════════════════════════ */
const zipModal = $("zipModal"), zipBody = $("zipBody");
/* ★ file:// 로 열면 위젯은 뜨고 검색도 되지만, 선택 결과를 페이지로 넘겨주지 못한다
   (부모 창 origin 이 null 이라 postMessage 가 전달되지 않음).
   "검색은 되는데 클릭해도 입력이 안 되는" 증상의 정체. → http 로 열어야 한다. */
const IS_FILE = location.protocol === "file:";
/* ★ 반드시 body 직속으로. position:sticky 인 .col-side 안에 두면 쌓임 맥락에 갇혀
   PC 에서 상품 그리드 뒤로 깔린다(실제로 겪음). */
document.body.appendChild(zipModal);
function postcodeCtor(){
  return (window.kakao && window.kakao.Postcode) || (window.daum && window.daum.Postcode) || null;
}
function zipManual(reason){
  document.querySelector(".ship").classList.add("manual");
  ["sZip","sAddr"].forEach(id=>{ $(id).removeAttribute("readonly"); });
  $("sZip").placeholder = "우편번호 직접 입력";
  $("sAddr").placeholder = "주소 직접 입력";
  $("zipBtn").textContent = "직접 입력";
  if (reason) $("shipHint").textContent = reason;
}
function zipFallbackUI(msg){
  const box = document.createElement("div");
  box.className = "ziperr";
  box.innerHTML = IS_FILE
    ? `<b>파일을 직접 열면 주소 검색이 안 됩니다</b>
       <span>검색창은 뜨고 검색도 되지만, <u>결과를 눌러도 주소가 넘어오지 않습니다.</u><br>
       브라우저가 <code>file://</code> 로 열린 페이지에는 검색 결과를 전달하지 않기 때문입니다.<br><br>
       같은 폴더의 <code>주문화면_열기.bat</code> 를 더블클릭해서<br>
       <code>http://localhost:8777/</code> 로 여시면 정상 동작합니다.<br>
       (깃허브 페이지에 올린 뒤에는 신경 쓸 필요 없습니다)</span>
       <button type="button" id="zipManualBtn">지금은 직접 입력할래요</button>`
    : `<b>주소 검색을 불러오지 못했습니다</b>
       <span>${msg}</span>
       <button type="button" id="zipManualBtn">우편번호·주소 직접 입력하기</button>`;
  zipBody.appendChild(box);
  box.querySelector("#zipManualBtn").onclick = ()=>{
    zipModal.hidden = true;
    zipManual("주소 검색을 못 써서 직접 입력으로 바꿨습니다. 우편번호와 주소를 적어주세요.");
    $("sZip").focus();
  };
}
function openZip(){
  if (IS_FILE){                       // 검색해도 결과가 안 넘어오므로 아예 띄우지 않는다
    zipModal.hidden = false; zipBody.innerHTML = "";
    zipFallbackUI("");
    return;
  }
  const Ctor = postcodeCtor();
  if (!Ctor){
    zipModal.hidden = false;
    zipBody.innerHTML = "";
    zipFallbackUI("검색 스크립트를 내려받지 못했습니다.");
    return;
  }
  zipModal.hidden = false;
  zipBody.innerHTML = "";
  new Ctor({
    oncomplete: function(d){
      // 도로명 우선, 없으면 지번. 참고항목(법정동·건물명)은 괄호로 덧붙임
      let addr = d.userSelectedType === "J" ? d.jibunAddress : d.roadAddress;
      let extra = "";
      if (d.userSelectedType !== "J"){
        if (d.bname && /[동|로|가]$/.test(d.bname)) extra += d.bname;
        if (d.buildingName) extra += (extra ? ", " : "") + d.buildingName;   // 아파트 외 상가·빌딩도 표기(배송 편의)
        if (extra) addr += " (" + extra + ")";
      }
      $("sZip").value = d.zonecode || "";
      $("sAddr").value = addr || "";
      zipModal.hidden = true;
      $("sAddr2").focus();
      A.refresh(); A.saveDraft();
    },
    width: "100%", height: "100%", maxSuggestItems: 5
  }).embed(zipBody, { autoClose: false });

  /* 위젯이 실제로 그려졌는지 확인 — 빈 창이면 직접 입력 안내 */
  setTimeout(()=>{
    if (zipModal.hidden) return;
    const f = zipBody.querySelector("iframe, div");
    const painted = f && f.getBoundingClientRect().height > 40;
    if (!painted && !zipBody.querySelector(".ziperr"))
      zipFallbackUI("검색창이 열리지 않았습니다.");
  }, 2600);
}
$("zipBtn").onclick = openZip;
$("sAddr").addEventListener("click", ()=>{ if ($("sAddr").hasAttribute("readonly")) openZip(); });
$("sZip").addEventListener("click", ()=>{ if ($("sZip").hasAttribute("readonly")) openZip(); });
$("zipClose").onclick = ()=>{ zipModal.hidden = true; };
zipModal.addEventListener("click", e=>{ if (e.target === zipModal) zipModal.hidden = true; });
document.addEventListener("keydown", e=>{ if (e.key === "Escape" && !zipModal.hidden) zipModal.hidden = true; });
function zipCheck(){
  if (IS_FILE){
    zipManual("파일을 직접 열어서 주소 검색이 동작하지 않습니다. 직접 입력하시거나, 같은 폴더의 주문화면_열기.bat 로 여세요.");
    return;
  }
  if (!postcodeCtor())
    zipManual("주소 검색 서버에 연결하지 못했습니다. 우편번호와 주소를 직접 입력해주세요.");
}
window.addEventListener("load", zipCheck);
setTimeout(zipCheck, 2500);   // 느린 회선 대비 한 번 더


/* ══════════════════════════════════════════════════════════════
   전화번호 자동 정리 — `01010051005` 로 쳐도 `010-1005-1005` 가 됩니다
   · 숫자만 남기고 한국 번호 규칙대로 하이픈을 넣습니다
   · 엑셀에서 앞의 0 이 날아가지 않게 `@`(텍스트) 서식으로 내보냅니다
     (17-order-form.js 의 textCols 에 전화번호 열이 들어 있습니다)
   ══════════════════════════════════════════════════════════════ */
function fmtTel(v){
  let d = String(v ?? "").replace(/[^0-9]/g, "");
  if (!d) return "";
  if (d.length > 11) d = d.slice(0, 11);
  const cut = (a, b) => [d.slice(0, a), d.slice(a, a + b), d.slice(a + b)].filter(Boolean).join("-");
  if (d.startsWith("02"))                       // 서울 — 지역번호 2자리
    return d.length <= 2 ? d
         : d.length <= 5 ? cut(2, d.length - 2)
         : d.length <= 9 ? cut(2, 3)
         :                 cut(2, 4);
  if (/^(15|16|18)/.test(d) && d.length >= 8)   // 1544 · 1600 같은 대표번호
    return cut(4, 4);
  if (d.length <= 3) return d;                  // 그 밖 — 국번 3자리
  if (d.length <= 7) return cut(3, d.length - 3);
  if (d.length <= 10) return cut(3, 3);
  return cut(3, 4);
}
/* 칸에 그대로 적용합니다. 글자를 끝에서 치는 중이면 커서를 끝에 둡니다
   (가운데를 고치는 중이라면 커서를 건드리지 않으려고 나눠 두었습니다) */
function applyTel(el, keepCaret){
  const before = el.value;
  const atEnd  = el.selectionStart === before.length;
  const after  = fmtTel(before);
  if (after === before) return;
  el.value = after;
  if (keepCaret && !atEnd){
    const p = Math.min(el.selectionStart ?? after.length, after.length);
    try { el.setSelectionRange(p, p); } catch (e) {}
  }
}
const telBox = $("sTel");
if (telBox){
  telBox.setAttribute("inputmode", "numeric");
  telBox.addEventListener("input",  ()=> applyTel(telBox, true));
  telBox.addEventListener("blur",   ()=> applyTel(telBox, false));
  telBox.addEventListener("change", ()=> applyTel(telBox, false));
}

/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { REQ, fmtTel, shipForm, shipReady });
