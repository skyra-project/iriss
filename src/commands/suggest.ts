import { SuggestionStatusColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { applyNameAndDescription } from '#lib/utilities/add-builder-localizations';
import { ButtonValue, CustomId } from '#lib/utilities/id-creator';
import { getUser } from '#lib/utilities/interactions';
import { getMessage, patchMessage, postMessage } from '#lib/utilities/rest';
import { EmbedBuilder, time, userMention } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { fromAsync } from '@sapphire/result';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { getSupportedLanguageName, getT, resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { ButtonStyle, ComponentType, MessageFlags } from 'discord-api-types/v10';

type MessageData = LanguageKeys.Commands.Suggestions.MessageData;

@RegisterCommand((builder) =>
	applyNameAndDescription(LanguageKeys.Commands.Suggestions.Suggest, builder) //
		.addStringOption((option) => applyNameAndDescription(LanguageKeys.Commands.Suggestions.SuggestOptionsSuggestion, option).setRequired(true))
		.addIntegerOption((option) => applyNameAndDescription(LanguageKeys.Commands.Suggestions.SuggestOptionsId, option))
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

		const id = count + 1;
		const user = this.makeUserData(interaction);
		const body = this.makeMessage(interaction, settings, { id, message: input, timestamp: time(), user });
		const message = await postMessage(settings.channel, body);

		await this.container.prisma.suggestion.create({
			data: { id, guildId, authorId: BigInt(user.id), messageId: BigInt(message.id) }
		});

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

	private makeMessage(interaction: Command.Interaction, settings: Guild, data: MessageData): postMessage.Body {
		const resolved = settings.useEmbed ? this.makeEmbedMessage(interaction, data) : this.makeContentMessage(interaction, data);
		return { ...resolved, components: this.makeComponents(interaction, settings) };
	}

	private makeComponents(interaction: Command.Interaction, settings: Guild) {
		type MessageComponent = NonNullable<Command.MessageResponseOptions['components']>[number];

		const components: MessageComponent[] = [];
		if (!settings.addButtons) return components;

		const t = getT(getSupportedLanguageName(interaction));
		const manageRow: MessageComponent = {
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.Button,
					custom_id: CustomId.SuggestionsArchive,
					style: ButtonStyle.Danger,
					label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsArchive)
				}
			]
		};
		if (!settings.addThread) {
			manageRow.components.unshift({
				type: ComponentType.Button,
				custom_id: CustomId.SuggestionsThread,
				style: ButtonStyle.Primary,
				label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsCreateThread)
			});
		}

		components.push({
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.SelectMenu,
					custom_id: CustomId.SuggestionsResolve,
					options: [
						{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsAccept), value: ButtonValue.Accept },
						{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsConsider), value: ButtonValue.Consider },
						{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsDeny), value: ButtonValue.Deny }
					]
				}
			]
		});

		return components;
	}

	private makeEmbedMessage(interaction: Command.Interaction, data: MessageData): postMessage.Body {
		const title = resolveKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewMessageEmbedTitle, data);
		const embed = new EmbedBuilder().setColor(SuggestionStatusColors.Unresolved).setTitle(title).setDescription(data.message);
		return { embeds: [embed.toJSON()] };
	}

	private makeContentMessage(interaction: Command.Interaction, data: MessageData): postMessage.Body {
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

		const result = await fromAsync(getMessage(settings.channel, suggestion.messageId));
		if (!result.success) {
			await this.container.prisma.suggestion.update({
				where: { id_guildId: suggestion },
				data: { archivedAt: new Date() }
			});

			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyMessageDeleted);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		const message = result.value;
		let data: patchMessage.Body;
		if (message.embeds.length) {
			data = { embeds: [{ ...message.embeds[0], description: input }] };
		} else {
			data = { content: message.content.slice(0, message.content.indexOf('\n')) + input };
		}
		await patchMessage(message.channel_id, message.id, data);

		const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifySuccess, { id });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}
}

interface Options {
	suggestion: string;
	id?: number;
}
