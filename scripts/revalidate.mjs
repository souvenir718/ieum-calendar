// duties/events를 service_role 스크립트로 직접 upsert한 뒤 ISR 캐시를 날릴 때 사용.
//
// 실행:
//   node --env-file=.env.local scripts/revalidate.mjs 2026-09 [2026-10 ...]
//
// 필요한 환경변수: REVALIDATE_SECRET, REVALIDATE_BASE_URL(생략 시 운영 도메인)
const months = process.argv.slice(2);
if (months.length === 0) {
  console.error("사용법: node --env-file=.env.local scripts/revalidate.mjs 2026-09 [2026-10 ...]");
  process.exit(1);
}

const secret = process.env.REVALIDATE_SECRET;
if (!secret) {
  console.error("환경변수 누락: REVALIDATE_SECRET");
  process.exit(1);
}

const baseUrl = process.env.REVALIDATE_BASE_URL || "https://ieum-calendar.vercel.app";

const res = await fetch(`${baseUrl}/api/revalidate`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ secret, months }),
});

const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`실패 (${res.status}):`, body.error ?? body);
  process.exit(1);
}
console.log("캐시 무효화 완료:", body.revalidated);
