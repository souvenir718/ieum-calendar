-- 일정 카테고리 확장: 생일, 중요, 기타 추가
-- Supabase SQL Editor에서 실행하세요. (enum 값 추가는 한 줄씩 실행됩니다.)
alter type event_type add value if not exists '생일';
alter type event_type add value if not exists '중요';
alter type event_type add value if not exists '기타';
