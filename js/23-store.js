/* ──────────────────────────────────────────────────────────
   23-store.js
   저장소(Supabase) 연결 — config.js 를 비워두면 아무 일도 하지 않습니다.

   하는 일 네 가지
     ① 22-auth.js 의 로그인이 끝나기를 기다리고
     ② 처음에 주문을 통째로 읽어오기 + 몇 초마다 다시 읽기
     ③ 주문이 새로 생기거나 상태가 바뀌면 저장소에 반영
     ④ 역할(전자랜드/더다움/트라이코지)을 프로필이 알려준 값으로 고정

   다른 파일에서는 `A.store?.onNew(o)` 처럼 **물음표를 붙여** 부릅니다.
   저장소가 꺼져 있으면 그 줄은 그냥 지나갑니다 — 화면 코드는 손댈 일이 없습니다.

   ⚠ 로그인·토큰은 여기서 다루지 않습니다. 전부 22-auth.js 몫입니다.
   ────────────────────────────────────────────────────────── */
import { A, S, $ } from "./00-core.js";
import { SUPABASE, STORE } from "./config.js";

/* 키를 직접 다루지 않습니다 — 22-auth.js 가 헤더를 만들어 줍니다 */
const STORE_ON = !!(SUPABASE.url && (SUPABASE.key || SUPABASE.anonKey));
if (!STORE_ON) {
  console.info("[저장소] 꺼져 있습니다 — 브라우저 메모리로만 돕니다. " +
               "켜려면 js/config.js 의 SUPABASE 를 채우세요.");
  /* 로그인도 저장소도 없으면 기다릴 게 없습니다 — 첫 화면 가림막을 바로 걷습니다 */
  try { window.__ready && window.__ready(); } catch (e) {}
}

const slog = (...a) => { if (STORE.debug) console.log("[저장소]", ...a); };

/* ── 표 이름 ─────────────────────────────────────────────
   05_저장소_SUPABASE\sql\01_스키마.sql 과 글자가 같아야 합니다. */
const T_ORDER = "주문";
const T_PRICE = "가격";      /* 입고가. 전자랜드에게는 RLS 가 한 줄도 안 줍니다 */
const T_LINE  = "주문줄";
const RPC_NO  = "새주문번호";

let ACC   = null;     // 프로필 { id, 역할, 주문처, 이름 }
let timer = null;
let busy  = false;    // 겹쳐 읽기 방지

/* ══════════════════════════════════════════════════════════
   통신 — PostgREST 로 그대로 부릅니다 (SDK 없이 fetch 만 씁니다)
   ⚠ 헤더는 22-auth.js 가 만듭니다. 커스텀 헤더를 쓰지 않습니다
      (apikey · Authorization · Content-Type 만 — CORS 위험 없음)
   ══════════════════════════════════════════════════════════ */
async function rest(path, opts) {
  const headers = await A.auth.headers(opts && opts.headers);
  const r = await fetch(SUPABASE.url.replace(/\/+$/, "") + "/rest/v1/" + path,
                        Object.assign({ headers }, opts));
  const text = await r.text();
  if (!r.ok) {
    if (r.status === 401) { console.warn("[저장소] 세션이 만료된 듯합니다"); }
    throw new Error("저장소 오류 " + r.status + " · " + text.slice(0, 200));
  }
  return text ? JSON.parse(text) : null;
}

const rpc = (name, args) =>
  rest("rpc/" + name, { method: "POST", body: JSON.stringify(args || {}) });

/* ══════════════════════════════════════════════════════════
   주문 한 건 ↔ 표 두 개 옮겨 담기
   ══════════════════════════════════════════════════════════ */
const orderRow = o => ({
  주문번호: o.no,
  주문일시: o._iso || new Date().toISOString(),
  주문처:   (ACC && ACC.주문처) || "전자랜드",
  유형:     o.to ? "개인" : "매대",
  상태:     o.status | 0,
  자료받음: !!o.dl,        /* ★ 뜻 바뀜: 엑셀 받음 → 더다움이 확인함 */
  묶음:     o.mg || null,
  엑셀받음: !!o.xl,
  수령인:   o.to ? o.to.name  : null,
  전화:     o.to ? o.to.tel   : null,
  우편번호: o.to ? o.to.zip   : null,
  주소:     o.to ? o.to.addr  : null,
  주소상세: o.to ? o.to.addr2 : null,
  요청사항: o.to ? o.to.memo  : null,
  택배사:   o.ship ? o.ship.co  : null,
  송장번호: o.ship ? o.ship.no  : null,
  송장이미지: o.ship ? o.ship.img : null,
  확인메모: o.reject || null,
});

