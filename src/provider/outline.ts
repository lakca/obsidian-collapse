import { CharNumber, Editor, IterLine, MarkdownEditView, MarkdownPreviewView, MarkdownView, PluginSettingTab, Setting, debounce } from 'obsidian'
import { MarkdownSection, OutlineItem, OutlineView, SectionLoc } from '../interface'

import BaseProvider from './base'
import CollapsePlugin from '../plugin'
import { t } from 'src/util'

export default class OutlineProvider extends BaseProvider<'outline'> {
  readonly type = 'outline' as const

  readonly leafType = 'outline' as const

  readonly activeClass = 'plugin-collapse-active-tree-item'

  private savedHeadingSection: MarkdownSection = null

  get activeMarkdown() {
    return this.plugin.app.workspace.getActiveViewOfType(MarkdownView)
  }

  private compareSection(sec: MarkdownSection, sec2: MarkdownSection) {
    return sec && sec2 && sec.level === sec2.level && sec.lineStart === sec2.lineStart && sec.lineEnd === sec2.lineEnd
  }

  constructor(plugin: CollapsePlugin) {
    super(plugin)
    this.plugin.onFraming(debounce(() => {
      if (this.plugin.settings[this.autoCollapseSettingName] && this.activeMarkdown) {
        const { heading } = this.getActiveMarkdownSectionInfo()
        if (heading && !this.compareSection(heading, this.savedHeadingSection)) {
          this.savedHeadingSection = heading
          this.focusHeading({
            level: heading.level,
            lineStart: heading.lineStart,
            lineEnd: heading.lineEnd,
          })
        }
      }
    }, 200))
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

  /**
   * Get the heading (or itself) of the top most block in the viewport.
   * @returns
   */
  getActiveMarkdownSectionInfo() {
    const { activeMarkdown } = this
    const selections: {
      heading?: MarkdownSection,
      edge?: MarkdownSection,
    } = {}
    if (activeMarkdown) {
      const { autoCollapseOffsetTop } = this.plugin.settings
      const { currentMode } = activeMarkdown
      if (MarkdownPreviewView && currentMode instanceof MarkdownPreviewView) {
        const previewMode = currentMode
        previewMode.renderer.sections.find(section => {
          const found = previewMode.renderer.getSectionTop(section) >
          previewMode.renderer.previewEl.scrollTop + autoCollapseOffsetTop
          if (!found) {
            if (section.level < 7) {
              selections.heading = section
            }
            selections.edge = section
          }
          return found
        })
      }
      // TODO: mobile
      else if (MarkdownEditView && currentMode instanceof MarkdownEditView) {
      }
      /**
       * ! Constructor of `editMode` cannot be found in obsidian (exports).
       *
       * live/source mode is distinguished by 'editMode.sourceMode' attribute.
       */
      else if (currentMode === activeMarkdown.editMode) {
        const { editor } = activeMarkdown
        const edgeTop = editor.cm.dom.getBoundingClientRect().top

        /**
         * ! The children property doesn't contain all lines in the file (to prevent overload).
         */
        for (const line of editor.cm.docView.children) {
          const sectionInfo = this.getSectionFromCharacterIndices(editor, line.posAtStart, line.posAtEnd)
          if (sectionInfo.level < 7) {
            selections.heading = sectionInfo
          }
          if (line.dom.getBoundingClientRect().top > edgeTop + autoCollapseOffsetTop) {
            selections.edge = sectionInfo
            // if no heading in the viewport, try getting the heading section of the edge section.
            if (!selections.heading) {
              selections.heading = this.getHeadingOfSection(editor, selections.edge)
            }
            break
          }
        }
      }

    }
    return selections
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
