import { useState } from 'react'
import { dateLabel, shift, shiftMonth, weekStart } from '../domain/calendar.ts'
import { download } from '../data/files.ts'
import { metrics } from '../domain/model.ts'
import { report } from '../domain/tracking.ts'
import { Card, Empty, fmt, Heading, Pager, rupiah } from '../ui/common.tsx'
import { useData } from '../ui/context.ts'

export function Reports() {
  const { data, date, settings } = useData()
  const [monthly, setMonthly] = useState(false)
  const [offset, setOffset] = useState(0)
  const start = monthly ? shiftMonth(date, offset) : shift(weekStart(date), offset * 7)
  const end = monthly ? shiftMonth(start, 1) : shift(start, 7)
  const previous = monthly ? shiftMonth(start, -1) : shift(start, -7)
  const current = report(data, settings, start, end)
  const prior = report(data, settings, previous, start)
  const formatted = (value?: number, unit = '') => value === undefined ? '—' : fmt(value) + unit
  const rows = [
    ['Workout', String(current.workouts), String(prior.workouts)],
    ['Treadmill', String(current.treadmill), String(prior.treadmill)],
    ['Menit cardio tercatat', String(current.minutes), String(prior.minutes)],
    ['Recovery selesai', String(current.recovery), String(prior.recovery)],
    ['Rata-rata kalori', formatted(current.calories, ' kcal'), formatted(prior.calories, ' kcal')],
    ['Rata-rata protein', formatted(current.protein, ' g'), formatted(prior.protein, ' g')],
    ['Creatine', current.creatine + '/' + current.days + ' hari', prior.creatine + '/' + prior.days + ' hari'],
    ...(['weight', 'fat', 'muscle', 'waist'] as const).map(key => ['Perubahan ' + metrics[key], formatted(current.body[key]), formatted(prior.body[key])]),
    ...(monthly ? [['Jatah mie terpakai', current.occasions + '/2', prior.occasions + '/2'],
      ['Setoran terkonfirmasi', rupiah(current.savings), rupiah(prior.savings)]] : []),
  ]
  const label = monthly ? dateLabel(start, { month: 'long', year: 'numeric' }) : dateLabel(start) + ' – ' + dateLabel(shift(end, -1))
  function exportReport() {
    const fields = [['Metrik', label, 'Periode sebelumnya'], ...rows, ...current.notes.map(([when, note]) => ['Catatan ' + when, note, ''])]
    const csv = fields.map(row => row.map(value => '"' + value.replace(/^[=+@-](?!\d)/, "'$&").replaceAll('"', '""') + '"').join(',')).join('\r\n')
    download('\ufeff' + csv, 'recomp-report-' + start + '.csv', 'text/csv;charset=utf-8')
  }
  return <>
    <Heading title="Reports" sub="Ringkasan aktivitas dan kebiasaan dari catatan lokal." back/>
    <div className="segmented">
      <button aria-pressed={!monthly} onClick={() => { setMonthly(false); setOffset(0) }}>Weekly</button>
      <button aria-pressed={monthly} onClick={() => { setMonthly(true); setOffset(0) }}>Monthly</button>
    </div>
    <Pager label={label} previous={() => setOffset(offset - 1)} next={() => setOffset(offset + 1)}/>
    <Card title="Ringkasan" action={<button className="button" onClick={exportReport}>Export CSV</button>}>
      <table className="report-table"><thead><tr><th scope="col">Metrik</th><th scope="col">Periode ini</th><th scope="col">Sebelumnya</th></tr></thead>
        <tbody>{rows.map(([name, value, last]) => <tr key={name}><th scope="row">{name}</th><td>{value}</td><td>{last}</td></tr>)}</tbody>
      </table>
      <p className="muted">Rata-rata nutrisi memakai hari dengan angka yang tercatat. Angka nol yang dicatat tetap dihitung.</p>
    </Card>
    <Card title="Catatan periode">
      {!current.notes.length && <Empty>Belum ada catatan.</Empty>}
      {current.notes.map(([when, note], index) => <div className="divided" key={when + ':' + index}>
        <small>{dateLabel(when)}</small><p className="preserve">{note}</p></div>)}
    </Card>
  </>
}

