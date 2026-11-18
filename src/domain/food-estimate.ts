import { findFood } from './food-catalog.ts'
import type { CatalogFood } from './food-catalog.ts'

export interface EstimateItem {
  input: string
  food?: CatalogFood
  grams?: number
  assumed: boolean
}

type EstimatedNutrition = Pick<CatalogFood, 'calories' | 'protein' | 'carbs' | 'fat'>

const wordAmounts: Readonly<Partial<Record<string, number>>> = {
  seperempat: 0.25, setengah: 0.5, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
  enam: 6, tujuh: 7, delapan: 8, sembilan: 9, sepuluh: 10,
}
const amount = '(?:\\d+\\s*/\\s*\\d+|\\d+(?:[.,]\\d+)?|' + Object.keys(wordAmounts).join('|') + ')'
const householdUnits = 'porsi|centong|potong|iris|butir|buah|tusuk|mangkuk|piring|gelas|ekor|sdm|pcs|pack|bungkus'
const unit = `(?:kilogram|kg|gram|gr|g|${householdUnits})`
const leadingQuantity = new RegExp(`^(${amount})\\s*(${unit})?\\s+(.+)$`)
const trailingQuantity = new RegExp(`^(.+?)\\s+(${amount})\\s*(${unit})?$`)
const quantityOnly = new RegExp(`^(${amount})\\s*(${unit})?$`)
const singleUnit = new RegExp(`\\bse(${householdUnits})\\b`, 'g')

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
    .replace(/\b(se)?mangkok\b/g, '$1mangkuk').replace(singleUnit, '1 $1')
}

function amountOf(value: string) {
  if (value.includes('/')) {
    const [numerator, denominator] = value.split('/').map(Number)
    return numerator / denominator
  }
  return wordAmounts[value] ?? Number(value.replace(',', '.'))
}

function mealItem(input: string, portion: string): EstimateItem {
  const normalized = normalize(input)
  const exact = findFood(input)
  const trailing = exact ? null : trailingQuantity.exec(normalized)
  const trailingFood = trailing ? findFood(trailing[1]) : undefined
  const leading = exact || trailingFood ? null : leadingQuantity.exec(normalized)
  const food = exact ?? trailingFood ?? (leading ? findFood(leading[3]) : undefined)
  if (!food) return { input, assumed: false }

  const separate = quantityOnly.exec(normalize(portion))
  if (portion.trim() && !separate) return { input, food, assumed: false }
  const quantity = separate?.[1] ?? (trailingFood ? trailing?.[2] : leading?.[1])
  const servingUnit = (separate ? separate[2] : trailingFood ? trailing?.[3] : leading?.[2]) ?? 'porsi'

  const count = quantity ? amountOf(quantity) : 1
  const gramsPerUnit = servingUnit === 'kg' || servingUnit === 'kilogram' ? 1000
    : ['g', 'gr', 'gram'].includes(servingUnit) ? 1 : food.serving[servingUnit]
  const grams = gramsPerUnit === undefined ? undefined : count * gramsPerUnit
  return {
    input, food, grams: grams !== undefined && Number.isFinite(grams) && grams > 0 ? grams : undefined,
    assumed: !['kg', 'kilogram', 'g', 'gr', 'gram'].includes(servingUnit),
  }
}

function mealItems(text: string, portion: string): EstimateItem[] {
  const input = text.trim()
  if (!input) return []
  const whole = mealItem(input, portion)
  if (whole.food) return [whole]

  return input.split(/[+;\n]/).flatMap(group => {
    const combined = mealItem(group.trim(), '')
    if (combined.food) return [combined]
    return group.split(/\s+(?:dan|sama)\s+|,\s+|,(?=\D)/i)
      .map(part => part.trim().replace(/^(?:dan|sama)\s+/i, '')).filter(Boolean)
      .map(part => mealItem(part, ''))
  })
}

export function estimateMeal(name: string, portion: string) {
  const items = mealItems(name, portion)
  if (items.length < 2 || !portion.trim()) return items

  const savedWeights = mealItems(portion, '')
  const sameFoods = savedWeights.length === items.length && savedWeights.every((item, index) =>
    item.food && item.food === items[index].food && item.grams !== undefined && !item.assumed)
  return sameFoods ? savedWeights : items
}

export function itemNutrition({ food, grams }: EstimateItem): EstimatedNutrition | undefined {
  if (!food || grams === undefined || !Number.isFinite(grams) || grams <= 0) return undefined
  const scale = grams / 100
  const calories = food.calories * scale
  const protein = food.protein * scale
  if (!Number.isFinite(calories) || !Number.isFinite(protein)) return undefined
  const values: EstimatedNutrition = { calories, protein }
  if (food.carbs !== undefined && Number.isFinite(food.carbs * scale)) values.carbs = food.carbs * scale
  if (food.fat !== undefined && Number.isFinite(food.fat * scale)) values.fat = food.fat * scale
  return values
}

export function mealNutrition(items: EstimateItem[]): EstimatedNutrition | undefined {
  if (!items.length) return undefined
  const total = { calories: 0, protein: 0 }
  let carbs: number | undefined = 0
  let fat: number | undefined = 0
  for (const item of items) {
    const values = itemNutrition(item)
    if (!values) return undefined
    total.calories += values.calories
    total.protein += values.protein
    carbs = carbs === undefined || values.carbs === undefined ? undefined : carbs + values.carbs
    fat = fat === undefined || values.fat === undefined ? undefined : fat + values.fat
  }
  if (!Number.isFinite(total.calories) || !Number.isFinite(total.protein)) return undefined
  return {
    ...total,
    ...(Number.isFinite(carbs) ? { carbs } : {}),
    ...(Number.isFinite(fat) ? { fat } : {}),
  }
}
