import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply } from '#lib/utilities/add-builder-localizations';
import { Status } from '#lib/utilities/id-creator';
import { url } from '#lib/utilities/message';
import { ChannelId } from '#lib/utilities/rest';
import { useMessageUpdate } from '#lib/utilities/suggestion-utilities';
import { hyperlink } from '@discordjs/builders';
import { fromAsync } from '@sapphire/result';
import { Command, RegisterCommand, RegisterSubCommand } from '@skyra/http-framework';
import { resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	apply(builder, LanguageKeys.Commands.Suggestions.Resolve) //
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.setDMPermission(false)
)
export class UserCommand extends Command {
	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Suggestions.ResolveAccept)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsResponse))
	)
	public handleAccept(interaction: Command.Interaction, options: Options): Command.AsyncResponse {
		return this.sharedHandler(interaction, options, Status.Accept);
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Suggestions.ResolveConsider)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsResponse))
	)
	public handleConsider(interaction: Command.Interaction, options: Options): Command.AsyncResponse {
		return this.sharedHandler(interaction, options, Status.Consider);
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Suggestions.ResolveDeny)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsResponse))
	)
	public handleDeny(interaction: Command.Interaction, options: Options): Command.AsyncResponse {
		return this.sharedHandler(interaction, options, Status.Deny);
	}

	private async sharedHandler(interaction: Command.Interaction, options: Options, action: Status): Command.AsyncResponse {
		const guildId = BigInt(interaction.guild_id!);

		const suggestion = await this.container.prisma.suggestion.findUnique({ where: { id_guildId: { id: options.id, guildId } } });
		if (!suggestion) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.ResolveSuggestionIdDoesNotExist);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		if (suggestion.archivedAt) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.ResolveNotConfigured);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const settings = (await this.container.prisma.guild.findUnique({ where: { id: guildId } }))!;
		if (!settings?.channel) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.ResolveNotConfigured);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const messageResult = await fromAsync(ChannelId.MessageId.get(settings.channel, suggestion.messageId));
		if (!messageResult.success) {
			await this.container.prisma.suggestion.update({ where: { id_guildId: { id: options.id, guildId } }, data: { archivedAt: new Date() } });
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.ResolveSuggestionMessageDeleted);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const message = messageResult.value;
		const input = options.suggestion ?? resolveKey(interaction, LanguageKeys.Commands.Suggestions.ResolveNoReason);
		const body = await useMessageUpdate(interaction, message, action, input, settings);
		const updateResult = await fromAsync(ChannelId.MessageId.patch(message.channel_id, message.id, body));

		const key = updateResult.success ? LanguageKeys.Commands.Suggestions.ResolveSuccess : LanguageKeys.Commands.Suggestions.ResolveFailure;
		const content = resolveUserKey(interaction, key, { id: hyperlink(`#${options.id}`, url(message)) });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}
}

interface Options {
	suggestion?: string;
	id: number;
}
