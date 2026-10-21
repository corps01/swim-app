import { useCallback, useEffect, useState } from 'react'
import { AppLayout } from '../../components/layout'
import { Badge, Button, Card, MaterialIcon, Spinner } from '../../components/ui'
import { fetchFormTemplateSummaries } from '../../lib/api/forms'
import type { FormTemplateSummary } from '../../types/questionnaire'
import { instructorEditFormPath, INSTRUCTOR_FORM_NEW_PATH } from '../../lib/appNavigation'
import { formatAppError } from '../../lib/errors'

interface InstructorFormsPageProps {
  onBack: () => void
  onNavigate: (path: string) => void
}

export function InstructorFormsPage({ onBack, onNavigate }: InstructorFormsPageProps) {
  const [templates, setTemplates] = useState<FormTemplateSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      setTemplates(await fetchFormTemplateSummaries())
    } catch (err) {
      setTemplates([])
      setError(formatAppError(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <AppLayout
      title="Questionnaires"
      subtitle="Forms parents complete for your classes"
      onBack={onBack}
      backLabel="← Back"
      wide
    >
      <div className="flex flex-col gap-4 pb-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {loading ? (
            <Spinner label="Loading questionnaires…" />
          ) : (
            <p className="text-body-md text-on-surface-variant">
              {templates.length === 0
                ? 'Create a questionnaire from the question bank, then assign it to a class.'
                : `${templates.length} questionnaire${templates.length === 1 ? '' : 's'}`}
            </p>
          )}
          <Button type="button" className="rounded-full" onClick={() => onNavigate(INSTRUCTOR_FORM_NEW_PATH)}>
            <MaterialIcon name="add" size={18} />
            Create Questionnaire
          </Button>
        </div>

        {error ? <p className="text-body-sm text-error">{error}</p> : null}

        {loading ? null : templates.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-outline-variant/50 bg-surface-container-lowest p-8 text-center">
            <div className="mx-auto mb-3 flex size-16 items-center justify-center rounded-full bg-surface-container text-primary">
              <MaterialIcon name="assignment" size={32} />
            </div>
            <p className="text-body-md text-on-surface-variant">No questionnaires yet.</p>
            <Button
              type="button"
              className="mt-4 rounded-full"
              onClick={() => onNavigate(INSTRUCTOR_FORM_NEW_PATH)}
            >
              <MaterialIcon name="add" size={20} />
              Create Questionnaire
            </Button>
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {templates.map((template) => (
              <li key={template.id}>
                <button
                  type="button"
                  className="w-full text-left"
                  onClick={() => onNavigate(instructorEditFormPath(template.id))}
                >
                  <Card className="h-full gap-3 rounded-3xl p-5 transition-shadow hover:shadow-lg">
                    <div className="flex items-start justify-between gap-3">
                      <h2 className="text-headline-sm text-on-surface">{template.title}</h2>
                      <Badge tone={template.isActive ? 'success' : 'neutral'}>
                        {template.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    {template.description ? (
                      <p className="line-clamp-2 text-body-sm text-on-surface-variant">{template.description}</p>
                    ) : (
                      <p className="text-body-sm text-outline">No description</p>
                    )}
                    <p className="text-label-sm text-primary">
                      {template.questionCount} question{template.questionCount === 1 ? '' : 's'}
                      {' · '}
                      {template.classCount} class{template.classCount === 1 ? '' : 'es'}
                    </p>
                  </Card>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  )
}
