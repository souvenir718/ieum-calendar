"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";

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
import DutyModal from "./DutyModal";
import LockControl from "./LockControl";
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

const LOGO_EASTER_EGG_CLICKS = 5;
const LOGO_EASTER_EGG_WINDOW_MS = 1500;

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
  staffList = [],
}) {
  const router = useRouter();
  const logoClickCountRef = useRef(0);
  const logoClickTimerRef = useRef(null);
  const [activeView, setActiveView] = useState("duty");
  const [modal, setModal] = useState(null);
  const [dayEventsModal, setDayEventsModal] = useState(null);
  const [dutyModal, setDutyModal] = useState(null);
  const [editable, setEditable] = useState(false);
  const [pinPrompting, setPinPrompting] = useState(false);
  const dutyPressTimerRef = useRef(null);
  const dutyPressOriginRef = useRef(null);
  const [localAssignments, setLocalAssignments] = useState(assignments);
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
    setLocalAssignments(assignments);
  }, [assignments]);

  // 편집 세션(쿠키) 유효 여부 조회 — 정적 페이지라 클라이언트에서 확인한다.
  useEffect(() => {
    let alive = true;
    fetch("/api/edit-session")
      .then((res) => res.json())
      .then((data) => {
        if (alive) setEditable(Boolean(data?.editable));
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

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
    assignments: localAssignments,
    events: localEvents,
  });
  const weeks = getDutyWeeks(days);
  const earlyLeave = deriveEarlyLeave(localAssignments, holidays);
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
  // 숨겨진 트리거: '당직표' 탭을 800ms 이상 길게 누르면 PIN 입력 모달을 연다.
  // 모바일 대응: 포인터 캡처로 손가락 미세 이동 시 pointerleave 오취소를 막고,
  // 일정 거리 이상 움직이면(스크롤 의도) 취소한다. pointerleave에는 의존하지 않는다.
  const DUTY_LONG_PRESS_MS = 800;
  const DUTY_MOVE_TOLERANCE = 10; // px
  const startDutyPress = (e) => {
    if (editable) return; // 이미 편집 중이면 잠금 버튼으로 처리
    clearTimeout(dutyPressTimerRef.current);
    dutyPressOriginRef.current = { x: e.clientX, y: e.clientY };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 캡처 미지원 환경은 무시 (타이머만으로 동작)
    }
    dutyPressTimerRef.current = setTimeout(() => {
      setPinPrompting(true);
    }, DUTY_LONG_PRESS_MS);
  };
  const moveDutyPress = (e) => {
    const origin = dutyPressOriginRef.current;
    if (!origin) return;
    if (
      Math.abs(e.clientX - origin.x) > DUTY_MOVE_TOLERANCE ||
      Math.abs(e.clientY - origin.y) > DUTY_MOVE_TOLERANCE
    ) {
      cancelDutyPress();
    }
  };
  const cancelDutyPress = () => {
    clearTimeout(dutyPressTimerRef.current);
    dutyPressOriginRef.current = null;
  };
  const openDutyEdit = (day) => {
    if (!editable) return;
    setDutyModal(day);
  };
  const applyDutySave = (date, dayAssignments) => {
    setLocalAssignments((current) => ({ ...current, [date]: dayAssignments }));
  };
  const handleLogoClick = () => {
    logoClickCountRef.current += 1;
    clearTimeout(logoClickTimerRef.current);
    if (logoClickCountRef.current >= LOGO_EASTER_EGG_CLICKS) {
      logoClickCountRef.current = 0;
      router.push("/stats");
      return;
    }
    logoClickTimerRef.current = setTimeout(() => {
      logoClickCountRef.current = 0;
    }, LOGO_EASTER_EGG_WINDOW_MS);
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
            onClick={handleLogoClick}
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
                    const dutyPressHandlers =
                      view === "duty"
                        ? {
                            onPointerDown: startDutyPress,
                            onPointerMove: moveDutyPress,
                            onPointerUp: cancelDutyPress,
                            onPointerCancel: cancelDutyPress,
                            onContextMenu: (e) => e.preventDefault(),
                          }
                        : {};

                    return (
                      <button
                        className={`tab-button${isActive ? " is-active" : ""}`}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        data-view={view}
                        key={view}
                        onClick={() => changeView(view)}
                        {...dutyPressHandlers}
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
                {activeView === "duty" ? (
                  <LockControl
                    editable={editable}
                    onEditableChange={setEditable}
                    prompting={pinPrompting}
                    onPromptingChange={setPinPrompting}
                  />
                ) : null}
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
                    dutyEditable={editable}
                    hiddenEventCount={hiddenEventCounts[day.key] || 0}
                    key={day.key}
                    onDayClick={openAdd}
                    onDutyClick={openDutyEdit}
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
      {dutyModal ? (
        <DutyModal
          day={dutyModal}
          staffList={staffList}
          onClose={() => setDutyModal(null)}
          onSaved={applyDutySave}
        />
      ) : null}

      <PrintSheet weeks={weeks} earlyLeave={earlyLeave} title={printTitle} />
    </>
  );
}
