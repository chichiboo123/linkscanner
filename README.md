# 🔎 Link Scanner

웹앱 **URL**과 **GitHub 레포 주소(선택)** 를 입력하면, 해당 앱의 **기능 · 구조 · UI/UX · 소스코드**를
종합 분석해 **마크다운 리포트**로 출력하는 서비스입니다.

> Created by. 교육뮤지컬 꿈꾸는 치수쌤 · https://litt.ly/chichiboo

---

## ✨ 주요 기능

- 🌐 **웹 스크래핑 + 스크린샷** — Headless Chromium으로 렌더링된 화면을 캡처하고 콘텐츠를 수집
- 📦 **GitHub 소스 분석** — 레포 메타데이터 + 핵심 파일/소스코드 자동 수집
- 🤖 **Gemini 멀티모달 분석** — 스크린샷(이미지)과 코드/텍스트를 함께 분석
- 📄 **마크다운 리포트** — 복사 / `.md` 다운로드 지원
- 🎨 파스텔 톤 UI, Pretendard GOV 폰트, Material Icons, KRDS 풍 레이아웃

---

## 🏗️ 아키텍처

```
┌──────────────────────── Netlify (단일 배포) ────────────────────────┐
│                                                                     │
│  [Frontend]  React + Vite + TypeScript + Tailwind                   │
│       │  POST /api/scan                                             │
│       ▼                                                             │
│  [Netlify Function: scan]  (오케스트레이터)                          │
│       ├─ scrape.ts   puppeteer-core + @sparticuz/chromium → 스크린샷 │
│       ├─ github.ts   GitHub REST API → 메타 + 소스코드               │
│       └─ gemini.ts   Gemini generateContent(멀티모달) → 마크다운      │
│                                                                     │
│  환경변수: GEMINI_API_KEY · GEMINI_MODEL · GITHUB_TOKEN              │
│  (서버 함수 내부에서만 사용 — 브라우저에 절대 노출되지 않음)            │
└─────────────────────────────────────────────────────────────────────┘
```

**왜 Netlify인가:** 프론트와 서버리스 백엔드를 한 레포·한 배포로 통합하고, API 키를
암호화된 환경변수로 관리할 수 있습니다. 무거운 Chromium은 번들에서 제외(`external_node_modules`)하고
`@sparticuz/chromium`이 런타임에 바이너리를 로드합니다.

---

## 🔑 환경변수

| 변수 | 필수 | 설명 |
|------|:---:|------|
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| `GEMINI_MODEL` | ⬜ | 기본값 `gemini-2.0-flash`. 예: `gemini-2.5-flash`, `gemini-3-flash` |
| `GITHUB_TOKEN` | ⬜ | [GitHub PAT](https://github.com/settings/tokens). rate limit 완화/비공개 레포용 |

`.env.example`를 참고하세요. **실제 키는 절대 커밋하지 마세요.**

---

## 🚀 로컬 개발

```bash
# 1) 의존성 설치
npm install

# 2) 환경변수 준비 (Netlify CLI 사용 권장)
cp .env.example .env   # 값 채우기

# 3) 프론트 + 함수 동시 실행 (Netlify CLI)
npm i -g netlify-cli
netlify dev            # http://localhost:8888

# 또는 프론트만 (함수 없이 UI 확인)
npm run dev            # http://localhost:5173
```

> 로컬에서 `@sparticuz/chromium` 바이너리가 없으면 스크래핑은 자동으로
> `fetch` 텍스트 추출로 폴백합니다(스크린샷 없음). 실제 스크린샷은 배포 환경에서 동작합니다.

---

## ☁️ 배포 (Netlify)

1. 이 레포를 GitHub에 푸시
2. Netlify에서 **Add new site → Import an existing project** 로 레포 연결
3. 빌드 설정은 `netlify.toml`이 자동 적용 (`build`/`dist`/`functions`)
4. **Site settings → Environment variables** 에 `GEMINI_API_KEY` 등 등록
5. 배포 완료 후 사이트 접속

### ⏱️ 타임아웃 참고
스크린샷 캡처는 Chromium 콜드스타트로 수~수십 초가 걸릴 수 있습니다.
무료 플랜 함수 타임아웃이 부족하면:
- Netlify 대시보드에서 함수 타임아웃 상향(플랜에 따라 상이), 또는
- `.env`에서 스크린샷을 생략하도록 운영(`fetch` 폴백 사용)하는 방안을 고려하세요.

---

## 📁 폴더 구조

```
linkscanner/
├── index.html
├── netlify.toml                 # 빌드/리다이렉트/함수 설정
├── src/                         # 프론트엔드
│   ├── App.tsx
│   ├── components/              # Header · Footer · ScanForm · LoadingState · ReportView
│   ├── lib/api.ts               # /api/scan 호출
│   └── types.ts                 # 공유 타입
└── netlify/functions/
    ├── scan.ts                  # 오케스트레이터 (엔드포인트)
    └── lib/
        ├── scrape.ts            # 스크래핑 + 스크린샷
        ├── github.ts            # GitHub 수집
        └── gemini.ts            # Gemini 분석
```

---

## 🛡️ 보안 메모

- 모든 API 키는 **서버리스 함수 내부**에서만 사용되며 클라이언트 번들에 포함되지 않습니다.
- 사용자가 입력한 URL/레포는 분석 외 용도로 저장하지 않습니다.
