import { ensure } from '#lib/utilities/assertions';
import type { Interactions } from '@skyra/http-framework';
import type { APIMessage } from 'discord-api-types/v10';

export function getGuildId(interaction: Interactions.Any): string {
	return ensure(interaction.guild_id);
}

export function getMessage(interaction: Interactions.Any): APIMessage | null {
	return 'message' in interaction ? interaction.message ?? null : null;
}
