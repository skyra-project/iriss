import { run as redisRun } from '#lib/setup/redis';
import { setup as envRun } from '@skyra/env-utilities';
import { initializeSentry, setInvite, setRepository } from '@skyra/shared-http-pieces';

import '#lib/setup/logger';
import '#lib/setup/prisma';
import '@skyra/shared-http-pieces/register';

export function setup() {
	envRun(new URL('../../../src/.env', import.meta.url));

	setRepository('iriss');
	setInvite('948377113457745990', '326417868864');
	initializeSentry();

	redisRun();
}
