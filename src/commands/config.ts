import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply } from '#lib/utilities/add-builder-localizations';
import { Command, RegisterCommand, RegisterSubCommand, TransformedArguments } from '@skyra/http-framework';
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
	public handleChannel(_interaction: Command.Interaction, options: Options<'channel', TransformedArguments.Channel>): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: JSON.stringify(options), flags: MessageFlags.Ephemeral }));
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
	public handleAddThread(_interaction: Command.Interaction, options: Options<'add-thread', boolean>): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: JSON.stringify(options), flags: MessageFlags.Ephemeral }));
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
	public handleAddButtons(_interaction: Command.Interaction, options: Options<'add-buttons', boolean>): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: JSON.stringify(options), flags: MessageFlags.Ephemeral }));
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
	public handleAddUpdateHistory(_interaction: Command.Interaction, options: Options<'add-update-history', boolean>): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: JSON.stringify(options), flags: MessageFlags.Ephemeral }));
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
	public handleUseEmbed(_interaction: Command.Interaction, options: Options<'use-embed', boolean>): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: JSON.stringify(options), flags: MessageFlags.Ephemeral }));
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
	public handleUseCompact(_interaction: Command.Interaction, options: Options<'use-compact', boolean>): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: JSON.stringify(options), flags: MessageFlags.Ephemeral }));
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
}

type Options<T extends string, V, E extends string = ''> = (EditOptions<T> & { value: V } & Record<E, V>) | ViewOptions<T> | ResetOptions<T>;

interface EditOptions<T extends string> {
	/**
	 * The name of the subcommand that was used by the user, if any.
	 */
	subCommand: 'edit';
	/**
	 * The name of the subcommand group that was used by the user, if any.
	 */
	subCommandGroup: T;
}
interface ViewOptions<T extends string> {
	/**
	 * The name of the subcommand that was used by the user, if any.
	 */
	subCommand: 'view';
	/**
	 * The name of the subcommand group that was used by the user, if any.
	 */
	subCommandGroup: T;
}
interface ResetOptions<T extends string> {
	/**
	 * The name of the subcommand that was used by the user, if any.
	 */
	subCommand: 'reset';
	/**
	 * The name of the subcommand group that was used by the user, if any.
	 */
	subCommandGroup: T;
}

type UseReactionsOptions = Options<'use-reactions', string, 'second-value' | 'third-value'>;
