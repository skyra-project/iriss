import { FT, T } from '@skyra/http-framework-i18n';

export const NotConfigured = T('interaction-handlers/suggestions:notConfigured');
export const MissingResolvePermissions = T('interaction-handlers/suggestions:missingResolvePermissions');
export const ModalTitle = T('interaction-handlers/suggestions:modalTitle');
export const ModalFieldLabel = T('interaction-handlers/suggestions:modalFieldLabel');
export const ModalFieldPlaceholder = T('interaction-handlers/suggestions:modalFieldPlaceholder');
export const ArchiveSuccess = T('interaction-handlers/suggestions:archiveSuccess');
export const ArchiveFailure = T('interaction-handlers/suggestions:archiveFailure');
export const ThreadChannelCreationFailure = T('interaction-handlers/suggestions:threadChannelCreationFailure');
export const ThreadMessageUpdateSuccess = FT<{ channel: string }>('interaction-handlers/suggestions:threadMessageUpdateSuccess');
export const ThreadMessageUpdateFailure = T('interaction-handlers/suggestions:threadMessageUpdateFailure');
