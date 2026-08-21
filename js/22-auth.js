/* ──────────────────────────────────────────────────────────
   22-auth.js
   로그인 — 이메일 + 비밀번호 (Supabase Auth)

   왜 접속 코드가 아니라 이것인가
     · 비밀번호를 해시로 보관합니다 — 표를 봐도 원문을 알 수 없습니다
     · 로그인 시도 제한이 걸립니다 (대입 공격 차단)
     · 세션이 만료됩니다. 로그인 기록도 남습니다
     · 커스텀 헤더를 안 씁니다 → 브라우저 CORS 위험이 사라집니다

   ⚠ 23-store.js 보다 **먼저** 불러야 합니다 (main.js 순서 참고).
   ⚠ config.js 가 비어 있으면 통째로 잠듭니다 — 예전처럼 메모리로만 돕니다.
   ────────────────────────────────────────────────────────── */
import { A, $, esc } from "./00-core.js";
import { SUPABASE, STORE } from "./config.js";

const KEY  = SUPABASE.key || SUPABASE.anonKey || "";
const BASE = String(SUPABASE.url || "").replace(/\/+$/, "");
const ON   = !!(BASE && KEY);

const SESS_KEY = (STORE && STORE.sessionKey) || "trycozy.keyring.session.v1";
const SKEW_MS  = 60 * 1000;          // 만료 1분 전에 미리 갱신합니다

let SESSION = null;   // { access_token, refresh_token, expires_at, user }
let PROFILE = null;   // { id, 역할, 주문처, 이름 }
let readyP  = null;

const log = (...a) => { if (STORE && STORE.debug) console.log("[로그인]", ...a); };

/* ══════════════════════════════════════════════════════════
   통신
   ══════════════════════════════════════════════════════════ */
async function authPost(path, body, token) {
  const h = { "apikey": KEY, "Content-Type": "application/json" };
  if (token) h["Authorization"] = "Bearer " + token;
  const r = await fetch(BASE + "/auth/v1/" + path, {
    method: "POST", headers: h, body: JSON.stringify(body || {}),
  });
  const text = await r.text();
  let j = null;
  try { j = text ? JSON.parse(text) : null; } catch (e) {}
  if (!r.ok) {
    const msg = (j && (j.error_description || j.msg || j.message || j.error)) || ("HTTP " + r.status);
    const err = new Error(msg); err.status = r.status; throw err;
  }
  return j;
}

function keepSession(j) {
  SESSION = {
    access_token:  j.access_token,
    refresh_token: j.refresh_token,
    expires_at:    Date.now() + ((j.expires_in || 3600) * 1000),
    user:          j.user || null,
  };
  try { localStorage.setItem(SESS_KEY, JSON.stringify(SESSION)); } catch (e) {}
  return SESSION;
}

function dropSession() {
  SESSION = null; PROFILE = null;
  try { localStorage.removeItem(SESS_KEY); } catch (e) {}
}

/* ══════════════════════════════════════════════════════════
   토큰 — 만료 전에 알아서 갱신합니다
   ══════════════════════════════════════════════════════════ */
let refreshing = null;

async function validToken() {
  if (!SESSION) return null;
  if (Date.now() < SESSION.expires_at - SKEW_MS) return SESSION.access_token;
  if (!refreshing) {
    refreshing = authPost("token?grant_type=refresh_token",
                          { refresh_token: SESSION.refresh_token })
      .then(j => { keepSession(j); log("토큰 갱신"); return SESSION.access_token; })
      .catch(e => { log("갱신 실패 — 다시 로그인", e.message); dropSession(); return null; })
      .finally(() => { refreshing = null; });
  }
  return refreshing;
}

/* ══════════════════════════════════════════════════════════
   다른 파일이 쓰는 것
   ══════════════════════════════════════════════════════════ */
