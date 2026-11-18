import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";

export type CategoryItem = FunctionReturnType<typeof api.categories.listPublic>[number];
export type CategoryNode = CategoryItem & { children: CategoryNode[] };

export function buildTree(list: CategoryItem[]): CategoryNode[] {
  const map = new Map<string, CategoryNode>();
  list.forEach((c) => map.set(c._id, { ...c, children: [] }));
  const roots: CategoryNode[] = [];
  for (const node of map.values()) {
    if (node.parentId && map.has(node.parentId)) map.get(node.parentId)!.children.push(node);
    else roots.push(node);
  }
  const sort = (arr: CategoryNode[]) => {
    arr.sort((a, b) => a.order - b.order);
    arr.forEach((n) => sort(n.children));
  };
  sort(roots);
  return roots;
}
