import { ArrowDownRight, ArrowRight, CircleCheck, Dumbbell, Flame, NotebookPen, Scale, Utensils, Wallet, Zap } from 'lucide-react'
import { useState } from 'react'
import { dateLabel } from '../domain/calendar.ts'
import { kinds, record } from '../domain/model.ts'
import { allowance, monthOccasions, nutrition, plannedDay, savingsFor } from '../domain/tracking.ts'
import { Card, Dialog, fmt, Form, Meter, NoteField, rupiah, string } from '../ui/common.tsx'
import { useData } from '../ui/context.ts'
import { kindIcons, WeeklyProgress } from './plan.tsx'
import { DailySupplements } from './supplements.tsx'

export function Home() {
  const { date, data, settings, save } = useData()
  const [note, setNote] = useState(false)
  const plan = plannedDay(date, data.schedules, settings)
  const Icon = kindIcons[plan.kind]
  const totals = nutrition(data.food, data.supplements, date)
  const used = monthOccasions(data.occasions, date).length
  const savings = savingsFor(data.occasions, data.savings)
  const confirmed = savings.filter(item => item.confirmedAt).reduce((sum, item) => sum + item.amount, 0)
  const pending = savings.filter(item => item.active && !item.confirmedAt).reduce((sum, item) => sum + item.amount, 0)
  const notes = data.notes.filter(item => item.date === date)
  return <>
    <header className="home-intro">
      <p className="eyebrow">{dateLabel(date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <h1>Halo{settings.name ? ', ' + settings.name : ''}<span className="accent">.</span></h1>
      <p>Build muscle. Lose fat. Stay consistent.</p>
    </header>
    <section className="hero-card">
      <div className="hero-content">
        <p className="eyebrow">TODAY’S PLAN</p><h2>{date < settings.start ? 'Belum mulai' : kinds[plan.kind]}</h2>
        <p>{plan.conflict ? 'Jadwal PT berbenturan dengan recovery' : plan.recovery ? 'Recovery setelah leg day' : plan.kind === 'weights' ? [plan.item.pt && 'Bersama PT', plan.item.leg && 'Leg day'].filter(Boolean).join(' · ') : plan.kind === 'cardio' ? plan.item.minutes + ' menit · Ringan hingga sedang' : 'Waktu untuk pemulihan'}</p>
        <a href="#/plan">{plan.completed ? <><CircleCheck size={17}/> Selesai · Lihat jadwal</> : <>Lihat jadwal <ArrowRight size={17}/></>}</a>
      </div>
      <Icon className="hero-icon" aria-hidden="true" strokeWidth={1}/>
    </section>
    <div className="quick-grid" aria-label="Aksi cepat">
      <a href="#/workout/new"><Dumbbell size={21}/>Workout</a><a href="#/nutrition/new"><Utensils size={21}/>Makanan</a>
      <a href="#/progress/new"><Scale size={21}/>Berat badan</a><button onClick={() => setNote(true)}><NotebookPen size={21}/>Catatan</button>
    </div>
    <div className="dash-grid">
      <Card title="Weekly progress" action={<a className="icon-button" href="#/plan" aria-label="Buka Weekly Plan"><ArrowDownRight size={19}/></a>}><WeeklyProgress date={date}/></Card>
      <Card title="Daily nutrition" action={<Flame size={20} className="accent"/>}>
        <div className="row"><span>Kalori</span><strong>{totals.caloriesLogged ? fmt(totals.calories) + ' kcal' : '—'}</strong></div>
        {settings.calories !== undefined && <Meter label="Target kalori" value={totals.calories} max={settings.calories}/>}
        {totals.proteinLogged ? <Meter label="Protein (g)" value={totals.protein} max={settings.protein}/>
          : <div className="row"><span>Protein</span><strong>Belum dicatat</strong></div>}
        {totals.missingWheyLabel && <p className="muted">Sebagian nilai whey masih kosong.</p>}
        <a className="text-link" href="#/nutrition">Food diary <ArrowRight size={16}/></a>
      </Card>
      <Card title="Suplemen hari ini" action={<Zap size={20} className="accent"/>}><DailySupplements date={date}/><a className="text-link" href="#/supplements">Lihat tracker <ArrowRight size={16}/></a></Card>
      <Card title="Monthly discipline" action={<Wallet size={20} className="accent"/>}>
        <Meter label="Jatah mie terpakai" value={used} max={allowance}/>
        <p className={used > allowance ? 'warning' : 'muted'}>Sisa {Math.max(0, allowance - used)} kesempatan{used > allowance ? ' · Batas terlewati' : ''}</p>
        <div className="row"><span>Sudah ditabung</span><strong>{rupiah(confirmed)}</strong></div>
        <div className="row"><span>Perlu disisihkan</span><strong>{rupiah(pending)}</strong></div>
        <a className="text-link" href="#/discipline/quick">Saya ingin makan mie <ArrowRight size={16}/></a>
      </Card>
    </div>
    {notes.length > 0 && <Card title="Catatan hari ini">{notes.map(item => <p key={item.id} className="preserve">{item.text}</p>)}</Card>}
    {note && <Dialog title="Catatan hari ini" close={() => setNote(false)}>
      <Form save={async form => {
        const text = string(form, 'note')
        if (!text) throw new Error('Isi catatan terlebih dahulu.')
        await save([{ table: 'notes', put: { ...record(), date, text } }]); setNote(false)
      }}><NoteField/></Form>
    </Dialog>}
  </>
}


