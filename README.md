# 도트프레스 (DOT PRESS)

브라우저에서 바로 도트 아트(픽셀 아트)를 그리고 JPG/PNG로 저장하는 정적 웹사이트입니다.
빌드 도구 없이 순수 HTML + CSS + JS로만 구성되어 있어 Cloudflare Pages에 폴더 그대로 업로드하면 바로 배포됩니다.

## 폴더 구조 (전부 한 층에 평평하게 구성) 

Cloudflare Pages "Drag and drop your files" 업로드 방식에서 하위 폴더(css/, js/)가
자꾸 깨지는 문제가 있어, 모든 파일을 폴더 없이 한 층에 두는 구조로 만들었습니다.
모든 HTML/CSS/JS 참조도 상대경로로 되어 있어 파일들이 함께 있기만 하면 어디에 배포하든 그대로 동작합니다.

```
/
├── index.html          # 메인 페이지 (그리기 도구 + 기능 소개 + 사이트 소개 섹션)
├── about.html           # 사이트 소개 상세 페이지
├── privacy.html          # 개인정보처리방침 (애드센스 심사용)
├── style.css             # 전체 사이트 스타일 (컬러 토큰은 :root 변수로 관리)
├── common.js             # 모든 페이지 공통(모바일 메뉴, 푸터 연도)
├── pixelCanvas.js         # 그리기 엔진(PixelCanvas 클래스) - UI와 무관한 순수 로직
├── main.js                # index.html 전용 UI 연결 로직
├── favicon.svg
├── site.webmanifest
├── robots.txt
└── sitemap.xml
```

## 배포 방법 (Cloudflare Pages)

1. Cloudflare 대시보드 → Workers & Pages → Create application → Pages →
   "Drag and drop your files" → Get started
2. 이 폴더 **안의 파일들을 전부 선택**해서 업로드 영역에 드래그하거나,
   업로드 방식이 "폴더/압축파일 1개만 가능"이라고 뜨면 **이 폴더를 압축(zip)** 해서 올리세요.
   - zip을 만들 때는 반드시 이 폴더 **안으로 들어가서** 안의 파일들을 전체 선택한 뒤 압축해야 합니다.
   - zip 파일을 열었을 때 `index.html`이 **최상위(폴더 없이)**에 바로 보여야 정상입니다.
3. 업로드 후 파일 목록에 `index.html`, `style.css`, `main.js` 등이 폴더 없이 나란히 보이는지 확인하고 Deploy site를 누릅니다.
4. 배포 후 사이트 접속 → 브라우저 개발자 도구(F12) → Console에 빨간 에러가 없는지 확인하세요.

## 배포 후 실제 도메인으로 교체할 것

- `index.html`, `about.html`, `privacy.html`, `robots.txt`, `sitemap.xml` 안의 `https://your-domain.com` 부분을
  실제 배포 주소(`https://프로젝트이름.pages.dev` 또는 커스텀 도메인)로 교체하세요.

## 애드센스 심사 전 체크리스트

- [ ] `privacy.html` 문의처 부분을 실제 연락 수단(이메일 등)으로 채우기
- [ ] `https://your-domain.com` 을 실제 도메인으로 전체 교체
- [ ] 애드센스 승인 후 `index.html`, `about.html`, `privacy.html`의 `<head>`에 애드센스 스크립트 태그 삽입

## 기능을 추가하는 방법

**새 그리기 도구 추가 (예: 사각형 도구)**
1. `index.html`의 `.tool-grid` 안에 `<button class="tool-btn" data-tool="rect">` 버튼 추가
2. `main.js`의 `applyToolAt()` 함수에 `else if (state.tool === "rect")` 분기 추가
3. 필요하면 `pixelCanvas.js`의 `PixelCanvas`에 관련 메서드(예: `drawRect`) 추가

**새 페이지 추가 (예: 사용법 안내 페이지)**
1. `about.html`을 복사해 새 파일(`guide.html`)을 만들고 `<main>` 내용만 교체
2. 파일 상단의 `<link rel="stylesheet" href="style.css">`, 하단의 `<script src="common.js" defer>`는
   그대로 두면 됩니다 (같은 폴더에 있으므로 경로 수정 불필요)
3. 헤더의 `.site-nav`, 푸터의 `.footer-nav`에 링크(`href="guide.html"`) 추가 (모든 페이지에 동일하게 반영)
4. `sitemap.xml`에 새 URL 추가

**색상 팔레트/테마 변경**
- `style.css` 최상단 `:root` 안의 CSS 변수 값만 바꾸면 전체 사이트 색상이 일괄 변경됩니다.

## 개인정보 처리 관련 참고

이 사이트는 사용자가 그린 그림 데이터를 서버로 전송하지 않으며, 모든 그리기 연산은 브라우저 안에서만 이루어집니다.
편의 기능(최근 사용 색상)만 `localStorage`에 저장되며, 이 내용은 `privacy.html`에 안내되어 있습니다.
서버 저장, 회원 시스템, 분석 도구(GA 등)를 추가하는 경우 `privacy.html` 내용도 함께 갱신해야 합니다.
