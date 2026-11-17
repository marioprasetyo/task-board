import type { Status, Ticket } from './supabase'
import { STATUSES } from './supabase'

// Kanban board value, from Kanban Board by victor-teles, 21st.dev,
// published 2026-10-18: a record of column to card IDs. The board is
// controlled by Supabase state, so the value is derived from the tickets
// on every render, and onValueChange only ever moves a card between
// columns. There is no position column in the database, so a reorder
// inside one column has nowhere to persist and is not offered.

export type KanbanBoardValue = Record<string, string[]>

export function buildValue(tickets: Ticket[]): KanbanBoardValue {
  const value: KanbanBoardValue = {}
  for (const s of STATUSES) value[s] = []
  for (const t of tickets) {
    const status = t.status as Status
    if (!value[status]) value[status] = []
    value[status].push(t.ticket_id)
  }
  return value
}

export interface KanbanMove {
  id: string
  to: Status
}

// The one card that changed column between two values, or null when
// nothing moved between columns. A reorder inside one column returns
// null, because the database has no position to write it to.
export function findMove(prev: KanbanBoardValue, next: KanbanBoardValue): KanbanMove | null {
  for (const status of Object.keys(next)) {
    for (const id of next[status]) {
      const wasIn = Object.keys(prev).find((s) => prev[s].includes(id))
      if (wasIn && wasIn !== status) {
        return { id, to: status as Status }
      }
    }
  }
  return null
}
