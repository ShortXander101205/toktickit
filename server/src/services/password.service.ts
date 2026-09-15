import bcrypt from "bcryptjs";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordService {
  /**
   * Hashes plaintext password with bcrypt (cost factor 10).
   */
  hashPassword(plaintext: string): string {
    return bcrypt.hashSync(plaintext, 10);
  }

  /**
   * Verifies plaintext password against bcrypt hash.
   */
  verifyPassword(plaintext: string, hash: string): boolean {
    return bcrypt.compareSync(plaintext, hash);
  }

  /**
   * Enforces password complexity rules per FR-02 & BR-02:
   * 1. Minimum 8 characters.
   * 2. At least 1 uppercase letter (A-Z).
   * 3. At least 1 lowercase letter (a-z).
   * 4. At least 1 digit (0-9).
   * 5. At least 1 special character (!@#$%^&*...).
   * 6. Must not match current password (if provided).
   */
  validatePasswordComplexity(newPassword: string, currentPassword?: string): PasswordValidationResult {
    const errors: string[] = [];

    if (typeof newPassword !== "string" || newPassword.length < 8) {
      errors.push("Password must be at least 8 characters long.");
    }

    if (!/[A-Z]/.test(newPassword)) {
      errors.push("Password must include at least one uppercase letter (A-Z).");
    }

    if (!/[a-z]/.test(newPassword)) {
      errors.push("Password must include at least one lowercase letter (a-z).");
    }

    if (!/[0-9]/.test(newPassword)) {
      errors.push("Password must include at least one number (0-9).");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      errors.push("Password must include at least one special character (!@#$%^&*).");
    }

    if (currentPassword && newPassword === currentPassword) {
      errors.push("New password cannot be the same as the current password.");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const passwordService = new PasswordService();