const lineRows = o => o.lines.map((l, i) => ({
  주문번호: o.no,
  순번:     i + 1,
  바코드:   l.b,
  상품코드: l.c || null,
  표기명:   l.s || null,
  상품명:   l.n || null,
  기종:     l.m || null,
  디자인:   l.d || null,
  주문수량: l.q | 0,
  확정수량: l.q | 0,        // ⚠ 더다움 수량 수정을 붙일 때 이 칸만 바꿉니다. 주문수량은 그대로 둡니다
}));

/* 표 두 개 → 화면이 쓰는 주문 한 건 */
function toOrder(r) {
  const idxOf = b => A.ITEMS.findIndex(it => it.b === String(b));
  const lines = (r[T_LINE] || [])
    .slice()
    .sort((x, y) => (x.순번 || 0) - (y.순번 || 0))
    .map(L => {
      const i = idxOf(L.바코드);
      const base = i >= 0 ? A.ITEMS[i] : { b: L.바코드, c: L.상품코드, s: L.표기명, n: L.상품명, m: L.기종, d: L.디자인, p: "" };
      return Object.assign({}, base, {
        idx: i,
        img: i >= 0 ? A.IMG[i] : "",
        q:  (L.확정수량 == null ? L.주문수량 : L.확정수량) | 0,
        q0: L.주문수량 | 0,
      });
    });
  const d = new Date(r.주문일시);
  const p2 = n => String(n).padStart(2, "0");
  return {
    no: r.주문번호,
    at: d.toLocaleString("ko-KR", { month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }),
    mmdd: p2(d.getMonth() + 1) + p2(d.getDate()),
    yyyymmdd: String(d.getFullYear()) + p2(d.getMonth() + 1) + p2(d.getDate()),
    mode: r.유형 === "개인" ? "개인 배송" : "매대 보충",
    to: r.유형 === "개인"
      ? { name: r.수령인 || "", tel: r.전화 || "", zip: r.우편번호 || "",
          addr: r.주소 || "", addr2: r.주소상세 || "", memo: r.요청사항 || "" }
      : null,
    lines,
    status: r.상태 | 0,
    dl: !!r.자료받음,
    mg: r.묶음 || null,
    xl: !!r.엑셀받음,
    ship: (r.택배사 || r.송장번호 || r.송장이미지)
      ? { co: r.택배사 || "", no: r.송장번호 || "", img: r.송장이미지 || null } : null,
    reject: r.확인메모 || "",      // 트라이코지 반려 사유
    _page: r.유형 === "개인" ? "B" : "A",
    _q: {},
    _iso: r.주문일시,
    _db: true,                 // 저장소에서 온 건 — 되돌리기는 저장소도 같이 지웁니다
  };
}

/* ══════════════════════════════════════════════════════════
   입고가 읽기 (2026-08-24)
   ★ 전자랜드 계정으로 부르면 RLS 가 걸러서 **빈 배열**이 옵니다.
     그래서 전자랜드 화면에는 금액 칸 자체가 안 생깁니다 — 코드로 숨기는 게
     아니라 자료가 아예 안 내려옵니다.
   ★ 표가 아직 없거나(08_가격.sql 미실행) 값이 비어 있어도 조용히 넘어갑니다.
   ══════════════════════════════════════════════════════════ */
async function pullPrice() {
  try {
    const rows = await rest(encodeURIComponent(T_PRICE) + "?select=*&limit=2000");
    const m = {};
    (rows || []).forEach(r => {
      if (!r["바코드"]) return;
      m[String(r["바코드"])] = { e: r["전자랜드입고가"], t: r["트라이코지입고가"] };
    });
    A.PRICE = m;
    slog("입고가", Object.keys(m).length, "종");
  } catch (e) {
    A.PRICE = {};                 // 표가 없거나 권한이 없으면 그냥 안 보여 줍니다
    slog("입고가 없음", e && e.message);
  }
}

/* ══════════════════════════════════════════════════════════
   읽기 — 주문 + 주문줄을 한 번에
   ══════════════════════════════════════════════════════════ */
async function pull() {
  if (busy) return;
  busy = true;
  try {
    const q = "select=*," + encodeURIComponent(T_LINE) + "(*)&order=" +
              encodeURIComponent("주문일시") + ".desc&limit=500";
    const rows = await rest(encodeURIComponent(T_ORDER) + "?" + q);
    const next = rows.map(toOrder);
    /* 화면이 보고 있는 배열 그대로를 갈아끼웁니다 (참조를 바꾸면 안 됩니다) */
    A.ORDERS.length = 0;
    next.forEach(o => A.ORDERS.push(o));
    slog("읽음", next.length, "건");
    repaint();
  } catch (e) {
    warn(e);
  } finally {
    busy = false;
  }
}

function repaint() {
  try {
    A.renderInbox(1);
    A.renderInbox(2);
    A.renderMine();
    A.renderHistory && A.renderHistory();
  } catch (e) { console.error("[저장소] 다시 그리기 실패", e); }
}

