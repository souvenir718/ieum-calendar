"use client";

import Image from "next/image";
import Link from "next/link";
import { Fragment, useEffect, useState } from "react";

import {
  deriveEarlyLeave,
  dutyCellInfo,
  dutyDateClass,
  firstDayOffset,
  getDutyWeeks,
  getMonthDays,
  weekdayLabels,
} from "../../lib/calendar";
import { EVENT_TYPE_ICON, EVENT_TYPES, TYPE_SLUG } from "../../lib/events";
import { dutySlots, printConfig } from "../../lib/print-config";
import EventModal from "./EventModal";

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_VISIBLE_EVENTS_PER_DAY = 4;
const VIEW_STORAGE_KEY = "ieum-calendar-active-view";
function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function dayNumberFromKey(key) {
  return Number(key.slice(-2));
}

function calendarPosition(offset, day) {
  const index = offset + day - 1;
  return {
    row: Math.floor(index / 7) + 1,
    col: (index % 7) + 1,
  };
}

function eventMobileLabel(event) {
  return `${EVENT_TYPE_ICON[event.type] || "📌"} ${event.title}`;
}

function eventDesktopLabel(event) {
  return `[${EVENT_TYPE_ICON[event.type] || "📌"} ${event.type}] ${event.title}`;
}

function EventLabel({ event }) {
  return (
    <>
      <span className="event-label-mobile">{eventMobileLabel(event)}</span>
      <span className="event-label-desktop">{eventDesktopLabel(event)}</span>
    </>
  );
}

function EventCategoryLegend() {
  return (
    <div className="event-category-legend" aria-label="일정 카테고리 설명">
      {EVENT_TYPES.map((type) => (
        <span
          className={`event-category-item event-type-${TYPE_SLUG[type] || "etc"}`}
          key={type}
        >
          <span aria-hidden="true">{EVENT_TYPE_ICON[type] || "📌"}</span>
          <strong>{type}</strong>
        </span>
      ))}
    </div>
  );
}

function eventAriaLabel(event) {
  return `${event.type} ${event.title}`;
}

function isMultiDayEvent(event) {
  return event.start_date !== event.end_date;
}

function buildEventVisibility(days, eventList) {
  const eventById = new Map(eventList.map((event) => [event.id, event]));
  const visibleEventIds = new Set();
  const hiddenEventCounts = {};

  for (const day of days) {
    const multiDayEvents = [];
    const singleDayEvents = [];

    for (const event of day.events) {
      const fullEvent = eventById.get(event.id);
      if (fullEvent && isMultiDayEvent(fullEvent)) {
        multiDayEvents.push(event);
      } else {
        singleDayEvents.push(event);
      }
    }

    for (const event of multiDayEvents) {
      visibleEventIds.add(event.id);
    }

    const holidaySlotCount = day.holidayName ? 1 : 0;
    const singleDayLimit = Math.max(
      MAX_VISIBLE_EVENTS_PER_DAY - multiDayEvents.length - holidaySlotCount,
      0,
    );
    for (const event of singleDayEvents.slice(0, singleDayLimit)) {
      visibleEventIds.add(event.id);
    }

    const hiddenCount = Math.max(singleDayEvents.length - singleDayLimit, 0);
    if (hiddenCount > 0) hiddenEventCounts[day.key] = hiddenCount;
  }

  return { visibleEventIds, hiddenEventCounts };
}

