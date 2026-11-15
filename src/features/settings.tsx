import { useState } from 'react'
import { CheckCircle2, Download, ShieldCheck } from 'lucide-react'
import { shift, today, ZONE } from '../domain/calendar.ts'
import { decodeBackup, encodeBackup } from '../data/backup.ts'
import { replaceAll, write } from '../data/db.ts'
import { download } from '../data/files.ts'
import { defaultRoutine, initialSettings, record, routineFor } from '../domain/model.ts'
import type { Change, Kind, Routine, Settings as Profile, Snapshot } from '../domain/model.ts'
import { plannedDay } from '../domain/tracking.ts'
import { useData } from '../ui/context.ts'
import { Card, Check, checked, Dialog, Field, Form, Heading, Num, number, optional, Select, string } from '../ui/common.tsx'

function ProfileFields({ profile, onboarding = false }: { profile: Profile; onboarding?: boolean }) {
  return <div className="field-grid">
    <Field label="Nama panggilan (opsional)" name="name" defaultValue={profile.name} maxLength={50}/>
    <Field label="Mulai tracking" type="date" name="start" defaultValue={profile.start} required/>
    <Num label="Usia" name="age" min={1} max={130} step={1} defaultValue={profile.age}/>
    <Num label="Tinggi badan (cm)" name="height" min={1} defaultValue={profile.height}/>
    <Select label="Jenis kelamin (opsional)" name="sex" values={[['', 'Tidak diisi'], 'Pria', 'Wanita', 'Lainnya']} defaultValue={profile.sex}/>
    <Field label="Zona waktu" value={ZONE} readOnly/>
    <Num label="Target latihan / minggu" name="weights" min={1} max={7} step={1} defaultValue={profile.weights} required/>
    <Num label="Target treadmill / minggu" name="cardio" max={3} step={1} defaultValue={profile.cardio} required/>
    <Num label="Target kalori (opsional)" name="calories" min={1} defaultValue={profile.calories}/>
    <Num label="Target protein (g)" name="protein" min={1} defaultValue={profile.protein} required/>
    <Num label="Target berat (kg, opsional)" name="targetWeight" min={1} defaultValue={profile.targetWeight}/>
    {onboarding && <Select label="Jadwal PT kedua" name="second" values={[[ 'thursday', 'Kamis'], ['friday', 'Jumat']]}
      defaultValue="thursday"/>}
  </div>
}
function profileFrom(form: FormData, profile: Profile): Profile {
  return {
    ...profile, ...record('profile'), name: string(form, 'name'), start: string(form, 'start'),
    age: optional(form, 'age'), height: optional(form, 'height'), sex: string(form, 'sex'),
    weights: number(form, 'weights'), cardio: number(form, 'cardio'), calories: optional(form, 'calories'),
    protein: number(form, 'protein'), targetWeight: optional(form, 'targetWeight'),
    routine: form.has('second') ? defaultRoutine(string(form, 'second') === 'friday' ? 'friday' : 'thursday') : profile.routine,
  }
}
export function Onboarding({ db, refresh }: { db: IDBDatabase; refresh: () => Promise<void> }) {
  const date = today()
  const profile = initialSettings(date)
  return <div className="onboarding">
    <Heading title="Mulai RECOMP" sub="Build muscle. Lose fat. Stay consistent."/>
    <Card title="Profil dan target" action={<ShieldCheck size={22} className="accent"/>}>
      <p className="muted">Data tersimpan di perangkat ini. Nama panggilan bersifat opsional.</p>
      <Form label="Mulai tracking" save={async form => {
        const name = string(form, 'occasion')
        const occasionDate = string(form, 'occasionDate')
        if (Boolean(name) !== Boolean(occasionDate)) throw new Error('Isi nama makanan dan tanggal, atau kosongkan keduanya.')
        const changes: Change[] = [{ table: 'settings', put: profileFrom(form, profile) }]
        if (name && occasionDate) {
          const entry = record()
          changes.push({ table: 'occasions', put: { ...entry, createdAt: entry.updatedAt, date: occasionDate, name, note: '' } })
        }
        await write(db, changes)
        await refresh()
      }}>
        <ProfileFields profile={profile} onboarding/>
        <fieldset className="field-grid"><legend>Catatan jatah mie awal (opsional)</legend>
          <Field label="Tanggal konsumsi" type="date" name="occasionDate" max={date}/>
          <Field label="Nama hidangan" name="occasion" placeholder="Gabungkan hidangan dari satu waktu makan"/>
        </fieldset>
        <p className="muted">Catatan lain bisa ditambahkan di Monthly Discipline setelah setup.</p>
      </Form>
    </Card>
  </div>
}

