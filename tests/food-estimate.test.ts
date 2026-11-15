import assert from 'node:assert/strict'
import { test } from 'node:test'
import { foodCatalog, searchFoods } from '../src/domain/food-catalog.ts'
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
  assert.equal(mealNutrition(estimateMeal('nasi 100 g + hidangan uji belum terdaftar', '')), undefined)
  const [missing] = estimateMeal('nasi', '1 mangkuk besar')
  assert.equal(missing.food?.name, 'Nasi putih')
  assert.equal(missing.grams, undefined)
  assert.equal(mealNutrition(estimateMeal('tempe 0 iris', '')), undefined)
  assert.equal(mealNutrition(estimateMeal('nasi 1/0 porsi', '')), undefined)
})

test('finds familiar Indonesian aliases and estimates common serving units', () => {
  const items = estimateMeal('enam tusuk satai ayam + semangkok soto ayam + martabak telor 2 potong', '')
  assert.deepEqual(items.map(item => [item.food?.name, item.grams]), [
    ['Sate ayam', 90], ['Soto ayam', 240], ['Martabak telur', 100],
  ])
  assert.equal(mealNutrition(items)?.calories, 714.5)
  assert.equal(searchFoods('gule')[0].name, 'Gulai kambing')
  assert.equal(searchFoods('mi ayam')[0].name, 'Mie ayam')
  assert.equal(searchFoods('terang bulan')[0].name, 'Martabak manis')
  assert.equal(searchFoods('rendang')[0].name, 'Rendang sapi')
  assert.equal(searchFoods('tongseng')[0].name, 'Tongseng')
})

test('every displayed catalog food can be estimated by name and quantity', () => {
  for (const food of foodCatalog) {
    const [item] = estimateMeal(food.name, '125 g')
    assert.equal(item?.food, food, food.name)
    assert.equal(item.grams, 125, food.name)
  }
  const items = estimateMeal('20 g bayam tumis dan oncom + nasi putih 100 g',
    'Bayam tumis dan oncom 70 g + Nasi putih 125 g')
  assert.deepEqual(items.map(item => [item.food?.name, item.grams]), [
    ['Bayam tumis dan oncom', 70], ['Nasi putih', 125],
  ])
})
