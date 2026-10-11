import { useEffect, useState } from 'react'
import type { DateKey } from '../domain/types'
import { today } from '../domain/dates'

/** Today's date that rolls over at midnight and when the app comes back to the foreground. */
export function useToday(): DateKey {
  const [day, setDay] = useState(today)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      const now = new Date()
      const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1)
      timer = setTimeout(() => {
        setDay(today())
        schedule()
      }, midnight.getTime() - now.getTime())
    }
    const onVisible = () => {
      if (document.visibilityState === 'visible') setDay(today())
    }
    schedule()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])
  return day
}
