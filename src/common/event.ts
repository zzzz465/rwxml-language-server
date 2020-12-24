/* eslint-disable @typescript-eslint/ban-types */

export interface EventHandler<T> {
	(params: T): void
}


export interface iEvent<T> {
	subscribe(key: Object, handler: EventHandler<T>): void
	unsubscribe(key: object): void
}

export class Event<T> implements iEvent<T> {
	private events: Map<object, EventHandler<T>>
	constructor() {
		this.events = new Map()
	}

	/**
	 * subscribe event  
	 * note that eventHandler should not throw any errors, or the event will not be continued
	 * @param key a key for the eventhandler which can be distinct by ===(ref) check
	 * @param handler a handler for the event
	 */
	subscribe(key: object, handler: EventHandler<T>): boolean {
		if (!this.events.has(key)) {
			this.events.set(key, handler)
			return true
		} else {
			return false
		}
	}

	/**
	 * unsubscribe event
	 * @param key a key which has been used for subscribe
	 * @returns whether the key - handler pair exists in the event map
	 */
	unsubscribe(key: object): boolean {
		return this.events.delete(key)
	}

	/**
	 * invoke event
	 * @param params 
	 */
	Invoke(params: T): void {
		for (const handler of this.events.values()) {
			handler(params)
		}
	}
}