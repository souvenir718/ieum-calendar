// 월초 조기퇴근 계산을 위해 가장 최근의 이전 오후1 배정도 함께 읽는다.
// 고정된 며칠 전 범위를 쓰지 않아 월 경계의 긴 연휴도 처리한다.
export async function loadMonthDutyData(supabase, monthStart, monthEnd, holidayWindowEnd) {
  const [current, previous] = await Promise.all([
    supabase.from("duties")
      .select("duty_date, slot, staff:staff_id(name)")
      .gte("duty_date", monthStart)
      .lte("duty_date", monthEnd),
    supabase.from("duties")
      .select("duty_date, slot, staff:staff_id(name)")
      .eq("slot", "오후1")
      .lt("duty_date", monthStart)
      .order("duty_date", { ascending: false })
      .limit(1),
  ]);
  for (const result of [current, previous]) {
    if (result.error) throw new Error(result.error.message);
  }

  const priorRows = previous.data ?? [];
  const holidays = await supabase.from("holidays")
    .select("holiday_date, name")
    .gte("holiday_date", priorRows[0]?.duty_date ?? monthStart)
    .lte("holiday_date", holidayWindowEnd);
  if (holidays.error) throw new Error(holidays.error.message);

  return {
    duties: [...priorRows, ...(current.data ?? [])],
    holidays: holidays.data ?? [],
  };
}
