import { convexAuth } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import { ConvexError } from "convex/values";
import { ResendOTPPasswordReset } from "./lib/resendOtp";

/**
 * Admin-only authentication. Public self sign-up is disabled: the first owner
 * is created with `npx convex run adminUsers:createFirstOwner`, further staff
 * accounts are created by an owner from /admin/users.
 */
export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      id: "password",
      reset: ResendOTPPasswordReset,
      profile(params) {
        if (params.flow === "signUp") {
          throw new ConvexError("Les inscriptions publiques sont désactivées.");
        }
        return { email: String(params.email).trim().toLowerCase() };
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
