/* ──────────────────────────────────────────────────────────
   19-ship-approve.js
   출고 완료(송장) · 트라이코지 승인 / 반려
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";
/* ── 출고 완료 — 송장 캡처 붙여넣기 / 직접 타이핑, 둘 다 선택 ──
   업체에 정보를 그대로 넘기려고 둡니다. **비워도 출고 완료는 됩니다.** */
/* SHIPIMG 는 00-state.js 의 S.SHIPIMG 로 옮겼습니다 */
function loadShipImg(file){
  if (!file || !file.type.startsWith("image/")) return;
  const fr = new FileReader();
  fr.onload = ()=>{
    const im = new Image();
    im.onload = ()=>{
      const max = 1200, sc = Math.min(1, max / Math.max(im.width, im.height));
      const cv = document.createElement("canvas");
      cv.width = Math.round(im.width * sc); cv.height = Math.round(im.height * sc);
      cv.getContext("2d").drawImage(im, 0, 0, cv.width, cv.height);
      S.SHIPIMG = cv.toDataURL("image/webp", 0.8);      // 원본 그대로 두면 메모리가 훅 늡니다
      const p = $("trkPrev"), h = $("pasteHint");
      if (p){ p.src = S.SHIPIMG; p.hidden = false; }
      if (h) h.textContent = "다시 붙여넣으면 바뀝니다";
    };
    im.src = fr.result;
  };
  fr.readAsDataURL(file);
}
/* 붙여넣기는 한 번만 걸어 둡니다 — 시트를 열 때마다 걸면 중복으로 쌓입니다 */
document.addEventListener("paste", e=>{
  if (!$("pasteBox")) return;                          // 출고 시트가 열려 있을 때만
  const it = [...(e.clipboardData?.items || [])].find(i=>i.type.startsWith("image/"));
  if (!it) return;
  e.preventDefault();
  loadShipImg(it.getAsFile());
});
function askShipOut(o){
  if (!o) return;
  S.SHIPIMG = null;
  A.openSheet(`<b class="big">${o.no} 출고 완료</b>
    <p class="sum">송장을 남기면 업체에 그대로 전달됩니다. <b>비워도 출고 완료는 됩니다.</b></p>
    <div class="trkrow">
      <label class="rejwrap co"><span>택배사</span>
        <select id="trkCo">
          <option>롯데택배</option>
          <option>우체국</option>
          <option>한진택배</option>
          <option>퀵발송</option>
        </select></label>
      <label class="rejwrap no"><span>송장번호</span>
        <input id="trkNo" placeholder="1234-5678-9012" inputmode="numeric" autocomplete="off"></label>
    </div>
    <div class="pastebox" id="pasteBox" tabindex="0">
      <p id="pasteHint">여기를 누르고 <b>Ctrl+V</b> 로 송장 캡처를 붙여넣으세요<br>
        또는 <label class="pick">파일 선택<input type="file" id="trkFile" accept="image/*" hidden></label></p>
      <img id="trkPrev" hidden alt="">
    </div>`,
    ()=>{
      const no = ($("trkNo")?.value || "").trim();
      const co = $("trkCo")?.value || "";
      o.ship = (no || S.SHIPIMG) ? { co, no, img: S.SHIPIMG } : null;   // 택배사만 골라둔 건 빈 것으로 본다
      o.status = 3;
      A.store?.onPatch(o, {status:3, ship:o.ship});   /* [저장소 고리] */
      A.renderInbox(1); A.renderInbox(2); A.renderMine(); A.showSent();   // 출고는 세 화면이 동시에 바뀐다
    }, "", "출고 완료");
  const box = $("pasteBox");
  box.onclick = ()=> box.focus();
  $("trkFile").onchange = e => loadShipImg(e.target.files[0]);
  box.focus();
}

/* ── 트라이코지 — 승인은 되돌릴 수 없으므로 확인 한 번, 아니면 반려 ── */
function askApprove(o){
  if (!o) return;
  const n = o.lines.reduce((s,l)=>s+l.q,0);
  A.openSheet(`<b class="big">${o.no} 최종 승인</b>
    <p class="sum">${o.mode} · ${o.lines.length} 품목 · 총 <b>${n}</b> 개${o.to ? "<br>받는 분 " + esc(o.to.name) : ""}</p>
    <p class="ask">승인하면 되돌릴 수 없습니다. 승인할까요?</p>`,
    ()=>{ o.status = 2; A.store?.onPatch(o, {status:2});   /* [저장소 고리] */
          A.renderInbox(1); A.renderInbox(2); A.renderMine(); }, o.to ? "cy" : "ac", "승인");
}
/* 반려 = 더다움 확인 대기로 되돌리기.
   ⚠ `o.dl = false` 로 자료 받은 표시를 지웁니다 — 고친 뒤 **다시 받아야** 넘길 수 있습니다. */
function askReject(o){
  if (!o) return;
  A.openSheet(`<b class="big">${o.no} 더다움에 반려</b>
    <p class="sum">확인 대기로 되돌립니다.<br>더다움은 자료를 <b>다시 받아야</b> 넘길 수 있습니다.</p>
    <label class="rejwrap"><span>사유</span><input id="rejMemo" placeholder="예) 수량 확인 필요" autocomplete="off"></label>`,
    ()=>{
      o.status = 0; o.dl = false; o.xl = false;
      o.reject = ($("rejMemo")?.value || "").trim() || "사유 없음";
      A.store?.onPatch(o, {status:0, dl:false, memo:o.reject});   /* [저장소 고리] 사유를 담은 뒤에 보냅니다 */
      A.renderInbox(1); A.renderInbox(2); A.renderMine(); A.showSent();
    }, "", "반려");
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { askApprove, askReject, askShipOut });
