import type { APIMessage } from 'discord-api-types/v10';

export function url(message: APIMessage) {
	return `https://discord.com/channels/${message.guild_id ?? '@me'}/${message.channel_id}/${message.id}`;
}
