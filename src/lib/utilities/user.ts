import type { ImageURLOptions } from '@discordjs/rest';
import { container } from '@skyra/http-framework';
import type { APIUser } from 'discord-api-types/v10';

export function avatarURL(user: APIUser, options?: Readonly<ImageURLOptions>) {
	return user.avatar && container.rest.cdn.avatar(user.id, user.avatar, options);
}

export function defaultAvatarURL(user: APIUser) {
	return container.rest.cdn.defaultAvatar(Number(user.discriminator) % 5);
}

export function displayAvatarURL(user: APIUser, options?: Readonly<ImageURLOptions>) {
	return avatarURL(user, options) ?? defaultAvatarURL(user);
}
