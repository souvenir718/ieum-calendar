"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { EVENT_TYPE_ICON, EVENT_TYPES } from "../../lib/events";

function formatDateRange(start, end) {
  if (!end || end === start) return start;
  return `${start} ~ ${end}`;
}

// initial: { id?, type, title, start_date, end_date }
export default function EventModal({ initial, onClose, onDeleted, onSaved }) {
  const router = useRouter();
  const [form, setForm] = useState(initial);
  const [mode, setMode] = useState(initial.id ? "view" : "edit");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const isEdit = Boolean(form.id);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      type: form.type,
      title: form.title,
      start_date: form.start_date,
      end_date: form.end_date || form.start_date,
    };
    const url = isEdit ? `/api/events/${form.id}` : "/api/events";
    try {
      const res = await fetch(url, {
        method: isEdit ? "PUT" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "저장에 실패했습니다.");
        setBusy(false);
        return;
      }
      if (data.event) {
        onSaved?.(data.event);
      }
      onClose();
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!confirm(`"${form.title}" 일정을 삭제할까요?`)) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/events/${form.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "삭제에 실패했습니다.");
        setBusy(false);
        return;
      }
      onDeleted?.(form.id);
      onClose();
      router.refresh();
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  };

  if (mode === "view") {
    return (
      <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
        <div className="modal event-detail-modal" onClick={(e) => e.stopPropagation()}>
          <h4>일정 상세</h4>

          <div className="event-detail-type">
            <span aria-hidden="true">{EVENT_TYPE_ICON[form.type] || "📌"}</span>
            <span>{form.type}</span>
          </div>
          <p className="event-detail-title">{form.title}</p>
          <p className="event-detail-dates">{formatDateRange(form.start_date, form.end_date)}</p>

          {error ? <p className="modal-error">{error}</p> : null}

          <div className="modal-actions">
            <button type="button" className="danger" onClick={remove} disabled={busy}>
              삭제
            </button>
            <span className="modal-actions-spacer" />
            <button type="button" onClick={onClose} disabled={busy}>
              닫기
            </button>
            <button type="button" className="primary" onClick={() => setMode("edit")}>
              편집
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <h4>{isEdit ? "일정 수정" : "일정 추가"}</h4>

        <div className="field">
          <span>종류</span>
          <div className="event-type-picker" role="radiogroup" aria-label="일정 종류">
            {EVENT_TYPES.map((t) => (
              <button
                className={`event-type-option${form.type === t ? " is-active" : ""}`}
                type="button"
                role="radio"
                aria-checked={form.type === t}
                key={t}
                onClick={() => setForm({ ...form, type: t })}
              >
                <span aria-hidden="true">{EVENT_TYPE_ICON[t] || "📌"}</span>
                <span>{t}</span>
              </button>
            ))}
          </div>
        </div>

        <label className="field">
          <span>제목</span>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="예: 여름 물놀이, 추석 행사"
            autoFocus
            required
          />
        </label>

        <div className="field-row">
          <label className="field">
            <span>시작일</span>
            <input
              type="date"
              value={form.start_date}
              onChange={(e) => {
                const start_date = e.target.value;
                setForm((f) => ({
                  ...f,
                  start_date,
                  end_date: !f.end_date || f.end_date < start_date ? start_date : f.end_date,
                }));
              }}
              required
            />
          </label>
          <label className="field">
            <span>종료일</span>
            <input
              type="date"
              value={form.end_date}
              min={form.start_date}
              onChange={(e) => setForm({ ...form, end_date: e.target.value })}
            />
          </label>
        </div>

        {error ? <p className="modal-error">{error}</p> : null}

        <div className="modal-actions">
          {isEdit ? (
            <button type="button" className="danger" onClick={remove} disabled={busy}>
              삭제
            </button>
          ) : null}
          <span className="modal-actions-spacer" />
          <button
            type="button"
            onClick={() => (isEdit ? setMode("view") : onClose())}
            disabled={busy}
          >
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
