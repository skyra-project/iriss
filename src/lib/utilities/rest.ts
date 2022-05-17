import { container } from '@skyra/http-framework';
import {
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
