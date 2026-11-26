// 규칙 점검: 다음 근무일에 조기퇴근하는 당직자(오후1, 교사회의 날의 오전1·오전2)가 "다음 근무일"에 당직이 있는지,
// 그리고 그 다음 근무일이 본인 연차라 조기퇴근을 못 쓰게 되는지(연차 미루기 기간 DAY_OFF_SHIFT 제외) 본다.
// 판정 기준은 그 날짜에 발효 중인 규칙(lib/duty-rules.js)에 따라 달라진다.
//
// 오후1에 조기퇴근이 있는 기간(~2026-09, 2026-11~):
//  - 다음 근무일 당직(오전·오후 모두) = 하드 위반(조기퇴근 날은 당직 불가)
// 오후1이 시간외수당으로 바뀐 기간(2026-10 한 달):
//  - 배정 제약은 해제됐으므로 위반이 아니다. 다만 연속 근무는 지양이라 안내로만 출력한다.
//
// 실행: node --env-file=.env.local scripts/check-rule.mjs
import { createClient } from "@supabase/supabase-js";

import { DAY_OFF_SHIFT, earlyLeaveRuleFor, leavesEarlyNextWorkday, teacherMeetingDays } from "../lib/duty-rules.js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

const [{ data, error }, meetingRes, dayOffRes] = await Promise.all([
  supabase.from("duties").select("duty_date, slot, staff:staff_id(name)").order("duty_date").order("slot"),
  supabase.from("events").select("title, start_date, end_date").ilike("title", "%회의%"),
  // 연차 일정은 staff_id가 비어 있어 제목의 이름으로 매칭한다(plan-duties.mjs와 동일).
  supabase.from("events").select("title, start_date, end_date").eq("type", "연차"),
]);
for (const e of [error, meetingRes.error, dayOffRes.error]) {
  if (e) {
    console.error("조회 실패:", e.message);
    process.exit(1);
  }
}
const meetingDays = new Set(teacherMeetingDays(meetingRes.data));
const isDayOff = (name, key) =>
  dayOffRes.data.some((e) => e.title.includes(name) && key >= e.start_date && key <= e.end_date);
const inDayOffShift = (key) => key >= DAY_OFF_SHIFT.from && (!DAY_OFF_SHIFT.to || key <= DAY_OFF_SHIFT.to);

// 날짜별 { slot: name }
const byDate = {};
for (const r of data) {
  (byDate[r.duty_date] ||= {})[r.slot] = r.staff?.name ?? "";
}
const dates = Object.keys(byDate).sort();

const violations = [];
const advisories = [];
const dayOffHits = [];
for (let i = 0; i < dates.length - 1; i++) {
  const d = dates[i];
  const next = dates[i + 1]; // 다음 근무일(주말·공휴일은 애초에 duties에 없음)
  const nextSlots = byDate[next];
  for (const [slot, person] of Object.entries(byDate[d])) {
    if (!person) continue;
    const meetingDay = meetingDays.has(d);
    if (!inDayOffShift(d) && leavesEarlyNextWorkday(d, slot, meetingDay) && isDayOff(person, next)) {
      dayOffHits.push({ date: d, slot: meetingDay && slot !== "오후1" ? `${slot}(교사회의)` : slot, person, next });
    }
    const hitSlots = Object.entries(nextSlots)
      .filter(([, name]) => name === person)
      .map(([s]) => s);
    if (!hitSlots.length) continue;
    const meeting = meetingDays.has(d);
    if (leavesEarlyNextWorkday(d, slot, meeting)) {
      violations.push({ date: d, slot: meeting && slot !== "오후1" ? `${slot}(교사회의)` : slot, person, next, hitSlots, severity: "하드" });
    } else if (slot === "오후1" && !earlyLeaveRuleFor(d, "오후1")) {
      // 조기퇴근이 없는 기간의 오후1은 다음 근무일 제약이 없다 → 연속 근무 안내로만 남긴다.
      advisories.push({ date: d, person, next, hitSlots });
    }
  }
}

console.log(
  `전체 근무일: ${dates.length}일, 위반: ${violations.length + dayOffHits.length}건, 연속 근무 안내: ${advisories.length}건\n`,
);
for (const v of violations) {
  console.log(
    `[${v.severity}] ${v.date} ${v.slot} ${v.person} → 다음 근무일 ${v.next}에 ${v.hitSlots.join(",")} 로 배정됨`,
  );
}
for (const v of dayOffHits) {
  console.log(`[하드] ${v.date} ${v.slot} ${v.person} → 다음 근무일 ${v.next}이 연차라 조기퇴근을 쓸 수 없음`);
}
if (!violations.length && !dayOffHits.length) console.log("위반 없음 ✓");
for (const a of advisories) {
  console.log(
    `[지양] ${a.date} 오후1 ${a.person} → 다음 근무일 ${a.next}에 ${a.hitSlots.join(",")} (제약 해제 기간이나 연속 근무)`,
  );
}
