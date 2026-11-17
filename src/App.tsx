import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase, supabaseConfigured, supabaseUrl } from './lib/supabase'
import type { Category, Rung, Status, Ticket } from './lib/supabase'
import { CATEGORIES, RUNGS, STATUSES } from './lib/supabase'
import TaskRow, { liveStatusFor, TaskRowSkeleton } from './components/TaskRow'
import {
  KanbanBoard,
  KanbanBoardCard,
  KanbanBoardCards,
  KanbanBoardColumn,
  KanbanBoardColumnCount,
  KanbanBoardColumnEmpty,
  KanbanBoardColumnHeader,
  KanbanBoardColumnTitle,
} from './components/ui/kanban-board'
import type { KanbanBoardValue } from './components/ui/kanban-board'
import { buildValue, findMove } from './lib/kanban-value'
import { Button } from './components/ui/button'

// T-004. Task board — Mario. Vite + React + TypeScript, Tailwind v4,
// shadcn/ui where it fits. A real web app, not a static HTML file.
// Tickets live in Supabase, table public.tickets, project
// https://mezmipuyoedxgeszublx.supabase.co, five statuses only:
// Todo, Working, Blocked, Ready for Review, Done.
// Source: ~/workspace/team/board.md via Rapi, seed T-001 to T-005.
// No key box: the publishable key comes from Vercel env vars only.
// Pattern, from Taste Skill: the app-screen route — quiet panels, aligned
// figures, colour spent on data. One palette, dark Nomi theme.

interface EditForm {
  title: string
  owner: string
  rung: Rung | string
  status: Status
  category: Category | string
  block_reason: string
}

