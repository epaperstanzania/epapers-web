export const USERNAME_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function nextUsernameChangeAt(changedAt: Date | null): Date | null {
    return changedAt ? new Date(changedAt.getTime() + USERNAME_CHANGE_COOLDOWN_MS) : null;
}
