// 월별 당직 배정 초안 생성기.
//
//   node --env-file=.env.local scripts/plan-duties.mjs 2026-10            # 초안 출력만 (DB 무변경)
//   node --env-file=.env.local scripts/plan-duties.mjs 2026-10 --json     # 초안을 JSON으로
//
// 특정 칸을 못박고 나머지만 다시 최적화하려면 --fix 를 반복해서 쓴다.
//   ... 2026-10 --fix 2026-10-01:오후1=김민경 --fix 2026-10-15:오전1=홍여진
// 슬롯을 | 로 여러 개 주면 "그 중 하나"라는 뜻이고, 더 나은 쪽을 골라 쓴다.
//   ... 2026-11 --fix 2026-11-03:오전1|오전2=정지혜
//   node --env-file=.env.local scripts/plan-duties.mjs 2026-10 --apply    # duties upsert
//
// 연차/반차는 events 테이블에서 읽는다(staff_id가 비어 있어 제목의 이름으로 매칭).
// 배정 규칙의 전체 명세는 README.md와 docs/당직규칙.md 참고.
import { createClient } from "@supabase/supabase-js";

import { dateKey, daysInMonth, parseMonth, weekdayLabels } from "../lib/calendar.js";
import { earlyLeaveRuleFor } from "../lib/duty-rules.js";

const SLOTS = ["오전1", "오전2", "오후1"];
const MORNING = new Set(["오전1", "오전2"]);
// 시드가 고정돼 있어 같은 입력이면 항상 같은 초안이 나온다(검토 → --apply 사이 결과가 안 바뀜).
const RESTARTS = Number(process.env.PLAN_RESTARTS || 60);

const monthStr = process.argv[2];
const apply = process.argv.includes("--apply");
const asJson = process.argv.includes("--json");

// --fix YYYY-MM-DD:슬롯[|슬롯...]=이름 → [{ key, slots, name }]
const fixRequests = [];
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] !== "--fix") continue;
  const m = /^(\d{4}-\d{2}-\d{2}):([^=]+)=(.+)$/.exec(process.argv[i + 1] || "");
  if (!m) { console.error(`--fix 형식 오류: ${process.argv[i + 1]} (예: 2026-11-03:오전1|오전2=정지혜)`); process.exit(1); }
  fixRequests.push({ key: m[1], slots: m[2].split("|").map((x) => x.trim()), name: m[3] });
}
// 후보가 여럿이면 조합을 모두 만들어 각각 최적화한 뒤 가장 좋은 것을 쓴다.
let fixed = {};
const parsed = parseMonth(monthStr || "");
if (!parsed) {
  console.error("사용법: node --env-file=.env.local scripts/plan-duties.mjs YYYY-MM [--apply]");
  process.exit(1);
}
const { year, monthIndex } = parsed;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
const sb = createClient(url, anonKey, { auth: { persistSession: false } });

const monthStart = dateKey(year, monthIndex, 1);
const monthEnd = dateKey(year, monthIndex, daysInMonth(year, monthIndex));

// ─────────────────────────────── 데이터 수집

const [staffRes, holidayRes, eventRes, prevRes, historyRes] = await Promise.all([
  sb.from("staff").select("id, name, class_name, is_duty_eligible").order("sort_order"),
  sb.from("holidays").select("holiday_date, name").gte("holiday_date", monthStart).lte("holiday_date", monthEnd),
  sb.from("events").select("type, title, start_date, end_date")
    .in("type", ["연차", "오전반차", "오후반차"]).lte("start_date", monthEnd).gte("end_date", monthStart),
  sb.from("duties").select("duty_date, slot, staff:staff_id(name)")
    .lt("duty_date", monthStart).order("duty_date", { ascending: false }).limit(12),
  sb.from("duties").select("duty_date, slot, staff:staff_id(name)").lt("duty_date", monthStart),
]);
for (const r of [staffRes, holidayRes, eventRes, prevRes, historyRes]) {
  if (r.error) { console.error("조회 실패:", r.error.message); process.exit(1); }
}

const people = staffRes.data.filter((s) => s.is_duty_eligible);
const holidays = Object.fromEntries(holidayRes.data.map((h) => [h.holiday_date, h.name]));

// 근무일: 월~금 중 공휴일 제외
const workdays = [];
for (let day = 1; day <= daysInMonth(year, monthIndex); day++) {
  const key = dateKey(year, monthIndex, day);
  const wd = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
  if (wd === 0 || wd === 6 || holidays[key]) continue;
  workdays.push({ key, day, wd, label: weekdayLabels[wd] });
}

