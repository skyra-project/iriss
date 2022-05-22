import { isDefined } from '#lib/common/types';
import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply, makeName } from '#lib/utilities/add-builder-localizations';
import { parse } from '#lib/utilities/serialized-emoji';
import { channelMention, inlineCode } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { err, fromAsync, ok } from '@sapphire/result';
import { Command, RegisterCommand, RegisterSubCommand, TransformedArguments } from '@skyra/http-framework';
import { getSupportedUserLanguageT, resolveUserKey } from '@skyra/http-framework-i18n';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	apply(builder, LanguageKeys.Commands.Config.RootName, LanguageKeys.Commands.Config.RootDescription)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false)
)
export class UserCommand extends Command {
	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Config.Edit)
			.addBooleanOption((input) =>
				apply(input, LanguageKeys.Commands.Config.KeyAutoThread, LanguageKeys.Commands.Config.EditOptionsAutoThreadDescription)
			)
			.addBooleanOption((input) =>
				apply(input, LanguageKeys.Commands.Config.KeyButtons, LanguageKeys.Commands.Config.EditOptionsButtonsDescription)
			)
			.addChannelOption((input) =>
				apply(input, LanguageKeys.Commands.Config.KeyChannel, LanguageKeys.Commands.Config.EditOptionsChannelDescription) //
					.addChannelTypes(ChannelType.GuildText)
			)
			.addBooleanOption((input) =>
				apply(input, LanguageKeys.Commands.Config.KeyCompact, LanguageKeys.Commands.Config.EditOptionsCompactDescription)
			)
			.addBooleanOption((input) =>
				apply(
					input,
					LanguageKeys.Commands.Config.KeyDisplayUpdateHistory,
					LanguageKeys.Commands.Config.EditOptionsDisplayUpdateHistoryDescription
				)
			)
			.addBooleanOption((input) =>
				apply(input, LanguageKeys.Commands.Config.KeyEmbed, LanguageKeys.Commands.Config.EditOptionsEmbedDescription)
			)
			.addStringOption((input) =>
				apply(input, LanguageKeys.Commands.Config.KeyReactions, LanguageKeys.Commands.Config.EditOptionsReactionsDescription)
			)
			.addBooleanOption((input) =>
				apply(input, LanguageKeys.Commands.Config.KeyRemoveReactions, LanguageKeys.Commands.Config.EditOptionsRemoveReactionsDescription)
			)
	)
	public async runEdit(interaction: Command.Interaction, options: EditOptions): Command.AsyncResponse {
		const entries: [keyof Guild, Guild[keyof Guild]][] = [];

		// Reactions have an extra validation step, so it will run the first to prevent needless processing:
		if (isDefined(options.reactions)) {
			const result = this.parseReactionsString(interaction, options.reactions);
			if (!result.success) return this.message({ content: result.error, flags: MessageFlags.Ephemeral });

			entries.push(['reactions', result.success]);
		}

		if (isDefined(options['auto-thread'])) entries.push(['autoThread', options['auto-thread']]);
		if (isDefined(options.buttons)) entries.push(['buttons', options.buttons]);
		if (isDefined(options.channel)) entries.push(['channel', BigInt(options.channel.id)]);
		if (isDefined(options.compact)) entries.push(['compact', options.compact]);
		if (isDefined(options['display-update-history'])) entries.push(['displayUpdateHistory', options['display-update-history']]);
		if (isDefined(options.embed)) entries.push(['embed', options.embed]);
		if (isDefined(options['remove-reactions'])) entries.push(['removeReactions', options['remove-reactions']]);

		return this.updateDatabase(interaction, Object.fromEntries(entries));
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Config.Reset).addStringOption((input) =>
			apply(input, LanguageKeys.Commands.Config.ResetOptionsKey)
				.addChoices(
					makeName(LanguageKeys.Commands.Config.ResetOptionsKeyChoicesAll, { value: 'all' }),
					makeName(LanguageKeys.Commands.Config.KeyAutoThread, { value: 'auto-thread' }),
					makeName(LanguageKeys.Commands.Config.KeyButtons, { value: 'buttons' }),
					makeName(LanguageKeys.Commands.Config.KeyChannel, { value: 'channel' }),
					makeName(LanguageKeys.Commands.Config.KeyCompact, { value: 'compact' }),
					makeName(LanguageKeys.Commands.Config.KeyDisplayUpdateHistory, { value: 'display-update-history' }),
					makeName(LanguageKeys.Commands.Config.KeyEmbed, { value: 'embed' }),
					makeName(LanguageKeys.Commands.Config.KeyReactions, { value: 'reactions' }),
					makeName(LanguageKeys.Commands.Config.KeyRemoveReactions, { value: 'remove-reactions' })
				)
				.setRequired(true)
		)
	)
	public runReset(interaction: Command.Interaction, options: ResetOptions): Command.AsyncResponse {
		switch (options.key) {
			case 'all': {
				const data: Omit<Required<Guild>, 'id'> = {
					autoThread: false,
					buttons: true,
					channel: null,
					compact: false,
					displayUpdateHistory: false,
					embed: true,
					reactions: [],
					removeReactions: false
				};
				return this.updateDatabase(interaction, data);
			}
			case 'auto-thread':
				return this.updateDatabase(interaction, { autoThread: false });
			case 'buttons':
				return this.updateDatabase(interaction, { buttons: true });
			case 'channel':
				return this.updateDatabase(interaction, { channel: null });
			case 'compact':
				return this.updateDatabase(interaction, { compact: false });
			case 'display-update-history':
				return this.updateDatabase(interaction, { displayUpdateHistory: false });
			case 'embed':
				return this.updateDatabase(interaction, { embed: true });
			case 'reactions':
				return this.updateDatabase(interaction, { reactions: [] });
			case 'remove-reactions':
				return this.updateDatabase(interaction, { removeReactions: false });
		}
	}

	@RegisterSubCommand((builder) => apply(builder, LanguageKeys.Commands.Config.View))
	public async runView(interaction: Command.Interaction): Command.AsyncResponse {
		const id = BigInt(interaction.guild_id!);
		const settings = await this.container.prisma.guild.findUnique({ where: { id } });

		const content = this.viewGenerateContent(interaction, settings);
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private viewGenerateContent(interaction: Command.Interaction, settings?: Partial<Guild> | null) {
		settings ??= {};

		const t = getSupportedUserLanguageT(interaction);
		const bool = [inlineCode(t(LanguageKeys.Shared.Disabled)), inlineCode(t(LanguageKeys.Shared.Enabled))];

		const channel = settings.channel ? channelMention(settings.channel.toString()) : inlineCode(t(LanguageKeys.Shared.Unset));
		const autoThread = bool[Number(settings.autoThread ?? false)];
		const buttons = bool[Number(settings.buttons ?? true)];
		const compact = bool[Number(settings.compact ?? false)];
		const displayUpdateHistory = bool[Number(settings.displayUpdateHistory ?? false)];
		const embed = bool[Number(settings.embed ?? true)];
		const reactions = settings.reactions?.length ? settings.reactions.join(' ') : inlineCode(t(LanguageKeys.Shared.None));

		return t(LanguageKeys.Commands.Config.ViewContent, { channel, autoThread, buttons, compact, displayUpdateHistory, embed, reactions });
	}

	private async updateDatabase(interaction: Command.Interaction, data: Partial<Guild>) {
		const id = BigInt(interaction.guild_id!);
		const result = await fromAsync(this.container.prisma.guild.upsert({ where: { id }, create: { id, ...data }, update: data, select: null }));

		const key = result.success ? LanguageKeys.Commands.Config.EditSuccess : LanguageKeys.Commands.Config.EditFailure;
		const content = resolveUserKey(interaction, key);
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private parseReactionsString(interaction: Command.Interaction, input: string) {
		const reactions = input.split(' ');
		if (reactions.length > 3) return err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditReactionsInvalidAmount));

		const entries: string[] = [];
		for (const reaction of reactions) {
			const parsed = parse(reaction);
			if (parsed === null) return err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditReactionsInvalidEmoji, { value: reaction }));

			entries.push(parsed);
		}

		return ok(entries);
	}
}

interface EditOptions {
	channel?: TransformedArguments.Channel;
	'auto-thread'?: boolean;
	buttons?: boolean;
	compact?: boolean;
	'display-update-history'?: boolean;
	embed?: boolean;
	reactions?: string;
	'remove-reactions'?: boolean;
}

interface ResetOptions {
	key: 'all' | keyof EditOptions;
}
