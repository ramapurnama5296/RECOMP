import { expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

async function onboard(page: Page) {
  await page.goto('./')
  await page.getByLabel('Nama panggilan (opsional)').fill('Uji RECOMP')
  await page.getByRole('button', { name: 'Mulai tracking' }).click()
  await expect(page.getByRole('heading', { name: 'Halo, Uji RECOMP.' })).toBeVisible()
}

async function readyForOffline(page: Page) {
  await page.goto('./#/install')
  await expect(page.getByText('Siap digunakan offline.')).toBeVisible()
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
}

async function logCreatine(page: Page) {
  const creatine = page.getByRole('checkbox', { name: /Creatine/ })
  await creatine.click()
  await expect(creatine).toBeChecked()
  await expect(page.getByText('Sudah dikonsumsi')).toBeVisible()
}

test('manifest, icons and deep-link shell are served under the Pages base path', async ({ request, page }) => {
  const response = await request.get('manifest.webmanifest')
  expect(response.ok()).toBe(true)
  const manifest = await response.json()
  expect(manifest.display).toBe('standalone')
  expect(manifest.scope).toBe('./')
  for (const icon of manifest.icons) expect((await request.get(icon.src)).ok()).toBe(true)
  expect((await request.get('icons/apple-touch.png')).ok()).toBe(true)
  expect((await request.get('sw.js')).ok()).toBe(true)
  await onboard(page)
  await page.getByRole('link', { name: 'Plan', exact: true }).click()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Weekly Plan' })).toBeVisible()
})

test('workout and sets survive reload, and a creatine checkbox is available each day', async ({ page }) => {
  await onboard(page)
  await page.getByRole('navigation').getByRole('link', { name: 'Workout' }).click()
  await page.getByRole('button', { name: 'Sesi baru' }).click()
  await page.getByLabel('Nama sesi (opsional)').fill('Latihan uji')
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await page.getByRole('button', { name: 'Tambah set' }).click()
  await page.getByLabel('Exercise', { exact: true }).selectOption('Goblet squat')
  await page.getByLabel('Beban (kg)').fill('4')
  await page.getByLabel('Repetisi').fill('10')
  await page.getByLabel('Tandai set selesai').check()
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByRole('checkbox', { name: 'Set 1 Goblet squat selesai' })).toBeChecked()
  await page.reload()
  await page.getByRole('button', { name: /Latihan uji/ }).click()
  await expect(page.getByRole('checkbox', { name: 'Set 1 Goblet squat selesai' })).toBeChecked()
  await page.goto('./#/supplements')
  await logCreatine(page)
  await page.getByRole('button', { name: 'Periode sebelumnya' }).click()
  await expect(page.getByRole('checkbox', { name: /Creatine/ })).not.toBeChecked()
  await logCreatine(page)
})

test('shell reloads offline and can write data to IndexedDB', async ({ page, context }) => {
  await onboard(page)
  await readyForOffline(page)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Install di iPhone' })).toBeVisible()
  await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
  await page.getByRole('button', { name: 'Catatan', exact: true }).click()
  await page.getByLabel('Catatan', { exact: true }).fill('Catatan offline uji')
  await page.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('Catatan offline uji')).toBeVisible()
  await page.reload()
  await expect(page.getByText('Catatan offline uji')).toBeVisible()
})

test('a meal estimate works offline, applies corrected weights and survives reload', async ({ page, context }) => {
  await onboard(page)
  await readyForOffline(page)
  await context.setOffline(true)
  await page.goto('./#/nutrition/new')
  const editor = page.getByRole('dialog', { name: 'Catat makanan' })
  await editor.getByLabel('Nama makanan').fill('Nasi putih 100 g + tempe 2 iris')
  await editor.getByRole('button', { name: 'Estimasi kalori & protein' }).click()
  await expect(editor.getByLabel('Berat Tempe goreng (g)')).toHaveValue('50')
  await editor.getByLabel('Berat Tempe goreng (g)').fill('40')
  await editor.getByRole('button', { name: 'Pakai estimasi' }).click()
  await expect(editor.getByLabel('Kalori (kcal)')).toHaveValue('320')
  await expect(editor.getByLabel('Protein (g)', { exact: true })).toHaveValue('12.8')
  await editor.getByRole('button', { name: 'Simpan', exact: true }).click()
  await expect(page.getByText('320 kcal · 12,8 g protein · Estimasi', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText('320 kcal · 12,8 g protein · Estimasi', { exact: true })).toBeVisible()
})

test('all primary and report routes fit a narrow iPhone viewport and support keyboard focus', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  await onboard(page)
  await page.reload()
  await page.keyboard.press('Tab')
  await expect(page.getByRole('link', { name: 'Ke konten utama' })).toBeFocused()
  const routes = [
    ['home', 'Halo, Uji RECOMP.'], ['plan', 'Weekly Plan'], ['workout', 'Workout Log'], ['progress', 'Body Progress'],
    ['more', 'More'], ['nutrition', 'Nutrition Tracker'], ['reports', 'Reports'], ['settings', 'Settings'],
    ['discipline', 'Monthly Discipline'], ['supplements', 'Supplement Tracker'],
  ]
  for (const [route, title] of routes) {
    await page.goto('./#/' + route)
    await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible()
    const dimensions = await page.evaluate(() => ({ width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth }))
    expect(dimensions.scroll).toBe(dimensions.width)
    const navLink = page.getByRole('navigation').getByRole('link', { name: 'Plan' })
    const target = await navLink.boundingBox()
    expect(target?.height).toBeGreaterThanOrEqual(44)
    expect(target?.width).toBeGreaterThanOrEqual(44)
  }
})

test('accepting a service worker update keeps the user profile and logged data', async ({ page, request }) => {
  await onboard(page)
  await logCreatine(page)
  await readyForOffline(page)
  expect((await request.post('/__test/release')).ok()).toBe(true)
  await page.evaluate(async () => { await (await navigator.serviceWorker.getRegistration())?.update() })
  await page.getByRole('button', { name: 'Muat versi baru' }).click()
  await expect(page.getByRole('button', { name: 'Muat versi baru' })).toHaveCount(0)
  await page.getByRole('navigation').getByRole('link', { name: 'Home' }).click()
  await expect(page.getByRole('heading', { name: 'Halo, Uji RECOMP.' })).toBeVisible()
  await expect(page.getByRole('checkbox', { name: /Creatine/ })).toBeChecked()
})
