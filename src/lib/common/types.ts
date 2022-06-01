import type { APIInteraction, APIPingInteraction } from 'discord-api-types/v10';

export type AnyInteraction = Exclude<APIInteraction, APIPingInteraction>;
export type IntegerString = `${bigint}`;
