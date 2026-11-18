"use client";

import { useEffect } from "react";
import { useConvexAuth, useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { api } from "@convex/_generated/api";

/** Signs out a customer whose account was disabled by the store. */
export function AccountGuard() {
  const t = useTranslations("auth");
  const { isAuthenticated } = useConvexAuth();
  const status = useQuery(api.account.status, isAuthenticated ? {} : "skip");
  const { signOut } = useAuthActions();
  useEffect(() => {
    if (status === "disabled") {
      void signOut();
      toast.error(t("disabled"));
    }
  }, [status, signOut, t]);
  return null;
}
