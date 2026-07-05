// 인쇄(PDF) 레이아웃 및 화면 범례용 상수. 자주 바뀌지 않아 DB가 아닌 코드로 관리한다.

export const dutySlots = [
  { name: "오전1", time: "7:30 ~ 16:30", className: "morning-one" },
  { name: "오전2", time: "8:00 ~ 17:00", className: "morning-two" },
  {
    name: "오후1",
    time: "9:00 ~ 18:30",
    note: "다음날 30분 일찍 퇴근",
    className: "afternoon-one",
  },
  {
    name: "오후2",
    time: "9:30 ~ 19:30",
    note: "1시간 시간 외 수당 지급",
    className: "afternoon-two",
  },
];

export const printConfig = {
  org: "이음어린이집",
  // 당직시간 표기법
  dutyHours: [
    { label: "오전1", time: "오전 7시 30분 ~ 9시" },
    { label: "오전2", time: "오전 8시 ~ 9시" },
    { label: "오후1", time: "오후 4시 30분 ~ 6시 30분" },
    { label: "오후2", time: "오후 4시 30분 ~ 7시 30분" },
  ],
  dutyNote: "※ 보육교사 - 1개월 단위 탄력적 근로제",
  // 조기퇴근 표기법 (퇴근시간)
  earlyLegend: [
    { label: "0.5", time: "오후 5시 30분" },
    { label: "1", time: "오후 5시" },
    { label: "1.5", time: "오후 4시 30분" },
    { label: "2", time: "오후 4시" },
  ],
  earlyNote:
    "※ 오전 당직 근무에 따른 주 40시간 초과근무는 평일 근무 시간을 단축하며, 18시 이후 연장반 당직은 시간 외 수당을 지급함.",
  // 공람 서명란: 직급/반별 담당자
  viewers: [
    { group: "원장", members: ["김윤경"] },
    { group: "포근반", members: ["이혜빈", "정지혜", "홍여진"] },
    { group: "다솜반", members: ["김민경", "최옥희"] },
    { group: "도담반", members: ["어영경"] },
    { group: "라온반", members: ["봉은영"] },
  ],
  footerNote: "※ 위 표의 내용은 변경될 수 있습니다.",
};
