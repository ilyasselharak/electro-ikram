# Electro-Ikram — E-commerce électroménager (FR / AR)

Boutique en ligne bilingue (français / arabe RTL) pour l'électroménager et l'électronique, avec tableau de bord d'administration complet.

| Couche | Technologie |
| --- | --- |
| Front | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS v4, shadcn/ui (Radix), Lucide, Motion, Sonner, Recharts |
| i18n | next-intl — routes `/fr` (défaut) et `/ar` (RTL) |
| Données | Convex (base de données, requêtes, mutations, actions) |
| Auth | Convex Auth (mot de passe + réinitialisation par code e-mail via Resend) |
| Images | Cloudinary (upload signé, WebP/AVIF automatique, redimensionnement) |
| Formulaires | React Hook Form + Zod |
| État client | Zustand (panier, historique de recherche, produits vus) |

---

## 1. Installation

Prérequis : Node.js ≥ 20, un compte [Convex](https://convex.dev), un compte [Cloudinary](https://cloudinary.com), (optionnel) un compte [Resend](https://resend.com).

```bash
npm install
cp .env.example .env.local
```

## 2. Configurer Convex

```bash
npx convex dev          # connecte/crée le projet, écrit NEXT_PUBLIC_CONVEX_URL dans .env.local,
                        # pousse le schéma et les fonctions, puis surveille les changements
```

Laissez ce terminal ouvert pendant le développement.

> Sans compte : `CONVEX_AGENT_MODE=anonymous npx convex dev` lance un backend Convex **local** (utile pour tester).

Initialisez la structure de la boutique (paramètres, 10 catégories, sections d'accueil) :

```bash
npm run seed            # = npx convex run seed:init  (idempotent)
```

Catalogue de démonstration **pour le développement uniquement** (SKU `DEMO-…`, sans images) :

```bash
npm run seed:demo                              # ajouter
npx convex run seed:clearDemo '{"includeBrands":true}'   # retirer avant la mise en production
```

## 3. Configurer l'authentification

Les clés de signature des sessions sont stockées sur le déploiement Convex :

```bash
npm run auth:keys                                   # génère et enregistre JWT_PRIVATE_KEY + JWKS
npx convex env set SITE_URL http://localhost:3000   # URL du site (production : votre domaine)
```

**Réinitialisation du mot de passe** (« Mot de passe oublié ») — envoi d'un code à 8 chiffres via Resend :

```bash
npx convex env set AUTH_RESEND_KEY re_xxxxxxxx
npx convex env set AUTH_EMAIL_FROM "Electro-Ikram <no-reply@votre-domaine.ma>"   # domaine vérifié chez Resend
```

La même clé active l'e-mail de notification à chaque nouvelle commande (adresse définie dans *Admin → Paramètres*). Sans Resend, un propriétaire peut toujours redéfinir le mot de passe d'un membre depuis *Admin → Administrateurs*.

## 4. Créer le premier administrateur

Les inscriptions publiques sont **désactivées**. Créez le compte propriétaire depuis la CLI (refusé dès qu'un propriétaire existe) :

```bash
npx convex run users:createFirstOwner '{"email":"vous@exemple.ma","password":"MotDePasse123","name":"Votre nom"}'
```

Connectez-vous ensuite sur `/admin/login`. Les autres comptes se créent dans **Admin → Administrateurs**.

| Rôle | Accès |
| --- | --- |
| Propriétaire | Tout, y compris la gestion des administrateurs |
| Administrateur | Tout sauf les administrateurs |
| Éditeur | Produits, catégories, marques, page d'accueil, bannières, SEO |

Les rôles sont vérifiés **côté serveur** dans chaque requête/mutation Convex (`convex/lib/permissions.ts`) ; l'interface ne fait que masquer les sections.

## 5. Configurer Cloudinary

Récupérez *Cloud name*, *API key* et *API secret* dans la console Cloudinary, puis :

```bash
npx convex env set CLOUDINARY_CLOUD_NAME votre-cloud
npx convex env set CLOUDINARY_API_KEY 123456789012345
npx convex env set CLOUDINARY_API_SECRET xxxxxxxxxxxxxxxx
# optionnel : npx convex env set CLOUDINARY_FOLDER electro-ikram
```

Fonctionnement :
- le navigateur demande une signature à l'action Convex `cloudinary:signUpload` (réservée au personnel) puis envoie l'image directement à Cloudinary — **le secret ne quitte jamais Convex** ;
- `publicId`, URL, dimensions et texte alternatif sont stockés dans Convex ;
- les images retirées ou remplacées (produits, catégories, marques, bannières, logo…) sont supprimées de Cloudinary automatiquement (uniquement dans le dossier de la boutique, et seulement si aucun autre produit ne les utilise) ;
- l'affichage passe par un loader `next/image` qui ajoute `f_auto,q_auto,c_limit,w_…` (WebP/AVIF selon le navigateur, largeur adaptée).

## 6. Lancer en local

Deux terminaux :

```bash
npx convex dev      # backend
npm run dev         # http://localhost:3000  →  redirige vers /fr
```

Vérifications :

```bash
npm run typecheck && npm run lint && npm run build
```

## 7. Déploiement en production

### Convex
```bash
npx convex deploy                              # pousse schéma + fonctions en production
npm run auth:keys -- --prod                    # clés JWT de production
npx convex env set --prod SITE_URL https://www.votre-domaine.ma
npx convex env set --prod CLOUDINARY_CLOUD_NAME …   # + API_KEY, API_SECRET
npx convex env set --prod AUTH_RESEND_KEY …          # + AUTH_EMAIL_FROM (optionnel)
npx convex run --prod seed:init
npx convex run --prod users:createFirstOwner '{"email":"…","password":"…","name":"…"}'
```

### Vercel (recommandé)
1. Importez le dépôt dans Vercel.
2. Variables d'environnement :
   - `NEXT_PUBLIC_SITE_URL=https://www.votre-domaine.ma`
   - `CONVEX_DEPLOY_KEY` (Convex → Settings → Deploy key de production)
3. Commande de build : `npx convex deploy --cmd 'npm run build'` (déploie Convex puis Next.js et injecte `NEXT_PUBLIC_CONVEX_URL`).
4. Après le premier déploiement : *Admin → SEO* → renseignez l'**URL canonique du site** et vérifiez `/sitemap.xml` et `/robots.txt`, puis soumettez le sitemap dans Google Search Console.

Tout hébergeur Node.js compatible Next.js 16 convient également (`npm run build && npm start`).

---

## Architecture

```
convex/                       Backend (source de vérité)
  schema.ts                   Tables + index + index de recherche
  lib/permissions.ts          Rôles et garde requirePermission()
  lib/validators.ts           Validateurs partagés
  products.ts categories.ts brands.ts      Catalogue (public + admin)
  orders.ts coupons.ts customers.ts        Commandes, stock, codes promo, clients
  homepage.ts settings.ts stats.ts         Contenu, paramètres, tableau de bord
  users.ts auth.ts cloudinary.ts           Comptes, auth, images
  messages.ts notifications.ts seed.ts     Contact/newsletter, notifications, données initiales
src/
  proxy.ts                    Routage i18n + protection /admin (Next 16 « proxy »)
  i18n/ messages/             next-intl (fr.json, ar.json)
  app/[locale]/…              Boutique publique (ISR, métadonnées, JSON-LD)
  app/admin/…                 Tableau de bord (client, temps réel)
  app/sitemap.ts robots.ts    SEO technique dynamique
  components/store|admin|ui   Composants
  lib/convex-server.ts        Requêtes Convex mises en cache (tag "storefront")
  lib/seo.ts                  Métadonnées, hreflang, canonical, JSON-LD
  stores/                     Panier et navigation (Zustand + localStorage)
```

### Points clés
- **Commandes / stock** : `orders:create` revalide chaque ligne (statut, prix, stock) côté serveur, applique le code promo, calcule la livraison et décrémente le stock dans une seule transaction Convex. Les prix envoyés par le navigateur sont ignorés. Annulation/retour → stock réintégré ; réactivation → stock re-déduit. Limite : 5 commandes/heure par téléphone, 20 unités par ligne.
- **Suivi** : `/track-order` (numéro + téléphone). La page de confirmation exige un jeton secret renvoyé à la création.
- **Cache** : les pages publiques sont statiques/ISR (60 s). Chaque enregistrement dans l'admin appelle une Server Action qui vérifie le rôle puis invalide le tag `storefront` : les changements apparaissent immédiatement.
- **SEO** : métadonnées localisées, `hreflang` fr/ar/x-default, canonical par langue, Open Graph/Twitter, JSON-LD (Organization, WebSite + SearchAction, ElectronicsStore, BreadcrumbList, Product avec offre MAD et disponibilité réelle, FAQPage), sitemap multilingue, robots.txt, redirections 301 automatiques lors d'un changement de slug, vraies réponses 404, pages filtrées/recherche en `noindex`. Aucun avis ni note n'est généré.
- **URL** : un slug latin unique par produit/catégorie, partagé par `/fr/...` et `/ar/...` (lisible, sans encodage d'URL arabe).

### Contenu à relire avant la mise en ligne
Les textes des pages À propos, FAQ, Livraison, Retours, Confidentialité et CGV se trouvent dans `src/messages/fr.json` et `ar.json` (clé `content`). Ce sont des modèles génériques : faites-les valider (notamment les mentions légales et la loi 09-08).
