import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply } from '#lib/utilities/add-builder-localizations';
import { getTextFormat, parse, type SerializedEmoji } from '#lib/utilities/serialized-emoji';
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
		.addSubcommandGroup((group) => apply(group, LanguageKeys.Commands.Config.Edit))
		.addSubcommandGroup((group) => apply(group, LanguageKeys.Commands.Config.View))
		.addSubcommandGroup((group) => apply(group, LanguageKeys.Commands.Config.Reset))
)
export class UserCommand extends Command {
	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.ChannelName, LanguageKeys.Commands.Config.EditChannelDescription) //
				.addChannelOption((input) =>
					apply(input, LanguageKeys.Commands.Config.SharedValue) //
						.addChannelTypes(ChannelType.GuildText)
						.setRequired(true)
				),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.ChannelName, LanguageKeys.Commands.Config.ViewChannelDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.ChannelName, LanguageKeys.Commands.Config.ResetChannelDescription),
		'reset'
	)
	public handleChannel(interaction: Command.Interaction, options: Options<'channel', TransformedArguments.Channel>): Command.AsyncResponse {
		return options.subCommandGroup === 'view'
			? this.sharedView(interaction, (settings) => this.displayChannel(interaction, settings?.channel?.toString()))
			: this.editConfiguration(interaction, { channel: options.subCommandGroup === 'reset' ? null : BigInt(options.value.id) });
	}

	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.AddThreadName, LanguageKeys.Commands.Config.EditAddThreadDescription) //
				.addBooleanOption((input) => apply(input, LanguageKeys.Commands.Config.SharedValue).setRequired(true)),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.AddThreadName, LanguageKeys.Commands.Config.ViewAddThreadDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.AddThreadName, LanguageKeys.Commands.Config.ResetAddThreadDescription),
		'reset'
	)
	public handleAddThread(interaction: Command.Interaction, options: Options<'add-thread', boolean>): Command.AsyncResponse {
		return options.subCommandGroup === 'view'
			? this.sharedView(interaction, (settings) => this.displayBooleanDefaultsDisabled(interaction, settings?.addThread))
			: this.editConfiguration(interaction, { addThread: options.subCommandGroup === 'reset' ? false : options.value });
	}

	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.AddButtonsName, LanguageKeys.Commands.Config.EditAddButtonsDescription) //
				.addBooleanOption((input) => apply(input, LanguageKeys.Commands.Config.SharedValue).setRequired(true)),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.AddButtonsName, LanguageKeys.Commands.Config.ViewAddButtonsDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.AddButtonsName, LanguageKeys.Commands.Config.ResetAddButtonsDescription),
		'reset'
	)
	public handleAddButtons(interaction: Command.Interaction, options: Options<'add-buttons', boolean>): Command.AsyncResponse {
		return options.subCommandGroup === 'view'
			? this.sharedView(interaction, (settings) => this.displayBooleanDefaultsEnabled(interaction, settings?.addButtons))
			: this.editConfiguration(interaction, { addButtons: options.subCommandGroup === 'reset' ? true : options.value });
	}

	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.AddUpdateHistoryName, LanguageKeys.Commands.Config.EditAddUpdateHistoryDescription) //
				.addBooleanOption((input) => apply(input, LanguageKeys.Commands.Config.SharedValue).setRequired(true)),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.AddUpdateHistoryName, LanguageKeys.Commands.Config.ViewAddUpdateHistoryDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.AddUpdateHistoryName, LanguageKeys.Commands.Config.ResetAddUpdateHistoryDescription),
		'reset'
	)
	public handleAddUpdateHistory(interaction: Command.Interaction, options: Options<'add-update-history', boolean>): Command.AsyncResponse {
		return options.subCommandGroup === 'view'
			? this.sharedView(interaction, (settings) => this.displayBooleanDefaultsDisabled(interaction, settings?.addUpdateHistory))
			: this.editConfiguration(interaction, { addUpdateHistory: options.subCommandGroup === 'reset' ? false : options.value });
	}

	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.UseEmbedName, LanguageKeys.Commands.Config.EditUseEmbedDescription) //
				.addBooleanOption((input) => apply(input, LanguageKeys.Commands.Config.SharedValue).setRequired(true)),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.UseEmbedName, LanguageKeys.Commands.Config.ViewUseEmbedDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.UseEmbedName, LanguageKeys.Commands.Config.ResetUseEmbedDescription),
		'reset'
	)
	public handleUseEmbed(interaction: Command.Interaction, options: Options<'use-embed', boolean>): Command.AsyncResponse {
		return options.subCommandGroup === 'view'
			? this.sharedView(interaction, (settings) => this.displayBooleanDefaultsEnabled(interaction, settings?.useEmbed))
			: this.editConfiguration(interaction, { useEmbed: options.subCommandGroup === 'reset' ? true : options.value });
	}

	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.UseCompactName, LanguageKeys.Commands.Config.EditUseCompactDescription) //
				.addBooleanOption((input) => apply(input, LanguageKeys.Commands.Config.SharedValue).setRequired(true)),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.UseCompactName, LanguageKeys.Commands.Config.ViewUseCompactDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.UseCompactName, LanguageKeys.Commands.Config.ResetUseCompactDescription),
		'reset'
	)
	public async handleUseCompact(interaction: Command.Interaction, options: Options<'use-compact', boolean>): Command.AsyncResponse {
		return options.subCommandGroup === 'view'
			? this.sharedView(interaction, (settings) => this.displayBooleanDefaultsDisabled(interaction, settings?.useCompact))
			: this.editConfiguration(interaction, { useCompact: options.subCommandGroup === 'reset' ? false : options.value });
	}

	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.UseReactionsName, LanguageKeys.Commands.Config.EditUseReactionsDescription)
				.addStringOption((input) => apply(input, LanguageKeys.Commands.Config.SharedValue).setRequired(true))
				.addStringOption((input) => apply(input, LanguageKeys.Commands.Config.SharedSecondValue))
				.addStringOption((input) => apply(input, LanguageKeys.Commands.Config.SharedThirdValue)),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.UseReactionsName, LanguageKeys.Commands.Config.ViewUseReactionsDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.UseReactionsName, LanguageKeys.Commands.Config.ResetUseReactionsDescription),
		'reset'
	)
	public async handleUseReactions(interaction: Command.Interaction, options: UseReactionsOptions): Command.AsyncResponse {
		if (options.subCommandGroup === 'view') return this.viewUseReactions(interaction);
		if (options.subCommandGroup === 'reset') return this.editConfiguration(interaction, { useReactions: [] });

		const first = this.parseEmoji(interaction, options.value);
		if (!first.success) return this.message({ content: first.error, flags: MessageFlags.Ephemeral });

		const second = this.parseEmoji(interaction, options['second-value']);
		if (!second.success) return this.message({ content: second.error, flags: MessageFlags.Ephemeral });

		const third = this.parseEmoji(interaction, options['third-value']);
		if (!third.success) return this.message({ content: third.error, flags: MessageFlags.Ephemeral });

		const reactions = [first.value!];
		if (second.value) reactions.push(second.value);
		if (third.value) reactions.push(third.value);
		return this.editConfiguration(interaction, { useReactions: reactions });
	}

	@RegisterSubCommand(
		(builder) =>
			apply(builder, LanguageKeys.Commands.Config.RemoveReactionsName, LanguageKeys.Commands.Config.EditRemoveReactionsDescription) //
				.addBooleanOption((input) => apply(input, LanguageKeys.Commands.Config.SharedValue).setRequired(true)),
		'edit'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.RemoveReactionsName, LanguageKeys.Commands.Config.ViewRemoveReactionsDescription),
		'view'
	)
	@RegisterSubCommand(
		(builder) => apply(builder, LanguageKeys.Commands.Config.RemoveReactionsName, LanguageKeys.Commands.Config.ResetRemoveReactionsDescription),
		'reset'
	)
	public async handleRemoveReactions(interaction: Command.Interaction, options: Options<'remove-reactions', boolean>): Command.AsyncResponse {
		return options.subCommandGroup === 'view'
			? this.sharedView(interaction, (settings) => this.displayBooleanDefaultsDisabled(interaction, settings?.removeReactions))
			: this.editConfiguration(interaction, { removeReactions: options.subCommandGroup === 'reset' ? false : options.value });
	}

	private async editConfiguration(interaction: Command.Interaction, data: Partial<Guild>) {
		const id = BigInt(interaction.guild_id!);
		const result = await fromAsync(this.container.prisma.guild.upsert({ where: { id }, create: { id, ...data }, update: data, select: null }));
		const key = result.success ? LanguageKeys.Commands.Config.EditSuccess : LanguageKeys.Commands.Config.EditFailure;
		const content = resolveUserKey(interaction, key);
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private async sharedView(interaction: Command.Interaction, cb: (settings: Guild | null) => string) {
		const id = BigInt(interaction.guild_id!);
		const value = cb(await this.container.prisma.guild.findUnique({ where: { id } }));
		const content = resolveUserKey(interaction, LanguageKeys.Commands.Config.ViewContent, { value });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private displayChannel(interaction: Command.Interaction, channelId: string | undefined) {
		return channelId ? channelMention(channelId) : inlineCode(resolveUserKey(interaction, LanguageKeys.Shared.Unset));
	}

	private displayBooleanDefaultsEnabled(interaction: Command.Interaction, value: boolean | undefined = true) {
		return inlineCode(resolveUserKey(interaction, value ? LanguageKeys.Shared.Enabled : LanguageKeys.Shared.Disabled));
	}

	private displayBooleanDefaultsDisabled(interaction: Command.Interaction, value: boolean | undefined = false) {
		return inlineCode(resolveUserKey(interaction, value ? LanguageKeys.Shared.Enabled : LanguageKeys.Shared.Disabled));
	}

	private async viewUseReactions(interaction: Command.Interaction) {
		const id = BigInt(interaction.guild_id!);
		const settings = await this.container.prisma.guild.findUnique({ where: { id } });

		const content = this.displayEmojisGetContent(interaction, (settings?.useReactions ?? []) as SerializedEmoji[]);
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private displayEmojisGetContent(interaction: Command.Interaction, reactions: SerializedEmoji[]) {
		const t = getSupportedUserLanguageT(interaction);

		if (reactions.length === 0) {
			const key = LanguageKeys.Commands.Config.ViewContent;
			return t(key, { value: inlineCode(t(LanguageKeys.Shared.Unset)) });
		}

		const mapped = reactions.map(getTextFormat);
		if (reactions.length === 1) {
			const key = LanguageKeys.Commands.Config.ViewContent;
			return t(key, { value: mapped[0] });
		}

		if (reactions.length === 2) {
			const key = LanguageKeys.Commands.Config.ViewUseReactionsTwo;
			return t(key, { first: mapped[0], second: mapped[1] });
		}

		const key = LanguageKeys.Commands.Config.ViewUseReactionsThree;
		return t(key, { first: mapped[0], second: mapped[1], third: mapped[2] });
	}

	private parseEmoji(interaction: Command.Interaction, value: string | undefined) {
		if (value === undefined) return ok(null);

		const first = parse(value);
		return first === null ? err(resolveUserKey(interaction, LanguageKeys.Commands.Config.EditUseReactionsInvalidEmoji, { value })) : ok(first);
	}
}

type Options<T extends string, V, E extends string = ''> = (EditOptions<T> & { value: V } & Record<E, V>) | ViewOptions<T> | ResetOptions<T>;

interface EditOptions<T extends string> {
	subCommand: T;
	subCommandGroup: 'edit';
}
interface ViewOptions<T extends string> {
	subCommand: T;
	subCommandGroup: 'view';
}
interface ResetOptions<T extends string> {
	subCommand: T;
	subCommandGroup: 'reset';
}

type UseReactionsOptions = Options<'use-reactions', string, 'second-value' | 'third-value'>;
