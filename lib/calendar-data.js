import { teacherMeetingDays } from "./duty-rules.js";

// 월초 조기퇴근 계산을 위해 이전 달 마지막 당직일의 배정(전 슬롯)과 그날의 교사회의 여부도 함께 읽는다.
// (오후1 → 다음 근무일, 교사회의 날 오전1·오전2 → 다음 근무일 조기퇴근이 이번 달로 넘어올 수 있다)
// 고정된 며칠 전 범위를 쓰지 않아 월 경계의 긴 연휴도 처리한다.
export async function loadMonthDutyData(supabase, monthStart, monthEnd, holidayWindowEnd) {
  const [current, previous] = await Promise.all([
    supabase.from("duties")
      .select("duty_date, slot, staff:staff_id(name)")
      .gte("duty_date", monthStart)
      .lte("duty_date", monthEnd),
    supabase.from("duties")
      .select("duty_date")
      .lt("duty_date", monthStart)
      .order("duty_date", { ascending: false })
      .limit(1),
  ]);
  for (const result of [current, previous]) {
    if (result.error) throw new Error(result.error.message);
  }

  const priorDate = previous.data?.[0]?.duty_date;
  const [prior, holidays, priorEvents] = await Promise.all([
    priorDate
      ? supabase.from("duties")
        .select("duty_date, slot, staff:staff_id(name)")
        .eq("duty_date", priorDate)
      : { data: [], error: null },
    supabase.from("holidays")
      .select("holiday_date, name")
      .gte("holiday_date", priorDate ?? monthStart)
      .lte("holiday_date", holidayWindowEnd),
    priorDate
      ? supabase.from("events")
        .select("title, start_date, end_date")
        .lte("start_date", priorDate)
        .gte("end_date", priorDate)
      : { data: [], error: null },
  ]);
  for (const result of [prior, holidays, priorEvents]) {
    if (result.error) throw new Error(result.error.message);
  }

  return {
    duties: [...(prior.data ?? []), ...(current.data ?? [])],
    holidays: holidays.data ?? [],
    // 이번 달 교사회의는 화면의 일정 목록에서 구하므로 여기서는 전월 마지막 당직일 것만 넘긴다.
    carryMeetingDays: teacherMeetingDays(priorEvents.data ?? []).filter((key) => key === priorDate),
  };
}
