# 아키텍처

## 라우팅 / 렌더링

- `app/page.js` → `currentMonth()`로 `/{YYYY-MM}` 리다이렉트 (Asia/Seoul 기준).
- `app/[month]/page.js` — 월 페이지. **`force-static` + `revalidate = 60`** (ISR). 서버에서 Supabase를 anon 키로 읽어 `CalendarClient`에 props로 넘긴다. 쓰기 API는 `revalidatePath`로 이 캐시를 갱신한다.
- `app/components/CalendarClient.jsx` — 가장 큰 클라이언트 컴포넌트. 달력 그리드 + 이벤트 바 + 모달 + 편집 진입점 + 모바일 스와이프 월 이동을 전부 담당.
- `app/stats/page.js` — 당직 통계 페이지.

## 데이터 흐름의 두 갈래

1. **읽기**: 서버 컴포넌트(`[month]/page.js`) → `getSupabaseServer()`(anon) → RLS의 public read 정책만 통과.
2. **쓰기**: API 라우트 → `getSupabaseAdmin()`(service_role, RLS 우회) → 성공 시 `revalidatePath`.

`lib/supabase/`에 클라이언트가 3종 있으니 용도에 맞게 골라 쓸 것:
- `server.js` `getSupabaseServer()` — 서버 읽기(anon).
- `admin.js` `getSupabaseAdmin()` — 서버 쓰기(service_role). **브라우저에서 호출 시 throw**.
- `client.js` `getSupabaseBrowser()` — 브라우저 읽기(anon).

## 편집 권한 모델 (`lib/edit-session.js`)

- **당직 편집만** 인증이 필요하다. PIN → `POST /api/edit-session` → HMAC 서명된 만료 토큰을 httpOnly 쿠키(`ieum_edit`, TTL 8h)로 발급. `requireEditSession()`이 `PUT /api/duties`를 보호.
- **일정(events) 편집은 인증 없음** (내부용). `/api/events*`는 누구나 호출 가능.
- PIN·토큰 비교는 `crypto.timingSafeEqual`로 상수시간 처리.

## API 라우트 (모두 `force-dynamic`)

- `POST/DELETE/GET /api/edit-session` — 편집 잠금 해제/잠금/조회.
- `POST /api/events`, `PUT/DELETE /api/events/[id]` — 일정 CRUD (인증 없음).
- `PUT /api/duties` — 한 날짜의 슬롯별 담당자 upsert/삭제 (**PIN 세션 필수**).
- `POST /api/revalidate` — 월 페이지 + `/stats`의 ISR 캐시 무효화. `REVALIDATE_SECRET` 필요. 시드 스크립트로 `duties`/`events`를 직접 upsert했을 때 `scripts/revalidate.mjs`로 호출한다.

## 순수 로직은 `lib/`에 분리

- `lib/calendar.js` — 날짜/월 유틸, `getMonthDays`, `getDutyWeeks`, `deriveEarlyLeave`(조기퇴근 파생) 등. **monthIndex는 0-based**, 날짜는 전부 UTC(`Date.UTC`) 기준으로 다뤄 타임존 흔들림을 없앤다.
- `app/components/calendarUtils.js` — 이벤트 바 레이아웃(주 단위 span 분할 + 레인 배치).
- `lib/events.js` / `lib/duties.js` — 입력 검증 + 상수 (라우트·UI 공용).
- `lib/print-config.js` — 인쇄 레이아웃/범례 상수 (DB 아님).

## 도메인 상세는 온디맨드 참조

- 당직 슬롯 규칙, 조기퇴근 파생, 배정 제약 → `.claude/context/duty-rules.md`
- 일정 카테고리, EVENT_TYPES 확장 절차 → `.claude/context/event-categories.md`
- 데이터 모델(테이블 스키마, RLS, 마이그레이션) → `.claude/context/data-model.md`
