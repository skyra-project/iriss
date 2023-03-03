import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { ensure } from '#lib/utilities/assertions';
import { getColor, Status } from '#lib/utilities/id-creator';
import { getGuildId, getMessage } from '#lib/utilities/interactions';
import { url } from '#lib/utilities/message';
import { ChannelId, type Snowflake } from '#lib/utilities/rest';
import { ErrorCodes, fromDiscord } from '#lib/utilities/result-utilities';
import { getReactionFormat, getTextFormat, type SerializedEmoji } from '#lib/utilities/serialized-emoji';
import { bold, hyperlink, inlineCode, time } from '@discordjs/builders';
import { Collection } from '@discordjs/collection';
import type { Guild } from '@prisma/client';
import { Result } from '@sapphire/result';
import { container, Interactions } from '@skyra/http-framework';
import { resolveKey, type TFunction, type TypedT } from '@skyra/http-framework-i18n';
import { ChannelType, type APIMessage } from 'discord-api-types/v10';
import slug from 'limax';

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

export async function useReactions(t: TFunction, settings: Guild, message: APIMessage) {
	const failed: string[] = [];
	const removed: string[] = [];
	for (const reaction of settings.reactions) {
		const result = await fromDiscord(
			ChannelId.MessageId.ReactionId.put(message.channel_id, message.id, getReactionFormat(reaction as SerializedEmoji)),
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

	if (!failed.length) return Result.ok();
	if (!removed.length) return Result.err(t(LanguageKeys.Commands.Suggest.ReactionsFailed, { failed }));

	const passing = settings.reactions.filter((reaction) => !removed.includes(reaction));
	await container.prisma.guild.update({ where: { id: settings.id }, data: { reactions: passing }, select: null });

	return Result.err(
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

export async function useThread(interaction: Interactions.Any, id: string | number, options: useThread.Options = {}) {
	const message = options.message ?? ensure(getMessage(interaction));
	const input = options.input ?? getOriginalContent(message);

	const name = `${id}-${slug(removeMaskedHyperlinks(input))}`.slice(0, 100);
	const threadCreationResult = await Result.fromAsync(
		ChannelId.MessageId.Threads.post(message.channel_id, message.id, {
			type: ChannelType.GuildPrivateThread,
			name,
			auto_archive_duration: 1440 // 1 day,
		})
	);

	if (threadCreationResult.isErr()) return Result.err(LanguageKeys.InteractionHandlers.Suggestions.ThreadChannelCreationFailure);

	const thread = threadCreationResult.unwrap();
	const result = await Result.fromAsync(ChannelId.ThreadMemberId.put(thread.id, interaction.user.id));
	const memberAddResult = result.mapErr(() => LanguageKeys.InteractionHandlers.Suggestions.ThreadMemberAddFailure);

	return Result.ok({ thread, memberAddResult });
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

export async function useArchive(interaction: Interactions.Any, options: useArchive.Options = {}) {
	const message = options.message ?? ensure(getMessage(interaction));

	const settings = options.settings ?? ensure(await container.prisma.guild.findUnique({ where: { id: BigInt(getGuildId(interaction)) } }));

	const channelId = message.channel_id;
	const messageId = message.id;

	const errors: TypedT[] = [];
	if (message.thread) {
		const result = await Result.fromAsync(ChannelId.patch(message.thread.id, { archived: true }));
		if (result.isErr()) errors.push(LanguageKeys.InteractionHandlers.Suggestions.ArchiveThreadFailure);
	}

	if (settings.removeReactions) {
		const result = await Result.fromAsync(ChannelId.MessageId.Reactions.remove(message.channel_id, message.id));
		if (result.isErr()) errors.push(LanguageKeys.InteractionHandlers.Suggestions.ReactionRemovalFailure);
	}

	const messageUpdateResult = await Result.fromAsync(ChannelId.MessageId.patch(channelId, messageId, { components: [] }));
	return messageUpdateResult.match({
		ok: () => Result.ok({ errors }),
		err: () => Result.err(LanguageKeys.InteractionHandlers.Suggestions.ArchiveMessageFailure)
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
	const header = resolveKey(interaction, makeHeader(action), { tag: `${user.username}#${user.discriminator}`, time: time() });
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
	input = await useEmbedContent(input, settings.id, settings.channel ?? ensure(interaction.channel_id));

	const { user } = interaction;
	const header = resolveKey(interaction, makeHeader(action), { tag: `${user.username}#${user.discriminator}`, time: time() });
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
