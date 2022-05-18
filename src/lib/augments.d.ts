import type { IntegerString } from '@skyra/env-utilities';
import type { PrismaClient } from '@prisma/client';

declare module '@skyra/env-utilities' {
	interface Env {
		CLIENT_VERSION: string;

		DISCORD_CLIENT_ID: string;
		DISCORD_TOKEN: string;
		DISCORD_PUBLIC_KEY: string;

		HTTP_ADDRESS: string;
		HTTP_PORT: IntegerString;

		REGISTRY_GUILD_ID: string;
	}
}

declare module '@sapphire/pieces' {
	interface Container {
		prisma: PrismaClient;
	}
}
