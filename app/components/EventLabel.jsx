import { EVENT_TYPE_ICON } from "../../lib/events";

export function eventLabel(event) {
  return `${EVENT_TYPE_ICON[event.type] || "📌"} ${event.title}`;
}

export function eventAriaLabel(event) {
  return `${event.type} ${event.title}`;
}

/**
 * 개별 이벤트의 아이콘+제목 라벨을 표시하는 UI 컴포넌트입니다. 카테고리 구분은
 * 색상/아이콘으로 충분히 되므로 종류 이름은 텍스트로 반복하지 않는다.
 */
export default function EventLabel({ event }) {
  return <span className="event-label">{eventLabel(event)}</span>;
}
