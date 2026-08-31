/* ──────────────────────────────────────────────────────────
   24-bulk.js
   여러 건을 한 번에 — 체크박스 · 일괄 승인 · 일괄 출고 · 합본 받기

   ★ 규칙 하나만 기억하면 됩니다.
       체크한 게 있으면  → 체크한 것만
       하나도 없으면     → 그 구획 전체
     그래서 "전부 처리" 는 아무것도 안 고르고 그냥 누르면 됩니다.

   ⚠ 건별 버튼(카드 안)은 그대로 둡니다. 이건 그 위에 얹는 층입니다.
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";

/* ── 매대 / 고객 갈래 나누기 ────────────────────────────────
   ★ 화면만 나눕니다. 주문 자료 자체는 그대로 한 곳에 있습니다.
     보는 갈래를 바꾸면 아래 카드도, 체크박스도, 일괄 버튼도 **그 갈래만** 다룹니다.
     그래서 "전체 선택" 이 무엇을 고르는지 헷갈릴 일이 없습니다. */
const TABS = [["disp","매대"], ["cust","고객"], ["all","전체"]];
const inTab = (o, t) => t === "all" ? true : t === "cust" ? !!o.to : !o.to;
/* ⚠ 한 갈래뿐이면 탭을 안 그립니다. 그때 고른 갈래를 그대로 쓰면
   화면이 텅 비고 되돌릴 방법이 없습니다 — 그래서 "전체" 로 되돌립니다. */
function tabOf(role, all){
  const t = S.TAB[role] || "disp";
  if (!all) return t;
  const d = all.some(o=>!o.to), c = all.some(o=>o.to);
  return (d && c) ? t : "all";
}
const tabCut = (role, list) => list.filter(o => inTab(o, tabOf(role, list)));

/* 이 화면에서 아직 **내가 해야 할 일**이 남은 주문인가 */
function isTodo(role, o){
  if (+role === 0) return o.status < 3;                  // 전자랜드 — 출고 전이면 진행 중
  if (+role === 1) return o.status === 0;                // 더다움  — 확인 대기
  return o.status === 1 || o.status === 2;               // 트라이코지 — 승인 대기 · 출고 전
}
function tabBar(role, all){
  const has = { all: all.length, disp: all.filter(o=>!o.to).length, cust: all.filter(o=>o.to).length };
  if (!has.disp || !has.cust) return "";                 // 한 갈래뿐이면 탭이 필요 없습니다
  const todo = {
    all:  all.filter(o=>isTodo(role,o)).length,
    disp: all.filter(o=>!o.to && isTodo(role,o)).length,
    cust: all.filter(o=>o.to  && isTodo(role,o)).length,
  };
  const now = tabOf(role, all);
  return `<div class="kindtab" role="group" aria-label="갈래">` + TABS.map(([k,label]) =>
    `<button type="button" class="${todo[k] ? "has" : "clear"}" data-kind="${role}:${k}"${k===now ? ' aria-pressed="true"' : ''}>`
    + `${label}<b>${todo[k] ? todo[k] + " / " : ""}${has[k]}</b></button>`
  ).join("") + `</div>`;
}

/* ── 남은 일 / 다 끝남 을 한눈에 ────────────────────────────
   ★ 색으로 먼저 보이게 합니다. 숫자는 그 다음입니다.
     남았으면 분홍, 다 끝났으면 연한 초록. */
const WHO = { 0:["출고 전","전자랜드"], 1:["접수 대기","더다움"], 2:["승인·출고 대기","트라이코지"] };
function stateBanner(role, list){
  if (!list.length) return "";
  const todo = list.filter(o => isTodo(role, o));
  const [label] = WHO[+role] || ["대기",""];
  if (todo.length){
    const d = todo.filter(o=>!o.to).length, c = todo.filter(o=>o.to).length;
    return `<div class="stateban has">
      <b>남은 일 ${todo.length}건</b>
      <span>${label}${d&&c ? ` · 매대 ${d} · 고객 ${c}` : d ? ` · 매대 ${d}` : ` · 고객 ${c}`}</span></div>`;
  }
  const shipped = list.filter(o=>o.status===3).length;
  return `<div class="stateban done">
    <b>${shipped === list.length ? "모두 출고 완료" : "남은 일 없음"}</b>
    <span>${list.length}건${shipped === list.length ? " 전부 발송했습니다" : " 모두 다음 단계로 넘어갔습니다"}</span></div>`;
}
/* 갈래를 바꾸면 고른 것은 비웁니다 — 안 보이는 것이 골라진 채로 남으면 사고가 납니다 */
document.addEventListener("click", e => {
  const t = e.target.closest("[data-kind]");
  if (!t) return;
  const [role, kind] = t.dataset.kind.split(":");
  S.TAB[role] = kind;
  S.SEL.clear();
  redrawAll();
});

