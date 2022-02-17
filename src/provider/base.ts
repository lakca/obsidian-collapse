import { EventRef, Events, Notice, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian'
import { t, upperFirst } from '../util'
import CollapsePlugin from '../plugin'
import { FileExplorerView, OutlineView } from 'src/interface'

export type ProviderTypes = 'explorer' | 'outline'

export interface ViewTypes {
  outline: OutlineView
  explorer: FileExplorerView
}

export interface Leaf<T extends ProviderTypes> extends WorkspaceLeaf {
  view: ViewTypes[T]
}

export default interface BaseProvider<T extends ProviderTypes> {
  on(name: 'new-leaves', callback: (newLeaves: Leaf<T>[]) => unknown, ctx?: unknown): EventRef
}
export default abstract class BaseProvider<T extends ProviderTypes> extends Events {

  abstract readonly type: T

  abstract readonly leafType: string

  private leavesIdCache: string[] = this.ids

  abstract collapseAll(): void

  abstract expandAll(): void

  registerCommand() {
    // skip
  }

  registerSettingTab(settingTab: PluginSettingTab) {
    // skip
  }

  get autoCollapseSettingName() {
    return `autoCollapse${upperFirst(this.type)}` as `autoCollapse${Capitalize<T>}`
  }
  get showRibbonSettingName() {
    return `showRibbonOn${upperFirst(this.type)}` as `showRibbonOn${Capitalize<T>}`
  }
  get collapseAllCommandId() {
    return `plugin:collapse-collapse-${this.type}`
  }
  get expandAllCommandId() {
    return `plugin:collapse-expand-${this.type}`
  }
  get toggleCollapseAllCommandId() {
    return `plugin:collapse-toggle-auto-collapse-${this.type}`
  }
  get collapseAllCommandName() {
    return `collapse${upperFirst(this.type)}` as `collapse${Capitalize<T>}`
  }
  get expandAllCommandName() {
    return `expand${upperFirst(this.type)}` as `expand${Capitalize<T>}`
  }
  get toggleCollapseAllCommandName() {
    return `toggleAutoCollapse${upperFirst(this.type)}` as `toggleAutoCollapse${Capitalize<T>}`
  }
  get leaves() {
    return this.plugin.app.workspace.getLeavesOfType(this.leafType) as Leaf<T>[]
  }
  get views() {
    return this.leaves.map(e => e.view)
  }
  get ids() {
    return this.leaves.map(e => e.id)
  }

  eachView<V extends ViewTypes[T]>(cb: (view: V) => void, view?: V|V[]) {
    const views = (view ? [view] : this.views) as V[]
    views.forEach(view => cb(view))
  }

  constructor(protected plugin: CollapsePlugin) {
    super()

    this.plugin.registerEvent(this.plugin.app.workspace.on('layout-change', () => {
      const leaves = this.leaves
      const tmp = Object.fromEntries(this.leavesIdCache.map(id => [id, true]))
      const newleaves = leaves.filter(leaf => !tmp[leaf.id])
      this.trigger('new-leaves', newleaves)
    }))
  }

  mountSettingTab(settingTab: PluginSettingTab) {
    const { containerEl } = settingTab
    const { autoCollapseSettingName } = this

    // auto
    new Setting(containerEl)
    .setName(t(`settings.${autoCollapseSettingName}`))
    .setDesc(t(`settings.${autoCollapseSettingName}.desc`))
    .addToggle(toggle => {
      toggle
      .setValue(this.plugin.settings[autoCollapseSettingName])
      .onChange(checked => {
        this.plugin.settings[autoCollapseSettingName] = checked
        new Notice(t(`notice.${autoCollapseSettingName}.${this.plugin.settings[autoCollapseSettingName]}`), 1000)
      })
    })

    // ribbon
    // new Setting(containerEl)
    // .setName(t(`settings.${showRibbonSettingName}`))
    // .setDesc(t(`settings.${showRibbonSettingName}.desc`))
    // .addToggle(toggle => {
    //   toggle
    //   .setValue(this.plugin.settings[showRibbonSettingName])
    //   .onChange(checked => {
    //     this.plugin.settings[showRibbonSettingName] = checked
    //   })
    // })

    this.registerSettingTab(settingTab)
  }

  mountCommand() {
    const {
      collapseAllCommandId,
      collapseAllCommandName,
      expandAllCommandId,
      expandAllCommandName,
      toggleCollapseAllCommandId,
      toggleCollapseAllCommandName,
    } = this

    this.plugin.addCommand({
      id: collapseAllCommandId,
      name: t(`commands.${collapseAllCommandName}`),
      callback: () => {
        this.collapseAll()
      },
      mobileOnly: false,
    })

    this.plugin.addCommand({
      id: expandAllCommandId,
      name: t(`commands.${expandAllCommandName}`),
      callback: () => {
        this.expandAll()
      },
      mobileOnly: false,
    })

    this.plugin.addCommand({
      id: toggleCollapseAllCommandId,
      name: t(`commands.${toggleCollapseAllCommandName}`),
      callback: () => this.toggleAutoCollapse(),
    })

    this.registerCommand()
  }

  toggleAutoCollapse() {
    const { autoCollapseSettingName } = this
    this.plugin.settings[autoCollapseSettingName] = !this.plugin.settings[autoCollapseSettingName]
    new Notice(t(`notice.${autoCollapseSettingName}.${this.plugin.settings[autoCollapseSettingName]}`), 1000)
  }
}
