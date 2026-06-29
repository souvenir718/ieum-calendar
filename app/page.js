"use client";

import Image from "next/image";
import { Fragment, useState } from "react";

const schedule = {
  month: "2026-07",
  title: "2026년 7월 당직표",
  displayMonth: "2026년 7월",
  note: "7월 1일 당직 없음, 주말 및 공휴일 제외, 7월 17일 제헌절",
  people: [
    { name: "김민경", count: 12 },
    { name: "이혜빈", count: 12 },
    { name: "봉은영", count: 12 },
    { name: "홍여진", count: 12 },
    { name: "어영경", count: 12 },
    { name: "최옥희", count: 12 },
    { name: "정지혜", count: 12 },
  ],
  assignments: {
    "2026-07-02": [
      ["오전1", "김민경"],
      ["오전2", "정지혜"],
      ["오후1", "이혜빈"],
      ["오후2", "최옥희"],
    ],
    "2026-07-03": [
      ["오전1", "봉은영"],
      ["오전2", "김민경"],
      ["오후1", "최옥희"],
      ["오후2", "정지혜"],
    ],
    "2026-07-06": [
      ["오전1", "홍여진"],
      ["오전2", "어영경"],
      ["오후1", "김민경"],
      ["오후2", "봉은영"],
    ],
    "2026-07-07": [
      ["오전1", "정지혜"],
      ["오전2", "최옥희"],
      ["오후1", "이혜빈"],
      ["오후2", "어영경"],
    ],
    "2026-07-08": [
      ["오전1", "봉은영"],
      ["오전2", "이혜빈"],
      ["오후1", "어영경"],
      ["오후2", "홍여진"],
    ],
    "2026-07-09": [
      ["오전1", "이혜빈"],
      ["오전2", "봉은영"],
      ["오후1", "정지혜"],
      ["오후2", "김민경"],
    ],
    "2026-07-10": [
      ["오전1", "최옥희"],
      ["오전2", "홍여진"],
      ["오후1", "이혜빈"],
      ["오후2", "어영경"],
    ],
    "2026-07-13": [
      ["오전1", "김민경"],
      ["오전2", "정지혜"],
      ["오후1", "최옥희"],
      ["오후2", "이혜빈"],
    ],
    "2026-07-14": [
      ["오전1", "어영경"],
      ["오전2", "정지혜"],
      ["오후1", "홍여진"],
      ["오후2", "봉은영"],
    ],
    "2026-07-15": [
      ["오전1", "최옥희"],
      ["오전2", "어영경"],
      ["오후1", "김민경"],
      ["오후2", "이혜빈"],
    ],
    "2026-07-16": [
      ["오전1", "봉은영"],
      ["오전2", "최옥희"],
      ["오후1", "홍여진"],
      ["오후2", "어영경"],
    ],
    "2026-07-20": [
      ["오전1", "홍여진"],
      ["오전2", "이혜빈"],
      ["오후1", "어영경"],
      ["오후2", "김민경"],
    ],
    "2026-07-21": [
      ["오전1", "홍여진"],
      ["오전2", "봉은영"],
      ["오후1", "김민경"],
      ["오후2", "이혜빈"],
    ],
    "2026-07-22": [
      ["오전1", "어영경"],
      ["오전2", "홍여진"],
      ["오후1", "봉은영"],
      ["오후2", "정지혜"],
    ],
    "2026-07-23": [
      ["오전1", "최옥희"],
      ["오전2", "김민경"],
      ["오후1", "어영경"],
      ["오후2", "홍여진"],
    ],
    "2026-07-24": [
      ["오전1", "정지혜"],
      ["오전2", "봉은영"],
      ["오후1", "홍여진"],
      ["오후2", "김민경"],
    ],
    "2026-07-27": [
      ["오전1", "이혜빈"],
      ["오전2", "최옥희"],
      ["오후1", "봉은영"],
      ["오후2", "정지혜"],
    ],
    "2026-07-28": [
      ["오전1", "김민경"],
      ["오전2", "홍여진"],
      ["오후1", "정지혜"],
      ["오후2", "최옥희"],
    ],
    "2026-07-29": [
      ["오전1", "이혜빈"],
      ["오전2", "김민경"],
      ["오후1", "최옥희"],
      ["오후2", "봉은영"],
    ],
    "2026-07-30": [
      ["오전1", "정지혜"],
      ["오전2", "어영경"],
      ["오후1", "봉은영"],
      ["오후2", "홍여진"],
    ],
    "2026-07-31": [
      ["오전1", "어영경"],
      ["오전2", "이혜빈"],
      ["오후1", "정지혜"],
      ["오후2", "최옥희"],
    ],
  },
  holidays: {
    "2026-07-17": "제헌절",
  },
  events: {},
};

