import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getColor, Status, type Get, type Id, type Values } from '#lib/utilities/id-creator';
import { url } from '#lib/utilities/message';
import { useEmbedContent, usePlainContent } from '#lib/utilities/suggestion-utilities';
import { bold, hyperlink, inlineCode, time } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { fromAsync } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags, type APIModalSubmitGuildInteraction } from 'discord-api-types/v10';

type IdParserResult = Values<Get<Id.SuggestionsModal>>;

export class Handler extends InteractionHandler {
	public async *run(interaction: APIModalSubmitGuildInteraction, [action, idString]: IdParserResult): InteractionHandler.GeneratorResponse {
		const guildId = BigInt(interaction.guild_id!);
		const settings = (await this.container.prisma.guild.findUnique({ where: { id: guildId } }))!;

		const body =
			interaction.message!.embeds.length === 0
				? this.handleContent(interaction, settings, action)
				: await this.handleEmbed(interaction, settings, action);
		yield this.updateMessage(body);

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

	private handleContent(
		interaction: APIModalSubmitGuildInteraction,
		settings: Guild,
		action: Status
	): InteractionHandler.UpdateMessageResponseOptions {
		const input = usePlainContent(interaction.data.components![0].components[0].value);
		const header = resolveKey(interaction, this.makeHeader(action), {
			tag: `${interaction.member.user.username}#${interaction.member.user.discriminator}`,
			time: time()
		});
		const formattedHeader = `\u200B\n\n${bold(header)}:\n`;
		const { content } = interaction.message!;
		if (settings.addUpdateHistory) {
			return { content: `${content}${formattedHeader}${input}` };
		}

		const index = content.indexOf('\u200B\n\n');
		return { content: `${index === -1 ? content : content.slice(0, index)}${formattedHeader}${input}` };
	}

	private async handleEmbed(
		interaction: APIModalSubmitGuildInteraction,
		settings: Guild,
		action: Status
	): Promise<InteractionHandler.UpdateMessageResponseOptions> {
		const input = await useEmbedContent(interaction.data.components![0].components[0].value, settings.id, settings.channel!);
		const header = resolveKey(interaction, this.makeHeader(action), {
			tag: `${interaction.member.user.username}#${interaction.member.user.discriminator}`,
			time: time()
		});
		const [embed] = interaction.message!.embeds;
		const fields = settings.addUpdateHistory ? [...embed.fields!, { name: header, value: input }] : [{ name: header, value: input }];
		const color = getColor(action);

		return { embeds: [{ ...embed, fields, color }] };
	}

	private makeHeader(action: Status) {
		switch (action) {
			case Status.Accept:
				return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentAccepted;
			case Status.Consider:
				return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentConsidered;
			case Status.Deny:
				return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentDenied;
		}
	}
}
