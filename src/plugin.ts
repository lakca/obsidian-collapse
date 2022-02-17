import { MarkdownView, Notice, Plugin } from 'obsidian'

import SettingTab from './setting-tab'
import providers from './provider'
import { t } from './util'

// Remember to rename these classes and interfaces!

interface CollapsePluginSettings {
	autoCollapseExplorer: boolean
  autoCollapseOutline: boolean
	showRibbonOnExplorer: boolean
  showRibbonOnOutline: boolean
	autoCollapseOffsetTop: number
}

const DEFAULT_SETTINGS: CollapsePluginSettings = {
	autoCollapseExplorer: true,
	autoCollapseOutline: true,
	showRibbonOnExplorer: true,
	showRibbonOnOutline: true,
	autoCollapseOffsetTop: 50,
}

type ins<T extends { [k: string]: abstract new (...args: unknown[]) => unknown }> = {
  [P in keyof T]: InstanceType<T[P]>
}
// app.plugins.plugins['obsidian-collapse']
export default class CollapsePlugin extends Plugin {
	settings: CollapsePluginSettings
  providers: ins<typeof providers>

	protected activeMarkdownView: MarkdownView | null = null

	private frameCallbacks: (() => void)[] = []

	private startedFraming = false

	private enabledFraming = false

	onFraming(cb: () => void) {
		this.frameCallbacks.push(cb)
		this.toggleFraming(true)
	}

	toggleFraming(enabled?: boolean) {
		this.enabledFraming = enabled === undefined ? !this.enabledFraming : enabled
		if (this.enabledFraming) this.framing()
	}

	private framing() {
		if (this.enabledFraming && !this.startedFraming) {
			this.startedFraming = true
			window.requestAnimationFrame(() => {
				this.frameCallbacks.forEach(cb => {
					try { cb() } catch(e) {
						console.error(e)
					}
				})
				this.startedFraming = false
				this.framing()
			})
		}
	}

	async onload() {
		await this.loadSettings()

    // load providers
    this.providers = Object.fromEntries(Object.entries(providers).map(([name, providerCls]) => {
			const provider = new providerCls(this)
			// mount commands
			provider.mountCommand()
      return [name, provider]
    }))

		this.addSettingTab(new SettingTab(this.app, this))

		new Notice(t('notice.loadPlugin'), 1000)
	}

	onunload() {
		this.toggleFraming(false)
		new Notice(t('notice.unloadPlugin'), 1000)
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData())
	}

	async saveSettings() {
		await this.saveData(this.settings)
	}
}
