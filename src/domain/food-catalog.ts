import { indonesianFoodRows } from './indonesian-food-data.ts'
import { jakartaSnacks, japaneseFoods } from './prepared-foods.ts'

export interface CatalogFood {
  name: string
  aliases?: string[]
  keywords?: readonly string[]
  calories: number
  protein: number
  carbs?: number
  fat?: number
  serving: { porsi: number } & Partial<Record<string, number>>
  source: string
  detail?: string
}

const soupServings = { porsi: 250, mangkuk: 250 }
const lightDishServings = { porsi: 150, piring: 150 }

const regionalDishes: Partial<Record<number, Partial<Omit<CatalogFood, 'calories' | 'protein' | 'source'>>>> = {
  64: { aliases: ['bakso kuah'], serving: soupServings, detail: 'Acuan bakso kuah. Mi dan topping tambahan dihitung sesuai porsi.' },
  66: { aliases: ['bala-bala', 'ote-ote', 'bakwan sayur'], keywords: ['jajanan Jakarta', 'gorengan'],
    carbs: 39, fat: 10.2, serving: { porsi: 45, buah: 45, potong: 45 } },
  216: { keywords: ['jajanan Jakarta', 'gorengan'], carbs: 35.8, fat: 6.6, serving: { porsi: 50, buah: 50, potong: 50 } },
  219: { aliases: ['coto makassar', 'coto mangkasara'], serving: soupServings },
  356: { serving: { porsi: 200, piring: 200 } },
  375: { keywords: ['jajanan Jakarta Betawi'], carbs: 55.5, fat: 5.4, serving: { porsi: 45, buah: 45, potong: 45 } },
  395: { serving: soupServings },
  397: { aliases: ['gulai', 'gule', 'gule kambing'], serving: soupServings, detail: 'Acuan gulai kambing dengan kuah, tanpa nasi.' },
  468: { name: 'Lele goreng', serving: { porsi: 100, ekor: 100, potong: 100 } },
  683: { serving: lightDishServings },
  763: { serving: { porsi: 250, piring: 250 } },
  809: { name: 'Kue talam', keywords: ['jajanan Jakarta Betawi'], carbs: 32, fat: 5,
    serving: { porsi: 45, potong: 45, buah: 45 } },
  876: { aliases: ['martabak', 'terang bulan', 'kue bandung', 'hok lo pan'], keywords: ['jajanan Jakarta'],
    carbs: 49.3, fat: 5.5, serving: { porsi: 100, potong: 60, iris: 60 },
    detail: 'Acuan martabak manis. Isi, margarin, dan ukuran potong bisa berbeda.' },
  879: { name: 'Martabak telur', aliases: ['martabak asin', 'martabak telor'], keywords: ['jajanan Jakarta'],
    carbs: 29.5, fat: 5.1, serving: { porsi: 100, potong: 50 },
    detail: 'Acuan martabak telur dengan isian daging dan telur.' },
  893: { aliases: ['bakmi ayam'], serving: { porsi: 250, mangkuk: 250 } },
  894: { serving: soupServings },
  930: { name: 'Nasi uduk', serving: { porsi: 150, centong: 100, piring: 150 }, detail: 'Acuan nasi uduk tanpa lauk.' },
  947: { aliases: ['onde onde'], keywords: ['jajanan Jakarta'], carbs: 44.3, fat: 8.9, serving: { porsi: 40, buah: 40, potong: 40 } },
  965: { keywords: ['jajanan Jakarta', 'gorengan'], carbs: 42.4, fat: 13.3, serving: { porsi: 50, buah: 50, potong: 50 } },
  973: { aliases: ['empek-empek kapal selam', 'mpek-mpek kapal selam'], serving: { porsi: 100, buah: 100 } },
  976: { aliases: ['pempek', 'empek-empek', 'mpek-mpek'], serving: { porsi: 100, potong: 50, buah: 50 } },
  1027: { keywords: ['jajanan Jakarta Betawi'], carbs: 43.8, fat: 2.4, serving: { porsi: 100, buah: 40, potong: 40 } },
  1037: { serving: soupServings, detail: 'Acuan rawon dengan kuah, tanpa nasi.' },
  1045: { aliases: ['rendang', 'rendang daging', 'rendang daging sapi', 'randang'], serving: { porsi: 100, potong: 50 },
    detail: 'Acuan rendang sapi tanpa nasi. Santan dan potongan daging memengaruhi hasil.' },
  1048: { aliases: ['risol'], keywords: ['jajanan Jakarta', 'gorengan'], carbs: 70.5, fat: 3.5,
    serving: { porsi: 50, buah: 50, potong: 50 } },
  1113: { aliases: ['sayur asam'], serving: soupServings },
  1138: { name: 'Singkong goreng', keywords: ['jajanan Jakarta', 'gorengan'], carbs: 28, fat: 18,
    serving: { porsi: 75, potong: 40 } },
  1141: { aliases: ['siomay bandung'], serving: lightDishServings },
  1144: { aliases: ['sup buntut'], serving: soupServings },
  1152: { serving: soupServings },
  1153: { serving: soupServings },
  1154: { serving: soupServings },
  1157: { serving: soupServings },
  1158: { serving: soupServings },
  1159: { serving: soupServings },
}