function buildEventSpans(days, eventList, monthStart, monthEnd, offset, visibleEventIds) {
  const spans = [];
  const rowLanes = new Map();
  const holidayItems = days
    .filter((day) => day.holidayName)
    .map((day) => ({
      id: `holiday-${day.key}`,
      kind: "holiday",
      type: "공휴일",
      title: day.holidayName,
      start_date: day.key,
      end_date: day.key,
    }));
  const visibleItems = [
    ...holidayItems,
    ...eventList
      .filter((event) => visibleEventIds.has(event.id))
      .map((event) => ({ ...event, kind: "event" })),
  ]
    .sort((a, b) => {
      const multiDaySort = Number(isMultiDayEvent(b)) - Number(isMultiDayEvent(a));
      if (multiDaySort !== 0) return multiDaySort;
      if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
      if (a.kind !== b.kind) return a.kind === "holiday" ? -1 : 1;
      return a.title.localeCompare(b.title, "ko");
    });

  for (const event of visibleItems) {
    let segmentStart = parseDateKey(event.start_date < monthStart ? monthStart : event.start_date);
    const visibleEnd = parseDateKey(event.end_date > monthEnd ? monthEnd : event.end_date);

    while (segmentStart <= visibleEnd) {
      const startDay = dayNumberFromKey(toDateKey(segmentStart));
      const { row, col: startCol } = calendarPosition(offset, startDay);
      const daysLeftInWeek = 7 - startCol;
      const segmentEnd = new Date(
        Math.min(addDays(segmentStart, daysLeftInWeek).getTime(), visibleEnd.getTime()),
      );
      const endDay = dayNumberFromKey(toDateKey(segmentEnd));
      const { col: endCol } = calendarPosition(offset, endDay);
      const lanes = rowLanes.get(row) || [];
      const lane = lanes.findIndex((lastEndCol) => lastEndCol < startCol);
      const assignedLane = lane === -1 ? lanes.length : lane;
      lanes[assignedLane] = endCol;
      rowLanes.set(row, lanes);

      spans.push({
        id: event.id,
        key: `${event.id}-${row}-${startCol}`,
        kind: event.kind,
        type: event.type,
        title: event.title,
        row,
        startCol,
        endCol,
        lane: assignedLane,
      });

      segmentStart = addDays(segmentEnd, 1);
    }
  }

  return spans;
}

function DayCard({ activeView, day, hiddenEventCount = 0, onDayClick, onMoreClick, style }) {
  const classes = ["day-card"];
  if (day.isWeekend) classes.push("is-weekend");
  if (day.holidayName) classes.push("is-holiday");
  const clickable = activeView === "events";
  if (clickable) classes.push("is-clickable");
  const hasEvents = day.events.length > 0;

  return (
    <article
      className={classes.join(" ")}
      onClick={clickable ? () => onDayClick?.(day.key) : undefined}
      style={style}
      title={clickable ? "클릭해서 이 날짜에 일정 추가" : undefined}
    >
      <div className="date-row">
        <span className="date-number">{day.day}</span>
        {activeView === "events" && hiddenEventCount > 0 ? (
          <button
            className="event-more-button"
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onMoreClick?.(day);
            }}
          >
            +{hiddenEventCount}개
          </button>
        ) : activeView === "events" && hasEvents ? (
          <span className="event-count">{day.events.length}개</span>
        ) : (
          <span className="weekday-label">{day.weekday}</span>
        )}
      </div>
      <div className="assignments">
        {activeView === "events" ? (
          null
        ) : day.holidayName ? (
          <div className="closed-label">{day.holidayName}</div>
        ) : day.isWeekend ? (
          null
        ) : activeView === "duty" && day.assignments.length > 0 ? (
          day.assignments.map(([slot, person]) => (
            <div className="assignment" data-slot={slot} key={`${day.key}-${slot}`}>
              <span className="slot">{slot}</span>
              <span className="assignee">{person}</span>
            </div>
          ))
        ) : (
          null
        )}
      </div>
    </article>
  );
}

