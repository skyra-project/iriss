import { FT, T } from '@skyra/http-framework-i18n';

export const NotConfigured = T('interaction-handlers/suggestions:notConfigured');
export const MissingResolvePermissions = T('interaction-handlers/suggestions:missingResolvePermissions');
export const ModalTitle = FT<{ id: string }>('interaction-handlers/suggestions:modalTitle');
export const ModalFieldLabelAccept = T('interaction-handlers/suggestions:modalFieldLabelAccept');
export const ModalFieldLabelConsider = T('interaction-handlers/suggestions:modalFieldLabelConsider');
export const ModalFieldLabelDeny = T('interaction-handlers/suggestions:modalFieldLabelDeny');
export const ModalFieldPlaceholderAccept = T('interaction-handlers/suggestions:modalFieldPlaceholderAccept');
export const ModalFieldPlaceholderConsider = T('interaction-handlers/suggestions:modalFieldPlaceholderConsider');
export const ModalFieldPlaceholderDeny = T('interaction-handlers/suggestions:modalFieldPlaceholderDeny');
export const ArchiveSuccess = T('interaction-handlers/suggestions:archiveSuccess');
export const ArchiveThreadFailure = T('interaction-handlers/suggestions:archiveThreadFailure');
export const ReactionRemovalFailure = T('interaction-handlers/suggestions:reactionRemovalFailure');
export const ArchiveMessageFailure = T('interaction-handlers/suggestions:archiveMessageFailure');
export const ThreadChannelCreationFailure = T('interaction-handlers/suggestions:threadChannelCreationFailure');
export const ThreadMessageUpdateSuccess = FT<{ channel: string }>('interaction-handlers/suggestions:threadMessageUpdateSuccess');
export const ThreadMessageUpdateFailure = FT<{ channel: string }>('interaction-handlers/suggestions:threadMessageUpdateFailure');
export const ThreadMemberAddFailure = T('interaction-handlers/suggestions:threadMemberAddFailure');
