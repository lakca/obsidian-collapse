import { App, PluginSettingTab, Setting } from 'obsidian'

import CollapsePlugin from './plugin'
import { t } from './util'

export default class SettingTab extends PluginSettingTab {
	plugin: CollapsePlugin

	constructor(app: App, plugin: CollapsePlugin) {
		super(app, plugin)
		this.plugin = plugin
	}

	display(): void {
		const {containerEl} = this

		containerEl.empty()

		containerEl.createEl('h2', {text: t('setting.title')})

		Object.keys(this.plugin.providers).forEach((name: keyof (typeof this.plugin.providers)) => {
			if (this.plugin.providers.hasOwnProperty(name)) {
				const provider = this.plugin.providers[name]
				provider.mountSettingTab(this)
			}
		})

			// .onChange((value: string) => {

			// .addText(text => text
			// 	.setPlaceholder('Enter your secret')
			// 	.setValue(this.plugin.settings.autoCollapseExplorer)
			// 	.onChange(async (value) => {
			// 		console.log('Secret: ' + value)
			// 		this.plugin.settings.autoCollapseExplorer = value
			// 		await this.plugin.saveSettings()
			// 	}))
	}
}
