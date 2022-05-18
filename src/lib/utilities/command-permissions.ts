import { Applications } from './rest';

let commands: Applications.Id.Commands.get.Result;

export async function get(guildId: string, commandName: string) {
	commands ??= await Applications.Id.Commands.get();

	const entry = commands.find((command) => command.name === commandName);
	if (!entry) throw new TypeError(`Found no command under the name of '${commandName}'`);

	// TODO: Cache for 30 seconds, so we don't spam this endpoint
	return Applications.Id.Guilds.Id.Commands.Id.Permissions.get(guildId, entry.id);
}
