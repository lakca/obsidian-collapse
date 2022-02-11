import BaseProvider from "./base"

export default class ExplorerProvider extends BaseProvider<'explorer'> {
  type = 'explorer' as const

  registerSetting() {

  }
}
