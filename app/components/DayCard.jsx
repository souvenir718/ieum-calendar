/**
 * 캘린더의 각 날짜(Day) 칸을 렌더링하고 클릭 이벤트를 처리하는 컴포넌트입니다.
 */
export default function DayCard({ activeView, day, hiddenEventCount = 0, onDayClick, onMoreClick, style }) {
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
      <div className="assignments" data-assignment-count={day.assignments.length}>
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
