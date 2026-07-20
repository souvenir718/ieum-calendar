import { weekdayLabels } from "../../lib/calendar";
import { EVENT_TYPE_ICON, EVENT_TYPES, TYPE_SLUG } from "../../lib/events";

function buildCalendarWeeks(days, offset) {
  const cells = [...Array(offset).fill(null), ...days];
  while (cells.length % 7 !== 0) cells.push(null);

  return Array.from({ length: cells.length / 7 }, (_, index) =>
    cells.slice(index * 7, index * 7 + 7),
  );
}

/**
 * 일정표 PDF 출력(프린트)을 위한 월간 달력 레이아웃입니다.
 */
export default function SchedulePrintSheet({ days, offset, title }) {
  const calendarWeeks = buildCalendarWeeks(days, offset);

  return (
    <div className="print-sheet schedule-print-sheet" aria-hidden="true">
      <style media="print">{"@page { size: A4 landscape; margin: 8mm; }"}</style>
      <h1 className="print-title schedule-print-title">{title}</h1>

      <table className="schedule-print-calendar">
        <thead>
          <tr>
            {weekdayLabels.map((weekday, index) => (
              <th
                className={index === 0 ? "date-red" : index === 6 ? "date-blue" : undefined}
                key={weekday}
              >
                {weekday}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {calendarWeeks.map((week, weekIndex) => (
            <tr key={`schedule-week-${weekIndex}`}>
              {week.map((day, dayIndex) => (
                <td
                  className={
                    day?.holidayName || dayIndex === 0
                      ? "schedule-print-day date-red"
                      : dayIndex === 6
                        ? "schedule-print-day date-blue"
                        : "schedule-print-day"
                  }
                  key={day?.key || `empty-${weekIndex}-${dayIndex}`}
                >
                  {day ? (
                    <>
                      <strong className="schedule-print-date">{day.day}</strong>
                      {day.holidayName ? (
                        <div className="schedule-print-holiday">{day.holidayName}</div>
                      ) : null}
                      <ul className="schedule-print-events">
                        {day.events.map((event) => (
                          <li
                            className={`schedule-print-event event-type-${TYPE_SLUG[event.type] || "etc"}`}
                            key={`${day.key}-${event.id}`}
                          >
                            <span aria-hidden="true">{EVENT_TYPE_ICON[event.type] || "📌"}</span>
                            {event.title}
                          </li>
                        ))}
                      </ul>
                    </>
                  ) : null}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="schedule-print-legend" aria-label="일정 유형 범례">
        {EVENT_TYPES.map((type) => (
          <span className={`event-type-${TYPE_SLUG[type] || "etc"}`} key={type}>
            <span aria-hidden="true">{EVENT_TYPE_ICON[type] || "📌"}</span>
            {type}
          </span>
        ))}
      </div>
    </div>
  );
}
