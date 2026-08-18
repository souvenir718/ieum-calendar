# 스택 · 명령어 · 환경변수

이음어린이집의 월별 **당직표 + 일정** 캘린더 웹앱. 원내 구성원이 브라우저로 당직/일정을 확인하고, PIN을 아는 사람만 편집한다. PWA + 인쇄(PDF) 지원.

## 스택

- **Next.js 16** (App Router) · **React 19** · JavaScript (TypeScript 아님)
- **Supabase** (Postgres + RLS) — 유일한 런타임 데이터 소스
- **Vercel** 배포 · `@vercel/analytics`
- 상태관리/CSS 라이브러리 없음. 스타일은 전부 `app/globals.css`(약 1900줄) 한 파일.

## 명령어

```bash
npm run dev          # 개발 서버 (localhost:3000)
npm run build        # 프로덕션 빌드
npm run verify       # 정적 필수 파일 존재 검사 (scripts/verify-static.js)

# 일회성 스크립트는 .env.local을 직접 주입해서 실행
node --env-file=.env.local scripts/seed.mjs          # 초기 시드 (멱등)
node --env-file=.env.local scripts/seed-holidays.mjs # 공휴일 시드 (멱등)
node --env-file=.env.local scripts/check.mjs         # 시드/공개읽기 확인
node --env-file=.env.local scripts/check-rule.mjs    # 당직 규칙 위반 점검
```

배포: `npx vercel@latest` (프리뷰) / `npx vercel@latest --prod` (운영).

## 환경변수 (`.env.local`)

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` — 공개(읽기). 클라이언트 번들 포함.
- `SUPABASE_SERVICE_ROLE_KEY` — **서버 전용**. RLS 우회. `NEXT_PUBLIC_` 붙이면 안 됨.
- `EDIT_PIN` — 당직 편집 잠금 해제 PIN.
- `EDIT_SESSION_SECRET` — 편집 세션 쿠키 서명 키(32바이트+ 랜덤).
- `REVALIDATE_SECRET` — `POST /api/revalidate` 인증용 비밀값. 당직표를 스크립트로 직접 upsert(예: 월별 배정 시드)한 뒤 `node --env-file=.env.local scripts/revalidate.mjs 2026-09`로 ISR 캐시를 즉시 무효화할 때 쓴다.
