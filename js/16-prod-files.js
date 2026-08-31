/* ──────────────────────────────────────────────────────────
   16-prod-files.js
   트라이코지가 생산팀에 넘기는 자료 — 매장건 / 고객건
   ────────────────────────────────────────────────────────── */
import { A } from "./00-core.js";
/* ══════════════════════════════════════════════════════════════
   트라이코지가 생산팀에 넘기는 자료 — 매장건 / 고객건 따로
   ⚠ 세밀 xlsx(THE_BACODE 대시보드) · 라벨 xlsm · 송장 xlsx 는 **여기 두지 않습니다.**
      트라이코지 자산이라 화면에 노출하지 않기로 했습니다(2026-08-20 사용자 확정).
      매크로 템플릿 `BASE_XLSM_B64` 도 통째로 뺐습니다 — 깃허브 페이지는 공개 주소라
      HTML 안에 두면 그대로 내려받힙니다. 라벨·송장은 별도 대시보드에서 만듭니다.
   ══════════════════════════════════════════════════════════════ */
const pickAppr = v => v === "*" ? A.ORDERS.filter(o=>o.status>=2).slice().reverse()
                                : [A.ORDERS.find(o=>o.no===v)].filter(Boolean);
function dlStore(list, btn){
  const g = list.filter(o=>!o.to);
  if (!g.length) return;
  const mmdd = g[0].mmdd;
  return A.run(btn, "받음 ✓", async () => {
    /* ★ 첫 장은 상품별로 합친 것 (2026-08-24) — 생산팀이 손으로 더할 일이 없게.
       둘째 장 `주문별` 은 원본 그대로라 나중에 되짚을 수 있습니다. */
    const mg = A.mergeDisp(g);
    A.saveBlob(await A.XLSXW.build([{
      sheetName:"매장건합계",
      title:`${mmdd.slice(0,2)}/${mmdd.slice(2)} 전자랜드 매장건 — 주문 ${g.length}건을 합쳐 ${mg.kinds}종 ${mg.total}개`,
      headers:A.MERGE_HDR_A, widths:A.MERGE_W_A, numCols:[7,9], textCols:[2,10],
      imgCol:3, imgs: mg.imgs, rows: mg.rows,
    },{
      sheetName:"주문별", tab:false,
      title:`${mmdd.slice(0,2)}/${mmdd.slice(2)} 주문별 원본 ${g.length}건`,
      headers:A.BULK_HDR_A, widths:A.BULK_W_A, numCols:[8], textCols:[0,3],
      imgCol:4, imgs: g.flatMap(A.formImgs),
      rows: g.flatMap(o=>o.lines.map(l=>[A.orderNoFull(o), l.s||"", l.c||"", l.b, "",
                                         l.n||"", l.m||"", l.d||"", l.q, ""])),
    }]), `${A.ymd(g[0])}_3_트라이코지생산_매장건_${g.length}건.xlsx`);
  });
}
function dlCust(list, btn){
  const g = list.filter(o=>o.to);
  if (!g.length) return;
  const mmdd = g[0].mmdd;
  return A.run(btn, "받음 ✓", async () => {
    /* 시트 1장 확정 — 구버전(J·K·L) 시트는 2026-08-20 사용자 확정으로 뺐습니다.
       개별 개인배송 다운로드에는 아직 남아 있습니다(더다움·전자랜드가 눈으로 볼 때 쓰는 모양). */
    A.saveBlob(await A.XLSXW.build([{
      sheetName:"고객건",
      title:`${mmdd.slice(0,2)}/${mmdd.slice(2)} 전자랜드 고객건 ${g.length}건`,
      headers:A.FORM_HDR_B, widths:A.FORM_W_B, numCols:[8], textCols:[0,3,11,12],
      imgCol:4, imgs: g.flatMap(A.formImgs),
      rows: g.flatMap(o=>A.formRows(o)),
    }]), `${A.ymd(g[0])}_3_트라이코지생산_고객건_${g.length}건.xlsx`);
  });
}
const apprBtns = (v, list) => {
  const st = list.filter(o=>!o.to).length, cu = list.filter(o=>o.to).length;
  if (!st && !cu) return "";
  return `<div class="btns">
    ${st ? `<button class="act sm store" data-store="${v}" type="button">매장건 ${st}건 · XLSX</button>` : ""}
    ${cu ? `<button class="act sm cust" data-cust="${v}" type="button">고객건 ${cu}건 · XLSX</button>` : ""}
  </div>`;
};


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { apprBtns, dlCust, dlStore, pickAppr });
