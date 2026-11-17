import {
  Children,
  createContext,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

// Kanban Board primitives, adapted from Kanban Board by victor-teles,
// https://21st.dev/@victor-teles/components/kanban-board, published
// 2026-10-18: columns and cards with smooth FLIP drag-and-drop, keyboard
// movement and empty states, no dnd-kit, value and onValueChange.
// The component's own source comes with a free 21st.dev account, so it is
// not in this repo. These primitives are built to the published API, same
// export names and props, same behavior: FLIP drag-and-drop, keyboard
// movement, empty states, and the drop slot growing to the card's height.
// Dependencies are only clsx, tailwind-merge, and class-variance-authority,
// all already in this shadcn project, via cn() in lib/utils.
// Adaptations for our board, T-004: five fixed columns, no column
// reordering, no due dates, no priority, no avatars, no demo data, dark
// Nomi theme, one colour per status. A move inside one column is not
// offered, because public.tickets has no position column to write it to.
// Drag and keyboard move a card between columns only, and onValueChange
// reports the new value; the parent writes the new status to Supabase.

export type KanbanBoardValue = Record<string, string[]>

interface KanbanBoardContextValue {
  value: KanbanBoardValue
  onValueChange: (next: KanbanBoardValue) => void
  columns: string[]
  draggedId: string | null
  draggedHeight: number
  dropTarget: { column: string; index: number } | null
  setDragged: (id: string | null, height?: number) => void
  setDropTarget: React.Dispatch<
    React.SetStateAction<{ column: string; index: number } | null>
  >
  moveCard: (id: string, toColumn: string) => void
}

const KanbanBoardContext = createContext<KanbanBoardContextValue | null>(null)

function useKanban(): KanbanBoardContextValue {
  const ctx = useContext(KanbanBoardContext)
  if (!ctx) throw new Error('Kanban components must be used inside <KanbanBoard>')
  return ctx
}

interface KanbanBoardColumnContextValue {
  value: string
  label: string
  ids: string[]
}

const KanbanBoardColumnContext = createContext<KanbanBoardColumnContextValue | null>(null)

function useKanbanColumn(): KanbanBoardColumnContextValue {
  const ctx = useContext(KanbanBoardColumnContext)
  if (!ctx) throw new Error('Kanban column components must be used inside <KanbanBoardColumn>')
  return ctx
}

export interface KanbanBoardProps {
  value: KanbanBoardValue
  onValueChange: (next: KanbanBoardValue) => void
  className?: string
  children: ReactNode
}

export function KanbanBoard({ value, onValueChange, className, children }: KanbanBoardProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [draggedHeight, setDraggedHeight] = useState(0)
  const [dropTarget, setDropTarget] = useState<{ column: string; index: number } | null>(null)
  const columns = Object.keys(value)
  const boardRef = useRef<HTMLDivElement | null>(null)
  const prevRects = useRef(new Map<string, { top: number; left: number }>())

  // FLIP: after every render, cards that moved get a transform from their
  // old position to their new one, then animate to place. One transition
  // per state change, on the card wrapper only.
  useLayoutEffect(() => {
    const root = boardRef.current
    if (!root) return
    const els = root.querySelectorAll<HTMLElement>('[data-kanban-card]')
    els.forEach((el) => {
      const id = el.dataset.kanbanCard
      if (!id) return
      const rect = el.getBoundingClientRect()
      const prev = prevRects.current.get(id)
      if (prev && (prev.top !== rect.top || prev.left !== rect.left)) {
        const dx = prev.left - rect.left
        const dy = prev.top - rect.top
        el.style.transition = 'none'
        el.style.transform = `translate(${dx}px, ${dy}px)`
        void el.getBoundingClientRect()
        el.style.transition = 'transform 200ms ease-out'
        el.style.transform = ''
      }
      prevRects.current.set(id, { top: rect.top, left: rect.left })
    })
    for (const id of [...prevRects.current.keys()]) {
      if (!root.querySelector(`[data-kanban-card="${id}"]`)) prevRects.current.delete(id)
    }
  })

  function setDragged(id: string | null, height = 0) {
    setDraggedId(id)
    setDraggedHeight(height)
    if (id === null) setDropTarget(null)
  }

  function moveCard(id: string, toColumn: string) {
    const fromColumn = columns.find((c) => (value[c] ?? []).includes(id))
    if (!fromColumn || fromColumn === toColumn) return
    const next: KanbanBoardValue = {}
    for (const c of columns) {
      next[c] = (value[c] ?? []).filter((x) => x !== id)
    }
    next[toColumn] = [...(value[toColumn] ?? []), id]
    onValueChange(next)
  }

  return (
    <KanbanBoardContext.Provider
      value={{
        value,
        onValueChange,
        columns,
        draggedId,
        draggedHeight,
        dropTarget,
        setDragged,
        setDropTarget,
        moveCard,
      }}
    >
      <div ref={boardRef} className={cn('board', className)}>
        {children}
      </div>
    </KanbanBoardContext.Provider>
  )
}

export interface KanbanBoardColumnProps {
  value: string
  label: string
  className?: string
  children: ReactNode
}

export function KanbanBoardColumn({ value, label, className, children }: KanbanBoardColumnProps) {
  const { value: boardValue, draggedId, dropTarget, setDropTarget, moveCard } = useKanban()
  const ids = boardValue[value] ?? []
  const isDropTarget = draggedId !== null && dropTarget?.column === value
  const columnRef = useRef<HTMLElement | null>(null)

  function indexFromPointer(clientY: number): number {
    const root = columnRef.current
    if (!root) return ids.length
    const cards = [...root.querySelectorAll<HTMLElement>('[data-kanban-card]')]
    for (let i = 0; i < cards.length; i++) {
      const rect = cards[i].getBoundingClientRect()
      if (clientY < rect.top + rect.height / 2) return i
    }
    return cards.length
  }

  return (
    <KanbanBoardColumnContext.Provider value={{ value, label, ids }}>
      <section
        ref={columnRef}
        className={cn('col', isDropTarget && 'drag-over', className)}
        data-kanban-column={value}
        onDragOver={(e) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (draggedId) setDropTarget({ column: value, index: indexFromPointer(e.clientY) })
        }}
        onDragLeave={(e) => {
          if (columnRef.current && !columnRef.current.contains(e.relatedTarget as Node)) {
            setDropTarget((t) => (t?.column === value ? null : t))
          }
        }}
        onDrop={(e) => {
          e.preventDefault()
          if (!draggedId) return
          setDropTarget(null)
          moveCard(draggedId, value)
        }}
      >
        {children}
      </section>
    </KanbanBoardColumnContext.Provider>
  )
}

