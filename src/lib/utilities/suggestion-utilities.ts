import type { AnyInteraction } from '#lib/common/types';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { ensure } from '#lib/utilities/assertions';
import { getUser } from '#lib/utilities/interactions';
import { url } from '#lib/utilities/message';
import { ChannelId, Snowflake } from '#lib/utilities/rest';
import { hyperlink, inlineCode } from '@discordjs/builders';
import { err, fromAsync, ok } from '@sapphire/result';
import { container } from '@skyra/http-framework';
import { APIMessage, ChannelType } from 'discord-api-types/v10';

export async function useThread(interaction: AnyInteraction, options: useThread.Options) {
	const channelId = options.channelId ?? ensure(interaction.channel_id);
	const messageId = options.messageId ?? ensure(interaction.message?.id);
	const threadCreationResult = await fromAsync(
		ChannelId.MessageId.Threads.post(channelId, messageId, {
			type: ChannelType.GuildPrivateThread,
			name: `${options.id}-temporary-name`, // TODO: Assign better name
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
		channelId?: Snowflake;
		messageId?: Snowflake;
		id: string | number;
	}
}

export async function useArchive(interaction: AnyInteraction, message?: APIMessage) {
	message ??= ensure(interaction.message);

	const channelId = message.channel_id;
	const messageId = message.id;

	if (message.thread) {
		const threadArchiveResult = await fromAsync(ChannelId.patch(message.thread.id, { archived: true }));
		if (!threadArchiveResult.success) return err(LanguageKeys.InteractionHandlers.Suggestions.ArchiveThreadFailure);
	}

	const messageUpdateResult = await fromAsync(ChannelId.MessageId.patch(channelId, messageId, { components: [] }));
	if (!messageUpdateResult.success) return err(LanguageKeys.InteractionHandlers.Suggestions.ArchiveMessageFailure);

	return ok();
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
	lastId ??= await container.prisma.suggestion.count({ where: { guildId } });

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
