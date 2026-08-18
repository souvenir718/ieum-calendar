import crypto from "node:crypto";
import { revalidatePath } from "next/cache";

export const dynamic = "force-dynamic";

const MONTH_RE = /^\d{4}-\d{2}$/;

function secretMatches(input) {
  const secret = process.env.REVALIDATE_SECRET;
  if (!secret) return false;
  const a = crypto.createHash("sha256").update(String(input ?? "")).digest();
  const b = crypto.createHash("sha256").update(secret).digest();
  return crypto.timingSafeEqual(a, b);
}

// seed 스크립트 등 Next.js 바깥에서 duties/events를 직접 upsert한 뒤,
// 해당 월 페이지와 /stats의 ISR 캐시를 즉시 무효화하기 위한 내부용 엔드포인트.
// body: { secret, months: ["YYYY-MM", ...] }
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  if (!secretMatches(body?.secret)) {
    return Response.json({ error: "인증 실패" }, { status: 401 });
  }

  const months = Array.isArray(body?.months) ? body.months : [];
  const invalid = months.filter((m) => !MONTH_RE.test(m));
  if (invalid.length > 0) {
    return Response.json({ error: `월 형식이 올바르지 않습니다: ${invalid.join(", ")}` }, { status: 400 });
  }

  revalidatePath("/[month]", "page");
  revalidatePath("/stats", "page");
  for (const month of months) {
    revalidatePath(`/${month}`);
  }

  return Response.json({ revalidated: ["/stats", ...months.map((m) => `/${m}`)] });
}
