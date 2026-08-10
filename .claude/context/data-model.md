# 데이터 모델 (`migrations/`)

테이블 스키마나 RLS 정책을 바꿀 때 참조. Supabase SQL Editor에 직접 붙여 실행하는 방식. 마이그레이션 러너 없음.

- `staff` — 명단. `class_name`(반), `is_duty_eligible`, `sort_order`.
- `holidays` — `holiday_date`(PK), `name`.
- `duties` — `duty_date` + `slot`(enum) + `staff_id`. **`unique(duty_date, slot)`** — 하루 한 슬롯 1명.
- `events` — `type`(enum) + `title` + `start_date`/`end_date`(기간). `check(end_date >= start_date)`.
- **RLS**: 4개 테이블 모두 public **read만** 허용. 쓰기 정책 없음 → 반드시 service_role로만 쓴다.
