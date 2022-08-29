import type { AnyInteraction } from '#lib/common/types';
import { ensure } from '#lib/utilities/assertions';
import type { APIInteraction, APIMessage, APIPingInteraction } from 'discord-api-types/v10';

export type Interaction = Exclude<APIInteraction, APIPingInteraction>;

export function getGuildId(interaction: AnyInteraction): string {
	return ensure(interaction.guild_id);
}

export function getMessage(interaction: AnyInteraction): APIMessage | null {
	return 'message' in interaction ? interaction.message : null;
}
