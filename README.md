# 🔎 Link Scanner

웹앱 **URL**과 **GitHub 레포 주소(선택)** 를 입력하면, 해당 앱의 **기능 · 구조 · UI/UX · 소스코드**를
종합 분석해 **마크다운 리포트**로 출력하는 서비스입니다.

> Created by. 교육뮤지컬 꿈꾸는 치수쌤 · https://litt.ly/chichiboo

---

## ✨ 주요 기능

- 🌐 **웹 콘텐츠 수집 + 스크린샷** — fetch로 콘텐츠를, 렌더링 API(Microlink)로 실제 화면을 캡처
- 📦 **GitHub 소스 분석** — 레포 메타데이터 + 핵심 파일/소스코드 자동 수집
- 🤖 **Gemini 멀티모달 분석** — 스크린샷(이미지)과 코드/텍스트를 함께 분석 (모델 폴백 체인)
- 🔭 **분야별 관점 분석** — 교육·예술·철학·디지털 등 분야를 선택/입력하면 해당 관점의 상세 해석 추가
- 🔗 **링크 공유** — 리포트를 서버에 저장하고 짧은 링크로 공유 → 다른 기기에서 그대로 열람
- 🕘 **최근 분석 기록** — localStorage에 최근 리포트를 보관해 언제든 다시 열람
- 📄 **마크다운 리포트** — 복사 / `.md` 다운로드 지원
- 🎨 KRDS 가이드라인 기반의 절제된 UI, Pretendard GOV 폰트, Material Icons

---

## 🏗️ 아키텍처

```
┌──────────────────────── Netlify (단일 배포) ────────────────────────┐
│                                                                     │
│  [Frontend]  React + Vite + TypeScript + Tailwind                   │
│       │  POST /api/scan                                             │
│       ▼                                                             │
│  [Netlify Function: scan]  (오케스트레이터)                          │
│       ├─ scrape.ts   fetch(콘텐츠) + Microlink API(스크린샷)         │
│       ├─ github.ts   GitHub REST API → 메타 + 소스코드               │
│       └─ gemini.ts   Gemini generateContent(멀티모달) → 마크다운      │
│  [Netlify Function: share]  리포트 저장/조회 (Netlify Blobs)         │
│                                                                     │
│  환경변수: GEMINI_API_KEY · GEMINI_MODEL · GITHUB_TOKEN · MICROLINK  │
│  (서버 함수 내부에서만 사용 — 브라우저에 절대 노출되지 않음)            │
└─────────────────────────────────────────────────────────────────────┘
```

**왜 Netlify인가:** 프론트와 서버리스 백엔드를 한 레포·한 배포로 통합하고, API 키를
암호화된 환경변수로 관리할 수 있습니다. 서버리스에서 불안정한 Headless Chromium을 직접 띄우는
대신 **스크린샷은 외부 렌더링 API(Microlink)** 로 처리해 함수가 가벼운 HTTP 호출만 하도록 했고,
**공유 기능은 Netlify Blobs**(무설정 내장 스토리지)를 사용합니다.

---

## 🔑 환경변수

| 변수 | 필수 | 설명 |
|------|:---:|------|
| `GEMINI_API_KEY` | ✅ | [Google AI Studio](https://aistudio.google.com/apikey)에서 발급 |
| `GEMINI_MODEL` | ⬜ | 모델 **우선순위 목록**(쉼표 구분). 비우면 기본 체인 사용 |
| `GITHUB_TOKEN` | ⬜ | [GitHub PAT](https://github.com/settings/tokens). rate limit 완화/비공개 레포용 |
| `MICROLINK_API_KEY` | ⬜ | 스크린샷 렌더링 한도 상향용. 없으면 무료(일 50건)로 동작 |

> **공유 링크**는 [Netlify Blobs](https://docs.netlify.com/blobs/overview/)에 리포트를 저장합니다.
> 별도 설정 없이 Netlify에 배포하면 자동으로 활성화됩니다. (로컬은 `netlify dev` 필요)

`.env.example`를 참고하세요. **실제 키는 절대 커밋하지 마세요.**

### 🔁 모델 폴백 체인

`GEMINI_MODEL`을 비워두면 다음 순서로 시도하고, 호출이 실패하면(미제공·한도초과·안전차단 등)
자동으로 다음 모델로 **폴백**합니다:

```
gemini-3.1-flash-lite  (1순위)
   → gemini-2.5-flash
   → gemini-2.0-flash
   → gemini-1.5-flash
```

쉼표로 직접 지정할 수도 있습니다: `GEMINI_MODEL=gemini-3.1-flash-lite,gemini-2.5-flash`

> **실제 호출된 모델 확인:** 리포트 상단에 호출된 모델이 배지(`1순위`/`폴백`)로 표시되고,
> 폴백이 발생하면 어떤 모델이 실패해 무엇으로 처리됐는지 안내 문구가 함께 나옵니다.
> 응답 JSON의 `meta.model`(실제 사용), `meta.modelChain`(시도 순서), `meta.fallbacks`(실패 목록)로도 확인할 수 있습니다.

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

> 스크린샷은 외부 렌더링 API(Microlink)로 캡처하므로 로컬에서도 동작합니다.
> 공유 기능(Netlify Blobs)은 `netlify dev`로 실행해야 로컬 테스트가 가능합니다.

---

## ☁️ 배포 (Netlify)

1. 이 레포를 GitHub에 푸시
2. Netlify에서 **Add new site → Import an existing project** 로 레포 연결
3. 빌드 설정은 `netlify.toml`이 자동 적용 (`build`/`dist`/`functions`)
4. **Site settings → Environment variables** 에 `GEMINI_API_KEY` 등 등록
5. 배포 완료 후 사이트 접속

### ⏱️ 참고
- 스크린샷은 Microlink 렌더링 API가 페이지를 그려 반환하므로 사이트에 따라 수 초가 걸릴 수 있습니다.
  실패하면 자동으로 스크린샷 없이 텍스트 기반 분석을 진행합니다.
- 무료 한도(일 50건)를 늘리려면 `MICROLINK_API_KEY`를 등록하세요.

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
    ├── scan.ts                  # 분석 오케스트레이터 (엔드포인트)
    ├── share.ts                 # 리포트 공유 저장/조회 (Netlify Blobs)
    └── lib/
        ├── scrape.ts            # fetch 콘텐츠 + Microlink 스크린샷
        ├── github.ts            # GitHub 수집
        └── gemini.ts            # Gemini 분석 (모델 폴백 + 분야별 관점)
```

---

## 🛡️ 보안 메모

- 모든 API 키는 **서버리스 함수 내부**에서만 사용되며 클라이언트 번들에 포함되지 않습니다.
- 사용자가 입력한 URL/레포는 분석 외 용도로 저장하지 않습니다.
