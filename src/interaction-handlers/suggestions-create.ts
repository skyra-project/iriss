import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { ActionRowBuilder, TextInputBuilder } from '@discordjs/builders';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedUserLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags, TextInputStyle } from 'discord-api-types/v10';

export class UserHandler extends InteractionHandler {
	public async run(interaction: InteractionHandler.ButtonInteraction) {
		const settings = await this.container.prisma.guild.findFirst({ where: { id: BigInt(interaction.guildId!) }, select: { channel: true } });
		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewNotConfigured);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const t = getSupportedUserLanguageT(interaction);
		const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
			new TextInputBuilder()
				.setCustomId('content')
				.setStyle(TextInputStyle.Paragraph)
				.setLabel(t(LanguageKeys.InteractionHandlers.SuggestionsCreate.ModalLabel))
				.setMaxLength(2048)
				.setRequired(true)
		);
		return interaction.showModal({
			custom_id: 'suggestions-create-modal',
			title: t(LanguageKeys.InteractionHandlers.SuggestionsCreate.ModalTitle),
			components: [row.toJSON()]
		});
	}
}
