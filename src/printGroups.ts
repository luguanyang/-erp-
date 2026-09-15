export interface PrintGroupOption {
  value: string
  label: string
  color: string
}

export const PRINT_GROUPS: PrintGroupOption[] = [
  { value: 'kitchen', label: '厨房', color: 'orange' },
  { value: 'warehouse', label: '仓库', color: 'blue' },
]

export function getPrintGroupName(id?: string) {
  const group = PRINT_GROUPS.find((g) => g.value === id)
  return group ? group.label : ''
}

export function getPrintGroupNames(ids: string[] = []) {
  return ids.map((id) => getPrintGroupName(id)).filter(Boolean)
}
