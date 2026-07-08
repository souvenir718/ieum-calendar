import { EVENT_TYPE_ICON } from "../../lib/events";

export function eventMobileLabel(event) {
  return `${EVENT_TYPE_ICON[event.type] || "📌"} ${event.title}`;
}

export function eventDesktopLabel(event) {
  return `[${EVENT_TYPE_ICON[event.type] || "📌"} ${event.type}] ${event.title}`;
}

export function eventAriaLabel(event) {
  return `${event.type} ${event.title}`;
}

/**
 * 개별 이벤트의 모바일 및 데스크톱용 텍스트/아이콘 라벨을 표시하는 UI 컴포넌트입니다.
 */
export default function EventLabel({ event }) {
  return (
    <>
      <span className="event-label-mobile">{eventMobileLabel(event)}</span>
      <span className="event-label-desktop">{eventDesktopLabel(event)}</span>
    </>
  );
}
