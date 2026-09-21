// 당직 누적 균등성 점검. 월별·슬롯별·요일별 분포와 부담 지표를 함께 본다.
//
//   node --env-file=.env.local scripts/check-balance.mjs
//   node --env-file=.env.local scripts/check-balance.mjs --plan plan-2026-10.json
//
// --plan 은 `plan-duties.mjs --json` 결과 파일. 아직 DB에 없는 초안을 합쳐서 볼 때 쓴다.
import fs from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

import { weekdayLabels } from "../lib/calendar.js";
import { earlyLeaveRuleFor } from "../lib/duty-rules.js";

const SLOTS = ["오전1", "오전2", "오후1", "오후2"];
const planIndex = process.argv.indexOf("--plan");
const planPath = planIndex > -1 ? process.argv[planIndex + 1] : null;

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
  auth: { persistSession: false },
});
const { data, error } = await sb.from("duties").select("duty_date, slot, staff:staff_id(name)").order("duty_date");
if (error) { console.error("조회 실패:", error.message); process.exit(1); }

// [{ date, slot, name, draft }]
const rows = data.filter((r) => r.staff?.name).map((r) => ({ date: r.duty_date, slot: r.slot, name: r.staff.name, draft: false }));
let draftMonth = null;
if (planPath) {
  const plan = JSON.parse(await fs.readFile(planPath, "utf8"));
  draftMonth = plan.month;
  for (const date of plan.workdays) {
    for (const slot of plan.slots) rows.push({ date, slot, name: plan.plan[date][slot], draft: true });
  }
}

const names = [...new Set(rows.map((r) => r.name))].sort((a, b) => a.localeCompare(b, "ko"));
const months = [...new Set(rows.map((r) => r.date.slice(0, 7)))].sort();
const wdOf = (date) => new Date(`${date}T00:00:00Z`).getUTCDay();

const blank = () => Object.fromEntries(names.map((n) => [n, 0]));
const byMonth = Object.fromEntries(months.map((m) => [m, blank()]));
const bySlot = Object.fromEntries(SLOTS.map((s) => [s, blank()]));
const byWeekday = Object.fromEntries([1, 2, 3, 4, 5].map((w) => [w, blank()]));
const total = blank();
const earlyHours = blank();   // 조기퇴근 누적(시간) — 오전 당직에 따르는 보상
const overtime = blank();     // 시간외수당 대상 당직 횟수 — 오후 연장 당직의 보상

for (const r of rows) {
  byMonth[r.date.slice(0, 7)][r.name] += 1;
  bySlot[r.slot][r.name] += 1;
  byWeekday[wdOf(r.date)][r.name] += 1;
  total[r.name] += 1;
  const rule = earlyLeaveRuleFor(r.date, r.slot);
  if (rule) earlyHours[r.name] += parseFloat(rule.hours);
  else if (r.slot === "오후1" || r.slot === "오후2") overtime[r.name] += 1;
}

const pad = (v, w) => String(v).padStart(w);
const spread = (obj) => {
  const vals = names.map((n) => obj[n]);
  return { min: Math.min(...vals), max: Math.max(...vals), gap: Math.max(...vals) - Math.min(...vals) };
};

console.log(`\n■ 당직 누적 균등성 (${months[0]} ~ ${months.at(-1)}${draftMonth ? `, ${draftMonth}은 미반영 초안` : ""})`);
console.log(`  전체 ${rows.length}건 / ${names.length}명`);

console.log(`\n[월별 배정 횟수]`);
console.log(`이름      ${months.map((m) => pad(m.slice(5) + "월", 6)).join("")}   누적`);
for (const n of names) {
  console.log(`${n.padEnd(8)}${months.map((m) => pad(byMonth[m][n], 6)).join("")}   ${pad(total[n], 4)}`);
}
const t = spread(total);
console.log(`누적 편차: 최소 ${t.min} / 최대 ${t.max} / 차이 ${t.gap}`);

console.log(`\n[슬롯별 누적]`);
console.log(`이름      ${SLOTS.map((s) => pad(s, 7)).join("")}`);
for (const n of names) console.log(`${n.padEnd(8)}${SLOTS.map((s) => pad(bySlot[s][n], 7)).join("")}`);
for (const s of SLOTS) {
  const v = spread(bySlot[s]);
  console.log(`  ${s}: 최소 ${v.min} / 최대 ${v.max} / 차이 ${v.gap}`);
}

// 요일마다 근무일 수가 달라 절대 횟수로는 비교가 안 된다. 1인 기대치 대비로 본다.
const wdTotal = Object.fromEntries([1, 2, 3, 4, 5].map((w) => [w, names.reduce((a, n) => a + byWeekday[w][n], 0)]));
const wdExpect = Object.fromEntries([1, 2, 3, 4, 5].map((w) => [w, wdTotal[w] / names.length]));

console.log(`\n[요일별 누적]  괄호는 1인 기대치 대비 차이`);
console.log(`이름      ${[1, 2, 3, 4, 5].map((w) => pad(weekdayLabels[w], 11)).join("")}`);
for (const n of names) {
  const cells = [1, 2, 3, 4, 5].map((w) => {
    const diff = byWeekday[w][n] - wdExpect[w];
    return pad(`${byWeekday[w][n]}(${diff >= 0 ? "+" : ""}${diff.toFixed(1)})`, 11);
  });
  console.log(`${n.padEnd(8)}${cells.join("")}`);
}
console.log(`기대치    ${[1, 2, 3, 4, 5].map((w) => pad(wdExpect[w].toFixed(1), 11)).join("")}`);
const wdWorst = [];
for (const n of names) {
  for (const w of [1, 2, 3, 4, 5]) {
    const diff = byWeekday[w][n] - wdExpect[w];
    if (Math.abs(diff) >= 2.5) wdWorst.push(`${n} ${weekdayLabels[w]}요일 ${byWeekday[w][n]}회 (기대 ${wdExpect[w].toFixed(1)}, ${diff > 0 ? "+" : ""}${diff.toFixed(1)})`);
  }
}
console.log(wdWorst.length ? `  ⚠ 기대치에서 2.5회 이상 벗어남\n    ${wdWorst.join("\n    ")}` : "  요일 편중 없음 ✓");

console.log(`\n[보상 측면]`);
console.log(`이름      조기퇴근(h)  시간외수당(회)`);
for (const n of names) console.log(`${n.padEnd(8)}${pad(earlyHours[n].toFixed(1), 9)}${pad(overtime[n], 14)}`);
const e = spread(earlyHours);
const o = spread(overtime);
console.log(`  조기퇴근 시간 차이 ${e.gap.toFixed(1)}h (최소 ${e.min.toFixed(1)} / 최대 ${e.max.toFixed(1)})`);
console.log(`  시간외수당 횟수 차이 ${o.gap} (최소 ${o.min} / 최대 ${o.max})`);
