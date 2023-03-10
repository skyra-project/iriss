import { envParseInteger, envParseString } from '@skyra/env-utilities';
import { container } from '@skyra/http-framework';
import Redis from 'ioredis';

export function run() {
	container.redis = new Redis({
		port: envParseInteger('REDIS_PORT'),
		password: envParseString('REDIS_PASSWORD'),
		host: envParseString('REDIS_HOST'),
		db: envParseInteger('REDIS_DB')
	});
}

declare module '@sapphire/pieces' {
	interface Container {
		redis: Redis;
	}
}