/* ── 고른 것 추리기 ───────────────────────────────────────── */
const pick = list => {
  const on = list.filter(o => S.SEL.has(o.no));
  return on.length ? on : list;
};
const isPicked = list => list.some(o => S.SEL.has(o.no));
const cnt = (list, all) => {
  const n = pick(list).length;
  return `${n}건${isPicked(list) ? " 선택" : ""}${all && !isPicked(list) ? " · 전체" : ""}`;
};

/* 카드 머리에 붙는 체크칸 */
function selBox(o, role){
  if (!canPick(o, role)) return "";
  return `<label class="selbox" title="한 번에 처리할 것 고르기">
    <input type="checkbox" data-sel="${esc(o.no)}"${S.SEL.has(o.no) ? " checked" : ""}></label>`;
}
/* 그 역할이 지금 이 주문에 대해 할 일이 있는가 */
function canPick(o, role){
  if (role === 0) return true;                 // 전자랜드 — 주문서는 언제든 다시 받습니다
  if (role === 1) return o.status === 0;       // 더다움  — 확인 대기만
  return o.status === 1 || o.status >= 2;      // 트라이코지 — 승인 대기 · 출고 전
}

/* ── 일괄 막대 ────────────────────────────────────────────── */
/* ⚠ 세 화면(전자랜드·더다움·트라이코지)이 동시에 그려져 있습니다.
   id 가 겹치면 엉뚱한 화면의 버튼이 잡히므로 **역할 번호를 뒤에 붙입니다.** */
const ID = (base, role, key) => base + role + (key || "");
function bulkBar(role, list){
  const able = list.filter(o => canPick(o, role));
  if (able.length < 2) return "";                       // 1건이면 카드 버튼으로 충분합니다
  const allOn = able.every(o => S.SEL.has(o.no));
  const head = `<div class="bulkhead">
      <label class="selbox all"><input type="checkbox" id="${ID("selAll",role)}"${allOn ? " checked" : ""}><b>전체 선택</b></label>
      <span id="${ID("selCnt",role)}">${isPicked(able) ? pick(able).length + "건 고름" : "고른 것 없음 — 누르면 전체 " + able.length + "건"}</span>
      ${isPicked(able) ? `<button type="button" class="lnk" id="${ID("selClear",role)}">선택 해제</button>` : ""}
    </div>`;

  let btns = "";
  /* 몇 개 파일로 나오는지 버튼에 적습니다 — 매대·고객이 섞여 있으면 파일이 둘입니다 */
  const files = l => { const d = l.filter(o=>!o.to).length, c = l.filter(o=>o.to).length;
                       return d && c ? "파일 2개 (매대 · 고객)" : c ? "고객 파일 1개" : "매대 파일 1개"; };
  if (role === 0){
    btns = `<button class="act form sm" id="${ID("bkMineDl",role)}" type="button">주문서 합본 받기<em>${cnt(able, 1)} · ${files(pick(able))}</em></button>`;
  }
  if (role === 1){
    /* ★ 2026-08-24 — 더다움은 위쪽 통합 막대를 쓰지 않습니다.
       구획(접수 전/넘길 것)마다 그 단계 버튼만 따로 답니다 → stageBar().
       한 줄에 5개가 몰려 있으면 어느 버튼이 어느 단계 것인지 알 수 없습니다. */
    return "";
  }
  if (role === 2){
    const wait = able.filter(o => o.status === 1);
    const appr = able.filter(o => o.status === 2);
    btns =
      `<button class="act sm" id="${ID("bkAppr",role)}" type="button"${pick(wait).length ? "" : " disabled"}>최종 승인<em>${wait.length ? cnt(wait, 1) : "승인 대기 없음"}</em></button>
       <button class="act ghost sm" id="${ID("bkShip",role)}" type="button"${pick(appr).length ? "" : " disabled"}>출고 완료<em>${appr.length ? cnt(appr, 1) : "승인된 건 없음"}</em></button>`;
  }
  return `<div class="bulkbox">${head}<div class="btns bulkbtns">${btns}</div></div>`;
}

