import { useState } from 'react'
import type { NudgeThresholds, Settings } from '../domain/types'
import { updateSettings } from '../data'
import { THRESHOLD_MAX, THRESHOLD_MIN, validThresholds } from '../domain/nudges'
import { t, type TKey } from '../i18n'
import { Button } from '../ui/Button'
import { useToast } from '../ui/Toast'

const STAGES: { key: keyof NudgeThresholds; label: TKey }[] = [
  { key: 'stage1', label: 'settings.stage1' },
  { key: 'stage2', label: 'settings.stage2' },
  { key: 'stage3', label: 'settings.stage3' },
]

/** On/off plus the three stage thresholds, saved together once they make sense. */
export function NudgeSettings({ settings }: { settings: Settings }) {
  const [days, setDays] = useState<Record<keyof NudgeThresholds, string>>({
    stage1: String(settings.nudgeDays.stage1),
    stage2: String(settings.nudgeDays.stage2),
    stage3: String(settings.nudgeDays.stage3),
  })
  const [error, setError] = useState(false)
  const toast = useToast()

  const parsed: NudgeThresholds = { stage1: Number(days.stage1), stage2: Number(days.stage2), stage3: Number(days.stage3) }
  const changed = STAGES.some(({ key }) => parsed[key] !== settings.nudgeDays[key])

  const save = async () => {
    if (!validThresholds(parsed)) {
      setError(true)
      return
    }
    setError(false)
    await updateSettings({ nudgeDays: parsed })
    toast(t('settings.nudgesSaved'))
  }

  return (
    <div>
      <label className="flex cursor-pointer items-start gap-3 border-b border-thread px-5 py-4">
        <input
          type="checkbox"
          checked={settings.nudgesEnabled}
          onChange={(e) => void updateSettings({ nudgesEnabled: e.target.checked })}
          className="mt-0.5 h-6 w-6 shrink-0 accent-mak"
        />
        <span>
          <span className="block font-semibold">{t('settings.nudgesEnable')}</span>
          <span className="block text-[13.5px] text-muted">{t('settings.nudgesHint')}</span>
        </span>
      </label>

      {settings.nudgesEnabled && (
        <form
          className="px-5 py-4"
          onSubmit={(e) => {
            e.preventDefault()
            void save()
          }}
          noValidate
        >
          <div className="flex flex-col gap-3">
            {STAGES.map(({ key, label }, i) => (
              <label key={key} className="flex items-center justify-between gap-3">
                <span className="flex items-center gap-2.5 text-[15px]">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sand text-[12px] font-bold" aria-hidden="true">
                    {i + 1}
                  </span>
                  {t(label)}
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={THRESHOLD_MIN}
                    max={THRESHOLD_MAX}
                    value={days[key]}
                    onChange={(e) => setDays((d) => ({ ...d, [key]: e.target.value }))}
                    aria-describedby="nudge-unit"
                    aria-invalid={error || undefined}
                    className="min-h-11 w-[4.5rem] rounded-xl border-[1.5px] border-ink/15 bg-paper px-2 text-center text-[16px] tabular-nums focus:border-mak focus:outline-none aria-[invalid=true]:border-mak"
                  />
                </span>
              </label>
            ))}
          </div>
          <p id="nudge-unit" className="mt-2 text-right text-[13px] text-muted">
            {t('settings.daysUnit')}
          </p>
          {error && (
            <p className="mt-2 text-[13.5px] font-semibold text-mak" role="alert">
              {t('settings.nudgesInvalid')}
            </p>
          )}
          {changed && (
            <Button type="submit" variant="ink" className="mt-3 min-h-11">
              {t('settings.nudgesSave')}
            </Button>
          )}
        </form>
      )}
    </div>
  )
}
