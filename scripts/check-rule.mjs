// 규칙 점검: 오후1 담당자가 "다음 근무일"에 당직이 있는지 본다.
// 판정 기준은 그 날짜에 발효 중인 규칙(lib/duty-rules.js)에 따라 달라진다.
//
// 오후1에 조기퇴근이 있는 기간(~2026-09, 2026-11~):
//  - 다음 근무일 오후1/오후2 = 하드 위반(조기퇴근과 물리적으로 충돌)
//  - 다음 근무일 오전1/오전2 = 소프트 위반(다음날 당직 없어야 함)
// 오후1이 시간외수당으로 바뀐 기간(2026-10 한 달):
//  - 배정 제약은 해제됐으므로 위반이 아니다. 다만 연속 근무는 지양이라 안내로만 출력한다.
//
// 실행: node --env-file=.env.local scripts/check-rule.mjs
import { createClient } from "@supabase/supabase-js";

import { earlyLeaveRuleFor } from "../lib/duty-rules.js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

const { data, error } = await supabase
  .from("duties")
  .select("duty_date, slot, staff:staff_id(name)")
  .order("duty_date")
  .order("slot");
if (error) {
  console.error("조회 실패:", error.message);
  process.exit(1);
}

// 날짜별 { slot: name }
const byDate = {};
for (const r of data) {
  (byDate[r.duty_date] ||= {})[r.slot] = r.staff?.name ?? "";
}
const dates = Object.keys(byDate).sort();

const violations = [];
const advisories = [];
for (let i = 0; i < dates.length - 1; i++) {
  const d = dates[i];
  const next = dates[i + 1]; // 다음 근무일(주말·공휴일은 애초에 duties에 없음)
  const pm1 = byDate[d]["오후1"];
  if (!pm1) continue;
  const nextSlots = byDate[next];
  const hitSlots = Object.entries(nextSlots)
    .filter(([, name]) => name === pm1)
    .map(([slot]) => slot);
  if (!hitSlots.length) continue;

  // 조기퇴근이 없는 기간의 오후1은 다음 근무일 제약이 없다 → 연속 근무 안내로만 남긴다.
  if (!earlyLeaveRuleFor(d, "오후1")) {
    advisories.push({ date: d, person: pm1, next, hitSlots });
    continue;
  }
  const isAfternoon = hitSlots.some((s) => s === "오후1" || s === "오후2");
  violations.push({ date: d, person: pm1, next, hitSlots, severity: isAfternoon ? "하드" : "소프트" });
}

console.log(
  `전체 근무일: ${dates.length}일, 위반: ${violations.length}건, 연속 근무 안내: ${advisories.length}건\n`,
);
for (const v of violations) {
  console.log(
    `[${v.severity}] ${v.date} 오후1 ${v.person} → 다음 근무일 ${v.next}에 ${v.hitSlots.join(",")} 로 배정됨`,
  );
}
if (!violations.length) console.log("위반 없음 ✓");
for (const a of advisories) {
  console.log(
    `[지양] ${a.date} 오후1 ${a.person} → 다음 근무일 ${a.next}에 ${a.hitSlots.join(",")} (제약 해제 기간이나 연속 근무)`,
  );
}
