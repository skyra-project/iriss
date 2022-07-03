import { Tagged } from '#lib/common/tagged';
import { DiscordAPIError } from '@discordjs/rest';
import { Option, Result } from '@sapphire/result';
import { RESTJSONErrorCodes } from 'discord-api-types/v10';

export const ErrorCodes = RESTJSONErrorCodes;
export type ErrorCode = RESTJSONErrorCodes;

export function isDiscordAPIError(value: unknown): value is DiscordAPIError & { code: number } {
	return value instanceof DiscordAPIError && typeof value.code === 'number';
}

export type FromDiscordResultValue<ReturnType> = Option<ReturnType>;
export type FromDiscordResultError<VErr extends readonly ErrorCode[]> = Tagged<Error, Option<VErr[number]>>;
export type FromDiscordResult<ReturnType, VErr extends readonly ErrorCode[]> = Result<
	FromDiscordResultValue<ReturnType>,
	FromDiscordResultError<VErr>
>;

export async function fromDiscord<ReturnType, VOk extends readonly ErrorCode[], VErr extends readonly ErrorCode[]>(
	promise: Promise<ReturnType>,
	options: FromOptions<VOk, VErr>
): Promise<FromDiscordResult<ReturnType, VErr>> {
	const result = await Result.fromAsync(promise);

	return result.match({
		ok: (value) => Result.ok(Option.some(value)),
		err: (error) => {
			if (isDiscordAPIError(error)) {
				if (options.ok?.includes(error.code)) return Result.ok(Option.none);
				if (options.err?.includes(error.code)) return Result.err(new Tagged(error, Option.some(error.code as VErr[number])));
			}

			return Result.err(new Tagged(error as Error, Option.none));
		}
	});
}

export interface FromOptions<VOk extends readonly ErrorCode[], VErr extends readonly ErrorCode[]> {
	readonly ok?: VOk;
	readonly err?: VErr;
}
