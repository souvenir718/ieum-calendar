// 달력/당직 관련 순수 함수. 월(year, monthIndex)을 파라미터로 받는다.
// monthIndex는 0-based (Date.UTC 규약).

export const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
export const SLOT_ORDER = { 오전1: 0, 오전2: 1, 오후1: 2, 오후2: 3 };

export function pad2(n) {
  return String(n).padStart(2, "0");
}

// "2026-07" → { year: 2026, monthIndex: 6 } / 형식 오류면 null
export function parseMonth(monthStr) {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(monthStr || "")) return null;
  const [year, month] = monthStr.split("-").map(Number);
  return { year, monthIndex: month - 1 };
}

export function dateKey(year, monthIndex, day) {
  return `${year}-${pad2(monthIndex + 1)}-${pad2(day)}`;
}

export function daysInMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

export function displayMonth(year, monthIndex) {
  return `${year}년 ${monthIndex + 1}월`;
}

// 인접 월 문자열 (delta: -1 이전, +1 다음)
export function adjacentMonth(monthStr, delta) {
  const { year, monthIndex } = parseMonth(monthStr);
  const d = new Date(Date.UTC(year, monthIndex + delta, 1));
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}`;
}

// 현재 월 (기본 Asia/Seoul 기준)
export function currentMonth(timeZone = "Asia/Seoul") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year").value;
  const m = parts.find((p) => p.type === "month").value;
  return `${y}-${m}`;
}

export function firstDayOffset(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex, 1)).getUTCDay();
}

// 한 달의 날짜 메타 배열
export function getMonthDays(year, monthIndex, data = {}) {
  const { holidays = {}, assignments = {}, events = {} } = data;
  const total = daysInMonth(year, monthIndex);
  return Array.from({ length: total }, (_, i) => {
    const day = i + 1;
    const key = dateKey(year, monthIndex, day);
    const weekdayIndex = new Date(Date.UTC(year, monthIndex, day)).getUTCDay();
    return {
      key,
      day,
      weekday: weekdayLabels[weekdayIndex],
      weekdayIndex,
      isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
      holidayName: holidays[key] || "",
      assignments: assignments[key] || [],
      events: events[key] || [],
    };
  });
}

// 월~토(일요일 제외)를 주 단위로 묶는다. 각 주는 [월,화,수,목,금,토] 6칸.
export function getDutyWeeks(days) {
  const weeks = [];
  for (const day of days) {
    if (day.weekdayIndex === 0) continue; // 일요일 제외
    const col = day.weekdayIndex - 1; // 월=0 ... 토=5
    if (col === 0 || weeks.length === 0) weeks.push(Array(6).fill(null));
    weeks[weeks.length - 1][col] = day;
  }
  return weeks;
}

// 당직표(인쇄) 한 칸의 표시 정보
export function dutyCellInfo(day) {
  if (!day) return { type: "empty" };
  const base = { day: day.day, weekdayIndex: day.weekdayIndex, holidayName: day.holidayName };
  if (day.holidayName) return { ...base, type: "holiday" };
  if (day.weekdayIndex === 6 || day.assignments.length === 0)
    return { ...base, type: "dash" };
  const pick = (slot) =>
    (day.assignments.find((entry) => entry[0] === slot) || [])[1] || "";
  return {
    ...base,
    type: "duty",
    morning: [pick("오전1"), pick("오전2")].filter(Boolean).join("/"),
    afternoon: [pick("오후1"), pick("오후2")].filter(Boolean).join("/"),
  };
}

export function dutyDateClass(cell) {
  if (cell.type === "empty") return "";
  if (cell.holidayName || cell.weekdayIndex === 0) return "date-red";
  if (cell.weekdayIndex === 6) return "date-blue";
  return "";
}

// 조기퇴근 내역 파생: 오전1→당일 1.5, 오전2→당일 1.0, 오후1→다음 근무일 0.5
export function deriveEarlyLeave(assignments, holidays = {}) {
  const toKey = (date) =>
    `${date.getUTCFullYear()}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
  const nextWorkday = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    do {
      date.setUTCDate(date.getUTCDate() + 1);
    } while (date.getUTCDay() === 0 || date.getUTCDay() === 6 || holidays[toKey(date)]);
    return toKey(date);
  };

  const map = {};
  const push = (key, name, hours) => {
    if (!name) return;
    (map[key] ||= []).push([name, hours]);
  };

  for (const [key, slots] of Object.entries(assignments)) {
    const pick = (slot) => (slots.find((entry) => entry[0] === slot) || [])[1] || "";
    push(key, pick("오전1"), "1.5");
    push(key, pick("오전2"), "1.0");
    push(nextWorkday(key), pick("오후1"), "0.5");
  }

  for (const entries of Object.values(map)) {
    entries.sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
  }
  return map;
}
