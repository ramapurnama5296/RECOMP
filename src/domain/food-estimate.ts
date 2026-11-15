import { foodCatalog } from './food-catalog.ts'
import type { CatalogFood } from './food-catalog.ts'

export interface EstimateItem {
  input: string
  food?: CatalogFood
  grams?: number
  assumed: boolean
}

const wordAmounts: Readonly<Partial<Record<string, number>>> = {
  seperempat: 0.25, setengah: 0.5, satu: 1, dua: 2, tiga: 3, empat: 4, lima: 5,
}
const amount = '(?:\\d+\\s*/\\s*\\d+|\\d+(?:[.,]\\d+)?|' + Object.keys(wordAmounts).join('|') + ')'
const unit = '(?:kilogram|kg|gram|gr|g|porsi|centong|potong|iris|butir|buah)'
const leadingQuantity = new RegExp(`^(${amount})\\s*(${unit})?\\s+(.+)$`)
const trailingQuantity = new RegExp(`^(.+?)\\s+(${amount})\\s*(${unit})?$`)
const quantityOnly = new RegExp(`^(${amount})\\s*(${unit})?$`)

const foodsByName = new Map(foodCatalog.flatMap(food => [food.name, ...(food.aliases ?? [])]
  .map(name => [name.toLowerCase(), food] as const)))

function normalize(value: string) {
  return value.toLowerCase().trim().replace(/\s+/g, ' ')
    .replace(/\bse(porsi|centong|potong|iris|butir|buah)\b/g, '1 $1')
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
  const trailing = trailingQuantity.exec(normalized)
  const leading = leadingQuantity.exec(normalized)
  const food = foodsByName.get(trailing?.[1] ?? leading?.[3] ?? normalized)
  if (!food) return { input, assumed: false }

  const separate = quantityOnly.exec(normalize(portion))
  const quantity = separate?.[1] ?? trailing?.[2] ?? leading?.[1]
  const servingUnit = (separate ? separate[2] : trailing ? trailing[3] : leading?.[2]) ?? 'porsi'
  if (!quantity && portion.trim()) return { input, food, assumed: false }

  const count = quantity ? amountOf(quantity) : 1
  const gramsPerUnit = servingUnit === 'kg' || servingUnit === 'kilogram' ? 1000
    : ['g', 'gr', 'gram'].includes(servingUnit) ? 1 : food.serving[servingUnit]
  const grams = gramsPerUnit === undefined ? undefined : count * gramsPerUnit
  return {
    input, food, grams: grams !== undefined && Number.isFinite(grams) && grams > 0 ? grams : undefined,
    assumed: !['kg', 'kilogram', 'g', 'gr', 'gram'].includes(servingUnit),
  }
}

function mealParts(text: string) {
  return text.split(/[+;\n]|\s+(?:dan|sama)\s+|,\s+|,(?=\D)/i)
    .map(part => part.trim().replace(/^(?:dan|sama)\s+/i, '')).filter(Boolean)
}

export function estimateMeal(name: string, portion: string) {
  const parts = mealParts(name)
  const items = parts.map(part => mealItem(part, parts.length === 1 ? portion : ''))
  if (parts.length < 2 || !portion.trim()) return items

  const savedWeights = mealParts(portion).map(part => mealItem(part, ''))
  const sameFoods = savedWeights.length === items.length && savedWeights.every((item, index) =>
    item.food && item.food === items[index].food && item.grams !== undefined && !item.assumed)
  return sameFoods ? savedWeights : items
}

export function itemNutrition({ food, grams }: EstimateItem) {
  if (!food || grams === undefined || !Number.isFinite(grams) || grams <= 0) return undefined
  const scale = grams / 100
  const calories = food.calories * scale
  const protein = food.protein * scale
  return Number.isFinite(calories) && Number.isFinite(protein) ? { calories, protein } : undefined
}

export function mealNutrition(items: EstimateItem[]) {
  if (!items.length) return undefined
  const total = { calories: 0, protein: 0 }
  for (const item of items) {
    const values = itemNutrition(item)
    if (!values) return undefined
    total.calories += values.calories
    total.protein += values.protein
  }
  return Number.isFinite(total.calories) && Number.isFinite(total.protein) ? total : undefined
}
