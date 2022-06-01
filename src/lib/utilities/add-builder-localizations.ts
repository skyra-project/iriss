import { lazy } from '#lib/common/lazy';
import { Collection } from '@discordjs/collection';
import type { NonNullObject } from '@sapphire/utilities';
import { getT, loadedLocales, type TypedT } from '@skyra/http-framework-i18n';
import type { LocalizationMap } from 'discord-api-types/v10';

const getLocales = lazy(() => new Collection([...loadedLocales].map((locale) => [locale, getT(locale)])));

function getDefaultT() {
	const defaultT = getLocales().get('en-US');
	if (defaultT) return defaultT;
	throw new TypeError('Could not find en-US');
}

export function apply<T extends BuilderWithNameAndDescription>(
	builder: T,
	...params: [root: LocalePrefixKey] | [name: TypedT, description: TypedT]
): T {
	const locales = getLocales();
	const defaultT = getDefaultT();

	const [localeName, localeDescription] = params.length === 1 ? [`${params[0]}Name` as TypedT, `${params[0]}Description` as TypedT] : params;

	return builder
		.setName(defaultT(localeName))
		.setNameLocalizations(Object.fromEntries(locales.map((t, locale) => [locale, t(localeName)])))
		.setDescription(defaultT(localeDescription))
		.setDescriptionLocalizations(Object.fromEntries(locales.map((t, locale) => [locale, t(localeDescription)])));
}

export function makeName<V extends NonNullObject>(nameKey: TypedT, value?: V): makeName.Result<V> {
	const locales = getLocales();
	const defaultT = getDefaultT();

	return {
		...value,
		name: defaultT(nameKey),
		name_localizations: Object.fromEntries(locales.map((t, locale) => [locale, t(nameKey)]))
	} as makeName.Result<V>;
}

export namespace makeName {
	export type Result<V> = V & {
		name: string;
		name_localizations: LocalizationMap;
	};
}

export interface BuilderWithNameAndDescription {
	setName(name: string): this;
	setNameLocalizations(localizedNames: LocalizationMap | null): this;
	setDescription(description: string): this;
	setDescriptionLocalizations(localizedDescriptions: LocalizationMap | null): this;
}

export type LocalePrefixKey = `commands/${string}:${string}`;
