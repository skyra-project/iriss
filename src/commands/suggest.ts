import { SuggestionStatusColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply } from '#lib/utilities/add-builder-localizations';
import { Id, makeCustomId, makeIntegerString, Status } from '#lib/utilities/id-creator';
import { getUser } from '#lib/utilities/interactions';
import { ChannelId } from '#lib/utilities/rest';
import { useContent, useThread } from '#lib/utilities/suggestion-utilities';
import { displayAvatarURL } from '#lib/utilities/user';
import { EmbedBuilder, time, userMention } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { fromAsync } from '@sapphire/result';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { getSupportedLanguageName, getT, resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { ButtonStyle, ComponentType, MessageFlags } from 'discord-api-types/v10';

type MessageData = LanguageKeys.Commands.Suggestions.MessageData;

@RegisterCommand((builder) =>
	apply(builder, LanguageKeys.Commands.Suggestions.Suggest) //
		.addStringOption((option) => apply(option, LanguageKeys.Commands.Suggestions.SuggestOptionsSuggestion).setRequired(true))
		.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Suggestions.SuggestOptionsId))
		.setDMPermission(false)
)
export class UserCommand extends Command {
	public override chatInputRun(interaction: Command.Interaction, options: Options): Command.AsyncResponse {
		return options.id === undefined
			? this.handleNew(interaction, options.suggestion)
			: this.handleEdit(interaction, options.id, options.suggestion);
	}

	private async handleNew(interaction: Command.Interaction, input: string) {
		const guildId = BigInt(interaction.guild_id!);
		const settings = await this.container.prisma.guild.findUnique({
			where: { id: guildId }
		});
		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewNotConfigured);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		// TODO: Add sync system
		// TODO: Cache guild suggestion count
		const count = await this.container.prisma.suggestion.count({
			where: { guildId }
		});

		input = await useContent(input, guildId, settings.channel, count);

		const id = count + 1;
		const user = this.makeUserData(interaction);
		const body = this.makeMessage(interaction, settings, { id, message: input, timestamp: time(), user });
		const message = await ChannelId.Messages.post(settings.channel, body);

		await this.container.prisma.suggestion.create({
			data: { id, guildId, authorId: BigInt(user.id), messageId: BigInt(message.id) }
		});

		// TODO: Defer if any of the two following conditions are true:
		// TODO: Add reactions if defined
		if (settings.addThread) await useThread(interaction, { channelId: settings.channel, messageId: message.id, id });

		const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewSuccess, { id });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private makeUserData(interaction: Command.Interaction): MessageData['user'] {
		const user = getUser(interaction);

		return {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator,
			mention: userMention(user.id)
		};
	}

	private makeMessage(interaction: Command.Interaction, settings: Guild, data: MessageData): ChannelId.Messages.post.Body {
		const resolved = settings.useEmbed ? this.makeEmbedMessage(interaction, data) : this.makeContentMessage(interaction, data);
		return { ...resolved, components: this.makeComponents(interaction, settings, data) };
	}

	private makeComponents(interaction: Command.Interaction, settings: Guild, data: MessageData) {
		type MessageComponent = NonNullable<Command.MessageResponseOptions['components']>[number];

		const components: MessageComponent[] = [];
		if (!settings.addButtons) return components;

		const id = makeIntegerString(data.id);
		const t = getT(getSupportedLanguageName(interaction));
		const manageRow: MessageComponent = {
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'archive', id),
					style: ButtonStyle.Danger,
					label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsArchive)
				}
			]
		};
		if (!settings.addThread) {
			manageRow.components.unshift({
				type: ComponentType.Button,
				custom_id: makeCustomId(Id.Suggestions, 'thread', id),
				style: ButtonStyle.Primary,
				label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsCreateThread)
			});
		}

		components.push(manageRow);

		if (settings.useCompact) {
			manageRow.components.push(
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'resolve', id, Status.Accept),
					style: ButtonStyle.Success,
					label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsAccept)
				},
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'resolve', id, Status.Consider),
					style: ButtonStyle.Secondary,
					label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsConsider)
				},
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'resolve', id, Status.Deny),
					style: ButtonStyle.Danger,
					label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsDeny)
				}
			);
		} else {
			components.push({
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.SelectMenu,
						custom_id: makeCustomId(Id.Suggestions, 'resolve', id),
						options: [
							{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsAccept), value: Status.Accept },
							{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsConsider), value: Status.Consider },
							{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsDeny), value: Status.Deny }
						]
					}
				]
			});
		}

		return components;
	}

	private makeEmbedMessage(interaction: Command.Interaction, data: MessageData): ChannelId.Messages.post.Body {
		const name = resolveKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewMessageEmbedTitle, data);
		const embed = new EmbedBuilder()
			.setColor(SuggestionStatusColors.Unresolved)
			.setAuthor({ name, iconURL: displayAvatarURL(interaction.member!.user) })
			.setDescription(data.message);
		return { embeds: [embed.toJSON()] };
	}

	private makeContentMessage(interaction: Command.Interaction, data: MessageData): ChannelId.Messages.post.Body {
		const content = resolveKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewMessageContent, data);
		return { content };
	}

	private async handleEdit(interaction: Command.Interaction, id: number, input: string) {
		const guildId = BigInt(interaction.guild_id!);
		const suggestion = await this.container.prisma.suggestion.findUnique({
			where: { id_guildId: { id, guildId } }
		});

		// If the suggestion does not exist, return early:
		if (suggestion === null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyDoesNotExist);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		// If the suggestion was made by a different author, return early:
		const userId = BigInt(getUser(interaction).id);
		if (suggestion.authorId !== userId) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyMismatchingAuthor);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		// If the suggestion was archived, return early:
		if (suggestion.archivedAt !== null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyArchived);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		// If the suggestion was already replied to, its contents become immutable to avoid changing the contents after
		// a decision. As such, return early:
		if (suggestion.repliedAt !== null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyReplied);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		// Get the guild settings to get the channel:
		const settings = await this.container.prisma.guild.findUnique({
			where: { id: guildId },
			select: { channel: true }
		});

		// If the settings were deleted or the channel not configured, everything becomes readonly. As such, return early:
		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewNotConfigured);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const result = await fromAsync(ChannelId.MessageId.get(settings.channel, suggestion.messageId));
		if (!result.success) {
			await this.container.prisma.suggestion.update({
				where: { id_guildId: suggestion },
				data: { archivedAt: new Date() }
			});

			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyMessageDeleted);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		input = await useContent(input, guildId, settings.channel);

		const message = result.value;
		let data: ChannelId.MessageId.patch.Body;
		if (message.embeds.length) {
			data = { embeds: [{ ...message.embeds[0], description: input }] };
		} else {
			data = { content: message.content.slice(0, message.content.indexOf('\n')) + input };
		}
		await ChannelId.MessageId.patch(message.channel_id, message.id, data);

		const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifySuccess, { id });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}
}

interface Options {
	suggestion: string;
	id?: number;
}
