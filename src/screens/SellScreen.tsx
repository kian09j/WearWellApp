import { useParams } from 'react-router'
import { useItem } from '../data'
import { t } from '../i18n'
import { Flower } from '../ui/Flower'
import { TopBar, useBack } from '../ui/TopBar'

// Placeholder until the Vinted resale helper lands in step 7.
export function SellScreen() {
  const { id } = useParams()
  const item = useItem(id)
  const back = useBack(`/item/${id}`)
  return (
    <>
      <TopBar title={t('sell.title')} onBack={back} />
      <div className="mx-auto max-w-lg px-4 pb-10">
        <section className="rounded-[28px] bg-tint-maslo p-6">
          <Flower size={44} petal="var(--color-slonecznik)" inner="var(--color-card)" center="var(--color-mak)" />
          {item && <h2 className="mt-4 text-[1.6rem] leading-tight">{item.name}</h2>}
          <p className="mt-2 text-ink/80">{t('sell.comingSoon')}</p>
        </section>
      </div>
    </>
  )
}
