import { useEffect, useId, useRef, useState } from 'react'
import type { FormEvent, ReactNode, InputHTMLAttributes } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react'

export const fmt = (value: number) => new Intl.NumberFormat('id-ID', { maximumFractionDigits: 1 }).format(value)
export const rupiah = (value: number) => 'Rp' + fmt(value)
export const string = (data: FormData, key: string) => String(data.get(key) ?? '').trim()
export const optional = (data: FormData, key: string) => string(data, key) === '' ? undefined : Number(data.get(key))
export const number = (data: FormData, key: string) => Number(data.get(key))
export const checked = (data: FormData, key: string) => data.has(key)

export function Heading({ title, sub, back }: { title: string; sub?: string; back?: boolean }) {
  return <header className="page-title">
    {back && <a className="back" href="#/more"><ArrowLeft size={18}/> More</a>}
    <h1>{title}</h1>{sub && <p>{sub}</p>}
  </header>
}

export function Card({ title, action, children, className = '' }: { title?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={'card ' + className}>
    {(title || action) && <div className="card-head"><h2>{title}</h2>{action}</div>}{children}
  </section>
}

export function Field({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <label className="field"><span>{label}</span><input maxLength={200} {...props}/></label>
}
export function Num({ label, min = 0, step = 'any', ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return <Field label={label} type="number" min={min} step={step} inputMode={step === 1 ? 'numeric' : 'decimal'} {...props}/>
}
export function Select({ label, name, values, defaultValue, value, onChange }: {
  label: string; name: string; values: readonly (string | [string, string])[]; defaultValue?: string; value?: string; onChange?: (value: string) => void
}) {
  const labelId = useId()
  return <label className="field"><span id={labelId}>{label}</span><select aria-labelledby={labelId} name={name} defaultValue={defaultValue} value={value} onChange={event => onChange?.(event.target.value)}>
    {values.map(item => {
      const [key, text] = typeof item === 'string' ? [item, item] : item
      return <option key={key} value={key}>{text}</option>
    })}
  </select></label>
}
export function NoteField({ name = 'note', label = 'Catatan', value }: { name?: string; label?: string; value?: string }) {
  return <label className="field"><span>{label}</span><textarea name={name} rows={2} defaultValue={value} maxLength={3000}/></label>
}
export function Check({ name, children, defaultChecked }: { name: string; children: ReactNode; defaultChecked?: boolean }) {
  return <label className="check"><input type="checkbox" name={name} defaultChecked={defaultChecked}/>{children}</label>
}
export function Form({ children, save, label = 'Simpan' }: { children: ReactNode; save: (data: FormData) => Promise<void> | void; label?: string }) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try { await save(new FormData(event.currentTarget)) }
    catch (error) { setError(error instanceof Error ? error.message : 'Gagal menyimpan perubahan.') }
    finally { setBusy(false) }
  }
  return <form className="form" onSubmit={submit}>{children}{error && <p className="error" role="alert">{error}</p>}
    <button className="button primary" disabled={busy}>{busy ? 'Menyimpan…' : label}</button></form>
}

export function Dialog({ title, close, children }: { title: string; close: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const dialog = ref.current
    dialog?.showModal()
    return () => { dialog?.close() }
  }, [])
  return <dialog ref={ref} aria-label={title} onCancel={close}>
    <div className="dialog-inner"><div className="card-head"><h2>{title}</h2>
      <button type="button" className="icon-button" aria-label="Tutup" onClick={close}><X size={20}/></button></div>{children}</div>
  </dialog>
}

export function Pager({ label, previous, next }: { label: string; previous: () => void; next: () => void }) {
  return <div className="pager">
    <button className="icon-button" aria-label="Periode sebelumnya" onClick={previous}><ChevronLeft/></button>
    <strong>{label}</strong><button className="icon-button" aria-label="Periode berikutnya" onClick={next}><ChevronRight/></button>
  </div>
}

export function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  return <div className="meter"><div className="row"><span>{label}</span><strong>{fmt(value)} / {fmt(max)}</strong></div>
    <progress aria-label={label} value={Math.min(value, max || 1)} max={max || 1}/></div>
}
export function Actions({ edit, remove }: { edit?: () => void; remove?: () => Promise<void> }) {
  const [error, setError] = useState('')
  return <div className="record-actions">
    {edit && <button type="button" aria-label="Edit" className="icon-button" onClick={edit}><Pencil size={16}/></button>}
    {remove && <button type="button" aria-label="Hapus" className="icon-button danger" onClick={async () => {
      if (!window.confirm('Hapus catatan ini?')) return
      try { await remove() } catch { setError('Catatan gagal dihapus.') }
    }}><Trash2 size={16}/></button>}
    {error && <span role="alert" className="error">{error}</span>}
  </div>
}
export function Empty({ children }: { children: ReactNode }) { return <p className="empty">{children}</p> }
export function Add({ children, onClick }: { children: ReactNode; onClick: () => void }) {
  return <button className="button primary" onClick={onClick}>{children}</button>
}

