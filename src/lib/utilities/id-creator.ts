export const enum CustomId {
	SuggestionsArchive = 'suggestions.archive',
	SuggestionsThread = 'suggestions.thread',
	SuggestionsResolve = 'suggestions.resolve',
	SuggestionsModal = 'suggestions-modal',
	SuggestionsModalField = 'suggestions-modal.field'
}

export function makeCustomId(prefix: makeCustomId.SuggestionsModalPrefix, action: makeCustomId.SuggestionsModalAction, id: string): string;
export function makeCustomId(prefix: makeCustomId.SuggestionsPrefix, id: string): string;
export function makeCustomId(prefix: string, ...parts: string[]): string {
	return parts.length === 0 ? prefix : `${prefix}.${parts.join('.')}`;
}

export namespace makeCustomId {
	export type SuggestionsPrefix = CustomId.SuggestionsArchive | CustomId.SuggestionsThread | CustomId.SuggestionsResolve;
	export type SuggestionsModalPrefix = CustomId.SuggestionsModal;
	export type SuggestionsModalAction = ButtonValue.Accept | ButtonValue.Consider | ButtonValue.Deny;
}

export const enum ButtonValue {
	Accept = 'accept',
	Consider = 'consider',
	Deny = 'deny'
}

export type IdParserSuggestionsResult = ['archive' | 'thread' | 'resolve', `${bigint}`];

export type IdParserResult = IdParserSuggestionsResult;
