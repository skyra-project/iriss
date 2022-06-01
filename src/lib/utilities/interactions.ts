import { ensure } from '#lib/utilities/assertions';
import type { APIInteraction, APIMessage, APIPingInteraction } from 'discord-api-types/v10';

export type Interaction = Exclude<APIInteraction, APIPingInteraction>;

export function getUser(interaction: Interaction) {
	return ensure(interaction.member?.user ?? interaction.user);
}

export function getGuildId(interaction: Interaction, message?: APIMessage): string {
	return message?.guild_id ?? interaction.message?.guild_id ?? ensure(interaction.guild_id);
}
