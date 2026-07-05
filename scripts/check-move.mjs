// 7/8 오전2(이혜빈)를 옮길 수 있는 유효한 방법 탐색 (일회성 분석).
//   1) 그날 오전2 교체 가능한 교사 후보
//   2) 슬롯 균형을 지키는 오전2↔오전2 맞교환 후보 (다른 규칙 위반을 새로 만들지 않는 것만)
// 실행: node --env-file=.env.local scripts/check-move.mjs
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  { auth: { persistSession: false } },
);

const classes = {
  이혜빈: "포근반", 정지혜: "포근반", 홍여진: "포근반",
  김민경: "다솜반", 최옥희: "다솜반", 어영경: "도담반", 봉은영: "라온반",
};
const SLOTS = ["오전1", "오전2", "오후1", "오후2"];
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const wdOf = (d) => WD[new Date(`${d}T00:00:00Z`).getUTCDay()];

const { data, error } = await supabase
  .from("duties")
  .select("duty_date, slot, staff:staff_id(name)")
  .order("duty_date");
if (error) { console.error(error.message); process.exit(1); }

const byDate = {};
for (const r of data) (byDate[r.duty_date] ||= {})[r.slot] = r.staff?.name ?? "";
const dates = Object.keys(byDate).sort();

// 전체 규칙 위반 집합 (문자열)
function violations(bd) {
  const V = new Set();
  const totals = {}, slotCnt = {}, wdCnt = {}, wdSlot = {};
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i], day = bd[d];
    const [m1, m2, p1, p2] = SLOTS.map((s) => day[s]);
    if (new Set([m1, m2, p1, p2]).size !== 4) V.add(`DUP4 ${d}`);
    if (classes[m1] === classes[m2]) V.add(`MORN-CLASS ${d}`);
    if (classes[p1] === classes[p2]) V.add(`AFT-CLASS ${d}`);
    const w = wdOf(d);
    for (const s of SLOTS) {
      const n = day[s];
      totals[n] = (totals[n] || 0) + 1;
      (slotCnt[n] ||= {})[s] = ((slotCnt[n] || {})[s] || 0) + 1;
      (wdCnt[n] ||= {})[w] = ((wdCnt[n] || {})[w] || 0) + 1;
      const key = `${n}|${s}|${w}`;
      if (wdSlot[key]) V.add(`WDSLOT ${key}`); else wdSlot[key] = 1;
    }
    if (i > 0) {
      const prev = bd[dates[i - 1]];
      for (const s of SLOTS) if (day[s] === prev[s]) V.add(`CONSEC ${s} ${d}`);
      if (m1 === prev["오후2"] || m2 === prev["오후2"]) V.add(`PM2->MORN ${d}`);
      if ([m1, m2, p1, p2].includes(prev["오후1"])) V.add(`PM1->NEXT ${d}`);
    }
  }
  for (const [n, c] of Object.entries(totals)) if (c !== 12) V.add(`TOTAL ${n}=${c}`);
  for (const [n, sc] of Object.entries(slotCnt))
    for (const s of SLOTS) if ((sc[s] || 0) !== 3) V.add(`SLOTCNT ${n} ${s}=${sc[s] || 0}`);
  for (const [n, wc] of Object.entries(wdCnt))
    for (const w of ["월", "화", "수", "목", "금"])
      if ((wc[w] || 0) < 2 || (wc[w] || 0) > 3) V.add(`WD ${n} ${w}=${wc[w] || 0}`);
  return V;
}

const base = violations(byDate);
console.log(`현재 전체 위반 ${base.size}건:`);
for (const v of [...base].sort()) console.log("  -", v);

const TARGET_DATE = "2026-07-08", TARGET_SLOT = "오전2";
const target = base.has(`PM1->NEXT ${TARGET_DATE}`);
console.log(`\n7/8 PM1->NEXT 위반 존재: ${target}\n`);

// 1) 그날 오전2 교체 후보 (즉시 제약만): 그날 미배정 + 다른 규칙 새로 안 깨는 사람
const clone = (bd) => Object.fromEntries(Object.entries(bd).map(([d, o]) => [d, { ...o }]));

console.log("== [교체] 7/8 오전2 자리에 넣을 수 있는 교사 (슬롯 균형은 깨짐) ==");
for (const name of Object.keys(classes)) {
  const day = byDate[TARGET_DATE];
  if (Object.values(day).includes(name)) continue; // 이미 그날 근무
  const trial = clone(byDate);
  trial[TARGET_DATE][TARGET_SLOT] = name;
  const nv = violations(trial);
  const added = [...nv].filter((v) => !base.has(v) && !v.startsWith("SLOTCNT") && !v.startsWith("TOTAL"));
  const fixed = base.has(`PM1->NEXT ${TARGET_DATE}`) && !nv.has(`PM1->NEXT ${TARGET_DATE}`);
  console.log(`  ${name}: ${fixed ? "위반해소" : "미해소"} / 새 위반(슬롯·총합 제외): ${added.length ? added.join(", ") : "없음"}`);
}

// 2) 일반 2칸 맞교환: 이혜빈(7/8 오전2) ↔ (다른 날, 아무 슬롯) 교사 B. 정지혜 제외.
//    전체 위반 순증(added - removedExtra) 이 작은 순으로 정렬.
console.log("\n== [맞교환] 이혜빈 7/8 오전2 ↔ (다른 날 아무 슬롯) — 정지혜 제외, 전체 개선 큰 순 ==");
const EXCLUDE = new Set(["이혜빈", "정지혜"]);
const results = [];
for (const d2 of dates) {
  if (d2 === TARGET_DATE) continue;
  for (const slot2 of SLOTS) {
    const B = byDate[d2][slot2];
    if (EXCLUDE.has(B)) continue;
    if (Object.values(byDate[d2]).includes("이혜빈")) continue;
    if (Object.values(byDate[TARGET_DATE]).includes(B)) continue;
    const trial = clone(byDate);
    trial[TARGET_DATE]["오전2"] = B;
    trial[d2][slot2] = "이혜빈";
    const nv = violations(trial);
    if (nv.has(`PM1->NEXT ${TARGET_DATE}`)) continue; // 7/8 미해소면 제외
    const added = [...nv].filter((v) => !base.has(v));
    const removed = [...base].filter((v) => !nv.has(v));
    results.push({ d2, slot2, B, net: added.length - removed.length, added, removed });
  }
}
results.sort((a, b) => a.net - b.net || a.added.length - b.added.length);
if (!results.length) console.log("  (해당 없음)");
for (const r of results.slice(0, 6)) {
  console.log(
    `  ${r.d2}(${wdOf(r.d2)}) ${r.slot2} ${r.B} ↔ 이혜빈 : 순증 ${r.net >= 0 ? "+" : ""}${r.net} ` +
      `(새 위반 ${r.added.length}, 해소 ${r.removed.length})`,
  );
  if (r.added.length) console.log(`      + ${r.added.join(", ")}`);
  if (r.removed.length) console.log(`      - ${r.removed.join(", ")}`);
}
