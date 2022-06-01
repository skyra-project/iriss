import { envIsDefined, envParseString } from '@skyra/env-utilities';
import { Registry } from '@skyra/http-framework';

export async function registerCommands() {
	const registry = new Registry({});

	if (envIsDefined('REGISTRY_GUILD_ID')) {
		await registry.registerAllCommandsInGuild(envParseString('REGISTRY_GUILD_ID'));
	} else {
		await registry.registerGlobalCommands();
	}
}
