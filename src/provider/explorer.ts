import BaseProvider, { Leaf } from './base'
import { FileExplorerItem, FileExplorerView } from 'src/interface'
import { FileView, TFile, TFolder } from 'obsidian'

import CollapsePlugin from '../plugin'

export default class ExplorerProvider extends BaseProvider<'explorer'> {
  readonly type = 'explorer' as const

  readonly leafType = 'file-explorer' as const

  private originHandleFileClick: Record<string, (evt: Event, file: FileExplorerItem, ...args: unknown[]) => unknown> = {}

  constructor(plugin: CollapsePlugin) {
    super(plugin)

    // changed active editor
    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', leaf => {
      if (this.plugin.settings[this.autoCollapseSettingName]) {
        this.focusFile((leaf.view as FileView).file)
      }
    }))

    this.handleNewLeaves(this.leaves)

    // new explorer leaves added
    this.plugin.registerEvent(this.on('new-leaves', newLeaves => {
      this.handleNewLeaves(newLeaves)
    }))

    this.plugin.register(() => {
      Object.entries(this.originHandleFileClick).forEach(([id, handleFileClick]) => {
        const leaf = this.plugin.app.workspace.getLeafById(id) as Leaf<'explorer'>
        leaf && (leaf.view.handleFileClick = handleFileClick)
      })
    })
  }

  private handleNewLeaves(newLeaves: Leaf<'explorer'>[] = []) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    newLeaves.forEach(leaf => {
      // handle onTitleElClick (click file-explorer folder item)
      if (this.originHandleFileClick[leaf.id]) return

      this.originHandleFileClick[leaf.id] = leaf.view.handleFileClick

      leaf.view.handleFileClick = function(evt, file) {
        if ('children' in file.file && file.collapsed) {
          self.focusFile(file.file)
          file.setCollapsed(true)
        }
        self.originHandleFileClick[leaf.id].apply(this, arguments)
      }
    })
  }

  getItems(view: FileExplorerView) {
    return Object.values(view.fileItems)
  }

  collapseAll(explorer?: FileExplorerView) {
    this.eachView(view => {
      this.getItems(view).forEach(item => {
        if (item.file.parent && item.setCollapsed) item.setCollapsed(true)
      })
    }, explorer)
  }

  expandAll(explorer?: FileExplorerView) {
    this.eachView(view => {
      this.getItems(view).forEach(item => {
        if (item.setCollapsed) item.setCollapsed(false)
      })
    }, explorer)
  }

  getFileTree(file: TFile|TFolder) {
    const tree = []
    while (file) {
      tree.push(file.path)
      file = file.parent
    }
    return tree
  }

  focusFile(file: TFile|TFolder, explorer?: FileExplorerView) {
    if (!file) return
    const tree = this.getFileTree(file)
    this.eachView(view => {
      this.getItems(view).forEach(item => {
        if (item.setCollapsed) {
          item.setCollapsed(!tree.includes(item.file.path))
        }
      })
    }, explorer)
  }
}
