import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { getTextFormat, parse, type SerializedEmoji } from '#lib/utilities/serialized-emoji';
import { channelMention, inlineCode } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { Duration, Time } from '@sapphire/duration';
import { err, ok, Result } from '@sapphire/result';
import { isNullish, isNullishOrZero } from '@sapphire/utilities';
import { Command, RegisterCommand, RegisterSubCommand, TransformedArguments } from '@skyra/http-framework';
import { applyLocalizedBuilder, createSelectMenuChoiceName, getSupportedUserLanguageT, resolveUserKey, TFunction } from '@skyra/http-framework-i18n';
import { ChannelType, MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	applyLocalizedBuilder(builder, LanguageKeys.Commands.Config.RootName, LanguageKeys.Commands.Config.RootDescription)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
		.setDMPermission(false)
)
export class UserCommand extends Command {
	@RegisterSubCommand((builder) =>
		applyLocalizedBuilder(builder, LanguageKeys.Commands.Config.Edit)
			.addBooleanOption((input) =>
				applyLocalizedBuilder(
					input,
					LanguageKeys.Commands.Config.KeyAutoThread,
					LanguageKeys.Commands.Config.EditOptionsAutoThreadDescription
				)
			)
			.addBooleanOption((input) =>
				applyLocalizedBuilder(input, LanguageKeys.Commands.Config.KeyButtons, LanguageKeys.Commands.Config.EditOptionsButtonsDescription)
			)
			.addChannelOption((input) =>
				applyLocalizedBuilder(input, LanguageKeys.Commands.Config.KeyChannel, LanguageKeys.Commands.Config.EditOptionsChannelDescription) //
					.addChannelTypes(ChannelType.GuildText)
			)
			.addBooleanOption((input) =>
				applyLocalizedBuilder(input, LanguageKeys.Commands.Config.KeyCompact, LanguageKeys.Commands.Config.EditOptionsCompactDescription)
			)
			.addStringOption((input) =>
				applyLocalizedBuilder(input, LanguageKeys.Commands.Config.KeyCooldown, LanguageKeys.Commands.Config.EditOptionsCooldownDescription)
			)
			.addBooleanOption((input) =>
				applyLocalizedBuilder(
					input,
					LanguageKeys.Commands.Config.KeyDisplayUpdateHistory,
					LanguageKeys.Commands.Config.EditOptionsDisplayUpdateHistoryDescription
				)
			)
			.addBooleanOption((input) =>
				applyLocalizedBuilder(input, LanguageKeys.Commands.Config.KeyEmbed, LanguageKeys.Commands.Config.EditOptionsEmbedDescription)
			)
			.addStringOption((input) =>
				applyLocalizedBuilder(input, LanguageKeys.Commands.Config.KeyReactions, LanguageKeys.Commands.Config.EditOptionsReactionsDescription)
			)
			.addBooleanOption((input) =>
				applyLocalizedBuilder(
					input,
					LanguageKeys.Commands.Config.KeyRemoveReactions,
					LanguageKeys.Commands.Config.EditOptionsRemoveReactionsDescription
				)
			)
	)
	public async runEdit(interaction: Command.ChatInputInteraction, options: EditOptions) {
		const entries: [keyof Guild, Guild[keyof Guild]][] = [];

		// Reactions have an extra validation step, so it will run the first to prevent needless processing:
		if (!isNullish(options.reactions)) {
			const result = this.parseReactionsString(interaction, options.reactions);
			if (result.isErr()) return interaction.reply({ content: result.unwrapErr(), flags: MessageFlags.Ephemeral });

			entries.push(['reactions', result.unwrap()]);
		}
		if (!isNullish(options.cooldown)) {
			const result = this.parseCooldownString(interaction, options.cooldown);
			if (result.isErr()) return interaction.reply({ content: result.unwrapErr(), flags: MessageFlags.Ephemeral });

			entries.push(['cooldown', result.unwrap()]);
		}

		if (!isNullish(options['auto-thread'])) entries.push(['autoThread', options['auto-thread']]);
		if (!isNullish(options.buttons)) entries.push(['buttons', options.buttons]);
		if (!isNullish(options.channel)) entries.push(['channel', BigInt(options.channel.id)]);
		if (!isNullish(options.compact)) entries.push(['compact', options.compact]);
		if (!isNullish(options['display-update-history'])) entries.push(['displayUpdateHistory', options['display-update-history']]);
		if (!isNullish(options.embed)) entries.push(['embed', options.embed]);
		if (!isNullish(options['remove-reactions'])) entries.push(['removeReactions', options['remove-reactions']]);

		return this.updateDatabase(interaction, Object.fromEntries(entries));
	}

