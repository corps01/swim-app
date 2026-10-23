import type { AnswerSnapshot, FormTemplateQuestion } from '../types/questionnaire'
import { formatCalendarDateKey } from './timeZone/calendar'
import { formatZonedTime, zonedWallTimeToUtc } from './timeZone/zonedTime'

/** Minutes that must elapse between the last meal and the start of class. */
export const MEAL_CLEARANCE_MINUTES = 120

/** Sleep below this many hours flags the swimmer for instructor caution. */
export const MIN_SLEEP_HOURS = 6

export const BUDS_FEVER_QUESTION = 'Fever since the last lesson?'
export const BUDS_VOMITING_QUESTION = 'Vomiting since the last lesson?'
export const BUDS_DIARRHEA_QUESTION = 'Diarrhea since the last lesson?'
export const BUDS_LAST_MEAL_QUESTION = 'Time of last meal (pool local time)'
export const BUDS_SLEEP_HOURS_QUESTION = 'Hours of sleep since the last lesson'

export const BUDS_FITNESS_QUESTION_IDS = {
  fever: '11111111-1111-4111-8111-111111111219',
  vomiting: '11111111-1111-4111-8111-111111111220',
  diarrhea: '11111111-1111-4111-8111-111111111221',
  lastMeal: '11111111-1111-4111-8111-111111111222',
  sleepHours: '11111111-1111-4111-8111-111111111223',
} as const

export type BudsFitnessStatus = 'CLEARED' | 'NOT_FIT' | 'HOLD_DIET' | 'FLAGGED_CAUTION'

export type ParentClearanceStatus = BudsFitnessStatus | 'MISSING'

export type DeckFitnessStatus = ParentClearanceStatus | 'DECK_CLEARED'

/** Structured intake the decision engine reads. Meal time is a pool-local clock. */
export interface BudsFitnessAnswers {
  fever: boolean
  vomiting: boolean
  diarrhea: boolean
  /** `HH:mm` on the class calendar day in the pool timezone. Null when not reported. */
  lastMealTime: string | null
  sleepHours: number | null
}

export interface BudsFitnessEvaluation {
  status: BudsFitnessStatus
  /** Instant the 120-minute meal window ends. Set only for `HOLD_DIET`. */
  clearanceAt: Date | null
}

const LEGACY_ILLNESS_SNIPPET = 'fever >100.5'

export function fitnessIntakeQuestions(): FormTemplateQuestion[] {
  return [
    {
      questionId: BUDS_FITNESS_QUESTION_IDS.fever,
      questionText: BUDS_FEVER_QUESTION,
      inputType: 'yes_no',
      options: [],
      isRequired: true,
      sortOrder: 19,
    },
    {
      questionId: BUDS_FITNESS_QUESTION_IDS.vomiting,
      questionText: BUDS_VOMITING_QUESTION,
      inputType: 'yes_no',
      options: [],
      isRequired: true,
      sortOrder: 20,
    },
    {
      questionId: BUDS_FITNESS_QUESTION_IDS.diarrhea,
      questionText: BUDS_DIARRHEA_QUESTION,
      inputType: 'yes_no',
      options: [],
      isRequired: true,
      sortOrder: 21,
    },
    {
      questionId: BUDS_FITNESS_QUESTION_IDS.lastMeal,
      questionText: BUDS_LAST_MEAL_QUESTION,
      inputType: 'text',
      options: [],
      isRequired: true,
      sortOrder: 22,
    },
    {
      questionId: BUDS_FITNESS_QUESTION_IDS.sleepHours,
      questionText: BUDS_SLEEP_HOURS_QUESTION,
      inputType: 'text',
      options: [],
      isRequired: true,
      sortOrder: 23,
    },
  ]
}

/** Adds the fitness toggles when a daily BUDS template does not already ask them. */
export function withFitnessIntakeQuestions(questions: FormTemplateQuestion[]): FormTemplateQuestion[] {
  const seen = new Set(questions.map((question) => question.questionText.trim().toLowerCase()))
  const missing = fitnessIntakeQuestions().filter(
    (question) => !seen.has(question.questionText.trim().toLowerCase()),
  )
  return [...questions, ...missing]
}

export function isLastMealQuestion(questionText: string): boolean {
  return questionText.trim().toLowerCase() === BUDS_LAST_MEAL_QUESTION.toLowerCase()
}

export function isSleepHoursQuestion(questionText: string): boolean {
  return questionText.trim().toLowerCase() === BUDS_SLEEP_HOURS_QUESTION.toLowerCase()
}

/** Fever, vomiting, or diarrhea toggles that can mark a swimmer not fit. */
export function isBudsIllnessQuestion(questionText: string): boolean {
  const text = questionText.trim().toLowerCase()
  if (text === BUDS_FEVER_QUESTION.toLowerCase()) return true
  if (text === BUDS_VOMITING_QUESTION.toLowerCase()) return true
  if (text === BUDS_DIARRHEA_QUESTION.toLowerCase()) return true
  if (text.includes('diarrhea') || text.includes('diarrhoea') || text.includes('vomit')) return true
  return text.includes('fever')
}

/** Accepts `14:30`, `14:30:00`, `2:30 PM`, and `2 PM`. Returns `HH:mm` or null. */
export function parseMealClock(value: string): string | null {
  const trimmed = value.trim().toLowerCase().replace(/\./g, '')
  if (!trimmed) return null

  const twentyFour = /^(\d{1,2}):(\d{2})(?::\d{2})?$/.exec(trimmed)
  if (twentyFour) {
    return clockOrNull(Number(twentyFour[1]), Number(twentyFour[2]))
  }

  const meridiem = /^(\d{1,2})(?::(\d{2}))?\s*([ap]m)$/.exec(trimmed)
  if (!meridiem) return null
  let hour = Number(meridiem[1])
  const minute = Number(meridiem[2] ?? '0')
  if (hour < 1 || hour > 12 || minute > 59) return null
  if (meridiem[3] === 'pm' && hour !== 12) hour += 12
  if (meridiem[3] === 'am' && hour === 12) hour = 0
  return clockOrNull(hour, minute)
}