/* ══════════════════════════════════════════════════════════
   쓰기 — 다른 파일의 [저장소 고리] 가 부르는 자리
   ══════════════════════════════════════════════════════════ */
const store = {
  async onNew(o) {
    try {
      const no = await rpc(RPC_NO);
      if (no) o.no = String(no);                        // YYYYMMDD-000001
      o._iso = new Date().toISOString();
      await rest(encodeURIComponent(T_ORDER), { method: "POST", body: JSON.stringify(orderRow(o)) });
      await rest(encodeURIComponent(T_LINE),  { method: "POST", body: JSON.stringify(lineRows(o)) });
      o._db = true;
      slog("새 주문", o.no);
      repaint();
      try { A.showSent(); } catch (e) {}
    } catch (e) { warn(e); }
  },

  async onPatch(o, fields) {
    try {
      const body = {};
      if ("status" in fields) body.상태 = fields.status | 0;
      if ("dl"     in fields) body.자료받음 = !!fields.dl;
      if ("mg"     in fields) body.묶음     = fields.mg || null;
      if ("xl"     in fields) body.엑셀받음 = !!fields.xl;
      if ("memo"   in fields) body.확인메모 = fields.memo || null;
      if ("ship"   in fields) {
        body.택배사   = fields.ship ? fields.ship.co  : null;
        body.송장번호 = fields.ship ? fields.ship.no  : null;
        body.송장이미지 = fields.ship ? fields.ship.img : null;
      }
      if (!Object.keys(body).length) return;
      if (ACC && "status" in fields) { body.확인자 = ACC.이름 || ACC.역할; body.확인시각 = new Date().toISOString(); }
      await rest(encodeURIComponent(T_ORDER) + "?" +
                 encodeURIComponent("주문번호") + "=eq." + encodeURIComponent(o.no),
                 { method: "PATCH", body: JSON.stringify(body) });
      slog("고침", o.no, body);
    } catch (e) { warn(e); }
  },

  async onDelete(o) {
    try {
      await rest(encodeURIComponent(T_ORDER) + "?" +
                 encodeURIComponent("주문번호") + "=eq." + encodeURIComponent(o.no),
                 { method: "DELETE" });
      slog("지움", o.no);
    } catch (e) { warn(e); }
  },

  pull,
  account: () => ACC,
  /* 콘솔에서 A.store.logout() — 실제 처리는 22-auth.js 가 합니다 */
  logout() { return A.auth ? A.auth.logout() : (A.leaveNow ? A.leaveNow() : location.reload()); },
};

function warn(e) {
  console.error("[저장소]", e);
  const bar = $("sentBar");
  if (bar && !bar.hidden) return;
  /* 조용히 실패하면 사람이 모릅니다 — 화면 맨 위에 한 줄 띄웁니다 */
  let el = $("storeErr");
  if (!el) {
    el = document.createElement("div");
    el.id = "storeErr";
    el.style.cssText = "position:fixed;left:0;right:0;top:0;z-index:150;background:#D62828;color:#fff;" +
      "font-size:12px;padding:7px 12px;text-align:center;cursor:pointer";
    el.onclick = () => el.remove();
    document.body.appendChild(el);
  }
  el.textContent = "저장소에 닿지 못했습니다 — " + String(e.message || e).slice(0, 120) + " (눌러서 닫기)";
  clearTimeout(el._t);
  el._t = setTimeout(() => el.remove(), 8000);
}

/* ══════════════════════════════════════════════════════════
   시작
   ══════════════════════════════════════════════════════════ */
async function boot() {
  try {
    ACC = await A.auth.ready();            // 22-auth.js 가 로그인 창을 띄우고 프로필을 돌려줍니다
  } catch (e) {
    warn(e);
    return;
  }

  /* 역할 고정 — 프로필이 알려준 역할만 보입니다 (?as= 보다 이 값이 셉니다) */
  const R = { "전자랜드": 0, "더다움": 1, "트라이코지": 2 };
  const r = R[ACC.역할];
  if (r != null && A.setRole) {
    document.querySelector(".chain").hidden = true;
    A.setRole(r);
  }

  await pullPrice();                     /* 주문보다 먼저 — 카드를 그릴 때 금액이 있어야 합니다 */
  await pull();
  if (STORE.poll > 0) timer = setInterval(pull, STORE.poll);
  document.addEventListener("visibilitychange", () => { if (!document.hidden) pull(); });
  console.info("[저장소] 켜짐 — " + ACC.역할 + " · " + (ACC.주문처 || "-"));
}

if (STORE_ON) {
  A.store = store;
  /* ⚠ 저장소를 켰는데 로그인 판정이 실패하면 가림막이 남습니다 — 그때도 걷어 줍니다 */
  boot().catch(e => { console.error("[저장소]", e); try { window.__ready && window.__ready(); } catch (x) {} });
}

/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { storeOn: STORE_ON, pullPrice });
