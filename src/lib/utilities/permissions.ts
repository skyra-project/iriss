/**
 * Checks whether or not {@param permissions} includes all the bits from {@param mask}.
 * @param permissions The permissions to check.
 * @param mask The mask of permissions required for the function to return true.
 * @returns Whether or not the permissions includes all values from the mask.
 * @example
 * // Checking one permission:
 * has(interaction.member!.permissions, PermissionFlagsBits.KickMembers);
 */
export function has(permissions: string | bigint, mask: bigint) {
	return (BigInt(permissions) & mask) === mask;
}
