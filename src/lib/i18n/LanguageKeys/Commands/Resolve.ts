import { FT, T } from '@skyra/http-framework-i18n';

export const RootName = T('commands/resolve:name');
export const RootDescription = T('commands/resolve:description');
export const Archive = 'commands/resolve:archive';
export const Accept = 'commands/resolve:accept';
export const Consider = 'commands/resolve:consider';
export const Deny = 'commands/resolve:deny';
export const OptionsId = 'commands/resolve:optionsId';
export const OptionsResponse = 'commands/resolve:optionsResponse';
export const NotConfigured = T('commands/resolve:notConfigured');
export const SuggestionArchived = T('commands/resolve:suggestionArchived');
export const SuggestionIdDoesNotExist = T('commands/resolve:suggestionIdDoesNotExist');
export const SuggestionMessageDeleted = T('commands/resolve:suggestionMessageDeleted');
export const ArchiveSuccess = FT<{ id: string }>('commands/resolve:archiveSuccess');
export const NoReason = T('commands/resolve:noReason');
export const Success = FT<{ id: string }>('commands/resolve:success');
export const Failure = FT<{ id: string }>('commands/resolve:failure');
