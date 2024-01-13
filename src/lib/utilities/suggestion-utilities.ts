import { EmptyMentions, SuggestionStatusColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import type { Snowflake } from '#lib/types/discord.d.ts';
import { ensure } from '#lib/utilities/assertions';
import { Id, Status, getColor, makeCustomId, makeIntegerString } from '#lib/utilities/id-creator';
import { getGuildId, getMessage } from '#lib/utilities/interactions';
import { url } from '#lib/utilities/message';
import { ErrorCodes, fromDiscord } from '#lib/utilities/result-utilities';
import { getReactionFormat, getTextFormat, type SerializedEmoji } from '#lib/utilities/serialized-emoji';
import { millisecondsToSeconds } from '#lib/utilities/time';
import { getDisplayAvatar, getTag } from '#lib/utilities/user';
import { EmbedBuilder, TimestampStyles, bold, channelMention, hyperlink, inlineCode, time, userMention } from '@discordjs/builders';
import { Collection } from '@discordjs/collection';
import type { Guild } from '@prisma/client';
import { AsyncQueue } from '@sapphire/async-queue';
import { Result, err, ok } from '@sapphire/result';
import { isNullishOrZero } from '@sapphire/utilities';
import {
	ChatInputCommandInteraction,
	MessageContextMenuCommandInteraction,
	ModalSubmitInteraction,
	container,
	type Interaction,
	type Interactions
} from '@skyra/http-framework';
import {
	getSupportedLanguageT,
	getSupportedUserLanguageT,
	resolveKey,
	resolveUserKey,
	type TFunction,
	type TypedT
} from '@skyra/http-framework-i18n';
import {
	ButtonStyle,
	ChannelType,
	ComponentType,
	MessageFlags,
	type APIMessage,
	type APIThreadChannel,
	type APIUser,
	type RESTPostAPIChannelMessageJSONBody
} from 'discord-api-types/v10';
import slug from 'limax';

const suggestionQueues = new Collection<bigint, AsyncQueue>();
export async function createSuggestion(
	interaction: ChatInputCommandInteraction | ModalSubmitInteraction | MessageContextMenuCommandInteraction,
	user: MessageUserData,
	rawInput: string
) {
	const guildId = BigInt(interaction.guild_id!);
	const settings = await container.prisma.guild.findUnique({ where: { id: guildId } });
	if (!settings?.channel) {
		const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewNotConfigured);
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	const response = await interaction.defer({ flags: MessageFlags.Ephemeral });

	const queue = suggestionQueues.ensure(guildId, () => new AsyncQueue());
	await queue.wait();

	let id: number;
	let message: APIMessage;
	try {
		const cooldown = await checkOrSetRateLimit(settings, interaction.user.id);
		if (cooldown !== null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.Cooldown, {
				time: time(millisecondsToSeconds(Date.now() + cooldown), TimestampStyles.LongTime)
			});
			return response.update({ content });
		}

		const count = await useCount(guildId);
		id = count + 1;

		const input = settings.embed ? await useEmbedContent(rawInput, guildId, settings.channel, count) : usePlainContent(rawInput);
		const body = makeMessage(interaction, settings, { id, message: input, timestamp: time(), user });

		const postResult = await Result.fromAsync(container.api.channels.createMessage(settings.channel.toString(), body));
		if (postResult.isErr()) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewFailedToSend, {
				channel: channelMention(settings.channel.toString())
			});
			return response.update({ content });
		}

		message = postResult.unwrap();
		await container.prisma.suggestion.create({
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
		result.inspect((value) => value.memberAddResult.inspectErr((error) => errors.push(t(error)))).inspectErr((error) => errors.push(t(error)));
	}

	const header = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.NewSuccess, { id });
	const details = errors.length === 0 ? '' : `\n\n- ${errors.join('\n- ')}`;

	const content = header + details;
	return response.update({ content });
}

export function getUserData(user: APIUser) {
	return {
		id: user.id,
		tag: getTag(user),
		mention: userMention(user.id),
		avatar: getDisplayAvatar(user)
	} satisfies MessageUserData;
}

