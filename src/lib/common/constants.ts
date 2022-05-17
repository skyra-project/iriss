export const enum BrandingColors {
	Primary = 0xddbd96,
	Secondary = 0xe25e59
}

export const enum SuggestionStatusColors {
	Unresolved = 0xeeeeee,
	Considered = 0xffd54f,
	Denied = 0xe91e63,
	Accepted = 0x8bc34a
}

export const enum CustomId {
	SuggestionsArchive = 'suggestions:archive',
	SuggestionsThread = 'suggestions:thread',
	SuggestionsResolve = 'suggestions:resolve'
}

export const enum ButtonValue {
	SuggestionResolveAccept = 'suggestions:resolve:accept',
	SuggestionResolveConsider = 'suggestions:resolve:consider',
	SuggestionResolveDeny = 'suggestions:resolve:deny'
}
