import { Collection } from '@discordjs/collection';
import { getT, loadedLocales, type TypedT } from '@skyra/http-framework-i18n';
import type { LocalizationMap } from 'discord-api-types/v10';

export function applyNameAndDescription<T extends NamedBuilder>(prefix: LocalePrefixKey, builder: T): T {
	const locales = new Collection([...loadedLocales].map((locale) => [locale, getT(locale)]));

	const defaultT = locales.get('en-US');
	if (!defaultT) throw new TypeError('Could not find en-US locales');

	const localeName = `${prefix}Name` as TypedT;
	const localeDescription = `${prefix}Description` as TypedT;

	return builder
		.setName(defaultT(localeName))
		.setNameLocalizations(Object.fromEntries(locales.map((t, locale) => [locale, t(localeName)])))
		.setDescription(defaultT(localeDescription))
		.setDescriptionLocalizations(Object.fromEntries(locales.map((t, locale) => [locale, t(localeDescription)])));
}

export interface NamedBuilder {
	setName(name: string): this;
	setDescription(description: string): this;
	setNameLocalizations(localizedNames: LocalizationMap | null): this;
	setDescriptionLocalizations(localizedDescriptions: LocalizationMap | null): this;
}

export type LocalePrefixKey = `commands:${string}/${string}`;