	@RegisterSubCommand((builder) =>
		applyLocalizedBuilder(builder, LanguageKeys.Commands.Config.Reset).addStringOption((input) =>
			applyLocalizedBuilder(input, LanguageKeys.Commands.Config.ResetOptionsKey)
				.addChoices(
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.ResetOptionsKeyChoicesAll, { value: 'all' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyAutoThread, { value: 'auto-thread' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyButtons, { value: 'buttons' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyChannel, { value: 'channel' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyCompact, { value: 'compact' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyCooldown, { value: 'cooldown' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyDisplayUpdateHistory, { value: 'display-update-history' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyEmbed, { value: 'embed' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyReactions, { value: 'reactions' }),
					createSelectMenuChoiceName(LanguageKeys.Commands.Config.KeyRemoveReactions, { value: 'remove-reactions' })
				)
				.setRequired(true)
		)
	)
	public runReset(interaction: Command.ChatInputInteraction, options: ResetOptions) {
		switch (options.key) {
			case 'all': {
				const data: Omit<Required<Guild>, 'id'> = {
					autoThread: false,
					buttons: true,
					channel: null,
					compact: false,
					cooldown: 0,
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
			case 'cooldown':
				return this.updateDatabase(interaction, { cooldown: 0 });
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

	@RegisterSubCommand((builder) => applyLocalizedBuilder(builder, LanguageKeys.Commands.Config.View))
	public async runView(interaction: Command.ChatInputInteraction) {
		const id = BigInt(interaction.guild_id!);
		const settings = await this.container.prisma.guild.findUnique({ where: { id } });

		const content = this.viewGenerateContent(interaction, settings);
		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private viewGenerateContent(interaction: Command.ChatInputInteraction, settings?: Partial<Guild> | null) {
		settings ??= {};

		const t = getSupportedUserLanguageT(interaction);
		const bool = [inlineCode(t(LanguageKeys.Shared.Disabled)), inlineCode(t(LanguageKeys.Shared.Enabled))];

		const channel = settings.channel ? channelMention(settings.channel.toString()) : inlineCode(t(LanguageKeys.Shared.Unset));
		const autoThread = bool[Number(settings.autoThread ?? false)];
		const buttons = bool[Number(settings.buttons ?? true)];
		const compact = bool[Number(settings.compact ?? false)];
		const cooldown = inlineCode(this.getCooldownContent(t, settings.cooldown ?? 0));
		const displayUpdateHistory = bool[Number(settings.displayUpdateHistory ?? false)];
		const embed = bool[Number(settings.embed ?? true)];
		const reactions = settings.reactions?.length
			? settings.reactions.map((reaction) => getTextFormat(reaction as SerializedEmoji)).join(' ')
			: inlineCode(t(LanguageKeys.Shared.None));

		return t(LanguageKeys.Commands.Config.ViewContent, {
			channel,
			autoThread,
			buttons,
			compact,
			cooldown,
			displayUpdateHistory,
			embed,
			reactions
		});
	}

	private getCooldownContent(t: TFunction, cooldown: number) {
		if (isNullishOrZero(cooldown)) return t(LanguageKeys.Shared.None);

		const list = [] as string[];
		for (const [ms, unit] of UserCommand.CooldownUnits) {
			if (cooldown < ms) continue;

			list.push(new Intl.NumberFormat(t.lng, { unit, style: 'unit', unitDisplay: 'long' }).format(Math.floor(cooldown / ms)));
			cooldown %= ms;
		}

		return new Intl.ListFormat(t.lng, { type: 'conjunction' }).format(list);
	}

	private async updateDatabase(interaction: Command.ChatInputInteraction, data: Partial<Guild>) {
		const id = BigInt(interaction.guild_id!);
		const result = await Result.fromAsync(
			this.container.prisma.guild.upsert({ where: { id }, create: { id, ...data }, update: data, select: null })
		);

		const content = result.match({
			ok: () => resolveUserKey(interaction, LanguageKeys.Commands.Config.EditSuccess),
			err: (error) => {
				this.container.logger.error(error);
				return resolveUserKey(interaction, LanguageKeys.Commands.Config.EditFailure);
			}
		});

		return interaction.reply({ content, flags: MessageFlags.Ephemeral });
	}

	private parseReactionsString(interaction: Command.ChatInputInteraction, input: string) {
		const reactions = input.split(' ');
		if (reactions.length > 3) {
			return Result.err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditReactionsInvalidAmount));
		}

		const entries: string[] = [];
		for (const reaction of reactions) {
			const parsed = parse(reaction);
			if (parsed === null) {
				return err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditReactionsInvalidEmoji, { value: reaction }));
			}

			entries.push(parsed);
		}

		return ok(entries);
	}

	private parseCooldownString(interaction: Command.ChatInputInteraction, input: string) {
		const { offset } = new Duration(input);
		if (!Number.isInteger(offset)) {
			return err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditCooldownInvalidDuration, { value: input }));
		}
		if (offset < Time.Second) return err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditCooldownDurationTooShort));
		if (offset > Time.Hour * 6) return err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditCooldownDurationTooLong));

		return ok(offset);
	}

	private static CooldownUnits = [
		[Time.Hour, 'hour'],
		[Time.Minute, 'minute'],
		[Time.Second, 'second']
	] as const satisfies readonly (readonly [Time, string])[];
}

interface EditOptions {
	channel?: TransformedArguments.Channel;
	'auto-thread'?: boolean;
	buttons?: boolean;
	compact?: boolean;
	cooldown?: string;
	'display-update-history'?: boolean;
	embed?: boolean;
	reactions?: string;
	'remove-reactions'?: boolean;
}

interface ResetOptions {
	key: 'all' | keyof EditOptions;
}
