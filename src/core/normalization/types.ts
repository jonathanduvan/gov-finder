export interface RawOfficialInput {
  fullName: string;
  role: string;
  email?: string;
  state?: string;
  category?: string;
  level?: string;
  offices?: any[]; // extend later
  issues?: string[]; // slugs like "climate"
  identifiers?: {
    officialId?: string;
    externalRefs?: string[];
  };
  sourceAttributions?: { sourceId: string; weight?: number }[];
}