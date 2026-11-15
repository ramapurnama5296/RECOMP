import { useState } from 'react'
import { dateLabel, shift } from '../domain/calendar.ts'
import { record, wheyTemplates } from '../domain/model.ts'
import type { Supplement } from '../domain/model.ts'
import { Actions, Add, Card, Dialog, Empty, Field, fmt, Form, Heading, NoteField, Num, number, optional, Pager, Select, string } from '../ui/common.tsx'
import { useData } from '../ui/context.ts'

export function Creatine({ date }: { date: string }) {
  const { data, settings, save } = useData()
  const id = 'creatine:' + date
  const item = data.supplements.find(item => item.id === id)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  return <><label className="check creatine"><input type="checkbox" checked={Boolean(item)} disabled={busy}
    onChange={async event => {
      setBusy(true); setError('')
      try {
        await save([event.target.checked
          ? { table: 'supplements', put: { ...record(id), date, type: 'creatine', name: 'Creatine', amount: settings.creatine, flavor: '', note: '' } }
          : { table: 'supplements', remove: id }])
      } catch { setError('Status creatine gagal disimpan.') } finally { setBusy(false) }
    }}/><span><strong>Creatine · {fmt(item?.amount ?? settings.creatine)} g</strong><small>{item ? 'Sudah dikonsumsi' : 'Belum ditandai'}</small></span></label>
    {error && <p role="alert" className="error">{error}</p>}</>
}
export function Supplements() {
  const { data, settings, date, save } = useData()
  const [selected, setSelected] = useState(date)
  const [editing, setEditing] = useState<Supplement | null | undefined>()
  const [type, setType] = useState<Supplement['type']>('whey')
  const [product, setProduct] = useState(settings.whey)
  return <>
    <Heading title="Supplement Tracker" sub="Checklist creatine harian dan catatan suplemen." back/>
    <Pager label={dateLabel(selected, { weekday: 'long', day: 'numeric', month: 'long' })} previous={() => setSelected(shift(selected, -1))} next={() => setSelected(shift(selected, 1))}/>
    <Card title="Creatine"><Creatine date={selected}/></Card>
    <Card title="Whey dan suplemen lain" action={<Add onClick={() => { setEditing(null); setType('whey'); setProduct(settings.whey) }}>Tambah</Add>}>
      {!data.supplements.some(item => item.date === selected && item.type !== 'creatine') && <Empty>Belum ada catatan untuk tanggal ini.</Empty>}
      {data.supplements.filter(item => item.date === selected && item.type !== 'creatine').map(item => <div className="log-row divided" key={item.id}>
        <div className="grow"><strong>{item.name}</strong><small>{fmt(item.amount)} {item.type === 'whey' ? 'serving' : 'dosis'}{item.flavor && ' · ' + item.flavor}</small>
          {item.type === 'whey' && <small>{item.protein === undefined ? '—' : fmt(item.protein * item.amount) + ' g protein'} · {item.calories === undefined ? '—' : fmt(item.calories * item.amount) + ' kcal'}</small>}
          {item.note && <small className="preserve">{item.note}</small>}</div>
        <Actions edit={() => { setEditing(item); setType(item.type); setProduct(item.name) }} remove={() => save([{ table: 'supplements', remove: item.id }])}/>
      </div>)}
    </Card>
    <Card title="Riwayat creatine">
      {!data.supplements.some(item => item.type === 'creatine') && <Empty>Belum ada checklist yang selesai.</Empty>}
      {data.supplements.filter(item => item.type === 'creatine').sort((a, b) => b.date.localeCompare(a.date)).map(item =>
        <div className="row divided" key={item.id}><span>{dateLabel(item.date, { day: 'numeric', month: 'long', year: 'numeric' })}</span><strong>{fmt(item.amount)} g</strong></div>)}
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

