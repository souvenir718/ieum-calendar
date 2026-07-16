import { revalidatePath } from "next/cache";

import { requireEditSession } from "../../../lib/edit-session";
import { getSupabaseAdmin } from "../../../lib/supabase/admin";
import { parseDutyBody, EDITABLE_SLOTS } from "../../../lib/duties";
import { SLOT_ORDER } from "../../../lib/calendar";

export const dynamic = "force-dynamic";

// 당직 편집: PIN 세션이 있어야만 수행. 한 날짜의 슬롯별 담당자를 upsert/삭제한다.
// body: { date: "YYYY-MM-DD", assignments: { 오전1: staff_id|null, ... } }
export async function PUT(request) {
  try {
    await requireEditSession();
  } catch {
    return Response.json({ error: "편집 권한이 없습니다. PIN으로 잠금을 해제하세요." }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "잘못된 요청입니다." }, { status: 400 });
  }

  const { value, error } = parseDutyBody(body);
  if (error) return Response.json({ error }, { status: 400 });

  const { date, assignments } = value;
  const supabase = getSupabaseAdmin();

  const toUpsert = [];
  const toDelete = [];
  for (const slot of Object.keys(assignments)) {
    const staffId = assignments[slot];
    if (staffId) {
      toUpsert.push({ duty_date: date, slot, staff_id: staffId });
    } else {
      toDelete.push(slot);
    }
  }

  if (toDelete.length > 0) {
    const { error: delError } = await supabase
      .from("duties")
      .delete()
      .eq("duty_date", date)
      .in("slot", toDelete);
    if (delError) return Response.json({ error: delError.message }, { status: 500 });
  }

  if (toUpsert.length > 0) {
    const { error: upError } = await supabase
      .from("duties")
      .upsert(toUpsert, { onConflict: "duty_date,slot" });
    if (upError) return Response.json({ error: upError.message }, { status: 500 });
  }

  // 저장 후 해당 날짜의 최신 배정을 다시 읽어 클라이언트에 반환
  const { data: rows, error: readError } = await supabase
    .from("duties")
    .select("slot, staff:staff_id(name)")
    .eq("duty_date", date);
  if (readError) return Response.json({ error: readError.message }, { status: 500 });

  const dayAssignments = (rows ?? [])
    .map((row) => [row.slot, row.staff?.name ?? ""])
    .filter(([slot]) => EDITABLE_SLOTS.includes(slot))
    .sort((a, b) => SLOT_ORDER[a[0]] - SLOT_ORDER[b[0]]);

  revalidatePath("/[month]", "page");
  revalidatePath(`/${date.slice(0, 7)}`);
  return Response.json({ date, assignments: dayAssignments });
}
