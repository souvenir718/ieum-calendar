// 초기 데이터 시드 (멱등). service_role 키로 RLS를 우회한다.
//
// 실행:
//   node --env-file=.env.local scripts/seed.mjs
//
// 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY\n" +
      "  node --env-file=.env.local scripts/seed.mjs 형태로 실행하세요.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// ── 명단 ─────────────────────────────────────────────────
const staff = [
  { name: "김윤경", class_name: null, role: "director", is_duty_eligible: false, sort_order: 0 },
  { name: "이혜빈", class_name: "포근반", role: "teacher", is_duty_eligible: true, sort_order: 1 },
  { name: "정지혜", class_name: "포근반", role: "teacher", is_duty_eligible: true, sort_order: 2 },
  { name: "홍여진", class_name: "포근반", role: "teacher", is_duty_eligible: true, sort_order: 3 },
  { name: "김민경", class_name: "다솜반", role: "teacher", is_duty_eligible: true, sort_order: 4 },
  { name: "최옥희", class_name: "다솜반", role: "teacher", is_duty_eligible: true, sort_order: 5 },
  { name: "어영경", class_name: "도담반", role: "teacher", is_duty_eligible: true, sort_order: 6 },
  { name: "봉은영", class_name: "라온반", role: "teacher", is_duty_eligible: true, sort_order: 7 },
];

const holidays = [{ holiday_date: "2026-07-17", name: "제헌절" }];

// ── 당직 (현재 2026년 7월 표) ────────────────────────────
const assignments = {
  "2026-07-02": [["오전1", "김민경"], ["오전2", "정지혜"], ["오후1", "이혜빈"], ["오후2", "최옥희"]],
  "2026-07-03": [["오전1", "봉은영"], ["오전2", "김민경"], ["오후1", "최옥희"], ["오후2", "정지혜"]],
  "2026-07-06": [["오전1", "홍여진"], ["오전2", "어영경"], ["오후1", "김민경"], ["오후2", "봉은영"]],
  "2026-07-07": [["오전1", "정지혜"], ["오전2", "최옥희"], ["오후1", "이혜빈"], ["오후2", "어영경"]],
  "2026-07-08": [["오전1", "봉은영"], ["오전2", "이혜빈"], ["오후1", "어영경"], ["오후2", "홍여진"]],
  "2026-07-09": [["오전1", "이혜빈"], ["오전2", "봉은영"], ["오후1", "정지혜"], ["오후2", "김민경"]],
  "2026-07-10": [["오전1", "최옥희"], ["오전2", "홍여진"], ["오후1", "이혜빈"], ["오후2", "어영경"]],
  "2026-07-13": [["오전1", "김민경"], ["오전2", "정지혜"], ["오후1", "최옥희"], ["오후2", "봉은영"]],
  "2026-07-14": [["오전1", "어영경"], ["오전2", "정지혜"], ["오후1", "홍여진"], ["오후2", "봉은영"]],
  "2026-07-15": [["오전1", "최옥희"], ["오전2", "어영경"], ["오후1", "김민경"], ["오후2", "이혜빈"]],
  "2026-07-16": [["오전1", "봉은영"], ["오전2", "최옥희"], ["오후1", "홍여진"], ["오후2", "어영경"]],
  "2026-07-20": [["오전1", "홍여진"], ["오전2", "이혜빈"], ["오후1", "어영경"], ["오후2", "김민경"]],
  "2026-07-21": [["오전1", "홍여진"], ["오전2", "봉은영"], ["오후1", "김민경"], ["오후2", "이혜빈"]],
  "2026-07-22": [["오전1", "어영경"], ["오전2", "홍여진"], ["오후1", "봉은영"], ["오후2", "정지혜"]],
  "2026-07-23": [["오전1", "최옥희"], ["오전2", "김민경"], ["오후1", "어영경"], ["오후2", "이혜빈"]],
  "2026-07-24": [["오전1", "정지혜"], ["오전2", "봉은영"], ["오후1", "홍여진"], ["오후2", "김민경"]],
  "2026-07-27": [["오전1", "이혜빈"], ["오전2", "최옥희"], ["오후1", "봉은영"], ["오후2", "정지혜"]],
  "2026-07-28": [["오전1", "김민경"], ["오전2", "홍여진"], ["오후1", "정지혜"], ["오후2", "최옥희"]],
  "2026-07-29": [["오전1", "이혜빈"], ["오전2", "김민경"], ["오후1", "최옥희"], ["오후2", "홍여진"]],
  "2026-07-30": [["오전1", "정지혜"], ["오전2", "어영경"], ["오후1", "봉은영"], ["오후2", "홍여진"]],
  "2026-07-31": [["오전1", "어영경"], ["오전2", "이혜빈"], ["오후1", "정지혜"], ["오후2", "최옥희"]],
};

function die(label, error) {
  if (error) {
    console.error(`✗ ${label}:`, error.message || error);
    process.exit(1);
  }
}

async function main() {
  // 1) staff upsert
  {
    const { error } = await supabase.from("staff").upsert(staff, { onConflict: "name" });
    die("staff upsert", error);
  }

  // 이름 → id 매핑
  const { data: staffRows, error: staffSelErr } = await supabase
    .from("staff")
    .select("id, name");
  die("staff select", staffSelErr);
  const idByName = Object.fromEntries(staffRows.map((r) => [r.name, r.id]));

  // 2) holidays upsert
  {
    const { error } = await supabase
      .from("holidays")
      .upsert(holidays, { onConflict: "holiday_date" });
    die("holidays upsert", error);
  }

  // 3) duties upsert
  const dutyRows = [];
  for (const [date, slots] of Object.entries(assignments)) {
    for (const [slot, name] of slots) {
      const staff_id = idByName[name];
      if (!staff_id) die(`이름 매핑 실패: ${name}`, new Error("staff 없음"));
      dutyRows.push({ duty_date: date, slot, staff_id });
    }
  }
  {
    const { error } = await supabase
      .from("duties")
      .upsert(dutyRows, { onConflict: "duty_date,slot" });
    die("duties upsert", error);
  }

  console.log("✓ 시드 완료");
  console.log(`  staff: ${staff.length}명, holidays: ${holidays.length}건, duties: ${dutyRows.length}건`);
}

main().catch((e) => {
  console.error("✗ 시드 실패:", e);
  process.exit(1);
});
