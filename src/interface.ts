import { HeadingCache, MarkdownPreviewEvents, MarkdownSubView, TFile, TFolder, View } from "obsidian"

export interface Collapsable {
  setCollapsed?: (collapsed: boolean) => void
  toggleCollapsed?: () => void
  collapsed?: boolean
}

export interface SectionLoc {
  level: number,
  lineStart: number,
  lineEnd: number,
}

export interface MarkdownSection extends SectionLoc {
  [key: string]: unknown
}

declare module 'obsidian' {
  interface MarkdownPreviewView {
    renderer: {
      previewEl: HTMLElement
      sizerEl: HTMLElement
      sections: MarkdownSection[]
      getSectionTop(section: MarkdownSection): number
    }
  }

  type CodeMirrorLineElement = HTMLElement
  /** Start from 0 */
  type CharIndex = number
  /** Start from 1 */
  type CharNumber = number
  /** Start from 1 */
  type LineNumber = number
  interface LineInfo {
    from: CharIndex
    to: CharIndex
    number: LineNumber
    text: string
  }

  interface IterLine {
    done: boolean,
    value: string, inner: {
    /** first character index */
    from: CharIndex,
    /** last character index including line-feed */
    pos: CharIndex,
  } }
  interface LineIterator {
    next(): IterLine
    [Symbol.iterator](): Generator<string>
  }
  interface Editor {
    cm: {
      dom: HTMLElement
      state: {
        doc: {
          /** Get line by line number */
          line(line: LineNumber): LineInfo
          /** Get line by char number */
          lineAt(charPos: CharIndex): LineInfo
          /** Iterate on lines (text) */
          iterLines(lineStart: LineNumber, lienEnd: LineNumber): LineIterator
        }
      },
      docView: {
        /** Only lines in rendered view. */
        children: Array<{
          dom: CodeMirrorLineElement
          posAtStart: CharIndex
          posAtEnd: CharIndex
        }>
      }
    }
  }
  interface MarkdownView {
    editMode: MarkdownSubView,
    file: TFile
  }
  interface WorkspaceLeaf {
    id: string
  }
}
export interface OutlineView extends View {
  getHeadings(): HeadingCache[]
  file: TFile
  treeView: {
    childrenEl: HTMLElement
    children: OutlineItem[]
    allItems: OutlineItem[]
  }
}

export interface OutlineItem extends Collapsable {
  el: HTMLElement
  childrenEl: HTMLElement
  selfEl: HTMLElement
  innerEl: HTMLElement
  heading: HeadingCache
  children?: OutlineItem[]
  setActive(active: boolean): void
}

export interface FileExplorerView extends View {
  fileItems: Record<string, FileExplorerItem>
  revealInFolder(file: TFile): void
  handleFileClick(evt: Event, file: FileExplorerItem, ...args: unknown[]): void
}

export interface FileExplorerItem extends Collapsable {
  file: TFolder & Collapsable & { el: HTMLElement } | TFile & { el: HTMLElement }
}

export interface MarkdownEditMode extends MarkdownSubView, MarkdownPreviewEvents {
  sourceMode: boolean
}
