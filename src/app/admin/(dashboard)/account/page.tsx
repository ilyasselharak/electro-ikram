"use client";

import { useState } from "react";
import { api } from "@convex/_generated/api";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel } from "@/components/admin/page-header";
import { useMe } from "@/components/admin/admin-shell";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { useAdminAction } from "@/hooks/use-admin-mutation";

export default function AccountPage() {
  const me = useMe();
  const change = useAdminAction(api.users.changeOwnPassword, { success: "Mot de passe modifié" });
  const [f, setF] = useState({ current: "", next: "", confirm: "" });

  return (
    <div className="max-w-xl">
      <PageHeader title="Mon compte" description={me.email ?? ""} />
      <Panel title="Changer mon mot de passe">
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (f.next !== f.confirm) return toast.error("Les mots de passe ne correspondent pas.");
            if ((await change.run({ currentPassword: f.current, newPassword: f.next })) !== undefined) setF({ current: "", next: "", confirm: "" });
          }}
        >
          <Field label="Mot de passe actuel"><input type="password" autoComplete="current-password" className={inputClass} value={f.current} onChange={(e) => setF({ ...f, current: e.target.value })} required /></Field>
          <Field label="Nouveau mot de passe" hint="8 caractères minimum, avec une lettre et un chiffre."><input type="password" autoComplete="new-password" className={inputClass} value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} required /></Field>
          <Field label="Confirmer"><input type="password" autoComplete="new-password" className={inputClass} value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} required /></Field>
          <Button type="submit" disabled={change.pending}>{change.pending && <Loader2 className="size-4 animate-spin" />} Mettre à jour</Button>
        </form>
      </Panel>
    </div>
  );
}
