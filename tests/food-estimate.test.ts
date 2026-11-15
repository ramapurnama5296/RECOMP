import assert from 'node:assert/strict'
import { test } from 'node:test'
import { estimateMeal, itemNutrition, mealNutrition } from '../src/domain/food-estimate.ts'

test('combines gram weights and estimated household portions in a meal', () => {
  const items = estimateMeal('Nasi putih 100 g + ayam bakar 1 potong + tempe 2 iris', '')
  assert.deepEqual(items.map(item => [item.grams, item.assumed]), [[100, false], [100, true], [50, true]])
  const total = mealNutrition(items)
  assert.equal(total?.calories, 520)
  assert.equal(total?.protein.toFixed(2), '46.27')
})

test('accepts Indonesian amounts, decimal commas, and weight before the food name', () => {
  const items = estimateMeal('nasi setengah, ayam dada goreng, sama tempe dua', '')
  assert.deepEqual(items.map(item => item.grams), [75, 100, 50])
  const weights = estimateMeal('0,1 kg nasi merah dan telur rebus 1/2 butir', '')
  assert.deepEqual(weights.map(item => item.grams), [100, 25])
  assert.equal(estimateMeal('sepotong ayam bakar', '')[0].grams, 100)
})

test('corrected weights saved as portions can be used when editing a single item or a meal', () => {
  assert.deepEqual(itemNutrition(estimateMeal('Nasi putih 100 g', '125 g')[0]), { calories: 225, protein: 3.75 })
  const items = estimateMeal('nasi 100 g + tempe 2 iris', 'Nasi putih 100 g + Tempe goreng 40 g')
  assert.deepEqual(items.map(item => item.grams), [100, 40])
  assert.deepEqual(mealNutrition(items), { calories: 320, protein: 12.8 })
})

test('withholds the total for unknown foods or missing and invalid weights', () => {
  assert.equal(mealNutrition(estimateMeal('nasi 100 g + sambal terasi', '')), undefined)
  const [missing] = estimateMeal('nasi', '1 mangkuk besar')
  assert.equal(missing.food?.name, 'Nasi putih')
  assert.equal(missing.grams, undefined)
  assert.equal(mealNutrition(estimateMeal('tempe 0 iris', '')), undefined)
  assert.equal(mealNutrition(estimateMeal('nasi 1/0 porsi', '')), undefined)
})
