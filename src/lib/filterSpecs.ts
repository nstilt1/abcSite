export interface FilterSpec {
  key: string;
  label: string;
}

export const COMMON_FILTERS: FilterSpec[] = [
  { key: "languages", label: "Languages" },
  { key: "frameworks", label: "Frameworks" },
  { key: "tags", label: "Tags" },
];

export const PROJECT_FILTERS: FilterSpec[] = [
  ...COMMON_FILTERS,
  { key: "status", label: "Status" },
];