import { FT, T } from '@skyra/http-framework-i18n';

export const Suggest = 'commands:suggestions/suggest';
export const SuggestOptionsSuggestion = 'commands:suggestions/suggestOptionsSuggestion';
export const SuggestOptionsId = 'commands:suggestions/suggestOptionsId';
export const SuggestModifyDoesNotExist = T('commands:suggestions/suggestModifyDoesNotExist');
export const SuggestModifyArchived = T('commands/suggestions/suggestModifyArchived');
export const SuggestModifyReplied = T('commands/suggestions/suggestModifyReplied');
export const SuggestNewNotConfigured = T('commands:suggestions/suggestNewNotConfigured');
export const SuggestNewMessageContent = FT<MessageData>('commands:suggestions/suggestNewMessageContent');
export const SuggestNewMessageEmbedTitle = FT<MessageData>('commands:suggestions/suggestNewMessageEmbedTitle');
export const SuggestComponentsAccept = T('commands:suggestions/suggestComponentsAccept');
export const SuggestComponentsConsider = T('commands:suggestions/suggestComponentsConsider');
export const SuggestComponentsDeny = T('commands:suggestions/suggestComponentsDeny');
export const SuggestComponentsCreateThread = T('commands:suggestions/suggestComponentsCreateThread');
export const SuggestComponentsArchive = T('commands:suggestions/suggestComponentsArchive');

export interface MessageData {
	id: number;
	timestamp: `<t:${bigint}>`;
	user: {
		id: string;
		username: string;
		discriminator: string;
		mention: `<@${string}>`;
	};
	message: string;
}
