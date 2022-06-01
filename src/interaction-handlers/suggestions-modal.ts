import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import type { Get, Id, Values } from '#lib/utilities/id-creator';
import { url } from '#lib/utilities/message';
import { useMessageUpdate } from '#lib/utilities/suggestion-utilities';
import { hyperlink, inlineCode } from '@discordjs/builders';
import { fromAsync } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags, type APIModalSubmitGuildInteraction } from 'discord-api-types/v10';

type IdParserResult = Values<Get<Id.SuggestionsModal>>;

export class Handler extends InteractionHandler {
	public async *run(interaction: APIModalSubmitGuildInteraction, [action, idString]: IdParserResult): InteractionHandler.GeneratorResponse {
		const body = await useMessageUpdate(interaction, interaction.message!, action, interaction.data.components![0].components[0].value);
		yield this.updateMessage(body);

		const guildId = BigInt(interaction.guild_id!);
		const result = await fromAsync(
			this.container.prisma.suggestion.update({
				where: { id_guildId: { guildId, id: Number(idString) } },
				data: { repliedAt: new Date() },
				select: null
			})
		);

		const id = hyperlink(inlineCode(`#${idString}`), url(interaction.message!));
		const content = resolveUserKey(
			interaction,
			result.success
				? LanguageKeys.InteractionHandlers.SuggestionsModals.UpdateSuccess
				: LanguageKeys.InteractionHandlers.SuggestionsModals.UpdateFailure,
			{ id }
		);
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}
}
