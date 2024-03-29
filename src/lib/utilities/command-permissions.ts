import { TempCollection } from '#lib/structures/TempCollection';
import { has as hasPermissions } from '#lib/utilities/permissions';
import { ErrorCodes, fromDiscord } from '#lib/utilities/result-utilities';
import { envIsDefined, envParseString } from '@skyra/env-utilities';
import { container, type Interactions } from '@skyra/http-framework';
import {
	ApplicationCommandPermissionType,
	PermissionFlagsBits,
	type APIApplicationCommand,
	type APIApplicationCommandPermission,
	type RESTGetAPIApplicationCommandsResult,
	type RESTGetAPIGuildRolesResult
} from 'discord-api-types/v10';

let commands: RESTGetAPIApplicationCommandsResult;

export async function getRegisteredCommands() {
	commands ??= await (envIsDefined('REGISTRY_GUILD_ID')
		? container.api.applicationCommands.getGuildCommands(applicationId, envParseString('REGISTRY_GUILD_ID'))
		: container.api.applicationCommands.getGlobalCommands(applicationId));

	return commands;
}

export async function getRegisteredCommand(name: string) {
	const commands = await getRegisteredCommands();
	const command = commands.find((command) => command.name === name);
	if (command) return command;

	throw new TypeError(`Found no command under the name of '${name}'`);
}

export async function has(interaction: Interactions.Any, commandName: string) {
	// Unreachable, function is used against guild-only commands:
	if (!interaction.guild_id) return false;

	const member = interaction.member!;

	if (hasPermissions(member.permissions, PermissionFlagsBits.Administrator)) return true;

	const { command, permissions } = await get(interaction.guild_id, commandName);
	if (permissions.length === 0) {
		if (!command.default_member_permissions) return false;
		return hasPermissions(member.permissions, BigInt(command.default_member_permissions));
	}

	return hasUser(interaction, permissions) ?? hasRole(interaction, permissions);
}

function hasUser(interaction: Interactions.Any, permissions: APIApplicationCommandPermission[]) {
	const { id } = interaction.user;
	const entry = permissions.find((permission) => permission.type === ApplicationCommandPermissionType.User && permission.id === id);

	return entry ? entry.permission : null;
}

function hasRole(interaction: Interactions.Any, permissions: APIApplicationCommandPermission[]) {
	const roles = new Set(interaction.member!.roles).add(interaction.guild_id!);
	const grants: string[] = [];
	const denies: string[] = [];
	for (const permission of permissions) {
		if (permission.type !== ApplicationCommandPermissionType.Role) continue;
		if (!roles.has(permission.id)) continue;

		(permission.permission ? grants : denies).push(permission.id);
	}

	// If has no permission grants, return false:
	if (grants.length === 0) return false;
	// If has grants, but no denies, return true:
	if (denies.length === 0) return true;
	// If there is only one deny, and it's the @everyone role, the grants will be higher, therefore return true:
	if (denies.length === 1 && denies[0] === interaction.guild_id!) return true;
	// Otherwise do it the expensive route and check hierarchy:
	return determineHasRole(interaction, grants, denies);
}

const roleCache = new TempCollection<string, RESTGetAPIGuildRolesResult>(30_000, 5_000);
async function determineHasRole(interaction: Interactions.Any, grants: readonly string[], denies: readonly string[]) {
	const guildId = interaction.guild_id!;
	const roles = await roleCache.ensureAsync(guildId, (id) => container.api.guilds.getRoles(id));

	const owned = roles.filter((role) => grants.includes(role.id) || denies.includes(role.id));
	const highest = owned.reduce((highest, role) => (role.position > highest.position ? role : highest));
	return grants.includes(highest.id);
}

const applicationId = envParseString('DISCORD_CLIENT_ID');
const commandPermissionsCache = new TempCollection<string, APIApplicationCommandPermission[]>(30_000, 5_000);
export async function get(guildId: string, commandName: string) {
	const command = await getRegisteredCommand(commandName);
	const permissions = await commandPermissionsCache.ensureAsync(`${guildId}.${command.id}`, () => makeCall(guildId, command));
	return { command, permissions };
}

async function makeCall(guildId: string, command: APIApplicationCommand): Promise<APIApplicationCommandPermission[]> {
	const result = await fromDiscord(container.api.applicationCommands.getGuildCommandPermissions(applicationId, guildId, command.id), {
		ok: [ErrorCodes.UnknownApplicationCommandPermissions]
	});

	return result.unwrap().match({
		some: (value) => value.permissions,
		none: () => []
	});
}
