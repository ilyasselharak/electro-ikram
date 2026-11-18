import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import { ResendOTPPasswordReset } from "./lib/resendOtp";
import { isValidEmail } from "./lib/utils";

/**
 * One password provider for everyone:
 * - Customers sign up from the storefront (/account/login). A sign-up never
 *   sets a role, so it can only ever create a customer account.
 * - Staff accounts are created by an owner from /admin/users (the first owner
 *   with `npx convex run users:createFirstOwner`), never by sign-up.
 * Disabled accounts (isActive === false) are refused by every account
 * function (convex/account.ts) and signed out by the storefront.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      id: "password",
      reset: ResendOTPPasswordReset,
      profile(params): { email: string; name?: string; isActive?: boolean } {
        const email = String(params.email ?? "").trim().toLowerCase();
        if (!isValidEmail(email)) throw new ConvexError("E-mail invalide.");
        if (params.flow === "signUp") {
          const name = String(params.name ?? "").trim().slice(0, 120);
          if (name.length < 2) throw new ConvexError("Indiquez votre nom.");
          // Only these fields are written: no role, so never a staff account.
          return { email, name, isActive: true };
        }
        return { email };
      },
      validatePasswordRequirements(password) {
        if (password.length < 8 || !/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
          throw new ConvexError(
            "Le mot de passe doit contenir au moins 8 caractères, dont une lettre et un chiffre.",
          );
        }
      },
    }),
  ],
});
