import { MarkdownSourceView, View, HeadingCache, TFile, TFolder } from "obsidian"

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
  el: HTMLElement
  headingCollapsed: boolean,
  setCollapsed(collapsed: boolean): void
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
  interface MarkdownView {
    scroll: number
    file: TFile
    editMode: MarkdownEditView
  }
  interface WorkspaceLeaf {
    id: string
  }
}

export interface MarkdownEditView extends MarkdownSourceView {
  contentContainerEl: HTMLElement
  editorEl: HTMLElement
  // live preview / source mode
  sourceMode: boolean
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
