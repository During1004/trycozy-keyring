/* ──────────────────────────────────────────────────────────
   18-inbox.js
   접수함 — 4단계 상태 · 주문 카드
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";
/* ══════════════════════════════════════════════════════════════
   접수함 — 4단계 상태
   ══════════════════════════════════════════════════════════════ */
const STATUS = [{label:"확인 대기",cls:"wait"},{label:"확인 완료",cls:"ok"},{label:"승인 완료",cls:"appr"},{label:"출고 완료",cls:"done"}];
const FLOW = ["전자랜드 전송","더다움 확인","트라이코지 승인","출고"];
const flowHtml = st => `<div class="flow">` + FLOW.map((f,i)=>
  `<i class="${i<st?"done":i===st?"now":""}">${f}</i>`).join("") + `</div>`;

/* ══════════════════════════════════════════════════════════════
   금액 (2026-08-24 더다움 요청)
   ★ 입고가는 저장소(Supabase `가격` 표)에서만 옵니다. catalog.json 에는 없습니다.
     전자랜드 계정은 RLS 때문에 빈 값이 와서 금액 칸이 아예 안 생깁니다.
   ★ 소비자가는 상품 자료(l.p)에 있는 값입니다 — 공개돼도 되는 값입니다.
   ══════════════════════════════════════════════════════════════ */
const won = v => (Number(String(v ?? "").replace(/[^0-9]/g, "")) || 0);
const priceOf = b => (A.PRICE && A.PRICE[b]) || null;
/* 이 주문에 붙일 금액이 하나라도 있나 — 없으면 칸을 아예 안 만듭니다 */
function hasPrice(o){
  return !!(A.PRICE && o.lines.some(l=>{ const p = priceOf(l.b); return p && (p.e != null || p.t != null); }));
}
function sums(o){
  let cons = 0, e = 0, t = 0, eN = 0, tN = 0;
  o.lines.forEach(l=>{
    const q = l.q || 0, p = priceOf(l.b);
    cons += won(l.p) * q;
    if (p && p.e != null){ e += p.e * q; eN++; }
    if (p && p.t != null){ t += p.t * q; tN++; }
  });
  return { cons, e, t, eN, tN, all: o.lines.length };
}
/* 금액 요약 줄 — 더다움·트라이코지 화면에만 (role 1·2) */
function moneyRow(o, role){
  if (role === 0 || !hasPrice(o)) return "";
  const m = sums(o);
  const part = n => n < m.all ? `<i class="pnote">${m.all - n}종 값 없음</i>` : "";
  return `<div class="mny">
      <span class="eyebrow">금액</span>
      <div class="mny-g">
        <b><em>소비자가</em>${A.money(m.cons)}</b>
        ${m.eN ? `<b class="me"><em>전자랜드 입고가</em>${A.money(m.e)}${part(m.eN)}</b>` : ""}
        ${m.tN ? `<b class="mt"><em>트라이코지 입고가</em>${A.money(m.t)}${part(m.tN)}</b>` : ""}
        ${m.eN && m.tN ? `<b class="mg"><em>더다움 남는 것</em>${A.money(m.e - m.t)}</b>` : ""}
      </div>
    </div>`;
}

/* ══════════════════════════════════════════════════════════════
   대시보드 3칸 (2026-08-24 사용자 그림) — 더다움 화면 맨 위
   [① 미확인 N] [② 확인 N] [③ 발송 N] 을 옆으로 나란히.
   누르면 그 구획만 봅니다. 한 번 더 누르면 전부 봅니다.
   ⚠ 숫자는 지금 보고 있는 갈래(매대/고객) 기준입니다 — 아래 구획 건수와 같아야 하니까요.
   ══════════════════════════════════════════════════════════════ */
const SEC1 = [
  [o => o.status === 0 && !o.dl, "① 미확인", "주문서 엑셀을 아직 안 받았습니다", "엑셀 받기부터", "d1"],
  [o => o.status === 0 &&  o.dl, "② 확인",   "엑셀 받음 · 넘기기만 하면 됩니다", "넘기면 끝",     "d2"],
  [o => o.status >= 1,           "③ 발송",   "트라이코지로 넘어갔습니다",       "손댈 것 없음",   "d3"],
];
function dashHtml(role, list){
  if (role !== 1) return "";
  return `<div class="dash">` + SEC1.map(([pred,label,,hint,cls],i)=>{
    const n = list.filter(pred).length;
    return `<button type="button" class="dcard ${cls}${S.DSEC===i?" on":""}${n?"":" zero"}" data-dsec="${i}"
      aria-pressed="${S.DSEC===i}"><em>${label}</em><b>${n}</b><i>${n ? hint : "없음"}</i></button>`;
  }).join("") + `</div>`;
}