export type MessageData = LanguageKeys.Commands.Suggest.MessageData;
export type MessageUserData = MessageData['user'];

export async function checkOrSetRateLimit(settings: Guild, userId: string) {
	// If there is no cooldown, skip:
	if (isNullishOrZero(settings.cooldown)) return null;

	const key = `i:c:${settings.id}:${userId}`;
	const cooldown = await container.redis.pttl(key);

	// If the maximum cooldown changed between calls, trim to maximum:
	if (cooldown > settings.cooldown) {
		// Set the new expire, if the operation was successful (1),
		// return the limit, otherwise fallback to new cooldown:
		const result = await container.redis.pexpire(key, settings.cooldown);
		if (result === 1) return settings.cooldown;
	} else if (cooldown > 0) {
		// Within settings limit and 0 — positive cooldown, return it:
		return cooldown;
	}

	// Set a TTL-only key and return null:
	await container.redis.set(key, Buffer.allocUnsafe(0), 'PX', settings.cooldown);
	return null;
}

function makeMessage(interaction: Interaction, settings: Guild, data: MessageData): RESTPostAPIChannelMessageJSONBody {
	const resolved = settings.embed ? makeEmbedMessage(interaction, data) : makeContentMessage(interaction, data);
	return { ...resolved, components: makeComponents(interaction, settings, data), allowed_mentions: EmptyMentions };
}

