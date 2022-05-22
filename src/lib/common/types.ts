import type { APIInteraction, APIPingInteraction } from 'discord-api-types/v10';

export type AnyInteraction = Exclude<APIInteraction, APIPingInteraction>;
export type IntegerString = `${bigint}`;

// eslint-disable-next-line @typescript-eslint/ban-types
export type NonNullObject = {} & object;

export function isUndefined(value: unknown): value is undefined {
	return value === undefined;
}

export function isDefined<T>(value: T | undefined): value is T {
	return value !== undefined;
}
