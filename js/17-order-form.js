/* ──────────────────────────────────────────────────────────
   17-order-form.js
   주문 엑셀 = 전자랜드 주문양식과 같은 열 (매대 9열 / 개인 15열)
   ────────────────────────────────────────────────────────── */
import { A } from "./00-core.js";
/* ══════════════════════════════════════════════════════════════
   더다움이 받는 주문 엑셀 = 전자랜드 주문양식과 같은 열
   매대 9열 / 개인 15열 (앞에 주문번호, 뒤에 받는 분 5열).
   ⚠ `전자랜드_주문양식_*.xlsx` 와 열이 어긋나면 안 됩니다. 고칠 때 같이 고칠 것.
   이미지 열은 자리만 비웁니다 — 브라우저가 셀 안에 사진을 넣지는 못합니다.
   ══════════════════════════════════════════════════════════════ */
const FORM_HDR_A = ["25자","영문 코드10자이내","바코드","이미지","상품명","기종","디자인","발주수량","샘플 지원"];
const FORM_W_A   = [46.4,18,18,18,59.1,24,18.8,14.4,12];
const FORM_HDR_B = ["주문번호", ...FORM_HDR_A, "수령인","전화번호","우편번호","주소","요청사항"];
const FORM_W_B   = [18, ...FORM_W_A, 14,16,12,55,30];
/* ⚠ 2026-08-31 — 구버전 시트를 뺐습니다(사용자 요청). 아래 OLD_HDR·OLD_W·oldRows() 는 지금 안 씁니다.
   되살릴 일이 생기면 이 아래 것을 그대로 쓰면 됩니다.
   구버전 고객발송 모양 — 고객 정보가 오른쪽 J·K·L 옆열에 붙던 방식.
   A~H 는 옛 발주서 그대로(`품명`, 기종 없음), I 는 비고 자리로 비움.
   ⚠ 옛 파일은 J·K·L 에 머리글이 없어 무슨 열인지 알 수 없었고, 주소를 84행 전부에
     드래그 복사해 두는 사고가 있었습니다. 그래서 여기서는 머리글을 넣고
     **주문 행에만** 채웁니다. 열 자리와 너비는 옛 파일 그대로입니다. */
const OLD_HDR = ["25자","영문 코드10자이내","바코드","이미지","품명","디자인","발주수량","샘플 지원",
                 "","이름","연락처","주소"];
const OLD_W   = [46.375,18,18,18,59.125,18.75,14.375,12,7.625,14.375,14.375,74.5];
function oldRows(o){
  const addr = [o.to.addr, o.to.addr2].filter(Boolean).join(" ").trim();
  return o.lines.map(l => [l.s||"", l.c||"", l.b, "", l.n||"", l.d||"", l.q, "", "",
                           o.to.name||"", o.to.tel||"", addr]);
}
/* ══════════════════════════════════════════════════════════
   ★ 다운로드 파일 이름 — 세 단계가 절대 같은 이름이 되면 안 됩니다
      {YYYYMMDD}_{단계}_{누가}_{무엇}.xlsx
        1 전자랜드주문   전자랜드가 보낸 뒤 받는 자기 사본
        2 더다움확인     더다움이 확인하려고 받는 것 (건별 / 합본)
        3 트라이코지생산 승인 뒤 생산팀에 넘기는 것 (매장건 / 고객건)
      날짜가 앞이라 다운로드 폴더에서 날짜별로 묶이고,
      같은 날 안에서는 1 → 2 → 3 흐름 순으로 줄섭니다.
   ══════════════════════════════════════════════════════════ */
const ymd = o => String((o && o.yyyymmdd) || (new Date().getFullYear() + ((o && o.mmdd) || "0101")));
const seq6 = o => (orderNoFull(o).split("-")[1] || "000001");
const kindOf = o => (o && o.to) ? "개인" : "매대";

