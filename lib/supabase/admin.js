import { createClient } from "@supabase/supabase-js";

// 서버 전용 service_role 클라이언트. RLS를 우회하므로 절대 브라우저로 노출하면 안 된다.
// 쓰기(insert/update/delete)는 PIN 세션 검증 후 이 클라이언트로만 수행한다.
let cached = null;

export function getSupabaseAdmin() {
  if (typeof window !== "undefined") {
    throw new Error("getSupabaseAdmin은 브라우저에서 호출할 수 없습니다.");
  }
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error(
      "Supabase admin 환경변수(NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)가 없습니다.",
    );
  }

  cached = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
