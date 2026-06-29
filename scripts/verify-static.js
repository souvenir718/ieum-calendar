const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const requiredFiles = [
  "app/layout.js",
  "app/page.js",
  "app/globals.css",
  "public/assets/ieum-kindergarten.png",
  "vercel.json",
];
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));

if (missing.length > 0) {
  console.error(`Missing required files: ${missing.join(", ")}`);
  process.exit(1);
}

const app = fs.readFileSync(path.join(root, "app/page.js"), "utf8");
const legacyAfternoonCount = Array.from(app.matchAll(/\["오후",\s*"[^"]+"\]/g)).length;
const assignments = Array.from(
  app.matchAll(/\["(오전1|오전2|오후1|오후2)",\s*"([^"]+)"\]/g),
);
const assignmentCount = assignments.length;
const expectedTotals = {
  김민경: 12,
  이혜빈: 12,
  봉은영: 12,
  홍여진: 12,
  어영경: 12,
  최옥희: 12,
  정지혜: 12,
};
const expectedSlotCounts = {
  오전1: { 김민경: 3, 이혜빈: 3, 봉은영: 3, 홍여진: 3, 어영경: 3, 최옥희: 3, 정지혜: 3 },
  오전2: { 김민경: 3, 이혜빈: 3, 봉은영: 3, 홍여진: 3, 어영경: 3, 최옥희: 3, 정지혜: 3 },
  오후1: { 김민경: 3, 이혜빈: 3, 봉은영: 3, 홍여진: 3, 어영경: 3, 최옥희: 3, 정지혜: 3 },
  오후2: { 김민경: 3, 이혜빈: 3, 봉은영: 3, 홍여진: 3, 어영경: 3, 최옥희: 3, 정지혜: 3 },
};
const classes = {
  이혜빈: "포근반",
  정지혜: "포근반",
  홍여진: "포근반",
  김민경: "다솜반",
  최옥희: "다솜반",
  어영경: "도담반",
  봉은영: "라온반",
};
const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];

if (legacyAfternoonCount > 0) {
  console.error(`Found ${legacyAfternoonCount} legacy 오후 assignments.`);
  process.exit(1);
}

if (app.includes('"2026-07-01": [')) {
  console.error("2026-07-01 should not have duty assignments.");
  process.exit(1);
}

if (assignmentCount !== 84) {
  console.error(`Expected 84 assignments, found ${assignmentCount}.`);
  process.exit(1);
}

const totals = Object.fromEntries(Object.keys(expectedTotals).map((person) => [person, 0]));
const slotCounts = Object.fromEntries(
  Object.keys(expectedSlotCounts).map((slot) => [
    slot,
    Object.fromEntries(Object.keys(expectedTotals).map((person) => [person, 0])),
  ]),
);

for (const [, slot, person] of assignments) {
  if (!(person in totals)) {
    console.error(`Unexpected person: ${person}.`);
    process.exit(1);
  }

  totals[person] += 1;
  slotCounts[slot][person] += 1;
}

for (const [person, expected] of Object.entries(expectedTotals)) {
  if (totals[person] !== expected) {
    console.error(`Expected ${person} to have ${expected} assignments, found ${totals[person]}.`);
    process.exit(1);
  }
}

for (const [slot, expectedByPerson] of Object.entries(expectedSlotCounts)) {
  for (const [person, expected] of Object.entries(expectedByPerson)) {
    if (slotCounts[slot][person] !== expected) {
      console.error(
        `Expected ${person} to have ${expected} ${slot} assignments, found ${slotCounts[slot][person]}.`,
      );
      process.exit(1);
    }
  }
}

const dateBlocks = Array.from(app.matchAll(/"(\d{4}-\d{2}-\d{2})": \[\n([\s\S]*?)\n    \]/g));
const weekdayCounts = Object.fromEntries(
  Object.keys(expectedTotals).map((person) => [
    person,
    { 월: 0, 화: 0, 수: 0, 목: 0, 금: 0 },
  ]),
);
const slotWeekdayCounts = Object.fromEntries(
  Object.keys(expectedTotals).map((person) => [
    person,
    Object.fromEntries(
      Object.keys(expectedSlotCounts).map((slot) => [slot, { 월: 0, 화: 0, 수: 0, 목: 0, 금: 0 }]),
    ),
  ]),
);
const dayPatterns = new Set();
let previousAfternoonTwo = "";
let previousAfternoonOne = "";
let previousDayAssignments = null;
let afternoonOneNextDayDuty = 0;
const afternoonOneNextDayDutyDays = [];

for (const [, date, block] of dateBlocks) {
  const weekday = weekdayLabels[new Date(`${date}T00:00:00Z`).getUTCDay()];
  const dayAssignments = Object.fromEntries(
    Array.from(block.matchAll(/\["(오전1|오전2|오후1|오후2)",\s*"([^"]+)"\]/g)).map(
      ([, slot, person]) => [slot, person],
    ),
  );
  const morningTeachers = [dayAssignments["오전1"], dayAssignments["오전2"]];
  const afternoonTeachers = [dayAssignments["오후1"], dayAssignments["오후2"]];
  const pattern = Object.entries(dayAssignments)
    .map(([slot, person]) => `${slot}:${person}`)
    .join("|");

  if (new Set(Object.values(dayAssignments)).size !== 4) {
    console.error(`Expected 4 different teachers on ${date}.`);
    process.exit(1);
  }

  if (dayPatterns.has(pattern)) {
    console.error(`Repeated day pattern found on ${date}.`);
    process.exit(1);
  }

  dayPatterns.add(pattern);

  if (classes[morningTeachers[0]] === classes[morningTeachers[1]]) {
    console.error(`Morning class conflict on ${date}: ${morningTeachers.join(", ")}.`);
    process.exit(1);
  }

  if (classes[afternoonTeachers[0]] === classes[afternoonTeachers[1]]) {
    console.error(`Afternoon class conflict on ${date}: ${afternoonTeachers.join(", ")}.`);
    process.exit(1);
  }

  if (previousAfternoonTwo && morningTeachers.includes(previousAfternoonTwo)) {
    console.error(`${previousAfternoonTwo} has morning duty on ${date} after previous 오후2 duty.`);
    process.exit(1);
  }

  if (previousAfternoonOne && afternoonTeachers.includes(previousAfternoonOne)) {
    console.error(`${previousAfternoonOne} has afternoon duty on ${date} after previous 오후1 duty.`);
    process.exit(1);
  }

  // (소프트) 오후1 담당자가 다음 근무일에 오전 당직을 맡은 경우 — 실패는 아니고 집계만
  if (previousAfternoonOne && morningTeachers.includes(previousAfternoonOne)) {
    afternoonOneNextDayDuty += 1;
    afternoonOneNextDayDutyDays.push(`${date}(${previousAfternoonOne})`);
  }

  if (previousDayAssignments) {
    for (const slot of ["오전1", "오전2", "오후1", "오후2"]) {
      if (dayAssignments[slot] === previousDayAssignments[slot]) {
        console.error(`${dayAssignments[slot]} has consecutive ${slot} duty ending on ${date}.`);
        process.exit(1);
      }
    }
  }

  for (const [slot, person] of Object.entries(dayAssignments)) {
    weekdayCounts[person][weekday] += 1;
    slotWeekdayCounts[person][slot][weekday] += 1;
  }

  previousAfternoonTwo = dayAssignments["오후2"];
  previousAfternoonOne = dayAssignments["오후1"];
  previousDayAssignments = dayAssignments;
}

for (const [person, counts] of Object.entries(weekdayCounts)) {
  for (const [weekday, count] of Object.entries(counts)) {
    if (count < 2) {
      console.error(`Expected ${person} to have at least 2 assignments on ${weekday}, found ${count}.`);
      process.exit(1);
    }

    if (count > 3) {
      console.error(`Expected ${person} to have at most 3 assignments on ${weekday}, found ${count}.`);
      process.exit(1);
    }
  }
}

for (const [person, slots] of Object.entries(slotWeekdayCounts)) {
  for (const [slot, counts] of Object.entries(slots)) {
    for (const [weekday, count] of Object.entries(counts)) {
      if (count > 1) {
        console.error(
          `Expected ${person} to have at most 1 ${slot} assignment on ${weekday}, found ${count}.`,
        );
        process.exit(1);
      }
    }
  }
}

if (afternoonOneNextDayDuty === 0) {
  console.log("[soft] 오후1 담당자는 다음 근무일에 당직 없음 (충돌 0건).");
} else {
  console.warn(
    `[soft] 오후1 담당자가 다음 근무일에 오전 당직을 맡은 경우 ${afternoonOneNextDayDuty}건: ${afternoonOneNextDayDutyDays.join(", ")}`,
  );
}

console.log("Next calendar files verified.");
