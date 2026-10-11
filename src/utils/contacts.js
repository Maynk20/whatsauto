export const PALETTE = ['#25D366', '#1E3A8A', '#7C3AED', '#DC2626', '#D97706', '#1F2937']

export function parseManualContacts(rawInput) {
  return rawInput
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [phonePart, ...nameParts] = line.split(',')
      const phoneNumber = normalizePhone(phonePart)
      return {
        id: `${Date.now()}-${index}-${phoneNumber}`,
        phone_number: phoneNumber,
        recipient_name: nameParts.join(',').trim() || null,
      }
    })
    .filter((row) => row.phone_number)
}

export function normalizePhone(value = '') {
  return value.replace(/[^\d+]/g, '')
}

export function parseRowsToContacts(rows = []) {
  return rows
    .map((row, index) => {
      const phoneCandidate = String(row.phone ?? row.phone_number ?? row.Phone ?? row[0] ?? '').trim()
      const nameCandidate = String(row.name ?? row.recipient_name ?? row.Name ?? row[1] ?? '').trim()
      const phone = normalizePhone(phoneCandidate)

      if (!phone) {
        return null
      }

      return {
        id: `${Date.now()}-upload-${index}-${phone}`,
        phone_number: phone,
        recipient_name: nameCandidate || null,
      }
    })
    .filter(Boolean)
}

export function fillMessageTemplate(template, contact) {
  const dateText = new Date().toLocaleDateString()
  return template
    .replaceAll('{name}', contact.recipient_name || 'there')
    .replaceAll('{date}', dateText)
}

export function toDatetimeLocal(inputDate) {
  const date = inputDate instanceof Date ? inputDate : new Date(inputDate)
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60000)
  return local.toISOString().slice(0, 16)
}
