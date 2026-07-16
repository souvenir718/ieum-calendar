/**
 * 캘린더의 각 날짜(Day) 칸을 렌더링하고 클릭 이벤트를 처리하는 컴포넌트입니다.
 */
export default function DayCard({
  activeView,
  day,
  dutyEditable = false,
  hiddenEventCount = 0,
  onDayClick,
  onDutyClick,
  onMoreClick,
  style,
}) {
  const classes = ["day-card"];
  if (day.isWeekend) classes.push("is-weekend");
  if (day.holidayName) classes.push("is-holiday");
  // 당직 편집: 잠금 해제 상태 + 평일 + 공휴일 아님 (당직이 실제로 표시되는 날)
  const dutyClickable =
    activeView === "duty" && dutyEditable && !day.isWeekend && !day.holidayName;
  const clickable = activeView === "events" || dutyClickable;
  if (clickable) classes.push("is-clickable");
  if (dutyClickable) classes.push("is-duty-editable");
  const hasEvents = day.events.length > 0;
  const handleClick = dutyClickable
    ? () => onDutyClick?.(day)
    : activeView === "events"
      ? () => onDayClick?.(day.key)
      : undefined;

  return (
    <article
      className={classes.join(" ")}
      onClick={handleClick}
      style={style}
      title={
        dutyClickable
          ? "클릭해서 당직 편집"
          : activeView === "events"
            ? "클릭해서 이 날짜에 일정 추가"
            : undefined
      }
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
