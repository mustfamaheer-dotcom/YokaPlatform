/**
 * Central Client-Side Permissions Helper
 * Enforces Owner-Only delete protection across all UI screens.
 */

export const isOwner = (user) => user?.role === 'super_admin';
export const canDelete = (user) => isOwner(user);
