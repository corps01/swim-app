import type { FormInputType } from '../types/questionnaire'

const CATEGORY_LABELS: Record<string, string> = {
  medical: 'Medical',
  emergency: 'Emergency',
  release: 'Photo release',
  legal: 'Liability',
}

const CATEGORY_ORDER = ['medical', 'emergency', 'release', 'legal']

const INPUT_LABELS: Record<FormInputType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  yes_no: 'Yes / No',
  select: 'Dropdown',
}

export const DEFAULT_QUESTION_CATEGORIES = CATEGORY_ORDER

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export function inputTypeLabel(inputType: FormInputType): string {
  return INPUT_LABELS[inputType]
}

export function compareCategories(a: string, b: string): number {
  const aIndex = CATEGORY_ORDER.indexOf(a)
  const bIndex = CATEGORY_ORDER.indexOf(b)
  if (aIndex !== -1 || bIndex !== -1) {
    if (aIndex === -1) return 1
    if (bIndex === -1) return -1
    return aIndex - bIndex
  }
  return a.localeCompare(b)
}
