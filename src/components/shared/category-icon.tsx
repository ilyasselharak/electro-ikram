import {
  AirVent,
  Banknote,
  Blend,
  ChefHat,
  CookingPot,
  Fan,
  Flame,
  Headset,
  LayoutGrid,
  Microwave,
  Refrigerator,
  ShieldCheck,
  Snowflake,
  Truck,
  Tv,
  WashingMachine,
  Wind,
  type LucideIcon,
  BadgePercent,
  Clock,
  Wrench,
  Award,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  refrigerator: Refrigerator,
  snowflake: Snowflake,
  "washing-machine": WashingMachine,
  tv: Tv,
  "air-vent": AirVent,
  flame: Flame,
  "cooking-pot": CookingPot,
  microwave: Microwave,
  wind: Wind,
  "chef-hat": ChefHat,
  blend: Blend,
  fan: Fan,
  truck: Truck,
  banknote: Banknote,
  "shield-check": ShieldCheck,
  headset: Headset,
  "badge-percent": BadgePercent,
  clock: Clock,
  wrench: Wrench,
  award: Award,
  grid: LayoutGrid,
};

export const ICON_NAMES = Object.keys(ICONS);

export function DynamicIcon({ name, className }: { name?: string; className?: string }) {
  const Icon = (name && ICONS[name]) || LayoutGrid;
  return <Icon className={className} aria-hidden />;
}