function DayEventsModal({ day, onClose, onEventClick }) {
  if (!day) return null;

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <div
        className="modal day-events-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-events-title"
        onClick={(e) => e.stopPropagation()}
      >
        <h4 id="day-events-title">
          {day.day}일 {day.weekday}요일 일정
        </h4>
        <div className="day-events-list">
          {day.events.map((event) => (
            <button
              className={`day-event-row event-type-${TYPE_SLUG[event.type] || "etc"}`}
              key={event.id}
              type="button"
              aria-label={eventAriaLabel(event)}
              onClick={() => onEventClick(event)}
            >
              <EventLabel event={event} />
            </button>
          ))}
        </div>
        <div className="modal-actions">
          <button type="button" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
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
  eventList = [],
}) {
  const [activeView, setActiveView] = useState("duty");
  const [modal, setModal] = useState(null);
  const [dayEventsModal, setDayEventsModal] = useState(null);

  useEffect(() => {
    const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (savedView === "duty" || savedView === "events") {
      setActiveView(savedView);
    }
  }, []);

  const days = getMonthDays(year, monthIndex, { holidays, assignments, events });
  const weeks = getDutyWeeks(days);
  const earlyLeave = deriveEarlyLeave(assignments, holidays);
  const offset = firstDayOffset(year, monthIndex);
  const printTitle = `${displayMonth} 당직 및 조기퇴근`;
  const monthStart = `${month}-01`;
  const monthEnd = `${month}-${String(days.length).padStart(2, "0")}`;
  const { visibleEventIds, hiddenEventCounts } = buildEventVisibility(days, eventList);
  const eventSpans = buildEventSpans(
    days,
    eventList,
    monthStart,
    monthEnd,
    offset,
    visibleEventIds,
  );

  const openAdd = (date) => {
    const d = date || `${month}-01`;
    setModal({ type: "행사", title: "", start_date: d, end_date: d });
  };
  const openEdit = (ev) => {
    const full = eventList.find((e) => e.id === ev.id);
    if (!full) return;
    setModal({
      id: full.id,
      type: full.type,
      title: full.title,
      start_date: full.start_date,
      end_date: full.end_date,
    });
  };
  const openEditFromDayModal = (ev) => {
    setDayEventsModal(null);
    openEdit(ev);
  };
  const changeView = (view) => {
    setActiveView(view);
    window.localStorage.setItem(VIEW_STORAGE_KEY, view);
  };
  const persistCurrentView = () => {
    window.localStorage.setItem(VIEW_STORAGE_KEY, activeView);
  };

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
            <Link
              className="month-switch-arrow"
              href={`/${prevMonth}`}
              aria-label="이전 달"
              prefetch={false}
              onClick={persistCurrentView}
            >
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
            <Link
              className="month-switch-arrow"
              href={`/${nextMonth}`}
              aria-label="다음 달"
              prefetch={false}
              onClick={persistCurrentView}
            >
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
                        onClick={() => changeView(view)}
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
              ) : (
                <button className="event-add-btn" type="button" onClick={() => openAdd()}>
                  ＋ 일정 추가
                </button>
              )}
            </div>
            <div className="weekdays" aria-hidden="true">
              {weekdayLabels.map((weekday) => (
                <span key={weekday}>{weekday}</span>
              ))}
            </div>
            <div className="calendar-grid">
              {Array.from({ length: offset }, (_, index) => (
                <div
                  className="day-card is-empty"
                  key={`empty-${index}`}
                  style={{ gridColumn: index + 1, gridRow: 1 }}
                />
              ))}
              {days.map((day) => {
                const { row, col } = calendarPosition(offset, day.day);

                return (
                  <DayCard
                    activeView={activeView}
                    day={day}
                    hiddenEventCount={hiddenEventCounts[day.key] || 0}
                    key={day.key}
                    onDayClick={openAdd}
                    onMoreClick={setDayEventsModal}
                    style={{ gridColumn: col, gridRow: row }}
                  />
                );
              })}
              {activeView === "events"
                ? eventSpans.map((event) =>
                    event.kind === "holiday" ? (
                      <div
                        className="event-span event-type-holiday"
                        key={event.key}
                        aria-label={`공휴일 ${event.title}`}
                        style={{
                          gridColumn: `${event.startCol} / ${event.endCol + 1}`,
                          gridRow: event.row,
                        }}
                        data-lane={event.lane}
                        title={event.title}
                      >
                        {event.title}
                      </div>
                    ) : (
                      <button
                        className={`event-span event-type-${TYPE_SLUG[event.type] || "etc"}`}
                        key={event.key}
                        type="button"
                        aria-label={eventAriaLabel(event)}
                        style={{
                          gridColumn: `${event.startCol} / ${event.endCol + 1}`,
                          gridRow: event.row,
                        }}
                        data-lane={event.lane}
                        onClick={(e) => {
                          e.stopPropagation();
                          openEdit(event);
                        }}
                        title="클릭해서 수정"
                      >
                        <EventLabel event={event} />
                      </button>
                    ),
                  )
                : null}
            </div>
            {activeView === "events" ? <EventCategoryLegend /> : null}
          </section>
        </main>
      </div>

      {modal ? (
        <EventModal initial={modal} onClose={() => setModal(null)} />
      ) : null}
      {dayEventsModal ? (
        <DayEventsModal
          day={dayEventsModal}
          onClose={() => setDayEventsModal(null)}
          onEventClick={openEditFromDayModal}
        />
      ) : null}

      <PrintSheet weeks={weeks} earlyLeave={earlyLeave} title={printTitle} />
    </>
  );
}
