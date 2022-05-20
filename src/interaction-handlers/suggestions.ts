import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { has } from '#lib/utilities/command-permissions';
import { Id, makeCustomId, Status, type Get, type IntegerString, type Values } from '#lib/utilities/id-creator';
import { ChannelId } from '#lib/utilities/rest';
import { useArchive, useThread } from '#lib/utilities/suggestion-utilities';
import { channelMention } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { fromAsync } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedUserLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import {
	ComponentType,
	MessageFlags,
	TextInputStyle,
	type APIMessage,
	type APIMessageComponentInteraction,
	type APIMessageComponentSelectMenuInteraction
} from 'discord-api-types/v10';

type IdParserResult = Values<Get<Id.Suggestions>>;

export class Handler extends InteractionHandler {
	public async run(interaction: APIMessageComponentInteraction, [action, idString, status]: IdParserResult): InteractionHandler.AsyncResponse {
		const guildId = BigInt(interaction.guild_id!);
		const settings = await this.container.prisma.guild.findUnique({ where: { id: guildId } });

		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.InteractionHandlers.Suggestions.NotConfigured);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const canRun = await has(interaction, 'resolve');
		if (!canRun) {
			const content = resolveUserKey(interaction, LanguageKeys.InteractionHandlers.Suggestions.MissingResolvePermissions);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		if (action === 'archive') return this.handleArchive(interaction, settings, Number(idString));
		if (action === 'thread') return this.handleThread(interaction, idString);
		if (action === 'resolve') {
			status ??= this.getResolveSelectMenuValue(interaction as APIMessageComponentSelectMenuInteraction);
			return this.handleResolve(interaction as APIMessageComponentSelectMenuInteraction, idString, status);
		}
		throw new TypeError('Unreachable');
	}

	private async handleArchive(interaction: APIMessageComponentInteraction, settings: Guild, id: number): InteractionHandler.AsyncResponse {
		const t = getSupportedUserLanguageT(interaction);

		const result = await useArchive(interaction, { settings });
		if (!result.success) {
			const content = t(result.error);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		await this.container.prisma.suggestion.update({
			where: { id_guildId: { id, guildId: settings.id } },
			data: { archivedAt: new Date() },
			select: null
		});

		const header = t(LanguageKeys.InteractionHandlers.Suggestions.ArchiveSuccess);
		const warnings = result.value.errors.length === 0 ? '' : `\n\n- ${result.value.errors.map((error) => t(error)).join('\n- ')}`;
		const content = header + warnings;
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private handleResolve(interaction: APIMessageComponentInteraction, id: IntegerString, status: Status): InteractionHandler.Response {
		const t = getSupportedUserLanguageT(interaction);
		const title = t(LanguageKeys.InteractionHandlers.Suggestions.ModalTitle, { id });
		const information = this.getResolveModalInformation(status);
		return this.modal({
			custom_id: makeCustomId(Id.SuggestionsModal, status, id),
			title,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							custom_id: Id.SuggestionsModalField,
							type: ComponentType.TextInput,
							style: TextInputStyle.Paragraph,
							label: t(information.label),
							placeholder: t(information.placeholder),
							max_length: 1024
						}
					]
				}
			]
		});
	}

	private getResolveModalInformation(status: Status) {
		switch (status) {
			case Status.Accept: {
				return {
					label: LanguageKeys.InteractionHandlers.Suggestions.ModalFieldLabelAccept,
					placeholder: LanguageKeys.InteractionHandlers.Suggestions.ModalFieldPlaceholderAccept
				};
			}
			case Status.Consider: {
				return {
					label: LanguageKeys.InteractionHandlers.Suggestions.ModalFieldLabelConsider,
					placeholder: LanguageKeys.InteractionHandlers.Suggestions.ModalFieldPlaceholderConsider
				};
			}
			case Status.Deny: {
				return {
					label: LanguageKeys.InteractionHandlers.Suggestions.ModalFieldLabelDeny,
					placeholder: LanguageKeys.InteractionHandlers.Suggestions.ModalFieldPlaceholderDeny
				};
			}
		}
	}

	private getResolveSelectMenuValue(interaction: APIMessageComponentSelectMenuInteraction): Status {
		const [status] = interaction.data.values as [Status];
		return status;
	}

	private async handleThread(interaction: APIMessageComponentInteraction, idString: string): InteractionHandler.AsyncResponse {
		const threadResult = await useThread(interaction, idString);
		if (!threadResult.success) {
			const content = resolveUserKey(interaction, threadResult.error);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		type MessageComponent = NonNullable<APIMessage['components']>[number];

		const components: MessageComponent[] = [
			{ type: ComponentType.ActionRow, components: interaction.message.components![0].components.slice(1) },
			...interaction.message.components!.slice(1)
		];

		const patchResult = await fromAsync(ChannelId.MessageId.patch(interaction.channel_id, interaction.message.id, { components }));

		const key = patchResult.success
			? LanguageKeys.InteractionHandlers.Suggestions.ThreadMessageUpdateSuccess
			: LanguageKeys.InteractionHandlers.Suggestions.ThreadMessageUpdateFailure;
		const responseContent = resolveUserKey(interaction, key, { channel: channelMention(threadResult.value.thread.id) });
		const warningContent = threadResult.value.memberAddResult.success
			? ''
			: `\n${resolveUserKey(interaction, LanguageKeys.InteractionHandlers.Suggestions.ThreadMemberAddFailure)}`;

		const content = responseContent + warningContent;
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}
}
