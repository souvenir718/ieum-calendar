import { createClient } from "@supabase/supabase-js";

// 서버 컴포넌트/라우트 핸들러의 "읽기"용 anon 클라이언트.
// RLS의 select 정책만 통과하며 쓰기는 불가능하다(쓰기는 admin 클라이언트 사용).
export function getSupabaseServer() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error("Supabase 환경변수(NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)가 없습니다.");
  }
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  });
}
