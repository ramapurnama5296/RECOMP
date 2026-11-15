export interface CatalogFood {
  name: string
  aliases?: string[]
  calories: number
  protein: number
  serving: { porsi: number } & Partial<Record<string, number>>
  source: string
  detail?: string
}

// Calories and protein are per 100 g of edible food. Serving weights are editable estimates.
// TKPI 2017: https://repository.kemkes.go.id/book/777
// USDA SR Legacy records: https://fdc.nal.usda.gov/download-datasets/
export const foodCatalog: readonly CatalogFood[] = [
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
