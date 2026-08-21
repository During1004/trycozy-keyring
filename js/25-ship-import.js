/* ──────────────────────────────────────────────────────────
   25-ship-import.js
   송장 엑셀 올리기 — 우체국 · 한진 · 롯데 어느 양식이든

   왜 만들었나
     주문이 늘면 송장번호를 건건이 손으로 치는 게 제일 오래 걸립니다.
     택배사가 주는 출고 파일을 그대로 올리면 주문을 찾아 채워 넣습니다.

   어떻게 찾나 (위에서부터 순서대로)
     ① 주문번호가 있으면 그것으로
     ② 수령인 이름 + 전화 뒤 4자리
     ③ 수령인 이름만 (그 이름이 딱 하나일 때만)
     못 찾은 줄은 **건드리지 않고 목록으로 보여 줍니다.**

   ⚠ 열 이름은 택배사마다 다릅니다. 그래서 이름을 정해두지 않고
     "송장번호처럼 생긴 열" 을 찾아냅니다. 못 찾으면 사람이 고를 수 있게 물어봅니다.
   ────────────────────────────────────────────────────────── */
import { $, S, esc, A } from "./00-core.js";

/* ── 열 이름 알아보기 ───────────────────────────────────────
   ★ 위에서부터 먼저 맞는 것을 씁니다. 순서가 곧 우선순위입니다.

   왜 `고객주문번호` 가 맨 위인가 —
     우체국 파일에는 주문번호처럼 생긴 칸이 **둘**입니다.
       소포주문번호  = 우체국이 매긴 번호   ← 우리와 상관없음
       고객주문번호  = **우리가 넣은 번호** ← 이게 교집합입니다
     이 순서가 아니면 소포주문번호를 먼저 잡아 매칭이 통째로 어긋납니다. */
const PAT = [
  ["ord",  /고객\s*주문\s*번호|판매자\s*주문|셀러\s*주문|외부\s*주문|쇼핑몰\s*주문|주문자\s*주문/],
  ["no",   /운송장|송장\s*번호|등\s*기\s*번호|추적\s*번호|waybill|tracking|invoice\s*no/i],
  ["tel",  /전화|연락처|휴대|핸드폰|이동통신|모바일|\bhp\b|tel|phone/i],
  ["name", /수취인\s*명|수령인|받는\s*분|받는\s*사람|수하인|성명|고객\s*명|이름/],
  ["ord2", /주문\s*번호|order\s*no/i],          // 소포주문번호 등 — 위에서 못 찾았을 때만
  ["co",   /택배\s*사|배송\s*사|courier|배송\s*업체/i],
];
const norm = v => String(v ?? "").replace(/\s+/g, " ").trim();
const dig  = v => String(v ?? "").replace(/[^0-9]/g, "");

/* ── xlsx 읽기 — 쓰기만 하던 엔진의 반대쪽 ────────────────── */
/* ⚠ 엑셀 파일마다 한글을 그대로 쓰기도 하고 `&#48155;` 같은 숫자로 바꿔 쓰기도 합니다
   (openpyxl 로 만든 파일이 그렇습니다). 둘 다 풀어야 열 이름을 알아봅니다. */
const unesc = s => String(s)
  .replace(/&#x([0-9a-fA-F]+);/g, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g,          (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g,"<").replace(/&gt;/g,">")
  .replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,"&");
const colNo = ref => {                       // "AB12" → 27
  let n = 0;
  for (const ch of ref.replace(/[0-9]/g, "")) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
};
async function readXlsx(file){
  const zip = await JSZip.loadAsync(file);
  const strs = [];
  const ssf = zip.file("xl/sharedStrings.xml");
  if (ssf){
    const xml = await ssf.async("string");
    for (const m of xml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>/g))
      strs.push([...m[1].matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(t => unesc(t[1])).join(""));
  }
  let sheet = zip.file("xl/worksheets/sheet1.xml");
  if (!sheet){
    const any = Object.keys(zip.files).filter(n => /^xl\/worksheets\/.*\.xml$/.test(n)).sort();
    if (!any.length) throw new Error("엑셀 안에 시트가 없습니다");
    sheet = zip.file(any[0]);
  }
  const xml = await sheet.async("string");
  const rows = [];
  for (const r of xml.matchAll(/<row\b[^>]*>([\s\S]*?)<\/row>/g)){
    const cells = [];
    for (const c of r[1].matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)){
      const at = c[1], body = c[2];
      const ref = (at.match(/r="([A-Z]+\d+)"/) || [])[1];
      const t   = (at.match(/t="([^"]+)"/) || [])[1];
      let v = "";
      if (t === "inlineStr"){
        v = [...body.matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(x => unesc(x[1])).join("");
      } else {
        const raw = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        v = raw == null ? "" : (t === "s" ? (strs[+raw] ?? "") : unesc(raw));
      }
      cells[ref ? colNo(ref) : cells.length] = v;
    }
    rows.push([...cells].map(x => x == null ? "" : x));
  }
  return rows;
}
/* ── csv 읽기 — 택배사 파일은 EUC-KR 인 경우가 많습니다 ───── */
async function readCsv(file){
  const buf = new Uint8Array(await file.arrayBuffer());
  let txt = new TextDecoder("utf-8").decode(buf);
  if (/�/.test(txt)){
    for (const enc of ["euc-kr", "windows-949"]){
      try { const t = new TextDecoder(enc).decode(buf); if (!/�/.test(t)) { txt = t; break; } } catch (e) {}
    }
  }
  txt = txt.replace(/^﻿/, "");
  const rows = []; let row = [], cell = "", q = false;
  for (let i = 0; i < txt.length; i++){
    const ch = txt[i];
    if (q){
      if (ch === '"' && txt[i+1] === '"'){ cell += '"'; i++; }
      else if (ch === '"') q = false;
      else cell += ch;
    } else if (ch === '"') q = true;
    else if (ch === ","){ row.push(cell); cell = ""; }
    else if (ch === "\n"){ row.push(cell); rows.push(row); row = []; cell = ""; }
    else if (ch !== "\r") cell += ch;
  }
  if (cell !== "" || row.length){ row.push(cell); rows.push(row); }
  return rows;
}

