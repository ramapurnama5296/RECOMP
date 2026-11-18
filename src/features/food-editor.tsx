import { useRef, useState } from 'react'
import { timeNow } from '../domain/calendar.ts'
import { searchFoods } from '../domain/food-catalog.ts'
import { estimateMeal, itemNutrition, mealNutrition } from '../domain/food-estimate.ts'
import type { EstimateItem } from '../domain/food-estimate.ts'
import { meals } from '../domain/model.ts'
import type { Favorite, Food, FoodDetails } from '../domain/model.ts'
import { Check, checked, Dialog, Field, fmt, Form, NoteField, Num, number, optional, Select, string } from '../ui/common.tsx'

type EstimateDraft = Omit<EstimateItem, 'grams'> & { weight: string }
type MacroInput = { value: string; fromEstimate: boolean }
const catalogPageSize = 12

function nutritionText({ calories, protein, carbs, fat }: NonNullable<ReturnType<typeof mealNutrition>>) {
  return [
    `${fmt(calories)} kcal`,
    `${fmt(protein)} g protein`,
    carbs === undefined ? undefined : `${fmt(carbs)} g karbohidrat`,
    fat === undefined ? undefined : `${fmt(fat)} g lemak`,
  ].filter(part => part !== undefined).join(' · ')
}

function estimatedInput(value: number) {
  return String(Number(value.toFixed(1)))
}

function applyMacroEstimate(current: MacroInput, value: number | undefined): MacroInput {
  if (value !== undefined) return { value: estimatedInput(value), fromEstimate: true }
  return current.fromEstimate ? { value: '', fromEstimate: false } : current
}

