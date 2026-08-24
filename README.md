# 트라이코지 · 네모 키캡 키링 주문

전자랜드가 주문 → 더다움이 확인 → 트라이코지가 승인·출고.
서버 프로그램 없이 브라우저와 Supabase 만 씁니다.

**운영 주소** https://during1004.github.io/trycozy-keyring/

---

## 폴더

```
index.html            화면 뼈대 · css/js 불러오는 순서
css/     12개         뒤 파일이 앞을 덮습니다. 12-responsive.css 가 반드시 마지막
js/      28개         00-core.js 부터 25-ship-import.js 까지, main.js 가 순서를 정합니다
data/catalog.json     상품 84종 — 도구가 만듭니다. 손으로 고치지 마세요
images/  84장         {바코드}.png
lib/     jszip        브라우저에서 엑셀(zip) 만들기
.github/workflows/    Supabase keepalive (사흘에 한 번 깨우기)
robots.txt            검색엔진 차단 (프로젝트 주소에서는 무시됨 — 아래 참고)
```

## 로컬에서 열기

ES 모듈이라 **`file://` 로는 안 열립니다.** 로컬 웹서버가 필요합니다.

```
python -m http.server 8777
```

또는 상위 폴더의 `주문화면_열기.bat`.

## 저장소 연결

`js/config.js` 두 칸을 채우면 켜집니다. 비워두면 브라우저 메모리로만 돕니다.
로그인(이메일+비밀번호)은 `js/22-auth.js` 가 맡습니다.

```js
export const SUPABASE = {
  url: "https://xxxx.supabase.co",
  key: "sb_publishable_...",     // 공개 키만. secret key 는 절대 금지
};
```

## 코드 구조 — 규칙 두 개

1. **바뀌는 값은 `S` 안에** — `import { S } from "./00-core.js"` → `S.PAGE`
2. **다른 파일 것은 `A.이름`** — `A.refresh()`. 각 파일 끝 `Object.assign(A, {…})` 이 등록합니다

그래서 `00-core.js` 는 아무것도 import 하지 않고, 실행 순서는 `main.js` 에 적힌 그대로입니다.

## 보안

- 이 저장소는 공개입니다. **비밀번호와 secret key 를 절대 넣지 마세요**
- 화면을 숨기는 건 보안이 아닙니다. 세 화면이 한 코드 안에 다 있습니다
- 실제 권한은 Supabase 의 RLS 가 정합니다

## 검색엔진 차단

`index.html` 의 `<meta name="robots" content="noindex, ...">` 가 **실제로 막는 것**입니다.
🚨 **그 줄을 지우지 마세요.** 지우면 며칠 안에 구글 검색에 뜹니다.

`robots.txt` 도 있지만 프로젝트 주소(`/trycozy-keyring` 이 붙는 형태)에서는 무시됩니다.
직접 도메인을 붙이면 그때부터 효력이 생깁니다.

## 문서

전체 설치·운영 문서는 이 저장소가 아니라 작업 폴더 `THE_ELECTRONIC_DB\` 에 있습니다.
