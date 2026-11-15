import type { Settings, Supplement } from './model.ts'

export type DailySupplementType = 'creatine' | 'whey'
export const defaultWheyName = 'Whey protein konsentrat'
export const defaultWheyProtein = 24

export function dailySupplementId(type: DailySupplementType, date: string) {
  return (type === 'whey' ? 'whey:daily:' : 'creatine:') + date
}

export function dailySupplement(type: DailySupplementType, date: string, settings: Settings): Omit<Supplement, 'updatedAt'> {
  const base = { id: dailySupplementId(type, date), type, date, note: '' }
  if (type === 'creatine') return { ...base, name: 'Creatine', amount: settings.creatine, flavor: '' }

  return {
    ...base, name: settings.whey.trim() || defaultWheyName, amount: 1, flavor: settings.flavor,
    protein: settings.wheyProtein ?? defaultWheyProtein, calories: settings.wheyCalories,
  }
}
