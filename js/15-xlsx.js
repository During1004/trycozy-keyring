/* ──────────────────────────────────────────────────────────
   15-xlsx.js
   XLSX 빌더 — 브라우저에서 엑셀 파일을 직접 만든다
   ────────────────────────────────────────────────────────── */
import { A } from "./00-core.js";
/* ══════════════════════════════════════════════════════════════
   XLSM 빌더 — Base.xlsm 에 주문서 시트만 끼워 넣는다 (VBA 무손상)
   ══════════════════════════════════════════════════════════════ */
const XLSXW = (() => {
  const x = s => String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const col = i => "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i];
  const CT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Default Extension="png" ContentType="image/png"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/><Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/></Types>`;
  const RELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/></Relationships>`;
  const WBRELS = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`;
  const STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="4"><font><sz val="11"/><color rgb="FF16181C"/><name val="맑은 고딕"/><family val="2"/><charset val="129"/></font><font><b/><sz val="14"/><color rgb="FF16181C"/><name val="맑은 고딕"/><charset val="129"/></font><font><b/><sz val="10"/><color rgb="FF16181C"/><name val="맑은 고딕"/><charset val="129"/></font><font><sz val="10"/><color rgb="FF000000"/><name val="맑은 고딕"/><family val="2"/><charset val="129"/></font></fonts><fills count="4"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFEFF1FB"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFFFCCCC"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFC4CAD0"/></left><right style="thin"><color rgb="FFC4CAD0"/></right><top style="thin"><color rgb="FFC4CAD0"/></top><bottom style="thin"><color rgb="FFC4CAD0"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="49" fontId="3" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf><xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="표준" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
  const CORE = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:creator>키링주문</dc:creator><cp:lastModifiedBy>키링주문</cp:lastModifiedBy></cp:coreProperties>`;
  const APP = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>TRYCOZY Order Web</Application></Properties>`;
  function sheetXml(opt){
    const H = opt.headers, W = opt.widths || [];
    const num = new Set(opt.numCols || []), txt = new Set(opt.textCols || []);
    const top = opt.noTitle ? 1 : 2;                  // 머리글이 있는 행
    const pink = opt.pinkCols ? new Set(opt.pinkCols) : null;
    const hstyle = i => pink ? (pink.has(i) ? 5 : 7) : (opt.pinkHead ? 5 : 2);
    const rowH = opt.rowH || 0;                       // 사진이 들어가는 시트는 행을 높입니다
    const row = (r, vals, st) => `<row r="${r}"${r<=top?' ht="'+(r===top?20:24)+'" customHeight="1"':(rowH?' ht="'+rowH+'" customHeight="1"':'')}>` + vals.map((v,i)=>{
      if (v === "" || v == null) return "";
      const ref = col(i)+r;
      if (r>top && num.has(i)) return `<c r="${ref}" s="4"><v>${Number(v)||0}</v></c>`;
      if (r>top && txt.has(i)) return `<c r="${ref}" s="6" t="inlineStr"><is><t>${x(v)}</t></is></c>`;
      return `<c r="${ref}" s="${st}" t="inlineStr"><is><t xml:space="preserve">${x(v)}</t></is></c>`;
    }).join("") + `</row>`;
    const headRow = r => `<row r="${r}" ht="20" customHeight="1">` + H.map((v,i)=>
        `<c r="${col(i)}${r}" s="${hstyle(i)}" t="inlineStr"><is><t>${x(v)}</t></is></c>`).join("") + `</row>`;
    const body = (opt.noTitle ? [headRow(1)] : [row(1,[opt.title],1), headRow(2)])
      .concat(opt.rows.map((r,i)=>row(top+1+i, r, 3)));
    const last = top + opt.rows.length;
    const cols = W.length ? `<cols>${W.map((w,i)=>`<col min="${i+1}" max="${i+1}" width="${w}" customWidth="1"/>`).join("")}</cols>` : "";
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:${col(H.length-1)}${last}"/><sheetViews><sheetView${opt.tab===false?"":' tabSelected="1"'} workbookViewId="0"><pane ySplit="${top}" topLeftCell="A${top+1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${top+1}" sqref="A${top+1}"/></sheetView></sheetViews><sheetFormatPr defaultRowHeight="16.5"/>${cols}<sheetData>${body.join("")}</sheetData><pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/>${opt.__draw ? '<drawing r:id="rIdD"/>' : ""}</worksheet>`;
  }
  /* sheets: [{sheetName,title,headers,rows,widths,numCols}, ...]
     ★ THE_BACODE 엔진은 첫 번째 시트만 읽는다(sheet_name=0).
        두 번째 배송정보 시트를 붙여도 파싱에 영향 없음. */
  /* ── 사진 붙이기 ────────────────────────────────────────────
     엑셀은 "셀 안의 그림"이 아니라 **셀 위에 떠 있는 그림**만 표준으로 지원합니다.
     그래서 xl/media 에 png 를 넣고 xl/drawings 로 그 셀 위치에 앉힙니다.
     (Excel · LibreOffice · 구글시트 모두 이 방식으로 보입니다)
     같은 상품이 여러 줄에 나와도 png 는 **한 장만** 넣고 재사용합니다. */
  const PX = 9525;                       // 1픽셀 = 9525 EMU
  const IMG_PX = 72;                     // 넣을 사진 크기
  async function build(sheets){
    if (!Array.isArray(sheets)) sheets = [sheets];

    /* 1) 쓰이는 사진 주소를 모아 한 번씩만 내려받습니다 */
    const urls = [...new Set(sheets.flatMap(s => (s.imgs || []).filter(Boolean)))];
    const bytes = new Map();
    await Promise.all(urls.map(async u => {
      const b = await A.imgBytes(u);
      if (b) bytes.set(u, b);
    }));
    const mediaNo = new Map();           // 주소 → xl/media/imageN.png 의 N
    urls.forEach(u => { if (bytes.has(u)) mediaNo.set(u, mediaNo.size + 1); });

    const zip = new JSZip();
    mediaNo.forEach((n, u) => zip.file(`xl/media/image${n}.png`, bytes.get(u)));

    /* 2) 시트마다 그림 배치도를 만듭니다 */
    const draws = [];                    // [{i, xml, rels}]
    sheets.forEach((s, i) => {
      const imgs = s.imgs || [];
      if (!s.imgs || !imgs.some(u => u && mediaNo.has(u))) return;
      const top = s.noTitle ? 1 : 2;
      const c   = s.imgCol == null ? 0 : s.imgCol;
      const used = new Map();            // 이 시트가 쓰는 주소 → rId 번호
      const anchors = [];
      imgs.forEach((u, r) => {
        if (!u || !mediaNo.has(u)) return;
        if (!used.has(u)) used.set(u, used.size + 1);
        const id = anchors.length + 1;
        anchors.push(
          `<xdr:oneCellAnchor><xdr:from><xdr:col>${c}</xdr:col><xdr:colOff>${30*PX}</xdr:colOff>`
        + `<xdr:row>${top + r}</xdr:row><xdr:rowOff>${4*PX}</xdr:rowOff></xdr:from>`
        + `<xdr:ext cx="${IMG_PX*PX}" cy="${IMG_PX*PX}"/>`
        + `<xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${id}" name="p${id}"/>`
        + `<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>`
        + `<xdr:blipFill><a:blip r:embed="rId${used.get(u)}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>`
        + `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${IMG_PX*PX}" cy="${IMG_PX*PX}"/></a:xfrm>`
        + `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`);
      });
      if (!anchors.length) return;
      s.__draw = true;
      if (!s.rowH) s.rowH = 60;          // 사진이 들어가면 행을 높여야 보입니다
      const n = draws.length + 1;
      draws.push({ i, n,
        xml: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${anchors.join("")}</xdr:wsDr>`,
        rels: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
          + [...used.entries()].map(([u, rid]) =>
              `<Relationship Id="rId${rid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${mediaNo.get(u)}.png"/>`).join("")
          + `</Relationships>` });
    });

    /* 3) 나머지 뼈대 */
    zip.file("[Content_Types].xml",
      CT.replace(/<\/Types>/, sheets.slice(1).map((_,i)=>
        `<Override PartName="/xl/worksheets/sheet${i+2}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")
        + draws.map(d=>`<Override PartName="/xl/drawings/drawing${d.n}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`).join("")
        + `</Types>`));
    zip.file("_rels/.rels", RELS);
    zip.file("docProps/core.xml", CORE);
    zip.file("docProps/app.xml", APP);
    /* ★★ 2026-08-31 — `<bookViews><workbookView/></bookViews>` 를 반드시 넣습니다.
       시트의 `<sheetView workbookViewId="0">` 이 이걸 가리키는데 없으면,
       엑셀이 **"이 작업은 다중 선택 범위에서 작동하지 않습니다"** 를 내며
       **시트 추가·복사·일부 편집이 막힙니다.** (업체 신고 → 같은 증상을 겪은 xlsx 라이브러리 사례로 확인)
       ⚠ `<bookViews>` 는 `<sheets>` **앞**에 와야 합니다. 순서를 바꾸지 마세요. */
    zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="25600" windowHeight="15000" activeTab="0"/></bookViews><sheets>`
      + sheets.map((s,i)=>`<sheet name="${x(s.sheetName)}" sheetId="${i+1}" r:id="rId${i+1}"/>`).join("")
      + `</sheets></workbook>`);
    zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">`
      + sheets.map((_,i)=>`<Relationship Id="rId${i+1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i+1}.xml"/>`).join("")
      + `<Relationship Id="rIdS" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    zip.file("xl/styles.xml", STYLES);
    draws.forEach(d => {
      zip.file(`xl/drawings/drawing${d.n}.xml`, d.xml);
      zip.file(`xl/drawings/_rels/drawing${d.n}.xml.rels`, d.rels);
      zip.file(`xl/worksheets/_rels/sheet${d.i+1}.xml.rels`, `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdD" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${d.n}.xml"/></Relationships>`);
    });
    sheets.forEach((s,i)=> zip.file(`xl/worksheets/sheet${i+1}.xml`, sheetXml(s)));
    return await zip.generateAsync({type:"blob", mimeType:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression:"DEFLATE"});
  }
  return { build };
})();

/* ── 사진 바이트 읽기 — 한 번 읽으면 기억합니다 ────────────
   file:// 로 열면 브라우저가 fetch 를 막습니다. 그때는 사진 없이 만들고
   콘솔에만 알립니다 — 파일이 안 만들어지는 것보다 낫습니다.
   (단일 HTML 로 쓸 때도 사진을 넣으려면 `주문화면_열기.bat` 으로 여세요) */
/* 엑셀이 확실히 읽는 그림은 PNG 입니다. WEBP·JPEG 이면 그 자리에서 PNG 로 바꿉니다
   (단일 HTML '사진 포함' 은 WEBP 로 박혀 있습니다) */
async function toPng(b){
  if (b[0] === 0x89 && b[1] === 0x50) return b;            // 이미 PNG
  const bmp = await createImageBitmap(new Blob([b]));
  const cv = document.createElement("canvas");
  cv.width = bmp.width; cv.height = bmp.height;
  cv.getContext("2d").drawImage(bmp, 0, 0);
  const blob = await new Promise(r => cv.toBlob(r, "image/png"));
  return new Uint8Array(await blob.arrayBuffer());
}
const IMGCACHE = new Map();
async function imgBytes(url){
  if (!url) return null;
  if (IMGCACHE.has(url)) return IMGCACHE.get(url);
  let out = null;
  try {
    const r = await fetch(url);
    if (r.ok) out = await toPng(new Uint8Array(await r.arrayBuffer()));
  } catch (e) { /* file:// · 네트워크 차단 */ }
  if (!out) console.warn("[엑셀] 사진을 못 읽었습니다 — 그 칸은 비웁니다:", url);
  IMGCACHE.set(url, out);
  return out;
}

/* ── 템플릿 · 저장 ─────────────────────────────────────────── */
function saveBlob(blob, filename){
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob); a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(()=>URL.revokeObjectURL(a.href), 4000);
}
async function run(btn, done, fn){
  const old = btn.innerHTML; btn.disabled = true; btn.textContent = "만드는 중…";
  try { await fn(); btn.textContent = done; setTimeout(()=>{ btn.innerHTML = old; btn.disabled = false; }, 2200); }
  catch(err){ btn.textContent = "실패 — " + err.message; btn.disabled = false; console.error(err); }
}

/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { XLSXW, imgBytes, run, saveBlob });
