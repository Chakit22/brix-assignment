import { useEffect, useRef } from 'react';
import { formatSlotLabel } from '../lib/datetime';

type AssignConfirmModalProps = {
  open: boolean;
  quoteName: string;
  technicianName: string;
  day: Date;
  startHour: number;
  submitting: boolean;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
};

export function AssignConfirmModal({
  open,
  quoteName,
  technicianName,
  day,
  startHour,
  submitting,
  error,
  onConfirm,
  onCancel,
}: AssignConfirmModalProps) {
  const cancelRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const dayLabel = day.toLocaleDateString(undefined, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="assign-confirm-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        className="absolute inset-0 bg-bg-canvas/80 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      <div className="card relative z-10 w-full max-w-md p-6 shadow-glow">
        <div className="absolute -top-px left-6 right-6 h-px bg-gradient-to-r from-transparent via-accent-purple-400/70 to-transparent" />
        <p className="text-xs uppercase tracking-widest text-accent-purple-300 mb-1">
          Confirm assignment
        </p>
        <h2 id="assign-confirm-title" className="text-xl font-semibold text-ink leading-tight">
          Assign &ldquo;{quoteName}&rdquo;
        </h2>
        <p className="text-sm text-ink-muted mt-3">
          to <span className="text-ink font-medium">{technicianName}</span> on{' '}
          <span className="text-ink font-medium">{dayLabel}</span>{' '}
          <span className="font-mono text-ink">{formatSlotLabel(startHour)}</span>
        </p>

        {error ? (
          <div
            role="alert"
            className="mt-4 rounded-md border border-red-500/50 bg-red-500/10 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            ref={cancelRef}
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="btn-ghost"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="btn-primary"
          >
            {submitting ? 'Assigning…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
}
