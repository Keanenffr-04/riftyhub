import { useState, type FormEvent } from 'react'
import { Check, Pencil, StickyNote, X } from 'lucide-react'
import { MAX_NOTE, cleanNote } from '../utils/saved'

interface Props {
  login: string
  note: string
  onSave: (note: string) => void
}

/** The note on one saved profile: shown as text, with a small editor behind the Add/Edit button. */
export default function SavedNote({ login, note, onSave }: Props) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(note)

  function startEditing() {
    setDraft(note)
    setEditing(true)
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    onSave(cleanNote(draft))
    setEditing(false)
  }

  if (editing) {
    const id = `note-${login}`
    return (
      <form className="note-form" onSubmit={handleSubmit}>
        <label htmlFor={id} className="sr-only">
          Note about @{login}
        </label>
        <textarea
          id={id}
          className="note-input"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_NOTE}
          rows={4}
          placeholder="Why you saved this developer, what to follow up on…"
          autoFocus
        />
        <div className="note-actions">
          <span className="muted small" aria-live="polite">
            {draft.length} / {MAX_NOTE}
          </span>
          <button type="submit" className="btn btn-primary">
            <Check size={14} aria-hidden="true" /> Save note
          </button>
          <button type="button" className="btn" onClick={() => setEditing(false)}>
            <X size={14} aria-hidden="true" /> Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="note-view">
      {note && <p className="note-text">{note}</p>}
      <button type="button" className="note-toggle" onClick={startEditing}>
        {note ? <Pencil size={13} aria-hidden="true" /> : <StickyNote size={13} aria-hidden="true" />} {note ? 'Edit note' : 'Add note'}
        <span className="sr-only"> for @{login}</span>
      </button>
    </div>
  )
}