// 연차/반차 → 이름별 차단 정보. events.staff_id가 비어 있어 제목에서 이름을 찾는다.
const blocked = new Map(people.map((p) => [p.name, new Map()])); // name → key → "종일"|"오전"|"오후"
const leaveNotes = [];
for (const ev of eventRes.data) {
  const owner = people.find((p) => ev.title.includes(p.name));
  if (!owner) { leaveNotes.push(`⚠ 담당자를 못 찾음: [${ev.type}] ${ev.title}`); continue; }
  const scope = ev.type === "오전반차" ? "오전" : ev.type === "오후반차" ? "오후" : "종일";
  const hit = [];
  for (const d of workdays) {
    if (d.key >= ev.start_date && d.key <= ev.end_date) { blocked.get(owner.name).set(d.key, scope); hit.push(d.key); }
  }
  leaveNotes.push(`${owner.name} ${ev.type} ${ev.start_date}~${ev.end_date} → 근무일 ${hit.length}일`);
}
const isBlocked = (name, key, slot) => {
  const scope = blocked.get(name).get(key);
  if (!scope) return false;
  if (scope === "종일") return true;
  return scope === "오전" ? MORNING.has(slot) : !MORNING.has(slot);
};

// 전월 마지막 근무일: 연속 슬롯 금지 + 오후1 조기퇴근 이월 판정에 쓴다.
const prevByDate = {};
for (const r of prevRes.data) (prevByDate[r.duty_date] ||= {})[r.slot] = r.staff?.name;
const prevKey = Object.keys(prevByDate).sort().pop();
const prevDay = prevKey ? prevByDate[prevKey] : {};
// 전월 오후1 담당자가 조기퇴근 규칙 적용 대상이면 첫 근무일에 오후 당직을 줄 수 없다.
const carryEarlyLeave = prevKey && earlyLeaveRuleFor(prevKey, "오후1") ? prevDay["오후1"] : null;

// 고정 배정 검증 — 규칙상 불가능한 지정은 배정을 시작하기 전에 알려준다.
const isFixed = (key, slot) => Boolean(fixed[key]?.[slot]);

function fixError(key, slot, name) {
  const d = workdays.find((w) => w.key === key);
  if (!d) return `${key} 는 이 달의 근무일이 아닙니다.`;
  if (!SLOTS.includes(slot)) return `슬롯 ${slot} 은 이 달 배정 대상이 아닙니다.`;
  if (!people.some((p) => p.name === name)) return `${name} 은 당직 대상자가 아닙니다.`;
  if (isBlocked(name, key, slot)) return `${name} 은 ${key} 에 연차/반차 중입니다.`;
  if (d === workdays[0] && carryEarlyLeave === name && !MORNING.has(slot)) {
    return `${name} 은 전월 오후1의 조기퇴근이 이월돼 첫 근무일 오후 당직을 설 수 없습니다.`;
  }
  if (d === workdays[0] && prevDay[slot] === name) return `${name} 은 직전 근무일에도 ${slot} 이었습니다.`;
  return null;
}

// 후보 슬롯 중 규칙상 가능한 것만 남긴다.
for (const req of fixRequests) {
  const reasons = [];
  req.slots = req.slots.filter((slot) => {
    const err = fixError(req.key, slot, req.name);
    if (err) reasons.push(`  ${req.key} ${slot}: ${err}`);
    return !err;
  });
  if (!req.slots.length) {
    console.error(`--fix ${req.key} = ${req.name} 는 어느 슬롯으로도 배정할 수 없습니다.\n${reasons.join("\n")}`);
    process.exit(1);
  }
}

// 후보 조합 전개 — 같은 날 두 지정이 같은 슬롯을 집는 조합은 버린다.
let fixCombos = [{}];
for (const req of fixRequests) {
  const next = [];
  for (const combo of fixCombos) {
    for (const slot of req.slots) {
      if (combo[req.key]?.[slot]) continue;
      next.push({ ...combo, [req.key]: { ...combo[req.key], [slot]: req.name } });
    }
  }
  fixCombos = next;
}
if (!fixCombos.length) { console.error("--fix 지정이 서로 충돌합니다."); process.exit(1); }

// ─────────────────────────────── 목표치

