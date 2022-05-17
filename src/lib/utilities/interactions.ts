import type { APIApplicationCommandInteraction } from 'discord-api-types/v10';

export function getUser(interaction: APIApplicationCommandInteraction) {
	return (interaction.member?.user ?? interaction.user)!;
}
