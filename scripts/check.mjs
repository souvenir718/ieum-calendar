// 시드 데이터 확인 (anon 키로 공개 읽기 검증 겸용).
//
// 실행:
//   node --env-file=.env.local scripts/check.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) {
  console.error("환경변수 누락: NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY");
  process.exit(1);
}
const supabase = createClient(url, anonKey, { auth: { persistSession: false } });

async function count(table) {
  const { count, error } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(`${table}: ${error.message}`);
  return count;
}

async function main() {
  console.log("== 행 수 ==");
  for (const t of ["staff", "holidays", "duties", "events"]) {
    console.log(`  ${t}: ${await count(t)}`);
  }
  console.log("  (기대값: staff 8, holidays 1, duties 84, events 0)");

  // 샘플: 7/2 당직 (이름 join)
  const { data, error } = await supabase
    .from("duties")
    .select("slot, staff:staff_id(name)")
    .eq("duty_date", "2026-07-02")
    .order("slot");
  if (error) throw new Error(error.message);
  console.log("\n== 2026-07-02 당직 ==");
  for (const r of data) console.log(`  ${r.slot}: ${r.staff?.name}`);

  // anon 쓰기가 막히는지 확인(보안)
  const { error: writeErr } = await supabase
    .from("holidays")
    .insert({ holiday_date: "2099-01-01", name: "테스트" });
  console.log(
    "\n== anon 쓰기 차단 확인 ==\n  " +
      (writeErr ? `✓ 거부됨 (${writeErr.message})` : "✗ 경고: 쓰기가 허용됨! RLS 정책 점검 필요"),
  );
}

main().catch((e) => {
  console.error("✗ 확인 실패:", e.message);
  process.exit(1);
});
