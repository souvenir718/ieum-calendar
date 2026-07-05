// 2026~2027 공휴일 시드 (멱등). service_role 키로 RLS를 우회한다.
//
// 실행:
//   node --env-file=.env.local scripts/seed-holidays.mjs
//
// 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
import { createClient } from "@supabase/supabase-js";

import { holidays } from "./holiday-data.mjs";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error(
    "환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY\n" +
      "  node --env-file=.env.local scripts/seed-holidays.mjs 형태로 실행하세요.",
  );
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function die(label, error) {
  if (error) {
    console.error(`✗ ${label}:`, error.message || error);
    process.exit(1);
  }
}

const { error } = await supabase
  .from("holidays")
  .upsert(holidays, { onConflict: "holiday_date" });
die("holidays upsert", error);

console.log(`✓ 공휴일 추가/갱신 완료: ${holidays.length}건`);
