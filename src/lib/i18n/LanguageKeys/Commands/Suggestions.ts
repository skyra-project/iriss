import { FT, T } from '@skyra/http-framework-i18n';

export const Resolve = 'commands/suggestions:resolve';
export const ResolveAccept = 'commands/suggestions:resolveAccept';
export const ResolveConsider = 'commands/suggestions:resolveConsider';
export const ResolveDeny = 'commands/suggestions:resolveDeny';
export const ResolveOptionsId = 'commands/suggestions:resolveOptionsId';
export const ResolveOptionsResponse = 'commands/suggestions:resolveOptionsResponse';
export const Suggest = 'commands/suggestions:suggest';
export const SuggestComponentsAccept = T('commands/suggestions:suggestComponentsAccept');
export const SuggestComponentsArchive = T('commands/suggestions:suggestComponentsArchive');
export const SuggestComponentsConsider = T('commands/suggestions:suggestComponentsConsider');
export const SuggestComponentsCreateThread = T('commands/suggestions:suggestComponentsCreateThread');
export const SuggestComponentsDeny = T('commands/suggestions:suggestComponentsDeny');
export const SuggestModifyArchived = T('commands/suggestions:suggestModifyArchived');
export const SuggestModifyDoesNotExist = T('commands/suggestions:suggestModifyDoesNotExist');
export const SuggestModifyMessageDeleted = T('commands/suggestions:suggestModifyMessageDeleted');
export const SuggestModifyMismatchingAuthor = T('commands/suggestions:suggestModifyMismatchingAuthor');
export const SuggestModifyNotConfigured = T('commands/suggestions:suggestModifyNotConfigured');
export const SuggestModifyReplied = T('commands/suggestions:suggestModifyReplied');
export const SuggestModifySuccess = FT<{ id: number }>('commands/suggestions:suggestModifySuccess');
export const SuggestNewMessageContent = FT<MessageData>('commands/suggestions:suggestNewMessageContent');
export const SuggestNewMessageEmbedTitle = FT<MessageData>('commands/suggestions:suggestNewMessageEmbedTitle');
export const SuggestNewNotConfigured = T('commands/suggestions:suggestNewNotConfigured');
export const SuggestNewSuccess = FT<{ id: number }>('commands/suggestions:suggestNewSuccess');
export const SuggestOptionsId = 'commands/suggestions:suggestOptionsId';
export const SuggestOptionsSuggestion = 'commands/suggestions:suggestOptionsSuggestion';

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
