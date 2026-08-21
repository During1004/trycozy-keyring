/* ──────────────────────────────────────────────────────────
   main.js — 불러오는 순서가 곧 실행 순서입니다.
   ⚠ 순서를 바꾸지 마세요. 21-role.js 의 마지막 줄이 첫 화면을 그립니다.
      새 파일을 넣을 때는 "그 파일이 화면을 건드리기 시작하는 시점" 을 보고 끼우세요.
   ────────────────────────────────────────────────────────── */
import "./00-core.js";
import "./01-catalog.js";
import "./02-qty-state.js";
import "./03-settings.js";
import "./04-grid.js";
import "./05-filter.js";
import "./06-qty-edit.js";
import "./07-cart.js";
import "./08-layout.js";
import "./09-draft.js";
import "./10-step.js";
import "./11-scan.js";
import "./12-address.js";
import "./13-refresh.js";
import "./14-send.js";
import "./15-xlsx.js";
import "./16-prod-files.js";
import "./17-order-form.js";
import "./18-inbox.js";
import "./19-ship-approve.js";
import "./20-mine.js";
import "./24-bulk.js";        /* 여러 건 한 번에 — 18/19/20 이 등록된 뒤라야 합니다 */
import "./25-ship-import.js"; /* 송장 엑셀 올리기 */
import "./21-role.js";        /* ★ 맨 끝 — 이 파일의 마지막 줄이 첫 화면을 그립니다 */

/* 로그인 → 저장소 (선택). config.js 를 비워두면 둘 다 아무 일도 하지 않습니다.
   ⚠ 22-auth 가 반드시 23-store 보다 먼저입니다. */
import "./22-auth.js";
import "./23-store.js";