const weekdays = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu']
function RoutineForm({ routine, onSave }: { routine: Routine[]; onSave: (next: Routine[]) => Promise<void> }) {
  const [draft, setDraft] = useState(routine)
  function changeDay(index: number, activity: string) {
    setDraft(current => current.map((item, day) => day === index
      ? routineFor(activity === 'pt' ? 'weights' : activity as Kind, activity === 'pt') : item))
  }
  return <Form label="Simpan jadwal mingguan" save={async () => {
    if (!draft.some(item => item.kind === 'rest')) throw new Error('Sisakan minimal satu hari full rest.')
    if (draft.filter(item => item.kind === 'cardio').length > 3) throw new Error('Jadwalkan maksimal tiga hari treadmill.')
    await onSave(draft)
  }}>
    <div className="button-row">
      <button type="button" className="button" onClick={() => setDraft(defaultRoutine('thursday'))}>Default PT Kamis</button>
      <button type="button" className="button" onClick={() => setDraft(defaultRoutine('friday'))}>Default PT Jumat</button>
    </div>
    <div className="field-grid">{draft.map((entry, index) => <Select key={weekdays[index]} label={weekdays[index]} name={'day-' + index}
      values={[[ 'pt', 'Weight training dengan PT'], ['weights', 'Weight training'], ['cardio', 'Treadmill 30 menit'], ['rest', 'Full rest']]}
      value={entry.pt ? 'pt' : entry.kind} onChange={value => changeDay(index, value)}/>)}</div>
    <p className="muted">Berlaku sebagai template untuk hari yang belum diedit. Untuk mengubah durasi dan leg day pada tanggal tertentu, buka Weekly Plan.</p>
  </Form>
}

