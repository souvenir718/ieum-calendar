import { createClient } from "@supabase/supabase-js";

// 브라우저(클라이언트 컴포넌트)용 anon 클라이언트. RLS로 읽기만 허용된다.
let cached = null;

export function getSupabaseBrowser() {
  if (cached) return cached;
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
  return cached;
}
