// ---------------------------------------------------------------------------
// LinkML schema types — matches the JSON produced by our Python export script
// and the raw YAML structure for uploaded files
// ---------------------------------------------------------------------------

/** A single slot/column as exported by our Python SchemaView script */
export interface ErdSlot {
  name: string;          // display name (alias-resolved, e.g. "person_id")
  slot_name: string;     // internal LinkML slot name (e.g. "person_person_id")
  range: string;         // e.g. "integer", "string", "person", "concept"
  required: boolean;
  identifier: boolean;   // true = primary key
  multivalued: boolean;
  is_fk: boolean;        // true when range points to another class
  description: string;
}

/** A single class/table in the ERD */
export interface ErdClass {
  name: string;
  description: string;
  slots: ErdSlot[];
}

/** The top-level normalized schema structure */
export interface NormalizedSchema {
  name: string;
  description: string;
  id: string;
  classes: Record<string, ErdClass>;
}

// ---------------------------------------------------------------------------
// Raw LinkML YAML types — used when parsing an uploaded .yaml file directly
// ---------------------------------------------------------------------------

export interface RawLinkMLSlot {
  name?: string;
  range?: string;
  required?: boolean;
  identifier?: boolean;
  multivalued?: boolean;
  description?: string;
  alias?: string;
  domain_of?: string[];
  is_a?: string;
  slot_uri?: string;
}

export interface RawLinkMLClass {
  name?: string;
  description?: string;
  slots?: string[];
  slot_usage?: Record<string, Partial<RawLinkMLSlot>>;
  is_a?: string;
  abstract?: boolean;
}

export interface RawLinkMLSchema {
  name?: string;
  description?: string;
  id?: string;
  classes?: Record<string, RawLinkMLClass>;
  slots?: Record<string, RawLinkMLSlot>;
}

// ---------------------------------------------------------------------------
// ERD graph model — output of the parser, input to Svelte Flow
// ---------------------------------------------------------------------------

export type DomainName =
  | 'clinical'
  | 'vocabulary'
  | 'infrastructure'
  | 'era'
  | 'episode'
  | 'other';

export interface ErdNodeData {
  label: string;
  description: string;
  domain: DomainName;
  slots: ErdSlot[];
  collapsed: boolean;
}

export interface ErdEdgeData {
  slotName: string;
  required: boolean;
  targetClass: string;
}

/** Domain metadata for the sidebar */
export interface DomainInfo {
  name: DomainName;
  label: string;
  color: string;
  classes: string[];
}