/* ══════════════════════════════════════════════════════════════
   구획 전용 막대 (2026-08-24) — 더다움
   `① 접수 전` 위에는 접수 버튼만, `② 넘길 것` 위에는 넘기기 버튼만.
   체크칸도 그 구획 것만 켜고 끕니다.
   ══════════════════════════════════════════════════════════════ */
const STAGE = {
  un: { key:"un", tone:"s1", name:"접수 전" },
  cf: { key:"cf", tone:"s2", name:"넘길 것" },
};
function stageBar(role, g, key){
  const able = g.filter(o => canPick(o, role));
  /* ⚠ 주문 건수가 아니라 **블럭 개수**로 셉니다. 3건이 한 묶음이면 블럭은 1개 —
     그 블럭 안에 이미 버튼이 있으므로 막대는 군더더기입니다. */
  if ((A.groupByMg ? A.groupByMg(able).length : able.length) < 2) return "";
  const on    = able.filter(o => S.SEL.has(o.no));
  const sel   = on.length ? on : able;
  const allOn = able.every(o => S.SEL.has(o.no));
  const files = l => { const d = l.filter(o=>!o.to).length, c = l.filter(o=>o.to).length;
                       return d && c ? "파일 2개 (매대 · 고객)" : c ? "고객 파일 1개" : "매대 파일 1개"; };
  let btns = "";
  if (key === "un"){
    const mgAble = sel.filter(o => !o.to);
    btns = `<button class="act mgc sm" id="${ID("bkMerge",role,key)}" type="button"${mgAble.length >= 2 ? "" : " disabled"}>⊕ 합치기<em>${
        mgAble.length >= 2 ? mgAble.length + "건을 한 묶음으로" : "매대 2건 이상 골라 주세요"}</em></button>
      <button class="act s1 sm" id="${ID("bkConf",role,key)}" type="button">✓ 접수<em>${sel.length}건을 ② 넘길 것 으로</em></button>`;
  } else {
    const allXl = sel.every(o => o.xl);
    /* ↩ 미확인으로 는 **가끔 쓰는 수습 동작**이라 큰 버튼에서 뺐습니다 (2026-08-24 사용자 지시).
       한 번 잘못 누르면 여러 건이 통째로 되돌아가서 위험합니다. 머리줄 작은 링크로 내렸습니다. */
    btns = `<button class="act xlc sm${allXl ? " line" : ""}" id="${ID("bkDl",role,key)}" type="button">${
        allXl ? "✓ 엑셀 다시 받기" : "① 엑셀 다운로드"}<em>${sel.length}건 · ${files(sel)}${allXl ? " · 받았습니다" : ""}</em></button>
      <button class="act s2 sm" id="${ID("bkOk",role,key)}" type="button">② 트라이코지로 넘기기<em>${sel.length}건 넘김</em></button>`;
  }
  return `<div class="bulkbox ${STAGE[key].tone}">
      <div class="bulkhead">
        <label class="selbox all"><input type="checkbox" id="${ID("selAll",role,key)}"${allOn ? " checked" : ""}><b>전체 선택</b></label>
        <span id="${ID("selCnt",role,key)}">${on.length ? on.length + "건 고름" : "고른 것 없음 — 누르면 이 칸 전체 " + able.length + "건"}</span>
        ${on.length ? `<button type="button" class="lnk" id="${ID("selClear",role,key)}">선택 해제</button>` : ""}
        ${key === "cf" ? `<button type="button" class="lnk undo" id="${ID("bkUn",role,key)}">↩ ${sel.length}건 접수 전으로 되돌리기</button>` : ""}
      </div>
      <div class="btns bulkbtns">${btns}</div>
    </div>`;
}
function bindStageBar(role, g, key){
  const able = g.filter(o => canPick(o, role));
  if ((A.groupByMg ? A.groupByMg(able).length : able.length) < 2) return;
  const on  = able.filter(o => S.SEL.has(o.no));
  const sel = on.length ? on : able;
  const all = $(ID("selAll", role, key));
  if (all) all.onchange = () => { able.forEach(o => all.checked ? S.SEL.add(o.no) : S.SEL.delete(o.no)); redrawAll(); };
  const clr = $(ID("selClear", role, key));
  if (clr) clr.onclick = () => { able.forEach(o => S.SEL.delete(o.no)); redrawAll(); };
  const go = (base, fn) => { const b = $(ID(base, role, key)); if (b) b.onclick = () => fn(b); };
  go("bkMerge", () => A.askMerge(sel));
  go("bkConf",  () => A.askConfirm(sel));
  go("bkDl",    b => A.dlBulkForm(sel, b));
  go("bkOk",    () => askHandOver(sel));
  go("bkUn",    () => A.askUnconfirm(sel));
}

