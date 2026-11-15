export const ZONE = 'Asia/Jakarta'
const localDate = new Intl.DateTimeFormat('en-CA', {
  timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit',
})
const localTime = new Intl.DateTimeFormat('en-GB', {
  timeZone: ZONE, hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
})
export function today(now = new Date()) {
  const parts = Object.fromEntries(localDate.formatToParts(now).map(({ type, value }) => [type, value]))
  return parts.year + '-' + parts.month + '-' + parts.day
}
export const timeNow = () => localTime.format(new Date())
export const day = (date: string) => new Date(date + 'T00:00:00Z')
export function shift(date: string, days: number) {
  const value = day(date)
  value.setUTCDate(value.getUTCDate() + days)
  return value.toISOString().slice(0, 10)
}
export const daysBetween = (a: string, b: string) => Math.round((+day(b) - +day(a)) / 86400000)
export const weekStart = (date: string) => shift(date, -((day(date).getUTCDay() + 6) % 7))
export const weekDays = (date: string) => Array.from({ length: 7 }, (_, index) => shift(weekStart(date), index))
export function shiftMonth(date: string, offset: number) {
  const value = day(date.slice(0, 7) + '-01')
  value.setUTCMonth(value.getUTCMonth() + offset)
  return value.toISOString().slice(0, 10)
}
export const inRange = (date: string, start: string, end: string) => date >= start && date < end
export const dateLabel = (date: string, options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'short' }) =>
  new Intl.DateTimeFormat('id-ID', { ...options, timeZone: 'UTC' }).format(day(date))

