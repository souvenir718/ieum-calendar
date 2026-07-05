import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "../../../lib/supabase/admin";
import { EVENT_SELECT, parseEventBody } from "../../../lib/events";

export const dynamic = "force-dynamic";

// 일정은 별도 인증 없이 자유롭게 추가/수정/삭제 (내부용).
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }
  const { value, error } = parseEventBody(body);
  if (error) return Response.json({ error }, { status: 400 });

  const { data, error: dbError } = await getSupabaseAdmin()
    .from("events")
    .insert(value)
    .select(EVENT_SELECT)
    .single();
  if (dbError) return Response.json({ error: dbError.message }, { status: 500 });

  revalidatePath("/[month]", "page");
  revalidatePath(`/${value.start_date.slice(0, 7)}`);
  if (value.end_date.slice(0, 7) !== value.start_date.slice(0, 7)) {
    revalidatePath(`/${value.end_date.slice(0, 7)}`);
  }
  return Response.json({ event: data });
}