const totalNeeded = workdays.length * SLOTS.length;
const availability = Object.fromEntries(people.map((p) => [
  p.name,
  workdays.filter((d) => blocked.get(p.name).get(d.key) !== "종일").length,
]));
const prevMonthCount = Object.fromEntries(people.map((p) => [p.name, 0]));
for (const r of prevRes.data) if (r.staff?.name) prevMonthCount[r.staff.name] += 1;

// 근무 가능일이 많은 사람부터 나머지 1회를 더 맡는다.
const ranked = [...people].sort((a, b) =>
  availability[b.name] - availability[a.name]
  || prevMonthCount[a.name] - prevMonthCount[b.name]
  || a.name.localeCompare(b.name, "ko"));
const base = Math.floor(totalNeeded / people.length);
const extra = totalNeeded % people.length;
const target = {};
ranked.forEach((p, i) => { target[p.name] = base + (i < extra ? 1 : 0); });

// ─────────────────────────────── 배정

// ─────────────────────────────── 누적 이력
//
// 한 달만 고르게 짜도 요일 쏠림은 달을 넘어 누적된다(실제로 7~9월에 한 명이 크게 치우쳤다).
// 그래서 이전 달들의 요일·슬롯 분포를 읽어와 이번 달에서 되돌리는 방향으로 배정한다.

const priorWd = Object.fromEntries(people.map((p) => [p.name, {}]));
const priorSlot = Object.fromEntries(people.map((p) => [p.name, Object.fromEntries(SLOTS.map((x) => [x, 0]))]));
const priorTotal = Object.fromEntries(people.map((p) => [p.name, 0]));
const priorWdAll = {};
const priorSlotAll = Object.fromEntries(SLOTS.map((x) => [x, 0]));
let priorAll = 0;
// 보상도 균등 대상이다. 오전 당직은 조기퇴근(시간), 오후 연장 당직은 시간외수당(돈)으로
// 성격이 달라 한쪽으로만 쏠리지 않도록 각각 누적을 따로 센다.
const priorEarly = Object.fromEntries(people.map((p) => [p.name, 0]));
const priorOver = Object.fromEntries(people.map((p) => [p.name, 0]));
let priorEarlyAll = 0;
let priorOverAll = 0;
for (const r of historyRes.data) {
  const n = r.staff?.name;
  if (!n || !(n in priorTotal)) continue;
  const wd = new Date(`${r.duty_date}T00:00:00Z`).getUTCDay();
  priorWd[n][wd] = (priorWd[n][wd] || 0) + 1;
  priorTotal[n] += 1;
  priorWdAll[wd] = (priorWdAll[wd] || 0) + 1;
  priorAll += 1;
  if (r.slot in priorSlotAll) { priorSlot[n][r.slot] += 1; priorSlotAll[r.slot] += 1; }
  const rule = earlyLeaveRuleFor(r.duty_date, r.slot);
  if (rule) { priorEarly[n] += parseFloat(rule.hours); priorEarlyAll += parseFloat(rule.hours); }
  else if (r.slot === "오후1" || r.slot === "오후2") { priorOver[n] += 1; priorOverAll += 1; }
}

// 요일별 1인 기대 배정 횟수 — 특정 요일에 쏠리거나 한 번도 안 서는 일을 막는다.
const wdExpected = {};
for (const d of workdays) wdExpected[d.wd] = (wdExpected[d.wd] || 0) + SLOTS.length / people.length;

// 이번 달까지 합쳤을 때의 1인 기대치
const cumWdExpected = {};
for (const wd of new Set([...Object.keys(priorWdAll), ...workdays.map((d) => String(d.wd))])) {
  const thisMonth = workdays.filter((d) => String(d.wd) === String(wd)).length * SLOTS.length;
  cumWdExpected[wd] = ((priorWdAll[wd] || 0) + thisMonth) / people.length;
}
const cumSlotExpected = Object.fromEntries(
  SLOTS.map((x) => [x, (priorSlotAll[x] + workdays.length) / people.length]),
);
const cumTotalExpected = (priorAll + totalNeeded) / people.length;

// 이번 달 각 슬롯이 조기퇴근인지 시간외수당인지는 발효일 규칙이 정한다.
const slotEarlyHours = Object.fromEntries(SLOTS.map((x) => {
  const rule = earlyLeaveRuleFor(monthStart, x);
  return [x, rule ? parseFloat(rule.hours) : 0];
}));
const slotIsOvertime = Object.fromEntries(SLOTS.map((x) => [x, !slotEarlyHours[x] && !MORNING.has(x)]));
const cumEarlyExpected = (priorEarlyAll + workdays.length * SLOTS.reduce((a, x) => a + slotEarlyHours[x], 0)) / people.length;
const cumOverExpected = (priorOverAll + workdays.length * SLOTS.filter((x) => slotIsOvertime[x]).length) / people.length;

