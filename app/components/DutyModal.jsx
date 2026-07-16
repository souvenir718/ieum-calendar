"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { EDITABLE_SLOTS } from "../../lib/duties";
import { dutySlots } from "../../lib/print-config";

const SLOT_TIME = Object.fromEntries(dutySlots.map((s) => [s.name, s.time]));

// day: { key, day, weekday, assignments: [[slot, name], ...] }
// staffList: [{ id, name }] — 담당자 선택지 (이름 unique)
export default function DutyModal({ day, staffList, onClose, onSaved }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  // 이름 → id 매핑 (staff.name은 unique). 현재 배정 이름으로 초기 선택값 구성.
  const nameToId = useMemo(
    () => Object.fromEntries(staffList.map((s) => [s.name, s.id])),
    [staffList],
  );
  const initialForm = useMemo(() => {
    const currentBySlot = Object.fromEntries(day.assignments || []);
    const form = {};
    for (const slot of EDITABLE_SLOTS) {
      const name = currentBySlot[slot] || "";
      form[slot] = name ? nameToId[name] || "" : "";
    }
    return form;
  }, [day, nameToId]);

  const [form, setForm] = useState(initialForm);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const assignments = {};
    for (const slot of EDITABLE_SLOTS) {
      assignments[slot] = form[slot] || null;
    }
    try {
      const res = await fetch("/api/duties", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ date: day.key, assignments }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        setBusy(false);
        return;
      }
      onSaved?.(data.date, data.assignments);
      onClose();
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h4>
          {day.day}일 ({day.weekday}) 당직 편집
        </h4>

        {EDITABLE_SLOTS.map((slot) => (
          <label className="field" key={slot}>
            <span>
              {slot}
              {SLOT_TIME[slot] ? <em className="duty-slot-time"> {SLOT_TIME[slot]}</em> : null}
            </span>
            <select
              value={form[slot]}
              onChange={(e) => setForm((f) => ({ ...f, [slot]: e.target.value }))}
            >
              <option value="">— 배정 없음 —</option>
              {staffList.map((s) => (
                <option value={s.id} key={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ))}

        {error ? <p className="modal-error">{error}</p> : null}

        <div className="modal-actions">
          <span className="modal-actions-spacer" />
          <button type="button" onClick={onClose} disabled={busy}>
            취소
          </button>
          <button type="submit" className="primary" disabled={busy}>
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </div>
  );
}
