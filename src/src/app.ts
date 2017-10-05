import { Logger, enable } from './logger'
import moment from 'moment'

// import '../css/site.less'

const debug = Logger('app:main')

// global debug
window['beer'] = {
	build: { version: BUILD_VERSION },
	debug: {
		enable() {
			enable('app:*')
		},
	},
}

const datumFormat = 'YYYY-MM-DD'

type YesNo = 'Ja' | 'Nej'
interface Day {
	'arbetsfri dag': YesNo
	datum: string
	helgdag: string
	veckodag: string
	'röd day': YesNo
	namnsdag: string[]
}

interface Response {
	dagar: { [datum: string]: Day }
}

function isArbetsfri(x: Day) {
	return x['arbetsfri dag'] === 'Ja'
}

function findNext(days: { [datum: string]: Day }) {
	for (let i = 2; i < 10; i++) {
		const key = moment()
			.add(i, 'day')
			.format(datumFormat)
		const x = days[key]
		if (isArbetsfri(x)) {
			return x
		}
	}
}

function catchMeOutSide(data: Response) {
	debug('got some data from dryg', data)

	const headLine = document.getElementById('ted')
	const subLine = document.getElementById('pontus')

	const tomorrowFormatted = moment()
		.add(1, 'day')
		.format(datumFormat)

	const tomorrow = data.dagar[tomorrowFormatted]
	if (!tomorrow) {
		debug('Warning: No tomorrow found', tomorrowFormatted)
		return
	}

	if (isArbetsfri(tomorrow)) {
		debug('tomorrow is free')

		headLine.innerHTML = 'Idag kan du dricka Öl!'
		subLine.innerHTML = `För imorgon är det ${tomorrow.helgdag || tomorrow.veckodag}.<br />
							Så bjud ${tomorrow.namnsdag} på en öl eller två på sin namnsdag!<br />
							Förslag på ställen i Malmö hittar du <a href="http://www.välkommentillmalmö.se">här</a>`
	} else {
		debug('tomorrow is not free :-(')
		headLine.innerHTML = 'Ingen öl idag, tyvärr.'

		const today = moment()
		const firstNextFreeDay = findNext(data.dagar)
		if (firstNextFreeDay) {
			debug('found next free day', firstNextFreeDay)

			const diff = moment(firstNextFreeDay.datum).diff(today, 'days')
			const diffText = diff === 1 ? 'imorgon' : `om ${diff} dagar`
			subLine.innerHTML = `Men ${diffText} kan du supa loss. <br />Dagen efter är det nämligen ${firstNextFreeDay.helgdag ||
				firstNextFreeDay.veckodag}, och då är det <b>HELT OK</b> att vara bakfull.`
		}
	}
}

fetch(`https://api.dryg.net/dagar/v2/${moment().year()}`)
	.then(x => x.json())
	.then(catchMeOutSide)