/* ── 클릭 연결 ────────────────────────────────────────────── */
function bindBulkBar(role, list){
  const able = list.filter(o => canPick(o, role));
  const redraw = () => { redrawAll(); };

  const all = $(ID("selAll", role));
  if (all) all.onchange = () => {
    able.forEach(o => all.checked ? S.SEL.add(o.no) : S.SEL.delete(o.no));
    redraw();
  };
  const clr = $(ID("selClear", role));
  if (clr) clr.onclick = () => { S.SEL.clear(); redraw(); };

  const go = (base, fn) => { const b = $(ID(base, role)); if (b) b.onclick = () => fn(b); };

  go("bkMineDl", b => A.dlBulkForm(pick(able), b, true));
  /* 막대에 그릴 때와 **똑같은 기준**으로 골라야 버튼 글자와 실제 동작이 안 어긋납니다 */
  const anySel = able.some(o => S.SEL.has(o.no));
  const take = l => anySel ? l.filter(o => S.SEL.has(o.no)) : l;
  const stage = (dl) => take(able.filter(o => o.status === 0 && !!o.dl === dl));
  go("bkDl",     b => A.dlBulkForm(stage(true), b));
  go("bkOk",     () => askHandOver(stage(true)));
  go("bkMerge",  () => A.askMerge(stage(false)));
  go("bkConf",   () => A.askConfirm(stage(false)));
  go("bkUn",     () => A.askUnconfirm(stage(true)));
  go("bkAppr",   () => askApproveMany(pick(able.filter(o => o.status === 1))));
  go("bkShip",   () => askShipMany(pick(able.filter(o => o.status === 2))));
}
/* 세 화면을 같이 다시 그립니다 — 한 곳에서 고르면 다른 화면 숫자도 맞아야 합니다 */
function redrawAll(){ A.renderInbox(1); A.renderInbox(2); A.renderMine(); }

/* 체크칸은 화면 어디에 있든 한 곳에서 받습니다 */
document.addEventListener("change", e => {
  const c = e.target.closest("[data-sel]");
  if (!c) return;
  c.checked ? S.SEL.add(c.dataset.sel) : S.SEL.delete(c.dataset.sel);
  redrawAll();
});

/* ── ② 트라이코지로 넘기기 ────────────────────────────────── */
function askHandOver(list){
  if (!list.length) return;
  /* ★ 2026-08-24 — 엑셀 게이트를 되살리지 않고 **알려만 줍니다** (사용자 결정).
     `✓ 확인` 이 이미 "봤다" 는 게이트라 게이트를 두 겹으로 두면 답답합니다.
     다만 기록(엑셀) 없이 넘어가면 나중에 되짚기 어려우니 한 줄 띄웁니다.
     ⚠ 넘기기는 **되돌릴 수 없습니다** — 그래서 엑셀 받기와 한 버튼으로 묶지 않았습니다. */
  const noXl = list.filter(o => !o.xl);
  A.openSheet(`<b class="big">트라이코지로 넘기기</b>
    <p class="sum"><b>${list.length}</b> 건을 넘깁니다.</p>
    ${listHtml(list)}
    ${noXl.length ? `<p class="warn nox"><b>⚠ 엑셀을 아직 안 받으셨습니다</b> — ${noXl.length}건.<br>
       넘기고 나면 이 화면에서 <b>③ 넘김</b> 으로 옮겨갑니다. 지금 받아두시는 걸 권합니다.</p>` : ""}
    <p class="ask">넘기면 <b>되돌릴 수 없습니다.</b> 넘길까요?</p>`,
    () => {
      list.forEach(o => { o.status = 1; A.store?.onPatch(o, {status:1}); });   /* [저장소 고리] */
      S.SEL.clear();
      A.renderInbox(1); A.renderInbox(2); A.showSent(); A.renderMine();
      A.notice?.(`✓ ${list.length}건을 트라이코지로 넘겼습니다 · ③ 넘김`);
    }, "ac", "넘기기");
}

