/* ──────────────────────────────────────────────────────────
   config.js — 여기만 채우면 저장소가 켜집니다.

   비워두면(기본값) 지금까지처럼 브라우저 메모리로만 돕니다.
   → 새로고침하면 주문이 사라지고, 다른 사람 화면에는 안 보입니다.

   ⚠ 이 파일은 깃허브에 그대로 올라갑니다.
      · 공개 키(publishable key)는 올려도 됩니다. 권한은 Supabase 의 RLS 가 막습니다.
      · secret key(옛 service_role)는 절대 여기 넣지 마세요. 그 키는 RLS 를 무시합니다.
   자세한 절차 : 05_저장소_SUPABASE\05-1_프로젝트_만들기.md
   ────────────────────────────────────────────────────────── */
export const SUPABASE = {
  url: "https://ibndmahgebltrrujwskf.supabase.co",   // 예) https://abcdefghijk.supabase.co
             //     Supabase 대시보드 → Connect 버튼, 또는 Integrations > Data API

  key: "sb_publishable_ATCWGhVu2ds-7-7KRhNa_Q_3uMT2gHf",   // 공개 키 한 개만 넣습니다. 둘 중 아무거나 맞습니다.
             //   새 프로젝트 : sb_publishable_...   (Settings > API Keys)
             //   옛 프로젝트 : eyJhbGciOi...        (Settings > API Keys > Legacy API Keys 의 anon)
             // ⚠ sb_secret_... / service_role 은 절대 넣지 마세요.
};

export const STORE = {
  poll: 5000,                                  // 몇 밀리초마다 저장소를 다시 읽을지. 0 이면 안 읽습니다
  sessionKey: "trycozy.keyring.session.v1",    // 로그인 세션을 이 브라우저에 기억해 두는 이름
  debug: false,                                // true 로 두면 콘솔에 오간 내용을 찍습니다
};
