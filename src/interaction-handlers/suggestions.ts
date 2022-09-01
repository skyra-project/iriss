import type { IntegerString } from '#lib/common/types';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { has } from '#lib/utilities/command-permissions';
import { Id, makeCustomId, Status, type Get, type Values } from '#lib/utilities/id-creator';
import { ChannelId } from '#lib/utilities/rest';
import { useArchive, useThread } from '#lib/utilities/suggestion-utilities';
import { channelMention } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { Result } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedUserLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { ComponentType, MessageFlags, TextInputStyle, type APIMessage } from 'discord-api-types/v10';

type IdParserResult = Values<Get<Id.Suggestions>>;

export class Handler extends InteractionHandler {
	public async run(interaction: Interaction, [action, idString, status]: IdParserResult) {
		const guildId = BigInt(interaction.guild_id!);
		const settings = await this.container.prisma.guild.findUnique({ where: { id: guildId } });

		const canRun = await has(interaction, 'resolve');
		if (!canRun) {
			const content = resolveUserKey(interaction, LanguageKeys.InteractionHandlers.Suggestions.MissingResolvePermissions);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		if (action === 'archive') return this.handleArchive(interaction as InteractionHandler.ButtonInteraction, settings!, Number(idString));
		if (action === 'thread') return this.handleThread(interaction as InteractionHandler.ButtonInteraction, idString);
		if (action === 'resolve') {
			status ??= this.getResolveSelectMenuValue(interaction as InteractionHandler.SelectMenuInteraction);
			return this.handleResolve(interaction, idString, status);
		}
		throw new TypeError('Unreachable');
	}

	private async handleArchive(interaction: InteractionHandler.ButtonInteraction, settings: Guild, id: number) {
		const t = getSupportedUserLanguageT(interaction);

		const result = await useArchive(interaction, { settings });
		if (result.isErr()) {
			const content = t(result.unwrapErr());
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		await this.container.prisma.suggestion.update({
			where: { id_guildId: { id, guildId: settings.id } },
			data: { archivedAt: new Date() },
			select: null
		});

		const header = t(LanguageKeys.InteractionHandlers.Suggestions.ArchiveSuccess);
		const value = result.unwrap();
		const warnings = value.errors.length === 0 ? '' : `\n\n- ${value.errors.map((error) => t(error)).join('\n- ')}`;
		const content = header + warnings;
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private handleResolve(interaction: Interaction, id: IntegerString, status: Status) {
		const t = getSupportedUserLanguageT(interaction);
		const title = t(LanguageKeys.InteractionHandlers.Suggestions.ModalTitle, { id });
		const information = this.getResolveModalInformation(status);
		return interaction.showModal({
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

	private getResolveSelectMenuValue(interaction: InteractionHandler.SelectMenuInteraction): Status {
		const [status] = interaction.values as [Status];
		return status;
	}

	private async handleThread(interaction: InteractionHandler.ButtonInteraction, idString: string) {
		const threadResult = await useThread(interaction, idString);
		if (threadResult.isErr()) {
			const content = resolveUserKey(interaction, threadResult.unwrapErr());
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		type MessageComponent = NonNullable<APIMessage['components']>[number];

		const components: MessageComponent[] = [
			{ type: ComponentType.ActionRow, components: interaction.message.components![0].components.slice(1) },
			...interaction.message.components!.slice(1)
		];

		const patchResult = await Result.fromAsync(ChannelId.MessageId.patch(interaction.channel_id, interaction.message.id, { components }));

		const t = getSupportedUserLanguageT(interaction);
		const key = patchResult.match({
			ok: () => LanguageKeys.InteractionHandlers.Suggestions.ThreadMessageUpdateSuccess,
			err: () => LanguageKeys.InteractionHandlers.Suggestions.ThreadMessageUpdateFailure
		});

		const thread = threadResult.unwrap();
		const header = t(key, { channel: channelMention(thread.thread.id) });
		const details = thread.memberAddResult.match({
			ok: () => '',
			err: (error) => `\n${t(error)}`
		});

		const content = header + details;
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}
}

type Interaction = InteractionHandler.ButtonInteraction | InteractionHandler.SelectMenuInteraction;
