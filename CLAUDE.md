# CLAUDE.md

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

## 아키텍처

### 라우팅 / 렌더링
- `app/page.js` → `currentMonth()`로 `/{YYYY-MM}` 리다이렉트 (Asia/Seoul 기준).
- `app/[month]/page.js` — 월 페이지. **`force-static` + `revalidate = 60`** (ISR). 서버에서 Supabase를 anon 키로 읽어 `CalendarClient`에 props로 넘긴다. 쓰기 API는 `revalidatePath`로 이 캐시를 갱신한다.
- `app/components/CalendarClient.jsx` — 클라이언트 컴포넌트. 달력 그리드 + 이벤트 바 + 모달 + 편집 진입점 전부 담당(461줄).
- `app/stats/page.js` — 당직 통계 페이지.

### 데이터 흐름의 두 갈래
1. **읽기**: 서버 컴포넌트(`[month]/page.js`) → `getSupabaseServer()`(anon) → RLS의 public read 정책만 통과.
2. **쓰기**: API 라우트 → `getSupabaseAdmin()`(service_role, RLS 우회) → 성공 시 `revalidatePath`.

`lib/supabase/`에 클라이언트가 3종 있으니 용도에 맞게 골라 쓸 것:
- `server.js` `getSupabaseServer()` — 서버 읽기(anon).
- `admin.js` `getSupabaseAdmin()` — 서버 쓰기(service_role). **브라우저에서 호출 시 throw**.
- `client.js` `getSupabaseBrowser()` — 브라우저 읽기(anon).

### 편집 권한 모델 (`lib/edit-session.js`)
- **당직 편집만** 인증이 필요하다. PIN → `POST /api/edit-session` → HMAC 서명된 만료 토큰을 httpOnly 쿠키(`ieum_edit`, TTL 8h)로 발급. `requireEditSession()`이 `PUT /api/duties`를 보호.
- **일정(events) 편집은 인증 없음** (내부용). `/api/events*`는 누구나 호출 가능.
- PIN·토큰 비교는 `crypto.timingSafeEqual`로 상수시간 처리.

### API 라우트 (모두 `force-dynamic`)
- `POST/DELETE/GET /api/edit-session` — 편집 잠금 해제/잠금/조회.
- `POST /api/events`, `PUT/DELETE /api/events/[id]` — 일정 CRUD (인증 없음).
- `PUT /api/duties` — 한 날짜의 슬롯별 담당자 upsert/삭제 (**PIN 세션 필수**).

### 순수 로직은 `lib/`에 분리
- `lib/calendar.js` — 날짜/월 유틸, `getMonthDays`, `getDutyWeeks`, `deriveEarlyLeave`(조기퇴근 파생) 등. **monthIndex는 0-based**, 날짜는 전부 UTC(`Date.UTC`) 기준으로 다뤄 타임존 흔들림을 없앤다.
- `app/components/calendarUtils.js` — 이벤트 바 레이아웃(주 단위 span 분할 + 레인 배치).
- `lib/events.js` / `lib/duties.js` — 입력 검증 + 상수 (라우트·UI 공용).
- `lib/print-config.js` — 인쇄 레이아웃/범례 상수 (DB 아님).

## 데이터 모델 (`migrations/`)

Supabase SQL Editor에 직접 붙여 실행하는 방식. 마이그레이션 러너 없음.

- `staff` — 명단. `class_name`(반), `is_duty_eligible`, `sort_order`.
- `holidays` — `holiday_date`(PK), `name`.
- `duties` — `duty_date` + `slot`(enum) + `staff_id`. **`unique(duty_date, slot)`** — 하루 한 슬롯 1명.
- `events` — `type`(enum) + `title` + `start_date`/`end_date`(기간). `check(end_date >= start_date)`.
- **RLS**: 4개 테이블 모두 public **read만** 허용. 쓰기 정책 없음 → 반드시 service_role로만 쓴다.

## 도메인 규칙 (중요)

### 당직 슬롯
- 슬롯: `오전1`, `오전2`, `오후1`, `오후2`. 순서는 `lib/calendar.js`의 `SLOT_ORDER`.
- 편집 대상 슬롯은 `lib/duties.js`의 `EDITABLE_SLOTS = ["오전1","오전2","오후1","오후2"]`. **`오후2`는 2026-07-20 폐지 후 재개**되어 다시 편집·배정 가능.
  - 2026-07-20 ~ 07-26 구간에는 오후2 행이 없다(폐지 기간). 전체 규칙·이력은 `docs/당직규칙.md` 참고.
- 조기퇴근 파생(`deriveEarlyLeave`): 오전1→당일 1.5h, 오전2→당일 1.0h, 오후1→**다음 근무일**(주말·공휴일 제외) 0.5h.
- 배정 제약(반 겹침, 연속일 같은 슬롯 금지, 요일 균등 등)의 전체 명세는 `README.md`와 `docs/당직규칙.md`에 있고, `scripts/check-rule.mjs`로 점검한다.

### 일정 카테고리 (`lib/events.js`)
- `EVENT_TYPES = ["행사","휴가","생일","중요","기타"]` — DB `event_type` enum과 반드시 일치.
- 새 카테고리 추가 시: enum 마이그레이션(`ALTER TYPE ... ADD VALUE`) + `EVENT_TYPES`/`TYPE_SLUG`/`EVENT_TYPE_ICON` 3곳 + `globals.css` 색상 클래스를 함께 갱신.

## 관례 / 주의점

- **언어**: 코드 주석·커밋 메시지·UI 전부 한국어. 유지할 것.
- **커밋 컨벤션**: `Ver 0.4.0_<변경 요약>` 형태 (버전은 `package.json`과 맞춤).
- 날짜 키 포맷은 항상 `"YYYY-MM-DD"` 문자열. 월 페이지 조회 시 월말 오후1의 "다음 근무일"이 다음 달로 넘어갈 수 있어 **공휴일은 다음 달 초까지 확장 조회**한다(`[month]/page.js`의 `holidayWindowEnd`).
- 이벤트 바가 여러 날에 걸치거나 여러 개 쌓일 때의 세로 배치는 `calendarUtils.js`의 레인 알고리즘이 담당한다. 레인은 각 열 구간의 **실제 겹침**으로 판정한다(끝 열 하나만 보고 판정하지 않음).
- `docs/`의 `.json` 백업은 데이터 마이그레이션 시점의 스냅샷(예: 오후2 폐지 전). 참고용.
