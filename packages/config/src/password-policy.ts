const common = new Set(['password123', 'password1234', '1234567890', 'qwertyuiop', 'abcdefghij', 'letmein1234', 'iloveyou123', 'password123!']);

export function passwordError(password: string): string | null {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(password)) return 'An email address cannot be used as a password. Choose a different password.';
    if (password.length < 6) return 'Password must contain at least 6 characters.';
    if (password.length > 128) return 'Password cannot exceed 128 characters.';
    if (!/[a-zA-Z]/.test(password)) return 'Password must include at least one letter.';
    if (!/[0-9]/.test(password)) return 'Password must include at least one number.';
    if (/\r|\n/.test(password)) return 'Password cannot contain a line break.';
    if (common.has(password.toLowerCase()) || /^(password|qwerty|letmein|admin|welcome|iloveyou)[0-9!@#$]*$/i.test(password))
        return 'This password is too common and weak. Choose a less predictable password.';
    return null;
}