const commonDishes: readonly CatalogFood[] = [
  { name: 'Sate ayam', aliases: ['sate', 'sate ayam madura', 'sate madura'], calories: 225, protein: 19.5,
    serving: { porsi: 90, tusuk: 15 }, source: 'Estimasi FatSecret', detail: 'Asumsi 15 g per tusuk. Lontong dan saus tambahan bisa dicatat terpisah.' },
  { name: 'Sate kambing', calories: 216, protein: 18.9, serving: { porsi: 90, tusuk: 15 }, source: 'Estimasi FatSecret' },
  { name: 'Sate padang', calories: 161, protein: 18, serving: { porsi: 100, tusuk: 17 }, source: 'Estimasi FatSecret' },
  { name: 'Soto ayam', aliases: ['soto'], calories: 130, protein: 10, serving: { porsi: 240, mangkuk: 240 },
    source: 'Estimasi FatSecret', detail: 'Acuan semangkuk soto dengan isian, tanpa nasi tambahan.' },
  { name: 'Soto Lamongan', aliases: ['soto ayam lamongan'], calories: 63, protein: 6, serving: soupServings, source: 'Estimasi FatSecret' },
  { name: 'Tongseng', aliases: ['tongseng sapi', 'tongseng kambing', 'tongseng solo'], calories: 169, protein: 10.8,
    serving: { porsi: 187, mangkuk: 250 }, source: 'Estimasi FatSecret', detail: 'Acuan tongseng daging dengan kuah, tanpa nasi.' },
  { name: 'Tongseng ayam', calories: 133, protein: 13, serving: soupServings, source: 'Estimasi FatSecret' },
  { name: 'Nasi goreng', aliases: ['nasgor'], calories: 190, protein: 4.3, serving: { porsi: 250, piring: 250 },
    source: 'Estimasi resep', detail: 'Acuan 65 g nasi matang, 15 g telur, 15 g sayuran, dan 5 g minyak per 100 g.' },
  { name: 'Bubur ayam', calories: 110, protein: 7, serving: soupServings, source: 'Estimasi resep',
    detail: 'Acuan bubur nasi dengan suwiran ayam dan sedikit minyak. Kerupuk dan topping tambahan bisa dicatat terpisah.' },
  { name: 'Ayam geprek', calories: 286, protein: 29, serving: { porsi: 100, potong: 100 }, source: 'Estimasi resep',
    detail: 'Acuan dada ayam goreng tepung dengan sambal, tanpa nasi.' },
  { name: 'Seblak', calories: 105, protein: 3.3, serving: soupServings, source: 'Estimasi FatSecret',
    detail: 'Acuan sekitar 262 kcal per mangkuk 250 g. Topping dan kuah memengaruhi hasil.' },
  { name: 'Lontong', calories: 144, protein: 2.8, serving: { porsi: 100, potong: 40 }, source: 'Estimasi FatSecret' },
  { name: 'Ketupat', calories: 160, protein: 3.3, serving: { porsi: 100, buah: 100, potong: 40 }, source: 'Estimasi FatSecret' },
  { name: 'Lontong sayur', aliases: ['ketupat sayur'], calories: 106, protein: 2.8, serving: { porsi: 300, mangkuk: 300 },
    source: 'Estimasi resep', detail: 'Acuan lontong dan sayur bersantan dalam berat yang sama, tanpa telur atau lauk tambahan.' },
  { name: 'Opor ayam', aliases: ['opor'], calories: 163, protein: 16.5, serving: { porsi: 150, mangkuk: 150 },
    source: 'Estimasi FatSecret', detail: 'Acuan ayam dan kuah opor, tanpa nasi atau ketupat.' },
  { name: 'Sayur lodeh', aliases: ['lodeh'], calories: 68, protein: 2.8, serving: soupServings, source: 'Estimasi FatSecret' },
  { name: 'Pecel sayur', aliases: ['pecel', 'pecel madiun', 'sayur pecel'], calories: 130, protein: 5,
    serving: lightDishServings, source: 'Estimasi resep', detail: 'Acuan 75 g sayuran rebus dan 25 g bumbu kacang, tanpa nasi atau rempeyek.' },
  { name: 'Nasi pecel', aliases: ['sego pecel'], calories: 230, protein: 6.6, serving: { porsi: 250, piring: 250 }, source: 'Estimasi FatSecret' },
  { name: 'Batagor', calories: 290, protein: 10.3, serving: { porsi: 120, potong: 30, buah: 30 }, source: 'Estimasi FatSecret' },
  { name: 'Sambal terasi', aliases: ['sambel terasi'], calories: 154, protein: 2, serving: { porsi: 15, sdm: 15 },
    source: 'Estimasi resep', detail: 'Acuan sambal tumis dengan cabai, tomat, terasi, dan sekitar 12 g minyak per 100 g.' },
  { name: 'Es cendol', aliases: ['cendol', 'es dawet', 'dawet'], calories: 155, protein: 1.9,
    serving: { porsi: 250, gelas: 250, mangkuk: 250 }, source: 'Estimasi FatSecret' },
  { name: 'Es kopi susu gula aren', aliases: ['kopi susu gula aren', 'kopi susu', 'es kopi susu'], calories: 73, protein: 2.4,
    serving: { porsi: 250, gelas: 250 }, source: 'Estimasi FatSecret', detail: 'Acuan sekitar 182 kcal per gelas 250 g. Takaran susu dan gula bervariasi.' },
  { name: 'Es teh manis', aliases: ['teh manis'], calories: 32, protein: 0, serving: { porsi: 250, gelas: 250 },
    source: 'Estimasi resep', detail: 'Acuan 20 g gula dalam 250 g teh seduh.' },
  { name: 'Teh tawar', aliases: ['es teh tawar', 'teh tanpa gula'], calories: 0, protein: 0, serving: { porsi: 250, gelas: 250 },
    source: 'Estimasi resep', detail: 'Acuan teh seduh tanpa gula atau susu.' },
]

