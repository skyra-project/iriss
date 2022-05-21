import { FT, T } from '@skyra/http-framework-i18n';

export const RootName = T('commands/suggest:name');
export const RootDescription = T('commands/suggest:description');

export const OptionsId = 'commands/suggest:optionsId';
export const OptionsSuggestion = 'commands/suggest:optionsSuggestion';
export const ComponentsAccept = T('commands/suggest:componentsAccept');
export const ComponentsArchive = T('commands/suggest:componentsArchive');
export const ComponentsConsider = T('commands/suggest:componentsConsider');
export const ComponentsCreateThread = T('commands/suggest:componentsCreateThread');
export const ComponentsDeny = T('commands/suggest:componentsDeny');
export const ModifyArchived = T('commands/suggest:modifyArchived');
export const ModifyDoesNotExist = T('commands/suggest:modifyDoesNotExist');
export const ModifyMessageDeleted = T('commands/suggest:modifyMessageDeleted');
export const ModifyMismatchingAuthor = T('commands/suggest:modifyMismatchingAuthor');
export const ModifyNotConfigured = T('commands/suggest:modifyNotConfigured');
export const ModifyReplied = T('commands/suggest:modifyReplied');
export const ModifySuccess = FT<{ id: number }>('commands/suggest:modifySuccess');
export const NewMessageContent = FT<MessageData>('commands/suggest:newMessageContent');
export const NewMessageEmbedTitle = FT<MessageData>('commands/suggest:newMessageEmbedTitle');
export const NewNotConfigured = T('commands/suggest:newNotConfigured');
export const NewSuccess = FT<{ id: number }>('commands/suggest:newSuccess');

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
