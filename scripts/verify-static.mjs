// DB 자격 증명 없이 현재 캘린더 로직과 월별 조회 경계를 검증한다.
import assert from "node:assert/strict";
import path from "node:path";
import { pathToFileURL } from "node:url";

const repoRoot = path.join(import.meta.dirname, "..");
const loadModule = (file) => import(pathToFileURL(path.join(repoRoot, file)).href);

function database(tables, failure) {
  return {
    from(table) {
      let rows = [...(tables[table] || [])];
      const query = {
        select() { return query; },
        eq(key, value) { rows = rows.filter(row => row[key] === value); return query; },
        lt(key, value) { rows = rows.filter(row => row[key] < value); return query; },
        gte(key, value) { rows = rows.filter(row => row[key] >= value); return query; },
        lte(key, value) { rows = rows.filter(row => row[key] <= value); return query; },
        order(key, { ascending }) {
          rows.sort((a, b) => a[key].localeCompare(b[key]) * (ascending ? 1 : -1));
          return query;
        },
        limit(count) { rows = rows.slice(0, count); return query; },
        then(resolve, reject) {
          return Promise.resolve({ data: rows, error: table === failure ? { message: "DB unavailable" } : null })
            .then(resolve, reject);
        },
      };
      return query;
    },
  };
}

