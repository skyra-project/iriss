import { DiscordAPIError } from '@discordjs/rest';
import { err, fromAsync, ok } from '@sapphire/result';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

export const ErrorCodes = RESTJSONErrorCodes;

export async function fromDiscord<T>(promise: Promise<T>, ...codes: number[]) {
	const result = await fromAsync(promise);

	// If the operation was successful, return ok with the value:
	if (result.success) return ok(result.value);

	const { error } = result;
	// If the error is a DiscordAPIError, the error code is a number, and it's one of the ignored codes, return ok with null:
	if (error instanceof DiscordAPIError && typeof error.code === 'number' && codes.includes(error.code)) return ok(null);

	// Otherwise return the error:
	return err(error);
}
