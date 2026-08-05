-- 일정 카테고리 변경: 휴가 → 연차로 이름 변경, 오전반차/오후반차 추가
-- Supabase SQL Editor에서 한 줄씩 실행하세요.
alter type event_type rename value '휴가' to '연차';
alter type event_type add value if not exists '오전반차';
alter type event_type add value if not exists '오후반차';
