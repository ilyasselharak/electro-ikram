"use client";

import { useCallback, useState } from "react";
import { useAction, useMutation } from "convex/react";
import type { FunctionReference, FunctionArgs, FunctionReturnType } from "convex/server";
import { toast } from "sonner";
import { errorMessage } from "@/lib/convex-errors";
import { revalidateStorefront } from "@/app/admin/actions";

type Opts = { success?: string; revalidate?: boolean };

/**
 * Wraps a Convex mutation with loading state, toast feedback and storefront
 * cache revalidation (so public pages reflect admin edits immediately).
 */
export function useAdminMutation<M extends FunctionReference<"mutation">>(ref: M, opts: Opts = {}) {
  const mutate = useMutation(ref);
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (args: FunctionArgs<M>, override?: Opts): Promise<FunctionReturnType<M> | undefined> => {
      const o = { revalidate: true, ...opts, ...override };
      setPending(true);
      try {
        const res = await mutate(args);
        if (o.success) toast.success(o.success);
        if (o.revalidate) revalidateStorefront().catch(() => {});
        return res;
      } catch (e) {
        toast.error(errorMessage(e));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mutate, opts.success, opts.revalidate],
  );
  return { run, pending };
}

export function useAdminAction<A extends FunctionReference<"action">>(ref: A, opts: Opts = {}) {
  const act = useAction(ref);
  const [pending, setPending] = useState(false);
  const run = useCallback(
    async (args: FunctionArgs<A>): Promise<FunctionReturnType<A> | undefined> => {
      setPending(true);
      try {
        const res = await act(args);
        if (opts.success) toast.success(opts.success);
        return res;
      } catch (e) {
        toast.error(errorMessage(e));
        return undefined;
      } finally {
        setPending(false);
      }
    },
    [act, opts.success],
  );
  return { run, pending };
}
