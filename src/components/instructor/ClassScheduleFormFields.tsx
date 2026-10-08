import { ISO_WEEKDAYS, type NewClassScheduleInput } from '../../lib/classSchedule'
import { Field, Input } from '../ui'
import { cn } from '../../lib/cn'

export interface ClassScheduleFormValues {
  location: string
  laneDetail: string
  daysOfWeek: number[]
  startTime: string
  endTime: string
  seasonStart: string
  seasonEnd: string
}

interface ClassScheduleFormFieldsProps {
  values: ClassScheduleFormValues
  onChange: (patch: Partial<ClassScheduleFormValues>) => void
  showName?: boolean
  name?: string
  onNameChange?: (name: string) => void
}

export function ClassScheduleFormFields({
  values,
  onChange,
  showName = false,
  name = '',
  onNameChange,
}: ClassScheduleFormFieldsProps) {
  function toggleDay(day: number) {
    const next = values.daysOfWeek.includes(day)
      ? values.daysOfWeek.filter((d) => d !== day)
      : [...values.daysOfWeek, day].sort((a, b) => a - b)
    onChange({ daysOfWeek: next })
  }

  return (
    <>
      {showName && onNameChange ? (
        <Input
          label="Class name"
          value={name}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder="e.g. Tuesday Level 2"
          required
          autoFocus
        />
      ) : null}

      <Input
        label="Pool / facility"
        value={values.location}
        onChange={(event) => onChange({ location: event.target.value })}
        placeholder="e.g. Pool A"
      />
      <Input
        label="Lane or area (optional)"
        value={values.laneDetail}
        onChange={(event) => onChange({ laneDetail: event.target.value })}
        placeholder="e.g. Lane 3"
      />

      <Field id="class-days" label="Meets on" hint="Required">
        <div className="flex flex-wrap gap-2" role="group" aria-labelledby="class-days">
          {ISO_WEEKDAYS.map((day) => {
            const selected = values.daysOfWeek.includes(day.value)
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleDay(day.value)}
                className={cn(
                  'min-w-[3rem] rounded-full border px-3 py-2 text-label-sm font-semibold transition-colors',
                  selected
                    ? 'border-primary bg-primary-fixed/50 text-primary'
                    : 'border-outline-variant/50 bg-surface-container-lowest text-on-surface-variant',
                )}
                aria-pressed={selected}
              >
                {day.short}
              </button>
            )
          })}
        </div>
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field id="session-start" label="Session start" hint="Required">
          <input
            id="session-start"
            type="time"
            required
            value={values.startTime}
            onChange={(event) => onChange({ startTime: event.target.value })}
            className="h-12 w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 text-body-md text-on-surface"
          />
        </Field>
        <Field id="session-end" label="Session end" hint="Required">
          <input
            id="session-end"
            type="time"
            required
            value={values.endTime}
            onChange={(event) => onChange({ endTime: event.target.value })}
            className="h-12 w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 text-body-md text-on-surface"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field id="season-start" label="Season start (optional)">
          <input
            id="season-start"
            type="date"
            value={values.seasonStart}
            onChange={(event) => onChange({ seasonStart: event.target.value })}
            className="h-12 w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 text-body-md text-on-surface"
          />
        </Field>
        <Field id="season-end" label="Season end (optional)">
          <input
            id="season-end"
            type="date"
            value={values.seasonEnd}
            onChange={(event) => onChange({ seasonEnd: event.target.value })}
            className="h-12 w-full rounded-2xl border border-outline-variant/50 bg-surface-container-lowest px-4 text-body-md text-on-surface"
          />
        </Field>
      </div>
    </>
  )
}

export function scheduleFormValuesFromInput(
  schedule: NewClassScheduleInput,
  location: string,
): ClassScheduleFormValues {
  return {
    location,
    laneDetail: schedule.locationDetail ?? '',
    daysOfWeek: schedule.daysOfWeek,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    seasonStart: schedule.seasonStart ?? '',
    seasonEnd: schedule.seasonEnd ?? '',
  }
}

export function scheduleInputFromFormValues(values: ClassScheduleFormValues): NewClassScheduleInput {
  return {
    daysOfWeek: values.daysOfWeek,
    startTime: values.startTime,
    endTime: values.endTime,
    locationDetail: values.laneDetail || null,
    seasonStart: values.seasonStart || null,
    seasonEnd: values.seasonEnd || null,
  }
}
