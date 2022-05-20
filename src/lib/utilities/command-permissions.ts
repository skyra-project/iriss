import { has as hasPermissions } from '#lib/utilities/permissions';
import { ApplicationId } from '#lib/utilities/rest';
import { ErrorCodes, fromDiscord } from '#lib/utilities/result-utilities';
import { envIsDefined, envParseString } from '@skyra/env-utilities';
import { APIApplicationCommand, APIInteraction, PermissionFlagsBits } from 'discord-api-types/v10';

let commands: ApplicationId.Commands.get.Result;

export async function has(interaction: APIInteraction, commandName: string) {
	// Unreachable, function is used against guild-only commands:
	if (!interaction.guild_id) return false;

	if (hasPermissions(interaction.member!.permissions, PermissionFlagsBits.Administrator)) return true;

	const { command, permissions } = await get(interaction.guild_id, commandName);
	if (permissions.length === 0) {
		if (!command.default_member_permissions) return false;
		return hasPermissions(interaction.member!.permissions, BigInt(command.default_member_permissions));
	}

	// TODO: Handle permissions carefully
	console.log(permissions);
	return true;
}

export async function get(guildId: string, commandName: string) {
	commands ??= await (envIsDefined('REGISTRY_GUILD_ID')
		? ApplicationId.GuildId.Commands.get(envParseString('REGISTRY_GUILD_ID'))
		: ApplicationId.Commands.get());

	const command = commands.find((command) => command.name === commandName);
	if (!command) throw new TypeError(`Found no command under the name of '${commandName}'`);

	// TODO: Cache for 30 seconds, so we don't spam this endpoint
	return { command, permissions: await makeCall(guildId, command) };
}

async function makeCall(guildId: string, command: APIApplicationCommand) {
	const result = await fromDiscord(
		ApplicationId.GuildId.CommandId.Permissions.get(guildId, command.id),
		ErrorCodes.UnknownApplicationCommandPermissions
	);

	if (result.success) return result.value?.permissions ?? [];
	throw result.error;
}