function renderInbox(role){
  const box = $("v"+role);
  /* ⚠ 더다움은 넘긴 뒤에도 계속 봅니다. v30 초반에는 status<=1 만 걸러서
     트라이코지가 승인하는 순간 더다움 목록에서 사라졌습니다 — 송장도 못 봤습니다. */
  const all  = role===1 ? A.ORDERS.slice() : A.ORDERS.filter(o => o.status>=1);
  const list = A.tabCut(role, all);            /* 보고 있는 갈래만 (24-bulk.js) */
  /* 남은 일 / 다 끝남 을 맨 위에 색으로 (화면 전체 기준) → 갈래 탭 → 일괄 막대 → 카드 */
  let head = A.stateBanner(role, all) + dashHtml(role, list) + A.tabBar(role, all);
  if (role === 2){
    const warn = [...new Set(list.flatMap(o=>o.lines).filter(l=>l.w).map(l=>l.b))];
    if (warn.length) head += `<p class="warn"><b>기종 미입력 ${warn.length}종</b> — THE_ELECTRONIC_DB.xlsx 에 기종·생산순위·소비자가가 아직 비어 있습니다.<br>${warn.join(" · ")}</p>`;
    const appr = list.filter(o=>o.status>=2);
    if (appr.length) head += `<p class="sect">승인 완료 ${appr.length}건 — 생산팀 전달</p>` + A.apprBtns("*", appr);
    /* 출고할 게 남아 있을 때만 안내를 띄웁니다 — 다 끝났으면 화면을 비웁니다 */
    if (list.some(o => o.status === 1 || o.status === 2))
    head += `<p class="sect">출고 처리 — 셋 중 편한 것으로</p>
      <div class="btns"><button class="act up sm" id="impShip" type="button">① 송장 엑셀 올리기<em>우체국 · 한진 · 롯데 파일을 그대로 올리면 송장번호가 자동으로 채워집니다</em></button></div>
      <p class="ways">② <b>한 번에 출고</b> — 아래 <b>출고 완료</b> 버튼 (송장 없이도 됩니다)<br>
         ③ <b>건별 출고</b> — 주문 카드 안의 <b>출고 완료로 표시</b> (송장을 직접 입력)</p>
      <input type="file" id="impFile" accept=".xlsx,.xls,.csv,text/csv" class="offscreen" tabindex="-1" aria-hidden="true">`;
  }
  /* ★ 여러 건 한 번에 — 체크한 게 있으면 그것만, 없으면 그 구획 전체 (24-bulk.js) */
  const bar = A.bulkBar(role, list);
  if (bar) head += `<p class="sect">한 번에 처리</p>` + bar;
  if (!list.length){
    box.innerHTML = head + `<p class="empty">${A.tabOf(role, all)!=="all"
      ? (A.tabOf(role, all)==="cust" ? "이 화면에 고객 주문이 없습니다." : "이 화면에 매대 주문이 없습니다.")
      : (role===1?"전자랜드에서 보낸 주문이 여기에 쌓입니다.":"더다움이 확인한 주문이 여기로 넘어옵니다.")}</p>`;
    bindBulk(role, list); return;
  }
  /* ★ 구획 — 2026-08-24 사용자 지시로 더다움을 세 칸으로 나눔.
     예전엔 "확인 대기" 한 칸에 엑셀 받은 것과 안 받은 것이 섞여 있어
     카드마다 배지를 읽어야 알 수 있었다.
     구획을 갈라 놓는다 — 한 목록에 섞이면 뭘 눌러야 할지 모른다.
     출고 완료는 트라이코지가 누르는 순간 두 화면에 같이 뜹니다(별도 확인 버튼 없음). */
  const G = role===1
    ? SEC1.map(([pred,label,hint],i)=>[pred,label,hint,i])
    : [[o=>o.status===1, "승인 대기", "", 0], [o=>o.status===2, "출고 대기", "", 1], [o=>o.status===3, "출고 완료", "", 2]];
  /* 체크는 화면 전체 기준으로 봅니다 — 어딘가 하나라도 체크했으면
     구획마다 "체크한 것만" 합칩니다. 구획별로 따로 보면 한쪽은 전체가 합쳐져 헷갈립니다. */
  const anySel = list.some(o => S.SEL.has(o.no));
  box.innerHTML = head + G.map(([pred,label,hint,i])=>{   /* head 에 이미 bar 가 들어 있습니다 */
    if (role === 1 && S.DSEC !== null && S.DSEC !== i) return "";   /* 대시보드에서 한 칸만 고른 상태 */
    const g = list.filter(pred);
    if (!g.length) return role === 1 && S.DSEC === i
      ? `<p class="empty">${label} 에 해당하는 주문이 없습니다.</p>` : "";
    const sect = `<p class="sect">${label} ${g.length}건${hint ? `<i>${hint}</i>` : ""}</p>`;
    /* ★ 묶음(o.mg)이 같은 것끼리 한 블럭으로. 화면용이 아니라 저장소에 남는 값이라
       미확인 → 확인 → 발송 → 주문내역까지 계속 묶인 채로 따라갑니다. */
    /* 그 구획 전용 막대 — 미확인엔 미확인 버튼만, 확인엔 확인 버튼만 */
    const key = role === 1 ? (i === 0 ? "un" : i === 1 ? "cf" : null) : null;
    return sect + (key ? A.stageBar(role, g, key) : "") + A.groupByMg(g).map(grp =>
      grp.length > 1 ? A.mergedCard(grp, role) : orderCard(grp[0], role)).join("");
  }).join("");
  bindBulk(role, list);
  if (role === 1) G.forEach(([pred,,,i]) => {
    const key = i === 0 ? "un" : i === 1 ? "cf" : null;
    if (key) A.bindStageBar(role, list.filter(pred), key);
  });
  /* 붙박이 구획 제목이 검은 머리 바로 아래에 오도록 실제 높이를 다시 잽니다.
     ⚠ 화면(전자랜드/더다움/트라이코지)마다 머리 높이가 다릅니다.
        한 번만 재두면 43px 틈이 생겨 카드가 그 사이로 비쳐 지나갑니다. */
  A.syncStick?.();
}
function bindBulk(role, list){
  A.bindBulkBar(role, list);                                   /* 24-bulk.js 가 다 합니다 */
  A.bindShipImport();                                          /* 25-ship-import.js */
}

