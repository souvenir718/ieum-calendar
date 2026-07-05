import { cookies } from "next/headers";

import {
  EDIT_COOKIE,
  EDIT_TTL_MS,
  isEditable,
  pinMatches,
  signSession,
} from "../../../lib/edit-session";

export const dynamic = "force-dynamic";

// 편집 잠금 해제: PIN 검증 후 서명 쿠키 발급
export async function POST(request) {
  if (!process.env.EDIT_PIN || !process.env.EDIT_SESSION_SECRET) {
    return Response.json(
      { error: "서버에 EDIT_PIN/EDIT_SESSION_SECRET가 설정되지 않았습니다." },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const input = String(body?.pin ?? "");
  if (!input || !pinMatches(input)) {
    return Response.json({ error: "PIN이 올바르지 않습니다." }, { status: 401 });
  }

  const store = await cookies();
  store.set(EDIT_COOKIE, signSession(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: Math.floor(EDIT_TTL_MS / 1000),
  });
  return Response.json({ editable: true });
}

// 잠금(로그아웃)
export async function DELETE() {
  const store = await cookies();
  store.delete(EDIT_COOKIE);
  return Response.json({ editable: false });
}

// 편집 가능 여부 조회
export async function GET() {
  return Response.json({ editable: await isEditable() });
}
