/* ──────────────────────────────────────────────────────────
   13-refresh.js
   하단 전송바 갱신 · 매대/개인 페이지 전환
   ────────────────────────────────────────────────────────── */
import { $, S, A } from "./00-core.js";
function refresh(){
  const q = A.QTY[S.PAGE];
  const total = Object.values(q).reduce((a,b)=>a+b,0);
  const lines = Object.values(q).filter(v=>v>0).length;
  $("tally").textContent = `${lines} 품목 · ${total} 개`;
  const sum = Object.keys(q).reduce((s,i)=> s + A.won(+i) * (q[i]||0), 0);
  $("tallySum").textContent = "소비자가 합계 " + A.money(sum);
  $("tallySum").hidden = sum === 0;
  const need = A.isShip() && !A.shipReady();
  $("send").disabled = total === 0;
  $("send").textContent = total === 0 ? (A.isShip() ? "배송 주문 보내기" : "주문 보내기")
                        : need ? "받는 분 입력 ↓"
                        : A.isShip() ? "배송 주문 보내기" : "주문 보내기";
  if (A.isShip()){
    const ok = A.shipReady();
    $("shipHint").textContent = ok
      ? ($("sAddr2").value.trim() ? "보낼 준비가 됐습니다." : "보낼 준비가 됐습니다. 아파트·빌딩이면 상세주소(동·호수)를 꼭 적어주세요.")
      : "이름, 연락처, 주소를 채우면 주문을 보낼 수 있습니다.";
    $("shipHint").classList.toggle("ok", ok);
  }
  const other = S.PAGE === "A" ? "B" : "A";
  const oq = Object.values(A.QTY[other]).reduce((a,b)=>a+b,0);
  const here = A.isShip() ? "개인 배송" : "매대 보충", there = A.isShip() ? "매대 보충" : "개인 배송";
  const short = (document.body.classList.contains("compact") || document.body.classList.contains("viewlist")) && !A.mqPC.matches;
  $("pageNote").innerHTML = short
    ? `<b>${here} 전용</b> — ${there}에 담긴 ${oq}개와 따로 관리됩니다.`
    : `<b>${here} 전용 페이지</b> — ${there}과 수량이 따로 관리됩니다. ${there} 쪽에 담긴 수량 ${oq}개는 여기에 섞이지 않습니다.`;
}
function setPage(p){
  S.PAGE = p;
  S.scanBuf = ""; S.physKeys = false;
  const ship = A.isShip();
  $("mShip").setAttribute("aria-pressed", String(ship));
  $("mDisplay").setAttribute("aria-pressed", String(!ship));
  $("gridA").hidden = ship; $("gridB").hidden = !ship;
  A.shipForm.hidden = !ship;
  document.body.classList.toggle("shipmode", ship);
  $("listTitle").textContent = ship ? "개인 배송" : "매대 보충";
  $("tallyWho").textContent = ship ? "개인 배송" : "매대 보충";
  $("stepBox").hidden = ship;          // 개인 배송에는 단위 설정을 두지 않는다
  if (!ship) A.setStep(A.SETTINGS.step.A, false);
  A.setScanMode(A.SCANMODE[S.PAGE]);
  A.cfgSummary();
  A.syncPickChip();
  A.applyFilter();
  refresh();
}
$("mDisplay").onclick = ()=>setPage("A");
$("mShip").onclick = ()=>setPage("B");
A.REQ.concat(["sAddr2","sMemo"]).forEach(id => $(id).addEventListener("input", ()=>{ refresh(); A.saveDraft(); }));


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { refresh, setPage });
