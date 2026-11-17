import { Check, Pencil } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { cn } from '../lib/utils'
import type { Category, Rung, Status } from '../lib/supabase'
import { STATUSES } from '../lib/supabase'

// Task Row / Ticket Card. Single file, TypeScript types, no hard-coded
// ticket data. Props from the T-005 component spec, applied to T-004.
// Built on shadcn/ui (Button, Badge) with Tailwind v4 tokens for type,
// colour, spacing, and iconography.
// Live status, from Beautiful UI Task Rows: running, failed, completed,
// queued. One animated element only: the pulsing dot while running.
// One transition per state change: the card border and background.
// Accessible: status is text as well as colour, keyboard focus is visible,
// the blocked reason is readable by a screen reader.
// Drag, focus, and the card label are owned by the KanbanBoardCard wrapper
// in components/ui/kanban-board.tsx, not by this card, so this card stays
// a plain presentational card that works on its own too.
export type LiveStatus = 'running' | 'failed' | 'completed' | 'queued'

export function liveStatusFor(status: Status): LiveStatus {
  if (status === 'Working') return 'running'
  if (status === 'Blocked') return 'failed'
  if (status === 'Done' || status === 'Ready for Review') return 'completed'
  return 'queued'
}

export function badgeVariantFor(status: Status): 'done' | 'working' | 'blocked' | 'review' | 'todo' {
  if (status === 'Done') return 'done'
  if (status === 'Blocked') return 'blocked'
  if (status === 'Ready for Review') return 'review'
  if (status === 'Todo') return 'todo'
  return 'working'
}

export interface TaskRowProps {
  id: string
  title: string
  owner: string
  rung: Rung | string
  status: Status
  category: Category | string
  liveStatus: LiveStatus
  blockReason?: string
  proofUrl?: string
  justCompleted?: boolean
  onChangeStatus: (id: string, status: Status) => void
  onEdit: () => void
}

// Skeleton card, from Transitions.dev skeleton-loader-and-reveal. Static
// blocks, no shimmer animation, so the running pulse stays the one
// animated element on the page. The reveal is the transition.
export function TaskRowSkeleton() {
  return (
    <div
      className="rounded-[10px] border border-border bg-card p-3 mb-3"
      aria-hidden="true"
    >
      <div className="h-4 w-20 rounded bg-border" />
      <div className="h-4 w-3/4 rounded bg-border mt-3" />
      <div className="h-3 w-1/2 rounded bg-border mt-3" />
      <div className="h-3 w-2/3 rounded bg-border mt-2" />
    </div>
  )
}

export default function TaskRow({
  id,
  title,
  owner,
  rung,
  status,
  category,
  liveStatus,
  blockReason,
  proofUrl,
  justCompleted,
  onChangeStatus,
  onEdit,
}: TaskRowProps) {
  const cardBorder =
    status === 'Done'
      ? 'border-l-done'
      : status === 'Blocked'
        ? 'border-l-blocked'
        : status === 'Ready for Review'
          ? 'border-l-review'
          : status === 'Todo'
            ? 'border-l-todo'
            : 'border-l-working'
  const liveDot =
    liveStatus === 'running'
      ? 'bg-working animate-pulse'
      : liveStatus === 'failed'
        ? 'bg-blocked'
        : liveStatus === 'completed'
          ? 'bg-done'
          : 'bg-todo'
  return (
    <article
      className={cn(
        'rounded-[10px] border border-border border-l-4 bg-card p-3 mb-3 transition-colors focus-visible:outline-2 focus-visible:outline-working',
        cardBorder,
      )}
    >
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-extrabold text-[15px]">{id}</span>
        <span
          className="rounded-md border border-border px-1.5 py-0.5 text-[11px] font-semibold text-muted"
          title={`Category: ${category}`}
        >
          {category}
        </span>
        <span
          className={cn('inline-block size-2.5 rounded-full', liveDot)}
          aria-label={`Live status: ${liveStatus}`}
          title={`Live status: ${liveStatus}`}
        />
        <Badge variant={badgeVariantFor(status)}>{status}</Badge>
        {justCompleted && (
          <span
            className="check-pop inline-flex items-center gap-1 text-[12px] font-bold text-done"
            role="status"
            aria-label={`${id} moved to Done`}
          >
            <Check aria-hidden className="size-4" />
            Done
          </span>
        )}
      </div>
      <div className="font-semibold my-2.5 leading-snug">{title}</div>
      <div className="text-[13px] leading-relaxed">
        <p className="m-0">
          <span className="font-semibold text-muted">Owner:</span> {owner}
        </p>
        <p className="m-0">
          <span className="font-semibold text-muted">Rung:</span> {rung}
        </p>
        <p className="m-0">
          <span className="font-semibold text-muted">Status:</span> {status}
          {blockReason ? ` — ${blockReason}` : ''}
        </p>
        {blockReason && <p className="sr-only">Blocked because: {blockReason}</p>}
      </div>
      {proofUrl && (
        <a href={proofUrl} className="text-[13px] text-review underline" target="_blank" rel="noreferrer">
          Proof
        </a>
      )}
      <div className="mt-2.5 flex gap-2 flex-wrap">
        <select
          className="px-1.5 py-1.5 rounded-lg border border-border bg-card text-[12px] focus-visible:outline-2 focus-visible:outline-working"
          aria-label="Change status"
          value={status}
          onChange={(e) => onChangeStatus(id, e.target.value as Status)}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button variant="ghost" size="sm" type="button" onClick={onEdit}>
          <Pencil aria-hidden />
          Edit
        </Button>
      </div>
    </article>
  )
}
