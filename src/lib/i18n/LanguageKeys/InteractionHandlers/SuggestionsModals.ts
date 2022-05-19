import { FT } from '@skyra/http-framework-i18n';

export const ContentAccepted = FT<{ tag: string; time: string }>('interaction-handlers/suggestions-modals:contentAccepted');
export const ContentConsidered = FT<{ tag: string; time: string }>('interaction-handlers/suggestions-modals:contentConsidered');
export const ContentDenied = FT<{ tag: string; time: string }>('interaction-handlers/suggestions-modals:contentDenied');
export const UpdateFailure = FT<{ id: string }>('interaction-handlers/suggestions-modals:updateFailure');
export const UpdateSuccess = FT<{ id: string }>('interaction-handlers/suggestions-modals:updateSuccess');
