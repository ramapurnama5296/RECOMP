import { z } from 'zod'
import { tableNames, splits, meals, metrics } from '../domain/model.ts'
import type { Snapshot } from '../domain/model.ts'

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value => {
  const parsed = new Date(value + 'T00:00:00Z')
  return Number.isFinite(+parsed) && parsed.toISOString().slice(0, 10) === value
})
const text = z.string().max(12000)
const name = z.string().trim().min(1).max(200)
const id = z.string().min(1).max(100)
const number = z.number().finite().nonnegative()
const count = number.int()
const base = z.object({ id, updatedAt: z.string().datetime() })
const dated = base.extend({ date })
const routine = z.object({ kind: z.enum(['weights', 'cardio', 'rest']), minutes: count.max(1440), pt: z.boolean(), leg: z.boolean() })
const foodFields = {
  name, time: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/), meal: z.enum(meals),
  calories: number, protein: number, carbs: number.optional(), fat: number.optional(), portion: text, note: text,
  estimated: z.boolean().optional(),
}
const schemas = {
  settings: base.extend({
    id: z.literal('profile'), name: text, start: date, age: count.optional(), height: number.optional(), sex: text,
    calories: number.optional(), protein: number, targetWeight: number.optional(), weights: count.max(7), cardio: count.max(3),
    routine: routine.array().length(7), creatine: number, whey: text, flavor: text,
    wheyProtein: number.optional(), wheyCalories: number.optional(), compact: z.boolean(), savingsGoal: text,
  }),
  schedules: dated.merge(routine).extend({
    status: z.enum(['planned', 'completed', 'skipped', 'rescheduled']), note: text, movedTo: date.optional(),
    completedAs: z.enum(['weights', 'cardio', 'rest']).optional(),
  }).refine(item => item.id === item.date && (item.status !== 'rescheduled' || Boolean(item.movedTo))),
  workouts: dated.extend({ split: z.enum(splits), name, note: text }),
  sets: base.extend({ workoutId: id, exercise: name, kg: number, reps: count.positive(), done: z.boolean(), note: text, order: count }),
  exercises: base.extend({ name }),
  cardio: dated.extend({
    minutes: number.positive(), speed: number.optional(), incline: number.optional(),
    distance: number.optional(), exertion: count.min(1).max(10).optional(), note: text,
  }),
  body: dated.extend({
    values: z.object(Object.fromEntries(Object.keys(metrics).map(key => [key, number.optional()]))).strict(), note: text,
  }),
  photos: dated.extend({ bodyId: id, image: z.string().max(5_000_000).regex(/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/) }),
  food: dated.extend(foodFields),
  favorites: base.extend(foodFields),
  supplements: dated.extend({
    type: z.enum(['creatine', 'whey', 'custom']), name, amount: number.positive(), flavor: text,
    protein: number.optional(), calories: number.optional(), note: text,
  }).refine(item => item.type !== 'creatine' || item.id === 'creatine:' + item.date),
  occasions: dated.extend({ name, note: text, createdAt: z.string().datetime().optional() }),
  savings: dated.extend({
    food: name, amount: z.literal(20000), confirmedAt: z.string().datetime().optional(), trigger: text, alternative: text, next: text,
  }),
  notes: dated.extend({ text }),
}
export function encodeBackup(data: Snapshot, includePhotos: boolean) {
  return JSON.stringify({ app: 'recomp', version: 1, exportedAt: new Date().toISOString(), data: {
    ...data, photos: includePhotos ? data.photos : [],
  } })
}

export function decodeBackup(text: string): Snapshot {
  if (text.length > 150_000_000) throw new Error('Backup terlalu besar.')
  const envelope = z.object({ app: z.literal('recomp'), version: z.literal(1), exportedAt: z.string().datetime(), data: z.record(z.unknown()) })
    .parse(JSON.parse(text))
  const entries = tableNames.map(table => {
    const rows = schemas[table].array().parse(envelope.data[table])
    if (new Set(rows.map(row => row.id)).size !== rows.length) throw new Error('ID duplikat di ' + table)
    return [table, rows]
  })
  const data = Object.fromEntries(entries) as Snapshot
  if (data.sets.some(item => !data.workouts.some(workout => workout.id === item.workoutId)) ||
      data.photos.some(item => !data.body.some(body => body.id === item.bodyId))) {
    throw new Error('Backup berisi data tanpa sesi atau pengukuran induk.')
  }
  return data
}

