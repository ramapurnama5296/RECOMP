import { useState } from 'react'
import { dateLabel, shift, timeNow, weekDays } from '../domain/calendar.ts'
import { meals, record } from '../domain/model.ts'
import type { Favorite, Food, FoodDetails } from '../domain/model.ts'
import { nutrition } from '../domain/tracking.ts'
import { Actions, Add, Card, Check, checked, Dialog, Empty, Field, fmt, Form, Heading, Meter, NoteField, Num, number, optional, Pager, Select, string } from '../ui/common.tsx'
import { useData } from '../ui/context.ts'

export function Nutrition({ create }: { create: boolean }) {
  const { data, date, settings, save } = useData()
  const [selected, setSelected] = useState(date)
  const [editing, setEditing] = useState<Food | Favorite | null | undefined>(create ? null : undefined)
  const [copying, setCopying] = useState(false)
  const totals = nutrition(data.food, data.supplements, selected)
  const entries = data.food.filter(item => item.date === selected).sort((a, b) => a.time.localeCompare(b.time))
  const previous = data.food.filter(item => item.date === shift(selected, -1))
  return <>
    <Heading title="Nutrition Tracker" sub="Isi kalori dan protein sesuai porsi atau nutrition label." back/>
    <Pager label={dateLabel(selected, { weekday: 'long', day: 'numeric', month: 'short' })} previous={() => setSelected(shift(selected, -1))} next={() => setSelected(shift(selected, 1))}/>
    <Field label="Pilih tanggal" type="date" value={selected} onChange={event => { if (event.target.value) setSelected(event.target.value) }}/>
    <Card title="Daily nutrition" action={<Add onClick={() => setEditing(null)}>Tambah makanan</Add>}>
      <div className="row"><span>Kalori</span><strong>{totals.caloriesLogged ? fmt(totals.calories) + ' kcal' : 'Belum dicatat'}</strong></div>
      {settings.calories !== undefined && <Meter label="Target kalori" value={totals.calories} max={settings.calories}/>}
      {totals.proteinLogged ? <Meter label="Protein (g)" value={totals.protein} max={settings.protein}/>
        : <div className="row"><span>Protein</span><strong>Belum dicatat</strong></div>}
      {totals.missingWheyLabel && <p className="muted">Total memakai nilai whey yang sudah diisi di Supplement Tracker.</p>}
    </Card>
    <Card title="Food diary" action={<button className="button" disabled={!previous.length} onClick={() => setCopying(true)}>Salin kemarin</button>}>
      {!entries.length && <Empty>Belum ada makanan tercatat pada tanggal ini.</Empty>}
      {entries.map(item => <div className="log-row divided" key={item.id}><div className="grow">
        <strong>{item.name}</strong><small>{item.meal} · {item.time}{item.portion && ' · ' + item.portion}</small>
        <small>{fmt(item.calories)} kcal · {fmt(item.protein)} g protein
          {item.carbs !== undefined && ' · ' + fmt(item.carbs) + ' g karbohidrat'}
          {item.fat !== undefined && ' · ' + fmt(item.fat) + ' g lemak'}</small>
        {item.note && <small className="preserve">{item.note}</small>}</div>
        <Actions edit={() => setEditing(item)} remove={() => save([{ table: 'food', remove: item.id }])}/></div>)}
    </Card>
    <Card title="Favorite foods">
      {!data.favorites.length && <Empty>Centang “Simpan ke favorit” saat menambahkan makanan.</Empty>}
      {data.favorites.map(item => <div className="log-row divided" key={item.id}>
        <button className="record-link grow" onClick={() => setEditing(item)}><strong>{item.name}</strong><small>{fmt(item.calories)} kcal · {fmt(item.protein)} g protein · Ketuk untuk mencatat</small></button>
        <Actions remove={() => save([{ table: 'favorites', remove: item.id }])}/></div>)}
    </Card>
    <Card title="Riwayat minggu ini">
      {weekDays(selected).map(day => {
        const total = nutrition(data.food, data.supplements, day)
        return <button className={'log-row record-link divided wide ' + (day === selected ? 'accent' : '')} key={day} onClick={() => setSelected(day)}>
          <strong>{dateLabel(day, { weekday: 'short', day: 'numeric' })}</strong><small>{total.caloriesLogged ? fmt(total.calories) + ' kcal' : '—'} · {total.proteinLogged ? fmt(total.protein) + ' g protein' : '—'}</small>
        </button>
      })}
    </Card>
    {editing !== undefined && <Dialog title={editing && 'date' in editing ? 'Edit makanan' : 'Catat makanan'} close={() => setEditing(undefined)}>
      <Form save={async form => {
        const details: FoodDetails = {
          name: string(form, 'name'), time: string(form, 'time'), meal: string(form, 'meal') as Food['meal'],
          calories: number(form, 'calories'), protein: number(form, 'protein'), carbs: optional(form, 'carbs'), fat: optional(form, 'fat'),
          portion: string(form, 'portion'), note: string(form, 'note'),
        }
        if (!details.name) throw new Error('Isi nama makanan.')
        const day = string(form, 'date')
        const existing = data.favorites.find(item => item.name.toLowerCase() === details.name.toLowerCase())
        await save([
          { table: 'food', put: { ...details, ...record(editing && 'date' in editing ? editing.id : undefined), date: day } },
          ...(checked(form, 'favorite') ? [{ table: 'favorites' as const, put: { ...details, ...record(existing?.id) } }] : []),
        ]); setSelected(day); setEditing(undefined)
      }}>
        <Field label="Nama makanan" name="name" defaultValue={editing?.name} required/>
        <div className="field-grid">
          <Field label="Tanggal" name="date" type="date" defaultValue={editing && 'date' in editing ? editing.date : selected} required/>
          <Field label="Waktu makan" name="time" type="time" defaultValue={editing?.time ?? timeNow()} required/>
          <Select label="Kategori" name="meal" values={meals} defaultValue={editing?.meal ?? 'Lunch'}/>
          <Field label="Porsi" name="portion" defaultValue={editing?.portion}/>
          <Num label="Kalori (kcal)" name="calories" defaultValue={editing?.calories} required/>
          <Num label="Protein (g)" name="protein" defaultValue={editing?.protein} required/>
          <Num label="Karbohidrat (g)" name="carbs" defaultValue={editing?.carbs}/>
          <Num label="Lemak (g)" name="fat" defaultValue={editing?.fat}/>
        </div><NoteField value={editing?.note}/><Check name="favorite">Simpan ke favorit</Check>
      </Form>
    </Dialog>}
    {copying && <Dialog title="Salin makanan kemarin" close={() => setCopying(false)}>
      <Form label="Salin pilihan" save={async form => {
        const ids = new Set(form.getAll('copy'))
        if (!ids.size) throw new Error('Pilih minimal satu makanan.')
        const copies = await Promise.all(previous.filter(item => ids.has(item.id)).map(async item => {
          const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(item.id))
          const key = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('')
          return { ...item, ...record('copy:' + selected + ':' + key), date: selected }
        }))
        const existing = new Set(entries.map(item => item.id))
        await save(copies.filter(item => !existing.has(item.id)).map(item => ({ table: 'food', put: item })))
        setCopying(false)
      }}>{previous.map(item => <label className="check" key={item.id}><input name="copy" value={item.id} type="checkbox" defaultChecked/>{item.name} · {item.time}</label>)}</Form>
    </Dialog>}
  </>
}