function orderCard(o, role){
  return `
    <article class="order ${o.mode === "매대 보충" ? "mA" : "mB"}${o.status === 3 ? " shipped" : ""}">
      <div class="order-top">
        <div><h3><span class="mchip">${o.mode}</span>${o.no}${o.to ? " · " + esc(o.to.name) : ""}</h3><p class="meta">전자랜드 · ${o.at}</p></div>
        <span class="badges">
          ${o.status===0 ? `<span class="badge dl ${o.dl ? "yes" : "no"}">${o.dl ? "확인함" : "아직 미확인"}</span>${o.dl && o.xl ? `<span class="badge xl">엑셀 받음</span>` : ""}` : ""}
          <span class="badge ${STATUS[o.status].cls}">${STATUS[o.status].label}</span>
          ${A.selBox(o, role)}
        </span>
      </div>
      ${flowHtml(o.status)}
      ${o.reject ? `<p class="warn"><b>트라이코지 반려</b> — ${esc(o.reject)}</p>` : ""}
      ${o.to ? `<div class="ship-to top"><span class="eyebrow">받는 분</span><b>${esc(o.to.name)}</b> · ${esc(o.to.tel)}<br>${o.to.zip ? `[${esc(o.to.zip)}] ` : ""}${esc(o.to.addr)}${o.to.addr2 ? " " + esc(o.to.addr2) : ""}${o.to.memo?"<br>요청: "+esc(o.to.memo):""}</div>` : ""}
      <div class="xlwrap"><table class="xltab">
        <thead><tr><th>25자</th><th>영문 코드10자이내</th><th>바코드</th><th>이미지</th><th>상품명</th><th>기종</th><th>디자인</th><th>발주수량</th><th>샘플 지원</th>${
          role !== 0 && hasPrice(o) ? `<th class="pth">전자랜드<br>입고가</th><th class="pth">트라이코지<br>입고가</th>` : ""}</tr></thead>
        <tbody>${o.lines.map(l=>`<tr>
          <td class="c25">${esc(l.s || "")}</td>
          <td class="ccode">${esc(l.c || "")}</td>
          <td class="cbar">${l.b}</td>
          <td class="cimg">${l.img ? `<img src="${l.img}" alt="">` : ""}</td>
          <td class="cname">${esc(l.n || "")}</td>
          <td class="cmod">${esc(l.m || "")}</td>
          <td class="cdes">${esc(l.d || "")}</td>
          <td class="cqty">${l.q}</td>
          <td class="csmp"></td>${(()=>{
            if (role === 0 || !hasPrice(o)) return "";
            const p = priceOf(l.b) || {};
            return `<td class="cp">${p.e != null ? A.money(p.e) : "<i>—</i>"}</td>`
                 + `<td class="cp">${p.t != null ? A.money(p.t) : "<i>—</i>"}</td>`;
          })()}</tr>`).join("")}</tbody>
      </table></div>
      ${moneyRow(o, role)}
      <p class="xlnote">${o.lines.length} 품목 · 합계 ${o.lines.reduce((s,l)=>s+l.q,0)} 개${o.mode==="매대 보충" ? " · 소비자가 " + A.money(o.lines.reduce((s,l)=>s+(Number(String(l.p||"").replace(/[^0-9]/g,""))||0)*l.q,0)) : ""}</p>
      ${role===1 && o.status===0 && !o.dl ? `<div class="btns">
        <button class="act s1 sm" data-conf="${o.no}" type="button">✓ 확인<em>확인 칸으로 보냅니다</em></button>
      </div>` : ""}
      ${role===1 && o.status===0 && o.dl ? `<div class="btns">
        <button class="act s2 sm${o.xl ? " line" : ""}" data-form="${o.no}" data-mark="1">${o.xl ? "✓ 엑셀 다시 받기" : "① 엑셀 다운로드"}<em>${o.mode} 양식${o.xl ? " · 받았습니다" : ""}</em></button>
        <button class="act s2 sm" data-ok="${o.no}" type="button">② 트라이코지로 넘기기<em>넘기면 발송으로 갑니다</em></button>
      </div>
      <button class="act ghost sm back" data-unconf="${o.no}" type="button">↩ 미확인으로 되돌리기<em>다시 정리하려면 · 주문 내용은 그대로입니다</em></button>` : ""}
      ${role===1 && o.status>=1 ? `<button class="act ghost" type="button" disabled>${
        o.status===1 ? "트라이코지 승인 대기" : o.status===2 ? "트라이코지 승인 완료 · 출고 전" : "출고 완료"
      }</button>` : ""}
      ${role===2 && o.status===1 ? `<div class="btns">
        <button class="act sm" data-appr="${o.no}" type="button">최종 승인<em>되돌릴 수 없습니다</em></button>
        <button class="act ghost sm" data-rej="${o.no}" type="button">더다움에 반려<em>사유를 적어 되돌립니다</em></button>
      </div>` : ""}
      ${role===2 && o.status>=2 ? A.apprBtns(o.no, [o]) : ""}
      ${role===2 && o.status===2 ? `<button class="act shipout" data-done="${o.no}" type="button">출고 완료로 표시</button>` : ""}
      ${o.ship ? `<div class="trk"><span class="eyebrow">송장</span>${o.ship.no ? `<b>${esc([o.ship.co, o.ship.no].filter(Boolean).join(" "))}</b>` : `<b>${esc(o.ship.co || "")}</b> <i>번호 없음</i>`}${o.ship.img ? `<img src="${o.ship.img}" alt="송장 이미지">` : ""}</div>` : ""}
      ${role===0 ? `<div class="btns">
        <button class="act form sm" data-form="${o.no}" type="button">주문서 받기<em>더다움 자료와 동일</em></button>
        ${o.status===0
          ? `<button class="act ghost sm" data-undo="${o.no}" type="button">되돌리기<em>담았던 수량이 돌아옵니다</em></button>`
          : `<button class="act ghost sm" type="button" disabled>되돌리기<em>${STATUS[o.status].label} — 못 되돌립니다</em></button>`}
      </div>` : ""}
    </article>`;
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { STATUS, dashHtml, flowHtml, hasPrice, moneyRow, orderCard, priceOf, renderInbox, sums, won });
