import { FT, T } from '@skyra/http-framework-i18n';

// Root
export const RootName = T('commands/post-guide:name');
export const RootDescription = T('commands/post-guide:description');

export const OptionsHide = 'commands/post-guide:optionsHide';
export const OptionsTarget = 'commands/post-guide:optionsTarget';

export const Message = FT<{ command: string; channel: string; bot: string }>('commands/post-guide:message');
export const ButtonSubmit = T('commands/post-guide:buttonSubmit');
export const ButtonSupport = T('commands/post-guide:buttonSupport');
