import { EVENT_TYPE_ICON, EVENT_TYPES, TYPE_SLUG } from "../../lib/events";

/**
 * 캘린더 하단에 일정 카테고리 범례(아이콘 및 타입명)를 표시하는 컴포넌트입니다.
 */
export default function EventCategoryLegend() {
  return (
    <div className="event-category-legend" aria-label="일정 카테고리 설명">
      {EVENT_TYPES.map((type) => (
        <span
          className={`event-category-item event-type-${TYPE_SLUG[type] || "etc"}`}
          key={type}
        >
          <span aria-hidden="true">{EVENT_TYPE_ICON[type] || "📌"}</span>
          <strong>{type}</strong>
        </span>
      ))}
    </div>
  );
}
