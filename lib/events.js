// 일정(events) 타입 정의 + 입력 검증 (라우트/UI 공용)

// 카테고리 (DB event_type enum과 일치해야 함)
export const EVENT_TYPES = ["행사", "휴가", "생일", "중요", "기타"];

// 타입 → CSS 클래스 슬러그 (색상 구분용)
export const TYPE_SLUG = {
  행사: "event",
  휴가: "leave",
  생일: "birthday",
  중요: "important",
  기타: "etc",
};

export const EVENT_TYPE_ICON = {
  행사: "🎉",
  휴가: "🏖️",
  생일: "🎂",
  중요: "❗",
  기타: "📌",
};

const TYPE_SET = new Set(EVENT_TYPES);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const EVENT_SELECT = "id, type, title, start_date, end_date";

// 본문 검증 → { value } 또는 { error }
export function parseEventBody(body) {
  const { type, title, start_date, end_date, staff_id } = body || {};
  if (!TYPE_SET.has(type)) return { error: "종류가 올바르지 않습니다." };
  const trimmed = String(title ?? "").trim();
  if (!trimmed) return { error: "제목을 입력하세요." };
  if (!DATE_RE.test(start_date ?? "")) return { error: "시작일 형식이 올바르지 않습니다." };
  const end = DATE_RE.test(end_date ?? "") ? end_date : start_date;
  if (end < start_date) return { error: "종료일이 시작일보다 빠를 수 없습니다." };
  return {
    value: { type, title: trimmed, start_date, end_date: end, staff_id: staff_id || null },
  };
}
