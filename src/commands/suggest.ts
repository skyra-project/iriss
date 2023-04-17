import { EmptyMentions, SuggestionStatusColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { Id, Status, makeCustomId, makeIntegerString } from '#lib/utilities/id-creator';
import { addCount, useCount, useEmbedContent, usePlainContent, useReactions, useThread } from '#lib/utilities/suggestion-utilities';
import { millisecondsToSeconds } from '#lib/utilities/time';
import { displayAvatarURL } from '#lib/utilities/user';
import { EmbedBuilder, TimestampStyles, channelMention, time, userMention } from '@discordjs/builders';
import { Collection } from '@discordjs/collection';
import type { Guild } from '@prisma/client';
import { AsyncQueue } from '@sapphire/async-queue';
import { Result } from '@sapphire/result';
import { cutText, isNullishOrEmpty, isNullishOrZero } from '@sapphire/utilities';
import { Command, RegisterCommand, RegisterMessageCommand, type TransformedArguments } from '@skyra/http-framework';
import {
	applyLocalizedBuilder,
	applyNameLocalizedBuilder,
	getSupportedLanguageT,
	getSupportedUserLanguageT,
	resolveKey,
	resolveUserKey
} from '@skyra/http-framework-i18n';
import {
	ButtonStyle,
	ComponentType,
	MessageFlags,
	PermissionFlagsBits,
	type APIMessage,
	type APIUser,
	type RESTPostAPIChannelMessageJSONBody
} from 'discord-api-types/v10';

type MessageData = LanguageKeys.Commands.Suggest.MessageData;

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, LanguageKeys.Commands.Suggest.RootName, LanguageKeys.Commands.Suggest.RootDescription) //
		.addStringOption((option) =>
			applyLocalizedBuilder(option, LanguageKeys.Commands.Suggest.OptionsSuggestion).setMaxLength(2048).setRequired(true)
		)
		.addIntegerOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Suggest.OptionsId))
		.setDMPermission(false)
)
export class UserCommand extends Command {
	private readonly queues = new Collection<bigint, AsyncQueue>();
	public override chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		return options.id === undefined
			? this.handleNew(interaction, this.getUserData(interaction.user), options.suggestion)
			: this.handleEdit(interaction, options.id, options.suggestion);
	}

	@RegisterMessageCommand((builder) =>
		applyNameLocalizedBuilder(builder, LanguageKeys.Commands.Suggest.PostAsSuggestionName)
			.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
			.setDMPermission(false)
	)
	public messageContextRun(interaction: Command.MessageInteraction, options: TransformedArguments.Message) {
		const input = options.message.content;
		if (isNullishOrEmpty(input)) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.RePostNoContent);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		return this.handleNew(interaction, this.getUserData(options.message.author), cutText(input, 2048));
	}

	private async handleNew(interaction: Interaction, user: MessageUserData, rawInput: string) {
		const guildId = BigInt(interaction.guild_id!);
		const settings = await this.container.prisma.guild.findUnique({
			where: { id: guildId }
		});
		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewNotConfigured);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const response = await interaction.defer({ flags: MessageFlags.Ephemeral });

		const queue = this.queues.ensure(guildId, () => new AsyncQueue());
		await queue.wait();

		let id: number;
		let message: APIMessage;
		try {
			const cooldown = await this.checkOrSetRateLimit(settings, interaction.user.id);
			if (cooldown !== null) {
				const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.Cooldown, {
					time: time(millisecondsToSeconds(Date.now() + cooldown), TimestampStyles.LongTime)
				});
				return response.update({ content });
			}

			const count = await useCount(guildId);
			id = count + 1;

			const input = settings.embed ? await useEmbedContent(rawInput, guildId, settings.channel, count) : usePlainContent(rawInput);
			const body = this.makeMessage(interaction, settings, { id, message: input, timestamp: time(), user });

			const postResult = await Result.fromAsync(this.container.api.channels.createMessage(settings.channel.toString(), body));
			if (postResult.isErr()) {
				const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewFailedToSend, {
					channel: channelMention(settings.channel.toString())
				});
				return response.update({ content });
			}

			message = postResult.unwrap();
			await this.container.prisma.suggestion.create({
				data: { id, guildId, authorId: BigInt(user.id), messageId: BigInt(message.id) },
				select: null
			});

			addCount(guildId);
		} finally {
			queue.shift();
		}

		const t = getSupportedUserLanguageT(interaction);
		const errors: string[] = [];

		if (settings.reactions.length) {
			const result = await useReactions(t, settings, message);
			result.inspectErr((error) => errors.push(error));
		}

		if (settings.autoThread) {
			const result = await useThread(interaction, id, { message, input: rawInput });
			result
				.inspect((value) => value.memberAddResult.inspectErr((error) => errors.push(t(error))))
				.inspectErr((error) => errors.push(t(error)));
		}

		const header = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewSuccess, { id });
		const details = errors.length === 0 ? '' : `\n\n- ${errors.join('\n- ')}`;

		const content = header + details;
		return response.update({ content });
	}

	private getUserData(user: APIUser) {
		return {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator,
			mention: userMention(user.id),
			avatar: displayAvatarURL(user)
		} satisfies MessageUserData;
	}

	private makeMessage(interaction: Interaction, settings: Guild, data: MessageData): RESTPostAPIChannelMessageJSONBody {
		const resolved = settings.embed ? this.makeEmbedMessage(interaction, data) : this.makeContentMessage(interaction, data);
		return { ...resolved, components: this.makeComponents(interaction, settings, data), allowed_mentions: EmptyMentions };
	}

	private makeComponents(interaction: Interaction, settings: Guild, data: MessageData) {
		type MessageComponent = NonNullable<APIMessage['components']>[number];

		const components: MessageComponent[] = [];
		if (!settings.buttons) return components;

		const id = makeIntegerString(data.id);
		const t = getSupportedLanguageT(interaction);
		const manageRow: MessageComponent = {
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'archive', id),
					style: ButtonStyle.Danger,
					label: t(LanguageKeys.Commands.Suggest.ComponentsArchive)
				}
			]
		};
		if (!settings.autoThread) {
			manageRow.components.unshift({
				type: ComponentType.Button,
				custom_id: makeCustomId(Id.Suggestions, 'thread', id),
				style: ButtonStyle.Primary,
				label: t(LanguageKeys.Commands.Suggest.ComponentsCreateThread)
			});
		}

		components.push(manageRow);

		if (settings.compact) {
			manageRow.components.push(
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'resolve', id, Status.Accept),
					style: ButtonStyle.Success,
					label: t(LanguageKeys.Commands.Suggest.ComponentsAccept)
				},
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'resolve', id, Status.Consider),
					style: ButtonStyle.Secondary,
					label: t(LanguageKeys.Commands.Suggest.ComponentsConsider)
				},
				{
					type: ComponentType.Button,
					custom_id: makeCustomId(Id.Suggestions, 'resolve', id, Status.Deny),
					style: ButtonStyle.Danger,
					label: t(LanguageKeys.Commands.Suggest.ComponentsDeny)
				}
			);
		} else {
			components.push({
				type: ComponentType.ActionRow,
				components: [
					{
						type: ComponentType.StringSelect,
						custom_id: makeCustomId(Id.Suggestions, 'resolve', id),
						options: [
							{ label: t(LanguageKeys.Commands.Suggest.ComponentsAccept), value: Status.Accept },
							{ label: t(LanguageKeys.Commands.Suggest.ComponentsConsider), value: Status.Consider },
							{ label: t(LanguageKeys.Commands.Suggest.ComponentsDeny), value: Status.Deny }
						]
					}
				]
			});
		}

		return components;
	}

	private makeEmbedMessage(interaction: Interaction, data: MessageData): RESTPostAPIChannelMessageJSONBody {
		const name = resolveKey(interaction, LanguageKeys.Commands.Suggest.NewMessageEmbedTitle, data);
		const embed = new EmbedBuilder()
			.setColor(SuggestionStatusColors.Unresolved)
			.setAuthor({ name, iconURL: data.user.avatar })
			.setDescription(data.message);
		return { embeds: [embed.toJSON()] };
	}

	private makeContentMessage(interaction: Interaction, data: MessageData): RESTPostAPIChannelMessageJSONBody {
		const content = resolveKey(interaction, LanguageKeys.Commands.Suggest.NewMessageContent, data);
		return { content };
	}

	private async handleEdit(interaction: Command.ChatInputInteraction, id: number, rawInput: string) {
		const guildId = BigInt(interaction.guild_id!);
		const suggestion = await this.container.prisma.suggestion.findUnique({
			where: { id_guildId: { id, guildId } }
		});

		// If the suggestion does not exist, return early:
		if (suggestion === null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.ModifyDoesNotExist);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		// If the suggestion was made by a different author, return early:
		const userId = BigInt(interaction.user.id);
		if (suggestion.authorId !== userId) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.ModifyMismatchingAuthor);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		// If the suggestion was archived, return early:
		if (suggestion.archivedAt !== null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.ModifyArchived);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		// If the suggestion was already replied to, its contents become immutable to avoid changing the contents after
		// a decision. As such, return early:
		if (suggestion.repliedAt !== null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.ModifyReplied);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		// Get the guild settings to get the channel:
		const settings = await this.container.prisma.guild.findUnique({
			where: { id: guildId },
			select: { channel: true }
		});

		// If the settings were deleted or the channel not configured, everything becomes readonly. As such, return early:
		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewNotConfigured);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const response = await interaction.defer({ flags: MessageFlags.Ephemeral });

		const result = await Result.fromAsync(this.container.api.channels.getMessage(settings.channel.toString(), suggestion.messageId.toString()));
		if (result.isErr()) {
			await this.container.prisma.suggestion.update({
				where: { id_guildId: suggestion },
				data: { archivedAt: new Date() }
			});

			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.ModifyMessageDeleted);
			return response.update({ content });
		}

		const message = result.unwrap();
		let data: RESTPostAPIChannelMessageJSONBody;
		if (message.embeds.length) {
			const description = await useEmbedContent(rawInput, guildId, settings.channel);
			data = { embeds: [{ ...message.embeds[0], description }] };
		} else {
			const content = message.content.slice(0, message.content.indexOf('\n')) + usePlainContent(rawInput);
			data = { content, allowed_mentions: EmptyMentions };
		}
		await this.container.api.channels.editMessage(message.channel_id, message.id, data);

		const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.ModifySuccess, { id });
		return response.update({ content });
	}

	private async checkOrSetRateLimit(settings: Guild, userId: string) {
		// If there is no cooldown, skip:
		if (isNullishOrZero(settings.cooldown)) return null;

		const key = `i:c:${settings.id}:${userId}`;
		const cooldown = await this.container.redis.pttl(key);

		// If the maximum cooldown changed between calls, trim to maximum:
		if (cooldown > settings.cooldown) {
			// Set the new expire, if the operation was successful (1),
			// return the limit, otherwise fallback to new cooldown:
			const result = await this.container.redis.pexpire(key, settings.cooldown);
			if (result === 1) return settings.cooldown;
		} else if (cooldown > 0) {
			// Within settings limit and 0 — positive cooldown, return it:
			return cooldown;
		}

		// Set a TTL-only key and return null:
		await this.container.redis.set(key, Buffer.allocUnsafe(0), 'PX', settings.cooldown);
		return null;
	}
}

interface Options {
	suggestion: string;
	id?: number;
}

type Interaction = Command.ChatInputInteraction | Command.MessageInteraction;
type MessageUserData = MessageData['user'];