function makeComponents(interaction: Interaction, settings: Guild, data: MessageData) {
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

function makeEmbedMessage(interaction: Interaction, data: MessageData): RESTPostAPIChannelMessageJSONBody {
	const name = resolveKey(interaction, LanguageKeys.Commands.Suggest.NewMessageEmbedTitle, data);
	const embed = new EmbedBuilder()
		.setColor(SuggestionStatusColors.Unresolved)
		.setAuthor({ name, iconURL: data.user.avatar })
		.setDescription(data.message);
	return { embeds: [embed.toJSON()] };
}

function makeContentMessage(interaction: Interaction, data: MessageData): RESTPostAPIChannelMessageJSONBody {
	const content = resolveKey(interaction, LanguageKeys.Commands.Suggest.NewMessageContent, data);
	return { content };
}

const countCache = new Collection<bigint, number>();
const promiseCountCache = new Collection<bigint, Promise<number>>();
export async function useCount(guildId: Snowflake): Promise<number> {
	guildId = BigInt(guildId);

	const cachedCount = countCache.get(guildId);
	if (cachedCount !== undefined) return cachedCount;

	const promiseEntry = promiseCountCache.get(guildId);
	if (promiseEntry !== undefined) return promiseEntry;

	try {
		const promise = container.prisma.suggestion
			.count({ where: { guildId } }) //
			.then((count) => (countCache.set(guildId as bigint, count), count));
		promiseCountCache.set(guildId, promise);

		return await promise;
	} finally {
		promiseCountCache.delete(guildId);
	}
}

export function addCount(guildId: Snowflake) {
	guildId = BigInt(guildId);

	const entry = countCache.get(guildId);
	if (entry !== undefined) countCache.set(guildId, entry + 1);
}

const useReactionsOk = [
	ErrorCodes.UnknownMessage,
	ErrorCodes.UnknownChannel,
	ErrorCodes.UnknownGuild,
	ErrorCodes.MaximumNumberOfReactionsReached
] as const;

const useReactionsErr = [ErrorCodes.UnknownEmoji] as const;

export async function useReactions(t: TFunction, settings: Guild, message: APIMessage): Promise<Result<unknown, string>> {
	const failed: string[] = [];
	const removed: string[] = [];
	for (const reaction of settings.reactions) {
		const result = await fromDiscord(
			container.api.channels.addMessageReaction(message.channel_id, message.id, getReactionFormat(reaction as SerializedEmoji)),
			{ ok: useReactionsOk, err: useReactionsErr }
		);

		// The reaction failed because...
		if (result.isErr()) {
			const formatted = getTextFormat(reaction as SerializedEmoji);
			failed.push(formatted);

			const error = result.unwrapErr();
			error.tag.match({
				// ... the emoji does not exist - mark as failed for removal:
				some: () => {
					removed.push(formatted);
				},
				// ... any other reason - log the error:
				none: () => container.logger.error(error.value)
			});
		}
		// Reaction is valid, but cannot react any more, break the loop:
		else if (result.unwrap().isNone()) {
			break;
		}
	}

	if (!failed.length) return ok();
	if (!removed.length) return err(t(LanguageKeys.Commands.Suggest.ReactionsFailed, { failed }));

	const passing = settings.reactions.filter((reaction) => !removed.includes(reaction));
	await container.prisma.guild.update({ where: { id: settings.id }, data: { reactions: passing }, select: null });

	return err(
		t(LanguageKeys.Commands.Suggest.ReactionsFailedAndRemoved, {
			failed,
			removed
		})
	);
}

const contentSeparator = '\u200B\n\n';

export function getOriginalContent(message: APIMessage) {
	if (message.embeds.length) {
		return ensure(message.embeds[0].description);
	}

	const newLine = message.content.indexOf('\n');
	if (newLine === -1) throw new Error('Expected message to have a newline');

	const index = message.content.indexOf(contentSeparator, newLine);
	return index === -1 ? message.content : message.content.slice(newLine, index);
}

export async function useThread(
	interaction: Interactions.Any,
	id: string | number,
	options: useThread.Options = {}
): Promise<Result<{ thread: APIThreadChannel; memberAddResult: Result<void, TypedT> }, TypedT>> {
	const message = options.message ?? ensure(getMessage(interaction));
	const input = options.input ?? getOriginalContent(message);

	const name = `${id}-${slug(removeMaskedHyperlinks(input))}`.slice(0, 100);
	const threadCreationResult = await Result.fromAsync(
		container.api.channels.createThread(message.channel_id, { type: ChannelType.PublicThread, name }, message.id)
	);

	if (threadCreationResult.isErr()) return err(LanguageKeys.InteractionHandlers.Suggestions.ThreadChannelCreationFailure);

	const thread = threadCreationResult.unwrap() as APIThreadChannel;
	const result = await Result.fromAsync(container.api.threads.addMember(thread.id, interaction.user.id));
	const memberAddResult = result.mapErr(() => LanguageKeys.InteractionHandlers.Suggestions.ThreadMemberAddFailure);

	return ok({ thread, memberAddResult });
}

export namespace useThread {
	export interface Options {
		message?: APIMessage;
		input?: string;
	}
}

const maskedLinkRegExp = /\[([^\]]+)\]\(https?\:[^\)]+\)/g;
function removeMaskedHyperlinks(input: string) {
	return input.replaceAll(maskedLinkRegExp, '$1');
}

export async function useArchive(interaction: Interactions.Any, options: useArchive.Options = {}): Promise<Result<{ errors: TypedT[] }, TypedT>> {
	const message = options.message ?? ensure(getMessage(interaction));

	const settings = options.settings ?? ensure(await container.prisma.guild.findUnique({ where: { id: BigInt(getGuildId(interaction)) } }));

	const channelId = message.channel_id;
	const messageId = message.id;

	const errors: TypedT[] = [];
	if (message.thread) {
		const result = await Result.fromAsync(container.api.channels.edit(message.thread.id, { archived: true }));
		if (result.isErr()) errors.push(LanguageKeys.InteractionHandlers.Suggestions.ArchiveThreadFailure);
	}

	if (settings.removeReactions) {
		const result = await Result.fromAsync(container.api.channels.deleteAllMessageReactions(message.channel_id, message.id));
		if (result.isErr()) errors.push(LanguageKeys.InteractionHandlers.Suggestions.ReactionRemovalFailure);
	}

	const messageUpdateResult = await Result.fromAsync(container.api.channels.editMessage(channelId, messageId, { components: [] }));
	return messageUpdateResult.match({
		ok: () => ok({ errors }),
		err: () => err(LanguageKeys.InteractionHandlers.Suggestions.ArchiveMessageFailure)
	});
}

