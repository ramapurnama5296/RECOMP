import { inRange, shift, today, weekDays } from './calendar.ts'
import { record, routineFor } from './model.ts'
import type { Body, ExerciseSet, Food, Kind, Metric, Occasion, Saving, Schedule, Settings, Snapshot, Supplement, Workout } from './model.ts'

function rawSchedule(date: string, schedules: Schedule[], settings: Settings): Schedule {
  const saved = schedules.find(item => item.date === date)
  const index = new Date(date + 'T00:00:00Z').getUTCDay()
  const template = date < settings.start ? routineFor('rest') : settings.routine[(index + 6) % 7]
  return saved ?? { id: date, date, updatedAt: '', ...template, status: 'planned', note: '' }
}

export function plannedDay(date: string, schedules: Schedule[], settings: Settings) {
  const item = rawSchedule(date, schedules, settings)
  const previous = rawSchedule(shift(date, -1), schedules, settings)
  const recovery = (previous.completedAs ?? previous.kind) === 'weights' && previous.leg &&
    (previous.status === 'planned' || previous.status === 'completed')
  const conflict = recovery && item.kind === 'weights' && item.pt && item.status === 'planned'
  const completed = item.completedAs !== undefined || item.status === 'completed'
  const kind = item.completedAs ?? (recovery && !conflict && !completed ? 'rest' : item.kind)
  return { item, recovery, conflict, kind, completed }
}

export function toggleCompleted(plan: ReturnType<typeof plannedDay>): Schedule {
  const { item, kind, completed, conflict } = plan
  if (conflict || (item.status === 'rescheduled' && kind !== 'rest')) throw new Error('Sesi ini tidak dapat ditandai selesai.')
  return {
    ...item, ...record(item.id), completedAs: completed ? undefined : kind,
    status: item.status === 'rescheduled' ? 'rescheduled' : completed ? 'planned' : 'completed',
  }
}

export function reschedule(item: Schedule, destination: Schedule, existing: Schedule[], settings: Settings): [Schedule, Schedule] {
  if (item.date === destination.date || item.status === 'completed' || item.status === 'rescheduled') {
    throw new Error('Sesi ini tidak dapat dipindahkan.')
  }
  if (destination.date < settings.start) throw new Error('Pilih tanggal setelah pelacakan dimulai.')
  if (destination.status !== 'planned' || destination.kind === 'weights' || destination.note) {
    throw new Error('Pilih hari treadmill atau istirahat yang masih kosong. Catatan dan sesi yang ada tetap tersimpan.')
  }
  if (plannedDay(destination.date, existing, settings).recovery) throw new Error('Tanggal tujuan adalah recovery setelah leg day.')
  return [
    { ...item, ...record(item.id), status: 'rescheduled', movedTo: destination.date },
    { ...destination, ...record(destination.id), kind: item.kind, pt: item.pt, leg: item.leg, minutes: item.minutes, note: item.note },
  ]
}

