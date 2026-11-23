import { useRef, useState, type ChangeEvent } from 'react'
import { ArrowDown, ArrowUp, Download, GripVertical, KeyRound, RotateCcw, Trash2, Upload } from 'lucide-react'
import { usePreferences } from '../hooks/usePreferences'
import { presetsStore } from '../hooks/usePresets'
import { pinsStore } from '../hooks/usePins'
import { mergePins } from '../utils/pins'
import { getSavedData, replaceSavedData, useSavedProfiles } from '../hooks/useSavedProfiles'
import { SECTION_INFO, moveSection, moveSectionTo, setSectionVisible, type Density, type RepoDefaults, type RepoView, type SectionId, type ThemePref } from '../utils/preferences'
import { mergePresets } from '../utils/presets'
import { SORT_OPTIONS, defaultDir, type SortKey } from '../utils/repoFilters'
import { checkToken } from '../services/github'
import { isValidTokenFormat, setToken, useToken } from '../services/token'
import { buildBackup, mergeCollections, mergeProfiles, parseBackup } from '../utils/saved'

function download(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export default function SettingsPage() {
  const { preferences, update, reset } = usePreferences()
  const { profiles, collections } = useSavedProfiles()
  const fileRef = useRef<HTMLInputElement>(null)
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  const setDefaults = (patch: Partial<RepoDefaults>) => update({ repoDefaults: { ...preferences.repoDefaults, ...patch } })
  const defaults = preferences.repoDefaults
  const [dragId, setDragId] = useState<SectionId | null>(null)
  const [overId, setOverId] = useState<SectionId | null>(null)
  const token = useToken()
  const [tokenInput, setTokenInput] = useState('')
  const [checking, setChecking] = useState(false)
  const [tokenNotice, setTokenNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null)

  async function handleSaveToken() {
    const value = tokenInput.trim()
    if (!isValidTokenFormat(value)) {
      setTokenNotice({ kind: 'error', text: 'That doesn’t look like a GitHub token. Tokens start with ghp_ or github_pat_.' })
      return
    }
    setChecking(true)
    setTokenNotice(null)
    const result = await checkToken(value)
    setChecking(false)
    if (result.ok) {
      setToken(value)
      setTokenInput('')
      setTokenNotice({ kind: 'ok', text: result.limit ? `Token saved. GitHub now allows ${result.limit.toLocaleString()} requests per hour.` : 'Token saved.' })
    } else if (result.reason === 'rejected') {
      setTokenNotice({ kind: 'error', text: 'GitHub rejected this token. Check that you copied all of it and that it has not expired.' })
    } else {
      setTokenNotice({ kind: 'error', text: 'Could not reach GitHub to check the token, so it was not saved. Try again in a moment.' })
    }
  }

  function handleRemoveToken() {
    setToken('')
    setTokenNotice({ kind: 'ok', text: 'Token removed from this browser.' })
  }

  function handleExport() {
    const { profiles: p, collections: c } = getSavedData()
    download(`riftyhub-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(buildBackup(preferences, p, c, presetsStore.get(), pinsStore.get()), null, 2))
    setNotice({ kind: 'ok', text: 'Backup downloaded.' })
  }

  async function handleImport(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const parsed = parseBackup(await file.text())
    if (!parsed.ok) {
      setNotice({ kind: 'error', text: parsed.error })
      return
    }
    const current = getSavedData()
    const mergedProfiles = mergeProfiles(current.profiles, parsed.profiles)
    replaceSavedData(mergedProfiles, mergeCollections(current.collections, parsed.collections, mergedProfiles))
    if (parsed.preferences) update(parsed.preferences)
    presetsStore.set(mergePresets(presetsStore.get(), parsed.presets))
    pinsStore.set(mergePins(pinsStore.get(), parsed.pins))
    setNotice({
      kind: 'ok',
      text: `Imported ${parsed.profiles.length} saved ${parsed.profiles.length === 1 ? 'profile' : 'profiles'}, ${parsed.collections.length} ${parsed.collections.length === 1 ? 'collection' : 'collections'} and ${parsed.presets.length} filter ${parsed.presets.length === 1 ? 'preset' : 'presets'}. Existing saved profiles and presets were kept.`,
    })
  }

  return (
    <div className="stack">
      <div>
        <h1 className="page-title">Settings</h1>
        <p className="muted">Your preferences are saved in this browser and applied every time you open RiftyHub.</p>
      </div>

      <section className="card panel" aria-labelledby="overview-settings">
        <h2 id="overview-settings">Overview layout</h2>
        <p className="muted small">Choose which sections appear under the profile card on a developer’s Overview page, and in what order. Drag a row by its handle with a mouse, or use the arrow buttons (these also work with a keyboard and on touch screens).</p>
        <ul className="section-list">
          {preferences.overview.map((s, i) => (
            <li
              key={s.id}
              className={`${dragId === s.id ? 'dragging' : ''}${overId === s.id && dragId !== s.id ? ' drop-target' : ''}`}
              draggable
              onDragStart={(e) => {
                setDragId(s.id)
                e.dataTransfer.effectAllowed = 'move'
                e.dataTransfer.setData('text/plain', s.id)
              }}
              onDragOver={(e) => {
                if (!dragId) return
                e.preventDefault()
                setOverId(s.id)
              }}
              onDrop={(e) => {
                e.preventDefault()
                if (dragId) update({ overview: moveSectionTo(preferences.overview, dragId, s.id) })
                setDragId(null)
                setOverId(null)
              }}
              onDragEnd={() => {
                setDragId(null)
                setOverId(null)
              }}
            >
              <span className="drag-handle" aria-hidden="true" title="Drag to reorder">
                <GripVertical size={16} />
              </span>
              <label className="check">
                <input type="checkbox" checked={s.visible} onChange={(e) => update({ overview: setSectionVisible(preferences.overview, s.id, e.target.checked) })} />
                <span>
                  <strong>{SECTION_INFO[s.id].label}</strong>
                  <span className="muted small block">{SECTION_INFO[s.id].description}</span>
                </span>
              </label>
              <span className="section-moves">
                <button className="icon-btn" disabled={i === 0} onClick={() => update({ overview: moveSection(preferences.overview, s.id, -1) })} aria-label={`Move ${SECTION_INFO[s.id].label} up`}>
                  <ArrowUp size={16} />
                </button>
                <button
                  className="icon-btn"
                  disabled={i === preferences.overview.length - 1}
                  onClick={() => update({ overview: moveSection(preferences.overview, s.id, 1) })}
                  aria-label={`Move ${SECTION_INFO[s.id].label} down`}
                >
                  <ArrowDown size={16} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section className="card panel" aria-labelledby="display-settings">
        <h2 id="display-settings">Display</h2>
        <div className="setting-row">
          <span>
            <strong>Theme</strong>
            <span className="muted small block">System follows your device’s light or dark setting. The sun/moon button at the top of every page switches quickly.</span>
          </span>
          <div className="toggle" role="group" aria-label="Theme">
            {(['system', 'dark', 'light'] as ThemePref[]).map((t) => (
              <button key={t} className={preferences.theme === t ? 'active' : ''} aria-pressed={preferences.theme === t} onClick={() => update({ theme: t })}>
                {t === 'system' ? 'System' : t === 'dark' ? 'Dark' : 'Light'}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span>
            <strong>Density</strong>
            <span className="muted small block">Compact fits more on screen by tightening spacing.</span>
          </span>
          <div className="toggle" role="group" aria-label="Density">
            {(['comfortable', 'compact'] as Density[]).map((d) => (
              <button key={d} className={preferences.density === d ? 'active' : ''} aria-pressed={preferences.density === d} onClick={() => update({ density: d })}>
                {d === 'comfortable' ? 'Comfortable' : 'Compact'}
              </button>
            ))}
          </div>
        </div>
        <div className="setting-row">
          <span>
            <strong>Repository layout</strong>
            <span className="muted small block">How the Repositories page starts. You can still switch it on the page.</span>
          </span>
          <div className="toggle" role="group" aria-label="Repository layout">
            {(['cards', 'table'] as RepoView[]).map((v) => (
              <button key={v} className={preferences.repoView === v ? 'active' : ''} aria-pressed={preferences.repoView === v} onClick={() => update({ repoView: v })}>
                {v === 'cards' ? 'Cards' : 'Table'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <button className="btn" onClick={reset}>
            <RotateCcw size={14} /> Reset preferences
          </button>
        </div>
      </section>

      <section className="card panel" aria-labelledby="repo-defaults">
        <h2 id="repo-defaults">Repositories page defaults</h2>
        <p className="muted small">
          How the Repositories page starts when its address has no sort or filter of its own. Anything you change on the page itself still wins, and links you share only carry what you changed.
        </p>
        <div className="setting-row">
          <span>
            <strong>Sort by</strong>
            <span className="muted small block">The order repositories are listed in.</span>
          </span>
          <div className="controls">
            <select className="select" value={defaults.sort} onChange={(e) => setDefaults({ sort: e.target.value as SortKey, dir: defaultDir(e.target.value as SortKey) })} aria-label="Default sort">
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <div className="toggle" role="group" aria-label="Default sort direction">
              {(['desc', 'asc'] as const).map((d) => (
                <button key={d} className={defaults.dir === d ? 'active' : ''} aria-pressed={defaults.dir === d} onClick={() => setDefaults({ dir: d })}>
                  {d === 'desc' ? 'Descending' : 'Ascending'}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="controls">
          <label className="check">
            <input type="checkbox" checked={defaults.hideForks} onChange={(e) => setDefaults({ hideForks: e.target.checked })} /> Hide forks
          </label>
          <label className="check">
            <input type="checkbox" checked={defaults.hideArchived} onChange={(e) => setDefaults({ hideArchived: e.target.checked })} /> Hide archived
          </label>
        </div>
      </section>

      <section className="card panel" aria-labelledby="token-settings">
        <h2 id="token-settings">GitHub token (optional)</h2>
        <p className="muted small">
          Without a token GitHub allows 60 requests per hour. With one it allows 5,000. Create a fine-grained token on GitHub with <strong>no permissions</strong> (public data only) and paste it here.
          It is stored only in this browser, sent only to api.github.com and never included in backups. Anyone who can use this browser profile could read it, so do not use it on a shared computer.
        </p>
        {token ? (
          <div className="setting-row">
            <span>
              <strong>Token saved</strong>
              <span className="muted small block">Ending in …{token.slice(-4)}</span>
            </span>
            <button className="btn" onClick={handleRemoveToken}>
              <Trash2 size={14} /> Remove token
            </button>
          </div>
        ) : (
          <div className="token-form">
            <label className="sr-only" htmlFor="token-input">
              GitHub personal access token
            </label>
            <input
              id="token-input"
              className="text-input"
              type="password"
              autoComplete="off"
              spellCheck={false}
              placeholder="github_pat_…"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !checking && void handleSaveToken()}
            />
            <button className="btn btn-primary" onClick={() => void handleSaveToken()} disabled={checking || !tokenInput.trim()}>
              <KeyRound size={14} /> {checking ? 'Checking…' : 'Save and test'}
            </button>
          </div>
        )}
        {tokenNotice && (
          <p className={tokenNotice.kind === 'error' ? 'field-error' : 'muted small'} role={tokenNotice.kind === 'error' ? 'alert' : 'status'}>
            {tokenNotice.text}
          </p>
        )}
      </section>

      <section className="card panel" aria-labelledby="backup-settings">
        <h2 id="backup-settings">Backup and restore</h2>
        <p className="muted small">
          Everything is stored in this browser: {profiles.length} saved {profiles.length === 1 ? 'profile' : 'profiles'}, {collections.length}{' '}
          {collections.length === 1 ? 'collection' : 'collections'}, your filter presets, pinned repositories and your preferences. Export a file to keep a copy or move to another browser. Importing adds to what you already have.
        </p>
        <div className="controls">
          <button className="btn" onClick={handleExport}>
            <Download size={14} /> Export backup
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Upload size={14} /> Import backup
          </button>
          <input ref={fileRef} type="file" accept="application/json,.json" onChange={handleImport} hidden />
        </div>
        {notice && (
          <p className={notice.kind === 'error' ? 'field-error' : 'muted small'} role={notice.kind === 'error' ? 'alert' : 'status'}>
            {notice.text}
          </p>
        )}
      </section>
    </div>
  )
}
