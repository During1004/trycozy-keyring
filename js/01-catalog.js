/* ──────────────────────────────────────────────────────────
   01-catalog.js
   상품 카탈로그 — data/catalog.json 을 읽어 84종을 만든다
   ────────────────────────────────────────────────────────── */
import { A } from "./00-core.js";
/* 상품 목록은 index.html 이 먼저 읽어 window.CATALOG 에 담아 둡니다.
   · 평소      : data/catalog.json 을 fetch
   · 단일 HTML : build.py 가 그 자리에 데이터를 통째로 박아 넣습니다
   그래서 이 파일은 fetch 를 하지 않습니다 — 읽는 시점이 어긋나지 않게 하려는 것입니다. */
export const CATALOG = globalThis.CATALOG || [];
if (!CATALOG.length) console.error(
  "[카탈로그] 상품 목록이 비었습니다. data/catalog.json 을 못 읽었거나 index.html 의 첫 script 가 빠졌습니다.");
const ALL   = CATALOG;
const ITEMS = ALL.filter(it => String(it.b||"").trim() && String(it.c||"").trim());
const WAIT  = ALL.filter(it => !(String(it.b||"").trim() && String(it.c||"").trim()));
/* 사진은 images/ 폴더에서 바코드 이름으로 읽습니다 (깃허브 배포용).
   파일명이 숫자뿐이라 한글·공백 인코딩 문제가 없습니다.
   ★ 단일 HTML(사진 포함)로 만들면 build.py 가 사진을 it.i 에 박아 넣고
     window.__INLINE_IMG 를 켭니다 — 그때는 폴더 대신 그 자료를 씁니다.
     (이게 없으면 사진 포함본인데도 사진이 안 보였습니다) */
const IMG = ITEMS.map(it => (globalThis.__INLINE_IMG && it.i)
  ? `data:image/webp;base64,${it.i}`
  : `images/${it.b}.png`);


/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { IMG, ITEMS, WAIT });
