export type FormInputType = 'text' | 'textarea' | 'yes_no' | 'select'

export interface QuestionBankItem {
  id: string
  instructorId: string | null
  category: string
  questionText: string
  inputType: FormInputType
  options: string[] | null
  createdAt: string
}

export interface FormTemplate {
  id: string
  title: string
  description: string | null
  isActive: boolean
  createdAt: string
}

export interface FormTemplateSummary extends FormTemplate {
  questionCount: number
  classCount: number
}

export interface FormTemplateQuestion {
  questionId: string
  sortOrder: number
  isRequired: boolean
  questionText: string
  inputType: FormInputType
  options: string[]
}

export type FormTemplateQuestionLink = Pick<FormTemplateQuestion, 'questionId' | 'sortOrder' | 'isRequired'>

export interface ClassForm {
  classId: string
  templateId: string
  title: string
  isMandatoryForEnrollment: boolean
}

export interface ParentClassForm extends ClassForm {
  signed: boolean
}

export interface FormClassLink {
  classId: string
  isMandatoryForEnrollment: boolean
}

export interface FormTemplateDetail extends FormTemplate {
  questions: FormTemplateQuestionLink[]
  classLinks: FormClassLink[]
}

export interface SaveFormTemplateInput {
  templateId: string | null
  title: string
  description: string
  isActive: boolean
  questions: Array<Pick<FormTemplateQuestion, 'questionId' | 'isRequired'>>
  classLinks: FormClassLink[]
}

export interface ParentQuestionnaire extends Pick<FormTemplate, 'title' | 'description'> {
  templateId: string
  classId: string
  questions: FormTemplateQuestion[]
  alreadySigned: boolean
}

/** Frozen row stored in form_submissions.answers_json. */
export interface AnswerSnapshot {
  question_text: string
  input_type: FormInputType
  answer: string
}

export interface FormSubmission {
  id: string
  childId: string
  classId: string
  templateId: string
  signedBy: string
  answers: AnswerSnapshot[]
  legalTextSnapshot: string | null
  signatureDataUrl: string | null
  signedAt: string
}

export interface FormSubmissionReview extends FormSubmission {
  swimmerName: string
  swimmerDateOfBirth: string | null
  parentName: string
  templateTitle: string
  className: string | null
}

export interface SwimmerFormCompliance {
  childId: string
  classId: string
  status: 'signed' | 'pending'
  submissionId: string | null
}
