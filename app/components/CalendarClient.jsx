"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useState } from "react";

import {
  deriveEarlyLeave,
  dutyCellInfo,
  dutyDateClass,
  firstDayOffset,
  getDutyWeeks,
  getMonthDays,
  weekdayLabels,
} from "../../lib/calendar";
import { dutySlots, printConfig } from "../../lib/print-config";

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
          day.events.map((event, index) => (
            <div className="event-item" key={`${day.key}-${index}`}>
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

function PrintSheet({ weeks, earlyLeave, title }) {
  return (
    <div className="print-sheet" aria-hidden="true">
      <h1 className="print-title">{title}</h1>

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
                        (earlyLeave[day.key] || []).map(([name, hours], index) => (
                          <span key={`${day.key}-${index}`}>
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

export default function CalendarClient({
  month,
  displayMonth,
  year,
  monthIndex,
  prevMonth,
  nextMonth,
  assignments,
  holidays,
  events,
}) {
  const [activeView, setActiveView] = useState("duty");

  const days = getMonthDays(year, monthIndex, { holidays, assignments, events });
  const weeks = getDutyWeeks(days);
  const earlyLeave = deriveEarlyLeave(assignments, holidays);
  const offset = firstDayOffset(year, monthIndex);
  const printTitle = `${displayMonth} 당직 및 조기퇴근`;

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
          <nav className="month-switch" aria-label="월 이동">
            <Link className="month-switch-arrow" href={`/${prevMonth}`} aria-label="이전 달" prefetch={false}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M15 5l-7 7 7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <span className="month-switch-label" aria-current="page">
              <small>{year}년</small>
              <strong>{monthIndex + 1}월</strong>
            </span>
            <Link className="month-switch-arrow" href={`/${nextMonth}`} aria-label="다음 달" prefetch={false}>
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <path
                  d="M9 5l7 7-7 7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          </nav>
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
              {activeView === "duty" ? (
                <div className="legend" aria-label="범례">
                  {dutySlots.map((slot) => (
                    <span className={`legend-item ${slot.className}`} key={slot.name}>
                      <i className="legend-dot" />
                      <strong>{slot.name}</strong>
                      <small>{slot.time}</small>
                      {slot.note ? <em>{slot.note}</em> : null}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            <div className="weekdays" aria-hidden="true">
              {weekdayLabels.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {Array.from({ length: offset }, (_, index) => (
                <div className="day-card is-empty" key={`empty-${index}`} />
              ))}
              {days.map((day) => (
                <DayCard activeView={activeView} day={day} key={day.key} />
              ))}
            </div>
          </section>
        </main>
      </div>
      <PrintSheet weeks={weeks} earlyLeave={earlyLeave} title={printTitle} />
    </>
  );
}
