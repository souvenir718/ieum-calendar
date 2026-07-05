import { revalidatePath } from "next/cache";

import { getSupabaseAdmin } from "../../../../lib/supabase/admin";
import { EVENT_SELECT, parseEventBody } from "../../../../lib/events";

export const dynamic = "force-dynamic";

function revalidateEventMonths(event) {
  revalidatePath("/[month]", "page");
  revalidatePath(`/${event.start_date.slice(0, 7)}`);
  if (event.end_date.slice(0, 7) !== event.start_date.slice(0, 7)) {
    revalidatePath(`/${event.end_date.slice(0, 7)}`);
  }
}

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

  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from("events")
    .select("start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return Response.json({ error: selectError.message }, { status: 500 });
  if (!existing) return Response.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });

  const { data, error: dbError } = await supabase
    .from("events")
    .update(value)
    .eq("id", id)
    .select(EVENT_SELECT)
    .single();
  if (dbError) return Response.json({ error: dbError.message }, { status: 500 });
  if (!data) return Response.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });

  revalidateEventMonths(existing);
  revalidateEventMonths(data);
  return Response.json({ event: data });
}

export async function DELETE(_request, { params }) {
  const { id } = await params;
  const supabase = getSupabaseAdmin();
  const { data: existing, error: selectError } = await supabase
    .from("events")
    .select("start_date, end_date")
    .eq("id", id)
    .maybeSingle();
  if (selectError) return Response.json({ error: selectError.message }, { status: 500 });
  if (!existing) return Response.json({ error: "일정을 찾을 수 없습니다." }, { status: 404 });

  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return Response.json({ error: error.message }, { status: 500 });

  revalidateEventMonths(existing);
  return Response.json({ ok: true });
}