export function KanbanBoardColumnHeader({ children }: { children: ReactNode }) {
  return <div className="mb-3 flex items-center gap-2">{children}</div>
}

export function KanbanBoardColumnTitle({ children }: { children: ReactNode }) {
  return (
    <span className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em]">
      {children}
    </span>
  )
}

export function KanbanBoardColumnCount() {
  const { ids } = useKanbanColumn()
  return <span className="text-[13px] text-muted">({ids.length})</span>
}

export function KanbanBoardColumnEmpty({ children }: { children: ReactNode }) {
  const { ids } = useKanbanColumn()
  if (ids.length > 0) return null
  return (
    <div className="rounded-[10px] border border-dashed border-border p-3 text-[13px] text-muted">
      {children}
    </div>
  )
}

export function KanbanBoardCards({ children }: { children: ReactNode }) {
  const { draggedId, draggedHeight, dropTarget } = useKanban()
  const { value: columnValue } = useKanbanColumn()
  const items = Children.toArray(children)
  const showSlot = draggedId !== null && dropTarget?.column === columnValue
  if (showSlot) {
    const index = Math.min(dropTarget.index, items.length)
    items.splice(
      index,
      0,
      <div
        key="__drop-slot__"
        className="mb-3 rounded-[10px] border border-dashed border-border bg-panel"
        style={{ height: draggedHeight || 120 }}
        aria-hidden="true"
      />,
    )
  }
  return <div className="flex flex-col">{items}</div>
}

export interface KanbanBoardCardProps {
  value: string
  label: string
  className?: string
  children: ReactNode
}

export function KanbanBoardCard({ value, label, className, children }: KanbanBoardCardProps) {
  const { columns, draggedId, setDragged, moveCard } = useKanban()
  const { value: columnValue } = useKanbanColumn()
  const isDragging = draggedId === value

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!e.ctrlKey && !e.metaKey) return
    const idx = columns.indexOf(columnValue)
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault()
      moveCard(value, columns[idx - 1])
    } else if (e.key === 'ArrowRight' && idx < columns.length - 1) {
      e.preventDefault()
      moveCard(value, columns[idx + 1])
    }
  }

  return (
    <div
      data-kanban-card={value}
      draggable
      tabIndex={0}
      role="group"
      aria-label={`${value}, ${label}`}
      title="Drag, or press Ctrl + Left / Right to move between columns"
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', value)
        e.dataTransfer.effectAllowed = 'move'
        setDragged(value, e.currentTarget.getBoundingClientRect().height)
      }}
      onDragEnd={() => setDragged(null)}
      onKeyDown={handleKeyDown}
      className={cn(
        'rounded-[10px] outline-none focus-visible:ring-2 focus-visible:ring-working',
        isDragging && 'opacity-40',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function KanbanBoardCardTitle({ children }: { children: ReactNode }) {
  return <div className="font-semibold leading-snug">{children}</div>
}

export function KanbanBoardCardMeta({ children }: { children: ReactNode }) {
  return <div className="flex flex-wrap items-center gap-2 text-[12px] text-muted">{children}</div>
}
