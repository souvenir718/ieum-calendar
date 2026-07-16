"use client";

import { useState } from "react";

// 당직 편집 잠금/해제 컨트롤.
// 잠금 해제는 숨겨진 제스처(부모의 '당직표' 탭 롱프레스)로 PIN 모달을 연다 → prompting/onPromptingChange 제어형.
// editable=true일 때만 "잠금" 버튼이 보이고, 잠금 상태에서는 화면에 아무 버튼도 노출하지 않는다.
export default function LockControl({
  editable,
  onEditableChange,
  prompting,
  onPromptingChange,
}) {
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const closePrompt = () => {
    onPromptingChange(false);
    setPin("");
    setError("");
  };

  const unlock = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/edit-session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "잠금 해제에 실패했습니다.");
        setBusy(false);
        return;
      }
      onEditableChange(true);
      closePrompt();
      setBusy(false);
    } catch {
      setError("네트워크 오류가 발생했습니다.");
      setBusy(false);
    }
  };

  const lock = async () => {
    setBusy(true);
    try {
      await fetch("/api/edit-session", { method: "DELETE" });
    } catch {
      // 잠금 실패는 조용히 무시 (쿠키 만료 시 서버가 재차단)
    }
    onEditableChange(false);
    setBusy(false);
  };

  return (
    <>
      {editable ? (
        <button
          className="lock-button is-unlocked"
          type="button"
          onClick={lock}
          disabled={busy}
          title="당직 편집 중 — 클릭하면 잠급니다"
        >
          🔓 편집 중 (잠금)
        </button>
      ) : null}

      {prompting ? (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={closePrompt}>
          <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={unlock}>
            <h4>당직 편집 잠금 해제</h4>
            <label className="field">
              <span>PIN 번호</span>
              <input
                type="password"
                inputMode="numeric"
                autoComplete="off"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="관리자 PIN"
                autoFocus
                required
              />
            </label>

            {error ? <p className="modal-error">{error}</p> : null}

            <div className="modal-actions">
              <span className="modal-actions-spacer" />
              <button type="button" onClick={closePrompt} disabled={busy}>
                취소
              </button>
              <button type="submit" className="primary" disabled={busy || !pin}>
                {busy ? "확인 중…" : "잠금 해제"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
