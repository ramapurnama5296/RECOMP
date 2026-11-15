import { useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { dateLabel } from '../domain/calendar.ts'
import { metrics, record } from '../domain/model.ts'
import type { Body, Change, Metric } from '../domain/model.ts'
import { measured, metricChange } from '../domain/tracking.ts'
import { removeWithChildren } from '../data/db.ts'
import { compressPhoto } from '../data/files.ts'
import { Actions, Add, Card, Dialog, Empty, Field, fmt, Form, Heading, NoteField, Num, optional, Select, string } from '../ui/common.tsx'
import { useData } from '../ui/context.ts'
import { Records } from './workout.tsx'

const graphKeys = ['weight', 'fat', 'muscle', 'waist'] as const
const display = (value: number | undefined) => value === undefined ? '—' : fmt(value)
const delta = (value: number | undefined) => value === undefined ? '—' : (value > 0 ? '+' : '') + fmt(value)
export function Progress({ create }: { create: boolean }) {
  const { data, date, db, save, refresh } = useData()
  const [metric, setMetric] = useState<Metric>('weight')
  const [editing, setEditing] = useState<Body | null | undefined>(create ? null : undefined)
  const points = measured(data.body, metric)
  const editingPhoto = data.photos.find(item => item.bodyId === editing?.id)
  return <>
    <Heading title="Body Progress" sub="Lihat perubahan tubuh dari waktu ke waktu."/>
    <Card title="Tren pengukuran" action={<Add onClick={() => setEditing(null)}>Catat data</Add>}>
      <Select label="Pengukuran" name="metric" values={graphKeys.map(key => [key, metrics[key]])} value={metric} onChange={value => setMetric(value as Metric)}/>
      {points.length === 0 ? <Empty>Belum ada data untuk grafik ini.</Empty> :
        <div className="chart" role="img" aria-label={'Grafik ' + metrics[metric] + ', ' + points.length + ' pengukuran'}>
          <ResponsiveContainer width="100%" height={225}><LineChart data={points} margin={{ top: 12, left: -22, right: 18, bottom: 2 }}>
            <CartesianGrid stroke="#303030" vertical={false}/>
            <XAxis dataKey="date" tickFormatter={value => dateLabel(value)} tick={{ fill: '#a1a1aa', fontSize: 12 }} minTickGap={16}/>
            <YAxis domain={['auto', 'auto']} tick={{ fill: '#a1a1aa', fontSize: 12 }}/>
            <Tooltip labelFormatter={value => dateLabel(String(value))} contentStyle={{ background: '#171717', borderColor: '#444' }}/>
            <Line type="linear" dataKey="value" name={metrics[metric]} stroke="#b6e54b" strokeWidth={3} dot={{ r: 3 }} isAnimationActive={false}/>
          </LineChart></ResponsiveContainer>
        </div>}
      <dl className="stats"><div><dt>Awal</dt><dd>{display(points[0]?.value)}</dd></div><div><dt>Terbaru</dt><dd>{display(points.at(-1)?.value)}</dd></div>
        <div><dt>7 hari</dt><dd>{delta(metricChange(points, 7))}</dd></div><div><dt>30 hari</dt><dd>{delta(metricChange(points, 30))}</dd></div>
        <div><dt>Sejak mulai</dt><dd>{delta(metricChange(points))}</dd></div></dl>
      <p className="muted">Perubahan 7 dan 30 hari dibandingkan dengan pengukuran terakhir pada atau sebelum tanggal acuan. Body composition dapat berubah karena hidrasi dan metode pengukuran.</p>
    </Card>
    <Card title="Riwayat pengukuran">
      {!data.body.length && <Empty>Belum ada pengukuran.</Empty>}
      {[...data.body].sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)).map(item => {
        const photo = data.photos.find(photo => photo.bodyId === item.id)
        return <div key={item.id} className="divided">
          <div className="log-row"><div className="grow"><strong>{dateLabel(item.date, { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
            {Object.entries(item.values).map(([key, value]) => <small key={key}>{metrics[key as Metric]} · {display(value)}</small>)}
            {item.note && <small className="preserve">{item.note}</small>}</div>
          <Actions edit={() => setEditing(item)} remove={async () => { await removeWithChildren(db, 'body', item.id); await refresh() }}/></div>
          {photo && <img className="progress-photo" loading="lazy" src={photo.image} alt={'Foto progres ' + item.date}/>}
        </div>
      })}
    </Card><Records/>
    {editing !== undefined && <Dialog title={editing ? 'Edit pengukuran' : 'Pengukuran baru'} close={() => setEditing(undefined)}>
      <Form save={async form => {
        const values = Object.fromEntries(Object.keys(metrics).flatMap(key => {
          const value = optional(form, key)
          return value === undefined ? [] : [[key, value]]
        }))
        const item = { ...record(editing?.id), date: string(form, 'date'), values, note: string(form, 'note') }
        const file = form.get('photo')
        const changes: Change[] = [{ table: 'body', put: item }]
        if (file instanceof File && file.size > 0) {
          const image = await compressPhoto(file)
          changes.push({ table: 'photos', put: { ...record(editingPhoto?.id), bodyId: item.id, date: item.date, image } })
        } else if (editingPhoto && form.has('removePhoto')) changes.push({ table: 'photos', remove: editingPhoto.id })
        else if (editingPhoto && editingPhoto.date !== item.date) changes.push({ table: 'photos', put: { ...editingPhoto, ...record(editingPhoto.id), date: item.date } })
        await save(changes); setEditing(undefined)
      }}>
        <Field label="Tanggal" type="date" name="date" defaultValue={editing?.date ?? date} required/>
        <div className="field-grid">{Object.entries(metrics).map(([key, label]) =>
          <Num label={label} key={key} name={key} max={key === 'fat' ? 100 : undefined} defaultValue={editing?.values[key as Metric]}/>)}</div>
        <Field label="Foto progres (opsional)" type="file" name="photo" accept="image/*"/>
        {editingPhoto && <label className="check"><input type="checkbox" name="removePhoto"/> Hapus foto saat ini</label>}
        <NoteField value={editing?.note}/>
      </Form>
    </Dialog>}
  </>
}

