import crypto from "node:crypto";
import { cookies } from "next/headers";

// 편집 세션: EDIT_SESSION_SECRET로 서명한 만료 토큰을 httpOnly 쿠키에 저장.
export const EDIT_COOKIE = "ieum_edit";
export const EDIT_TTL_MS = 8 * 60 * 60 * 1000; // 8시간

function getSecret() {
  const s = process.env.EDIT_SESSION_SECRET;
  if (!s) throw new Error("EDIT_SESSION_SECRET 미설정");
  return s;
}

function sign(payload) {
  return crypto.createHmac("sha256", getSecret()).update(payload).digest("base64url");
}

export function signSession(ttlMs = EDIT_TTL_MS) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyToken(token) {
  if (!token || typeof token !== "string") return false;
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return false;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}

// PIN 상수시간 비교 (길이 노출 방지 위해 해시 후 비교)
export function pinMatches(input) {
  const pin = process.env.EDIT_PIN;
  if (!pin) throw new Error("EDIT_PIN 미설정");
  const a = crypto.createHash("sha256").update(String(input)).digest();
  const b = crypto.createHash("sha256").update(String(pin)).digest();
  return crypto.timingSafeEqual(a, b);
}

export async function isEditable() {
  const store = await cookies();
  return verifyToken(store.get(EDIT_COOKIE)?.value);
}

// 라우트 핸들러에서 쓰기 전 호출. 실패 시 status 401 에러를 throw.
export async function requireEditSession() {
  if (!(await isEditable())) {
    const err = new Error("unauthorized");
    err.status = 401;
    throw err;
  }
}
