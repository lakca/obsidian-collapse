import BaseProvider, { Leaf } from './base'
import { FileExplorerItem, FileExplorerView } from 'src/interface'
import { FileView, TFile, TFolder } from 'obsidian'

import CollapsePlugin from '../plugin'

export default class ExplorerProvider extends BaseProvider<'explorer'> {

  readonly type = 'explorer' as const

  readonly leafType = 'file-explorer' as const

  private oldHandleFileClickMap: Map<string, FileExplorerView['handleFileClick']> = new Map()

  constructor(plugin: CollapsePlugin) {
    super(plugin)

    // changed active editor
    this.plugin.registerEvent(this.plugin.app.workspace.on('active-leaf-change', leaf => {
      if (this.plugin.settings[this.autoCollapseSettingName]) {
        this.focusFile((leaf.view as FileView).file)
      }
    }))

    // undo sth on leaves
    this.plugin.register(() => {
      this.oldHandleFileClickMap.forEach((handleFileClick, id) => {
        const leaf = this.plugin.app.workspace.getLeafById(id) as Leaf<'explorer'>
        leaf && (leaf.view.handleFileClick = handleFileClick)
      })
    })

    // do sth on leaves
    this.plugin.registerEvent(this.on('new-leaves', leaves => {
      this.modifyLeaves(leaves)
    }))
    this.modifyLeaves(this.leaves)
  }

  private modifyLeaves(leaves: Leaf<'explorer'>[] = []) {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const self = this
    leaves.forEach(leaf => {
      // handle onTitleElClick (click file-explorer folder item)
      if (!this.oldHandleFileClickMap.has(leaf.id)) {
        this.oldHandleFileClickMap.set(leaf.id, leaf.view.handleFileClick)
        leaf.view.handleFileClick = function(evt, file) {
          if ('children' in file.file && file.collapsed) {
            self.focusFile(file.file)
            file.setCollapsed(true)
          }
          self.oldHandleFileClickMap.get(leaf.id).apply(this, arguments)
        }
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
