import type { AnyInteraction } from '#lib/common/types';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { ensure } from '#lib/utilities/assertions';
import { getColor, Status } from '#lib/utilities/id-creator';
import { getUser } from '#lib/utilities/interactions';
import { url } from '#lib/utilities/message';
import { ChannelId, type Snowflake } from '#lib/utilities/rest';
import { bold, hyperlink, inlineCode, time } from '@discordjs/builders';
import { Collection } from '@discordjs/collection';
import type { Guild } from '@prisma/client';
import { err, fromAsync, ok } from '@sapphire/result';
import { container } from '@skyra/http-framework';
import { resolveKey, type TypedT } from '@skyra/http-framework-i18n';
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

export async function useThread(interaction: AnyInteraction, id: string | number, options: useThread.Options = {}) {
	const message = options.message ?? ensure(interaction.message);
	const input = options.input ?? getOriginalContent(message);

	const name = `${id}-${slug(removeMaskedHyperlinks(input))}`.slice(0, 100);
	const threadCreationResult = await fromAsync(
		ChannelId.MessageId.Threads.post(message.channel_id, message.id, {
			type: ChannelType.GuildPrivateThread,
			name,
			auto_archive_duration: 1440 // 1 day,
		})
	);

	if (!threadCreationResult.success) return err(LanguageKeys.InteractionHandlers.Suggestions.ThreadChannelCreationFailure);

	const thread = threadCreationResult.value;
	const memberAddResult = await fromAsync(ChannelId.ThreadMemberId.put(thread.id, getUser(interaction).id));

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

export async function useArchive(interaction: AnyInteraction, options: useArchive.Options = {}) {
	const message = options.message ?? ensure(interaction.message);
	const settings = options.settings ?? ensure(await container.prisma.guild.findUnique({ where: { id: BigInt(interaction.guild_id!) } }));

	const channelId = message.channel_id;
	const messageId = message.id;

	const errors: TypedT[] = [];
	if (message.thread) {
		const result = await fromAsync(ChannelId.patch(message.thread.id, { archived: true }));
		if (!result.success) errors.push(LanguageKeys.InteractionHandlers.Suggestions.ArchiveThreadFailure);
	}

	if (settings.removeReactions) {
		const result = await fromAsync(ChannelId.MessageId.Reactions.remove(message.channel_id, message.id));
		if (!result.success) errors.push(LanguageKeys.InteractionHandlers.Suggestions.ReactionRemovalFailure);
	}

	const messageUpdateResult = await fromAsync(ChannelId.MessageId.patch(channelId, messageId, { components: [] }));
	if (!messageUpdateResult.success) return err(LanguageKeys.InteractionHandlers.Suggestions.ArchiveMessageFailure);

	return ok({ errors });
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
			if (buffer.length) parts.push(buffer + content.slice(lastIndex, result.index));

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

export async function useMessageUpdate(interaction: AnyInteraction, message: APIMessage, action: Status, input: string, settings?: Guild) {
	settings ??= (await container.prisma.guild.findUnique({ where: { id: BigInt(interaction.guild_id!) } }))!;

	return message.embeds.length === 0
		? useMessageUpdateContent(interaction, settings, action, input)
		: useMessageUpdateEmbed(interaction, settings, action, input);
}

function useMessageUpdateContent(interaction: AnyInteraction, settings: Guild, action: Status, input: string) {
	input = usePlainContent(input);

	const user = getUser(interaction);
	const header = resolveKey(interaction, makeHeader(action), { tag: `${user.username}#${user.discriminator}`, time: time() });
	const formattedHeader = `${bold(header)}:\n`;
	const { content } = interaction.message!;
	if (settings.addUpdateHistory) {
		const [original, ...entries] = content.split(contentSeparator).concat(`${formattedHeader}${input}`);
		return { content: `${original}${contentSeparator}${entries.slice(-3).join(contentSeparator)}` };
	}

	const index = content.indexOf(contentSeparator);
	return { content: `${index === -1 ? content : content.slice(0, index)}${contentSeparator}${formattedHeader}${input}` };
}

async function useMessageUpdateEmbed(interaction: AnyInteraction, settings: Guild, action: Status, input: string) {
	input = await useEmbedContent(input, settings.id, settings.channel!);

	const user = getUser(interaction);
	const header = resolveKey(interaction, makeHeader(action), { tag: `${user.username}#${user.discriminator}`, time: time() });
	const [embed] = interaction.message!.embeds;

	const fields = settings.addUpdateHistory //
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
