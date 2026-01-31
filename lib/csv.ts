export function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let field = ""
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i]
    const next = text[i + 1]

    if (inQuotes) {
      if (ch === `"` && next === `"`) {
        field += `"`
        i += 1
      } else if (ch === `"`) {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }

    if (ch === `"`) {
      inQuotes = true
      continue
    }

    if (ch === ",") {
      row.push(field)
      field = ""
      continue
    }

    if (ch === "\r" && next === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      i += 1
      continue
    }

    if (ch === "\n") {
      row.push(field)
      rows.push(row)
      row = []
      field = ""
      continue
    }

    field += ch
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

export function toCsv(rows: Array<Array<string | number | null | undefined>>) {
  const escape = (value: string) => {
    if (value.includes(`"`) || value.includes(",") || value.includes("\n")) {
      return `"${value.replace(/"/g, `""`)}"`
    }
    return value
  }

  return rows
    .map((row) =>
      row
        .map((cell) => escape(String(cell ?? "")))
        .join(",")
    )
    .join("\n")
}
