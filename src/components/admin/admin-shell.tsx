"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import type { FunctionReturnType } from "convex/server";
import {
  Bell,

  ExternalLink,
  FolderTree,
  Image as ImageIcon,
  KeyRound,
  LayoutDashboard,
  LayoutTemplate,
  Link2,
  Loader2,
  LogOut,
  Mail,
  Menu,
  Package,
  Search as SearchIcon,
  Settings,
  ShieldAlert,
  ShoppingCart,
  Tags,
  TicketPercent,
  Users,
  UserCog,
} from "lucide-react";
import { api } from "@convex/_generated/api";
import { Logo } from "@/components/store/logo";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { dateTime } from "@/lib/admin-format";
import { cn } from "@/lib/utils";

export type Me = NonNullable<FunctionReturnType<typeof api.users.me>>;
type Permission = Me["permissions"][number];

const NAV: { href: string; label: string; icon: typeof Package; perm: Permission; exact?: boolean }[] = [
  { href: "/admin", label: "Vue d'ensemble", icon: LayoutDashboard, perm: "stats", exact: true },
  { href: "/admin/products", label: "Produits", icon: Package, perm: "catalog" },
  { href: "/admin/categories", label: "Catégories", icon: FolderTree, perm: "catalog" },
  { href: "/admin/brands", label: "Marques", icon: Tags, perm: "catalog" },
  { href: "/admin/electrodarna", label: "Electro Darna", icon: Link2, perm: "catalog" },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingCart, perm: "orders" },
  { href: "/admin/customers", label: "Clients", icon: Users, perm: "customers" },
  { href: "/admin/messages", label: "Messages", icon: Mail, perm: "customers" },
  { href: "/admin/coupons", label: "Codes promo", icon: TicketPercent, perm: "coupons" },
  { href: "/admin/homepage", label: "Page d'accueil", icon: LayoutTemplate, perm: "content" },
  { href: "/admin/banners", label: "Bannières", icon: ImageIcon, perm: "content" },
  { href: "/admin/seo", label: "SEO", icon: SearchIcon, perm: "content" },
  { href: "/admin/settings", label: "Paramètres", icon: Settings, perm: "settings" },
  { href: "/admin/users", label: "Administrateurs", icon: UserCog, perm: "users" },
];

const MeContext = createContext<Me | null>(null);
export function useMe() {
  const me = useContext(MeContext);
  if (!me) throw new Error("useMe outside AdminShell");
  return me;
}
export function useCan(perm: Permission) {
  return useMe().permissions.includes(perm);
}

const ROLE_LABEL: Record<string, string> = { owner: "Propriétaire", admin: "Administrateur", editor: "Éditeur" };

function NavLinks({ me, onNavigate }: { me: Me; onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav className="space-y-0.5 px-3">
      {NAV.filter((n) => me.permissions.includes(n.perm)).map((n) => {
        const active = n.exact ? pathname === n.href : pathname.startsWith(n.href);
        return (
          <Link
            key={n.href}
            href={n.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active ? "bg-sidebar-primary text-white shadow-sm" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white",
            )}
          >
            <n.icon className="size-[18px]" />
            {n.label}
          </Link>
        );
      })}
    </nav>
  );
}

