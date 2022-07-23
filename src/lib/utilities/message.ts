import type { Snowflake } from './rest';

// export function url(message: APIMessage): ReturnType<typeof urlFromParams>;
// export function url(guildId: Snowflake | '@me', channelId: Snowflake, messageId: Snowflake): ReturnType<typeof urlFromParams>;
export function url(guildId: Snowflake | '@me', channelId: Snowflake, messageId: Snowflake) {
	return `https://discord.com/channels/${guildId.toString()}/${channelId.toString()}/${messageId.toString()}` as const;
}

// function urlFromPayload(message: APIMessage) {
// 	return urlFromParams(message?.guild_id ?? '@me', message.channel_id, message.id);
// }

// function urlFromParams(guildId: Snowflake | '@me', channelId: Snowflake, messageId: Snowflake) {
// 	return `https://discord.com/channels/${guildId.toString()}/${channelId.toString()}/${messageId.toString()}` as const;
// }
