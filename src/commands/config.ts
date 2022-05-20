import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply } from '#lib/utilities/add-builder-localizations';
import { channelMention, inlineCode } from '@discordjs/builders';
import type { Guild } from '@prisma/client';
import { fromAsync } from '@sapphire/result';
import { Command, RegisterCommand, RegisterSubCommand, TransformedArguments } from '@skyra/http-framework';
import { resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';
import { ChannelType } from 'discord-api-types/v9';

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
	public handleUseReactions(_interaction: Command.Interaction, options: UseReactionsOptions): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: JSON.stringify(options), flags: MessageFlags.Ephemeral }));
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
		const value = cb(await this.container.prisma.guild.findUnique({ where: { id }, rejectOnNotFound: false }));
		const content = resolveUserKey(interaction, LanguageKeys.Commands.Config.ViewContent, { value });
		return this.message({ content, flags: MessageFlags.Ephemeral });
	}

	private displayChannel(interaction: Command.Interaction, channelId: string | undefined) {
		return channelId ? channelMention(channelId) : inlineCode(resolveUserKey(interaction, LanguageKeys.Shared.Unset));
	}

	private displayBooleanDefaultsEnabled(interaction: Command.Interaction, value: boolean | undefined = true) {
		return inlineCode(resolveUserKey(interaction, value ? LanguageKeys.Shared.Enabled : LanguageKeys.Shared.Enabled));
	}

	private displayBooleanDefaultsDisabled(interaction: Command.Interaction, value: boolean | undefined = false) {
		return inlineCode(resolveUserKey(interaction, value ? LanguageKeys.Shared.Enabled : LanguageKeys.Shared.Enabled));
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