const auth = {
  on: ON,

  /* 저장소 호출에 붙일 헤더. ⚠ 커스텀 헤더를 쓰지 않습니다 */
  async headers(extra) {
    const t = await validToken();
    const h = { "apikey": KEY, "Content-Type": "application/json" };
    if (t) h["Authorization"] = "Bearer " + t;
    return Object.assign(h, extra || {});
  },

  profile: () => PROFILE,
  user:    () => (SESSION && SESSION.user) || null,

  async login(email, password) {
    const j = await authPost("token?grant_type=password",
                             { email: String(email).trim(), password });
    keepSession(j);
    return loadProfile();
  },

  /* 비밀번호 바꾸기 — 로그인한 본인만. 관리자도 새 비밀번호를 알 수 없습니다 */
  async changePassword(next) {
    const t = await validToken();
    if (!t) throw new Error("로그인이 풀렸습니다. 다시 로그인해 주세요.");
    const r = await fetch(BASE + "/auth/v1/user", {
      method: "PUT",
      headers: { "apikey": KEY, "Authorization": "Bearer " + t, "Content-Type": "application/json" },
      body: JSON.stringify({ password: next }),
    });
    const text = await r.text();
    let j = null; try { j = text ? JSON.parse(text) : null; } catch (e) {}
    if (!r.ok) {
      const m = (j && (j.msg || j.message || j.error_description || j.error)) || ("HTTP " + r.status);
      throw new Error(m);
    }
    log("비밀번호 바뀜");
    return true;
  },

  async logout() {
    try {
      const t = await validToken();
      if (t) await authPost("logout", {}, t);
    } catch (e) {}
    dropSession();
    /* 모달에 "담아둔 수량과 받는 분 정보는 이 기기에 남지 않습니다" 라고 적어 두었습니다.
       실제로 지워야 그 말이 맞습니다 — 공용 PC 에서 다음 사람이 보면 안 됩니다. */
    try { A.clearDraft && A.clearDraft(); } catch (e) {}
    leaveNow();
  },

  /* 로그인이 끝날 때까지 기다립니다. 이미 돼 있으면 바로 돌아옵니다 */
  ready() { return readyP || (readyP = boot()); },
};

/* ★ 나가기는 화면을 새로 여는 것으로 끝냅니다 — 남은 자료가 메모리에 없게 하려는 것입니다.
   ⚠ 그런데 남의 스크립트(카카오 우편번호 등)가 `beforeunload` 를 걸어 두면
     브라우저가 "사이트에서 나가시겠습니까? 변경사항이 저장되지 않을 수 있습니다" 를 띄웁니다.
     그건 브라우저 기본 창이라 모양을 바꿀 수 없습니다. **뜨지 않게 막는 수밖에 없습니다.**
     잡는 단계(capture)에서 먼저 가로채 그 뒤 처리를 끊습니다. */
function leaveNow(){
  try {
    window.onbeforeunload = null;
    window.addEventListener("beforeunload", e => {
      e.stopImmediatePropagation();
      delete e.returnValue;
    }, { capture: true });
  } catch (e) {}
  location.reload();
}

/* 로그인한 사람이 어떤 역할인지 — 프로필 표에서 (자기 줄만 보입니다) */
async function loadProfile() {
  const uid = auth.user() && auth.user().id;
  if (!uid) throw new Error("로그인 정보가 없습니다");
  const r = await fetch(
    BASE + "/rest/v1/" + encodeURIComponent("프로필") +
    "?select=*&id=eq." + encodeURIComponent(uid),
    { headers: await auth.headers() });
  const rows = await r.json().catch(() => null);
  if (!r.ok) throw new Error("프로필을 읽지 못했습니다 (" + r.status + ")");
  if (!rows || !rows.length) {
    throw new Error("이 계정에 역할이 지정되지 않았습니다 — 06_인증_AUTH.sql 의 프로필 등록을 확인하세요");
  }
  PROFILE = rows[0];
  log("로그인됨", PROFILE.역할, PROFILE.주문처 || "-");
  return PROFILE;
}

/* ══════════════════════════════════════════════════════════
   로그인 창
   ══════════════════════════════════════════════════════════ */
function gateCss() {
  if ($("loginCss")) return;
  const st = document.createElement("style");
  st.id = "loginCss";
  st.textContent = `
  .logingate{position:fixed;inset:0;z-index:200;background:#161A1E;display:flex;
    align-items:center;justify-content:center;padding:24px}
  .logingate .card{width:100%;max-width:340px;background:#fff;border-radius:10px;padding:24px 22px}
  .logingate h1{margin:0 0 4px;font-size:17px;font-weight:800;letter-spacing:-.02em}
  .logingate p.lead{margin:0 0 16px;font-size:12.5px;color:#6B7280;line-height:1.6}
  .logingate label{display:block;margin-bottom:10px}
  .logingate span{display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px}
  .logingate input{width:100%;box-sizing:border-box;font-size:15px;padding:12px;
    border:1.5px solid #DFE3E6;border-radius:6px;outline:0}
  .logingate input:focus{border-color:#1D6BE0;box-shadow:0 0 0 2px rgba(29,107,224,.2)}
  .logingate button{width:100%;margin-top:6px;font-size:15px;font-weight:800;color:#fff;
    background:#E8447F;border:0;border-radius:6px;padding:13px;cursor:pointer;box-shadow:0 3px 0 #B8305F}
  .logingate button:disabled{background:#C9CDD2;box-shadow:0 3px 0 #A9AEB4;cursor:default}
  .logingate .err{margin:10px 0 0;font-size:12px;color:#D62828;min-height:16px;line-height:1.5}`;
  document.head.appendChild(st);
}

