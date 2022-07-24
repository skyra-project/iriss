import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply } from '#lib/utilities/add-builder-localizations';
import { Status } from '#lib/utilities/id-creator';
import { url } from '#lib/utilities/message';
import { ChannelId } from '#lib/utilities/rest';
import { useArchive, useMessageUpdate } from '#lib/utilities/suggestion-utilities';
import { hideLinkEmbed, hyperlink } from '@discordjs/builders';
import { Result } from '@sapphire/result';
import { Command, RegisterCommand, RegisterSubCommand } from '@skyra/http-framework';
import { resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	apply(builder, LanguageKeys.Commands.Resolve.RootName, LanguageKeys.Commands.Resolve.RootDescription) //
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.setDMPermission(false)
)
export class UserCommand extends Command {
	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Resolve.Archive).addIntegerOption((option) =>
			apply(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true)
		)
	)
	public async handleArchive(interaction: Command.Interaction, options: ArchiveOptions): Command.AsyncResponse {
		const result = await this.getInformation(interaction, options.id);
		if (result.isErr()) {
			const content = resolveUserKey(interaction, result.unwrapErr());
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const data = result.unwrap();
		await useArchive(interaction, data);

		const { id, guildId } = data.suggestion;
		await this.container.prisma.suggestion.update({ where: { id_guildId: { id, guildId } }, data: { archivedAt: new Date() } });

		const content = resolveUserKey(interaction, LanguageKeys.Commands.Resolve.ArchiveSuccess, {
			id: hyperlink(`#${options.id}`, hideLinkEmbed(url(data.guildId, data.message.channel_id, data.message.id)))
		});
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Resolve.Accept)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Resolve.OptionsResponse))
	)
	public handleAccept(interaction: Command.Interaction, options: ReplyOptions): Command.AsyncResponse {
		return this.sharedHandler(interaction, options, Status.Accept);
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Resolve.Consider)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Resolve.OptionsResponse))
	)
	public handleConsider(interaction: Command.Interaction, options: ReplyOptions): Command.AsyncResponse {
		return this.sharedHandler(interaction, options, Status.Consider);
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Resolve.Deny)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Resolve.OptionsResponse))
	)
	public handleDeny(interaction: Command.Interaction, options: ReplyOptions): Command.AsyncResponse {
		return this.sharedHandler(interaction, options, Status.Deny);
	}

	private async sharedHandler(interaction: Command.Interaction, options: ReplyOptions, action: Status): Command.AsyncResponse {
		const result = await this.getInformation(interaction, options.id);
		if (result.isErr()) {
			const content = resolveUserKey(interaction, result.unwrapErr());
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const { message, settings, guildId } = result.unwrap();
		const input = options.response ?? resolveKey(interaction, LanguageKeys.Commands.Resolve.NoReason);
		const body = await useMessageUpdate(interaction, message, action, input, settings);
		const updateResult = await Result.fromAsync(ChannelId.MessageId.patch(message.channel_id, message.id, body));

		const key = updateResult.match({
			ok: () => LanguageKeys.Commands.Resolve.Success,
			err: () => LanguageKeys.Commands.Resolve.Failure
		});
		const content = resolveUserKey(interaction, key, { id: hyperlink(`#${options.id}`, url(guildId, message.channel_id, message.id)) });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private async getInformation(interaction: Command.Interaction, id: number) {
		const guildId = BigInt(interaction.guild_id!);

		const suggestion = await this.container.prisma.suggestion.findUnique({ where: { id_guildId: { id, guildId } } });
		if (!suggestion) return Result.err(LanguageKeys.Commands.Resolve.SuggestionIdDoesNotExist);
		if (suggestion.archivedAt) return Result.err(LanguageKeys.Commands.Resolve.SuggestionArchived);

		const settings = (await this.container.prisma.guild.findUnique({ where: { id: guildId } }))!;
		if (!settings?.channel) return Result.err(LanguageKeys.Commands.Resolve.NotConfigured);

		const messageResult = await Result.fromAsync(ChannelId.MessageId.get(settings.channel, suggestion.messageId));
		if (messageResult.isErr()) {
			await this.container.prisma.suggestion.update({ where: { id_guildId: { id, guildId } }, data: { archivedAt: new Date() } });
			return Result.err(LanguageKeys.Commands.Resolve.SuggestionMessageDeleted);
		}

		return Result.ok({ suggestion, settings, guildId: suggestion.guildId, message: messageResult.unwrap() });
	}
}

interface ArchiveOptions {
	id: number;
}

interface ReplyOptions {
	response?: string;
	id: number;
}
