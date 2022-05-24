import { container } from '@skyra/http-framework';
import { blue, Color, gray, magenta, red, yellow } from 'colorette';
import { format, inspect } from 'util';

function time() {
	const date = new Date();
	const YYYY = String(date.getFullYear());
	const MM = String(date.getMonth() + 1).padStart(2, '0');
	const DD = String(date.getDate()).padStart(2, '0');

	const hh = String(date.getHours()).padStart(2, '0');
	const mm = String(date.getMinutes()).padStart(2, '0');
	const ss = String(date.getSeconds()).padStart(2, '0');

	return `${YYYY}/${MM}/${DD}-${hh}:${mm}:${ss}`;
}

type Method = 'debug' | 'error' | 'info' | 'trace' | 'warn';

function log(color: Color, name: string, method: Method, value: unknown, args: readonly any[]) {
	const header = `[${color(time())}] ${color(name)} (${process.pid}): `;
	const formatted = typeof value === 'string' ? format(value, ...args) : inspect(value, { colors: true });

	return console[method](
		formatted
			.split('\n')
			.map((line) => header + line)
			.join('\n')
	);
}

function make(color: Color, name: string, method: Method) {
	return (value: unknown, ...args: readonly any[]) => log(color, name, method, value, args);
}

const logger = {
	trace: make(gray, 'TRACE', 'trace'),
	debug: make(magenta, 'DEBUG', 'debug'),
	info: make(blue, 'INFO', 'info'),
	warn: make(yellow, 'WARN', 'warn'),
	error: make(red, 'ERROR', 'error')
} as const;
container.logger = logger;

declare module '@sapphire/pieces' {
	interface Container {
		logger: typeof logger;
	}
}
