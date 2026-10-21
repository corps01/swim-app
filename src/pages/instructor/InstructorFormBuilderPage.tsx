import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { AppLayout } from '../../components/layout'
import { Badge, Button, Card, Field, Input, MaterialIcon, Spinner } from '../../components/ui'
import { controlClass } from '../../components/ui/styles'
import { fetchInstructorClasses } from '../../lib/api/classes'
import {
  createCustomQuestion,
  fetchFormTemplate,
  fetchQuestionBank,
  saveFormTemplate,
} from '../../lib/api/forms'
import type { FormClassLink, FormInputType, QuestionBankItem } from '../../types/questionnaire'
import { useAuth } from '../../hooks/useAuth'
import { categoryLabel, compareCategories, DEFAULT_QUESTION_CATEGORIES, inputTypeLabel } from '../../lib/formQuestions'
import { formatAppError } from '../../lib/errors'
import { cn } from '../../lib/cn'
import type { SwimClass } from '../../types/class'

interface InstructorFormBuilderPageProps {
  templateId: string | null
  onBack: () => void
  onSaved: () => void
}

type SelectedQuestion = {
  questionId: string
  isRequired: boolean
}

const INPUT_TYPE_OPTIONS: FormInputType[] = ['text', 'textarea', 'yes_no', 'select']

