// 2026년 생일 일정만 멱등 추가한다.
//
// 실행:
//   node --env-file=.env.local scripts/seed-birthdays.mjs
//
// 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY\n" +
      "  node --env-file=.env.local scripts/seed-birthdays.mjs 형태로 실행하세요.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const birthdayEvents = [
  { type: "생일", title: "어영경", start_date: "2027-01-16", end_date: "2027-01-16" },
  { type: "생일", title: "최옥희", start_date: "2026-03-05", end_date: "2026-03-05" },
  { type: "생일", title: "홍여진", start_date: "2026-04-09", end_date: "2026-04-09" },
  { type: "생일", title: "봉은영", start_date: "2026-04-16", end_date: "2026-04-16" },
  { type: "생일", title: "진복남", start_date: "2026-07-20", end_date: "2026-07-20" },
  { type: "생일", title: "이혜빈", start_date: "2026-08-21", end_date: "2026-08-21" },
  { type: "생일", title: "김민경", start_date: "2026-10-05", end_date: "2026-10-05" },
  { type: "생일", title: "정지혜", start_date: "2026-12-09", end_date: "2026-12-09" },
  { type: "생일", title: "김윤경", start_date: "2026-12-20", end_date: "2026-12-20" },
];

function die(label, error) {
  if (error) {
    console.error(`✗ ${label}:`, error.message || error);
    process.exit(1);
  }
}

const birthdayKey = (event) =>
  `${event.type}:${event.title}:${event.start_date}:${event.end_date}`;

const { data: existingBirthdays, error: selectError } = await supabase
  .from("events")
  .select("type, title, start_date, end_date")
  .eq("type", "생일")
  .gte("start_date", "2026-01-01")
  .lte("start_date", "2027-12-31");
die("birthday select", selectError);

const existingKeys = new Set((existingBirthdays ?? []).map(birthdayKey));
const rows = birthdayEvents.filter((event) => !existingKeys.has(birthdayKey(event)));

if (rows.length > 0) {
  const { error: insertError } = await supabase.from("events").insert(rows);
  die("birthday insert", insertError);
}

console.log(`✓ 생일 일정 추가 완료: ${rows.length}/${birthdayEvents.length}건`);
