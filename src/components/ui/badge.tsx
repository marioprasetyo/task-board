import * as React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

// shadcn/ui Badge, copy-paste style, customised to the Nomi dark theme.
// One colour per status, status shown as text as well as colour.
const badgeVariants = cva(
  'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-bold',
  {
    variants: {
      variant: {
        done: 'bg-[--color-done] text-[--color-bg]',
        working: 'bg-[--color-working] text-[--color-bg]',
        blocked: 'bg-[--color-blocked] text-white',
        review: 'bg-[--color-review] text-white',
        todo: 'bg-[--color-todo] text-[--color-bg]',
      },
    },
    defaultVariants: {
      variant: 'working',
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
