// @ts-ignore
// import { filenames as providerFilenames, default as providerFiles } from './provider/*.ts'

// const providers = Object.fromEntries(providerFilenames.map((name: string, i: number) => [name.replace(/\.ts$/, ''), providerFiles[i]]))

import ExplorerProvider from './provider/explorer'
import OutlineProvider from './provider/outline'

const providers = {
  ExplorerProvider,
  OutlineProvider,
}

export default providers
