// DB 자격 증명 없이 현재 캘린더 로직과 월별 조회 경계를 검증한다.
const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");

// package.json의 CommonJS 설정을 유지하면서 독립적인 ESM 모듈을 로드한다.
async function loadModule(file) {
  const source = await fs.readFile(path.join(__dirname, "..", file), "utf8");
  return import(`data:text/javascript;base64,${Buffer.from(source).toString("base64")}`);
}

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
      duties: [duty("2026-12-31", "오후1", "담당")],
      holidays: [{ holiday_date: "2027-01-01", name: "신정" }],
    }, "2027-01-01", "2027-01-31");
    assert.deepEqual(result.leave["2027-01-04"], [["담당", "0.5"]]);
    assert.equal(result.leave["2027-01-01"], undefined);
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
main().catch(error => { console.error(error); process.exitCode = 1; });
