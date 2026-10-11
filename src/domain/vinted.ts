// Vinted has no public listing API, so WearWell never talks to Vinted. It writes the listing
// text for you to copy and opens the "sell" page of your country's Vinted site.

export interface VintedCountry {
  code: string
  domain: string
}

export const VINTED_COUNTRIES: readonly VintedCountry[] = [
  { code: 'pl', domain: 'vinted.pl' },
  { code: 'cz', domain: 'vinted.cz' },
  { code: 'sk', domain: 'vinted.sk' },
  { code: 'lt', domain: 'vinted.lt' },
  { code: 'lv', domain: 'vinted.lv' },
  { code: 'ee', domain: 'vinted.ee' },
  { code: 'de', domain: 'vinted.de' },
  { code: 'at', domain: 'vinted.at' },
  { code: 'fr', domain: 'vinted.fr' },
  { code: 'be', domain: 'vinted.be' },
  { code: 'nl', domain: 'vinted.nl' },
  { code: 'lu', domain: 'vinted.lu' },
  { code: 'es', domain: 'vinted.es' },
  { code: 'pt', domain: 'vinted.pt' },
  { code: 'it', domain: 'vinted.it' },
  { code: 'uk', domain: 'vinted.co.uk' },
  { code: 'ie', domain: 'vinted.ie' },
  { code: 'hu', domain: 'vinted.hu' },
  { code: 'ro', domain: 'vinted.ro' },
  { code: 'hr', domain: 'vinted.hr' },
  { code: 'fi', domain: 'vinted.fi' },
  { code: 'dk', domain: 'vinted.dk' },
  { code: 'se', domain: 'vinted.se' },
  { code: 'gr', domain: 'vinted.gr' },
]

/** The page where a new listing starts; opens the Vinted app instead when it is installed. */
export function vintedSellUrl(countryCode: string): string {
  const country = VINTED_COUNTRIES.find((c) => c.code === countryCode) ?? VINTED_COUNTRIES[0]!
  return `https://www.${country.domain}/items/new`
}
