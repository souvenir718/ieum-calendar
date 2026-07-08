"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";

import {
  deriveEarlyLeave,
  firstDayOffset,
  getDutyWeeks,
  getMonthDays,
  weekdayLabels,
} from "../../lib/calendar";
import { TYPE_SLUG } from "../../lib/events";
import { dutySlots } from "../../lib/print-config";

import EventModal from "./EventModal";
import DayCard from "./DayCard";
import DayEventsModal from "./DayEventsModal";
import PrintSheet from "./PrintSheet";
import EventLabel, { eventAriaLabel } from "./EventLabel";
import EventCategoryLegend from "./EventCategoryLegend";
import {
  VIEW_STORAGE_KEY,
  toDateKey,
  calendarPosition,
  buildEventsByDay,
  sortEvents,
  buildEventVisibility,
  buildEventSpans,
} from "./calendarUtils";

const useClientLayoutEffect =
  typeof window === "undefined" ? useEffect : useLayoutEffect;

/**
 * 캘린더 전체 레이아웃과 상태 관리를 담당하는 메인 컴포넌트입니다.
 */
export default function CalendarClient({
  month,
  displayMonth,
  year,
  monthIndex,
  prevMonth,
  nextMonth,
  assignments,
  holidays,
  eventList = [],
}) {
  const router = useRouter();
  const [activeView, setActiveView] = useState("duty");
  const [modal, setModal] = useState(null);
  const [dayEventsModal, setDayEventsModal] = useState(null);
  const [localEventList, setLocalEventList] = useState(() => sortEvents(eventList));

  useClientLayoutEffect(() => {
    const savedView = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (savedView === "duty" || savedView === "events") {
      setActiveView(savedView);
    }
  }, [month]);

  useEffect(() => {
    setLocalEventList(sortEvents(eventList));
  }, [eventList]);

  useEffect(() => {
    router.prefetch(`/${prevMonth}`);
    router.prefetch(`/${nextMonth}`);
  }, [nextMonth, prevMonth, router]);

  const monthStart = `${month}-01`;
  const monthEnd = toDateKey(new Date(Date.UTC(year, monthIndex + 1, 0)));
  const localEvents = useMemo(
    () => buildEventsByDay(localEventList, monthStart, monthEnd),
    [localEventList, monthStart, monthEnd],
  );
  const days = getMonthDays(year, monthIndex, {
    holidays,
    assignments,
    events: localEvents,
  });
  const weeks = getDutyWeeks(days);
  const earlyLeave = deriveEarlyLeave(assignments, holidays);
  const offset = firstDayOffset(year, monthIndex);
  const trailingEmptyCount = Math.max(0, 42 - offset - days.length);
  const printTitle = `${displayMonth} 당직 및 조기퇴근`;
  const { visibleEventIds, hiddenEventCounts } = buildEventVisibility(days, localEventList);
  const eventSpans = buildEventSpans(
    days,
    localEventList,
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
    const full = localEventList.find((e) => e.id === ev.id);
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
  const upsertLocalEvent = (event) => {
    setLocalEventList((current) =>
      sortEvents([...current.filter((item) => item.id !== event.id), event]),
    );
    setDayEventsModal(null);
  };
  const removeLocalEvent = (id) => {
    setLocalEventList((current) => current.filter((event) => event.id !== id));
    setDayEventsModal(null);
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
              {Array.from({ length: trailingEmptyCount }, (_, index) => {
                const position = offset + days.length + index;
                const row = Math.floor(position / 7) + 1;
                const col = (position % 7) + 1;

                return (
                  <div
                    className="day-card is-empty"
                    key={`trailing-empty-${index}`}
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
        <EventModal
          initial={modal}
          onClose={() => setModal(null)}
          onDeleted={removeLocalEvent}
          onSaved={upsertLocalEvent}
        />
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
