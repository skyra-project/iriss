import type { Interactions } from '@skyra/http-framework';

export type AnyInteraction =
	| Interactions.ChatInput
	| Interactions.Autocomplete
	| Interactions.User
	| Interactions.Message
	| Interactions.Modal
	| Interactions.MessageComponent;
export type IntegerString = `${bigint}`;
