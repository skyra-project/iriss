import { ensure } from '#lib/utilities/assertions';
import type { APIInteraction, APIPingInteraction } from 'discord-api-types/v10';

export type Interaction = Exclude<APIInteraction, APIPingInteraction>;

export function getUser(interaction: Interaction) {
	return ensure(interaction.member?.user ?? interaction.user);
}

export function getGuildId(interaction: Interaction): string {
	return ensure(interaction.guild_id);
}