/** First clock time mentioned in a free-text diet answer, if one is present. */
export function parseMealClockFromText(value: string): string | null {
  const match = value.match(/\b(\d{1,2}(?::\d{2})?\s*(?:[ap]\.?m\.?)|\d{1,2}:\d{2}(?::\d{2})?)\b/i)
  return match ? parseMealClock(match[1] ?? '') : null
}

export function parseSleepHours(value: string): number | null {
  const trimmed = value.trim().toLowerCase()
  if (!trimmed) return null
  const match = /^(\d+(?:\.\d+)?)(?:\s*(?:hours|hour|hrs|hr|h))?$/.exec(trimmed)
  if (!match) return null
  const hours = Number(match[1])
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return null
  return hours
}

function clockOrNull(hour: number, minute: number): string | null {
  if (!Number.isInteger(hour) || !Number.isInteger(minute)) return null
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
}

function yesAnswer(answer: AnswerSnapshot): boolean {
  return answer.input_type === 'yes_no' && answer.answer.trim().toLowerCase() === 'yes'
}

function isStructuredAnswers(answers: BudsFitnessAnswers | readonly AnswerSnapshot[]): answers is BudsFitnessAnswers {
  return !Array.isArray(answers)
}

/** Pulls fever, vomiting, diarrhea, last meal, and sleep out of a frozen submission. */
export function fitnessAnswersFromSnapshots(answers: readonly AnswerSnapshot[]): BudsFitnessAnswers {
  const result: BudsFitnessAnswers = {
    fever: false,
    vomiting: false,
    diarrhea: false,
    lastMealTime: null,
    sleepHours: null,
  }

  for (const answer of answers) {
    const text = answer.question_text.trim().toLowerCase()
    if (text === BUDS_FEVER_QUESTION.toLowerCase() && yesAnswer(answer)) result.fever = true
    if (text === BUDS_VOMITING_QUESTION.toLowerCase() && yesAnswer(answer)) result.vomiting = true
    if (text === BUDS_DIARRHEA_QUESTION.toLowerCase() && yesAnswer(answer)) result.diarrhea = true
    if ((text.includes('diarrhea') || text.includes('diarrhoea')) && yesAnswer(answer)) result.diarrhea = true

    if (text === BUDS_LAST_MEAL_QUESTION.toLowerCase()) {
      result.lastMealTime = parseMealClock(answer.answer) ?? parseMealClockFromText(answer.answer)
    }
    if (text === BUDS_SLEEP_HOURS_QUESTION.toLowerCase()) {
      result.sleepHours = parseSleepHours(answer.answer)
    }

    if (text.includes(LEGACY_ILLNESS_SNIPPET) && yesAnswer(answer)) {
      result.fever = true
      result.vomiting = true
    }
  }

  if (!result.lastMealTime) {
    const diet = answers.find((answer) =>
      answer.question_text.toLowerCase().includes('eat or drink in the last two hours'),
    )
    if (diet) result.lastMealTime = parseMealClockFromText(diet.answer)
  }

  return result
}

/**
 * Fitness-for-attendance decision.
 *
 * Illness (fever, vomiting, or diarrhea) is `NOT_FIT`.
 * A meal inside 120 minutes of class start, measured in `timezone`, is `HOLD_DIET`.
 * Sleep under 6 hours is `FLAGGED_CAUTION`. Otherwise `CLEARED`.
 *
 * `classStartTime` is the absolute start instant. `lastMealTime` is interpreted
 * on that instant's calendar day in `timezone` (`classes.timezone`), not the device zone.
 */
export function evaluateBudsFitness(
  answers: BudsFitnessAnswers | readonly AnswerSnapshot[],
  classStartTime: Date,
  timezone: string,
): BudsFitnessEvaluation {
  if (!timezone.trim()) throw new Error('Pool timezone is required')
  if (Number.isNaN(classStartTime.getTime())) throw new Error('Class start time is invalid')

  const parsed = isStructuredAnswers(answers) ? answers : fitnessAnswersFromSnapshots(answers)

  if (parsed.fever || parsed.vomiting || parsed.diarrhea) {
    return { status: 'NOT_FIT', clearanceAt: null }
  }

  if (parsed.lastMealTime) {
    const classDay = formatCalendarDateKey(classStartTime, timezone)
    const mealAt = zonedWallTimeToUtc(classDay, parsed.lastMealTime, timezone)
    const minutesBeforeClass = (classStartTime.getTime() - mealAt.getTime()) / 60_000
    if (minutesBeforeClass < MEAL_CLEARANCE_MINUTES) {
      return {
        status: 'HOLD_DIET',
        clearanceAt: new Date(mealAt.getTime() + MEAL_CLEARANCE_MINUTES * 60_000),
      }
    }
  }

  if (parsed.sleepHours != null && parsed.sleepHours < MIN_SLEEP_HOURS) {
    return { status: 'FLAGGED_CAUTION', clearanceAt: null }
  }

  return { status: 'CLEARED', clearanceAt: null }
}

export function formatClearanceClock(clearanceAt: Date, timezone: string): string {
  return formatZonedTime(clearanceAt, timezone)
}
