import { SuggestionStatusColors } from '#lib/common/constants';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { applyNameAndDescription } from '#lib/utilities/add-builder-localizations';
import { EmbedBuilder, time, userMention } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { getSupportedLanguageName, getT, resolveKey, resolveUserKey } from '@skyra/http-framework-i18n';
import { ButtonStyle, ComponentType, MessageFlags, RESTPostAPIChannelMessageResult, Routes } from 'discord-api-types/v10';

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
		const message = (await this.container.rest.post(Routes.channelMessages(settings.channel.toString()), {
			body
		})) as RESTPostAPIChannelMessageResult;

		await this.container.prisma.suggestion.create({
			data: { id, guildId, authorId: BigInt(user.id), messageId: BigInt(message.id) }
		});

		return this.message({ content: `TODO: ${input}` });
	}

	private makeUserData(interaction: Command.Interaction): MessageData['user'] {
		const user = (interaction.member?.user ?? interaction.user)!;

		return {
			id: user.id,
			username: user.username,
			discriminator: user.discriminator,
			mention: userMention(user.id)
		};
	}

	private makeMessage(interaction: Command.Interaction, settings: Guild, data: MessageData) {
		const resolved = settings.useEmbed ? this.makeEmbedMessage(interaction, data) : this.makeContentMessage(interaction, data);
		return this.message({ ...resolved, components: this.makeComponents(interaction, settings) });
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
					custom_id: 'suggestions:archive',
					style: ButtonStyle.Danger,
					label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsArchive)
				}
			]
		};
		if (!settings.addThread) {
			manageRow.components.unshift({
				type: ComponentType.Button,
				custom_id: 'suggestions:thread',
				style: ButtonStyle.Primary,
				label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsCreateThread)
			});
		}

		components.push({
			type: ComponentType.ActionRow,
			components: [
				{
					type: ComponentType.SelectMenu,
					custom_id: 'suggestions:resolve',
					options: [
						{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsAccept), value: 'accept' },
						{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsConsider), value: 'consider' },
						{ label: t(LanguageKeys.Commands.Suggestions.SuggestComponentsDeny), value: 'deny' }
					]
				}
			]
		});

		return components;
	}

	private makeEmbedMessage(interaction: Command.Interaction, data: MessageData) {
		const title = resolveKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewMessageEmbedTitle, data);
		const embed = new EmbedBuilder().setColor(SuggestionStatusColors.Unresolved).setTitle(title).setDescription(data.message);
		return this.message({ embeds: [embed.toJSON()] });
	}

	private makeContentMessage(interaction: Command.Interaction, data: MessageData) {
		const content = resolveKey(interaction, LanguageKeys.Commands.Suggestions.SuggestNewMessageContent, data);
		return this.message({ content });
	}

	private async handleEdit(interaction: Command.Interaction, id: number, input: string) {
		const guildId = BigInt(interaction.guild_id!);
		const suggestion = await this.container.prisma.suggestion.findUnique({
			where: { id_guildId: { id, guildId } }
		});

		if (suggestion === null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyDoesNotExist);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		if (suggestion.archivedAt !== null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyArchived);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		if (suggestion.repliedAt !== null) {
			const content = resolveUserKey(interaction, LanguageKeys.Commands.Suggestions.SuggestModifyReplied);
			return this.message({ content, flags: MessageFlags.Ephemeral });
		}

		return this.message({ content: `TODO: ${input}` });
	}
}

interface Options {
	suggestion: string;
	id?: number;
}
