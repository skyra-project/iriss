export function ensure<T>(value: T | null | undefined): T {
	if (value === undefined || value === null) throw new TypeError('Expected value to be defined');
	return value;
}
