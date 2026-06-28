"use client";

import Image from "next/image";
import { useState } from "react";

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
      ["오전1", "최옥희"],
      ["오전2", "봉은영"],
      ["오후1", "어영경"],
      ["오후2", "정지혜"],
    ],
    "2026-07-03": [
      ["오전1", "김민경"],
      ["오전2", "홍여진"],
      ["오후1", "이혜빈"],
      ["오후2", "최옥희"],
    ],
    "2026-07-06": [
      ["오전1", "홍여진"],
      ["오전2", "어영경"],
      ["오후1", "김민경"],
      ["오후2", "이혜빈"],
    ],
    "2026-07-07": [
      ["오전1", "정지혜"],
      ["오전2", "김민경"],
      ["오후1", "봉은영"],
      ["오후2", "어영경"],
    ],
    "2026-07-08": [
      ["오전1", "봉은영"],
      ["오전2", "최옥희"],
      ["오후1", "정지혜"],
      ["오후2", "김민경"],
    ],
    "2026-07-09": [
      ["오전1", "이혜빈"],
      ["오전2", "어영경"],
      ["오후1", "홍여진"],
      ["오후2", "봉은영"],
    ],
    "2026-07-10": [
      ["오전1", "어영경"],
      ["오전2", "정지혜"],
      ["오후1", "최옥희"],
      ["오후2", "홍여진"],
    ],
    "2026-07-13": [
      ["오전1", "이혜빈"],
      ["오전2", "봉은영"],
      ["오후1", "최옥희"],
      ["오후2", "정지혜"],
    ],
    "2026-07-14": [
      ["오전1", "홍여진"],
      ["오전2", "최옥희"],
      ["오후1", "이혜빈"],
      ["오후2", "김민경"],
    ],
    "2026-07-15": [
      ["오전1", "어영경"],
      ["오전2", "이혜빈"],
      ["오후1", "홍여진"],
      ["오후2", "봉은영"],
    ],
    "2026-07-16": [
      ["오전1", "김민경"],
      ["오전2", "정지혜"],
      ["오후1", "최옥희"],
      ["오후2", "홍여진"],
    ],
    "2026-07-20": [
      ["오전1", "정지혜"],
      ["오전2", "김민경"],
      ["오후1", "어영경"],
      ["오후2", "최옥희"],
    ],
    "2026-07-21": [
      ["오전1", "봉은영"],
      ["오전2", "이혜빈"],
      ["오후1", "정지혜"],
      ["오후2", "최옥희"],
    ],
    "2026-07-22": [
      ["오전1", "김민경"],
      ["오전2", "홍여진"],
      ["오후1", "어영경"],
      ["오후2", "이혜빈"],
    ],
    "2026-07-23": [
      ["오전1", "봉은영"],
      ["오전2", "홍여진"],
      ["오후1", "김민경"],
      ["오후2", "이혜빈"],
    ],
    "2026-07-24": [
      ["오전1", "홍여진"],
      ["오전2", "김민경"],
      ["오후1", "봉은영"],
      ["오후2", "정지혜"],
    ],
    "2026-07-27": [
      ["오전1", "어영경"],
      ["오전2", "이혜빈"],
      ["오후1", "봉은영"],
      ["오후2", "홍여진"],
    ],
    "2026-07-28": [
      ["오전1", "최옥희"],
      ["오전2", "어영경"],
      ["오후1", "홍여진"],
      ["오후2", "봉은영"],
    ],
    "2026-07-29": [
      ["오전1", "최옥희"],
      ["오전2", "정지혜"],
      ["오후1", "김민경"],
      ["오후2", "어영경"],
    ],
    "2026-07-30": [
      ["오전1", "정지혜"],
      ["오전2", "최옥희"],
      ["오후1", "이혜빈"],
      ["오후2", "김민경"],
    ],
    "2026-07-31": [
      ["오전1", "이혜빈"],
      ["오전2", "봉은영"],
      ["오후1", "정지혜"],
      ["오후2", "어영경"],
    ],
  },
  holidays: {
    "2026-07-17": "제헌절",
  },
  events: {},
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const dutySlots = [
  { name: "오전1", time: "7:30 ~ 17:30", className: "morning-one" },
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

export default function Home() {
  const [activeView, setActiveView] = useState("duty");
  const days = getMonthDays();
  const firstDayOffset = new Date(Date.UTC(2026, 6, 1)).getUTCDay();

  return (
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
  );
}
