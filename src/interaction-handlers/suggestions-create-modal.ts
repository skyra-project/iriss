import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { createSuggestion, getUserData } from '#lib/utilities/suggestion-utilities';
import { cutText, isNullishOrEmpty } from '@sapphire/utilities';
import { InteractionHandler } from '@skyra/http-framework';
import { resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';

export class Handler extends InteractionHandler {
	public run(interaction: InteractionHandler.ModalInteraction) {
		const input = interaction.data.components[0].components[0].value;
		if (isNullishOrEmpty(input)) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.RePostNoContent);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		return createSuggestion(interaction, getUserData(interaction.user), cutText(input, 2048));
	}
}