export function weeklyCounts(date: string, data: Snapshot, settings: Settings) {
  const days = weekDays(date)
  return activity(data, settings, days).counts
}
export const workoutCompleted = (workout: Workout, sets: ExerciseSet[]) => sets.some(set => set.workoutId === workout.id && set.done)
function activity(data: Snapshot, settings: Settings, days: string[]) {
  const dates = new Set(days)
  const workouts = data.workouts.filter(item => dates.has(item.date) && workoutCompleted(item, data.sets))
  const cardio = data.cardio.filter(item => dates.has(item.date))
  const loggedWeights = new Set(workouts.map(item => item.date))
  const loggedCardio = new Set(cardio.map(item => item.date))
  const counts: Record<Kind, number> = { weights: workouts.length, cardio: cardio.length, rest: 0 }
  let minutes = cardio.reduce((sum, item) => sum + item.minutes, 0)
  for (const date of days) {
    const plan = plannedDay(date, data.schedules, settings)
    if (!plan.completed || (plan.kind === 'weights' && loggedWeights.has(date)) ||
        (plan.kind === 'cardio' && loggedCardio.has(date))) continue
    counts[plan.kind]++
    if (plan.kind === 'cardio') minutes += plan.item.minutes
  }
  return { counts, minutes }
}
export function monthOccasions(occasions: Occasion[], date: string) {
  return occasions.filter(item => item.date.startsWith(date.slice(0, 7))).sort((a, b) =>
    a.date.localeCompare(b.date) || (a.createdAt ?? '').localeCompare(b.createdAt ?? '') || a.id.localeCompare(b.id))
}
export const allowance = 2
export const contribution = 20000
export function savingsFor(occasions: Occasion[], saved: Saving[]) {
  const months = new Set(occasions.map(item => item.date.slice(0, 7)))
  const overages = [...months].flatMap(month => monthOccasions(occasions, month).slice(allowance))
  const prior = new Map(saved.map(item => [item.id, item]))
  const active = new Set(overages.map(item => item.id))
  const due = overages.map(item => {
    const previous = prior.get(item.id)
    return {
      id: item.id, updatedAt: item.updatedAt, date: item.date, food: item.name, amount: contribution, trigger: '', alternative: '', next: '',
      ...previous,
      ...(previous?.confirmedAt ? {} : { date: item.date, food: item.name }),
      active: true,
    }
  })
  if (saved.length) due.push(...saved.filter(item => !active.has(item.id)).map(item => ({ ...item, active: false })))
  return due.sort((a, b) => b.date.localeCompare(a.date) || b.id.localeCompare(a.id))
}
export function nutrition(food: Food[], supplements: Supplement[], date: string) {
  const meals = food.filter(item => item.date === date)
  const whey = supplements.filter(item => item.type === 'whey' && item.date === date)
  const total = (key: 'calories' | 'protein') => meals.reduce((sum, item) => sum + item[key], 0) +
    whey.reduce((sum, item) => sum + (item[key] ?? 0) * item.amount, 0)
  return {
    calories: total('calories'), protein: total('protein'),
    caloriesLogged: meals.length > 0 || whey.some(item => item.calories !== undefined),
    proteinLogged: meals.length > 0 || whey.some(item => item.protein !== undefined),
    missingWheyLabel: whey.some(item => item.calories === undefined || item.protein === undefined),
  }
}
export function measured(body: Body[], metric: Metric) {
  return body.filter(item => item.values[metric] !== undefined).sort((a, b) => a.date.localeCompare(b.date) || a.updatedAt.localeCompare(b.updatedAt))
    .map(item => ({ date: item.date, value: item.values[metric]! }))
}
export function metricChange(points: { date: string; value: number }[], days?: number) {
  const latest = points.at(-1)
  if (!latest || points.length < 2) return undefined
  if (days === undefined) return latest.value - points[0].value
  const base = points.findLast(point => point.date <= shift(latest.date, -days))
  return base && latest.value - base.value
}
export function personalRecords(workouts: Workout[], sets: ExerciseSet[]) {
  const sessions = new Map(workouts.map(workout => [workout.id, workout]))
  const result = new Map<string, ExerciseSet & { date: string }>()
  for (const set of sets) {
    const session = sessions.get(set.workoutId)
    if (!set.done || !session) continue
    const key = set.exercise.trim().toLowerCase()
    const previous = result.get(key)
    if (!previous || set.kg > previous.kg || (set.kg === previous.kg && set.reps > previous.reps)) {
      result.set(key, { ...set, date: session.date })
    }
  }
  return [...result.values()].sort((a, b) => a.exercise.localeCompare(b.exercise))
}
export function report(data: Snapshot, settings: Settings, start: string, end: string) {
  const dates = []
  for (let date = start; date < end; date = shift(date, 1)) dates.push(date)
  const totals = dates.map(date => nutrition(data.food, data.supplements, date))
  const average = (key: 'calories' | 'protein') => {
    const entries = totals.filter(item => key === 'calories' ? item.caloriesLogged : item.proteinLogged)
    return entries.length ? entries.reduce((sum, item) => sum + item[key], 0) / entries.length : undefined
  }
  const within = (item: {date: string}) => inRange(item.date, start, end)
  const { counts, minutes } = activity(data, settings, dates)
  const changeInPeriod = (metric: Metric) => {
    const points = measured(data.body, metric)
    const current = points.filter(within)
    if (!current.length) return undefined
    const previous = points.findLast(item => item.date < start)
    return previous ? current.at(-1)!.value - previous.value : metricChange(current)
  }
  return {
    workouts: counts.weights, treadmill: counts.cardio, minutes, recovery: counts.rest,
    calories: average('calories'), protein: average('protein'),
    creatine: data.supplements.filter(item => item.type === 'creatine' && within(item)).length,
    days: dates.length,
    body: Object.fromEntries((['weight', 'fat', 'muscle', 'waist'] as const).map(metric => [metric, changeInPeriod(metric)])),
    occasions: data.occasions.filter(within).length,
    savings: data.savings.filter(item => item.confirmedAt && within({ date: today(new Date(item.confirmedAt)) }))
      .reduce((sum, item) => sum + item.amount, 0),
    notes: [...data.notes.filter(within).map(item => [item.date, item.text] as const),
      ...data.schedules.filter(item => within(item) && item.note).map(item => [item.date, item.note] as const)].sort(),
  }
}

