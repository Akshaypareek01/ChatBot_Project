/**
 * Strong password policy: min 8 chars, 1 uppercase, 1 number, 1 special char.
 * Returns { valid: boolean, message?: string }.
 */
function validatePassword(password) {
    if (!password || typeof password !== 'string') {
        return { valid: false, message: 'Password is required.' };
    }
    if (password.length < 8) {
        return { valid: false, message: 'Password must be at least 8 characters.' };
    }
    if (!/[A-Z]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one uppercase letter.' };
    }
    if (!/[0-9]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one number.' };
    }
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
        return { valid: false, message: 'Password must contain at least one special character.' };
    }
    return { valid: true };
}

module.exports = { validatePassword };
