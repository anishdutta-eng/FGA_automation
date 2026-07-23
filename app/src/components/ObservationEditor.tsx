import type { Observation, RiskSeverity } from '@/types';
import { RISK_META, observationFr, colorOf } from '@/lib/fr';
import { NumberField } from './NumberField';
import { cn } from '@/lib/cn';

interface ObservationRowProps {
  observation: Observation;
  /** Effective trials (T) for this phase. */
  units: number;
  /** Calculated maximum trials — the ceiling the inspector can set T to. */
  maxUnits: number;
  onChange: (patch: Partial<Observation>) => void;
  /** Change the phase-level trials (T). */
  onChangeTrials: (trials: number) => void;
  onRemove: () => void;
}

const SEVERITIES: RiskSeverity[] = ['good', 'low', 'medium', 'high'];

export function ObservationRow({
  observation,
  units,
  maxUnits,
  onChange,
  onChangeTrials,
  onRemove,
}: ObservationRowProps) {
  const color = colorOf(observation);
  const meta = RISK_META[color];
  const isGood = observation.risk === 'good';
  const fr = observationFr(observation, units);
  const waived = observation.status === 'waived';
  const discuss = observation.status === 'discuss';

  const toggleStatus = (status: 'waived' | 'discuss') =>
    onChange({ status: observation.status === status ? 'normal' : status });

  return (
    <div
      className={cn(
        'rounded-xl border-l-4 border-y border-r border-ink-200 bg-white p-3 shadow-card transition',
        meta.border,
      )}
    >
      <div className="flex items-start gap-3">
        {/* Severity selector */}
        <div className="flex shrink-0 rounded-lg border border-ink-200 p-0.5">
          {SEVERITIES.map((r) => {
            const rm = RISK_META[r];
            const active = observation.risk === r && !waived && !discuss;
            return (
              <button
                key={r}
                type="button"
                title={rm.label}
                onClick={() =>
                  onChange({
                    risk: r,
                    status: 'normal',
                    affectedSamples:
                      r === 'good'
                        ? 0
                        : observation.affectedSamples === 0
                          ? 1
                          : observation.affectedSamples,
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
            isGood ? 'Note what was verified…' : 'Describe the issue observed…'
          }
          rows={2}
          className="input min-h-[2.75rem] flex-1 resize-y"
        />

        {/* Remove */}
        <button
          type="button"
          aria-label="Remove observation"
          onClick={onRemove}
          className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition hover:bg-risk-highSoft hover:text-risk-high"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
          </svg>
        </button>
      </div>

      {/* Controls row: inline editable Failure Rate */}
      <div className="mt-3 flex flex-wrap items-center gap-2 pl-[3.25rem]">
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold',
            meta.chip,
          )}
        >
          <span className="uppercase tracking-wide">FR</span>
          <NumberField
            value={observation.affectedSamples}
            min={0}
            max={units}
            disabled={isGood}
            onCommit={(n) => onChange({ affectedSamples: n })}
            ariaLabel="Failed samples"
            title={
              isGood
                ? 'Good observations have 0 failures'
                : 'Number of samples that showed this behavior'
            }
            className="w-11 rounded-md border border-white/60 bg-white/80 px-1 py-0.5 text-center font-mono text-ink-900 outline-none focus:border-current disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span className="opacity-70">/</span>
          <NumberField
            value={units}
            min={1}
            onCommit={onChangeTrials}
            ariaLabel="Trials"
            title={`Trials inspected for this phase (shared across its observations). Default ${maxUnits}; raise or lower as needed.`}
            className="w-11 rounded-md border border-white/60 bg-white/80 px-1 py-0.5 text-center font-mono text-ink-900 outline-none focus:border-current"
          />
          <span className="opacity-90">· {fr.percent}</span>
        </div>

        <div className="flex-1" />

        {/* Status toggles */}
        <button
          type="button"
          onClick={() => toggleStatus('waived')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition',
            waived
              ? 'bg-risk-waivedSoft text-risk-waived'
              : 'border border-ink-200 text-ink-500 hover:bg-ink-50',
          )}
        >
          Waived
        </button>
        <button
          type="button"
          onClick={() => toggleStatus('discuss')}
          className={cn(
            'rounded-md px-2.5 py-1 text-xs font-semibold transition',
            discuss
              ? 'bg-risk-discussSoft text-risk-discuss'
              : 'border border-ink-200 text-ink-500 hover:bg-ink-50',
          )}
        >
          Discuss
        </button>
      </div>

      {/* Failure detail inputs for issues */}
      {!isGood && (
        <div className="mt-2 grid gap-2 pl-[3.25rem] sm:grid-cols-[1fr_1fr_auto]">
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
    </div>
  );
}
