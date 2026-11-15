import { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { Activity, BarChart3, CalendarDays, ChevronRight, Dumbbell, Ellipsis, HardDrive, House, Settings as Gear, ShieldCheck, Smartphone, Utensils, Wallet, Zap } from 'lucide-react'
import { openDatabase, readAll, subscribe, write } from './data/db.ts'
import { today } from './domain/calendar.ts'
import type { Change, Snapshot } from './domain/model.ts'
import { Discipline } from './features/discipline.tsx'
import { Home } from './features/home.tsx'
import { Nutrition } from './features/nutrition.tsx'
import { Plan } from './features/plan.tsx'
import { Progress } from './features/progress.tsx'
import { Reports } from './features/reports.tsx'
import { Onboarding, Settings } from './features/settings.tsx'
import { Supplements } from './features/supplements.tsx'
import { Workout } from './features/workout.tsx'
import { Card, Heading } from './ui/common.tsx'
import { DataContext } from './ui/context.ts'
import { registerPwa } from './pwa.ts'
import './style.css'

const nav = [
  ['home', 'Home', House], ['plan', 'Plan', CalendarDays], ['workout', 'Workout', Dumbbell],
  ['progress', 'Progress', BarChart3], ['more', 'More', Ellipsis],
] as const
const extra = [
  ['nutrition', 'Nutrition Tracker', 'Food diary dan target harian', Utensils],
  ['supplements', 'Supplement Tracker', 'Creatine, whey, dan suplemen lain', Zap],
  ['discipline', 'Monthly Discipline', 'Jatah mie dan Tabungan Disiplin', Wallet],
  ['reports', 'Reports', 'Ringkasan mingguan dan bulanan', Activity],
  ['settings', 'Settings', 'Profil, target, backup, dan restore', Gear],
  ['install', 'Install di iPhone', 'Tambahkan ke Home Screen', Smartphone],
] as const
function More() {
  return <><Heading title="More"/>
    <Card>{extra.map(([path, title, detail, Icon]) => <a className="log-row menu-item divided" key={path} href={'#/' + path}>
      <span className="tile-icon"><Icon size={20}/></span><span className="grow"><strong>{title}</strong><small>{detail}</small></span><ChevronRight size={19}/>
    </a>)}</Card></>
}
function Install({ offline }: { offline: string }) {
  return <><Heading title="Install di iPhone" sub="Buka RECOMP langsung dari Home Screen." back/>
    <Card title="Tambahkan dari Safari"><ol className="steps">
      <li>Buka website RECOMP di Safari.</li><li>Tekan Share.</li><li>Pilih Add to Home Screen.</li>
      <li>Aktifkan Open as Web App jika tersedia.</li><li>Tekan Add, lalu buka RECOMP dari Home Screen saat masih online.</li>
    </ol></Card>
    <Card title="Akses offline" action={<ShieldCheck size={21} className="accent"/>}>
      <p role="status">{offline}</p>
      <p className="muted">Selesaikan pemuatan awal sebelum offline. Data disimpan di perangkat yang dipakai. Gunakan backup untuk pindah perangkat.</p>
    </Card>
  </>
}
function App() {
  const [connection, setConnection] = useState<IDBDatabase>()
  const [data, setData] = useState<Snapshot>()
  const [date, setDate] = useState(today)
  const [hash, setHash] = useState(location.hash)
  const [error, setError] = useState('')
  const [offline, setOffline] = useState('Menyiapkan akses offline…')
  const [update, setUpdate] = useState<ServiceWorker>()
  const [refreshProblem, setRefreshProblem] = useState('')
  useEffect(() => {
    let live = true
    let db: IDBDatabase | undefined
    let sequence = 0
    const refresh = () => {
      if (!db) return
      const token = ++sequence
      void readAll(db).then(snapshot => {
        if (live && token === sequence) { setData(snapshot); setRefreshProblem('') }
      }).catch(() => { if (live) setRefreshProblem('Data gagal dimuat ulang. Muat ulang halaman untuk mencoba lagi.') })
    }
    const unsubscribe = subscribe(refresh)
    void openDatabase().then(async opened => {
      if (!live) { opened.close(); return }
      db = opened
      setConnection(opened)
      const snapshot = await readAll(opened)
      if (live && sequence === 0) setData(snapshot)
    }).catch(error => { if (live) setError(error instanceof Error ? error.message : 'Penyimpanan lokal tidak tersedia.') })
    return () => { live = false; db?.close(); unsubscribe() }
  }, [])
  useEffect(() => {
    const change = () => { setHash(location.hash); window.scrollTo(0, 0) }
    const updateDate = () => setDate(today())
    window.addEventListener('hashchange', change)
    window.addEventListener('focus', updateDate)
    document.addEventListener('visibilitychange', updateDate)
    const clock = setInterval(updateDate, 15000)
    return () => {
      clearInterval(clock); window.removeEventListener('hashchange', change)
      window.removeEventListener('focus', updateDate); document.removeEventListener('visibilitychange', updateDate)
    }
  }, [])
  useEffect(() => registerPwa(setOffline, setUpdate), [])
  const settings = data?.settings[0]
  async function refresh() { if (connection) setData(await readAll(connection)) }
  async function save(changes: Change[]) {
    if (!connection) throw new Error('Penyimpanan lokal belum siap.')
    await write(connection, changes)
    await refresh()
  }
  const [, screen = 'home', action] = hash.split('/')
  const current = !screen ? 'home' : screen
  const selected = extra.some(([path]) => path === current) ? 'more' : current
  const screens = {
    home: <Home/>, plan: <Plan/>, workout: <Workout create={action === 'new'}/>,
    progress: <Progress create={action === 'new'}/>, nutrition: <Nutrition create={action === 'new'}/>,
    supplements: <Supplements/>, discipline: <Discipline prompt={action === 'quick'}/>,
    reports: <Reports/>, settings: <Settings/>, more: <More/>, install: <Install offline={offline}/>,
  }
  return <div className={'shell ' + (settings?.compact ? 'compact' : '')}>
    <a href="#main" className="skip" onClick={event => { event.preventDefault(); document.getElementById('main')?.focus() }}>Ke konten utama</a>
    <header className="topbar">
      <a className="brand" href="#/home"><img src={import.meta.env.BASE_URL + 'icons/icon-192.png'} width={34} height={34} alt=""/>RECOMP<span>.</span></a>
      <span className="local-indicator" title={offline}><HardDrive size={14}/> Lokal</span>
    </header>
    <main id="main" tabIndex={-1}>
      {update && <div className="update row" role="status"><span>Versi baru tersedia.</span><button className="button" onClick={() => update.postMessage('ACTIVATE_UPDATE')}>Muat versi baru</button></div>}
      {error && <Card title="Penyimpanan gagal dibuka"><p className="error" role="alert">{error}</p><button className="button" onClick={() => location.reload()}>Coba lagi</button></Card>}
      {refreshProblem && <p className="warning" role="alert">{refreshProblem}</p>}
      {!error && (!connection || !data) && <p className="muted" role="status">Membuka data lokal…</p>}
      {connection && data && !settings && <Onboarding db={connection} refresh={async () => { await refresh(); location.hash = '#/home' }}/>}
      {connection && data && settings && <DataContext.Provider value={{ db: connection, data, settings, date, save, refresh }}>
        <div className="screen" key={current + '/' + (action ?? '')}>{screens[current as keyof typeof screens] ?? <Home/>}</div>
      </DataContext.Provider>}
    </main>
    {settings && <nav className="bottom" aria-label="Navigasi utama"><div className="nav-inner">{nav.map(([path, label, Icon]) =>
      <a key={path} className={selected === path ? 'active' : ''} href={'#/' + path} aria-current={selected === path ? 'page' : undefined}>
        <Icon aria-hidden="true" size={22}/><span>{label}</span>
      </a>)}</div></nav>}
  </div>
}
createRoot(document.getElementById('root')!).render(<App/>)

