import type { APIInteraction, APIPingInteraction } from 'discord-api-types/v10';

export type Interaction = Exclude<APIInteraction, APIPingInteraction>;

export function getUser(interaction: Interaction) {
	return (interaction.member?.user ?? interaction.user)!;
}
