/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as account from "../account.js";
import type * as auth from "../auth.js";
import type * as brands from "../brands.js";
import type * as categories from "../categories.js";
import type * as cloudinary from "../cloudinary.js";
import type * as coupons from "../coupons.js";
import type * as crons from "../crons.js";
import type * as customers from "../customers.js";
import type * as electrodarna from "../electrodarna.js";
import type * as homepage from "../homepage.js";
import type * as http from "../http.js";
import type * as inventory from "../inventory.js";
import type * as lib_catalog from "../lib/catalog.js";
import type * as lib_images from "../lib/images.js";
import type * as lib_permissions from "../lib/permissions.js";
import type * as lib_resendOtp from "../lib/resendOtp.js";
import type * as lib_settings from "../lib/settings.js";
import type * as lib_stock from "../lib/stock.js";
import type * as lib_theme from "../lib/theme.js";
import type * as lib_utils from "../lib/utils.js";
import type * as lib_validators from "../lib/validators.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as orders from "../orders.js";
import type * as products from "../products.js";
import type * as reviews from "../reviews.js";
import type * as seed from "../seed.js";
import type * as settings from "../settings.js";
import type * as stats from "../stats.js";
import type * as users from "../users.js";
import type * as wishlist from "../wishlist.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  account: typeof account;
  auth: typeof auth;
  brands: typeof brands;
  categories: typeof categories;
  cloudinary: typeof cloudinary;
  coupons: typeof coupons;
  crons: typeof crons;
  customers: typeof customers;
  electrodarna: typeof electrodarna;
  homepage: typeof homepage;
  http: typeof http;
  inventory: typeof inventory;
  "lib/catalog": typeof lib_catalog;
  "lib/images": typeof lib_images;
  "lib/permissions": typeof lib_permissions;
  "lib/resendOtp": typeof lib_resendOtp;
  "lib/settings": typeof lib_settings;
  "lib/stock": typeof lib_stock;
  "lib/theme": typeof lib_theme;
  "lib/utils": typeof lib_utils;
  "lib/validators": typeof lib_validators;
  messages: typeof messages;
  notifications: typeof notifications;
  orders: typeof orders;
  products: typeof products;
  reviews: typeof reviews;
  seed: typeof seed;
  settings: typeof settings;
  stats: typeof stats;
  users: typeof users;
  wishlist: typeof wishlist;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
