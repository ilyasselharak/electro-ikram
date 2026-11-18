"use client";

import { usePaginatedQuery, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Download, Mail, MailOpen, Phone, Trash2 } from "lucide-react";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { RequirePermission } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAdminMutation } from "@/hooks/use-admin-mutation";
import { dateTime } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

function ContactMessages() {
  const { results, status, loadMore } = usePaginatedQuery(api.messages.adminList, {}, { initialNumItems: 20 });
  const setRead = useAdminMutation(api.messages.setRead, { revalidate: false });
  const remove = useAdminMutation(api.messages.remove, { success: "Message supprimé", revalidate: false });
  if (status === "LoadingFirstPage") return <Skeleton className="h-64 rounded-2xl" />;
  if (!results.length) return <p className="rounded-2xl border bg-white p-12 text-center text-muted-foreground">Aucun message.</p>;
  return (
    <div className="space-y-3">
      {results.map((m) => (
        <article key={m._id} className={cn("rounded-2xl border bg-white p-5", !m.isRead && "border-primary/40 ring-1 ring-primary/20")}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold">{m.subject}</h3>
              <p className="text-sm text-muted-foreground">
                {m.name}
                {m.phone && <> · <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-primary"><Phone className="size-3" />{m.phone}</a></>}
                {m.email && <> · <a href={`mailto:${m.email}`} className="text-primary">{m.email}</a></>}
                {" · "}{dateTime(m._creationTime)}
              </p>
            </div>
            <div className="flex gap-1">
              <Button size="sm" variant="ghost" onClick={() => setRead.run({ id: m._id, isRead: !m.isRead })}>
                {m.isRead ? <><Mail className="size-4" /> Non lu</> : <><MailOpen className="size-4" /> Lu</>}
              </Button>
              <ConfirmDialog trigger={<Button size="sm" variant="ghost" className="text-destructive"><Trash2 className="size-4" /></Button>} title="Supprimer ce message ?" onConfirm={() => remove.run({ id: m._id })} />
            </div>
          </div>
          <p className="mt-3 whitespace-pre-line text-sm">{m.message}</p>
        </article>
      ))}
      {status === "CanLoadMore" && <div className="text-center"><Button variant="outline" onClick={() => loadMore(20)}>Charger plus</Button></div>}
    </div>
  );
}

function Newsletter() {
  const subs = useQuery(api.messages.subscribers);
  const remove = useAdminMutation(api.messages.removeSubscriber, { success: "Abonné retiré", revalidate: false });
  const download = () => {
    if (!subs) return;
    const csv = "﻿email;langue;date\n" + subs.map((s) => `${s.email};${s.locale};${dateTime(s._creationTime)}`).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = "newsletter.csv";
    a.click();
  };
  return (
    <Panel title={`Abonnés (${subs?.length ?? "…"})`} actions={<Button size="sm" variant="outline" onClick={download} disabled={!subs?.length}><Download className="size-4" /> CSV</Button>}>
      {!subs ? <Skeleton className="h-40" /> : subs.length === 0 ? <p className="text-sm text-muted-foreground">Aucun abonné.</p> : (
        <ul className="-my-2 divide-y">
          {subs.map((s) => (
            <li key={s._id} className="flex items-center justify-between py-2 text-sm">
              <span>{s.email} <span className="text-xs uppercase text-muted-foreground">{s.locale}</span></span>
              <span className="flex items-center gap-3 text-xs text-muted-foreground">
                {dateTime(s._creationTime)}
                <button type="button" onClick={() => remove.run({ id: s._id })} className="text-destructive" aria-label="Retirer"><Trash2 className="size-4" /></button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export default function MessagesPage() {
  return (
    <RequirePermission perm="customers">
      <PageHeader title="Messages" description="Messages du formulaire de contact et abonnés à la newsletter." />
      <Tabs defaultValue="contact">
        <TabsList>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="newsletter">Newsletter</TabsTrigger>
        </TabsList>
        <TabsContent value="contact" className="pt-4"><ContactMessages /></TabsContent>
        <TabsContent value="newsletter" className="pt-4"><Newsletter /></TabsContent>
      </Tabs>
    </RequirePermission>
  );
}