const rand = (() => { let s = 20261001; return () => ((s = (s * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff); })();
const shuffled = (arr) => arr.map((v) => [rand(), v]).sort((a, b) => a[0] - b[0]).map(([, v]) => v);
const classOf = Object.fromEntries(people.map((p) => [p.name, p.class_name]));

function build() {
  const plan = {};
  const count = Object.fromEntries(people.map((p) => [p.name, 0]));
  const slotCount = Object.fromEntries(people.map((p) => [p.name, { 오전1: 0, 오전2: 0, 오후1: 0 }]));
  const wdCount = Object.fromEntries(people.map((p) => [p.name, {}]));

  for (let i = 0; i < workdays.length; i++) {
    const d = workdays[i];
    const yesterday = i === 0 ? prevDay : plan[workdays[i - 1].key] || {};
    const today = {};
    for (const [slot, name] of Object.entries(fixed[d.key] || {})) {
      today[slot] = name;
      count[name] += 1;
      slotCount[name][slot] += 1;
      wdCount[name][d.wd] = (wdCount[name][d.wd] || 0) + 1;
    }
    for (const slot of shuffled(SLOTS.filter((x) => !isFixed(d.key, x)))) {
      const pool = shuffled(people).filter((p) => {
        const n = p.name;
        if (Object.values(today).includes(n)) return false;            // 하루 1회
        if (isBlocked(n, d.key, slot)) return false;                   // 연차/반차
        if (yesterday[slot] === n) return false;                       // 연속 근무일 같은 슬롯 금지
        if (i === 0 && carryEarlyLeave === n && !MORNING.has(slot)) return false; // 이월 조기퇴근과 충돌
        if (MORNING.has(slot)) {                                       // 같은 반 오전 묶음 금지
          const other = today[slot === "오전1" ? "오전2" : "오전1"];
          if (other && classOf[other] && classOf[other] === classOf[n]) return false;
        }
        return true;
      });
      if (!pool.length) return null;
      // 남은 필요량이 많은 사람 우선 → 총횟수·슬롯 균등에 자연히 수렴한다.
      pool.sort((a, b) => {
        const need = (p) => (target[p.name] - count[p.name]) * 3 - slotCount[p.name][slot];
        const wd = (p) => wdCount[p.name][d.wd] || 0;
        return need(b) - need(a) || wd(a) - wd(b);
      });
      const pick = pool[0].name;
      today[slot] = pick;
      count[pick] += 1;
      slotCount[pick][slot] += 1;
      wdCount[pick][d.wd] = (wdCount[pick][d.wd] || 0) + 1;
    }
    plan[d.key] = today;
  }
  return { plan, count, slotCount, wdCount };
}

function stats(plan) {
  const count = Object.fromEntries(people.map((p) => [p.name, 0]));
  const slotCount = Object.fromEntries(people.map((p) => [p.name, { 오전1: 0, 오전2: 0, 오후1: 0 }]));
  const wdCount = Object.fromEntries(people.map((p) => [p.name, {}]));
  for (const d of workdays) {
    for (const slot of SLOTS) {
      const n = plan[d.key][slot];
      count[n] += 1;
      slotCount[n][slot] += 1;
      wdCount[n][d.wd] = (wdCount[n][d.wd] || 0) + 1;
    }
  }
  return { count, slotCount, wdCount };
}

// 반드시 지켜야 하는 제약 위반 목록 (배정 결과 검증 + 스왑 허용 판정에 공용)
function hardViolations(plan) {
  const issues = [];
  for (let i = 0; i < workdays.length; i++) {
    const d = workdays[i];
    const t = plan[d.key];
    const names = SLOTS.map((s) => t[s]);
    if (new Set(names).size !== names.length) issues.push(`${d.key} 같은 사람 중복 배정`);
    if (classOf[t["오전1"]] && classOf[t["오전1"]] === classOf[t["오전2"]]) {
      issues.push(`${d.key} 오전 묶음 반 겹침(${classOf[t["오전1"]]})`);
    }
    const prev = i === 0 ? prevDay : plan[workdays[i - 1].key];
    for (const slot of SLOTS) {
      if (isBlocked(t[slot], d.key, slot)) issues.push(`${d.key} ${slot} ${t[slot]} 연차/반차 중 배정`);
      if (prev[slot] === t[slot]) issues.push(`${d.key} ${slot} ${t[slot]} 연속 근무일 같은 슬롯`);
    }
    if (i === 0 && carryEarlyLeave && t["오후1"] === carryEarlyLeave) {
      issues.push(`${d.key} 오후1 ${carryEarlyLeave} 이월 조기퇴근과 충돌`);
    }
  }
  return issues;
}

function score(plan) {
  const { count, slotCount, wdCount } = stats(plan);
  let cost = 0;
  for (const p of people) {
    const n = p.name;
    cost += 20 * Math.abs(count[n] - target[n]);
    for (const slot of SLOTS) {
      cost += 6 * Math.max(0, Math.abs(slotCount[n][slot] - count[n] / 3) - 0.5);
    }
    for (const [wd, expected] of Object.entries(wdExpected)) {
      cost += 7 * Math.max(0, Math.abs((wdCount[n][wd] || 0) - expected) - 0.7);
    }
    // 누적 보정: 지난 달들까지 합친 분포가 기대치에서 벗어나면 이번 달로 되돌린다.
    for (const [wd, expected] of Object.entries(cumWdExpected)) {
      const cum = (priorWd[n][wd] || 0) + (wdCount[n][wd] || 0);
      cost += 9 * Math.max(0, Math.abs(cum - expected) - 1);
    }
    for (const slot of SLOTS) {
      const cum = priorSlot[n][slot] + slotCount[n][slot];
      cost += 5 * Math.max(0, Math.abs(cum - cumSlotExpected[slot]) - 1);
    }
    cost += 5 * Math.max(0, Math.abs(priorTotal[n] + count[n] - cumTotalExpected) - 1);
    const early = priorEarly[n] + SLOTS.reduce((a, x) => a + slotCount[n][x] * slotEarlyHours[x], 0);
    const over = priorOver[n] + SLOTS.reduce((a, x) => a + (slotIsOvertime[x] ? slotCount[n][x] : 0), 0);
    cost += 8 * Math.max(0, Math.abs(early - cumEarlyExpected) - 1);
    cost += 8 * Math.max(0, Math.abs(over - cumOverExpected) - 1);
  }
  const seen = new Set();
  for (let i = 0; i < workdays.length; i++) {
    const today = plan[workdays[i].key];
    const sig = SLOTS.map((s) => today[s]).join("|");
    if (seen.has(sig)) cost += 8;
    seen.add(sig);
    // 같은 요일 같은 슬롯 반복
    for (let j = i + 1; j < workdays.length; j++) {
      if (workdays[j].wd !== workdays[i].wd) continue;
      for (const slot of SLOTS) if (plan[workdays[j].key][slot] === today[slot]) cost += 3;
    }
    if (i + 1 >= workdays.length) continue;
    // 오후1 다음 근무일 연속 당직은 지양(제약 해제 기간이어도 부담이 크다)
    const next = plan[workdays[i + 1].key];
    if (today["오후1"] && SLOTS.some((s) => next[s] === today["오후1"])) cost += 10;
  }
  return cost;
}

// 두 칸의 담당자를 맞바꿔 보며 비용이 줄면 채택한다(하드 제약은 항상 유지).
function polish(plan) {
  const cells = workdays.flatMap((d) => SLOTS.filter((slot) => !isFixed(d.key, slot)).map((slot) => [d.key, slot]));
  let cost = score(plan);
  let improved = true;
  while (improved) {
    improved = false;
    for (let a = 0; a < cells.length; a++) {
      for (let b = a + 1; b < cells.length; b++) {
        const [ka, sa] = cells[a];
        const [kb, sb] = cells[b];
        if (plan[ka][sa] === plan[kb][sb]) continue;
        [plan[ka][sa], plan[kb][sb]] = [plan[kb][sb], plan[ka][sa]];
        const next = hardViolations(plan).length ? Infinity : score(plan);
        if (next < cost) { cost = next; improved = true; }
        else [plan[ka][sa], plan[kb][sb]] = [plan[kb][sb], plan[ka][sa]];
      }
    }
  }
  return cost;
}

let best = null;
for (const combo of fixCombos) {
  fixed = combo;
  for (let t = 0; t < RESTARTS; t++) {
    const candidate = build();
    if (!candidate) continue;
    const cost = polish(candidate.plan);
    if (!best || cost < best.cost) best = { plan: candidate.plan, cost, fixed: combo };
  }
}
if (!best) { console.error("제약을 만족하는 배정을 찾지 못했습니다."); process.exit(1); }
fixed = best.fixed;

// ─────────────────────────────── 출력

const { plan } = best;
if (asJson) {
  console.log(JSON.stringify({ month: monthStr, workdays: workdays.map((d) => d.key), slots: SLOTS, plan }, null, 2));
  process.exit(0);
}
const { count, slotCount, wdCount } = stats(plan);
console.log(`\n■ ${year}년 ${monthIndex + 1}월 당직 초안  (근무일 ${workdays.length}일 × ${SLOTS.length}슬롯 = ${totalNeeded}건, 비용 ${best.cost})`);
console.log(`  공휴일 제외: ${Object.entries(holidays).map(([k, v]) => `${k.slice(5)} ${v}`).join(", ") || "없음"}`);
console.log(`  전월 마지막 근무일 ${prevKey}: ${SLOTS.map((s) => `${s} ${prevDay[s] ?? "-"}`).join(" / ")}`);
console.log(`  이월 조기퇴근: ${carryEarlyLeave ? `${carryEarlyLeave} (첫 근무일 오후 당직 제외)` : "없음"}`);
for (const [key, slots] of Object.entries(fixed)) {
  for (const [slot, name] of Object.entries(slots)) console.log(`  📌 고정: ${key} ${slot} = ${name}`);
}
for (const note of leaveNotes) console.log(`  · ${note}`);

console.log(`\n날짜        요일  오전1    오전2    오후1`);
for (const d of workdays) {
  const t = plan[d.key];
  const pad = (s) => (s || "-").padEnd(7, " ");
  const leave = people.filter((p) => blocked.get(p.name).has(d.key)).map((p) => p.name);
  console.log(`${d.key}  ${d.label}   ${pad(t["오전1"])} ${pad(t["오전2"])} ${pad(t["오후1"])}${leave.length ? `   ← 연차: ${leave.join(",")}` : ""}`);
}

console.log(`\n이름     총합(목표)  오전1 오전2 오후1   월 화 수 목 금   근무가능일`);
for (const p of [...people].sort((a, b) => count[b.name] - count[a.name] || a.name.localeCompare(b.name, "ko"))) {
  const n = p.name;
  const wd = [1, 2, 3, 4, 5].map((i) => String(wdCount[n][i] || 0)).join("  ");
  console.log(`${n.padEnd(7)}  ${String(count[n]).padStart(2)}(${target[n]})       ${SLOTS.map((s) => String(slotCount[n][s]).padStart(2)).join("   ")}    ${wd}       ${availability[n]}`);
}

// 규칙 재점검
const issues = hardViolations(plan);

const advisories = [];
for (let i = 0; i < workdays.length - 1; i++) {
  const pm1 = plan[workdays[i].key]["오후1"];
  const next = plan[workdays[i + 1].key];
  const hit = SLOTS.filter((s) => next[s] === pm1);
  if (hit.length) advisories.push(`${workdays[i].key} 오후1 ${pm1} → ${workdays[i + 1].key} ${hit.join(",")}`);
}
console.log(`\n하드 위반: ${issues.length}건${issues.length ? "\n  " + issues.join("\n  ") : " ✓"}`);
console.log(`연속 근무(지양): ${advisories.length}건${advisories.length ? "\n  " + advisories.join("\n  ") : " ✓"}`);

if (!apply) {
  console.log(`\n※ DB에 반영하지 않았습니다. 확정하려면 --apply 를 붙여 다시 실행하세요.`);
  process.exit(0);
}

// ─────────────────────────────── 반영 (service_role 필요)

const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!serviceKey) { console.error("SUPABASE_SERVICE_ROLE_KEY 가 필요합니다."); process.exit(1); }
const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
const idOf = Object.fromEntries(people.map((p) => [p.name, p.id]));
const rows = workdays.flatMap((d) => SLOTS.map((slot) => ({ duty_date: d.key, slot, staff_id: idOf[plan[d.key][slot]] })));
const { error } = await admin.from("duties").upsert(rows, { onConflict: "duty_date,slot" });
if (error) { console.error("반영 실패:", error.message); process.exit(1); }
console.log(`\n✓ duties ${rows.length}건 upsert 완료. ISR 캐시 갱신: node --env-file=.env.local scripts/revalidate.mjs ${monthStr}`);