function nextTicketId(tickets: Ticket[]): string {
  let max = 0
  tickets.forEach((t) => {
    const m = /^T-(\d+)$/.exec(t.ticket_id || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return 'T-' + String(max + 1).padStart(3, '0')
}

export default function App() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [loading, setLoading] = useState(true)
  const [connStatus, setConnStatus] = useState('Checking…')
  const [realtime, setRealtime] = useState('Checking…')
  const [testState, setTestState] = useState<'idle' | 'waiting' | 'received' | 'failed'>('idle')
  const [testMsg, setTestMsg] = useState('')
  const testTimer = useRef<number | undefined>(undefined)
  const testStart = useRef(0)

  // Visible Live dot, T-004: green when the channel is subscribed, red when
  // it failed, grey while checking. Static, no pulse — the pulsing dot on a
  // running TaskRow is already the one animated element on the page.
  function realtimeDot(): string {
    if (realtime.startsWith('Live')) return 'green'
    if (realtime.startsWith('Not live')) return 'red'
    return 'grey'
  }
  const [banner, setBanner] = useState('')
  const [editing, setEditing] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<EditForm | null>(null)
  const [filter, setFilter] = useState<'All' | Status>('All')
  const [justDoneId, setJustDoneId] = useState<string | null>(null)
  const editFormRef = useRef<HTMLFormElement | null>(null)
  const justDoneTimer = useRef<number | undefined>(undefined)

  const load = useCallback(async () => {
    if (!supabaseConfigured || !supabase) {
      setTickets([])
      setLoading(false)
      setConnStatus('Not live: Supabase env vars are not set in Vercel.')
      setBanner(
        'Supabase is not connected. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel, or check that the Supabase integration set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY, then redeploy. No key is typed in the browser.',
      )
      return
    }
    const { data, error } = await supabase
      .from('tickets')
      .select('*')
      .order('created_at', { ascending: true })
    setLoading(false)
    if (error) {
      setTickets([])
      setConnStatus('Not live: ' + error.message)
      setBanner(
        'Supabase table not found yet: ' +
          error.message +
          '. Run the tickets SQL, then enable Realtime on public.tickets.',
      )
      return
    }
    setTickets((data ?? []) as Ticket[])
    setBanner('')
    setConnStatus('Live: connected to Supabase, ' + (data?.length ?? 0) + ' tickets.')
  }, [])

  useEffect(() => {
    load()
    if (!supabaseConfigured || !supabase) return undefined
    const client = supabase
    // Realtime fix, T-004: subscribe with a status callback. Before this,
    // the board said "Live" from the REST read alone, even if the channel
    // failed or the table was not in the publication, and nothing showed it.
    // SUBSCRIBED means the channel joined, not that the table is in the
    // publication — only a live event proves that. A channel error, timeout,
    // or close now says so on the board instead of failing silently.
    const channel = client
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, load)
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setRealtime('Live: channel subscribed, updates arrive without refresh.')
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtime('Not live: Realtime channel ' + status + '.')
          setBanner(
            'Realtime is not connected (' +
              status +
              '). Changes from another browser will not appear until you refresh. Enable Realtime on public.tickets in Supabase, Database > Replication, or press Enable Realtime in the SQL editor page.',
          )
        }
      })
    return () => {
      client.removeChannel(channel)
    }
  }, [load])

  // Test live updates, T-004: when the test is waiting and T-999 shows up in
  // the tickets the Realtime event re-loaded, the live event arrived. The
  // test never calls load() itself after the insert, so a missing event
  // cannot be masked by a manual refresh.
  useEffect(() => {
    if (testState !== 'waiting') return
    if (!tickets.some((t) => t.ticket_id === 'T-999')) return
    window.clearTimeout(testTimer.current)
    const elapsed = ((Date.now() - testStart.current) / 1000).toFixed(1)
    setTestState('received')
    setTestMsg('Live event received in ' + elapsed + 's. Removing the test ticket…')
    if (!supabase) return
    const client = supabase
    client
      .from('tickets')
      .delete()
      .eq('ticket_id', 'T-999')
      .then(() => {
        window.setTimeout(() => {
          setTestMsg('Live event received in ' + elapsed + 's. Test ticket removed.')
          void load()
        }, 1000)
      })
  }, [tickets, testState, load])

  async function runRealtimeTest() {
    if (!supabaseConfigured || !supabase) {
      setTestState('failed')
      setTestMsg('Supabase is not connected yet. Set the env vars in Vercel first.')
      return
    }
    setTestState('waiting')
    setTestMsg('Adding test ticket T-999. Waiting for the live event…')
    // Remove any leftover test ticket from an earlier run, then insert fresh.
    await supabase.from('tickets').delete().eq('ticket_id', 'T-999')
    const { error } = await supabase.from('tickets').insert({
      ticket_id: 'T-999',
      title: 'Realtime test — Bantu',
      owner: 'Bantu',
      rung: 'DRAFT',
      status: 'Working',
      category: 'Misc',
      block_reason: '',
    })
    if (error) {
      window.clearTimeout(testTimer.current)
      setTestState('failed')
      setTestMsg('Test insert failed: ' + error.message)
      return
    }
    testStart.current = Date.now()
    testTimer.current = window.setTimeout(() => {
      setTestState('failed')
      setTestMsg(
        'No live event in 10 seconds. Realtime is off for public.tickets — press Enable Realtime in the SQL editor page, or toggle it in Supabase Dashboard, Database, Replication, then try again.',
      )
    }, 10000)
  }

  async function changeStatus(id: string, status: Status) {
    if (!STATUSES.includes(status)) return
    const t = tickets.find((x) => x.ticket_id === id)
    if (!t || t.status === status) return
    if (!supabaseConfigured || !supabase) {
      setBanner('Not saved to Supabase yet. Set the env vars in Vercel first.')
      return
    }
    const { error } = await supabase.from('tickets').update({ status }).eq('ticket_id', id)
    if (error) {
      setBanner('Save failed: ' + error.message + '. The card stays where it was.')
      return
    }
    if (status === 'Done') {
      setJustDoneId(id)
      window.clearTimeout(justDoneTimer.current)
      justDoneTimer.current = window.setTimeout(() => setJustDoneId(null), 1500)
    }
    await load()
  }

  // Kanban onValueChange, T-004: the board is controlled by Supabase state,
  // so the new value is diffed against the tickets, and the one card that
  // changed column is written to Supabase. A reorder inside one column
  // reports no move, because the database has no position to write.
  function handleValueChange(next: KanbanBoardValue) {
    const move = findMove(buildValue(tickets), next)
    if (!move) return
    void changeStatus(move.id, move.to)
  }

  function openEdit(t: Ticket) {
    setEditing(t.ticket_id)
    setEditForm({
      title: t.title,
      owner: t.owner || '',
      rung: t.rung || 'DRAFT',
      status: t.status,
      category: t.category || 'Misc',
      block_reason: t.block_reason || '',
    })
    window.setTimeout(() => {
      editFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }, 0)
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault()
    if (!editing || !editForm) return
    const row = {
      title: editForm.title.trim(),
      owner: editForm.owner.trim(),
      rung: editForm.rung,
      status: editForm.status,
      category: editForm.category,
      block_reason: editForm.block_reason.trim(),
    }
    if (!supabaseConfigured || !supabase) {
      setBanner('Not saved to Supabase yet. Set the env vars in Vercel first.')
      return
    }
    const { error } = await supabase.from('tickets').update(row).eq('ticket_id', editing)
    if (error) {
      setBanner('Save failed: ' + error.message)
      return
    }
    setEditing(null)
    setEditForm(null)
    await load()
  }

  async function deleteEditing() {
    if (!editing) return
    if (!window.confirm('Delete ' + editing + '?')) return
    if (!supabaseConfigured || !supabase) {
      setBanner('Not saved to Supabase yet. Set the env vars in Vercel first.')
      return
    }
    const { error } = await supabase.from('tickets').delete().eq('ticket_id', editing)
    if (error) {
      setBanner('Delete failed: ' + error.message)
      return
    }
    setEditing(null)
    setEditForm(null)
    await load()
  }

  async function addTicket(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const f = new FormData(e.currentTarget)
    const row = {
      ticket_id: nextTicketId(tickets),
      title: String(f.get('title')).trim(),
      owner: String(f.get('owner')).trim(),
      rung: String(f.get('rung')),
      status: String(f.get('status')) as Status,
      category: String(f.get('category') || 'Misc'),
      block_reason: String(f.get('block_reason')).trim(),
    }
    if (!supabaseConfigured || !supabase) {
      setBanner('Added locally only, as ' + row.ticket_id + '. Not saved to Supabase yet.')
      setTickets([...tickets, row as Ticket])
      e.currentTarget.reset()
      return
    }
    const { error } = await supabase.from('tickets').insert(row)
    if (error) {
      setBanner('Add failed: ' + error.message)
      return
    }
    e.currentTarget.reset()
    await load()
  }

  return (
    <main>
      <h1>Task board</h1>
      <p className="sub">
        Mario — what we are working on, where work is waiting, what happens next. T-004, rung
        DRAFT. Five statuses only: Todo, Working, Blocked, Ready for Review, Done.
      </p>
      {banner && (
        <div id="banner" className="show">
          {banner}
        </div>
      )}
      <div id="settings">
        <strong>Supabase connection</strong>
        <br />
        Project: {supabaseUrl || 'https://mezmipuyoedxgeszublx.supabase.co'}
        <br />
        <span>{connStatus}</span>
        <br />
        <span className={'dot dot-' + realtimeDot()} aria-hidden="true"></span>{' '}
        <span>
          Realtime: {realtime}
        </span>
        <br />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={testState === 'waiting' || !supabaseConfigured}
          onClick={runRealtimeTest}
        >
          {testState === 'waiting' ? 'Testing live updates…' : 'Test live updates'}
        </Button>{' '}
        {testMsg && <span>{testMsg}</span>}
        <br />
        The publishable key comes from Vercel env vars, never typed in this browser and
        never in the repo.
      </div>
      <div
        className="flex gap-2 flex-wrap mb-4"
        role="group"
        aria-label="Filter tickets by status"
      >
        {(['All', ...STATUSES] as const).map((s) => {
          const count = s === 'All' ? tickets.length : tickets.filter((t) => t.status === s).length
          const active = filter === s
          return (
            <Button
              key={s}
              variant={active ? 'default' : 'ghost'}
              size="sm"
              type="button"
              aria-pressed={active}
              onClick={() => setFilter(active ? 'All' : s)}
            >
              {s} ({count})
            </Button>
          )
        })}
      </div>
      <p className="sub">
        Drag a card between columns, or focus a card and press Ctrl + Left / Right to move
        it. The status menu on each card still works too.
      </p>
      <KanbanBoard value={buildValue(tickets)} onValueChange={handleValueChange}>
        {STATUSES.map((status) => (
          <KanbanBoardColumn
            key={status}
            value={status}
            label={status}
            className={filter !== 'All' && filter !== status ? ' opacity-40' : ''}
          >
            <KanbanBoardColumnHeader>
              <KanbanBoardColumnTitle>
                <span className={'dot dot-' + statusDot(status)}></span>
                {status}
              </KanbanBoardColumnTitle>
              <KanbanBoardColumnCount />
            </KanbanBoardColumnHeader>
            <KanbanBoardCards>
              {loading ? (
                <>
                  <TaskRowSkeleton />
                  <TaskRowSkeleton />
                </>
              ) : (
                tickets
                  .filter((t) => t.status === status)
                  .map((t) => (
                    <KanbanBoardCard key={t.ticket_id} value={t.ticket_id} label={t.title}>
                      <TaskRow
                        id={t.ticket_id}
                        title={t.title}
                        owner={t.owner || ''}
                        rung={t.rung || ''}
                        status={t.status}
                        category={t.category || 'Misc'}
                        liveStatus={liveStatusFor(t.status)}
                        blockReason={t.block_reason || undefined}
                        justCompleted={justDoneId === t.ticket_id}
                        onChangeStatus={changeStatus}
                        onEdit={() => openEdit(t)}
                      />
                    </KanbanBoardCard>
                  ))
              )}
            </KanbanBoardCards>
            {!loading && (
              <KanbanBoardColumnEmpty>No tickets in {status}.</KanbanBoardColumnEmpty>
            )}
          </KanbanBoardColumn>
        ))}
      </KanbanBoard>

      {editing && editForm && (
        <form ref={editFormRef} className="panel show" onSubmit={saveEdit}>
          <strong>
            Edit ticket <span>{editing}</span>
          </strong>
          <input
            placeholder="Short title"
            required
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
          />
          <input
            placeholder="Owner"
            value={editForm.owner}
            onChange={(e) => setEditForm({ ...editForm, owner: e.target.value })}
          />
          <select
            value={editForm.rung}
            onChange={(e) => setEditForm({ ...editForm, rung: e.target.value })}
          >
            {RUNGS.map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
          <select
            value={editForm.status}
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Status })}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <select
            value={editForm.category}
            onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
            aria-label="Category"
          >
            {CATEGORIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
          <input
            placeholder="Block reason, if Blocked"
            value={editForm.block_reason}
            onChange={(e) => setEditForm({ ...editForm, block_reason: e.target.value })}
          />
          <Button type="submit">Save</Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setEditing(null)
              setEditForm(null)
            }}
          >
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={deleteEditing}>
            Delete
          </Button>
        </form>
      )}

      <form className="panel" onSubmit={addTicket}>
        <strong>Add a ticket</strong>
        <p style={{ margin: '6px 0', fontSize: 13, color: 'var(--muted)' }}>
          Ticket ID is assigned automatically, next in order, for example T-006. You do not
          type it.
        </p>
        <input name="title" placeholder="Short title" required />
        <input name="owner" placeholder="Owner" />
        <select name="rung">
          {RUNGS.map((r) => (
            <option key={r}>{r}</option>
          ))}
        </select>
        <select name="status" defaultValue="Working">
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select name="category" defaultValue="Misc" aria-label="Category">
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <input name="block_reason" placeholder="Block reason, if Blocked" />
        <Button type="submit">Add ticket</Button>
      </form>
      <footer>
        Sources: ~/workspace/team/board.md, via Rapi via Nara, five statuses only;
        ~/workspace/team/support/supabase-tickets.sql, seed T-001 to T-005;
        ~/workspace/team/explorations/jelajah-2026-11-17-kanban-live.md, Supabase Realtime.
        Project: https://mezmipuyoedxgeszublx.supabase.co. No secret key in this code. Date:
        2026-11-17.
      </footer>
    </main>
  )
}

function statusDot(s: Status): string {
  return s === 'Done'
    ? 'green'
    : s === 'Blocked'
      ? 'red'
      : s === 'Ready for Review'
        ? 'blue'
        : s === 'Todo'
          ? 'grey'
          : 'yellow'
}
