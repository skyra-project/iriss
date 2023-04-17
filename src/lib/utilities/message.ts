import type { Snowflake } from '#lib/types/discord.d.ts';

export function url(guildId: Snowflake | '@me', channelId: Snowflake, messageId: Snowflake) {
	return `https://discord.com/channels/${guildId.toString()}/${channelId.toString()}/${messageId.toString()}` as const;
}
