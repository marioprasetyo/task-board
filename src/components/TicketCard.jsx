export const STATUSES = ['Todo', 'Working', 'Blocked', 'Ready for Review', 'Done']

export function statusClass(s) {
  return s === 'Done'
    ? 'status-done'
    : s === 'Blocked'
      ? 'status-blocked'
      : s === 'Ready for Review'
        ? 'status-review'
        : s === 'Todo'
          ? 'status-todo'
          : 'status-working'
}

export function cardClass(s) {
  return s === 'Done'
    ? 'done'
    : s === 'Blocked'
      ? 'blocked'
      : s === 'Ready for Review'
        ? 'review'
        : s === 'Todo'
          ? 'todo'
          : 'working'
}

// Task Row / Ticket Card. Fields in order: Ticket ID bold first, short
// title, owner, rung, one-line status / block reason. Source: T-004 board,
// ~/workspace/team/board.md via Rapi, five statuses only.
export default function TicketCard({ ticket, onChangeStatus, onEdit }) {
  const statusOptions = STATUSES.map((s) => (
    <option key={s} value={s}>
      {s}
    </option>
  ))
  return (
    <article
      className={'card ' + cardClass(ticket.status)}
      draggable
      onDragStart={(e) => e.dataTransfer.setData('text/plain', ticket.ticket_id)}
    >
      <div className="row">
        <span className="id">{ticket.ticket_id}</span>
        <span className={'status ' + statusClass(ticket.status)}>{ticket.status}</span>
      </div>
      <div className="title">{ticket.title}</div>
      <dl>
        <dt>Owner:</dt> <dd>{ticket.owner || ''}</dd>
        <dt>Rung:</dt> <dd>{ticket.rung || ''}</dd>
        <dt>Status:</dt>{' '}
        <dd>
          {ticket.status}
          {ticket.block_reason ? ' — ' + ticket.block_reason : ''}
        </dd>
      </dl>
      <div className="actions">
        <select
          className="status-menu"
          aria-label="Change status"
          value={ticket.status}
          onChange={(e) => onChangeStatus(ticket.ticket_id, e.target.value)}
        >
          {statusOptions}
        </select>
        <button type="button" onClick={() => onEdit(ticket)}>
          Edit
        </button>
      </div>
    </article>
  )
}
