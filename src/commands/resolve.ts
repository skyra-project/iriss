import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { apply } from '#lib/utilities/add-builder-localizations';
import { Command, RegisterCommand, RegisterSubCommand } from '@skyra/http-framework';
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
	public handleAccept(_interaction: Command.Interaction, _options: Options): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: 'TODO', flags: MessageFlags.Ephemeral }));
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Suggestions.ResolveConsider)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsResponse))
	)
	public handleConsider(_interaction: Command.Interaction, _options: Options): Command.AsyncResponse {
		// TODO: Finish logic
		return Promise.resolve(this.message({ content: 'TODO', flags: MessageFlags.Ephemeral }));
	}

	@RegisterSubCommand((builder) =>
		apply(builder, LanguageKeys.Commands.Suggestions.ResolveDeny)
			.addIntegerOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsId).setRequired(true))
			.addStringOption((option) => apply(option, LanguageKeys.Commands.Suggestions.ResolveOptionsResponse))
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
