import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { Action, getColor, type Get, type Id, type Values } from '#lib/utilities/id-creator';
import { url } from '#lib/utilities/message';
import { ChannelId } from '#lib/utilities/rest';
import { hyperlink, inlineCode, time } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { fromAsync } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags, type APIModalSubmitGuildInteraction } from 'discord-api-types/v10';

type IdParserResult = Values<Get<Id.SuggestionsModal>>;

export class Handler extends InteractionHandler {
	public async run(interaction: APIModalSubmitGuildInteraction, [action, idString]: IdParserResult): InteractionHandler.AsyncResponse {
		const guildId = BigInt(interaction.guild_id!);
		const settings = (await this.container.prisma.guild.findUnique({ where: { id: guildId } }))!;

		const input = this.sanitizeInput(interaction.data.components![0].components[0].value);
		const body =
			interaction.message!.embeds.length === 0
				? this.handleContent(interaction, settings, action, input)
				: this.handleEmbed(interaction, settings, action, input);
		await ChannelId.MessageId.patch(interaction.channel_id!, interaction.message!.id, body);

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
		action: Action,
		input: string
	): ChannelId.MessageId.patch.Body {
		const header = resolveKey(interaction, this.makeHeader(action), {
			tag: `${interaction.member.user.username}#${interaction.member.user.discriminator}`,
			time: time()
		});
		const { content } = interaction.message!;
		if (settings.addUpdateHistory) {
			return { content: `${content}\u200B\n\n${header}${input}` };
		}

		const index = content.indexOf('\u200B\n\n');
		return { content: `${index === -1 ? content : content.slice(0, index)}\u200B\n\n${header}${input}` };
	}

	private handleEmbed(interaction: APIModalSubmitGuildInteraction, settings: Guild, action: Action, input: string): ChannelId.MessageId.patch.Body {
		const header = resolveKey(interaction, this.makeHeader(action), {
			tag: `${interaction.member.user.username}#${interaction.member.user.discriminator}`,
			time: time()
		});
		const [embed] = interaction.message!.embeds;
		const fields = settings.addUpdateHistory ? [...embed.fields!, { name: header, value: input }] : [{ name: header, value: input }];
		const color = getColor(action);

		return { embeds: [{ ...embed, fields, color }] };
	}

	private makeHeader(action: Action) {
		switch (action) {
			case Action.Accept:
				return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentAccepted;
			case Action.Consider:
				return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentConsidered;
			case Action.Deny:
				return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentDenied;
		}
	}

	private sanitizeInput(input: string) {
		// TODO: Resolve suggestion links in input
		return input.replaceAll('\u200B', '');
	}
}
