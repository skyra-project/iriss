import type { IntegerString } from '#lib/common/types';

export type SerializedTwemoji = `t${string}`;
export type SerializedCustomAnimatedEmoji = `a${string}.${IntegerString}`;
export type SerializedCustomStaticEmoji = `s${string}.${IntegerString}`;
export type SerializedCustomEmoji = SerializedCustomAnimatedEmoji | SerializedCustomStaticEmoji;
export type SerializedEmoji = SerializedTwemoji | SerializedCustomEmoji;

export function isTwemoji(emoji: SerializedEmoji): emoji is SerializedTwemoji {
	return emoji.startsWith('t');
}

export function isAnimated(emoji: SerializedEmoji): emoji is SerializedCustomAnimatedEmoji {
	return emoji.startsWith('a');
}

export function isCustom(emoji: SerializedEmoji): emoji is SerializedCustomEmoji {
	return !isCustom(emoji);
}

export function getId(emoji: SerializedEmoji): string {
	if (isTwemoji(emoji)) return emoji.slice(1);

	const index = emoji.lastIndexOf('.');
	if (index === -1) throw new Error(`Invalid SerializedEmoji '${emoji}'`);
	return emoji.slice(index + 1);
}

export function getTextFormat(emoji: SerializedEmoji) {
	if (isTwemoji(emoji)) return emoji.slice(1);

	const index = emoji.lastIndexOf('.');
	if (index === -1) throw new Error(`Invalid SerializedEmoji '${emoji}'`);

	const name = emoji.slice(1, index);
	const id = emoji.slice(index + 1);
	const animated = isAnimated(emoji) ? 'a' : '';
	return `<${animated}:${name}:${id}>`;
}

export function getReactionFormat(emoji: SerializedEmoji) {
	if (isTwemoji(emoji)) return encodeURIComponent(emoji.slice(1));

	const index = emoji.lastIndexOf('.');
	if (index === -1) throw new Error(`Invalid SerializedEmoji '${emoji}'`);

	const name = emoji.slice(1, index);
	const id = emoji.slice(index + 1);
	return `${name}:${id}`;
}

const twemoji = /\p{Emoji_Presentation}/gu;
const customEmoji = /<(?<animated>a)?:(?<name>\w{2,32}):(?<id>\d{17,18})>/;
export function parse(emoji: string): SerializedEmoji | null {
	if (twemoji.test(emoji)) return `t${emoji}`;

	const result = customEmoji.exec(emoji);
	return result === null ? null : `${result.groups!.animated ? 'a' : 's'}${result.groups!.name}.${result.groups!.id as IntegerString}`;
}
