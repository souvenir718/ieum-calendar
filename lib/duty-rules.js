// 당직 슬롯 규칙의 "시간축 이력".
//
// 당직 규칙은 한 번 정하면 끝이 아니라 원 사정에 따라 바뀐다(오후2 폐지·재개, 오후1 근무시간 변경 등).
// 그래서 현재 규칙 하나를 상수로 박지 않고 발효일(`from`)이 붙은 이력을 쌓는다.
//   - 과거 월을 조회·인쇄하면 그 시점의 규칙으로 계산된다. 이미 공람이 끝난 당직표가 소급 변경되지 않는다.
//   - 규칙을 되돌릴 때도 코드를 revert하지 않고 새 발효일 항목을 한 줄 덧붙인다.
//
// 각 항목의 `slots`는 **직전 규칙에 대한 부분 덮어쓰기(patch)**다. 바뀐 슬롯만 적으면 된다.
// 규칙은 항상 **당직을 선 날짜** 기준으로 고른다. 예를 들어 2026-09-30 오후1의 0.5 조기퇴근은
// 조기퇴근이 발생하는 날(10-01)이 아니라 근무일(09-30)의 규칙을 따르므로 그대로 유지된다.
//
// 슬롯 필드:
//   time       화면 범례/당직 모달에 쓰는 전체 근무시간
//   printTime  인쇄 "당직시간" 표기(실제 당직 시간대만)
//   note       범례 보조 문구 (없으면 생략)
//   className  범례 색상 클래스 (app/globals.css)
//   earlyLeave { when: "sameDay" | "nextWorkday", hours, onMeetingDay? } 또는 null(조기퇴근 없음)
//              onMeetingDay: "nextWorkday"면 교사회의가 있는 날의 당직은 다음 근무일에 조기퇴근한다.

export const DUTY_RULE_HISTORY = [
  {
    from: "2000-01-01",
    slots: {
      오전1: {
        time: "7:30 ~ 16:30",
        printTime: "오전 7시 30분 ~ 9시",
        className: "morning-one",
        earlyLeave: { when: "sameDay", hours: "1.5" },
      },
      오전2: {
        time: "8:00 ~ 17:00",
        printTime: "오전 8시 ~ 9시",
        className: "morning-two",
        earlyLeave: { when: "sameDay", hours: "1.0" },
      },
      오후1: {
        time: "9:00 ~ 18:30",
        printTime: "오후 4시 30분 ~ 6시 30분",
        note: "다음날 30분 일찍 퇴근",
        className: "afternoon-one",
        earlyLeave: { when: "nextWorkday", hours: "0.5" },
      },
      오후2: {
        time: "9:30 ~ 19:30",
        printTime: "오후 4시 30분 ~ 7시 30분",
        note: "1시간 시간 외 수당 지급",
        className: "afternoon-two",
        earlyLeave: null,
      },
    },
  },
  {
    // 2026-10 시행: 오후1을 30분 연장하고, 다음날 조기퇴근 대신 1시간 시간외수당을 지급한다.
    // 조기퇴근이 사라지므로 "오후1 담당자는 다음 근무일에 당직을 서지 않는다" 제약도 함께 해제된다
    // (다만 연속 근무는 지양 — scripts/check-rule.mjs가 안내로 알려준다).
    // 한 달만 시행하고 원복한다면 { from: "2026-11-01", slots: { 오후1: ...옛 규칙 } }을 덧붙이면 된다.
    from: "2026-10-01",
    slots: {
      오후1: {
        time: "9:00 ~ 19:00",
        printTime: "오후 4시 30분 ~ 7시",
        note: "1시간 시간 외 수당 지급",
        className: "afternoon-one",
        earlyLeave: null,
      },
    },
  },
  {
    // 2026-11 시행: 오후1을 2026-09 이전 규칙(9:00~18:30 + 다음 근무일 0.5 조기퇴근)으로 원복한다.
    // 조기퇴근이 돌아오므로 "다음 근무일 오후 당직 금지" 제약도 다시 적용된다.
    // 10-30(금) 오후1은 10월 규칙(시간외수당)이라 11-02 조기퇴근으로 이월되지 않는다.
    // 같은 날부터 교사회의가 있는 날의 오전1·오전2는 회의 때문에 당일 조기퇴근 대신 다음 근무일에 조기퇴근한다.
    from: "2026-11-01",
    slots: {
      오전1: {
        earlyLeave: { when: "sameDay", hours: "1.5", onMeetingDay: "nextWorkday" },
      },
      오전2: {
        earlyLeave: { when: "sameDay", hours: "1.0", onMeetingDay: "nextWorkday" },
      },
      오후1: {
        time: "9:00 ~ 18:30",
        printTime: "오후 4시 30분 ~ 6시 30분",
        note: "다음날 30분 일찍 퇴근",
        className: "afternoon-one",
        earlyLeave: { when: "nextWorkday", hours: "0.5" },
      },
    },
  },
];

// 슬롯 표시 순서는 최초 규칙의 선언 순서를 따른다.
export const SLOT_NAMES = Object.keys(DUTY_RULE_HISTORY[0].slots);

const resolved = new Map();

// 발효일 이력을 dateKey 시점까지 병합한 { 슬롯명: 규칙 } 객체
export function dutyRulesFor(dateKey) {
  let index = 0;
  while (index + 1 < DUTY_RULE_HISTORY.length && DUTY_RULE_HISTORY[index + 1].from <= dateKey) {
    index += 1;
  }
  if (resolved.has(index)) return resolved.get(index);

  const merged = {};
  for (let i = 0; i <= index; i++) {
    for (const [slot, rule] of Object.entries(DUTY_RULE_HISTORY[i].slots)) {
      merged[slot] = { ...merged[slot], ...rule };
    }
  }
  resolved.set(index, merged);
  return merged;
}

// 범례/모달용 슬롯 목록 (표시 순서대로, name 포함)
export function dutySlotsFor(dateKey) {
  const rules = dutyRulesFor(dateKey);
  return SLOT_NAMES.filter((name) => rules[name]).map((name) => ({ name, ...rules[name] }));
}

// 일정 제목이 교사회의인지 ("교사 회의"처럼 띄어 써도 인정)
export function isTeacherMeeting(title) {
  return String(title ?? "").replace(/\s+/g, "").includes("교사회의");
}

// 일정 목록([{ title, start_date, end_date }])에서 교사회의가 있는 날짜 키 목록
export function teacherMeetingDays(eventRows) {
  const keys = [];
  for (const row of eventRows) {
    if (!isTeacherMeeting(row.title)) continue;
    const end = new Date(`${row.end_date}T00:00:00Z`);
    for (let d = new Date(`${row.start_date}T00:00:00Z`); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
      keys.push(d.toISOString().slice(0, 10));
    }
  }
  return keys;
}

// 해당 날짜 기준 슬롯의 조기퇴근 규칙 (없으면 null)
export function earlyLeaveRuleFor(dateKey, slot) {
  return dutyRulesFor(dateKey)[slot]?.earlyLeave ?? null;
}