export function FoodEditor({ entry, selected, close, save }: {
  entry: Food | Favorite | null
  selected: string
  close: () => void
  save: (details: FoodDetails, day: string, favorite: boolean) => Promise<void>
}) {
  const existing = entry && 'date' in entry ? entry : undefined
  const [name, setName] = useState(entry?.name ?? '')
  const [portion, setPortion] = useState(entry?.portion ?? '')
  const [calories, setCalories] = useState(String(entry?.calories ?? ''))
  const [protein, setProtein] = useState(String(entry?.protein ?? ''))
  const [carbs, setCarbs] = useState<MacroInput>({ value: String(entry?.carbs ?? ''), fromEstimate: false })
  const [fat, setFat] = useState<MacroInput>({ value: String(entry?.fat ?? ''), fromEstimate: false })
  const [estimated, setEstimated] = useState(entry?.estimated ?? false)
  const [draft, setDraft] = useState<EstimateDraft[]>()
  const [query, setQuery] = useState('')
  const [catalogLimit, setCatalogLimit] = useState(catalogPageSize)
  const catalogToggle = useRef<HTMLElement>(null)
  const catalog = useRef<HTMLDetailsElement>(null)
  const items = draft?.map(({ weight, ...item }) => ({
    ...item, weight, grams: /^\d+(?:[.,]\d*)?$/.test(weight.trim()) ? Number(weight.replace(',', '.')) : undefined,
  }))
  const total = items && mealNutrition(items)
  const matches = searchFoods(query)

  function showEstimate(foodName: string, weight: string) {
    setDraft(estimateMeal(foodName, weight).map(({ grams, ...item }) => ({ ...item, weight: String(grams ?? '') })))
  }

  return <Dialog title={existing ? 'Edit makanan' : 'Catat makanan'} close={close}>
    <Form save={async form => {
      const details: FoodDetails = {
        name: string(form, 'name'), time: string(form, 'time'), meal: string(form, 'meal') as FoodDetails['meal'],
        calories: number(form, 'calories'), protein: number(form, 'protein'), carbs: optional(form, 'carbs'), fat: optional(form, 'fat'),
        portion: string(form, 'portion'), note: string(form, 'note'), estimated: estimated || undefined,
      }
      if (!details.name) throw new Error('Isi nama makanan.')
      await save(details, string(form, 'date'), checked(form, 'favorite'))
    }}>
      <Field label="Nama makanan" name="name" placeholder="Salmon sashimi 4 iris + salad ayam 1 porsi"
        value={name} onChange={event => { setName(event.target.value); setDraft(undefined) }} required/>
      <details className="food-catalog" ref={catalog}>
        <summary ref={catalogToggle}>Cari di katalog makanan</summary>
        <div className="form">
          <Field label="Cari nama makanan" type="search" placeholder="Mis. salmon sashimi, Papaya, jajanan Jakarta"
            value={query} onChange={event => {
              setQuery(event.target.value)
              setCatalogLimit(catalogPageSize)
            }}/>
          <p className="muted" role="status">{matches.length ? `${matches.length} makanan · estimasi per 100 g` : 'Makanan belum ditemukan di katalog.'}</p>
          {matches.length > 0 && <ul className="food-catalog-results">
            {matches.slice(0, catalogLimit).map(food => <li key={food.name}>
              <button type="button" className="button" onClick={() => {
                setName(food.name)
                setPortion('')
                showEstimate(food.name, '')
                catalogToggle.current?.focus()
                if (catalog.current) catalog.current.open = false
              }}>
                <span>{food.name}</span><small>{nutritionText(food)}</small>
              </button>
            </li>)}
          </ul>}
          {matches.length > catalogLimit && <button type="button" className="button"
            onClick={() => setCatalogLimit(limit => limit + catalogPageSize)}>Tampilkan lebih banyak</button>}
        </div>
      </details>
      <div className="field-grid">
        <Field label="Tanggal" name="date" type="date" defaultValue={existing?.date ?? selected} required/>
        <Field label="Waktu makan" name="time" type="time" defaultValue={entry?.time ?? timeNow()} required/>
        <Select label="Kategori" name="meal" values={meals} defaultValue={entry?.meal ?? 'Lunch'}/>
        <Field label="Porsi" name="portion" placeholder="Mis. 100 g" value={portion}
          onChange={event => { setPortion(event.target.value); setDraft(undefined) }}/>
      </div>
      <button type="button" className="button subtle" disabled={!name.trim()}
        onClick={() => showEstimate(name, portion)}>
        Estimasi gizi
      </button>
      {items && <fieldset className="form">
        <legend>Estimasi gizi</legend>
        <p className="muted">Gunakan berat bagian yang dimakan. Untuk beberapa makanan, tulis porsi tiap makanan dengan pemisah +.</p>
        {items.map((item, index) => {
          const values = itemNutrition(item)
          if (!item.food) return <p className="warning" key={index}>“{item.input}” belum ada di katalog.</p>
          return <div className="field-grid divided" key={index}>
            <div><strong>{item.food.name}</strong>
              <small>{item.food.source}{item.assumed && item.grams !== undefined ? ' · Asumsi porsi' : ''}</small>
              {item.food.detail && <small>{item.food.detail}</small>}
              {values && <small>{nutritionText(values)}</small>}
            </div>
            <Field label="Berat (g)" aria-label={'Berat ' + item.food.name + ' (g)'} inputMode="decimal"
              value={item.weight} onChange={event => {
                const weight = event.currentTarget.value
                setDraft(current => current?.map((row, position) => position === index
                  ? { ...row, weight, assumed: false } : row))
              }}/>
          </div>
        })}
        {total ? <p className="row" role="status"><span>Total estimasi</span><strong>{nutritionText(total)}</strong></p>
          : <p className="muted">Periksa nama makanan dan isi berat yang masih kosong, atau masukkan total secara manual.</p>}
        {total && (total.carbs === undefined || total.fat === undefined) &&
          <p className="muted">Jika data karbohidrat atau lemak belum lengkap, isi totalnya secara manual jika diketahui.</p>}
        <div className="button-row">
          <button type="button" className="button" disabled={!total} onClick={() => {
            if (!total) return
            setCalories(estimatedInput(total.calories))
            setProtein(estimatedInput(total.protein))
            setCarbs(current => applyMacroEstimate(current, total.carbs))
            setFat(current => applyMacroEstimate(current, total.fat))
            setPortion(items.map(item => `${items.length > 1 ? item.food?.name + ' ' : ''}${item.grams} g`).join(' + '))
            setEstimated(true)
            setDraft(undefined)
          }}>Pakai estimasi</button>
          <button type="button" className="button" onClick={() => setDraft(undefined)}>Tutup estimasi</button>
        </div>
      </fieldset>}
      <div className="field-grid">
        <Num label="Kalori (kcal)" name="calories" value={calories} onChange={event => setCalories(event.target.value)} required/>
        <Num label="Protein (g)" name="protein" value={protein} onChange={event => setProtein(event.target.value)} required/>
        <Num label="Karbohidrat (g)" name="carbs" value={carbs.value}
          onChange={event => setCarbs({ value: event.target.value, fromEstimate: false })}/>
        <Num label="Lemak (g)" name="fat" value={fat.value}
          onChange={event => setFat({ value: event.target.value, fromEstimate: false })}/>
      </div>
      {estimated && <p className="muted">Entri ini memakai estimasi gizi.</p>}
      <NoteField value={entry?.note}/><Check name="favorite">Simpan ke favorit</Check>
    </Form>
  </Dialog>
}
