import { useState } from 'react'
import { dateLabel, shift } from '../domain/calendar.ts'
import { record, wheyTemplates } from '../domain/model.ts'
import type { Supplement } from '../domain/model.ts'
import { dailySupplement, dailySupplementId } from '../domain/supplements.ts'
import type { DailySupplementType } from '../domain/supplements.ts'
import { Actions, Add, Card, Dialog, Empty, Field, fmt, Form, Heading, NoteField, Num, number, optional, Pager, Select, string } from '../ui/common.tsx'
import { useData } from '../ui/context.ts'

function DailySupplement({ date, type }: { date: string; type: DailySupplementType }) {
  const { data, settings, save } = useData()
  const serving = dailySupplement(type, date, settings)
  const saved = data.supplements.find(item => item.id === serving.id)
  const manuallyLogged = type === 'whey' && !saved && data.supplements.some(item => item.type === 'whey' && item.date === date)
  const item = saved ?? serving
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const portion = type === 'creatine' ? fmt(item.amount) + ' g'
    : fmt(item.amount) + ' sajian' + (item.protein === undefined ? '' : ' · ' + fmt(item.protein * item.amount) + ' g protein')
  return <><label className="check"><input type="checkbox" checked={Boolean(saved) || manuallyLogged} disabled={busy || manuallyLogged}
    onChange={async event => {
      setBusy(true); setError('')
      try {
        await save([event.target.checked
          ? { table: 'supplements', put: { ...record(serving.id), ...serving } }
          : { table: 'supplements', remove: serving.id }])
      } catch { setError('Status suplemen gagal disimpan.') } finally { setBusy(false) }
    }}/><span><strong>{item.name} · {portion}</strong>
      <small>{manuallyLogged ? 'Sudah dicatat di tracker' : saved ? 'Sudah dikonsumsi' : 'Belum ditandai'}</small></span></label>
    {error && <p role="alert" className="error">{error}</p>}</>
}

export function DailySupplements({ date }: { date: string }) {
  return <><DailySupplement date={date} type="creatine"/><DailySupplement date={date} type="whey"/></>
}

function isChecklistEntry(item: Supplement) {
  return item.type === 'creatine' || (item.type === 'whey' && item.id === dailySupplementId('whey', item.date))
}

export function Supplements() {
  const { data, settings, date, save } = useData()
  const [selected, setSelected] = useState(date)
  const [editing, setEditing] = useState<Supplement | null | undefined>()
  const [type, setType] = useState<Supplement['type']>('whey')
  const [product, setProduct] = useState(settings.whey)
  const manual = data.supplements.filter(item => item.date === selected && !isChecklistEntry(item))
  const checklist = data.supplements.filter(isChecklistEntry).sort((a, b) => b.date.localeCompare(a.date))
  return <>
    <Heading title="Supplement Tracker" sub="Checklist harian dan catatan suplemen tambahan." back/>
    <Pager label={dateLabel(selected, { weekday: 'long', day: 'numeric', month: 'long' })} previous={() => setSelected(shift(selected, -1))} next={() => setSelected(shift(selected, 1))}/>
    <Card title="Checklist harian"><DailySupplements date={selected}/></Card>
    <Card title="Suplemen tambahan" action={<Add onClick={() => { setEditing(null); setType('whey'); setProduct(settings.whey) }}>Tambah</Add>}>
      {!manual.length && <Empty>Belum ada catatan tambahan untuk tanggal ini.</Empty>}
      {manual.map(item => <div className="log-row divided" key={item.id}>
        <div className="grow"><strong>{item.name}</strong><small>{fmt(item.amount)} {item.type === 'whey' ? 'serving' : 'dosis'}{item.flavor && ' · ' + item.flavor}</small>
          {item.type === 'whey' && <small>{item.protein === undefined ? '—' : fmt(item.protein * item.amount) + ' g protein'} · {item.calories === undefined ? '—' : fmt(item.calories * item.amount) + ' kcal'}</small>}
          {item.note && <small className="preserve">{item.note}</small>}</div>
        <Actions edit={() => { setEditing(item); setType(item.type); setProduct(item.name) }} remove={() => save([{ table: 'supplements', remove: item.id }])}/>
      </div>)}
    </Card>
    <Card title="Riwayat checklist">
      {!checklist.length && <Empty>Belum ada checklist yang selesai.</Empty>}
      {checklist.map(item => <div className="row divided" key={item.id}>
        <span>{item.name}<small>{dateLabel(item.date, { day: 'numeric', month: 'long', year: 'numeric' })}</small></span>
        <strong>{item.type === 'creatine' ? fmt(item.amount) + ' g'
          : item.protein === undefined ? fmt(item.amount) + ' sajian' : fmt(item.protein * item.amount) + ' g protein'}</strong>
      </div>)}
    </Card>
    {editing !== undefined && <Dialog title={editing ? 'Edit suplemen' : 'Catat suplemen'} close={() => setEditing(undefined)}>
      <Form save={async form => {
        const name = product.trim()
        if (!name) throw new Error('Isi nama produk.')
        const active = string(form, 'date')
        await save([{ table: 'supplements', put: { ...record(editing?.id), date: active, type, name, amount: number(form, 'amount'),
          flavor: type === 'whey' ? string(form, 'flavor') : '', protein: type === 'whey' ? optional(form, 'protein') : undefined,
          calories: type === 'whey' ? optional(form, 'calories') : undefined, note: string(form, 'note'),
        }}]); setSelected(active); setEditing(undefined)
      }}>
        <Select label="Jenis suplemen" name="type" value={type} values={[['whey', 'Whey protein'], ['custom', 'Custom']]} onChange={value => {
          setType(value as Supplement['type']); setProduct(value === 'whey' ? settings.whey : '')
        }}/>
        {type === 'whey' && <Select label="Template (opsional)" name="template" values={['', ...wheyTemplates]} value={wheyTemplates.includes(product) ? product : ''} onChange={setProduct}/>}
        <Field label="Nama produk" name="product" value={product} onChange={event => setProduct(event.target.value)} required/>
        <div className="field-grid">
          <Field label="Tanggal" name="date" type="date" defaultValue={editing?.date ?? selected} required/>
          <Num label={type === 'whey' ? 'Serving' : 'Jumlah dosis'} name="amount" min={0.01} defaultValue={editing?.amount ?? 1} required/>
          {type === 'whey' && <>
            <Field label="Varian rasa" name="flavor" defaultValue={editing?.flavor ?? (product === settings.whey ? settings.flavor : '')}/>
            <Num label="Protein per serving (g)" name="protein" defaultValue={editing?.protein ?? (product === settings.whey ? settings.wheyProtein : undefined)}/>
            <Num label="Kalori per serving (kcal)" name="calories" defaultValue={editing?.calories ?? (product === settings.whey ? settings.wheyCalories : undefined)}/>
          </>}
        </div>
        {type === 'whey' && <p className="muted">Isi angka dari nutrition label. Whey yang dicatat di sini masuk otomatis ke total harian.</p>}
        <NoteField value={editing?.note}/>
      </Form>
    </Dialog>}
  </>
}

