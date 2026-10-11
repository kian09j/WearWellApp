import { t } from '../i18n'
import { Flower } from '../ui/Flower'
import { Screen } from '../ui/Screen'

export function BeforeYouBuyScreen() {
  return (
    <Screen title={t('beforeYouBuy.title')}>
      <section className="rounded-[28px] bg-tint-maslo p-6">
        <Flower size={44} petal="var(--color-slonecznik)" inner="var(--color-card)" center="var(--color-mak)" />
        <p className="mt-4 text-ink/80">{t('beforeYouBuy.teaser')}</p>
        <p className="mt-5">
          <span className="hang-tag">{t('common.comingSoon')}</span>
        </p>
      </section>
    </Screen>
  )
}
