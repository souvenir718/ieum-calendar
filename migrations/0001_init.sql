-- 이음어린이집 캘린더 초기 스키마
-- Supabase SQL Editor에 붙여넣어 실행하세요.

create extension if not exists "pgcrypto";

-- ── enum ─────────────────────────────────────────────────
do $$ begin
  create type duty_slot as enum ('오전1','오전2','오후1','오후2');
exception when duplicate_object then null; end $$;

do $$ begin
  create type staff_role as enum ('teacher','director');
exception when duplicate_object then null; end $$;

do $$ begin
  create type event_type as enum ('휴가','행사');
exception when duplicate_object then null; end $$;

-- ── staff / 명단 ─────────────────────────────────────────
create table if not exists staff (
  id               uuid primary key default gen_random_uuid(),
  name             text not null unique,
  class_name       text,                          -- 포근반 / 다솜반 / 도담반 / 라온반 / null(원장)
  role             staff_role not null default 'teacher',
  is_duty_eligible boolean not null default true,
  sort_order       int not null default 0,
  created_at       timestamptz not null default now()
);

-- ── holidays / 공휴일 ────────────────────────────────────
create table if not exists holidays (
  holiday_date date primary key,
  name         text not null
);

-- ── duties / 당직 ────────────────────────────────────────
create table if not exists duties (
  id         uuid primary key default gen_random_uuid(),
  duty_date  date not null,
  slot       duty_slot not null,
  staff_id   uuid not null references staff(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (duty_date, slot)                        -- 같은 날 같은 슬롯은 1명
);
create index if not exists duties_month_idx on duties (duty_date);

-- ── events / 일정(휴가·행사) ─────────────────────────────
create table if not exists events (
  id         uuid primary key default gen_random_uuid(),
  type       event_type not null,
  title      text not null,
  start_date date not null,
  end_date   date not null,
  staff_id   uuid references staff(id) on delete set null,  -- 선택(휴가 담당자 등)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (end_date >= start_date)
);
create index if not exists events_range_idx on events (start_date, end_date);

-- ── updated_at 트리거 ────────────────────────────────────
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists duties_touch on duties;
create trigger duties_touch before update on duties
  for each row execute function touch_updated_at();

drop trigger if exists events_touch on events;
create trigger events_touch before update on events
  for each row execute function touch_updated_at();

-- ── RLS: 공개 읽기, anon 쓰기 정책 없음 ──────────────────
-- 쓰기는 서버의 service_role 키(RLS 우회)로만 수행한다.
alter table staff    enable row level security;
alter table holidays enable row level security;
alter table duties   enable row level security;
alter table events   enable row level security;

drop policy if exists "public read staff" on staff;
create policy "public read staff" on staff for select using (true);

drop policy if exists "public read holidays" on holidays;
create policy "public read holidays" on holidays for select using (true);

drop policy if exists "public read duties" on duties;
create policy "public read duties" on duties for select using (true);

drop policy if exists "public read events" on events;
create policy "public read events" on events for select using (true);
