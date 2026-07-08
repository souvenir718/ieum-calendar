import { TYPE_SLUG } from "../../lib/events";
import EventLabel, { eventAriaLabel } from "./EventLabel";

/**
 * 특정 날짜의 '더보기' 클릭 시 해당 일자의 상세 일정 목록을 띄워주는 모달 컴포넌트입니다.
 */
export default function DayEventsModal({ day, onClose, onEventClick }) {
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
