import { Logger, enable } from './logger'

// initial.less is extracted and included in <head>
import '../css/initial.less'
import './app'

console.log(`${PACKAGE_NAME} v${BUILD_VERSION}`)

// global debug
window['beer'] = {
	build: { version: BUILD_VERSION },
	debug: {
		enable() {
			enable('app:*')
		},
	},
}