function askLogin(firstMsg) {
  gateCss();
  ready();                     /* 로그인 창이 화면을 덮었으니 가림막은 걷어도 됩니다 */
  return new Promise(done => {
    const box = document.createElement("div");
    box.className = "logingate";
    box.innerHTML =
      `<div class="card">
         <h1>로그인</h1>
         <p class="lead">받으신 이메일과 비밀번호를 넣으세요.<br>
            이 기기에서는 한동안 다시 묻지 않습니다.</p>
         <label><span>이메일</span>
           <input id="lgEmail" type="email" autocomplete="username" inputmode="email"></label>
         <label><span>비밀번호</span>
           <input id="lgPw" type="password" autocomplete="current-password"></label>
         <p class="err" id="lgErr">${firstMsg || ""}</p>
         <button type="button" id="lgGo">들어가기</button>
       </div>`;
    document.body.appendChild(box);
    const em = box.querySelector("#lgEmail"), pw = box.querySelector("#lgPw");
    const err = box.querySelector("#lgErr"), go = box.querySelector("#lgGo");
    em.focus();
    const submit = async () => {
      if (!em.value.trim() || !pw.value) { err.textContent = "이메일과 비밀번호를 넣으세요."; return; }
      go.disabled = true; err.textContent = "확인 중…";
      try {
        const p = await auth.login(em.value, pw.value);
        box.remove();
        done(p);
      } catch (e) {
        dropSession();
        go.disabled = false;
        err.textContent = /invalid|credential|grant/i.test(e.message)
          ? "이메일 또는 비밀번호가 맞지 않습니다."
          : ("들어가지 못했습니다 — " + e.message);
        pw.select();
      }
    };
    go.onclick = submit;
    [em, pw].forEach(el => el.addEventListener("keydown", e => { if (e.key === "Enter") submit(); }));
  });
}

/* ══════════════════════════════════════════════════════════
   머리 오른쪽 계정 줄 — 누구로 들어와 있는지 + 비밀번호 · 나가기
   ══════════════════════════════════════════════════════════ */
function accountBar() {
  if ($("acctBar") || !PROFILE) return;
  const st = document.createElement("style");
  st.textContent = `
  .acctbar{display:flex;align-items:center;justify-content:flex-end;gap:8px;
    margin-top:6px;font-size:11px;color:#6E7681}
  .acctbar b{font-weight:700;color:#16181C}
  .acctbar button{font-family:inherit;font-size:11px;font-weight:700;color:#6E7681;
    background:#F3F4F5;border:1px solid #DFE3E6;border-radius:4px;padding:4px 8px;cursor:pointer}
  .acctbar button:hover{background:#E8447F;border-color:#E8447F;color:#fff}
  .pwmodal{position:fixed;inset:0;z-index:210;background:rgba(22,24,28,.55);
    display:flex;align-items:center;justify-content:center;padding:24px}
  .pwmodal .card{width:100%;max-width:330px;background:#fff;border-radius:10px;padding:22px 20px}
  .pwmodal h2{margin:0 0 4px;font-size:16px;font-weight:800}
  .pwmodal p.lead{margin:0 0 14px;font-size:12px;color:#6B7280;line-height:1.6}
  .pwmodal label{display:block;margin-bottom:10px}
  .pwmodal span{display:block;font-size:11px;font-weight:700;color:#6B7280;margin-bottom:4px}
  .pwmodal input{width:100%;box-sizing:border-box;font-size:15px;padding:11px;
    border:1.5px solid #DFE3E6;border-radius:6px;outline:0}
  .pwmodal input:focus{border-color:#1D6BE0;box-shadow:0 0 0 2px rgba(29,107,224,.2)}
  .pwmodal .row{display:flex;gap:8px;margin-top:6px}
  .pwmodal .row button{flex:1;font-size:14px;font-weight:800;border:0;border-radius:6px;
    padding:11px;cursor:pointer}
  .pwmodal .go{color:#fff;background:#E8447F;box-shadow:0 3px 0 #B8305F}
  .pwmodal .no{color:#16181C;background:#F3F4F5;box-shadow:0 3px 0 #DFE3E6}
  .pwmodal .msg{margin:8px 0 0;font-size:12px;min-height:16px;line-height:1.5;color:#D62828}
  .pwmodal .msg.okmsg{color:#12939F}`;
  document.head.appendChild(st);

  const bar = document.createElement("div");
  bar.className = "acctbar"; bar.id = "acctBar";
  bar.innerHTML = `<span><b>${PROFILE.이름 || PROFILE.역할}</b> 님으로 접속 중</span>
                   <button type="button" id="acctPw">비밀번호</button>
                   <button type="button" id="acctOut">나가기</button>`;
  const top = document.querySelector(".top");
  if (top) top.appendChild(bar);

  /* 브라우저 기본 confirm() 대신 앱과 같은 모양의 확인창을 씁니다
     (기본 창은 "localhost:8777 내용:" 같은 주소가 그대로 보여 어색합니다) */
  $("acctOut").onclick = () => {
    const who = PROFILE ? (PROFILE.이름 || PROFILE.역할) : "";
    if (A.openSheet) {
      A.openSheet(`<b class="big">나가기</b>
        <p class="sum"><b>${esc(who)}</b> 계정에서 나갑니다.</p>
        <p class="ask">담아둔 수량과 받는 분 정보는 이 기기에 남지 않습니다. 나갈까요?</p>`,
        () => auth.logout(), "", "나가기");
    } else if (confirm("로그아웃할까요?")) auth.logout();
  };
  $("acctPw").onclick = openPw;
}

