import { useState } from 'react'
import { timeNow } from '../domain/calendar.ts'
import { foodCatalog } from '../domain/food-catalog.ts'
import { estimateMeal, itemNutrition, mealNutrition } from '../domain/food-estimate.ts'
import type { EstimateItem } from '../domain/food-estimate.ts'
import { meals } from '../domain/model.ts'
import type { Favorite, Food, FoodDetails } from '../domain/model.ts'
import { Check, checked, Dialog, Field, fmt, Form, NoteField, Num, number, optional, Select, string } from '../ui/common.tsx'

type EstimateDraft = Omit<EstimateItem, 'grams'> & { weight: string }

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
  const [estimated, setEstimated] = useState(entry?.estimated ?? false)
  const [draft, setDraft] = useState<EstimateDraft[]>()
  const items = draft?.map(({ weight, ...item }) => ({
    ...item, weight, grams: /^\d+(?:[.,]\d*)?$/.test(weight.trim()) ? Number(weight.replace(',', '.')) : undefined,
  }))
  const total = items && mealNutrition(items)

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
      <Field label="Nama makanan" name="name" placeholder="Nasi putih 100 g + tempe 2 iris"
        value={name} onChange={event => { setName(event.target.value); setDraft(undefined) }} required/>
      <div className="field-grid">
        <Field label="Tanggal" name="date" type="date" defaultValue={existing?.date ?? selected} required/>
        <Field label="Waktu makan" name="time" type="time" defaultValue={entry?.time ?? timeNow()} required/>
        <Select label="Kategori" name="meal" values={meals} defaultValue={entry?.meal ?? 'Lunch'}/>
        <Field label="Porsi" name="portion" placeholder="Mis. 100 g" value={portion}
          onChange={event => { setPortion(event.target.value); setDraft(undefined) }}/>
      </div>
      <button type="button" className="button subtle" disabled={!name.trim()}
        onClick={() => setDraft(estimateMeal(name, portion).map(({ grams, ...item }) => ({ ...item, weight: String(grams ?? '') })))}>
        Estimasi kalori &amp; protein
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
              {values && <small>{fmt(values.calories)} kcal · {fmt(values.protein)} g protein</small>}
            </div>
            <Field label="Berat (g)" aria-label={'Berat ' + item.food.name + ' (g)'} inputMode="decimal"
              value={item.weight} onChange={event => {
                const weight = event.currentTarget.value
                setDraft(current => current?.map((row, position) => position === index
                  ? { ...row, weight, assumed: false } : row))
              }}/>
          </div>
        })}
        {total ? <p className="row" role="status"><span>Total estimasi</span><strong>{fmt(total.calories)} kcal · {fmt(total.protein)} g protein</strong></p>
          : <p className="muted">Periksa nama makanan dan isi berat yang masih kosong, atau masukkan total secara manual.</p>}
        {items.some(item => !item.food) && <details className="muted"><summary>Lihat makanan di katalog</summary>
          <p>{foodCatalog.map(food => food.name).join(', ')}</p>
        </details>}
        <div className="button-row">
          <button type="button" className="button" disabled={!total} onClick={() => {
            if (!total) return
            setCalories(String(Number(total.calories.toFixed(1))))
            setProtein(String(Number(total.protein.toFixed(1))))
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
        <Num label="Karbohidrat (g)" name="carbs" defaultValue={entry?.carbs}/>
        <Num label="Lemak (g)" name="fat" defaultValue={entry?.fat}/>
      </div>
      {estimated && <p className="muted">Kalori dan protein tercatat sebagai estimasi.</p>}
      <NoteField value={entry?.note}/><Check name="favorite">Simpan ke favorit</Check>
    </Form>
  </Dialog>
}
