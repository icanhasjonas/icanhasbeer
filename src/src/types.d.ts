type YesNo = 'Ja' | 'Nej'

interface Day {
	'arbetsfri dag': YesNo
	datum: string
	helgdag: string
	veckodag: string
	'röd day': YesNo
	namnsdag: string[]
}

interface DrygDagarResponse {
	dagar: { [datum: string]: Day }
}
