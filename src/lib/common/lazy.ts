export function lazy<T>(cb: () => T) {
	let defaultValue: T;

	return () => (defaultValue ??= cb());
}
