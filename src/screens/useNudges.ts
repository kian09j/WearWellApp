import { useMemo } from 'react'
import { useItems, useSettings, useWears } from '../data'
import { findNudges, type Nudge } from '../domain/nudges'
import { makeUnwornContext } from '../domain/unworn'
import { buildWearIndex } from '../domain/wearStats'
import { useToday } from '../ui/useToday'

export interface NudgeState {
  /** Every current nudge, snoozed ones included (flagged), most pressing first. */
  all: Nudge[]
  byItem: ReadonlyMap<string, Nudge>
  stage1Days: number
}

/** Current nudges for the whole wardrobe; empty when nudges are switched off. */
export function useNudges(): NudgeState | undefined {
  const items = useItems()
  const wears = useWears()
  const settings = useSettings()
  const today = useToday()
  return useMemo(() => {
    if (!items || !wears || !settings) return undefined
    const all = settings.nudgesEnabled
      ? findNudges(items, buildWearIndex(wears, items), makeUnwornContext(today, wears, items), settings.nudgeDays, { includeSnoozed: true })
      : []
    return { all, byItem: new Map(all.map((n) => [n.item.id, n])), stage1Days: settings.nudgeDays.stage1 }
  }, [items, wears, settings, today])
}
