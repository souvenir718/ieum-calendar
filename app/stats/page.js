import Link from "next/link";

import { getSupabaseServer } from "../../lib/supabase/server";
import { currentMonth, SLOT_ORDER } from "../../lib/calendar";

export const dynamic = "force-static";
export const revalidate = 60;

const SLOTS = Object.keys(SLOT_ORDER);

// duty_date "YYYY-MM-DD" → "YYYY-MM"
function monthKeyOf(dutyDate) {
  return dutyDate.slice(0, 7);
}

export default async function StatsPage() {
  const supabase = getSupabaseServer();
  const { data, error } = await supabase
    .from("duties")
    .select("duty_date, slot, staff:staff_id(name)")
    .order("duty_date");

  if (error) throw new Error(error.message);

  // stats: { monthKey: { staffName: { slot: count, total: count } } }
  const stats = {};
  const staffNames = new Set();

  for (const row of data ?? []) {
    const name = row.staff?.name;
    if (!name) continue;
    staffNames.add(name);
    const monthKey = monthKeyOf(row.duty_date);
    const month = (stats[monthKey] ||= {});
    const person = (month[name] ||= { total: 0 });
    person[row.slot] = (person[row.slot] || 0) + 1;
    person.total += 1;
  }

  const monthKeys = Object.keys(stats).sort().reverse();
  const sortedStaffNames = [...staffNames].sort((a, b) => a.localeCompare(b, "ko"));

  return (
    <div className="stats-page">
      <header className="stats-header">
        <h1>월별 당직 통계</h1>
        <Link href={`/${currentMonth()}`}>캘린더로 돌아가기</Link>
      </header>

      {monthKeys.length === 0 ? (
        <p>당직 데이터가 없습니다.</p>
      ) : (
        monthKeys.map((monthKey) => {
          const monthStats = stats[monthKey];
          return (
            <section className="stats-month" key={monthKey}>
              <h2>{monthKey}</h2>
              <table className="stats-table">
                <thead>
                  <tr>
                    <th>이름</th>
                    {SLOTS.map((slot) => (
                      <th key={slot}>{slot}</th>
                    ))}
                    <th>총합</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedStaffNames
                    .filter((name) => monthStats[name])
                    .map((name) => {
                      const person = monthStats[name];
                      return (
                        <tr key={name}>
                          <td>{name}</td>
                          {SLOTS.map((slot) => (
                            <td key={slot}>{person[slot] || 0}</td>
                          ))}
                          <td>{person.total}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
            </section>
          );
        })
      )}
    </div>
  );
}
