import { notFound } from "next/navigation";

import { getSupabaseServer } from "../../lib/supabase/server";
import {
  adjacentMonth,
  dateKey,
  daysInMonth,
  displayMonth,
  pad2,
  parseMonth,
  SLOT_ORDER,
} from "../../lib/calendar";
import CalendarClient from "../components/CalendarClient";

// 항상 최신 DB 상태를 반영 (편집 후 즉시 표시)
export const dynamic = "force-dynamic";

export default async function MonthPage({ params }) {
  const { month } = await params;
  const parsed = parseMonth(month);
  if (!parsed) notFound();
  const { year, monthIndex } = parsed;

  const monthStart = dateKey(year, monthIndex, 1);
  const monthEnd = dateKey(year, monthIndex, daysInMonth(year, monthIndex));
  // 월말 오후1의 "다음 근무일"이 다음 달로 넘어갈 수 있어 공휴일은 다음 달 초까지 조회
  const holidayWindowEnd = (() => {
    const d = new Date(Date.UTC(year, monthIndex + 1, 7));
    return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
  })();

  const supabase = getSupabaseServer();
  const [dutiesRes, holidaysRes, eventsRes] = await Promise.all([
    supabase
      .from("duties")
      .select("duty_date, slot, staff:staff_id(name)")
      .gte("duty_date", monthStart)
      .lte("duty_date", monthEnd),
    supabase
      .from("holidays")
      .select("holiday_date, name")
      .gte("holiday_date", monthStart)
      .lte("holiday_date", holidayWindowEnd),
    supabase
      .from("events")
      .select("id, type, title, start_date, end_date")
      .lte("start_date", monthEnd)
      .gte("end_date", monthStart)
      .order("start_date"),
  ]);

  for (const res of [dutiesRes, holidaysRes, eventsRes]) {
    if (res.error) throw new Error(res.error.message);
  }

  // assignments: { "YYYY-MM-DD": [[slot, name], ...] } (슬롯 순 정렬)
  const assignments = {};
  for (const row of dutiesRes.data ?? []) {
    const name = row.staff?.name ?? "";
    (assignments[row.duty_date] ||= []).push([row.slot, name]);
  }
  for (const list of Object.values(assignments)) {
    list.sort((a, b) => SLOT_ORDER[a[0]] - SLOT_ORDER[b[0]]);
  }

  // holidays: { "YYYY-MM-DD": name }
  const holidays = {};
  for (const row of holidaysRes.data ?? []) {
    holidays[row.holiday_date] = row.name;
  }

  // events: 기간 내 각 날짜에 제목 펼치기 (이번 달 범위 내만)
  const events = {};
  for (const row of eventsRes.data ?? []) {
    const start = new Date(`${row.start_date}T00:00:00Z`);
    const end = new Date(`${row.end_date}T00:00:00Z`);
    for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      const key = `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
      if (key < monthStart || key > monthEnd) continue;
      (events[key] ||= []).push({ id: row.id, title: row.title, type: row.type });
    }
  }

  // 편집용 원본 일정 목록 (id 포함, 직렬화 가능한 형태)
  const eventList = (eventsRes.data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    start_date: row.start_date,
    end_date: row.end_date,
  }));

  return (
    <CalendarClient
      month={month}
      displayMonth={displayMonth(year, monthIndex)}
      year={year}
      monthIndex={monthIndex}
      prevMonth={adjacentMonth(month, -1)}
      nextMonth={adjacentMonth(month, 1)}
      assignments={assignments}
      holidays={holidays}
      events={events}
      eventList={eventList}
    />
  );
}
