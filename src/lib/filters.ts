import type { ContentItem, FilterMap } from "@/lib/content-types";

export function filterItems<T extends ContentItem>(items: T[], filters: FilterMap): T[] {
  return items.filter((item) => {
    for (const [field, selected] of Object.entries(filters)) {
      if (!selected?.length) continue;

      const value = item[field];
      const values = Array.isArray(value)
        ? value.filter((entry): entry is string => typeof entry === "string")
        : typeof value === "string"
          ? [value]
          : [];

      const matches = selected.some((selectedValue) => values.includes(selectedValue));

      if (!matches) {
        return false;
      }
    }

    return true;
  });
}

export function getFacetOptions<T extends ContentItem>(
  items: T[],
  field: string
): string[] {
  const valueSet = new Set<string>();

  for (const item of items) {
    const value = item[field];

    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (typeof entry === "string") {
          valueSet.add(entry);
        }
      });
    } else if (typeof value === "string") {
      valueSet.add(value);
    }
  }

  return Array.from(valueSet).sort();
}