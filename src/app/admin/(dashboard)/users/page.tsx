"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { KeyRound, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { RequirePermission, useMe } from "@/components/admin/admin-shell";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import { Field, inputClass } from "@/components/shared/field";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAdminAction } from "@/hooks/use-admin-mutation";
import { dateTime } from "@/lib/admin-format";

type Role = "owner" | "admin" | "editor";
const ROLES: Record<Role, { label: string; help: string }> = {
  owner: { label: "Propriétaire", help: "Accès complet, y compris la gestion des administrateurs." },
  admin: { label: "Administrateur", help: "Tout sauf la gestion des administrateurs." },
  editor: { label: "Éditeur", help: "Catalogue, page d'accueil, bannières et SEO uniquement." },
};

function CreateDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [f, setF] = useState({ name: "", email: "", password: "", role: "admin" as Role });
  const create = useAdminAction(api.users.create, { success: "Compte créé" });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nouvel administrateur</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Nom"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="E-mail"><input type="email" className={inputClass} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Mot de passe provisoire" hint="8 caractères minimum, avec une lettre et un chiffre. À communiquer de façon sécurisée."><input type="text" className={inputClass} value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="new-password" /></Field>
          <Field label="Rôle" hint={ROLES[f.role].help}>
            <select className={inputClass} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {(Object.keys(ROLES) as Role[]).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
          <Button disabled={create.pending || !f.email || !f.password} onClick={async () => { if (await create.run(f)) onOpenChange(false); }}>
            {create.pending && <Loader2 className="size-4 animate-spin" />} Créer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type UserRow = { _id: Id<"users">; name: string; email: string; role: Role; isActive: boolean };

function EditDialog({ user, onClose }: { user: UserRow; onClose: () => void }) {
  const [f, setF] = useState({ name: user.name, role: user.role, isActive: user.isActive });
  const [password, setPassword] = useState("");
  const update = useAdminAction(api.users.update, { success: "Compte mis à jour" });
  const reset = useAdminAction(api.users.resetPasswordFor, { success: "Mot de passe réinitialisé (sessions fermées)" });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{user.email}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <Field label="Nom"><input className={inputClass} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <Field label="Rôle" hint={ROLES[f.role].help}>
            <select className={inputClass} value={f.role} onChange={(e) => setF({ ...f, role: e.target.value as Role })}>
              {(Object.keys(ROLES) as Role[]).map((r) => <option key={r} value={r}>{ROLES[r].label}</option>)}
            </select>
          </Field>
          <label className="flex items-center justify-between rounded-xl border p-3 text-sm font-medium">Compte actif <Switch checked={f.isActive} onCheckedChange={(v) => setF({ ...f, isActive: v })} /></label>
          <div className="rounded-xl border p-3">
            <p className="mb-2 flex items-center gap-2 text-sm font-medium"><KeyRound className="size-4" /> Définir un nouveau mot de passe</p>
            <div className="flex gap-2">
              <input className={`${inputClass} h-10`} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nouveau mot de passe" autoComplete="new-password" />
              <Button variant="outline" className="h-10" disabled={!password || reset.pending} onClick={async () => { if ((await reset.run({ id: user._id, password })) !== undefined) setPassword(""); }}>Définir</Button>
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Fermer</Button>
          <Button disabled={update.pending} onClick={async () => { if ((await update.run({ id: user._id, ...f })) !== undefined) onClose(); }}>
            {update.pending && <Loader2 className="size-4 animate-spin" />} Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UsersInner() {
  const users = useQuery(api.users.list);
  const me = useMe();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<UserRow | null>(null);
  const remove = useAdminAction(api.users.remove, { success: "Compte supprimé" });

  return (
    <div>
      <PageHeader title="Administrateurs" description="Comptes ayant accès au tableau de bord et leurs rôles." actions={<Button className="rounded-lg" onClick={() => setCreating(true)}><Plus className="size-4" /> Ajouter</Button>} />
      <div className="overflow-hidden rounded-2xl border bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/50">
              <TableHead>Utilisateur</TableHead>
              <TableHead>Rôle</TableHead>
              <TableHead className="hidden md:table-cell">Dernière connexion</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {!users && <TableRow><TableCell colSpan={5}><Skeleton className="h-10" /></TableCell></TableRow>}
            {users?.map((u) => (
              <TableRow key={u._id}>
                <TableCell><p className="font-medium">{u.name || "—"} {u._id === me._id && <span className="text-xs text-muted-foreground">(vous)</span>}</p><p className="text-xs text-muted-foreground">{u.email}</p></TableCell>
                <TableCell>{ROLES[u.role].label}</TableCell>
                <TableCell className="hidden text-sm text-muted-foreground md:table-cell">{u.lastLoginAt ? dateTime(u.lastLoginAt) : "Jamais"}</TableCell>
                <TableCell>{u.isActive ? <span className="text-xs font-semibold text-emerald-700">Actif</span> : <span className="text-xs font-semibold text-rose-600">Désactivé</span>}</TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <button type="button" onClick={() => setEditing(u)} className="grid size-8 place-items-center rounded-lg hover:bg-secondary" aria-label="Modifier"><Pencil className="size-4" /></button>
                    {u._id !== me._id && (
                      <ConfirmDialog trigger={<button type="button" className="grid size-8 place-items-center rounded-lg text-destructive hover:bg-destructive/10" aria-label="Supprimer"><Trash2 className="size-4" /></button>} title={`Supprimer ${u.email} ?`} description="Le compte et ses sessions seront supprimés." confirmLabel="Supprimer" onConfirm={() => remove.run({ id: u._id })} />
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {creating && <CreateDialog open={creating} onOpenChange={setCreating} />}
      {editing && <EditDialog user={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

export default function UsersPage() {
  return (
    <RequirePermission perm="users">
      <UsersInner />
    </RequirePermission>
  );
}
