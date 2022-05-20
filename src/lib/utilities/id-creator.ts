import { SuggestionStatusColors } from '#lib/common/constants';

export const enum Id {
	Suggestions = 'suggestions',
	SuggestionsModal = 'suggestions-modal',
	SuggestionsModalField = 'suggestions-modal.field'
}

export type IntegerString = `${bigint}`;

export function makeIntegerString(value: number | bigint): IntegerString {
	return value.toString() as IntegerString;
}

export type CustomIdEntries =
	| [name: Id.Suggestions, action: 'archive' | 'thread' | 'resolve', id: IntegerString, status?: Status] //
	| [name: Id.SuggestionsModal, status: Status, id: IntegerString];

export type Get<I extends Id> = Extract<CustomIdEntries, [name: I, ...tail: any[]]>;
export type Key<E extends CustomIdEntries> = E[0];
export type Values<E extends CustomIdEntries> = E extends [key: any, ...tail: infer Tail] ? Tail : never;

export function makeCustomId<E extends CustomIdEntries>(key: Key<E>, ...values: Values<E>) {
	// return values.length === 0 ? key : `${key}.${values.join('.')}`;
	return `${key}.${values.join('.')}`;
}

export const enum Status {
	Accept = 'accept',
	Consider = 'consider',
	Deny = 'deny'
}

export function getColor(action: Status) {
	switch (action) {
		case Status.Accept:
			return SuggestionStatusColors.Accepted;
		case Status.Consider:
			return SuggestionStatusColors.Considered;
		case Status.Deny:
			return SuggestionStatusColors.Denied;
	}
}
