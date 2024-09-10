import { EmptyMentions } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { createSuggestion, getUserData, useEmbedContent, usePlainContent } from '#lib/utilities/suggestion-utilities';
import { Result } from '@sapphire/result';
import { cutText, isNullishOrEmpty } from '@sapphire/utilities';
import { Command, RegisterCommand, RegisterMessageCommand, type TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, applyNameLocalizedBuilder, resolveUserKey } from '@skyra/http-framework-i18n';
import { InteractionContextType, MessageFlags, PermissionFlagsBits, type RESTPostAPIChannelMessageJSONBody } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, LanguageKeys.Commands.Suggest.RootName, LanguageKeys.Commands.Suggest.RootDescription) //
		.addStringOption((option) =>
			applyLocalizedBuilder(option, LanguageKeys.Commands.Suggest.OptionsSuggestion).setMaxLength(2048).setRequired(true)
		)
		.addIntegerOption((option) => applyLocalizedBuilder(option, LanguageKeys.Commands.Suggest.OptionsId))
		.setContexts(InteractionContextType.Guild)
)
export class UserCommand extends Command {
	public override chatInputRun(interaction: Command.ChatInputInteraction, options: Options) {
		return options.id === undefined
			? createSuggestion(interaction, getUserData(interaction.user), options.suggestion)
			: this.handleEdit(interaction, options.id, options.suggestion);
	}

	@RegisterMessageCommand((builder) =>
		applyNameLocalizedBuilder(builder, LanguageKeys.Commands.Suggest.PostAsSuggestionName)
			.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
			.setContexts(InteractionContextType.Guild)
	)
	public messageContextRun(interaction: Command.MessageInteraction, options: TransformedArguments.Message) {
		const input = options.message.content;
		if (isNullishOrEmpty(input)) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggest.RePostNoContent);
			return interaction.reply({ content, flags: MessageFlags.Ephemeral });
		}

		return createSuggestion(interaction, getUserData(options.message.author), cutText(input, 2048));
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
}

interface Options {
	suggestion: string;
	id?: number;
}