export function InstructorFormBuilderPage({ templateId, onBack, onSaved }: InstructorFormBuilderPageProps) {
  const { user } = useAuth()
  const instructorId = user?.id
  const editing = Boolean(templateId)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [isActive, setIsActive] = useState(true)
  const [questions, setQuestions] = useState<QuestionBankItem[]>([])
  const [selected, setSelected] = useState<SelectedQuestion[]>([])
  const [classes, setClasses] = useState<SwimClass[]>([])
  const [classLinks, setClassLinks] = useState<FormClassLink[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [loading, setLoading] = useState(true)
  const [missing, setMissing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [addingQuestion, setAddingQuestion] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [customCategory, setCustomCategory] = useState(DEFAULT_QUESTION_CATEGORIES[0])
  const [customCategoryMode, setCustomCategoryMode] = useState<'listed' | 'new'>('listed')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [customText, setCustomText] = useState('')
  const [customInputType, setCustomInputType] = useState<FormInputType>('text')
  const [customOptions, setCustomOptions] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [bank, classRows, template] = await Promise.all([
          fetchQuestionBank(),
          instructorId ? fetchInstructorClasses(instructorId) : Promise.resolve([]),
          templateId ? fetchFormTemplate(templateId) : Promise.resolve(null),
        ])
        if (cancelled) return
        if (templateId && !template) {
          setMissing(true)
          setError('This questionnaire could not be found.')
          return
        }
        setQuestions(bank)
        setClasses(classRows)
        if (template) {
          setTitle(template.title)
          setDescription(template.description ?? '')
          setIsActive(template.isActive)
          setSelected(
            template.questions.map((question) => ({
              questionId: question.questionId,
              isRequired: question.isRequired,
            })),
          )
          setClassLinks(template.classLinks)
        }
      } catch (err) {
        if (!cancelled) setError(formatAppError(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [instructorId, templateId])

  const questionsById = useMemo(() => {
    const map = new Map<string, QuestionBankItem>()
    for (const question of questions) map.set(question.id, question)
    return map
  }, [questions])

  const categories = useMemo(() => {
    const names = new Set<string>(DEFAULT_QUESTION_CATEGORIES)
    for (const question of questions) names.add(question.category)
    return [...names].sort(compareCategories)
  }, [questions])

  const visibleBank = useMemo(() => {
    const rows =
      categoryFilter === 'all'
        ? questions
        : questions.filter((question) => question.category === categoryFilter)
    return [...rows].sort((a, b) => {
      const byCategory = compareCategories(a.category, b.category)
      if (byCategory !== 0) return byCategory
      return a.questionText.localeCompare(b.questionText)
    })
  }, [categoryFilter, questions])

  const selectedIds = useMemo(() => new Set(selected.map((row) => row.questionId)), [selected])

  function toggleQuestion(questionId: string) {
    setSelected((current) => {
      if (current.some((row) => row.questionId === questionId)) {
        return current.filter((row) => row.questionId !== questionId)
      }
      return [...current, { questionId, isRequired: true }]
    })
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    setSelected((current) => {
      const nextIndex = index + direction
      if (nextIndex < 0 || nextIndex >= current.length) return current
      const copy = current.slice()
      const [item] = copy.splice(index, 1)
      if (!item) return current
      copy.splice(nextIndex, 0, item)
      return copy
    })
  }

  function setRequired(questionId: string, isRequired: boolean) {
    setSelected((current) =>
      current.map((row) => (row.questionId === questionId ? { ...row, isRequired } : row)),
    )
  }

  function toggleClass(classId: string) {
    setClassLinks((current) => {
      if (current.some((row) => row.classId === classId)) {
        return current.filter((row) => row.classId !== classId)
      }
      return [...current, { classId, isMandatoryForEnrollment: false }]
    })
  }

  function setClassMandatory(classId: string, isMandatoryForEnrollment: boolean) {
    setClassLinks((current) =>
      current.map((row) => (row.classId === classId ? { ...row, isMandatoryForEnrollment } : row)),
    )
  }

  async function handleAddCustomQuestion() {
    setError(null)
    if (!instructorId) return
    const category = (customCategoryMode === 'new' ? newCategoryName : customCategory).trim()
    const options = customOptions
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
    if (!category || !customText.trim()) {
      setError('Category and question text are required.')
      return
    }
    if (customInputType === 'select' && options.length === 0) {
      setError('Add at least one dropdown option, one per line.')
      return
    }
    setAddingQuestion(true)
    try {
      const created = await createCustomQuestion({
        instructorId,
        category,
        questionText: customText,
        inputType: customInputType,
        options,
      })
      setQuestions((current) => [...current, created])
      setSelected((current) =>
        current.some((row) => row.questionId === created.id)
          ? current
          : [...current, { questionId: created.id, isRequired: true }],
      )
      setCustomText('')
      setCustomOptions('')
      setCategoryFilter(created.category)
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setAddingQuestion(false)
    }
  }

  async function handleSave(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setSaving(true)
    try {
      await saveFormTemplate({
        templateId,
        title,
        description,
        isActive,
        questions: selected,
        classLinks,
      })
      onSaved()
    } catch (err) {
      setError(formatAppError(err))
    } finally {
      setSaving(false)
    }
  }

  return (
    <AppLayout
      title={editing ? 'Edit questionnaire' : 'New questionnaire'}
      subtitle="Choose questions, set the order, and assign classes"
      onBack={onBack}
      backLabel="← Back"
      wide
    >
      {loading ? (
        <Spinner className="pb-8" label="Loading questionnaire…" />
      ) : missing ? (
        <p className="pb-8 text-body-md text-error">{error}</p>
      ) : (
        <form className="flex flex-col gap-6 pb-10" onSubmit={(event) => void handleSave(event)}>
          <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Input
              label="Template title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Season waiver"
              required
            />
            <Field id="form-description" label="Description">
              <textarea
                id="form-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What parents are agreeing to"
                rows={3}
                className={cn(controlClass, 'h-auto min-h-24 py-3')}
              />
            </Field>
            <label className="flex items-center gap-3 text-label-md text-on-surface md:col-span-2">
              <input
                type="checkbox"
                checked={isActive}
                onChange={(event) => setIsActive(event.target.checked)}
                className="size-4 accent-primary"
              />
              Active
            </label>
          </section>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">Questions on this form</h2>
                <p className="text-body-sm text-on-surface-variant">
                  Move questions up or down. Required answers must be completed before a parent can sign.
                </p>
              </div>
              {selected.length === 0 ? (
                <p className="rounded-2xl border border-dashed border-outline-variant/50 px-4 py-6 text-body-sm text-on-surface-variant">
                  No questions yet. Add them from the question bank.
                </p>
              ) : (
                <ol className="flex flex-col gap-2">
                  {selected.map((row, index) => {
                    const question = questionsById.get(row.questionId)
                    return (
                      <li key={row.questionId}>
                        <Card variant="outline" className="gap-3 rounded-2xl p-3">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-label-md text-on-surface">
                                {question?.questionText ?? 'Question unavailable'}
                              </p>
                              <p className="mt-1 text-label-sm text-on-surface-variant">
                                {question ? categoryLabel(question.category) : 'Unknown'}
                                {question ? ` · ${inputTypeLabel(question.inputType)}` : ''}
                              </p>
                            </div>
                            <span className="text-label-sm text-outline">{index + 1}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-11 rounded-full px-3"
                              disabled={index === 0}
                              onClick={() => moveQuestion(index, -1)}
                            >
                              Up
                            </Button>
                            <Button
                              type="button"
                              variant="secondary"
                              size="sm"
                              className="h-11 rounded-full px-3"
                              disabled={index === selected.length - 1}
                              onClick={() => moveQuestion(index, 1)}
                            >
                              Down
                            </Button>
                            <label className="ml-auto flex items-center gap-2 text-label-sm text-on-surface">
                              <input
                                type="checkbox"
                                checked={row.isRequired}
                                onChange={(event) => setRequired(row.questionId, event.target.checked)}
                                className="size-4 accent-primary"
                              />
                              Required
                            </label>
                          </div>
                        </Card>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>

            <section className="flex flex-col gap-3">
              <div>
                <h2 className="text-headline-sm text-on-surface">Question bank</h2>
                <p className="text-body-sm text-on-surface-variant">
                  Default questions and your custom questions. Toggle one to add or remove it.
                </p>
              </div>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <CategoryChip
                  label="All"
                  selected={categoryFilter === 'all'}
                  onClick={() => setCategoryFilter('all')}
                />
                {categories.map((category) => (
                  <CategoryChip
                    key={category}
                    label={categoryLabel(category)}
                    selected={categoryFilter === category}
                    onClick={() => setCategoryFilter(category)}
                  />
                ))}
              </div>
              {visibleBank.length === 0 ? (
                <p className="text-body-sm text-on-surface-variant">No questions in this category yet.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {visibleBank.map((question) => {
                    const added = selectedIds.has(question.id)
                    return (
                      <li key={question.id}>
                        <button
                          type="button"
                          aria-pressed={added}
                          onClick={() => toggleQuestion(question.id)}
                          className={cn(
                            'flex w-full items-start gap-3 rounded-2xl border px-3 py-3 text-left transition-colors',
                            added
                              ? 'border-primary bg-primary-fixed/30'
                              : 'border-outline-variant/40 bg-surface-container-lowest hover:bg-surface-container-low',
                          )}
                        >
                          <MaterialIcon
                            name={added ? 'check_circle' : 'add_circle'}
                            size={20}
                            className={added ? 'mt-0.5 text-primary' : 'mt-0.5 text-outline'}
                            filled={added}
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block text-label-md text-on-surface">{question.questionText}</span>
                            <span className="mt-1 flex flex-wrap items-center gap-2">
                              <Badge tone="neutral">{categoryLabel(question.category)}</Badge>
                              <Badge tone="primary">{inputTypeLabel(question.inputType)}</Badge>
                              <Badge tone={question.instructorId ? 'warning' : 'success'}>
                                {question.instructorId ? 'Custom' : 'Default'}
                              </Badge>
                            </span>
                          </span>
                        </button>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>
          </div>

          <section className="flex flex-col gap-3 rounded-3xl bg-surface-container-low p-4">
            <div>
              <h2 className="text-headline-sm text-on-surface">Add a custom question</h2>
              <p className="text-body-sm text-on-surface-variant">
                Saves to your question bank and adds it to this questionnaire.
              </p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <Field id="custom-category" label="Category">
                <select
                  id="custom-category"
                  value={customCategoryMode === 'new' ? '__new' : customCategory}
                  onChange={(event) => {
                    if (event.target.value === '__new') {
                      setCustomCategoryMode('new')
                      return
                    }
                    setCustomCategoryMode('listed')
                    setCustomCategory(event.target.value)
                  }}
                  className={controlClass}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {categoryLabel(category)}
                    </option>
                  ))}
                  <option value="__new">New category…</option>
                </select>
              </Field>
              {customCategoryMode === 'new' ? (
                <Input
                  label="New category"
                  value={newCategoryName}
                  onChange={(event) => setNewCategoryName(event.target.value)}
                  placeholder="Skills"
                />
              ) : (
                <Field id="custom-input-type" label="Answer type">
                  <select
                    id="custom-input-type"
                    value={customInputType}
                    onChange={(event) => setCustomInputType(event.target.value as FormInputType)}
                    className={controlClass}
                  >
                    {INPUT_TYPE_OPTIONS.map((inputType) => (
                      <option key={inputType} value={inputType}>
                        {inputTypeLabel(inputType)}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
              <div className={customCategoryMode === 'new' ? 'md:col-span-2' : 'md:col-span-2'}>
                <Input
                  label="Question"
                  value={customText}
                  onChange={(event) => setCustomText(event.target.value)}
                  placeholder="Does your swimmer need a life jacket?"
                />
              </div>
              {customCategoryMode === 'new' ? (
                <Field id="custom-input-type-extra" label="Answer type">
                  <select
                    id="custom-input-type-extra"
                    value={customInputType}
                    onChange={(event) => setCustomInputType(event.target.value as FormInputType)}
                    className={controlClass}
                  >
                    {INPUT_TYPE_OPTIONS.map((inputType) => (
                      <option key={inputType} value={inputType}>
                        {inputTypeLabel(inputType)}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
            </div>
            {customInputType === 'select' ? (
              <Field id="custom-options" label="Dropdown options" hint="One per line">
                <textarea
                  id="custom-options"
                  value={customOptions}
                  onChange={(event) => setCustomOptions(event.target.value)}
                  rows={3}
                  placeholder={'Beginner\nIntermediate'}
                  className={cn(controlClass, 'h-auto min-h-24 py-3')}
                />
              </Field>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              className="self-start rounded-full"
              disabled={addingQuestion}
              onClick={() => void handleAddCustomQuestion()}
            >
              {addingQuestion ? 'Adding…' : 'Add to question bank'}
            </Button>
          </section>

          <section className="flex flex-col gap-3">
            <div>
              <h2 className="text-headline-sm text-on-surface">Assign to classes</h2>
              <p className="text-body-sm text-on-surface-variant">
                Parents of swimmers in a checked class can open this questionnaire.
              </p>
            </div>
            {classes.length === 0 ? (
              <p className="text-body-sm text-on-surface-variant">
                You do not have any classes yet. You can still save this questionnaire and assign it later.
              </p>
            ) : (
              <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
                {classes.map((classRow) => {
                  const link = classLinks.find((row) => row.classId === classRow.id)
                  return (
                    <li key={classRow.id} className="rounded-2xl border border-outline-variant/40 p-3">
                      <label className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={Boolean(link)}
                          onChange={() => toggleClass(classRow.id)}
                          className="mt-1 size-4 accent-primary"
                        />
                        <span>
                          <span className="block text-label-md text-on-surface">{classRow.name}</span>
                          <span className="block text-label-sm text-on-surface-variant">{classRow.class_code}</span>
                        </span>
                      </label>
                      {link ? (
                        <label className="mt-3 flex items-center gap-2 pl-7 text-label-sm text-on-surface">
                          <input
                            type="checkbox"
                            checked={link.isMandatoryForEnrollment}
                            onChange={(event) => setClassMandatory(classRow.id, event.target.checked)}
                            className="size-4 accent-primary"
                          />
                          Required to enroll
                        </label>
                      ) : null}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>

          {error ? <p className="text-body-sm text-error">{error}</p> : null}

          <Button type="submit" className="h-12 rounded-2xl" disabled={saving}>
            {saving ? 'Saving…' : editing ? 'Save questionnaire' : 'Create questionnaire'}
          </Button>
        </form>
      )}
    </AppLayout>
  )
}

function CategoryChip({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'min-h-11 shrink-0 rounded-full px-4 text-label-sm',
        selected ? 'bg-primary text-on-primary' : 'bg-surface-container text-on-surface-variant',
      )}
      aria-pressed={selected}
    >
      {label}
    </button>
  )
}