const orderNoFull = o => {
  /* 저장소를 붙이면 주문번호가 이미 YYYYMMDD-000001 형태로 발급됩니다 — 그대로 씁니다 */
  if (/^\d{8}-\d{6}$/.test(String(o.no))) return String(o.no);
  const y = String(o.yyyymmdd || (new Date().getFullYear() + o.mmdd));
  const n = (String(o.no).match(/\d+/) || ["1"])[0];
  return `${y}-${String(+n).padStart(6,"0")}`;
};
function formRows(o){
  const base = l => [l.s||"", l.c||"", l.b, "", l.n||"", l.m||"", l.d||"", l.q, ""];
  if (!o.to) return o.lines.map(base);
  const ono = orderNoFull(o);
  const addr = [o.to.addr, o.to.addr2].filter(Boolean).join(" ").trim();
  /* ★ 받는 분을 그 주문의 **모든 행**에 채웁니다 (2026-08-21 사용자 확정).
     첫 행에만 넣으면 여러 건을 한 파일에 모았을 때 두 번째 줄부터
     누구에게 보내는 물건인지 알 수 없어 송장이 어긋납니다.
     ⚠ 채우는 범위는 **그 주문번호의 줄까지**입니다 —
       옛 사고처럼 시트 전체에 드래그 복사하는 것과는 다릅니다. */
  return o.lines.map(l => [ono, ...base(l),
    o.to.name||"", o.to.tel||"", o.to.zip||"", addr, o.to.memo||""]);
}
/* 줄 하나가 쓸 사진 주소. 바코드로 찾으므로 저장소에서 불러온 주문도 됩니다 */
const lineImg  = l => l.img || (l.b ? `images/${l.b}.png` : "");
const formImgs = o => o.lines.map(lineImg);
/* 더다움이 확인 대기 여러 건을 한 번에 받는 합본.
   ⚠ 매대 시트는 주문번호 열이 앞에 붙어 10열입니다 — 개별 다운로드(9열 양식)와 다릅니다.
      여러 건이 한 시트에 섞이므로 어느 주문인지 표시가 없으면 못 갈라냅니다. */
const BULK_HDR_A = ["주문번호", ...FORM_HDR_A];
const BULK_W_A   = [18, ...FORM_W_A];

/* ══════════════════════════════════════════════════════════════
   ★ 매대건 합치기 (2026-08-24 더다움 요청)
   "합본인데 주문별로 줄이 따로 나와서, 같은 상품을 손으로 더해야 한다"
   → **바코드 기준으로 묶어 수량을 더한 시트**를 첫 장으로 만듭니다.
     어느 주문에서 왔는지는 뒤 두 칸(주문 건수 · 주문번호)에 남겨 두어
     나중에 되짚을 수 있게 합니다. 원본은 둘째 시트 `주문별` 에 그대로 있습니다.
   ⚠ 앞 9칸은 전자랜드 양식 그대로입니다 — 그대로 생산팀에 넘길 수 있습니다.
   ⚠ 고객건은 합치지 않습니다. 받는 분이 사람마다 달라 섞으면 안 됩니다.
   ══════════════════════════════════════════════════════════════ */
const MERGE_HDR_A = [...FORM_HDR_A, "주문 건수", "주문번호"];
const MERGE_W_A   = [...FORM_W_A, 11, 34];
function mergeDisp(list){
  const m = new Map();
  list.forEach(o => {
    const no = orderNoFull(o);
    o.lines.forEach(l => {
      const k = l.b || ((l.c || "") + "|" + (l.n || "") + "|" + (l.d || ""));
      let r = m.get(k);
      if (!r){ r = { l, q: 0, nos: [] }; m.set(k, r); }
      r.q += (l.q || 0);
      if (!r.nos.includes(no)) r.nos.push(no);
    });
  });
  const arr = [...m.values()];
  return {
    rows: arr.map(r => [r.l.s || "", r.l.c || "", r.l.b, "", r.l.n || "", r.l.m || "",
                        r.l.d || "", r.q, "", r.nos.length, r.nos.join(", ")]),
    imgs: arr.map(r => lineImg(r.l)),
    kinds: arr.length,
    total: arr.reduce((s, r) => s + r.q, 0),
  };
}
/* ★ 합본은 **매대건 / 고객건 파일을 따로** 만듭니다 (2026-08-21 사용자 확정).
     한 파일에 시트로 담던 방식은 트라이코지 단계(파일 2개)와 어긋나 헷갈렸습니다.
     이제 더다움도 트라이코지와 **똑같이** 움직입니다.
     ⚠ 파일이 둘이면 브라우저가 "여러 파일 다운로드를 허용할까요?" 를 한 번 물을 수 있습니다.
   mine = 전자랜드가 자기 사본을 받는 것. 이때는 `o.dl`(더다움이 확인했다는 표시)을 건드리지 않습니다. */
