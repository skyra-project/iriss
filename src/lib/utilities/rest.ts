import { envParseString } from '@skyra/env-utilities';
import { container } from '@skyra/http-framework';
import {
	RESTGetAPIApplicationCommandPermissionsResult,
	RESTGetAPIApplicationCommandsResult,
	RESTPostAPIChannelThreadsJSONBody,
	RESTPostAPIChannelThreadsResult,
	Routes,
	type RESTGetAPIChannelMessageResult,
	type RESTPatchAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageJSONBody,
	type RESTPostAPIChannelMessageResult
} from 'discord-api-types/v10';

export type Snowflake = string | bigint;

export function getMessage(channelId: Snowflake, messageId: Snowflake): Promise<getMessage.Result> {
	return container.rest.get(Routes.channelMessage(channelId.toString(), messageId.toString())) as Promise<getMessage.Result>;
}

export namespace getMessage {
	export type Result = RESTGetAPIChannelMessageResult;
}

export function postMessage(channelId: Snowflake, body: postMessage.Body): Promise<postMessage.Result> {
	return container.rest.post(Routes.channelMessages(channelId.toString()), { body }) as Promise<postMessage.Result>;
}

export namespace postMessage {
	export type Body = RESTPostAPIChannelMessageJSONBody;
	export type Result = RESTPostAPIChannelMessageResult;
}

export function patchMessage(channelId: Snowflake, messageId: Snowflake, body: patchMessage.Body): Promise<patchMessage.Result> {
	return container.rest.patch(Routes.channelMessage(channelId.toString(), messageId.toString()), {
		body
	}) as Promise<patchMessage.Result>;
}

export namespace patchMessage {
	export type Body = RESTPatchAPIChannelMessageJSONBody;
	export type Result = RESTGetAPIChannelMessageResult;
}

export function postThread(channelId: Snowflake, messageId: Snowflake, body: postThread.Body): Promise<postThread.Result> {
	return container.rest.post(Routes.threads(channelId.toString(), messageId.toString()), { body }) as Promise<postThread.Result>;
}

export namespace postThread {
	export type Body = RESTPostAPIChannelThreadsJSONBody;
	export type Result = RESTPostAPIChannelThreadsResult;
}

export namespace Applications.Id {
	const applicationId = envParseString('DISCORD_CLIENT_ID');

	export namespace Commands {
		export function get(): Promise<get.Result> {
			const route = Routes.applicationCommands(applicationId);
			return container.rest.get(route) as Promise<get.Result>;
		}

		export namespace get {
			export type Result = RESTGetAPIApplicationCommandsResult;
		}
	}

	export namespace Guilds.Id.Commands.Id.Permissions {
		export function get(guildId: Snowflake, commandId: Snowflake): Promise<get.Result> {
			const route = Routes.applicationCommandPermissions(applicationId, guildId.toString(), commandId.toString());
			return container.rest.get(route) as Promise<get.Result>;
		}

		export namespace get {
			export type Result = RESTGetAPIApplicationCommandPermissionsResult;
		}
	}
}
