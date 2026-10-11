// A small, forgiving CSV reader: quoted fields, "" escapes, line breaks inside quotes, CR / LF /
// CRLF endings, a byte-order mark, and comma, semicolon or tab separators (Polish Excel uses
// semicolons). Files saved by Polish Excel are often Windows-1250 rather than UTF-8.

export type Delimiter = ',' | ';' | '\t'

/** Read file bytes as UTF-8, falling back to Windows-1250 when the bytes are not valid UTF-8. */
export function decodeCsvBytes(bytes: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return new TextDecoder('windows-1250').decode(bytes)
  }
}

/** The separator that splits the first line into the most columns. */
export function detectDelimiter(text: string): Delimiter {
  const counts: Record<Delimiter, number> = { ',': 0, ';': 0, '\t': 0 }
  let inQuotes = false
  for (const ch of text.replace(/^﻿/, '')) {
    if (ch === '"') inQuotes = !inQuotes
    else if (!inQuotes && (ch === '\n' || ch === '\r')) break
    else if (!inQuotes && ch in counts) counts[ch as Delimiter]++
  }
  return (Object.keys(counts) as Delimiter[]).reduce((best, d) => (counts[d] > counts[best] ? d : best), ',')
}

export function parseCsv(text: string, delimiter: Delimiter = detectDelimiter(text)): string[][] {
  const src = text.replace(/^﻿/, '')
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  let i = 0

  const endField = () => {
    row.push(field)
    field = ''
  }
  const endRow = () => {
    endField()
    rows.push(row)
    row = []
  }

  while (i < src.length) {
    const ch = src[i]!
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i += 2
          continue
        }
        inQuotes = false
      } else {
        field += ch
      }
      i++
      continue
    }
    if (ch === '"' && field === '') inQuotes = true
    else if (ch === delimiter) endField()
    else if (ch === '\r') {
      endRow()
      if (src[i + 1] === '\n') i++
    } else if (ch === '\n') endRow()
    else field += ch
    i++
  }
  if (field !== '' || row.length > 0) endRow()

  // drop rows that are entirely empty (blank lines, trailing newline)
  return rows.filter((r) => r.some((cell) => cell.trim() !== ''))
}
