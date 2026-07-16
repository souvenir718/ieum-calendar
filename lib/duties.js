// 당직(duties) 편집 공용 상수 + 입력 검증 (라우트/UI 공용)

// 현재 편집 대상 슬롯. 오후2는 2026-07-20부터 폐지되어 편집 대상에서 제외한다.
// (재개 시 여기에 "오후2"를 추가하면 편집 UI/API에 다시 노출된다. docs/당직규칙.md 참고)
export const EDITABLE_SLOTS = ["오전1", "오전2", "오후1"];

const SLOT_SET = new Set(EDITABLE_SLOTS);
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// 당직 편집 본문 검증 → { value: { date, assignments } } 또는 { error }
// assignments: { [slot]: staff_id | null }  (null = 해당 슬롯 배정 해제)
export function parseDutyBody(body) {
  const { date, assignments } = body || {};
  if (!DATE_RE.test(date ?? "")) return { error: "날짜 형식이 올바르지 않습니다." };
  if (!assignments || typeof assignments !== "object") {
    return { error: "배정 정보가 올바르지 않습니다." };
  }

  const cleaned = {};
  for (const [slot, staffId] of Object.entries(assignments)) {
    if (!SLOT_SET.has(slot)) return { error: `편집할 수 없는 슬롯입니다: ${slot}` };
    if (staffId === null || staffId === "" || staffId === undefined) {
      cleaned[slot] = null;
    } else if (typeof staffId === "string" && UUID_RE.test(staffId)) {
      cleaned[slot] = staffId;
    } else {
      return { error: "담당자 ID가 올바르지 않습니다." };
    }
  }

  return { value: { date, assignments: cleaned } };
}