/* ── 일괄 최종 승인 ───────────────────────────────────────── */
function askApproveMany(list){
  if (!list.length) return;
  const n = list.reduce((s,o)=>s+o.lines.reduce((t,l)=>t+l.q,0), 0);
  A.openSheet(`<b class="big">최종 승인 ${list.length}건</b>
    <p class="sum">품목 합계 <b>${n}</b> 개 · 매대 ${list.filter(o=>!o.to).length}건 · 고객 ${list.filter(o=>o.to).length}건</p>
    ${listHtml(list)}
    <p class="ask">승인하면 되돌릴 수 없습니다. 승인할까요?</p>`,
    () => {
      list.forEach(o => { o.status = 2; A.store?.onPatch(o, {status:2}); });   /* [저장소 고리] */
      S.SEL.clear();
      A.renderInbox(1); A.renderInbox(2); A.renderMine();
    }, "ac", `${list.length}건 승인`);
}

/* ── 일괄 출고 완료 ───────────────────────────────────────────
   ★ 고객건 송장은 사람마다 다릅니다. 여기서 넣는 송장은 **매대건에만** 붙입니다.
     고객건은 이미 채워진 송장(송장 엑셀 올리기)이 있으면 그대로 두고, 없으면 비웁니다.
     — 잘못된 송장이 고객에게 붙는 사고를 막으려는 것입니다. */
function askShipMany(list){
  if (!list.length) return;
  const disp = list.filter(o => !o.to), cust = list.filter(o => o.to);
  const noTrk = cust.filter(o => !(o.ship && o.ship.no));
  A.openSheet(`<b class="big">출고 완료 ${list.length}건</b>
    <p class="sum">매대 ${disp.length}건 · 고객 ${cust.length}건</p>
    ${disp.length ? `<div class="trkrow">
      <label class="rejwrap co"><span>택배사 (매대건)</span>
        <select id="bkCo"><option>롯데택배</option><option>우체국</option><option>한진택배</option><option>퀵발송</option></select></label>
      <label class="rejwrap no"><span>송장번호 (매대건 공통 · 비워도 됩니다)</span>
        <input id="bkNo" placeholder="1234-5678-9012" inputmode="numeric" autocomplete="off"></label>
    </div>` : ""}
    ${cust.length ? `<p class="steps"><b>고객건 ${cust.length}건</b> 은 사람마다 송장이 달라 여기서 넣지 않습니다.
      ${noTrk.length ? `아직 송장이 없는 <b>${noTrk.length}건</b> 은 송장 없이 출고 완료가 됩니다 —
        <b>송장 엑셀 올리기</b> 를 먼저 하시면 자동으로 채워집니다.` : `${cust.length}건 모두 송장이 들어 있습니다 ✓`}</p>` : ""}
    ${listHtml(list)}
    <p class="ask">출고 완료로 바꿀까요?</p>`,
    () => {
      const co = $("bkCo")?.value || "";
      const no = ($("bkNo")?.value || "").trim();
      list.forEach(o => {
        if (!o.to && no) o.ship = { co, no, img: null };     // 매대건에만 공통 송장
        o.status = 3;
        A.store?.onPatch(o, {status:3, ship:o.ship});        /* [저장소 고리] */
      });
      S.SEL.clear();
      A.renderInbox(1); A.renderInbox(2); A.renderMine(); A.showSent();
    }, "", `${list.length}건 출고 완료`);
}

/* 시트 안에 "무엇을 처리하는지" 를 보여 줍니다 — 눈으로 확인하고 누르라고 */
function listHtml(list){
  const row = o => `<li><b>${esc(A.orderNoFull(o))}</b> <i>${o.to ? "고객 · " + esc(o.to.name) : "매대"}</i>
    <span>${o.lines.length}품목 ${o.lines.reduce((s,l)=>s+l.q,0)}개</span></li>`;
  const head = list.slice(0, 8).map(row).join("");
  return `<ul class="picklist">${head}${list.length > 8 ? `<li class="more">… 그리고 ${list.length - 8}건 더</li>` : ""}</ul>`;
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { askApproveMany, askHandOver, askShipMany, bindBulkBar, bindStageBar, bulkBar, canPick, isTodo, listHtml, pickSel: pick, selBox, stageBar, stateBanner, tabBar, tabCut, tabOf });
