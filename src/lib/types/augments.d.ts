import type { IntegerString } from '@skyra/env-utilities';

declare module '@skyra/env-utilities' {
	interface Env {
		CLIENT_VERSION: string;

		DISCORD_CLIENT_ID: string;
		DISCORD_TOKEN: string;
		DISCORD_PUBLIC_KEY: string;

		REDIS_PORT: IntegerString;
		REDIS_PASSWORD: string;
		REDIS_HOST: string;
		REDIS_DB: IntegerString;

		HTTP_ADDRESS: string;
		HTTP_PORT: IntegerString;

		REGISTRY_GUILD_ID: string;
	}
}
