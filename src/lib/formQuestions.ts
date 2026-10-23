import type { AnswerSnapshot, BudsAnswerGroup, FormInputType } from '../types/questionnaire'

export const ISR_BUDS_CATEGORY = 'isr_buds'

const CATEGORY_LABELS: Record<string, string> = {
  medical: 'Medical',
  emergency: 'Emergency',
  release: 'Photo release',
  legal: 'Liability',
  [ISR_BUDS_CATEGORY]: 'ISR Daily BUDS Interview for RET Protocols',
}

const CATEGORY_ORDER = ['medical', 'emergency', 'release', 'legal', ISR_BUDS_CATEGORY]

const INPUT_LABELS: Record<FormInputType, string> = {
  text: 'Short text',
  textarea: 'Long text',
  yes_no: 'Yes / No',
  select: 'Dropdown',
}

/** Sections of the ISR Daily BUDS interview, keyed by question_bank.bank_order. */
const BUDS_SECTIONS: Array<{ id: string; label: string; from: number; to: number }> = [
  { id: 'bowel_urine', label: 'Bowel & urine', from: 1, to: 4 },
  { id: 'diet', label: 'Diet', from: 5, to: 6 },
  { id: 'sleep', label: 'Sleep', from: 7, to: 9 },
  { id: 'health', label: 'Illness & injury', from: 10, to: 16 },
  { id: 'notes', label: 'Notes', from: 17, to: 18 },
  { id: 'fitness', label: 'Fitness for attendance', from: 19, to: 23 },
]

export const DEFAULT_QUESTION_CATEGORIES = CATEGORY_ORDER

export function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category] ?? category
}

export function inputTypeLabel(inputType: FormInputType): string {
  return INPUT_LABELS[inputType]
}

/** Display text for a frozen answer; empty string when the parent left it blank. */
export function formatAnswer(inputType: string, answer: string): string {
  const trimmed = answer.trim()
  if (!trimmed) return ''
  if (inputType === 'yes_no') {
    if (trimmed === 'yes') return 'Yes'
    if (trimmed === 'no') return 'No'
  }
  return trimmed
}

/** Groups frozen BUDS answers by section, matching each question by its bank text. */
export function groupBudsAnswers(
  answers: AnswerSnapshot[],
  bankOrderByText: Map<string, number>,
): BudsAnswerGroup[] {
  const groups: BudsAnswerGroup[] = BUDS_SECTIONS.map((section) => ({
    sectionId: section.id,
    label: section.label,
    answers: [],
  }))
  const other: BudsAnswerGroup = { sectionId: 'other', label: 'Other questions', answers: [] }

  for (const answer of answers) {
    const order = bankOrderByText.get(answer.question_text)
    const index =
      order === undefined ? -1 : BUDS_SECTIONS.findIndex((section) => order >= section.from && order <= section.to)
    const target = index === -1 ? other : (groups[index] ?? other)
    target.answers.push(answer)
  }

  return [...groups, other].filter((group) => group.answers.length > 0)
}

export function compareBankQuestions(
  a: { category: string; bankOrder: number | null; questionText: string },
  b: { category: string; bankOrder: number | null; questionText: string },
): number {
  const byCategory = compareCategories(a.category, b.category)
  if (byCategory !== 0) return byCategory
  if (a.bankOrder !== null || b.bankOrder !== null) {
    if (a.bankOrder === null) return 1
    if (b.bankOrder === null) return -1
    if (a.bankOrder !== b.bankOrder) return a.bankOrder - b.bankOrder
  }
  return a.questionText.localeCompare(b.questionText)
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
