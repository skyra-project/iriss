import { FT, T } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/config:name');
export const RootDescription = T('commands/config:description');

export const View = 'commands/config:view';
export const ViewContent = FT<{
	channel: string;
	autoThread: string;
	buttons: string;
	compact: string;
	displayUpdateHistory: string;
	embed: string;
	reactions: string;
}>('commands/config:viewContent');

export const Edit = 'commands/config:edit';
export const EditOptionsChannelDescription = T('commands/config:editOptionsChannelDescription');
export const EditOptionsAutoThreadDescription = T('commands/config:editOptionsAutoThreadDescription');
export const EditOptionsButtonsDescription = T('commands/config:editOptionsButtonsDescription');
export const EditOptionsCompactDescription = T('commands/config:editOptionsCompactDescription');
export const EditOptionsDisplayUpdateHistoryDescription = T('commands/config:editOptionsDisplayUpdateHistoryDescription');
export const EditOptionsEmbedDescription = T('commands/config:editOptionsEmbedDescription');
export const EditOptionsReactionsDescription = T('commands/config:editOptionsReactionsDescription');
export const EditOptionsRemoveReactionsDescription = T('commands/config:editOptionsRemoveReactionsDescription');
export const EditReactionsInvalidAmount = T('commands/config:editReactionsInvalidAmount');
export const EditReactionsInvalidEmoji = FT<{ value: string }>('commands/config:editReactionsInvalidEmoji');

export const Reset = 'commands/config:reset';
export const ResetOptionsKey = 'commands/config:resetOptionsKey';
export const ResetOptionsKeyChoicesAll = T('commands/config:resetOptionsKeyChoicesAll');

export const KeyChannel = T('commands/config:keyChannel');
export const KeyAutoThread = T('commands/config:keyAutoThread');
export const KeyButtons = T('commands/config:keyButtons');
export const KeyCompact = T('commands/config:keyCompact');
export const KeyDisplayUpdateHistory = T('commands/config:keyDisplayUpdateHistory');
export const KeyEmbed = T('commands/config:keyEmbed');
export const KeyReactions = T('commands/config:keyReactions');
export const KeyRemoveReactions = T('commands/config:keyRemoveReactions');

// Logic
export const EditSuccess = T('commands/config:editSuccess');
export const EditFailure = T('commands/config:editFailure');