// ───────────────────────────────────────────────────────────────
// 인쇄(PDF)용 추가 설정 — 실제 값으로 수정해서 사용하세요.
// ───────────────────────────────────────────────────────────────
const printConfig = {
  title: "2026년 7월 당직 및 조기퇴근",
  org: "이음어린이집",
  // 당직시간 표기법
  dutyHours: [
    { label: "오전1", time: "오전 7시 30분 ~ 9시" },
    { label: "오전2", time: "오전 8시 ~ 9시" },
    { label: "오후1", time: "오후 4시 30분 ~ 6시 30분" },
    { label: "오후2", time: "오후 4시 30분 ~ 7시 30분" },
  ],
  dutyNote: "※ 보육교사 - 1개월 단위 탄력적 근로제",
  // 조기퇴근 표기법 (퇴근시간)
  earlyLegend: [
    { label: "0.5", time: "오후 5시 30분" },
    { label: "1", time: "오후 5시" },
    { label: "1.5", time: "오후 4시 30분" },
    { label: "2", time: "오후 4시" },
  ],
  earlyNote:
    "※ 오전 당직 근무에 따른 주 40시간 초과근무는 평일 근무 시간을 단축하며, 18시 이후 연장반 당직은 시간 외 수당을 지급함.",
  // 공람 서명란: 직급/반별 담당자
  viewers: [
    { group: "원장", members: ["김윤경"] },
    { group: "포근반", members: ["이혜빈", "정지혜", "홍여진"] },
    { group: "다솜반", members: ["김민경", "최옥희"] },
    { group: "도담반", members: ["어영경"] },
    { group: "라온반", members: ["봉은영"] },
  ],
  footerNote: "※ 위 표의 내용은 변경될 수 있습니다.",
};

// 조기퇴근 내역: 당직표 기준 자동 생성
//  - 오전1 → 당일 1.5, 오전2 → 당일 1.0
//  - 오후1 → 다음 근무일 0.5 (다음날이 주말/공휴일이면 그 다음 근무일로)
const earlyLeave = (() => {
  const toKey = (date) =>
    `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-${String(
      date.getUTCDate(),
    ).padStart(2, "0")}`;
  const nextWorkday = (key) => {
    const [year, month, day] = key.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    do {
      date.setUTCDate(date.getUTCDate() + 1);
    } while (
      date.getUTCDay() === 0 ||
      date.getUTCDay() === 6 ||
      schedule.holidays[toKey(date)]
    );
    return toKey(date);
  };

  const map = {};
  const push = (key, name, hours) => {
    if (!name) return;
    (map[key] ||= []).push([name, hours]);
  };

  for (const [key, slots] of Object.entries(schedule.assignments)) {
    const pick = (slot) => (slots.find((entry) => entry[0] === slot) || [])[1] || "";
    push(key, pick("오전1"), "1.5");
    push(key, pick("오전2"), "1.0");
    push(nextWorkday(key), pick("오후1"), "0.5");
  }

  for (const entries of Object.values(map)) {
    entries.sort((a, b) => parseFloat(b[1]) - parseFloat(a[1]));
  }
  return map;
})();

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const dutySlots = [
  { name: "오전1", time: "7:30 ~ 16:30", className: "morning-one" },
  { name: "오전2", time: "8:00 ~ 17:00", className: "morning-two" },
  {
    name: "오후1",
    time: "9:00 ~ 18:30",
    note: "다음날 30분 일찍 퇴근",
    className: "afternoon-one",
  },
  {
    name: "오후2",
    time: "9:30 ~ 19:30",
    note: "1시간 시간 외 수당 지급",
    className: "afternoon-two",
  },
];

function dateKey(day) {
  return `2026-07-${String(day).padStart(2, "0")}`;
}

function getDateMeta(day) {
  const date = new Date(Date.UTC(2026, 6, day));
  const weekdayIndex = date.getUTCDay();
  const key = dateKey(day);

  return {
    key,
    day,
    weekday: weekdayLabels[weekdayIndex],
    isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
    holidayName: schedule.holidays[key] || "",
    assignments: schedule.assignments[key] || [],
    events: schedule.events[key] || [],
  };
}

function getMonthDays() {
  return Array.from({ length: 31 }, (_, index) => getDateMeta(index + 1));
}