/* ── 머리글 줄과 열 찾기 ──────────────────────────────────── */
function findCols(rows){
  let best = null;
  for (let r = 0; r < Math.min(rows.length, 20); r++){   // 우체국 파일은 7번째 줄이 머리글입니다
    const map = {}; let hit = 0;
    rows[r].forEach((h, i) => {
      const t = norm(h); if (!t) return;
      for (const [key, re] of PAT){
        if (map[key] == null && re.test(t)){ map[key] = i; hit++; break; }
      }
    });
    if (map.no != null && hit >= 2 && (!best || hit > best.hit)) best = { row: r, map, hit };
  }
  return best;
}

/* 파일에 택배사 칸이 없을 때 — 파일 이름과 열 이름으로 짐작합니다.
   `등기번호` 라는 열은 우체국 파일의 특징입니다. */
const CO_LIST = ["우체국", "한진택배", "롯데택배", "퀵발송"];
function guessCo(fname, headers){
  const t = (fname + " " + headers.join(" "));
  if (/우체국|등\s*기\s*번호|소포/.test(t)) return "우체국";
  if (/한진/.test(t)) return "한진택배";
  if (/롯데/.test(t)) return "롯데택배";
  return "";
}

/* ── 주문 찾기 ────────────────────────────────────────────── */
function matcher(){
  const cand = A.ORDERS.filter(o => o.status >= 1 && o.status <= 2);
  const byNo = new Map(), byNameTel = new Map(), byName = new Map();
  cand.forEach(o => {
    byNo.set(dig(A.orderNoFull(o)), o);
    if (o.to){
      const n = norm(o.to.name);
      const t4 = dig(o.to.tel).slice(-4);
      if (n && t4) byNameTel.set(n + "|" + t4, o);
      if (n){ if (byName.has(n)) byName.set(n, null); else byName.set(n, o); }   // 같은 이름 둘이면 못 씁니다
    }
  });
  return (ordNo, name, tel, ordNo2) => {
    if (ordNo){  const o = byNo.get(dig(ordNo));  if (o) return [o, "주문번호"]; }
    if (ordNo2){ const o = byNo.get(dig(ordNo2)); if (o) return [o, "주문번호"]; }
    const n = norm(name), t4 = dig(tel).slice(-4);
    if (n && t4){ const o = byNameTel.get(n + "|" + t4); if (o) return [o, "이름+전화"]; }
    /* ★ 전화번호가 파일에 **있는데 안 맞으면** 이름만으로 잇지 않습니다.
       동명이인에게 남의 송장이 붙는 사고를 막으려는 것입니다.
       전화 칸이 아예 비어 있을 때만 이름으로 찾습니다. */
    if (n && !t4){ const o = byName.get(n); if (o) return [o, "이름"]; }
    return [null, ""];
  };
}

/* ── 화면 ─────────────────────────────────────────────────── */
/* 파일 고르는 칸은 화면에 **붙박이로** 둡니다 (18-inbox.js 가 그립니다).
   그때그때 만들어 쓰면 브라우저에 따라 파일 창이 안 뜨는 일이 있었습니다. */
function bindShipImport(){
  const f = $("impFile"), b = $("impShip");
  if (!f || f.dataset.bound) { if (b && f) b.onclick = () => f.click(); return; }
  f.dataset.bound = "1";
  f.addEventListener("change", async () => {
    const file = f.files && f.files[0];
    f.value = "";                                   // 같은 파일을 다시 올려도 동작하게
    if (!file) return;
    try { await handle(file); }
    catch (e){
      console.error("[송장]", e);
      A.openSheet(`<b class="big">송장 파일을 처리하지 못했습니다</b>
        <p class="sum">${esc(file.name)}</p><p class="steps">${esc(e.message || e)}</p>`, ()=>{}, "", "닫기");
    }
  });
  if (b) b.onclick = () => f.click();
}
function openImport(){ const f = $("impFile"); if (f) f.click(); }

