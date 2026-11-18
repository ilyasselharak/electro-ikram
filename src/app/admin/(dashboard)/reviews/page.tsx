"use client";

import { useState } from "react";
import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Check, ExternalLink, Loader2, MessageSquareReply, Star, Trash2, X } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { inputClass } from "@/components/shared/field";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { dateTime } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

type Status = "pending" | "approved" | "rejected";
const TABS: { key: Status; label: string }[] = [
  { key: "pending", label: "À modérer" },
  { key: "approved", label: "Publiés" },
  { key: "rejected", label: "Refusés" },
];

function StarsRow({ value }: { value: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} sur 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} className={cn("size-4", i <= value ? "text-amber-400" : "text-amber-400/25")} fill="currentColor" strokeWidth={0} />
      ))}
    </span>
  );
}

function ReplyBox({ id, initial }: { id: Id<"reviews">; initial: string }) {
  const reply = useAdminMutation(api.reviews.reply, { success: "Réponse enregistrée" });
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(initial);
  if (!open) {
    return (
      <Button size="sm" variant="ghost" className="rounded-lg" onClick={() => setOpen(true)}>
        <MessageSquareReply className="size-3.5" /> {initial ? "Modifier la réponse" : "Répondre"}
      </Button>
    );
  }
  return (
    <div className="mt-2 w-full space-y-2">
      <textarea rows={3} value={text} onChange={(e) => setText(e.target.value)} placeholder="Réponse publique de la boutique…" className={`${inputClass} h-auto py-2`} />
      <div className="flex gap-2">
        <Button size="sm" disabled={reply.pending} onClick={async () => { await reply.run({ id, reply: text }); setOpen(false); }}>
          {reply.pending && <Loader2 className="size-3.5 animate-spin" />} Enregistrer
        </Button>
        <Button size="sm" variant="outline" onClick={() => setOpen(false)}>Annuler</Button>
      </div>
    </div>
  );
}

function ReviewsInner() {
  const [status, setStatus] = useState<Status>("pending");
  const counts = useQuery(api.reviews.counts);
  const { results, status: loadStatus, loadMore } = usePaginatedQuery(api.reviews.adminList, { status }, { initialNumItems: 20 });
  const moderate = useAdminMutation(api.reviews.moderate);
  const remove = useAdminMutation(api.reviews.remove, { success: "Avis supprimé" });

  return (
    <div>
      <PageHeader title="Avis clients" description="Les avis des clients ayant reçu le produit. Ils sont publiés sur la fiche produit après votre validation." />
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setStatus(t.key)}
            className={cn("rounded-full border px-4 py-1.5 text-sm font-medium", status === t.key ? "border-primary bg-primary text-primary-foreground" : "bg-white hover:bg-secondary")}
          >
            {t.label}
            {t.key === "pending" && counts?.pending ? <span className="ms-2 rounded-full bg-white/25 px-1.5 text-xs">{counts.pending}</span> : null}
          </button>
        ))}
      </div>

      {loadStatus === "LoadingFirstPage" ? (
        <Skeleton className="h-64 rounded-2xl" />
      ) : results.length === 0 ? (
        <p className="rounded-2xl border bg-white p-10 text-center text-muted-foreground">
          {status === "pending" ? "Aucun avis en attente. 🎉" : "Aucun avis."}
        </p>
      ) : (
        <ul className="space-y-3">
          {results.map((r) => (
            <li key={r._id} className="rounded-2xl border bg-white p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <StarsRow value={r.rating} />
                    {r.title && <p className="font-semibold">{r.title}</p>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {r.productSlug ? (
                      <a href={`/fr/product/${r.productSlug}#reviews`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
                        {r.productName} <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      r.productName
                    )}
                    {" · "}
                    {r.userName || r.authorName} ({r.userEmail}) · {dateTime(r.updatedAt)}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {r.status !== "approved" && (
                    <Button size="sm" className="rounded-lg bg-emerald-600 hover:bg-emerald-700" disabled={moderate.pending} onClick={() => moderate.run({ id: r._id, status: "approved" }, { success: "Avis publié" })}>
                      <Check className="size-3.5" /> Publier
                    </Button>
                  )}
                  {r.status !== "rejected" && (
                    <Button size="sm" variant="outline" className="rounded-lg" disabled={moderate.pending} onClick={() => moderate.run({ id: r._id, status: "rejected" }, { success: "Avis refusé" })}>
                      <X className="size-3.5" /> Refuser
                    </Button>
                  )}
                  <ConfirmDialog
                    trigger={<Button size="sm" variant="ghost" className="rounded-lg text-destructive hover:text-destructive"><Trash2 className="size-3.5" /></Button>}
                    title="Supprimer cet avis ?"
                    description="Il sera définitivement supprimé. Le client pourra en publier un nouveau."
                    destructive
                    onConfirm={() => remove.run({ id: r._id })}
                  />
                </div>
              </div>
              <p className="mt-3 whitespace-pre-line text-sm leading-relaxed">{r.body}</p>
              {r.adminReply && (
                <p className="mt-3 rounded-xl bg-secondary/70 p-3 text-sm"><b>Votre réponse :</b> {r.adminReply}</p>
              )}
              <div className="mt-2 flex flex-wrap">
                <ReplyBox id={r._id} initial={r.adminReply ?? ""} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {loadStatus === "CanLoadMore" && (
        <div className="mt-4 text-center">
          <Button variant="outline" onClick={() => loadMore(20)}>Voir plus</Button>
        </div>
      )}
    </div>
  );
}

export default function ReviewsPage() {
  return (
    <RequirePermission perm="catalog">
      <ReviewsInner />
    </RequirePermission>
  );
}
