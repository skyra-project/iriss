import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { Status } from '#lib/utilities/id-creator';
import { url } from '#lib/utilities/message';
import { useArchive, useMessageUpdate } from '#lib/utilities/suggestion-utilities';
import { hideLinkEmbed, hyperlink } from '@discordjs/builders';
import { Result } from '@sapphire/result';
import { Command, RegisterCommand, RegisterSubcommand } from '@skyra/http-framework';
import { applyLocalizedBuilder, resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { InteractionContextType, MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, LanguageKeys.Commands.Resolve.RootName, LanguageKeys.Commands.Resolve.RootDescription) //
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.setContexts(InteractionContextType.Guild)
)
export class UserCommand extends Command {
	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, LanguageKeys.Commands.Resolve.Archive).addIntegerOption((option) =>
			applyLocalizedBuilder(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true)
		)
	)
	public async handleArchive(interaction: Command.ChatInputInteraction, options: ArchiveOptions) {
		const result = await this.getInformation(interaction, options.id);
		if (result.isErr()) {
			const content = resolveUserKey(interaction, result.unwrapErr());
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const data = result.unwrap();
		await useArchive(interaction, data);

		const { id, guildId } = data.suggestion;
		await this.container.prisma.suggestion.update({ where: { id_guildId: { id, guildId } }, data: { archivedAt: new Date() } });

		const content = resolveUserKey(interaction, LanguageKeys.Commands.Resolve.ArchiveSuccess, {
			id: hyperlink(`#${options.id}`, hideLinkEmbed(url(data.guildId, data.message.channel_id, data.message.id)))
		});
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, LanguageKeys.Commands.Resolve.Accept)
			.addIntegerOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true))
			.addStringOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Resolve.OptionsResponse))
	)
	public handleAccept(interaction: Command.ChatInputInteraction, options: ReplyOptions) {
		return this.sharedHandler(interaction, options, Status.Accept);
	}

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, LanguageKeys.Commands.Resolve.Consider)
			.addIntegerOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true))
			.addStringOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Resolve.OptionsResponse))
	)
	public handleConsider(interaction: Command.ChatInputInteraction, options: ReplyOptions) {
		return this.sharedHandler(interaction, options, Status.Consider);
	}

	@RegisterSubcommand((builder) =>
		applyLocalizedBuilder(builder, LanguageKeys.Commands.Resolve.Deny)
			.addIntegerOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Resolve.OptionsId).setRequired(true))
			.addStringOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Resolve.OptionsResponse))
	)
	public handleDeny(interaction: Command.ChatInputInteraction, options: ReplyOptions) {
		return this.sharedHandler(interaction, options, Status.Deny);
	}

	private async sharedHandler(interaction: Command.ChatInputInteraction, options: ReplyOptions, action: Status) {
		const result = await this.getInformation(interaction, options.id);
		if (result.isErr()) {
			const content = resolveUserKey(interaction, result.unwrapErr());
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		const { message, settings, guildId } = result.unwrap();
		const input = options.response ?? resolveKey(interaction, LanguageKeys.Commands.Resolve.NoReason);
		const body = await useMessageUpdate(interaction, message, action, input, settings);
		const updateResult = await Result.fromAsync(this.container.api.channels.editMessage(message.channel_id, message.id, body));

		const key = updateResult.match({
			ok: () => LanguageKeys.Commands.Resolve.Success,
			err: () => LanguageKeys.Commands.Resolve.Failure
		});
		const content = resolveUserKey(interaction, key, { id: hyperlink(`#${options.id}`, url(guildId, message.channel_id, message.id)) });
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private async getInformation(interaction: Command.ChatInputInteraction, id: number) {
		const guildId = BigInt(interaction.guild_id!);

		const suggestion = await this.container.prisma.suggestion.findUnique({ where: { id_guildId: { id, guildId } } });
		if (!suggestion) return Result.err(LanguageKeys.Commands.Resolve.SuggestionIdDoesNotExist);
		if (suggestion.archivedAt) return Result.err(LanguageKeys.Commands.Resolve.SuggestionArchived);

		const settings = (await this.container.prisma.guild.findUnique({ where: { id: guildId } }))!;
		if (!settings?.channel) return Result.err(LanguageKeys.Commands.Resolve.NotConfigured);

		const messageResult = await Result.fromAsync(
			this.container.api.channels.getMessage(settings.channel.toString(), suggestion.messageId.toString())
		);
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
