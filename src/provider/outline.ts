import { CharNumber, Editor, IterLine, MarkdownPreviewView, MarkdownView, PluginSettingTab, Setting } from 'obsidian'
import { MarkdownSection, OutlineItem, OutlineView, SectionLoc } from '../interface'

import BaseProvider from './base'
import CollapsePlugin from '../plugin'
import { t } from 'src/util'

interface Sections {
  heading?: MarkdownSection
  edge?: MarkdownSection
}
export default class OutlineProvider extends BaseProvider<'outline'> {

  readonly type = 'outline' as const

  readonly leafType = 'outline' as const

  readonly activeClass = 'plugin-collapse-active-tree-item'

  private lastScroll = -1

  private sections: Sections = {}

  get autoCollapsing() {
    return this.plugin.settings[this.autoCollapseSettingName]
  }

  get markdownView() {
    const leaf = this.plugin.app.workspace.activeLeaf
    return leaf && leaf.view instanceof MarkdownView ? leaf.view : void 0
  }

  /** Current active (leaf) file view scroll (lines) */
  get scroll() {
    return this.markdownView?.scroll
  }

  /** Current active (leaf) file headings */
  get headings() {
    return this.plugin.app.metadataCache.getFileCache(this.markdownView.file)?.headings
  }

  constructor(plugin: CollapsePlugin) {
    super(plugin)

    this.plugin.onFraming(() => {
      if (!this.autoCollapsing) return
      if (!this.markdownView) return
      if (!this.headings?.length) return
      const move = this.scroll - this.lastScroll
      this.lastScroll = this.scroll
      if (move > 1 || move < -1) {
        this.syncSections()
        if (this.sections.heading) {
          this.focusHeading({
            level: this.sections.heading.level,
            lineStart: this.sections.heading.lineStart,
            lineEnd: this.sections.heading.lineEnd,
          })
        }
      }
    })
  }

  getItems(view: OutlineView) {
    return view.treeView.children && view.treeView.children.length ? view.treeView.allItems : []
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

  getLevel(text: string) {
    const m = text.match(/^\s*(#{1,6})\s/)
    return m ? m[1].length : 7
  }

  private getSectionFromCharacterIndices(editor: Editor, posAtStart: CharNumber, posAtEnd: CharNumber): MarkdownSection & { text: string } {
    const startLine = editor.cm.state.doc.lineAt(posAtStart)
    const endLine = posAtEnd == null ? startLine : editor.cm.state.doc.lineAt(posAtEnd)
    return {
      level: this.getLevel(startLine.text),
      lineStart: startLine.number - 1,
      lineEnd: endLine.number - 1,
      text: startLine.text,
    }
  }

  /**
   * Get heading section of the given section.
   */
  private getHeadingOfSection(editor: Editor, sec: MarkdownSection): MarkdownSection {
    const start = 1
    const gen = editor.cm.state.doc.iterLines(start, sec.lineStart)
    let next: IterLine
    let heading: MarkdownSection
    let lineNumber = start - 1
    do {
      next = gen.next()
      lineNumber++
      const level = this.getLevel(next.value)
      if (level < 7) {
        heading = {
          level,
          lineStart: lineNumber,
          lineEnd: lineNumber,
          text: next.value,
        }
      }
    } while (!next.done)
    return heading
  }

  private clearSync() {
    this.sections = {}
  }

  private syncMarkdownPreviewView(previewMode: MarkdownPreviewView) {
    this.clearSync()
    const sections = this.sections
    const { autoCollapseOffsetTop } = this.plugin.settings
    previewMode.renderer.sections.find(section => {
      const found = previewMode.renderer.getSectionTop(section) >
      previewMode.renderer.previewEl.scrollTop + autoCollapseOffsetTop
      if (!found) {
        if (section.level < 7) {
          sections.heading = section
        }
        sections.edge = section
      }
      return found
    })
  }

  /**
   * ! Constructor of `editMode` cannot be found in obsidian (exports).
   *
   * live/source mode is distinguished by 'editMode.sourceMode' attribute.
   */
  private syncMarkdownEditView(editor: Editor) {
    this.clearSync()
    const edgeTop = editor.cm.dom.getBoundingClientRect().top
    const { sections } = this
    const { autoCollapseOffsetTop } = this.plugin.settings

    /**
     * ! The children property doesn't contain all lines in the file (to prevent overload).
     */
    for (const line of editor.cm.docView.children) {
      const sectionInfo = this.getSectionFromCharacterIndices(editor, line.posAtStart, line.posAtEnd)
      if (sectionInfo.level < 7) {
        sections.heading = sectionInfo
      }
      if (line.dom.getBoundingClientRect().top > edgeTop + autoCollapseOffsetTop) {
        sections.edge = sectionInfo
        // if no heading in the viewport, try getting the heading section of the edge section.
        if (!sections.heading) {
          sections.heading = this.getHeadingOfSection(editor, sections.edge)
        }
        break
      }
    }
  }

  /**
   * Get the heading (or itself) of the top most block in the viewport.
   * @returns
   */
  syncSections() {
    const { markdownView } = this
    if (markdownView) {
      const state = markdownView.getState()
      if (state.mode === 'preview') {
        this.syncMarkdownPreviewView(markdownView.previewMode)
      } else if (state.mode === 'source') {
        this.syncMarkdownEditView(markdownView.editor)
      }
    }
  }

  collapseAll(outline?: OutlineView) {
    this.eachView(view => {
      this.getItems(view).forEach(item => {
        item.setCollapsed && item.setCollapsed(true)
      })
    }, outline)
  }

  expandAll(outline?: OutlineView) {
    this.eachView(view => {
      this.getItems(view).forEach(item => {
        item.setCollapsed && item.setCollapsed(false)
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
          item.setCollapsed && item.setCollapsed(true)
          item.el.removeClass(this.activeClass)
        } else if (item.heading.level < itemLoc.level) {
          tree[item.heading.level] = item
        } else if (item.heading.level === itemLoc.level
          && item.heading.position.start.line === itemLoc.lineStart
          && item.heading.position.end.line === itemLoc.lineEnd) {
            item.setCollapsed && item.setCollapsed(false)
            item.el.addClass(this.activeClass)
            index = idx
        }
      })
      for (let i = 0; i < index; i++) {
        const item = items[i]
        item.setCollapsed && item.setCollapsed(item !== tree[item.heading.level])
        item.el.removeClass(this.activeClass)
      }
    }, outline)
  }
}
