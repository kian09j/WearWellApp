import { t } from '../i18n'
import { Flower } from '../ui/Flower'
import { Screen } from '../ui/Screen'

export function StatsScreen() {
  return (
    <Screen title={t('stats.title')}>
      <section className="rounded-[28px] bg-tint-niebo p-6">
        <Flower size={44} petal="var(--color-chaber)" inner="var(--color-card)" />
        <p className="mt-4 text-ink/80">{t('stats.teaser')}</p>
        <p className="mt-5">
          <span className="hang-tag">{t('common.comingSoon')}</span>
        </p>
      </section>
    </Screen>
  )
}