function openPw() {
  if ($("pwModal")) return;
  const box = document.createElement("div");
  box.className = "pwmodal"; box.id = "pwModal";
  box.innerHTML =
    `<div class="card">
       <h2>비밀번호 바꾸기</h2>
       <p class="lead">받으신 첫 비밀번호를 <b>본인만 아는 것</b>으로 바꾸세요.<br>8자 이상.</p>
       <label><span>새 비밀번호</span><input id="pw1" type="password" autocomplete="new-password"></label>
       <label><span>한 번 더</span><input id="pw2" type="password" autocomplete="new-password"></label>
       <p class="msg" id="pwMsg"></p>
       <div class="row">
         <button type="button" class="no" id="pwNo">취소</button>
         <button type="button" class="go" id="pwGo">바꾸기</button>
       </div>
     </div>`;
  document.body.appendChild(box);
  const a = box.querySelector("#pw1"), b2 = box.querySelector("#pw2");
  const msg = box.querySelector("#pwMsg"), go = box.querySelector("#pwGo");
  a.focus();
  const close = () => box.remove();
  box.querySelector("#pwNo").onclick = close;
  box.addEventListener("click", e => { if (e.target === box) close(); });

  const submit = async () => {
    msg.classList.remove("okmsg");
    if (a.value.length < 8) { msg.textContent = "8자 이상으로 정해 주세요."; return; }
    if (a.value !== b2.value) { msg.textContent = "두 번 넣은 값이 다릅니다."; b2.select(); return; }
    go.disabled = true; msg.textContent = "바꾸는 중…";
    try {
      await auth.changePassword(a.value);
      msg.classList.add("okmsg");
      msg.textContent = "바뀌었습니다. 다음부터 새 비밀번호로 들어오세요.";
      setTimeout(close, 1800);
    } catch (e) {
      go.disabled = false;
      msg.textContent = /reauth|recent|session/i.test(e.message)
        ? "보안 설정 때문에 다시 로그인한 뒤에만 바꿀 수 있습니다. 나가기 → 로그인 후 다시 시도하세요."
        : ("바꾸지 못했습니다 — " + e.message);
    }
  };
  go.onclick = submit;
  [a, b2].forEach(el => el.addEventListener("keydown", e => { if (e.key === "Enter") submit(); }));
}

/* ══════════════════════════════════════════════════════════
   시작
   ══════════════════════════════════════════════════════════ */
async function boot() {
  try {
    const raw = localStorage.getItem(SESS_KEY);
    if (raw) SESSION = JSON.parse(raw);
  } catch (e) {}

  if (SESSION) {
    try {
      if (!(await validToken())) throw new Error("세션 만료");
      const pr = await loadProfile();
      accountBar();
      ready();                 /* 이미 로그인돼 있음 — 주문 화면을 보여줍니다 */
      return pr;
    } catch (e) {
      log("저장된 세션을 쓸 수 없습니다", e.message);
      dropSession();
    }
  }
  const pr = await askLogin();
  accountBar();
  ready();
  return pr;
}
/* 첫 화면 가림막을 걷습니다 (index.html 이 만들어 둡니다) */
function ready(){ try { window.__ready && window.__ready(); } catch (e) {} }

A.leaveNow = leaveNow;
if (ON) A.auth = auth;

/* ── 다른 파일이 쓰는 것 (A.이름 으로 부릅니다) ────────────── */
Object.assign(A, { authOn: ON });
