/** Google Classroom–style accents (demo / marketing palette). */
export type ClassAccentKey = 'primary' | 'secondary' | 'tertiary'

export interface ClassAccentStyle {
  gradient: string
  pillBg: string
  pillText: string
  detailIconClass: string
  /** Layered wave fills for card header backgrounds (back → front). */
  waveLayers: [string, string, string]
}

export const CLASS_ACCENT_STYLES: Record<ClassAccentKey, ClassAccentStyle> = {
  primary: {
    gradient: 'linear-gradient(135deg, #0891B2 0%, #0ea5c9 45%, #067a96 100%)',
    pillBg: 'rgba(255, 255, 255, 0.22)',
    pillText: '#ffffff',
    detailIconClass: 'text-[#0891B2]',
    waveLayers: ['#04596e', '#067a96', '#0891B2'],
  },
  secondary: {
    gradient: 'linear-gradient(135deg, #10B981 0%, #34d399 45%, #059669 100%)',
    pillBg: 'rgba(255, 255, 255, 0.22)',
    pillText: '#ffffff',
    detailIconClass: 'text-[#10B981]',
    waveLayers: ['#065f46', '#047857', '#059669'],
  },
  tertiary: {
    gradient: 'linear-gradient(135deg, #F43F5E 0%, #fb7185 45%, #e11d48 100%)',
    pillBg: 'rgba(255, 255, 255, 0.22)',
    pillText: '#ffffff',
    detailIconClass: 'text-[#F43F5E]',
    waveLayers: ['#9f1239', '#be123c', '#e11d48'],
  },
}

const ACCENT_ORDER: ClassAccentKey[] = ['primary', 'secondary', 'tertiary']

/** Stable accent per class so colors don’t jump between renders. */
export function accentForClass(classId: string | null | undefined, listIndex = 0): ClassAccentKey {
  if (classId) {
    let hash = 0
    for (let i = 0; i < classId.length; i++) {
      hash = (hash + classId.charCodeAt(i)) % ACCENT_ORDER.length
    }
    return ACCENT_ORDER[hash]
  }
  return ACCENT_ORDER[listIndex % ACCENT_ORDER.length]
}
