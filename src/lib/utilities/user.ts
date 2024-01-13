import type { ImageURLOptions } from '@discordjs/rest';
import { isNullishOrEmpty } from '@sapphire/utilities';
import { container } from '@skyra/http-framework';
import type { APIUser } from 'discord-api-types/v10';

/**
 * Checks whether or not the user uses the new username change, defined by the
 * `discriminator` being `'0'` or in the future, no discriminator at all.
 * @see {@link https://dis.gd/usernames}
 * @param user The user to check.
 */
export function usesPomelo(user: APIUser) {
	return isNullishOrEmpty(user.discriminator) || user.discriminator === '0';
}

export function getDisplayAvatar(user: APIUser, options: ImageURLOptions = {}) {
	if (user.avatar === null) {
		const id = usesPomelo(user) ? Number(BigInt(user.id) >> 22n) % 6 : Number(user.discriminator) % 5;
		return container.rest.cdn.defaultAvatar(id);
	}

	return container.rest.cdn.avatar(user.id, user.avatar, options);
}

export function getTag(user: APIUser) {
	return usesPomelo(user) ? `@${user.username}` : `${user.username}#${user.discriminator}`;
}