// 월~토(일요일 제외)를 주 단위로 묶는다. 각 주는 [월,화,수,목,금,토] 6칸.
function getDutyWeeks() {
  const weeks = [];
  for (const day of getMonthDays()) {
    const weekdayIndex = new Date(Date.UTC(2026, 6, day.day)).getUTCDay();
    if (weekdayIndex === 0) continue; // 일요일 제외
    const col = weekdayIndex - 1; // 월=0 ... 토=5
    if (col === 0 || weeks.length === 0) weeks.push(Array(6).fill(null));
    weeks[weeks.length - 1][col] = day;
  }
  return weeks;
}

// 당직표 한 칸의 표시 정보
function dutyCellInfo(day) {
  if (!day) return { type: "empty" };
  const weekdayIndex = new Date(Date.UTC(2026, 6, day.day)).getUTCDay();
  const base = { day: day.day, weekdayIndex, holidayName: day.holidayName };
  if (day.holidayName) return { ...base, type: "holiday" };
  if (weekdayIndex === 6 || day.assignments.length === 0)
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

function dutyDateClass(cell) {
  if (cell.type === "empty") return "";
  if (cell.holidayName || cell.weekdayIndex === 0) return "date-red";
  if (cell.weekdayIndex === 6) return "date-blue";
  return "";
}

function DayCard({ activeView, day }) {
  const classes = ["day-card"];
  if (day.isWeekend) classes.push("is-weekend");
  if (day.holidayName) classes.push("is-holiday");

  return (
    <article className={classes.join(" ")}>
      <div className="date-row">
        <span className="date-number">{day.day}</span>
        <span className="weekday-label">{day.weekday}</span>
      </div>
      <div className="assignments">
        {day.holidayName ? (
          <div className="closed-label">{day.holidayName}</div>
        ) : day.isWeekend ? (
          <div className="muted-label">주말</div>
        ) : activeView === "duty" && day.assignments.length > 0 ? (
          day.assignments.map(([slot, person]) => (
            <div className="assignment" data-slot={slot} key={`${day.key}-${slot}`}>
              <span className="slot">{slot}</span>
              <span className="assignee">{person}</span>
            </div>
          ))
        ) : activeView === "events" && day.events.length > 0 ? (
          day.events.map((event) => (
            <div className="event-item" key={`${day.key}-${event}`}>
              {event}
            </div>
          ))
        ) : (
          <div className="muted-label">
            {activeView === "duty" ? "배정 없음" : "일정 없음"}
          </div>
        )}
      </div>
    </article>
  );
}

function PrintSheet() {
  const weeks = getDutyWeeks();

  return (
    <div className="print-sheet" aria-hidden="true">
      <h1 className="print-title">{printConfig.title}</h1>

      <h2 className="print-section">&lt; 당 직 &gt;</h2>
      <table className="print-table duty-table">
        <tbody>
          {weeks.map((week, weekIndex) => {
            const cells = week.map(dutyCellInfo);
            return (
              <Fragment key={`week-${weekIndex}`}>
                <tr className="duty-date-row">
                  <th>날짜</th>
                  {cells.map((cell, cellIndex) => (
                    <td className={dutyDateClass(cell)} key={`d-${cellIndex}`}>
                      {cell.day ?? ""}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>오전1/오전2</th>
                  {cells.map((cell, cellIndex) => {
                    if (cell.type === "duty")
                      return <td key={`m-${cellIndex}`}>{cell.morning}</td>;
                    if (cell.type === "holiday")
                      return (
                        <td className="holiday-cell" rowSpan={2} key={`m-${cellIndex}`}>
                          {cell.holidayName}
                        </td>
                      );
                    if (cell.type === "dash")
                      return (
                        <td rowSpan={2} key={`m-${cellIndex}`}>
                          –
                        </td>
                      );
                    return <td rowSpan={2} key={`m-${cellIndex}`} />;
                  })}
                </tr>
                <tr>
                  <th>오후</th>
                  {cells.map((cell, cellIndex) =>
                    cell.type === "duty" ? (
                      <td key={`a-${cellIndex}`}>{cell.afternoon}</td>
                    ) : null,
                  )}
                </tr>
              </Fragment>
            );
          })}
        </tbody>
      </table>

      <table className="print-table legend-table">
        <tbody>
          <tr>
            <th>표기법</th>
            {printConfig.dutyHours.map((item) => (
              <td key={item.label}>{item.label}</td>
            ))}
          </tr>
          <tr>
            <th>당직시간</th>
            {printConfig.dutyHours.map((item) => (
              <td key={item.label}>{item.time}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="print-note">{printConfig.dutyNote}</p>

      <h2 className="print-section">&lt; 조기퇴근 &gt;</h2>
      <table className="print-table early-table">
        <thead>
          <tr>
            {["월", "화", "수", "목", "금"].map((label) => (
              <th key={label}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, weekIndex) => (
            <tr key={`early-${weekIndex}`}>
              {week.slice(0, 5).map((day, cellIndex) => (
                <td key={`e-${cellIndex}`}>
                  {day ? (
                    <div className="early-cell">
                      <span className="early-date">{day.day}/</span>
                      {day.holidayName ? (
                        <span className="early-holiday">{day.holidayName}</span>
                      ) : (
                        (earlyLeave[day.key] || []).map(([name, hours]) => (
                          <span key={`${day.key}-${name}`}>
                            {name}({hours})
                          </span>
                        ))
                      )}
                    </div>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <table className="print-table legend-table">
        <tbody>
          <tr>
            <th>표기법</th>
            {printConfig.earlyLegend.map((item) => (
              <td key={item.label}>{item.label}</td>
            ))}
          </tr>
          <tr>
            <th>퇴근시간</th>
            {printConfig.earlyLegend.map((item) => (
              <td key={item.label}>{item.time}</td>
            ))}
          </tr>
        </tbody>
      </table>
      <p className="print-note">{printConfig.earlyNote}</p>

      <table className="print-table viewers-table">
        <tbody>
          <tr>
            <th className="viewers-label" rowSpan={2}>
              공람
            </th>
            {printConfig.viewers.map((group) => (
              <th key={group.group} colSpan={group.members.length}>
                {group.group}
              </th>
            ))}
          </tr>
          <tr>
            {printConfig.viewers.flatMap((group) =>
              group.members.map((member, memberIndex) => (
                <td key={`${group.group}-${memberIndex}`}>{member}</td>
              )),
            )}
          </tr>
          <tr className="viewers-sign">
            <th>&nbsp;</th>
            {printConfig.viewers.flatMap((group) =>
              group.members.map((_, memberIndex) => (
                <td key={`sign-${group.group}-${memberIndex}`} />
              )),
            )}
          </tr>
        </tbody>
      </table>

      <p className="print-footer">
        <span>{printConfig.footerNote}</span>
        <span>{printConfig.org}</span>
      </p>
    </div>
  );
}

export default function Home() {
  const [activeView, setActiveView] = useState("duty");
  const days = getMonthDays();
  const firstDayOffset = new Date(Date.UTC(2026, 6, 1)).getUTCDay();

  return (
    <>
    <div className="app-shell">
      <header className="topbar">
        <Image
          className="brand-logo"
          src="/assets/ieum-kindergarten.png"
          alt="이음어린이집"
          width={1254}
          height={444}
          priority
        />
        <div className="month-badge" aria-label="2026년 7월">
          <span>2026</span>
          <strong>07</strong>
        </div>
      </header>

      <main className="layout">
        <section className="calendar-panel" aria-label="월간 캘린더">
          <div className="calendar-toolbar">
            <div className="toolbar-left">
              <div className="calendar-tabs" role="tablist" aria-label="캘린더 종류">
                {["duty", "events"].map((view) => {
                  const isActive = activeView === view;

                  return (
                    <button
                      className={`tab-button${isActive ? " is-active" : ""}`}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      data-view={view}
                      key={view}
                      onClick={() => setActiveView(view)}
                    >
                      {view === "duty" ? "당직표" : "일정표"}
                    </button>
                  );
                })}
              </div>
              <button
                className="print-button"
                type="button"
                onClick={() => window.print()}
              >
                PDF 출력하기
              </button>
            </div>
            <div className="legend" aria-label="범례" hidden={activeView !== "duty"}>
              {dutySlots.map((slot) => (
                <span className={`legend-item ${slot.className}`} key={slot.name}>
                  <i className="legend-dot" />
                  <strong>{slot.name}</strong>
                  <small>{slot.time}</small>
                  {slot.note ? <em>{slot.note}</em> : null}
                </span>
              ))}
            </div>
          </div>
          <div className="weekdays" aria-hidden="true">
            {weekdayLabels.map((weekday) => (
              <span key={weekday}>{weekday}</span>
            ))}
          </div>
          <div className="calendar-grid">
            {Array.from({ length: firstDayOffset }, (_, index) => (
              <div className="day-card is-empty" key={`empty-${index}`} />
            ))}
            {days.map((day) => (
              <DayCard activeView={activeView} day={day} key={day.key} />
            ))}
          </div>
        </section>
      </main>
    </div>
    <PrintSheet />
    </>
  );
}
