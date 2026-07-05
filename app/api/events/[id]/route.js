import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { EVENT_SELECT, parseEventBody } from "../../../../lib/events";

export const dynamic = "force-dynamic";

export async function PUT(request, { params }) {
  const { id } = await params;
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
    .update(value)
    .eq("id", id)
    .select(EVENT_SELECT)
    .single();
  if (dbError) return Response.json({ error: dbError.message }, { status: 500 });
  if (!data) return Response.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });

  revalidatePath("/[month]", "page");
  return Response.json({ event: data });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const { error } = await getSupabaseAdmin().from("events").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidatePath("/[month]", "page");
  return Response.json({ ok: true });
}