export function Settings() {
  const { db, data, settings, date, save, refresh } = useData()
  const [show, setShow] = useState<'replace' | 'delete'>()
  const [importData, setImport] = useState<Snapshot>()
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [include, setInclude] = useState(false)
  async function saveProfile(next: Profile) {
    const changes: Change[] = [{ table: 'settings', put: next }]
    if (next.start !== settings.start || JSON.stringify(next.routine) !== JSON.stringify(settings.routine)) {
      const existing = new Set(data.schedules.map(item => item.date))
      for (let day = settings.start; day < date; day = shift(day, 1)) {
        if (existing.has(day)) continue
        const { item } = plannedDay(day, data.schedules, settings)
        changes.push({ table: 'schedules', put: { ...item, ...record(day) } })
      }
    }
    await save(changes)
    setNotice('Preferensi tersimpan.')
  }
  return <>
    <Heading title="Settings" sub="Atur target, preferensi, dan data lokal." back/>
    <Card title="Profil dan target">
      <Form save={async form => {
        const next: Profile = {
          ...profileFrom(form, settings), creatine: number(form, 'creatine'),
          whey: string(form, 'whey'), flavor: string(form, 'flavor'), wheyProtein: optional(form, 'wheyProtein'),
          wheyCalories: optional(form, 'wheyCalories'), savingsGoal: string(form, 'savingsGoal'),
          compact: checked(form, 'compact'),
        }
        await saveProfile(next)
      }}>
        <ProfileFields profile={settings}/>
        <fieldset className="field-grid"><legend>Suplemen dan tampilan</legend>
          <Num label="Creatine per hari (g)" name="creatine" min={0.01} defaultValue={settings.creatine} required/>
          <Field label="Nama whey" name="whey" defaultValue={settings.whey}/>
          <Field label="Varian rasa whey" name="flavor" defaultValue={settings.flavor}/>
          <Num label="Protein whey per serving (g)" name="wheyProtein" defaultValue={settings.wheyProtein}/>
          <Num label="Kalori whey per serving (kcal)" name="wheyCalories" defaultValue={settings.wheyCalories}/>
          <Field label="Tujuan tabungan" name="savingsGoal" defaultValue={settings.savingsGoal}/>
          <Check name="compact" defaultChecked={settings.compact}>Tampilan lebih rapat</Check>
        </fieldset>
      </Form>
    </Card>
    <Card title="Template jadwal mingguan">
      <RoutineForm key={JSON.stringify(settings.routine)} routine={settings.routine}
        onSave={routine => saveProfile({ ...settings, ...record('profile'), routine })}/>
    </Card>
    <Card title="Backup dan restore" action={<Download className="accent" size={21}/>}>
      <p className="muted">Data lokal tidak otomatis sinkron antara iPhone dan Windows. Data dapat hilang bila data situs atau aplikasi dihapus. Simpan salinan backup di tempat pribadi.</p>
      <label className="check"><input type="checkbox" checked={include} onChange={event => setInclude(event.target.checked)}/> Sertakan foto progres</label>
      <button className="button primary" onClick={() => download(encodeBackup(data, include), 'recomp-backup-' + date + '.json', 'application/json')}>Export backup JSON</button>
      <Field label="Pilih file backup JSON" type="file" accept=".json,application/json" onChange={async event => {
        const file = event.target.files?.[0]
        setImport(undefined); setError(''); setNotice('')
        if (!file) return
        try {
          if (file.size > 150_000_000) throw new Error('Backup terlalu besar.')
          setImport(decodeBackup(await file.text()))
        }
        catch { setError('Backup tidak valid, terlalu besar, atau formatnya tidak didukung.') }
        finally { event.target.value = '' }
      }}/>
      {importData && <>
        <p className="muted">Merge mempertahankan data lokal dan menggabungkan berdasarkan ID. Replace mengganti seluruh data, termasuk foto bila backup tidak menyertakannya.</p>
        <div className="button-row"><button className="button" onClick={async () => {
          try { await replaceAll(db, importData, true); await refresh(); setImport(undefined); setNotice('Backup digabungkan.') }
          catch { setError('Backup gagal digabungkan.') }
        }}>Merge backup</button><button className="button" onClick={() => setShow('replace')}>Replace semua data</button></div>
      </>}
      {notice && <p className="text-link" role="status"><CheckCircle2 size={18}/>{notice}</p>}
      {error && <p className="error" role="alert">{error}</p>}
    </Card>
    <Card title="Hapus data">
      <button className="button danger" onClick={() => setShow('delete')}>Hapus seluruh data lokal</button>
    </Card>
    {show && <Dialog title={show === 'delete' ? 'Hapus seluruh data?' : 'Ganti seluruh data?'} close={() => setShow(undefined)}>
      <Form label={show === 'delete' ? 'Hapus seluruh data' : 'Ganti seluruh data'} save={async form => {
        if (string(form, 'confirm') !== 'RECOMP') throw new Error('Ketik RECOMP untuk mengonfirmasi.')
        await replaceAll(db, show === 'replace' ? importData : undefined)
        await refresh(); setShow(undefined); setImport(undefined); setNotice('Perubahan data selesai.')
      }}>
        <p className="warning">Data saat ini akan dihapus dari perangkat ini. Ekspor backup terlebih dahulu jika ingin menyimpan salinannya.</p>
        <Field label="Ketik RECOMP" name="confirm" autoComplete="off" required/>
      </Form>
    </Dialog>}
  </>
}


