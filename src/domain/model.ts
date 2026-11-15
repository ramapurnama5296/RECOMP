export type Kind = 'weights' | 'cardio' | 'rest'
export type Status = 'planned' | 'completed' | 'skipped' | 'rescheduled'
export const kinds: Record<Kind, string> = { weights: 'Weight training', cardio: 'Treadmill', rest: 'Full rest' }
export const statuses: Record<Status, string> = { planned: 'Planned', completed: 'Completed', skipped: 'Skipped', rescheduled: 'Rescheduled' }
export const splits = ['Upper Body', 'Lower Body', 'Full Body', 'Push', 'Pull', 'Legs', 'Custom'] as const
export const meals = ['Breakfast', 'Lunch', 'Dinner', 'Snack'] as const
export const metrics = {
  weight: 'Berat badan (kg)', height: 'Tinggi badan (cm)', fat: 'Body fat (%)', fatMass: 'Fat mass (kg)',
  muscle: 'Skeletal muscle mass (kg)', waist: 'Lingkar pinggang (cm)', visceral: 'Visceral fat',
  bmi: 'BMI', bmr: 'BMR (kcal)',
}
export type Metric = keyof typeof metrics
export const builtinExercises = [
  'Bench press', 'Chest press', 'Lat pulldown', 'Seated row', 'Dumbbell curl',
  'Shoulder press', 'Goblet squat', 'Leg press', 'Leg extension', 'Romanian deadlift',
]
export const wheyTemplates = ['Muscle First Pro Whey 100 Chocolate', 'Muscle First Pro Whey 100 Kopi Gula Aren']
export interface RecordBase { id: string; updatedAt: string }
export interface Dated extends RecordBase { date: string }
export interface Routine { kind: Kind; minutes: number; pt: boolean; leg: boolean }
export interface Settings extends RecordBase {
  name: string; start: string; age?: number; height?: number; sex: string;
  calories?: number; protein: number; targetWeight?: number; weights: number; cardio: number;
  routine: Routine[]; creatine: number; whey: string; flavor: string; wheyProtein?: number;
  wheyCalories?: number; compact: boolean; savingsGoal: string
}
export interface Schedule extends Dated, Routine { status: Status; note: string; movedTo?: string; completedAs?: Kind }
export interface Workout extends Dated { split: typeof splits[number]; name: string; note: string }
export interface ExerciseSet extends RecordBase { workoutId: string; exercise: string; kg: number; reps: number; done: boolean; note: string; order: number }
export interface Exercise extends RecordBase { name: string }
export interface Cardio extends Dated { minutes: number; speed?: number; incline?: number; distance?: number; exertion?: number; note: string }
export interface Body extends Dated { values: Partial<Record<Metric, number>>; note: string }
export interface Photo extends Dated { bodyId: string; image: string }
export interface FoodDetails { name: string; time: string; meal: typeof meals[number]; calories: number; protein: number; carbs?: number; fat?: number; portion: string; note: string }
export type Food = Dated & FoodDetails
export type Favorite = RecordBase & FoodDetails
export interface Supplement extends Dated {
  type: 'creatine' | 'whey' | 'custom'; name: string; amount: number; flavor: string; protein?: number; calories?: number; note: string
}
export interface Occasion extends Dated { name: string; note: string; createdAt?: string }
export interface Saving extends Dated {
  food: string; amount: number; confirmedAt?: string; trigger: string; alternative: string; next: string
}
export interface Note extends Dated { text: string }
export interface Tables {
  settings: Settings; schedules: Schedule; workouts: Workout; sets: ExerciseSet; exercises: Exercise;
  cardio: Cardio; body: Body; photos: Photo; food: Food; favorites: Favorite;
  supplements: Supplement; occasions: Occasion; savings: Saving; notes: Note
}
export const tableNames = ['settings', 'schedules', 'workouts', 'sets', 'exercises', 'cardio', 'body', 'photos', 'food', 'favorites', 'supplements', 'occasions', 'savings', 'notes'] as const
export type Table = keyof Tables
export type Snapshot = { [K in Table]: Tables[K][] }
export type Change = { [K in Table]: { table: K; put: Tables[K] } | { table: K; remove: string } }[Table]
export const stamp = () => new Date().toISOString()
export const record = (id = crypto.randomUUID() as string): RecordBase => ({ id, updatedAt: stamp() })
export const routineFor = (kind: Kind, pt = false): Routine => ({ kind, pt, leg: false, minutes: kind === 'cardio' ? 30 : 0 })
export const defaultRoutine = (second: 'thursday' | 'friday' = 'thursday'): Routine[] => [
  routineFor('cardio'), routineFor('weights', true), routineFor('cardio'),
  second === 'thursday' ? routineFor('weights', true) : routineFor('rest'),
  second === 'friday' ? routineFor('weights', true) : routineFor('rest'),
  routineFor('cardio'), routineFor('weights', true),
]
export const initialSettings = (start: string): Settings => ({
  ...record('profile'), start, name: '', sex: '', protein: 120, weights: 3, cardio: 3,
  routine: defaultRoutine(), creatine: 5, whey: '', flavor: '', compact: false, savingsGoal: '',
})

