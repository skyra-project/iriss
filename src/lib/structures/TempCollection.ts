import { Collection } from '@discordjs/collection';
import { clearInterval, setInterval } from 'node:timers';

export class TempCollection<K, V> {
	public readonly maxAge: number;
	public readonly sweepInterval: number;
	private timer: NodeJS.Timer | null = null;
	private readonly entries = new Collection<K, { expiresAt: number; value: V }>();

	public constructor(maxAge: number, sweepInterval: number) {
		this.maxAge = maxAge;
		this.sweepInterval = sweepInterval;
	}

	public get empty(): boolean {
		return this.entries.size === 0;
	}

	public get(key: K): V | undefined {
		const entry = this.entries.get(key);

		// If the entry exists...
		if (entry) {
			// ... and has not expired, return its value:
			if (entry.expiresAt > Date.now()) return entry.value;

			// Otherwise delete it and fallback to returning undefined:
			this.delete(key);
		}

		return undefined;
	}

	public ensure(key: K, cb: (key: K) => V): V {
		const existing = this.get(key);
		if (existing) return existing;

		return this.set(key, cb(key));
	}

	public async ensureAsync(key: K, cb: (key: K) => PromiseLike<V>): Promise<V> {
		const existing = this.get(key);
		if (existing) return existing;

		return this.set(key, await cb(key));
	}

	public set(key: K, value: V) {
		this.entries.set(key, { expiresAt: Date.now(), value });
		this.start();
		return value;
	}

	public delete(key: K) {
		if (this.entries.delete(key) && this.empty) {
			this.stop();
			return true;
		}

		return false;
	}

	private start() {
		if (this.timer) return false;

		this.timer = setInterval(() => {
			const now = Date.now();
			this.entries.sweep((value) => value.expiresAt <= now);

			if (this.empty) this.stop();
		}, this.sweepInterval);
		return true;
	}

	private stop() {
		if (!this.timer) return false;

		clearInterval(this.timer);
		this.timer = null;
		return true;
	}
}
