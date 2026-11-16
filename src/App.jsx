import { useCallback, useEffect, useState } from 'react'
import { supabase, supabaseConfigured, supabaseUrl } from './lib/supabase.js'
import TicketCard, { STATUSES } from './components/TicketCard.jsx'

// T-004. Task board — Mario. Vite + React, real web app, not a static HTML
// file. Tickets live in Supabase, table public.tickets, project
// https://mezmipuyoedxgeszublx.supabase.co, five statuses only:
// Todo, Working, Blocked, Ready for Review, Done.
// Source: ~/workspace/team/board.md via Rapi, seed T-001 to T-005.
// No key box: the publishable key comes from Vercel env vars only.
const RUNGS = ['DRAFT', 'INVESTIGATE', 'AUTOPILOT', 'FULL AUTOPILOT']

function nextTicketId(tickets) {
  let max = 0
  tickets.forEach((t) => {
    const m = /^T-(\d+)$/.exec(t.ticket_id || '')
    if (m) max = Math.max(max, parseInt(m[1], 10))
  })
  return 'T-' + String(max + 1).padStart(3, '0')
}

export default function App() {
  const [tickets, setTickets] = useState([])
  const [connStatus, setConnStatus] = useState('Checking…')
  const [banner, setBanner] = useState('')
  const [editing, setEditing] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [dragOver, setDragOver] = useState('')

  const load = useCallback(async () => {
    if (!supabaseConfigured) {
      setTickets([])
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
    setTickets(data)
    setBanner('')
    setConnStatus('Live: connected to Supabase, ' + data.length + ' tickets.')
  }, [])

  useEffect(() => {
    load()
    if (!supabaseConfigured) return undefined
    const channel = supabase
      .channel('tickets-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tickets' }, load)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [load])

  async function changeStatus(id, status) {
    if (!STATUSES.includes(status)) return
    const t = tickets.find((x) => x.ticket_id === id)
    if (!t || t.status === status) return
    if (!supabaseConfigured) {
      setBanner('Not saved to Supabase yet. Set the env vars in Vercel first.')
      return
    }
    const { error } = await supabase.from('tickets').update({ status }).eq('ticket_id', id)
    if (error) {
      setBanner('Save failed: ' + error.message + '. The card stays where it was.')
      return
    }
    await load()
  }

  function openEdit(t) {
    setEditing(t.ticket_id)
    setEditForm({
      title: t.title,
      owner: t.owner || '',
      rung: t.rung || 'DRAFT',
      status: t.status,
      block_reason: t.block_reason || '',
    })
  }

  async function saveEdit(e) {
    e.preventDefault()
    if (!editing) return
    const row = {
      title: editForm.title.trim(),
      owner: editForm.owner.trim(),
      rung: editForm.rung,
      status: editForm.status,
      block_reason: editForm.block_reason.trim(),
    }
    if (!supabaseConfigured) {
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
    if (!supabaseConfigured) {
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

  async function addTicket(e) {
    e.preventDefault()
    const f = new FormData(e.target)
    const row = {
      ticket_id: nextTicketId(tickets),
      title: String(f.get('title')).trim(),
      owner: String(f.get('owner')).trim(),
      rung: String(f.get('rung')),
      status: String(f.get('status')),
      block_reason: String(f.get('block_reason')).trim(),
    }
    if (!supabaseConfigured) {
      setBanner('Added locally only, as ' + row.ticket_id + '. Not saved to Supabase yet.')
      setTickets([...tickets, row])
      e.target.reset()
      return
    }
    const { error } = await supabase.from('tickets').insert(row)
    if (error) {
      setBanner('Add failed: ' + error.message)
      return
    }
    e.target.reset()
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
        The publishable key comes from Vercel env vars, never typed in this browser and
        never in the repo.
      </div>
      <div className="board">
        {STATUSES.map((status) => (
          <section
            key={status}
            className={'col' + (dragOver === status ? ' drag-over' : '')}
            data-status={status}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(status)
            }}
            onDragLeave={() => setDragOver('')}
            onDrop={async (e) => {
              e.preventDefault()
              setDragOver('')
              await changeStatus(e.dataTransfer.getData('text/plain'), status)
            }}
          >
            <h2>
              <span className={'dot dot-' + statusClass(status)}></span>
              {status}
            </h2>
            <div className="cards">
              {tickets
                .filter((t) => t.status === status)
                .map((t) => (
                  <TicketCard
                    key={t.ticket_id}
                    ticket={t}
                    onChangeStatus={changeStatus}
                    onEdit={openEdit}
                  />
                ))}
            </div>
          </section>
        ))}
      </div>

      {editing && editForm && (
        <form className="panel show" onSubmit={saveEdit}>
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
            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
          >
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <input
            placeholder="Block reason, if Blocked"
            value={editForm.block_reason}
            onChange={(e) => setEditForm({ ...editForm, block_reason: e.target.value })}
          />
          <button type="submit">Save</button>
          <button
            type="button"
            className="ghost"
            onClick={() => {
              setEditing(null)
              setEditForm(null)
            }}
          >
            Cancel
          </button>
          <button type="button" className="danger" onClick={deleteEditing}>
            Delete
          </button>
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
        <input name="block_reason" placeholder="Block reason, if Blocked" />
        <button type="submit">Add ticket</button>
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

function statusClass(s) {
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