function bulkName(mine, kind, n){
  return `${ymd0()}_${mine ? "1_전자랜드주문" : "2_더다움확인"}_${kind}합본_${n}건.xlsx`;
}
let _ymd0 = "";
const ymd0 = () => _ymd0;
function dlBulkForm(list, btn, mine){
  if (!list.length) return;
  const mmdd = list[0].mmdd;
  _ymd0 = ymd(list[0]);
  const disp = list.filter(o=>!o.to), ship = list.filter(o=>o.to);
  return A.run(btn, "받음 ✓", async () => {
    /* ① 매대건 — 첫 장은 합친 것, 둘째 장은 주문별 원본 */
    if (disp.length){
      const mg = mergeDisp(disp);
      const blob = await A.XLSXW.build([{
        sheetName:"매대합계",
        title:`${mmdd.slice(0,2)}/${mmdd.slice(2)} 전자랜드 매대 보충 — 주문 ${disp.length}건을 합쳐 ${mg.kinds}종 ${mg.total}개`,
        headers:MERGE_HDR_A, widths:MERGE_W_A, numCols:[7,9], textCols:[2,10],
        imgCol:3, imgs: mg.imgs, rows: mg.rows },{
        sheetName:"주문별", tab:false,
        title:`${mmdd.slice(0,2)}/${mmdd.slice(2)} 주문별 원본 ${disp.length}건 — 합계가 맞는지 되짚을 때 보세요`,
        headers:BULK_HDR_A, widths:BULK_W_A, numCols:[8], textCols:[0,3],
        imgCol:4, imgs: disp.flatMap(formImgs),
        rows: disp.flatMap(o=>o.lines.map(l=>[orderNoFull(o), l.s||"", l.c||"", l.b, "",
                                              l.n||"", l.m||"", l.d||"", l.q, ""])) }]);
      A.saveBlob(blob, bulkName(mine, "매대", disp.length));
    }
    /* ② 고객건 — 시트 한 장. 구버전 시트는 2026-08-31 사용자 요청으로 뺐습니다 */
    if (ship.length){
      if (disp.length) await new Promise(r=>setTimeout(r, 700));   // 브라우저가 두 번째 파일을 막지 않게 잠깐 텀
      const blob = await A.XLSXW.build([{
        sheetName:"고객건",
        title:`${mmdd.slice(0,2)}/${mmdd.slice(2)} 전자랜드 개인 배송 ${ship.length}건`,
        headers:FORM_HDR_B, widths:FORM_W_B, numCols:[8], textCols:[0,3,11,12],
        imgCol:4, imgs: ship.flatMap(formImgs),
        rows: ship.flatMap(o=>formRows(o)) }]);
      A.saveBlob(blob, bulkName(mine, "고객", ship.length));
    }
    if (mine) return;
    /* ★ 2026-08-24 — 엑셀을 받아도 단계는 안 넘어갑니다. `엑셀받음` 표시만 켭니다.
       미확인 → 확인 은 사람이 `확인` 을 눌러야 넘어갑니다. */
    list.forEach(o=>{ o.xl = true; A.store?.onPatch(o, {xl:true}); });   /* [저장소 고리] */
    setTimeout(()=>A.renderInbox(1), 1000);
  });
}

function dlOrderForm(o, btn, mark){
  const ship = !!o.to, mmdd = o.mmdd;
  return A.run(btn, "받음 ✓", async () => {
    const stage = mark ? "2_더다움확인" : "1_전자랜드주문";       // mark 가 있으면 더다움이 받는 것
    const who   = mark ? "더다움 확인용" : "전자랜드 주문서";
    const sheets = [{
      sheetName: "전자랜드",
      title: `${mmdd.slice(0,2)}/${mmdd.slice(2)} ${who} · ${o.mode} · ${orderNoFull(o)}`,
      headers: ship ? FORM_HDR_B : FORM_HDR_A,
      widths:  ship ? FORM_W_B   : FORM_W_A,
      rows: formRows(o),
      numCols:  [ship ? 8 : 7],
      textCols: ship ? [0,3,11,12] : [2],
      imgCol:   ship ? 4 : 3,
      imgs:     formImgs(o),
    }];
    const blob = await A.XLSXW.build(sheets);
    A.saveBlob(blob, `${ymd(o)}_${stage}_${kindOf(o)}_${seq6(o)}.xlsx`);
    if (mark){ o.xl = true; A.store?.onPatch(o, {xl:true});   /* [저장소 고리] */ setTimeout(()=>A.renderInbox(1), 1000); }   // 엑셀받음 표시만
  });
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { BULK_HDR_A, BULK_W_A, FORM_HDR_B, FORM_W_B, MERGE_HDR_A, MERGE_W_A,
                   dlBulkForm, dlOrderForm, formImgs, formRows, lineImg, mergeDisp, orderNoFull, ymd });
