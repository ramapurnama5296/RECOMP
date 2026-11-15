import { useState } from 'react'
import { dateLabel, daysBetween, shiftMonth, today } from '../domain/calendar.ts'
import { record, stamp } from '../domain/model.ts'
import type { Occasion, Saving } from '../domain/model.ts'
import { allowance, contribution, monthOccasions, savingsFor } from '../domain/tracking.ts'
import { Actions, Add, Card, Dialog, Empty, Field, Form, Heading, Meter, NoteField, Pager, rupiah, string } from '../ui/common.tsx'
import { useData } from '../ui/context.ts'

export function Discipline({ prompt = false }: { prompt?: boolean }) {
  const { date, settings, data, save } = useData()
  const [month, setMonth] = useState(shiftMonth(date, 0))
  const [editing, setEditing] = useState<Occasion | null | undefined>()
  const [craving, setCraving] = useState(prompt)
  const [deposit, setDeposit] = useState<(Saving & { active: boolean })>()
  const entries = monthOccasions(data.occasions, month)
  const left = Math.max(0, allowance - entries.length)
  const leftNow = Math.max(0, allowance - monthOccasions(data.occasions, date).length)
  const savings = savingsFor(data.occasions, data.savings)
  const monthly = savings.filter(item => item.date.startsWith(month.slice(0, 7)) && (item.active || item.confirmedAt))
  const saved = savings.filter(item => item.confirmedAt).reduce((sum, item) => sum + item.amount, 0)
  const pending = savings.filter(item => item.active && !item.confirmedAt).reduce((sum, item) => sum + item.amount, 0)
  return <>
    <Heading title="Monthly Discipline" sub="Dua kesempatan gabungan setiap bulan." back/>
    <Pager label={dateLabel(month, { month: 'long', year: 'numeric' })} previous={() => setMonth(shiftMonth(month, -1))} next={() => setMonth(shiftMonth(month, 1))}/>
    <Card title="Jatah mie" action={<Add onClick={() => setEditing(null)}>Catat konsumsi</Add>}>
      <Meter label="Kesempatan terpakai" value={entries.length} max={allowance}/>
      <div className="row"><span>Sisa jatah</span><strong>{left} kesempatan</strong></div>
      <p className="muted">Jatah bulan berjalan diperbarui dalam {daysBetween(date, shiftMonth(date, 1))} hari · {dateLabel(shiftMonth(date, 1))} WIB.</p>
      {entries.length > allowance && <p className="warning" role="status">Batas bulan ini sudah terlewati. Catat sesuai kejadian, sisihkan {rupiah(contribution)} per kesempatan tambahan, lalu pilih satu langkah yang membantu untuk berikutnya.</p>}
      <button className="button" onClick={() => setCraving(true)}>Saya ingin makan mie</button>
    </Card>
    <Card title="Riwayat konsumsi">
      {!entries.length && <Empty>Belum ada konsumsi tercatat untuk bulan ini.</Empty>}
      {entries.map((item, i) => <div className="log-row divided" key={item.id}><div className="grow">
        <strong>{item.name}</strong><small>{dateLabel(item.date)}{i >= allowance && ' · Melebihi jatah'}</small>
        {item.note && <small className="preserve">{item.note}</small>}</div>
        <Actions edit={() => setEditing(item)} remove={() => save([{ table: 'occasions', remove: item.id }])}/></div>)}
    </Card>
    <Card title="Tabungan Disiplin">
      <p className="muted">Alokasikan {rupiah(contribution)} per kesempatan tambahan. Konfirmasi setelah benar-benar menyisihkan uang.</p>
      {settings.savingsGoal && <p>Tujuan · {settings.savingsGoal}</p>}
      <div className="row"><span>Total terkonfirmasi</span><strong>{rupiah(saved)}</strong></div>
      <div className="row"><span>Total perlu disisihkan</span><strong>{rupiah(pending)}</strong></div>
      <div className="row"><span>Terkonfirmasi untuk konsumsi bulan ini</span><strong>{rupiah(monthly.filter(item => item.confirmedAt).reduce((sum, item) => sum + item.amount, 0))}</strong></div>
      {!monthly.length && <Empty>Belum ada setoran untuk bulan yang dipilih.</Empty>}
      {monthly.map(item => <div className="log-row divided" key={item.id}><div className="grow">
        <strong>{rupiah(item.amount)} · {item.food}</strong>
        <small>{dateLabel(item.date)} · {item.confirmedAt ? 'Dikonfirmasi' : 'Belum disisihkan'}{!item.active && ' · Konsumsi telah dikoreksi'}</small>
        {item.trigger && <small className="preserve">Pemicu · {item.trigger}</small>}
        {item.alternative && <small className="preserve">Alternatif · {item.alternative}</small>}
        {item.next && <small className="preserve">Langkah berikutnya · {item.next}</small>}
      </div><button className="button" onClick={() => setDeposit(item)}>{item.confirmedAt ? 'Evaluasi' : 'Buka'}</button></div>)}
    </Card>
    {editing !== undefined && <Dialog title={editing ? 'Edit konsumsi' : 'Catat konsumsi'} close={() => setEditing(undefined)}>
      <Form save={async form => {
        const name = string(form, 'food')
        if (!name) throw new Error('Isi nama makanan.')
        const entryDate = string(form, 'date')
        const entry = record(editing?.id)
        await save([{ table: 'occasions', put: { ...entry, createdAt: editing ? editing.createdAt : entry.updatedAt,
          name, date: entryDate, note: string(form, 'note') } }])
        setMonth(shiftMonth(entryDate, 0)); setEditing(undefined)
      }}>
        <p className="muted">Satu waktu makan dihitung satu kali. Gabungkan semua hidangan mie atau bakso yang dimakan pada kesempatan yang sama.</p>
        <Field label="Tanggal konsumsi" type="date" name="date" defaultValue={editing?.date ?? (month === shiftMonth(date, 0) ? date : month)} max={date} required/>
        <Field label="Nama makanan" name="food" placeholder="Nama hidangan dalam satu kali makan" defaultValue={editing?.name} required/>
        <NoteField value={editing?.note}/>
      </Form>
    </Dialog>}
    {craving && <Dialog title="Saya ingin makan mie" close={() => setCraving(false)}>
      <p className={leftNow ? '' : 'warning'}>{leftNow
        ? 'Masih ada ' + leftNow + ' kesempatan bulan ini. Ingat komitmen dua kali sebulan dan pertimbangkan pilihan lain dulu.'
        : 'Jatah bulan ini sudah habis. Pegang komitmenmu dan pilih makanan lain untuk kali ini.'}</p>
      <p>Ayam bakar, nasi dengan lauk protein, ikan panggang, atau telur bisa jadi pilihan.</p>
      <button className="button primary" onClick={() => setCraving(false)}>Tutup pengingat</button>
    </Dialog>}
    {deposit && <Dialog title="Evaluasi dan setoran" close={() => setDeposit(undefined)}>
      <Form save={async form => {
        const current = savings.find(item => item.id === deposit.id)
        if (!current || (!current.active && !current.confirmedAt)) throw new Error('Konsumsi berubah. Periksa kembali riwayat tabungan.')
        const { active: _active, ...item } = current
        void _active
        await save([{ table: 'savings', put: { ...item, ...record(item.id),
          trigger: string(form, 'trigger'), alternative: string(form, 'alternative'), next: string(form, 'next'),
          confirmedAt: item.confirmedAt ?? (form.has('confirmed') ? stamp() : undefined),
        }}]); setDeposit(undefined)
      }}>
        <p className="muted">{rupiah(deposit.amount)} · {deposit.food}</p>
        <NoteField label="Apa yang membuat saya tergoda?" name="trigger" value={deposit.trigger}/>
        <NoteField label="Alternatif apa yang bisa saya pilih lain kali?" name="alternative" value={deposit.alternative}/>
        <NoteField label="Apa langkah saya untuk kembali konsisten?" name="next" value={deposit.next}/>
        {!deposit.confirmedAt && <label className="check"><input type="checkbox" name="confirmed"/> Saya sudah menyisihkan {rupiah(deposit.amount)}</label>}
        {deposit.confirmedAt && <p className="muted">Setoran dikonfirmasi {dateLabel(today(new Date(deposit.confirmedAt)))}.</p>}
      </Form>
    </Dialog>}
  </>
}

