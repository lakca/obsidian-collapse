import BaseProvider from './base'
import { MarkdownSection, OutlineItem, OutlineView, SectionLoc } from '../interface'
import { MarkdownView, PluginSettingTab, Setting } from 'obsidian'
import CollapsePlugin from '../plugin'
import { t } from 'src/util'

export default class OutlineProvider extends BaseProvider<'outline'> {
  readonly type = 'outline' as const

  readonly leafType = 'outline' as const

  readonly activeClass = 'plugin-collapse-active-tree-item'

  private previousHeader: MarkdownSection = null

  get activeMarkdown() {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
  }

  constructor(plugin: CollapsePlugin) {
    super(plugin)
    this.plugin.onFraming(() => {
      if (this.plugin.settings[this.autoCollapseSettingName] && this.activeMarkdown) {
        const { header } = this.getActiveMarkdownSections()
        if (header !== this.previousHeader) {
          this.previousHeader = header
          this.focusHeading({
            level: header.level,
            lineStart: header.lineStart,
            lineEnd: header.lineEnd,
          })
        }
      }
    })
  }

  getItems(view: OutlineView) {
    return view.treeView.allItems
  }

  registerSettingTab(settingTab: PluginSettingTab) {
    const { containerEl } = settingTab
    new Setting(containerEl)
    .setName(t('settings.autoCollapseOffsetTop'))
    .addText(text => {
      text
      .setValue(this.plugin.settings.autoCollapseOffsetTop.toString())
      .onChange(value => {
        if (/^\d+$/.test(value)) {
          const offset = Number(value)
          if (offset !== this.plugin.settings.autoCollapseOffsetTop) {
            this.plugin.settings.autoCollapseOffsetTop = offset
          }
        }
      })
    })
  }

  getActiveMarkdownSections(): {
    header?: MarkdownSection,
    edge?: MarkdownSection,
  } {
    const { activeMarkdown } = this
    const { autoCollapseOffsetTop } = this.plugin.settings
    if (!activeMarkdown) return {}
    const previewMode = activeMarkdown.previewMode
    let header, edge
    previewMode.renderer.sections.find(section => {
      const flag = previewMode.renderer.getSectionTop(section) >
      previewMode.renderer.previewEl.scrollTop + autoCollapseOffsetTop
      if (!flag) {
        if (section.el.firstElementChild.tagName[0].toLowerCase() === 'h') header = section
        edge = section
      }
      return flag
    })
    return { header, edge }
  }

  collapseAll(outline?: OutlineView) {
    this.eachView(view => {
      this.getItems(view).forEach(item => {
        if (item.setCollapsed) item.setCollapsed(true)
      })
    }, outline)
  }

  expandAll(outline?: OutlineView) {
    this.eachView(view => {
      this.getItems(view).forEach(item => {
        if (item.setCollapsed) item.setCollapsed(false)
      })
    }, outline)
  }

  // focus a heading with collapsing the others
  focusHeading(itemLoc: SectionLoc, outline?: OutlineView) {
    let index = -1
    const tree: OutlineItem[] = []
    this.eachView(view => {
      const items = this.getItems(view)
      items.forEach((item, idx) => {
        if (index > -1) {
          item.setCollapsed(true)
          item.el.removeClass(this.activeClass)
        } else if (item.heading.level < itemLoc.level) {
          tree[item.heading.level] = item
        } else if (item.heading.level === itemLoc.level
          && item.heading.position.start.line === itemLoc.lineStart
          && item.heading.position.end.line === itemLoc.lineEnd) {
            item.setCollapsed(false)
            item.el.addClass(this.activeClass)
            index = idx
        }
      })
      for (let i = 0; i < index; i++) {
        const item = items[i]
        item.setCollapsed(item !== tree[item.heading.level])
        item.el.removeClass(this.activeClass)
      }
    }, outline)
  }
}