async function handle(file){
  let rows;
  try {
    rows = /\.csv$/i.test(file.name) ? await readCsv(file) : await readXlsx(file);
  } catch (e){
    return A.openSheet(`<b class="big">파일을 못 읽었습니다</b>
      <p class="sum">${esc(file.name)}</p>
      <p class="steps">${esc(e.message)}<br>xlsx 또는 csv 로 저장한 뒤 다시 올려주세요.</p>`,
      ()=>{}, "", "닫기");
  }
  const found = findCols(rows);
  if (!found) return A.openSheet(`<b class="big">송장번호 열을 못 찾았습니다</b>
    <p class="sum">${esc(file.name)} · ${rows.length}줄</p>
    <p class="steps">머리글에 <b>운송장번호</b>(또는 송장번호·등기번호) 같은 이름이 있어야 합니다.<br>
      첫 줄: ${esc(rows[0] ? rows[0].filter(Boolean).slice(0,8).join(" · ") : "(빈 파일)")}</p>`,
    ()=>{}, "", "닫기");

  const m = found.map, find = matcher();
  const hit = [], miss = [];
  for (let r = found.row + 1; r < rows.length; r++){
    const row = rows[r];
    const no = norm(row[m.no]);
    if (!no) continue;
    const name = m.name != null ? norm(row[m.name]) : "";
    const tel  = m.tel  != null ? norm(row[m.tel])  : "";
    const ord  = m.ord  != null ? norm(row[m.ord])  : "";
    const ord2 = m.ord2 != null ? norm(row[m.ord2]) : "";
    const co   = m.co   != null ? norm(row[m.co])   : "";
    const [o, how] = find(ord, name, tel, ord2);
    if (o) hit.push({ o, no, co, how });
    else   miss.push({ no, name, tel, ord });
  }
  preview(file.name, hit, miss, guessCo(file.name, rows[found.row] || []));
}
function preview(fname, hit, miss, guess){
  const co0 = hit.find(h => h.co)?.co || "";
  const tab = hit.slice(0, 12).map(h =>
    `<tr><td>${esc(h.o.to ? h.o.to.name : "매대 보충")}<i class="how">${esc(h.how)}</i>
         <b class="ono">${esc(A.orderNoFull(h.o))}</b></td>
         <td class="bar">${esc(h.no)}</td></tr>`).join("");
  const body = `<b class="big">송장 ${hit.length}건 찾음</b>
    <p class="sum">${esc(fname)}${miss.length ? ` · <b class="miss">못 찾음 ${miss.length}건</b>` : ""}</p>
    ${hit.length ? `<div class="imptab"><table class="xltab">
      <thead><tr><th>받는 분 · 주문번호</th><th>넣을 송장번호</th></tr></thead>
      <tbody>${tab}${hit.length > 12 ? `<tr><td colspan="2">… 그리고 ${hit.length - 12}건 더</td></tr>` : ""}</tbody>
    </table></div>` : `<p class="steps">채울 수 있는 줄이 없습니다.</p>`}
    ${miss.length ? `<p class="steps"><b>못 찾은 ${miss.length}건</b> — 이 줄은 <b>건드리지 않습니다</b>.<br>
      ${miss.slice(0,5).map(x=>esc([x.name, x.tel, x.no].filter(Boolean).join(" · "))).join("<br>")}
      ${miss.length > 5 ? `<br>… 그리고 ${miss.length - 5}건 더` : ""}</p>` : ""}
    ${!co0 && hit.length ? `<div class="trkrow"><label class="rejwrap co"><span>택배사${guess ? " (파일 이름·열 이름으로 짐작했습니다)" : " (파일에 없어서 물어봅니다)"}</span>
      <select id="impCo">${CO_LIST.map(c=>`<option${c===(guess||"롯데택배")?" selected":""}>${c}</option>`).join("")}</select></label></div>` : ""}
    ${hit.length ? `<label class="chk"><input type="checkbox" id="impDone" checked> 채우면서 <b>출고 완료</b> 로 바꾸기</label>` : ""}`;
  A.openSheet(body, () => {
    if (!hit.length) return;
    const co = co0 || ($("impCo")?.value || "");
    const done = $("impDone")?.checked;
    hit.forEach(h => {
      h.o.ship = { co: h.co || co, no: h.no, img: (h.o.ship && h.o.ship.img) || null };
      if (done) h.o.status = 3;
      A.store?.onPatch(h.o, done ? { status:3, ship:h.o.ship } : { ship:h.o.ship });   /* [저장소 고리] */
    });
    S.SEL.clear();
    A.renderInbox(1); A.renderInbox(2); A.renderMine(); A.showSent();
  }, hit.length ? "ac" : "", hit.length ? `${hit.length}건 채우기` : "닫기");
}


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { bindShipImport, openShipImport: openImport, readCsv, readXlsx });
