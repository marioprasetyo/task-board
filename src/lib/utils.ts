import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

// shadcn/ui convention: cn() merges Tailwind classes, later classes win.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
