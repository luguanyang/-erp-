import { pinyin } from 'pinyin-pro'

const pinyinInitialsCache = new Map<string, string>()

export function getPinyinInitials(text: string) {
  const normalizedText = String(text || '')
    .trim()
    .toLowerCase()
  if (!normalizedText) return ''

  const cached = pinyinInitialsCache.get(normalizedText)
  if (cached !== undefined) return cached

  const initials = pinyin(normalizedText, {
    pattern: 'first',
    toneType: 'none',
    type: 'array',
  })
    .join('')
    .replace(/[^\p{L}\p{N}]/gu, '')
    .toUpperCase()

  pinyinInitialsCache.set(normalizedText, initials)
  return initials
}

export function matchesProductText(keyword: string, label: unknown) {
  const normalizedKeyword = String(keyword || '')
    .trim()
    .toLowerCase()
  if (!normalizedKeyword) return true

  const text = String(label || '').toLowerCase()
  return (
    text.includes(normalizedKeyword) ||
    getPinyinInitials(text).toLowerCase().includes(normalizedKeyword)
  )
}