async function main() {
  const calendar = await loadModule("lib/calendar.js");
  const { loadMonthDutyData } = await loadModule("lib/calendar-data.js");
  const { parseEventBody } = await loadModule("lib/events.js");
  const { parseDutyBody } = await loadModule("lib/duties.js");
  let count = 0;
  async function check(name, run) {
    await run();
    console.log(`✓ ${name}`);
    count++;
  }
  const duty = (date, slot, name) => ({ duty_date: date, slot, staff: { name } });
  async function earlyLeave(tables, monthStart, monthEnd) {
    const data = await loadMonthDutyData(database(tables), monthStart, monthEnd, monthEnd);
    const assignments = {};
    for (const row of data.duties) (assignments[row.duty_date] ||= []).push([row.slot, row.staff.name]);
    const holidays = Object.fromEntries(data.holidays.map(row => [row.holiday_date, row.name]));
    return { data, assignments, leave: calendar.deriveEarlyLeave(assignments, holidays) };
  }

  await check("전월 말 오후1 → 월초 0.5 조기퇴근, 현재 월 당직 유지", async () => {
    const result = await earlyLeave({ duties: [
      duty("2026-08-28", "오후1", "이전 담당"),
      duty("2026-08-31", "오후1", "전월 담당"),
      duty("2026-08-31", "오전1", "전월 오전"),
      duty("2026-09-01", "오전1", "이번 달 담당"),
      duty("2026-10-01", "오전1", "다음 달 담당"),
    ] }, "2026-09-01", "2026-09-30");
    assert.deepEqual(result.leave["2026-09-01"], [["이번 달 담당", "1.5"], ["전월 담당", "0.5"]]);
    assert.equal(result.data.duties.length, 2);
    const days = calendar.getMonthDays(2026, 8, { assignments: result.assignments });
    assert.equal(days.length, 30);
    assert.deepEqual(days[0].assignments, [["오전1", "이번 달 담당"]]);
  });
  await check("연도 경계·주말·공휴일을 건너뛴 조기퇴근", async () => {
    const result = await earlyLeave({
      duties: [duty("2025-12-31", "오후1", "담당")],
      holidays: [{ holiday_date: "2026-01-01", name: "신정" }],
    }, "2026-01-01", "2026-01-31");
    assert.deepEqual(result.leave["2026-01-02"], [["담당", "0.5"]]);
    assert.equal(result.leave["2026-01-01"], undefined);
  });
  // 2026-10-01부터 오후1은 조기퇴근 대신 시간외수당. 규칙은 "당직을 선 날짜" 기준으로 고른다.
  await check("발효일 직전 오후1은 새 규칙 달로 넘어가도 옛 규칙대로 이월", async () => {
    const result = await earlyLeave(
      { duties: [duty("2026-09-30", "오후1", "9월 담당")] },
      "2026-10-01",
      "2026-10-31",
    );
    assert.deepEqual(result.leave["2026-10-01"], [["9월 담당", "0.5"]]);
  });
  await check("발효일 이후 오후1은 조기퇴근 없음, 오전 당직은 그대로", async () => {
    const result = await earlyLeave(
      { duties: [duty("2026-10-01", "오후1", "10월 담당"), duty("2026-10-01", "오전2", "오전 담당")] },
      "2026-10-01",
      "2026-10-31",
    );
    assert.deepEqual(result.leave["2026-10-01"], [["오전 담당", "1.0"]]);
    assert.equal(result.leave["2026-10-02"], undefined);
  });
  await check("슬롯 시간·인쇄 표기도 발효일 기준으로 바뀜", async () => {
    const { dutySlotsFor } = await loadModule("lib/duty-rules.js");
    const { dutyHoursAt } = await loadModule("lib/print-config.js");
    const before = Object.fromEntries(dutySlotsFor("2026-09-30").map((s) => [s.name, s]));
    const after = Object.fromEntries(dutySlotsFor("2026-10-01").map((s) => [s.name, s]));
    assert.equal(before.오후1.time, "9:00 ~ 18:30");
    assert.equal(after.오후1.time, "9:00 ~ 19:00");
    assert.equal(after.오후1.note, "1시간 시간 외 수당 지급");
    assert.equal(before.오전1.time, after.오전1.time);
    assert.deepEqual(
      dutyHoursAt("2026-10-01").find((h) => h.label === "오후1"),
      { label: "오후1", time: "오후 4시 30분 ~ 7시" },
    );
  });
  await check("전월부터 이어지는 긴 연휴도 고정 조회 기간 없이 처리", async () => {
    const holidays = Array.from({ length: 10 }, (_, i) => ({ holiday_date: `2026-08-${22 + i}`, name: "테스트 휴일" }));
    const result = await earlyLeave({ duties: [duty("2026-08-21", "오후1", "담당")], holidays }, "2026-09-01", "2026-09-30");
    assert.deepEqual(result.leave["2026-09-01"], [["담당", "0.5"]]);
  });
  await check("오래된 이전 배정은 이번 달 조기퇴근으로 이월하지 않음", async () => {
    const result = await earlyLeave({ duties: [duty("2026-07-01", "오후1", "담당")] }, "2026-09-01", "2026-09-30");
    assert.equal(result.leave["2026-09-01"], undefined);
  });
  await check("이전 배정·현재 배정이 없어도 정상 처리", async () => {
    const result = await earlyLeave({}, "2026-09-01", "2026-09-30");
    assert.deepEqual(result.leave, {});
  });
  await check("DB 조회 실패를 빈 당직표로 숨기지 않음", async () => {
    for (const table of ["duties", "holidays"]) {
      await assert.rejects(loadMonthDutyData(database({}, table), "2026-09-01", "2026-09-30", "2026-10-07"), /DB unavailable/);
    }
  });
  await check("윤년·연도 경계·잘못된 월 처리", () => {
    assert.equal(calendar.daysInMonth(2024, 1), 29);
    assert.equal(calendar.adjacentMonth("2026-12", 1), "2027-01");
    assert.equal(calendar.adjacentMonth("2027-01", -1), "2026-12");
    assert.equal(calendar.parseMonth("2026-13"), null);
  });
  await check("일정 제목·기간 검증 및 종료일 기본값", () => {
    const body = { type: "행사", title: " 행사 ", start_date: "2026-09-14" };
    assert.equal(parseEventBody(body).value.end_date, "2026-09-14");
    assert.equal(parseEventBody(body).value.title, "행사");
    assert.ok(parseEventBody({ ...body, title: " " }).error);
    assert.ok(parseEventBody({ ...body, end_date: "2026-09-13" }).error);
  });
  await check("당직 슬롯·담당자 형식 검증 및 배정 해제", () => {
    assert.ok(parseDutyBody({ date: "2026-09-14", assignments: { 야간: null } }).error);
    assert.ok(parseDutyBody({ date: "2026-09-14", assignments: { 오전1: "invalid" } }).error);
    assert.deepEqual(parseDutyBody({ date: "2026-09-14", assignments: { 오전1: "" } }).value.assignments, { 오전1: null });
  });
  console.log(`\n${count} checks passed.`);
}
await main().catch(error => { console.error(error); process.exitCode = 1; });
