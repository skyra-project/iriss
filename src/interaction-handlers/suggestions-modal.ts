import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import type { Get, Id, Values } from '#lib/utilities/id-creator';
import { url } from '#lib/utilities/message';
import { useMessageUpdate } from '#lib/utilities/suggestion-utilities';
import { hyperlink, inlineCode } from '@discordjs/builders';
import { Result } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';

type IdParserResult = Values<Get<Id.SuggestionsModal>>;

export class Handler extends InteractionHandler {
	public async run(interaction: InteractionHandler.ModalInteraction, [action, idString]: IdParserResult) {
		const body = await useMessageUpdate(interaction, interaction.message!, action, interaction.data.components![0].components[0].value);
		await interaction.update(body);

		const guildId = BigInt(interaction.guild_id!);
		const result = await Result.fromAsync(
			this.container.prisma.suggestion.update({
				where: { id_guildId: { guildId, id: Number(idString) } },
				data: { repliedAt: new Date() },
				select: null
			})
		);

		const id = hyperlink(inlineCode(`#${idString}`), url(guildId, interaction.message!.channel_id, interaction.message!.id));
		const content = resolveUserKey(
			interaction,
			result.match({
				ok: () => LanguageKeys.InteractionHandlers.SuggestionsModals.UpdateSuccess,
				err: () => LanguageKeys.InteractionHandlers.SuggestionsModals.UpdateFailure
			}),
			{ id }
		);

		return interaction.followup({ content, flags: MessageFlags.Ephemeral });
	}
}
