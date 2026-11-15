import { useState } from 'react'
import { CalendarDays, Check, Dumbbell, Footprints, Moon, Plus } from 'lucide-react'
import { dateLabel, shift, weekDays, weekStart } from '../domain/calendar.ts'
import { kinds, record, statuses } from '../domain/model.ts'
import type { Kind, Schedule, Status } from '../domain/model.ts'
import { plannedDay, reschedule, toggleCompleted, weeklyCounts } from '../domain/tracking.ts'
import { useData } from '../ui/context.ts'
import { Card, Check as Checkbox, checked, Dialog, Field, Form, Heading, Meter, NoteField, Num, number, Pager, Select, string } from '../ui/common.tsx'

export const kindIcons = { weights: Dumbbell, cardio: Footprints, rest: Moon }
export function WeeklyProgress({ date }: { date: string }) {
  const { data, settings } = useData()
  const counts = weeklyCounts(date, data, settings)
  return <>
    <Meter label="Weight training" value={counts.weights} max={settings.weights}/>
    <Meter label="Cardio" value={counts.cardio} max={settings.cardio}/>
    <Meter label="Recovery" value={counts.rest} max={1}/>
  </>
}

export function Plan() {
  const { data, settings, date, save } = useData()
  const [week, setWeek] = useState(weekStart(date))
  const [editing, setEditing] = useState<string>()
  const [moving, setMoving] = useState<Schedule>()
  const [error, setError] = useState('')
  const days = weekDays(week)
  const active = editing ? plannedDay(editing, data.schedules, settings) : undefined
  const [kind, setKind] = useState<Kind>('rest')
  const [status, setStatus] = useState<Status>('planned')
  const planned = days.map(day => plannedDay(day, data.schedules, settings))
  return <>
    <Heading title="Weekly Plan" sub="Atur latihan, treadmill, dan waktu pemulihan."/>
    <Pager label={dateLabel(week) + ' – ' + dateLabel(days[6])} previous={() => setWeek(shift(week, -7))} next={() => setWeek(shift(week, 7))}/>
    <Card title="Weekly progress" action={<CalendarDays size={20} className="accent"/>}><WeeklyProgress date={week}/></Card>
    {planned.every(entry => entry.kind !== 'rest' || entry.item.status === 'skipped') && <p className="warning">Jadwalkan minimal satu hari full rest.</p>}
    {planned.filter(entry => entry.kind === 'cardio' && (entry.completed || entry.item.status === 'planned')).length > 3 && <p className="warning">Rencana ini mencakup lebih dari tiga sesi treadmill. Sisakan waktu untuk pemulihan.</p>}
    {error && <p className="error" role="alert">{error}</p>}
    <div className="stack">{planned.map(plan => {
      const { item, recovery, conflict, kind, completed } = plan
      const Icon = kindIcons[kind]
      const edit = () => { setKind(kind); setStatus(item.status === 'rescheduled' ? 'planned' : item.status); setEditing(item.date) }
      return <Card key={item.date} className={item.date === date ? 'current-day' : ''}>
        <div className="log-row">
          <span className="tile-icon"><Icon size={21}/></span>
          <div className="grow"><strong>{dateLabel(item.date, { weekday: 'long', day: 'numeric', month: 'short' })}</strong>
            <small>{kinds[kind]}{kind === 'cardio' ? ' · ' + item.minutes + ' menit' : ''}{kind === 'weights' && item.pt ? ' · PT' : ''}
              {kind === 'weights' && item.leg ? ' · Leg day' : ''} · {statuses[completed ? 'completed' : item.status]}</small>
          </div>
          {(item.status !== 'rescheduled' || kind === 'rest') && <button className={'icon-button ' + (completed ? 'selected' : '')}
            aria-label={(completed ? 'Batalkan selesai ' : 'Tandai selesai ') + item.date}
            aria-pressed={completed} disabled={conflict || item.date < settings.start}
            onClick={async () => {
              setError('')
              try {
                await save([{ table: 'schedules', put: toggleCompleted(plan) }])
              } catch { setError('Checklist gagal disimpan.') }
            }}><Check size={19}/></button>}
          {item.status !== 'rescheduled' && <button className="icon-button" onClick={edit} aria-label={'Edit jadwal ' + item.date}><Plus size={19}/></button>}
        </div>
        {recovery && !conflict && <p className="muted">Recovery setelah leg day.</p>}
        {conflict && <p className="warning">Jadwal PT masih tersimpan. Pindahkan sesi agar hari ini bisa dipakai untuk recovery.</p>}
        {item.movedTo && <p className="muted">Dipindahkan ke {dateLabel(item.movedTo)}.</p>}
        {item.note && <p className="muted preserve">{item.note}</p>}
        {kind !== 'rest' && (item.status === 'planned' || item.status === 'skipped') &&
          <button className="button subtle" onClick={() => setMoving(item)}>Pindahkan sesi</button>}
      </Card>
    })}</div>
    {active && <Dialog title="Edit hari latihan" close={() => setEditing(undefined)}>
      <Form save={async form => {
        if (active.conflict && (kind !== 'weights' || (status !== 'skipped' && !checked(form, 'pt')))) {
          throw new Error('Gunakan Pindahkan sesi agar jadwal PT tetap tercatat.')
        }
        if (active.conflict && status === 'completed') throw new Error('Pindahkan sesi PT untuk menyelesaikan konflik recovery.')
        await save([{ table: 'schedules', put: {
          ...active.item, ...record(active.item.id), kind, status, movedTo: undefined, completedAs: undefined,
          pt: kind === 'weights' && checked(form, 'pt'), leg: kind === 'weights' && checked(form, 'leg'),
          minutes: kind === 'rest' ? 0 : number(form, 'minutes'), note: string(form, 'note'),
        }}])
        setEditing(undefined)
      }}>
        <Select label="Aktivitas" name="kind" values={Object.entries(kinds)} value={kind} onChange={value => setKind(value as Kind)}/>
        {kind !== 'rest' && <Num key={kind} label="Durasi (menit)" name="minutes" min={kind === 'cardio' ? 1 : 0} max={1440} step={1} defaultValue={kind === 'cardio' ? active.item.minutes || 30 : active.item.minutes} required/>}
        {kind === 'weights' && <><Checkbox name="pt" defaultChecked={active.item.pt}>Bersama personal trainer</Checkbox>
          <Checkbox name="leg" defaultChecked={active.item.leg}>Leg day</Checkbox></>}
        <Select label="Status" name="status" values={Object.entries(statuses).filter(([value]) => value !== 'rescheduled')} value={status} onChange={value => setStatus(value as Status)}/>
        <NoteField value={active.item.note}/>
      </Form>
    </Dialog>}
    {moving && <Dialog title="Pindahkan sesi" close={() => setMoving(undefined)}>
      <Form save={async form => {
        const destination = string(form, 'destination')
        const next = plannedDay(destination, data.schedules, settings).item
        const [source, target] = reschedule(moving, next, data.schedules, settings)
        await save([{ table: 'schedules', put: source }, { table: 'schedules', put: target }])
        setWeek(weekStart(target.date)); setMoving(undefined)
      }}>
        <p className="muted">Pilih hari treadmill atau istirahat yang masih kosong. Aktivitas di hari tujuan akan diganti dengan sesi ini.</p>
        <Field label="Tanggal tujuan" name="destination" type="date" min={settings.start} defaultValue={shift(moving.date, 1)} required/>
      </Form>
    </Dialog>}
  </>
}

