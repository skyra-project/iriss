import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { has } from '#lib/utilities/command-permissions';
import { Action, Id, makeCustomId, type Get, type IntegerString, type Values } from '#lib/utilities/id-creator';
import { ChannelId } from '#lib/utilities/rest';
import { channelMention } from '@discordjs/builders';
import { fromAsync } from '@sapphire/result';
import { InteractionHandler } from '@skyra/http-framework';
import { getSupportedUserLanguageName, getT, resolveUserKey } from '@skyra/http-framework-i18n';
import {
	ChannelType,
	ComponentType,
	MessageFlags,
	TextInputStyle,
	type APIMessage,
	type APIMessageComponentInteraction,
	type APIMessageComponentSelectMenuInteraction
} from 'discord-api-types/v10';

type IdParserResult = Values<Get<Id.Suggestions>>;

export class Handler extends InteractionHandler {
	public async run(interaction: APIMessageComponentInteraction, [action, idString]: IdParserResult): InteractionHandler.AsyncResponse {
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

		if (action === 'archive') return this.handleArchive(interaction, guildId, Number(idString));
		if (action === 'resolve') return this.handleResolve(interaction as APIMessageComponentSelectMenuInteraction, idString);
		if (action === 'thread') return this.handleThread(interaction, idString);
		throw new TypeError('Unreachable');
	}

	private async handleArchive(interaction: APIMessageComponentInteraction, guildId: bigint, id: number): InteractionHandler.AsyncResponse {
		const result = await fromAsync(ChannelId.MessageId.patch(interaction.channel_id, interaction.message.id, { components: [] }));
		if (!result.success) {
			const content = resolveUserKey(interaction, LanguageKeys.InteractionHandlers.Suggestions.ArchiveFailure);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		// TODO: Archive thread if any

		await this.container.prisma.suggestion.update({
			where: { id_guildId: { id, guildId } },
			data: { archivedAt: new Date() },
			select: null
		});

		const content = resolveUserKey(interaction, LanguageKeys.InteractionHandlers.Suggestions.ArchiveSuccess);
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private handleResolve(interaction: APIMessageComponentSelectMenuInteraction, id: IntegerString): InteractionHandler.Response {
		const [action] = interaction.data.values as [Action];
		const t = getT(getSupportedUserLanguageName(interaction));
		const title = t(LanguageKeys.InteractionHandlers.Suggestions.ModalTitle, { id });
		return this.modal({
			custom_id: makeCustomId(Id.SuggestionsModal, action, id),
			title,
			components: [
				{
					type: ComponentType.ActionRow,
					components: [
						{
							custom_id: Id.SuggestionsModalField,
							type: ComponentType.TextInput,
							style: TextInputStyle.Paragraph,
							// TODO: Action-specific label
							label: t(LanguageKeys.InteractionHandlers.Suggestions.ModalFieldLabel),
							// TODO: Action-specific placeholders
							placeholder: t(LanguageKeys.InteractionHandlers.Suggestions.ModalFieldPlaceholder),
							max_length: 1024
						}
					]
				}
			]
		});
	}

	private async handleThread(interaction: APIMessageComponentInteraction, idString: string): InteractionHandler.AsyncResponse {
		const threadCreationResult = await fromAsync(
			ChannelId.MessageId.Threads.post(interaction.channel_id, interaction.message.id, {
				type: ChannelType.GuildPrivateThread,
				name: `${idString}-temporary-name`, // TODO: Assign better name
				auto_archive_duration: 1440 // 1 day
			})
		);
		if (!threadCreationResult.success) {
			const content = resolveUserKey(interaction, LanguageKeys.InteractionHandlers.Suggestions.ThreadChannelCreationFailure);
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
		const content = resolveUserKey(interaction, key, { channel: channelMention(threadCreationResult.value.id) });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}
}
