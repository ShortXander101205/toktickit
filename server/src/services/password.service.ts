import bcryptjs from "bcryptjs";

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

export class PasswordService {
  /**
   * Hashes a plaintext password using bcrypt with 10 salt rounds.
   */
  hashPassword(plaintext: string): string {
    return bcryptjs.hashSync(plaintext, 10);
  }

  /**
   * Compares a plaintext password against a stored bcrypt hash.
   */
  verifyPassword(plaintext: string, hash: string): boolean {
    return bcryptjs.compareSync(plaintext, hash);
  }

  /**
   * Validates mandatory password complexity rules adhering to FR-02.3 and DEC-UI-05.
   */
  validatePasswordComplexity(
    newPassword: string,
    currentPassword?: string
  ): PasswordValidationResult {
    const errors: string[] = [];

    if (!newPassword || newPassword.length < 8) {
      errors.push("Password must be at least 8 characters long.");
    }

    if (!/[A-Z]/.test(newPassword)) {
      errors.push("Password must contain at least 1 uppercase letter (A-Z).");
    }

    if (!/[a-z]/.test(newPassword)) {
      errors.push("Password must contain at least 1 lowercase letter (a-z).");
    }

    if (!/[0-9]/.test(newPassword)) {
      errors.push("Password must contain at least 1 numeric digit (0-9).");
    }

    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)) {
      errors.push("Password must contain at least 1 special character (!@#$%^&*).");
    }

    if (currentPassword && newPassword === currentPassword) {
      errors.push("New password cannot be identical to your current password.");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const passwordService = new PasswordService();
