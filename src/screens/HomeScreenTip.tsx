import { Share } from 'lucide-react'
import { updateSettings } from '../data'
import { t } from '../i18n'
import { Button } from '../ui/Button'
import { useSaveBackup } from './useSaveBackup'

/**
 * For iPhone and iPad in Safari: Safari may clear a website's data after a while without a
 * visit, while a Home Screen app keeps it. The Home Screen app has its own storage, so someone
 * who already has pieces is shown how to take them along with a backup. Shown until closed.
 */
export function HomeScreenTip({ hasOwnPieces }: { hasOwnPieces: boolean }) {
  const saveBackup = useSaveBackup()
  return (
    <section className="rounded-[24px] bg-tint-niebo p-4" aria-labelledby="home-screen-tip">
      <div className="flex gap-4">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card text-ink/70" aria-hidden="true">
          <Share size={22} />
        </span>
        <div className="min-w-0">
          <p className="label-caps">{t('homeScreenTip.eyebrow')}</p>
          <h2 id="home-screen-tip" className="mt-0.5 text-[1.25rem] leading-tight">
            {t('homeScreenTip.title')}
          </h2>
          <p className="mt-1 text-[14px] leading-snug text-ink/75">{t('homeScreenTip.body')}</p>
          {hasOwnPieces && <p className="mt-2 text-[14px] leading-snug text-ink/75">{t('homeScreenTip.moveBody')}</p>}
          <p className="mt-2 text-[14px] leading-snug font-semibold">{t('homeScreenTip.steps')}</p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
        {hasOwnPieces && (
          <Button className="min-h-11 flex-1 px-4" onClick={() => void saveBackup()}>
            {t('homeScreenTip.saveBackup')}
          </Button>
        )}
        <Button variant="ghost" className="min-h-11 px-5" onClick={() => void updateSettings({ homeScreenTipDismissed: true })}>
          {t('homeScreenTip.gotIt')}
        </Button>
      </div>
    </section>
  )
}
