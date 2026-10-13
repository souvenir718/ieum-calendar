/**
 * 캘린더 날짜 계산, 이벤트 필터링, 정렬 등 순수 유틸리티 함수 모음
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;
// 한 날짜 칸에 세로로 쌓아 보여줄 수 있는 최대 레인 수(공휴일·여러 날 일정 포함).
// 칸 높이(CSS의 --event-stack-top/--event-row-height 기준)에 맞춘 값이라 CSS와 함께 조정할 것.
export const MAX_EVENT_LANES = 3;
export const VIEW_STORAGE_KEY = "ieum-calendar-active-view";

// 편집 가능 여부 캐시: 월 이동(라우트 전환)마다 /api/edit-session을 다시 부르지 않도록
// sessionStorage에 짧은 TTL로 저장한다. 잠금/해제 시엔 즉시 갱신한다.
const EDITABLE_CACHE_KEY = "ieum-editable";
const EDITABLE_CACHE_TTL_MS = 60 * 1000;

export function readEditableCache() {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(EDITABLE_CACHE_KEY);
    if (!raw) return null;
    const { value, exp } = JSON.parse(raw);
    if (typeof exp !== "number" || exp < Date.now()) return null;
    return Boolean(value);
  } catch {
    return null;
  }
}

export function writeEditableCache(value) {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.setItem(
      EDITABLE_CACHE_KEY,
      JSON.stringify({ value: Boolean(value), exp: Date.now() + EDITABLE_CACHE_TTL_MS }),
    );
  } catch {
    // 저장 실패(프라이빗 모드 등)는 무시 — fetch로 폴백된다.
  }
}

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

export function buildEventSpans(days, eventList, monthStart, monthEnd, offset) {
  const spans = [];
  const hiddenEventCounts = {};
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
    ...eventList.map((event) => ({ ...event, kind: "event" })),
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
      const lane = lanes.findIndex((occupied) =>
        occupied.every((range) => range.endCol < startCol || range.startCol > endCol),
      );
      const assignedLane = lane === -1 ? lanes.length : lane;
      lanes[assignedLane] = [...(lanes[assignedLane] || []), { startCol, endCol }];
      rowLanes.set(row, lanes);

      // 레인이 칸 높이를 넘으면 그리지 않고, 가려진 일정은 날짜별 "+N개"로 집계한다.
      if (assignedLane >= MAX_EVENT_LANES) {
        if (event.kind === "event") {
          for (let d = segmentStart; d <= segmentEnd; d = addDays(d, 1)) {
            const key = toDateKey(d);
            hiddenEventCounts[key] = (hiddenEventCounts[key] || 0) + 1;
          }
        }
        segmentStart = addDays(segmentEnd, 1);
        continue;
      }

      spans.push({
        id: event.id,
        key: `${event.id}-${row}-${startCol}`,
        kind: event.kind,
        type: event.type,
        title: event.title,
        dateKey: toDateKey(segmentStart),
        row,
        startCol,
        endCol,
        lane: assignedLane,
      });

      segmentStart = addDays(segmentEnd, 1);
    }
  }

  return { spans, hiddenEventCounts };
}
