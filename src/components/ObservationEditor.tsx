import type { Observation, RiskLevel } from '@/types';
import { RISK_META, computeFr } from '@/lib/fr';
import { cn } from '@/lib/cn';

interface ObservationRowProps {
  observation: Observation;
  sampleCount: number;
  onChange: (patch: Partial<Observation>) => void;
  onRemove: () => void;
}

const RISK_ORDER: RiskLevel[] = ['good', 'low', 'fail'];

export function ObservationRow({
  observation,
  sampleCount,
  onChange,
  onRemove,
}: ObservationRowProps) {
  const meta = RISK_META[observation.risk];
  const isFail = observation.risk === 'fail';
  const fr = computeFr(observation.failedSamples, sampleCount);
  const waived = observation.status === 'waived';

  return (
    <div
      className={cn(
        'rounded-xl border-l-4 bg-white p-3 shadow-card transition',
        waived ? 'border-l-ink-300 opacity-70' : meta.border,
        'border-y border-r border-ink-200',
      )}
    >
      <div className="flex items-start gap-3">
        {/* Risk selector */}
        <div className="flex shrink-0 rounded-lg border border-ink-200 p-0.5">
          {RISK_ORDER.map((r) => {
            const rm = RISK_META[r];
            const active = observation.risk === r;
            return (
              <button
                key={r}
                type="button"
                title={rm.label}
                onClick={() =>
                  onChange({
                    risk: r,
                    failedSamples:
                      r === 'fail' && observation.failedSamples === 0
                        ? 1
                        : r !== 'fail'
                          ? 0
                          : observation.failedSamples,
                  })
                }
                className={cn(
                  'flex h-7 w-7 items-center justify-center rounded-md transition',
                  active ? rm.chip : 'hover:bg-ink-50',
                )}
              >
                <span className={cn('h-3 w-3 rounded-full', rm.dot)} />
              </button>
            );
          })}
        </div>

        {/* Text */}
        <textarea
          value={observation.text}
          onChange={(e) => onChange({ text: e.target.value })}
          placeholder={
            isFail
              ? 'Describe the failure observed…'
              : observation.risk === 'low'
                ? 'Describe the low-risk issue…'
                : 'Note what looks good / was verified…'
          }
          rows={2}
          className="input min-h-[2.75rem] flex-1 resize-y"
        />

        {/* Remove */}
        <button
          type="button"
          aria-label="Remove observation"
          onClick={onRemove}
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-risk-failSoft hover:text-risk-fail"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Failure detail row */}
      {isFail && !waived && (
        <div className="mt-3 grid gap-2 pl-[3.25rem] sm:grid-cols-[auto_1fr_1fr_auto]">
          <label className="flex items-center gap-2 text-xs font-semibold text-ink-600">
            Failed (F)
            <input
              type="number"
              min={0}
              max={sampleCount}
              value={observation.failedSamples}
              onChange={(e) =>
                onChange({ failedSamples: Number(e.target.value) })
              }
              className="input w-16 px-2 py-1.5 text-center"
            />
            <span className="whitespace-nowrap rounded-md bg-risk-failSoft px-2 py-1 font-mono text-risk-fail">
              FR {fr.label} · {fr.percent}
            </span>
          </label>
          <input
            value={observation.failureMode ?? ''}
            onChange={(e) => onChange({ failureMode: e.target.value })}
            placeholder="Failure mode"
            className="input px-2.5 py-1.5 text-xs"
          />
          <input
            value={observation.nextSteps ?? ''}
            onChange={(e) => onChange({ nextSteps: e.target.value })}
            placeholder="Next steps / comment"
            className="input px-2.5 py-1.5 text-xs"
          />
          <input
            value={observation.dri ?? ''}
            onChange={(e) => onChange({ dri: e.target.value })}
            placeholder="DRI"
            className="input w-24 px-2.5 py-1.5 text-xs"
          />
        </div>
      )}

      {/* Waive toggle for issues */}
      {observation.risk !== 'good' && (
        <div className="mt-2 flex justify-end pl-[3.25rem]">
          <label className="flex cursor-pointer items-center gap-1.5 text-xs font-medium text-ink-500">
            <input
              type="checkbox"
              checked={waived}
              onChange={(e) =>
                onChange({ status: e.target.checked ? 'waived' : 'normal' })
              }
              className="h-3.5 w-3.5 rounded border-ink-300 text-brand-600 focus:ring-brand-500"
            />
            Waived
          </label>
        </div>
      )}
    </div>
  );
}