function Notifications() {
  const data = useQuery(api.notifications.list);
  const markRead = useMutation(api.notifications.markRead);
  const router = useRouter();
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" className="relative grid size-10 place-items-center rounded-lg hover:bg-secondary" aria-label="Notifications">
          <Bell className="size-5 text-navy" />
          {!!data?.unread && (
            <span className="absolute end-1.5 top-1.5 grid min-w-4 place-items-center rounded-full bg-sale px-1 text-[10px] font-bold leading-4 text-white">
              {data.unread > 9 ? "9+" : data.unread}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Notifications</p>
          {!!data?.unread && (
            <button type="button" className="text-xs text-primary hover:underline" onClick={() => markRead({})}>
              Tout marquer comme lu
            </button>
          )}
        </div>
        <ul className="max-h-96 overflow-y-auto">
          {!data?.items.length && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Aucune notification</li>}
          {data?.items.map((n) => (
            <li key={n._id}>
              <button
                type="button"
                onClick={() => {
                  if (!n.isRead) markRead({ id: n._id });
                  if (n.link) router.push(n.link);
                }}
                className={cn("block w-full border-b px-4 py-3 text-start text-sm hover:bg-secondary", !n.isRead && "bg-accent/50")}
              >
                <p className="font-medium">{n.title}</p>
                {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                <p className="mt-0.5 text-[11px] text-muted-foreground">{dateTime(n._creationTime)}</p>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Pops a toast when a new order notification arrives in real time. */
function NewOrderWatcher({ me }: { me: Me }) {
  const data = useQuery(api.notifications.list);
  const [seen, setSeen] = useState<string | null>(null);
  const latest = data?.items.find((n) => n.kind === "order" && !n.isRead);
  useEffect(() => {
    if (!latest || !me.permissions.includes("orders")) return;
    if (seen === null) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- initialise baseline once
      setSeen(latest._id);
      return;
    }
    if (latest._id !== seen) {
      setSeen(latest._id);
      import("sonner").then(({ toast }) => toast.info(latest.title, { description: latest.body }));
    }
  }, [latest, seen, me.permissions]);
  return null;
}

export function AdminShell({ children }: { children: ReactNode }) {
  const me = useQuery(api.users.me);
  const { signOut } = useAuthActions();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await signOut();
    router.replace("/admin/login");
    router.refresh();
  };

  useEffect(() => {
    if (me === null) router.replace("/admin/login");
  }, [me, router]);

  if (me === undefined || me === null) {
    return (
      <div className="grid min-h-dvh place-items-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!me.isStaff) {
    return (
      <div className="grid min-h-dvh place-items-center p-4">
        <div className="max-w-sm rounded-2xl border bg-white p-8 text-center">
          <ShieldAlert className="mx-auto size-10 text-destructive" />
          <h1 className="mt-4 text-lg font-bold">Accès refusé</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ce compte n&apos;a pas (ou plus) accès à l&apos;administration.</p>
          <Button className="mt-6" onClick={logout}>
            Se déconnecter
          </Button>
        </div>
      </div>
    );
  }

  const sidebar = (onNavigate?: () => void) => (
    <div className="flex h-full flex-col bg-sidebar text-sidebar-foreground">
      <div className="flex h-16 items-center px-5">
        <Logo inverted />
      </div>
      <div className="flex-1 overflow-y-auto py-3">
        <NavLinks me={me} onNavigate={onNavigate} />
      </div>
      <div className="space-y-1 border-t border-sidebar-border p-3">
        <a href="/fr" target="_blank" className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white">
          <ExternalLink className="size-[18px]" /> Voir la boutique
        </a>
        <button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-white">
          <LogOut className="size-[18px]" /> Déconnexion
        </button>
      </div>
    </div>
  );

  return (
    <MeContext.Provider value={me}>
      <NewOrderWatcher me={me} />
      <div className="min-h-dvh lg:grid lg:grid-cols-[256px_1fr]">
        <aside className="sticky top-0 hidden h-dvh lg:block">{sidebar()}</aside>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetContent side="left" className="w-72 border-0 p-0" showCloseButton={false}>
            <SheetHeader className="sr-only">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            {sidebar(() => setOpen(false))}
          </SheetContent>
        </Sheet>
        <div className="min-w-0">
          <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-white/90 px-4 backdrop-blur sm:px-6">
            <button type="button" className="grid size-10 place-items-center rounded-lg hover:bg-secondary lg:hidden" onClick={() => setOpen(true)} aria-label="Menu">
              <Menu className="size-5" />
            </button>
            <div className="flex-1" />
            <Notifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-secondary">
                  <span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-white">
                    {(me.name || me.email || "?").charAt(0).toUpperCase()}
                  </span>
                  <span className="hidden text-start sm:block">
                    <span className="block text-sm font-semibold leading-tight">{me.name || me.email}</span>
                    <span className="block text-xs text-muted-foreground">{ROLE_LABEL[me.role ?? ""]}</span>
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{me.email}</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/admin/account")}>
                  <KeyRound className="size-4" /> Mon compte
                </DropdownMenuItem>
                <DropdownMenuItem onClick={logout}>
                  <LogOut className="size-4" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </MeContext.Provider>
  );
}

/** Renders children only for users holding `perm`. */
export function RequirePermission({ perm, children }: { perm: Permission; children: ReactNode }) {
  const can = useCan(perm);
  if (!can) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center">
        <ShieldAlert className="mx-auto size-8 text-muted-foreground" />
        <p className="mt-3 font-semibold">Vous n&apos;avez pas accès à cette section.</p>
      </div>
    );
  }
  return <>{children}</>;
}

