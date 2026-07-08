/**
 * 캘린더 날짜 계산, 이벤트 필터링, 정렬 등 순수 유틸리티 함수 모음
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
export const MAX_VISIBLE_EVENTS_PER_DAY = 4;
export const VIEW_STORAGE_KEY = "ieum-calendar-active-view";

export function parseDateKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

export function toDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function addDays(date, days) {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

export function dayNumberFromKey(key) {
  return Number(key.slice(-2));
}

export function calendarPosition(offset, day) {
  const index = offset + day - 1;
  return {
    row: Math.floor(index / 7) + 1,
    col: (index % 7) + 1,
  };
}

export function isMultiDayEvent(event) {
  return event.start_date !== event.end_date;
}

export function buildEventsByDay(eventList, monthStart, monthEnd) {
  const events = {};

  for (const row of eventList) {
    const start = parseDateKey(row.start_date);
    const end = parseDateKey(row.end_date);
    for (let d = new Date(start); d <= end; d = addDays(d, 1)) {
      const key = toDateKey(d);
      if (key < monthStart || key > monthEnd) continue;
      (events[key] ||= []).push({ id: row.id, title: row.title, type: row.type });
    }
  }

  for (const list of Object.values(events)) {
    list.sort((a, b) => {
      const fullA = eventList.find((event) => event.id === a.id);
      const fullB = eventList.find((event) => event.id === b.id);
      const multiDaySort =
        Number(fullB && isMultiDayEvent(fullB)) - Number(fullA && isMultiDayEvent(fullA));
      if (multiDaySort !== 0) return multiDaySort;
      return a.title.localeCompare(b.title, "ko");
    });
  }

  return events;
}

export function sortEvents(eventList) {
  return [...eventList].sort((a, b) => {
    if (a.start_date !== b.start_date) return a.start_date.localeCompare(b.start_date);
    return a.title.localeCompare(b.title, "ko");
  });
}

export function buildEventVisibility(days, eventList) {
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

export function buildEventSpans(days, eventList, monthStart, monthEnd, offset, visibleEventIds) {
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