// Nutrition values are per 100 g of edible food. Serving weights are editable estimates.
// TKPI 2017: https://repository.kemkes.go.id/book/777
// USDA SR Legacy records: https://fdc.nal.usda.gov/download-datasets/
const staples: readonly CatalogFood[] = [
  { name: 'Nasi putih', aliases: ['nasi'], calories: 180, protein: 3, serving: { porsi: 150, centong: 100 }, source: 'TKPI AP001' },
  { name: 'Nasi merah', calories: 149, protein: 2.8, serving: { porsi: 150, centong: 100 }, source: 'TKPI AP005' },
  { name: 'Dada ayam goreng', aliases: ['ayam goreng dada', 'ayam dada goreng', 'ayam goreng', 'dada goreng'], calories: 246, protein: 37.9,
    serving: { porsi: 100, potong: 100 }, source: 'TKPI FP029', detail: 'Acuan ayam goreng Pasundan bagian dada.' },
  { name: 'Dada ayam goreng tepung', aliases: ['ayam goreng tepung', 'ayam goreng tepung dada', 'ayam dada goreng tepung'], calories: 298, protein: 34.2,
    serving: { porsi: 100, potong: 100 }, source: 'TKPI FP025' },
  { name: 'Dada ayam bakar', aliases: ['ayam bakar', 'ayam bakar dada', 'ayam dada bakar', 'ayam panggang', 'dada ayam panggang'], calories: 165, protein: 31.02,
    serving: { porsi: 100, potong: 100 }, source: 'USDA FDC 171477', detail: 'Acuan dada panggang tanpa kulit. Bumbu dan olesan dapat menambah kalori.' },
  { name: 'Tempe goreng', aliases: ['tempe'], calories: 350, protein: 24.5, serving: { porsi: 25, potong: 25, iris: 25 }, source: 'TKPI CP076' },
  { name: 'Tahu goreng', aliases: ['tahu'], calories: 115, protein: 9.7, serving: { porsi: 50, potong: 50, buah: 50 }, source: 'TKPI CP062' },
  { name: 'Telur rebus', aliases: ['telur ayam rebus'], calories: 155, protein: 12.58, serving: { porsi: 50, butir: 50 }, source: 'USDA FDC 173424' },
  { name: 'Telur dadar', calories: 251, protein: 16.3, serving: { porsi: 50, butir: 50 }, source: 'TKPI HP001' },
  { name: 'Telur ceplok', aliases: ['telur mata sapi', 'telur goreng'], calories: 196, protein: 13.61, serving: { porsi: 46, butir: 46 }, source: 'USDA FDC 173423' },
  { name: 'Pepes ikan mas', aliases: ['ikan mas pepes'], calories: 209, protein: 15.2, serving: { porsi: 100, potong: 100 }, source: 'TKPI GP019' },
  { name: 'Pepes ikan mujair', aliases: ['ikan mujair pepes', 'ikan mujahir pepes'], calories: 121, protein: 21.7, serving: { porsi: 100, potong: 100 }, source: 'TKPI GP021' },
  { name: 'Bayam rebus', calories: 23, protein: 1.2, serving: { porsi: 75 }, source: 'TKPI DP002' },
  { name: 'Buncis rebus', calories: 30, protein: 2.2, serving: { porsi: 75 }, source: 'TKPI DP003' },
  { name: 'Kangkung rebus', calories: 22, protein: 2.5, serving: { porsi: 75 }, source: 'TKPI DP014' },
  { name: 'Pisang ambon', aliases: ['pisang'], calories: 108, protein: 1, serving: { porsi: 100, buah: 100 }, source: 'TKPI ER074' },
  { name: 'Pepaya', calories: 46, protein: 0.5, serving: { porsi: 100, potong: 75, iris: 75 }, source: 'TKPI ER073' },
]

