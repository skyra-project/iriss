import { LanguageKeys } from '#lib/i18n/LanguageKeys';
import { applyNameAndDescription } from '#lib/utilities/add-builder-localizations';
import { Command, RegisterCommand } from '@skyra/http-framework';
import { resolveUserKey } from '@skyra/http-framework-i18n';
import { MessageFlags } from 'discord-api-types/v10';

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

	private async handleNew(_interaction: Command.Interaction, input: string) {
		await Promise.resolve();
		return this.message({ content: `TODO: ${input}` });
	}

	private async handleEdit(interaction: Command.Interaction, id: number, input: string) {
		const suggestion = await this.container.prisma.suggestion.findUnique({
			where: {
				id_guildId: {
					id,
					guildId: BigInt(interaction.guild_id!)
				}
			}
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
