import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { applyLocalizations } from '#lib/utilities/add-builder-localizations';
import { Command, RegisterCommand, RegisterSubCommand } from '@skyra/http-framework';
import { MessageFlags, PermissionFlagsBits } from 'discord-api-types/v10';

@RegisterCommand((builder) =>
	applyLocalizations(LanguageKeys.Commands.Suggestions.Resolve, builder)
		.setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
		.setDMPermission(false)
)
export class UserCommand extends Command {
	@RegisterSubCommand((builder) =>
		applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveAccept, builder)
			.addIntegerOption((option) => applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveOptionsId, option).setRequired(true))
			.addStringOption((option) => applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveOptionsResponse, option))
	)
	public handleAccept(_interaction: Command.Interaction, _options: Options): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: 'TODO', flags: MessageFlags.Ephemeral }));
	}

	@RegisterSubCommand((builder) =>
		applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveConsider, builder)
			.addIntegerOption((option) => applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveOptionsId, option).setRequired(true))
			.addStringOption((option) => applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveOptionsResponse, option))
	)
	public handleConsider(_interaction: Command.Interaction, _options: Options): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: 'TODO', flags: MessageFlags.Ephemeral }));
	}

	@RegisterSubCommand((builder) =>
		applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveDeny, builder)
			.addIntegerOption((option) => applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveOptionsId, option).setRequired(true))
			.addStringOption((option) => applyLocalizations(LanguageKeys.Commands.Suggestions.ResolveOptionsResponse, option))
	)
	public handleDeny(_interaction: Command.Interaction, _options: Options): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: 'TODO', flags: MessageFlags.Ephemeral }));
	}
}

interface Options {
	suggestion?: string;
	id?: number;
}