export function normalizeFoodName(name: string) {
  return name.toLocaleLowerCase('id').normalize('NFD').replace(/\p{M}/gu, '')
    .replace(/\bmie\b/g, 'mi').replace(/\bsatai\b/g, 'sate').replace(/\bmangkok\b/g, 'mangkuk')
    .replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

const foodsByName = new Map<string, CatalogFood>()
const entries: { food: CatalogFood, names: string[][] }[] = []

function register(food: CatalogFood) {
  const key = normalizeFoodName(food.name)
  if (foodsByName.has(key)) return
  const names = [key, ...(food.aliases ?? []).map(normalizeFoodName)]
  const keywords = (food.keywords ?? []).flatMap(keyword => normalizeFoodName(keyword).split(' '))
  entries.push({ food, names: names.map(name => [...name.split(' '), ...keywords]) })
  for (const name of names) {
    if (!foodsByName.has(name)) foodsByName.set(name, food)
  }
}

for (const food of [...staples, ...commonDishes, ...japaneseFoods, ...jakartaSnacks]) register(food)
for (const [id, originalName, calories, protein] of indonesianFoodRows) {
  const dish = regionalDishes[id]
  const name = dish?.name ?? originalName.replace(/ masakan$/i, '').replace(/ \+ /g, ' dan ')
  register({
    name, calories, protein, serving: { porsi: 100 }, source: `Nutrisi Pangan Indonesia #${id}`,
    ...dish,
    aliases: [...(dish?.aliases ?? []), originalName],
    detail: dish?.detail ?? (dish?.serving ? undefined : 'Acuan 100 g. Sesuaikan dengan berat yang dimakan.'),
  })
}

export const foodCatalog: readonly CatalogFood[] = entries.map(({ food }) => food)

export function findFood(name: string) {
  return foodsByName.get(normalizeFoodName(name))
}

export function searchFoods(query: string) {
  const term = normalizeFoodName(query)
  if (!term) return foodCatalog
  const exact = foodsByName.get(term)
  const words = term.split(' ')
  const results = entries.filter(({ food, names }) => food !== exact && names.some(name =>
    words.every(word => name.some(token => token.startsWith(word)))))
    .map(({ food }) => food)
  return exact ? [exact, ...results] : results
}
