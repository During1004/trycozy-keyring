/* ──────────────────────────────────────────────────────────
   00-core.js
   모든 파일이 같이 쓰는 것 — 여기만 다른 파일을 import 하지 않습니다.
   ① $ · esc  짧은 도우미
   ② S        "바뀌는 값" 한 뭉치 (다른 파일에서 값을 바꿔도 같이 보임)
   ③ A        파일끼리 서로를 부르는 창구. `A.refresh()` 처럼 씁니다.
              각 파일 맨 끝의 Object.assign(A, {...}) 이 등록하는 자리입니다.
   ⚠ 순환 참조가 생기지 않게 하는 장치입니다. 여기에 화면 코드를 넣지 마세요.
   ────────────────────────────────────────────────────────── */
export const $ = id => document.getElementById(id);
export const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

/* 여러 파일이 같이 쓰는 "바뀌는 값" 한 곳 — 여기 말고 다른 데서 만들지 마세요. */
export const S = {
  PAGE: "A",          // 현재 주문 페이지 "A"=매대 보충 / "B"=개인 배송
  SEL: new Set(),     // 접수함에서 체크한 주문번호. 비어 있으면 "그 구획 전체" 로 봅니다
  TAB: {0:"disp", 1:"disp", 2:"disp"},  // 화면마다 보고 있는 갈래 "disp"(매대) | "cust"(고객) | "all"
                      // ★ 매대로 시작합니다 — 매대 보충이 매일 도는 일이라 기본값입니다
  FILTER: "",         // 목록 필터 "" | "__picked" | 시리즈명
  FIND: "",           // 찾기 입력값
  BULK: null,         // OR 일괄검색 결과 (담긴 것들의 번호 Set). null 이면 안 쓰는 중
  MERGE: false,       // 더다움 화면 "합쳐 보기" — 매대 주문 여러 건을 한 블럭으로
  draftReady: false,  // 작성 중 주문 자동보관 준비됨
  scanBuf: "",        // 바코드 리더가 흘려보낸 글자 버퍼
  physKeys: false,    // 물리 키보드(스캐너) 입력이 확인됨
  seq: 1,             // 주문번호 일련번호
  LAST: null,         // 방금 보낸 주문 (되돌리기 대상)
  SHIPIMG: null,      // 출고 송장 캡처 (dataURL)
  SUB: "order",       // 전자랜드 화면 안 — "order" | "mine"
  SUB1: "work",       // 더다움 화면 안 — "work"(처리할 것) | "hist"(주문 내역)
};

/* 파일끼리 부르는 창구 */
export const A = {};

/* 브라우저 콘솔(F12)에서 들여다볼 수 있게 열어 둡니다.
   예) A.store.logout()  ·  A.ORDERS  ·  S.PAGE
   ⚠ 화면 코드에서는 window.A 를 쓰지 마세요. import 한 A 를 쓰세요. */
if (typeof window !== "undefined") { window.A = A; window.S = S; }
