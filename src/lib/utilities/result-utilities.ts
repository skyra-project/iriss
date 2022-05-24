import { Tagged } from '#lib/common/tagged';
import { DiscordAPIError } from '@discordjs/rest';
import { err, fromAsync, none, ok, some, type Maybe, type Result } from '@sapphire/result';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

export const ErrorCodes = RESTJSONErrorCodes;
export type ErrorCode = RESTJSONErrorCodes;

export function isDiscordAPIError(value: unknown): value is DiscordAPIError & { code: number } {
	return value instanceof DiscordAPIError && typeof value.code === 'number';
}

export async function fromDiscord<ReturnType, VOk extends readonly ErrorCode[], VErr extends readonly ErrorCode[]>(
	promise: Promise<ReturnType>,
	options: FromOptions<VOk, VErr>
): Promise<Result<Maybe<ReturnType>, Tagged<Error, Maybe<VErr[number]>>>> {
	const result = await fromAsync(promise);

	// If the operation was successful, return ok with the value:
	if (result.success) return ok(some(result.value));

	const { error } = result;
	if (isDiscordAPIError(error)) {
		if (options.ok?.includes(error.code)) return ok(none());
		if (options.err?.includes(error.code)) return err(new Tagged(error, some(error.code as VErr[number])));
	}

	return err(new Tagged(error as Error, none()));
}

export interface FromOptions<VOk extends readonly ErrorCode[], VErr extends readonly ErrorCode[]> {
	readonly ok?: VOk;
	readonly err?: VErr;
}
