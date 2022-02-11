import { PluginSettingTab, Setting } from "obsidian"
import { t, upperFirst } from '../util'

import CollapsePlugin from "main"

export type ProviderTypes = "explorer" | "outline"

export default abstract class BaseProvider<T extends ProviderTypes> {

  abstract readonly type: T

  registerCommand() {
    // skip
  }

  get autoCollapseSettingName() {
    return `autoCollapse${upperFirst(this.type)}` as `autoCollapse${Capitalize<T>}`
  }
  get showRibbonSettingName() {
    return `showRibbonOn${upperFirst(this.type)}` as `showRibbonOn${Capitalize<T>}`
  }
  get collapseCommandId() {
    return `collapse-${this.type}`
  }
  get collapseCommandName() {
    return `collapse${upperFirst(this.type)}` as `collapse${Capitalize<T>}`
  }
  get expandCommandId() {
    return `expand-${this.type}`
  }
  get expandCommandName() {
    return `expand${upperFirst(this.type)}` as `expand${Capitalize<T>}`
  }

  constructor(protected plugin: CollapsePlugin) {}

  mountSettingTab(settingTab: PluginSettingTab) {
    const { containerEl } = settingTab
    const { autoCollapseSettingName, showRibbonSettingName } = this

    // auto
    new Setting(containerEl)
    .setName(t(`settings.${autoCollapseSettingName}`))
    .setDesc(t(`settings.${autoCollapseSettingName}.desc`))
    .addToggle(toggle => {
      toggle
      .setValue(this.plugin.settings[autoCollapseSettingName])
      .onChange(checked => {
        this.plugin.settings[autoCollapseSettingName] = checked
      })
    })

    // ribbon
    new Setting(containerEl)
    .setName(t(`settings.${showRibbonSettingName}`))
    .setDesc(t(`settings.${showRibbonSettingName}.desc`))
    .addToggle(toggle => {
      toggle
      .setValue(this.plugin.settings[showRibbonSettingName])
      .onChange(checked => {
        this.plugin.settings[showRibbonSettingName] = checked
      })
    })
  }

  mountCommand() {
    const { collapseCommandId, collapseCommandName, expandCommandId, expandCommandName } = this
    this.plugin.addCommand({
      id: collapseCommandId,
      name: t(`commands.${collapseCommandName}`),
      callback() {},
      editorCallback() {},
      editorCheckCallback() {},
      checkCallback() {},
      mobileOnly: false,
    })

    this.plugin.addCommand({
      id: expandCommandId,
      name: t(`commands.${expandCommandName}`),
      callback() {},
      editorCallback() {},
      editorCheckCallback() {},
      checkCallback() {},
      mobileOnly: false,
    })

    this.registerCommand()
  }
}
