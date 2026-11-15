import { useState } from 'react'
import { Dumbbell, Footprints, Trophy } from 'lucide-react'
import { dateLabel } from '../domain/calendar.ts'
import { builtinExercises, record, splits } from '../domain/model.ts'
import type { Cardio, ExerciseSet, Workout as Session } from '../domain/model.ts'
import { personalRecords, workoutCompleted } from '../domain/tracking.ts'
import { removeWithChildren } from '../data/db.ts'
import { useData } from '../ui/context.ts'
import { Actions, Add, Card, Check, checked, Dialog, Empty, Field, fmt, Form, Heading, NoteField, Num, number, optional, Select, string } from '../ui/common.tsx'
const newest = (a: {date: string; updatedAt: string}, b: {date: string; updatedAt: string}) => b.date.localeCompare(a.date) || b.updatedAt.localeCompare(a.updatedAt)

export function Records() {
  const { data } = useData()
  const records = personalRecords(data.workouts, data.sets)
  return <Card title="Personal records" action={<Trophy size={20} className="accent"/>}>
    {records.length === 0 && <Empty>Personal record muncul setelah set latihan ditandai selesai.</Empty>}
    {records.map(set => <div className="log-row divided" key={set.id}>
      <div className="grow"><strong>{set.exercise}</strong><small>{dateLabel(set.date)}</small></div>
      <strong>{fmt(set.kg)} kg × {set.reps}</strong>
    </div>)}
  </Card>
}
export function Workout({ create }: { create: boolean }) {
  const { db, data, date, save, refresh } = useData()
  const [tab, setTab] = useState<'weights' | 'cardio'>('weights')
  const [session, setSession] = useState<Session | null | undefined>(create ? null : undefined)
  const [cardio, setCardio] = useState<Cardio | null | undefined>()
  const [active, setActive] = useState<string>()
  const [setEditor, setSetEditor] = useState<ExerciseSet | null | undefined>()
  const [exercise, setExercise] = useState('')
  const [error, setError] = useState('')
  const [custom, setCustom] = useState(false)
  const workout = data.workouts.find(item => item.id === active)
  const sets = data.sets.filter(item => item.workoutId === active).sort((a, b) => a.order - b.order)
  const options = [...new Set([...builtinExercises, ...data.exercises.map(item => item.name), ...data.sets.map(item => item.exercise)])].sort()
  const recent = data.sets.filter(item => item.workoutId !== active && item.done &&
    item.exercise.toLowerCase() === exercise.trim().toLowerCase())
    .flatMap(item => {
      const parent = data.workouts.find(workout => workout.id === item.workoutId)
      return parent && (!workout || parent.date <= workout.date) ? [{ ...item, date: parent.date, sessionUpdatedAt: parent.updatedAt }] : []
    }).sort((a, b) => b.date.localeCompare(a.date) || b.sessionUpdatedAt.localeCompare(a.sessionUpdatedAt) || b.order - a.order)[0]
  function openSet(item: ExerciseSet | null) {
    setExercise(item?.exercise ?? options[0]); setSetEditor(item)
  }

  return <>
    <Heading title="Workout Log" sub="Catat set latihan dan sesi treadmill."/>
    <div className="segmented"><button aria-pressed={tab === 'weights'} onClick={() => setTab('weights')}><Dumbbell size={18}/> Weight training</button>
      <button aria-pressed={tab === 'cardio'} onClick={() => setTab('cardio')}><Footprints size={18}/> Treadmill</button></div>
    {tab === 'weights' && <Card title="Sesi latihan" action={<Add onClick={() => setSession(null)}>Sesi baru</Add>}>
      {!data.workouts.length && <Empty>Belum ada sesi latihan.</Empty>}
      {[...data.workouts].sort(newest).map(item => <div className="log-row divided" key={item.id}>
        <button className="record-link grow" onClick={() => setActive(item.id)}><strong>{item.name}</strong>
          <small>{dateLabel(item.date)} · {item.split} · {workoutCompleted(item, data.sets) ? 'Ada set selesai' : 'Belum ada set selesai'}</small></button>
        <Actions edit={() => setSession(item)} remove={async () => { await removeWithChildren(db, 'workouts', item.id); await refresh() }}/>
      </div>)}
    </Card>}
    {tab === 'cardio' && <Card title="Riwayat treadmill" action={<Add onClick={() => setCardio(null)}>Catat sesi</Add>}>
      {!data.cardio.length && <Empty>Belum ada sesi treadmill.</Empty>}
      {[...data.cardio].sort(newest).map(item => <div className="log-row divided" key={item.id}>
        <div className="grow"><strong>{fmt(item.minutes)} menit</strong><small>{dateLabel(item.date)}
          {item.distance !== undefined && ' · ' + fmt(item.distance) + ' km'}
          {item.speed !== undefined && ' · ' + fmt(item.speed) + ' km/jam'}
          {item.incline !== undefined && ' · incline ' + fmt(item.incline) + '%'}
          {item.exertion !== undefined && ' · RPE ' + item.exertion + '/10'}</small>
          {item.note && <small className="preserve">{item.note}</small>}</div>
        <Actions edit={() => setCardio(item)} remove={() => save([{ table: 'cardio', remove: item.id }])}/>
      </div>)}
    </Card>}
    <Records/>
    {session !== undefined && <Dialog title={session ? 'Edit sesi' : 'Sesi latihan baru'} close={() => setSession(undefined)}>
      <Form save={async form => {
        const split = string(form, 'split') as Session['split']
        const item = { ...record(session?.id), split, name: string(form, 'name') || split, date: string(form, 'date'), note: string(form, 'note') }
        await save([{ table: 'workouts', put: item }]); setSession(undefined); setActive(item.id)
      }}>
        <Field label="Tanggal" type="date" name="date" required defaultValue={session?.date ?? date}/>
        <Select label="Jenis latihan" name="split" values={splits} defaultValue={session?.split ?? 'Full Body'}/>
        <Field label="Nama sesi (opsional)" name="name" defaultValue={session?.name}/>
        <NoteField label="Catatan teknik / instruksi PT" value={session?.note}/>
      </Form>
    </Dialog>}
    {workout && session === undefined && setEditor === undefined && !custom && <Dialog title={workout.name} close={() => { setActive(undefined); setError('') }}>
      <p className="muted">{dateLabel(workout.date)} · {workout.split}</p>
      {workout.note && <p className="preserve">{workout.note}</p>}
      <div className="button-row"><Add onClick={() => openSet(null)}>Tambah set</Add>
        <button className="button" onClick={() => setCustom(true)}>Exercise baru</button></div>
      {!sets.length && <Empty>Pilih exercise dan tambahkan set pertama.</Empty>}
      {error && <p className="error" role="alert">{error}</p>}
      {sets.map((item, index) => <div key={item.id} className="log-row divided">
        <label className="check grow"><input type="checkbox" checked={item.done} aria-label={'Set ' + (index + 1) + ' ' + item.exercise + ' selesai'} onChange={async event => {
          try { await save([{ table: 'sets', put: { ...item, ...record(item.id), done: event.target.checked } }]); setError('') }
          catch { setError('Status set gagal disimpan.') }
        }}/>
        <span><strong>{item.exercise}</strong><small>Set {index + 1} · {fmt(item.kg)} kg × {item.reps}</small>{item.note && <small className="preserve">{item.note}</small>}</span></label>
        <Actions edit={() => openSet(item)} remove={() => save([{ table: 'sets', remove: item.id }])}/>
      </div>)}
    </Dialog>}
    {custom && <Dialog title="Exercise baru" close={() => setCustom(false)}>
      <Form save={async form => {
        const name = string(form, 'exercise')
        if (!name || options.some(value => value.toLowerCase() === name.toLowerCase())) throw new Error('Gunakan nama exercise baru yang unik.')
        await save([{ table: 'exercises', put: { ...record(), name } }]); setCustom(false); setExercise(name); setSetEditor(null)
      }}><Field label="Nama exercise" name="exercise" required/></Form>
    </Dialog>}
    {workout && setEditor !== undefined && <Dialog title={setEditor ? 'Edit set' : 'Tambah set'} close={() => setSetEditor(undefined)}>
      <Form save={async form => {
        const count = setEditor ? 1 : number(form, 'sets')
        const order = sets.length ? Math.max(...sets.map(item => item.order)) + 1 : 0
        await save(Array.from({ length: count }, (_, index) => ({ table: 'sets' as const, put: {
          ...record(setEditor?.id), workoutId: workout.id, exercise, kg: number(form, 'kg'), reps: number(form, 'reps'),
          done: checked(form, 'done'), note: string(form, 'note'), order: setEditor?.order ?? order + index,
        }})))
        setSetEditor(undefined)
      }}>
        <Select label="Exercise" name="exercise" values={options} value={exercise} onChange={setExercise}/>
        <p className="muted">{recent ? 'Terakhir · ' + fmt(recent.kg) + ' kg × ' + recent.reps + ' pada ' + dateLabel(recent.date) : 'Belum ada set selesai untuk exercise ini.'}</p>
        <div className="field-grid" key={exercise}>
          <Num label="Beban (kg)" name="kg" defaultValue={setEditor?.kg ?? recent?.kg ?? 0} required/>
          <Num label="Repetisi" name="reps" step={1} min={1} defaultValue={setEditor?.reps ?? recent?.reps} required/>
        </div>
        {!setEditor && <Num label="Jumlah set" name="sets" min={1} max={50} step={1} defaultValue={1} required/>}
        <Check name="done" defaultChecked={setEditor?.done}>Tandai set selesai</Check>
        <NoteField label="Catatan teknik / instruksi PT" value={setEditor?.note}/>
      </Form>
    </Dialog>}
    {cardio !== undefined && <Dialog title={cardio ? 'Edit treadmill' : 'Catat treadmill'} close={() => setCardio(undefined)}>
      <Form save={async form => {
        await save([{ table: 'cardio', put: { ...record(cardio?.id), date: string(form, 'date'), minutes: number(form, 'minutes'),
          speed: optional(form, 'speed'), incline: optional(form, 'incline'), distance: optional(form, 'distance'),
          exertion: optional(form, 'exertion'), note: string(form, 'note'),
        }}]); setCardio(undefined)
      }}>
        <Field label="Tanggal" name="date" type="date" defaultValue={cardio?.date ?? date} required/>
        <div className="field-grid">
          <Num label="Durasi (menit)" name="minutes" min={1} max={1440} defaultValue={cardio?.minutes ?? 30} required/>
          <Num label="Kecepatan (km/jam)" name="speed" defaultValue={cardio?.speed}/>
          <Num label="Incline (%)" name="incline" defaultValue={cardio?.incline}/>
          <Num label="Jarak (km)" name="distance" defaultValue={cardio?.distance}/>
          <Num label="Intensitas (RPE 1–10)" name="exertion" step={1} min={1} max={10} defaultValue={cardio?.exertion}/>
        </div><NoteField value={cardio?.note}/>
      </Form>
    </Dialog>}
  </>
}