export namespace useArchive {
	export interface Options {
		message?: APIMessage;
		settings?: Guild;
	}
}

const referenceRegExp = /#(\d+)/g;

export function usePlainContent(content: string) {
	// Sanitize ZWS, as they are used as content separators.
	return content.replaceAll('\u200B', '');
}

export async function useEmbedContent(content: string, guildId: Snowflake, channelId: Snowflake, lastId?: number) {
	// Short circuit empty and one-character contents, as it needs at least 2 characters to do a reference.
	if (content.length < 2) return content;

	guildId = BigInt(guildId);
	lastId ??= await useCount(guildId);

	const references = new Set<number>();
	const parts: (string | number)[] = [];
	let buffer = '';
	let result: RegExpExecArray | null;
	let lastIndex = 0;
	while ((result = referenceRegExp.exec(content)) !== null) {
		const id = Number(result[1]);
		if (id > lastId) continue;

		if (result.index !== lastIndex) {
			buffer += content.slice(lastIndex, result.index);
			if (buffer.length) parts.push(buffer);

			buffer = '';
		}

		lastIndex = result.index + result[0].length;

		references.add(id);
		parts.push(id);
	}

	// If there are no references, return the content:
	if (references.size === 0) return content;

	if (lastIndex !== content.length) {
		buffer += content.slice(lastIndex);
		parts.push(buffer);
	}

	const entries = await container.prisma.suggestion.findMany({
		where: { guildId, id: { in: [...references] } },
		select: { id: true, messageId: true }
	});

	const urls = new Map(entries.map((entry) => [entry.id, hyperlink(inlineCode(`#${entry.id}`), url(guildId, channelId, entry.messageId))]));
	return parts.map((part) => (typeof part === 'string' ? part : urls.get(part)!)).join('');
}

export async function useMessageUpdate(interaction: Interactions.Any, message: APIMessage, action: Status, input: string, settings?: Guild) {
	settings ??= (await container.prisma.guild.findUnique({ where: { id: BigInt(interaction.guild_id!) } }))!;

	return message.embeds.length === 0
		? useMessageUpdateContent(interaction, message, settings, action, input)
		: useMessageUpdateEmbed(interaction, message, settings, action, input);
}

function useMessageUpdateContent(interaction: Interactions.Any, message: APIMessage, settings: Guild, action: Status, input: string) {
	input = usePlainContent(input);

	const { user } = interaction;
	const header = resolveKey(interaction, makeHeader(action), { tag: getTag(user), time: time() });
	const formattedHeader = `${bold(header)}:\n`;
	const { content } = message;
	if (settings.displayUpdateHistory) {
		const [original, ...entries] = content.split(contentSeparator).concat(`${formattedHeader}${input}`);
		return { content: `${original}${contentSeparator}${entries.slice(-3).join(contentSeparator)}` };
	}

	const index = content.indexOf(contentSeparator);
	return { content: `${index === -1 ? content : content.slice(0, index)}${contentSeparator}${formattedHeader}${input}` };
}

async function useMessageUpdateEmbed(interaction: Interactions.Any, message: APIMessage, settings: Guild, action: Status, input: string) {
	input = await useEmbedContent(input, settings.id, settings.channel ?? ensure(interaction.channel?.id));

	const { user } = interaction;
	const header = resolveKey(interaction, makeHeader(action), { tag: getTag(user), time: time() });
	const [embed] = message.embeds;

	const fields = settings.displayUpdateHistory //
		? [...(embed.fields ?? []), { name: header, value: input }].slice(-3)
		: [{ name: header, value: input }];
	const color = getColor(action);

	return { embeds: [{ ...embed, fields, color }] };
}

function makeHeader(action: Status) {
	switch (action) {
		case Status.Accept:
			return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentAccepted;
		case Status.Consider:
			return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentConsidered;
		case Status.Deny:
			return LanguageKeys.InteractionHandlers.SuggestionsModals.ContentDenied;
	}
}
