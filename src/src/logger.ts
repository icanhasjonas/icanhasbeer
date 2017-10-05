import * as Debug from 'debug'

export function Logger(namespace: string) {
	return Debug(namespace)
}

export function enable(namespace: string) {
	Debug.enable(namespace)
}
