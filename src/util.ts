// @ts-ignore
import { filenames as localeFilenames, default as localeFiles } from '../locale/*.json'

import en from '../locale/en.json'

const LOCALES: { [key: string]: Partial<typeof en>} = Object.fromEntries(localeFilenames.map((name: string, i: number) => {
  return [name.match(/([^\/]+)\.json$/)[1], localeFiles[i].default]
}))

// https://forum.obsidian.md/t/a-way-to-get-obsidian-s-currently-set-language/17829/4
export function t(str: keyof typeof en): string {
  const lang = window.localStorage.getItem('language') || 'en'
  const locale = LOCALES[lang] || en
  return str in locale ? locale[str] : str
}

// export function camelCase(str: string) {
//   return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
// }

// export function upperCamelCase(str: string) {
//   return str.replace(/(?:^|[-_])(\w)/g, (_, c) => c.toUpperCase())
// }

export function upperFirst(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
