const schedule = {
  month: "2026-07",
  title: "2026년 7월 당직표",
  displayMonth: "2026년 7월",
  note: "주말 및 공휴일 제외, 7월 17일 제헌절",
  people: [
    { name: "김민경", count: 10 },
    { name: "이혜림", count: 10 },
    { name: "봉은영", count: 10 },
    { name: "홍여진", count: 9 },
    { name: "어영경", count: 9 },
    { name: "최옥희", count: 9 },
    { name: "정지혜", count: 9 },
  ],
  assignments: {
    "2026-07-01": [
      ["오전1", "김민경"],
      ["오전2", "이혜림"],
      ["오후", "봉은영"],
    ],
    "2026-07-02": [
      ["오전1", "홍여진"],
      ["오전2", "어영경"],
      ["오후", "최옥희"],
    ],
    "2026-07-03": [
      ["오전1", "김민경"],
      ["오전2", "이혜림"],
      ["오후", "정지혜"],
    ],
    "2026-07-06": [
      ["오전1", "봉은영"],
      ["오전2", "홍여진"],
      ["오후", "어영경"],
    ],
    "2026-07-07": [
      ["오전1", "이혜림"],
      ["오전2", "김민경"],
      ["오후", "최옥희"],
    ],
    "2026-07-08": [
      ["오전1", "정지혜"],
      ["오전2", "봉은영"],
      ["오후", "홍여진"],
    ],
    "2026-07-09": [
      ["오전1", "어영경"],
      ["오전2", "최옥희"],
      ["오후", "김민경"],
    ],
    "2026-07-10": [
      ["오전1", "이혜림"],
      ["오전2", "정지혜"],
      ["오후", "봉은영"],
    ],
    "2026-07-13": [
      ["오전1", "최옥희"],
      ["오전2", "김민경"],
      ["오후", "홍여진"],
    ],
    "2026-07-14": [
      ["오전1", "어영경"],
      ["오전2", "이혜림"],
      ["오후", "정지혜"],
    ],
    "2026-07-15": [
      ["오전1", "봉은영"],
      ["오전2", "홍여진"],
      ["오후", "김민경"],
    ],
    "2026-07-16": [
      ["오전1", "최옥희"],
      ["오전2", "어영경"],
      ["오후", "이혜림"],
    ],
    "2026-07-20": [
      ["오전1", "정지혜"],
      ["오전2", "봉은영"],
      ["오후", "김민경"],
    ],
    "2026-07-21": [
      ["오전1", "홍여진"],
      ["오전2", "최옥희"],
      ["오후", "어영경"],
    ],
    "2026-07-22": [
      ["오전1", "김민경"],
      ["오전2", "정지혜"],
      ["오후", "이혜림"],
    ],
    "2026-07-23": [
      ["오전1", "봉은영"],
      ["오전2", "홍여진"],
      ["오후", "어영경"],
    ],
    "2026-07-24": [
      ["오전1", "이혜림"],
      ["오전2", "최옥희"],
      ["오후", "정지혜"],
    ],
    "2026-07-27": [
      ["오전1", "김민경"],
      ["오전2", "봉은영"],
      ["오후", "홍여진"],
    ],
    "2026-07-28": [
      ["오전1", "어영경"],
      ["오전2", "이혜림"],
      ["오후", "최옥희"],
    ],
    "2026-07-29": [
      ["오전1", "정지혜"],
      ["오전2", "김민경"],
      ["오후", "봉은영"],
    ],
    "2026-07-30": [
      ["오전1", "홍여진"],
      ["오전2", "어영경"],
      ["오후", "이혜림"],
    ],
    "2026-07-31": [
      ["오전1", "최옥희"],
      ["오전2", "정지혜"],
      ["오후", "봉은영"],
    ],
  },
  holidays: {
    "2026-07-17": "제헌절",
  },
  events: {},
};

const weekdayLabels = ["일", "월", "화", "수", "목", "금", "토"];
const calendarGrid = document.querySelector("#calendarGrid");
const slotLegend = document.querySelector("#slotLegend");
const tabButtons = document.querySelectorAll(".tab-button");

let activeView = "duty";

function dateKey(day) {
  return `2026-07-${String(day).padStart(2, "0")}`;
}

function getDateMeta(day) {
  const date = new Date(Date.UTC(2026, 6, day));
  const weekdayIndex = date.getUTCDay();
  const key = dateKey(day);
  return {
    key,
    day,
    weekday: weekdayLabels[weekdayIndex],
    isWeekend: weekdayIndex === 0 || weekdayIndex === 6,
    holidayName: schedule.holidays[key] || "",
    assignments: schedule.assignments[key] || [],
  };
}

function getMonthDays() {
  return Array.from({ length: 31 }, (_, index) => getDateMeta(index + 1));
}

function renderCalendar(days) {
  calendarGrid.replaceChildren();
  slotLegend.hidden = activeView !== "duty";

  const firstDayOffset = new Date(Date.UTC(2026, 6, 1)).getUTCDay();
  for (let index = 0; index < firstDayOffset; index += 1) {
    const empty = document.createElement("div");
    empty.className = "day-card is-empty";
    calendarGrid.append(empty);
  }

  days.forEach((day) => {
    const card = document.createElement("article");
    card.className = "day-card";
    if (day.isWeekend) card.classList.add("is-weekend");
    if (day.holidayName) card.classList.add("is-holiday");

    const content = document.createElement("div");
    content.className = "assignments";

    if (day.holidayName) {
      content.innerHTML = `<div class="closed-label">${day.holidayName}</div>`;
    } else if (day.isWeekend) {
      content.innerHTML = `<div class="muted-label">주말</div>`;
    } else if (activeView === "duty" && day.assignments.length > 0) {
      day.assignments.forEach(([slot, person]) => {
        const row = document.createElement("div");
        row.className = "assignment";
        row.dataset.slot = slot;
        row.innerHTML = `
          <span class="slot">${slot}</span>
          <span class="assignee">${person}</span>
        `;
        content.append(row);
      });
    } else if (activeView === "events" && (schedule.events[day.key] || []).length > 0) {
      schedule.events[day.key].forEach((event) => {
        const row = document.createElement("div");
        row.className = "event-item";
        row.textContent = event;
        content.append(row);
      });
    } else {
      content.innerHTML =
        activeView === "duty"
          ? `<div class="muted-label">배정 없음</div>`
          : `<div class="muted-label">일정 없음</div>`;
    }

    card.innerHTML = `
      <div class="date-row">
        <span class="date-number">${day.day}</span>
        <span class="weekday-label">${day.weekday}</span>
      </div>
    `;
    card.append(content);
    calendarGrid.append(card);
  });
}

function render() {
  const days = getMonthDays();
  tabButtons.forEach((button) => {
    const isActive = button.dataset.view === activeView;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });
  renderCalendar(days);
}

tabButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeView = button.dataset.view;
    render();
  });
});

render();
