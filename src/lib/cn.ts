import { clsx, type ClassValue } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: [
        'display',
        'headline-lg',
        'headline-lg-mobile',
        'headline-md',
        'headline-sm',
        'body-lg',
        'body-md',
        'body-sm',
        'label-lg',
        'label-md',
        'label-sm',
      ],
      spacing: [
        'touch-action',
        'touch-min',
        'gutter-desktop',
        'gutter-mobile',
        'margin-screen',
        'stack-tight',
        'stack-base',
        'stack-loose',
        'card-padding',
      ],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
