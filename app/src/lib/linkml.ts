/**
 * LinkML schema parser
 *
 * Accepts two input formats:
 *  1. Our normalized JSON export (produced by the Python SchemaView script)
 *  2. Raw LinkML YAML (parsed by js-yaml from an uploaded file)
 *
 * Outputs a NormalizedSchema that the ERD layout and Svelte Flow components consume.
 */

import yaml from 'js-yaml';
import { base } from '$app/paths';
import type {
  NormalizedSchema,
  ErdClass,
  ErdSlot,
  RawLinkMLSchema,
  RawLinkMLSlot,
  DomainName,
  DomainInfo,
} from './types';

// ---------------------------------------------------------------------------
// Domain classification
// ---------------------------------------------------------------------------

const DOMAIN_CLASSES: Record<DomainName, string[]> = {
  clinical: [
    'person',
    'observation_period',
    'visit_occurrence',
    'visit_detail',
    'condition_occurrence',
    'drug_exposure',
    'procedure_occurrence',
    'device_exposure',
    'measurement',
    'observation',
    'death',
    'note',
    'note_nlp',
    'specimen',
    'fact_relationship',
  ],
  vocabulary: [
    'concept',
    'vocabulary',
    'domain',
    'concept_class',
    'concept_relationship',
    'relationship',
    'concept_synonym',
    'concept_ancestor',
    'source_to_concept_map',
    'drug_strength',
  ],
  infrastructure: [
    'location',
    'care_site',
    'provider',
    'cdm_source',
    'metadata',
    'cost',
    'payer_plan_period',
  ],
  era: ['drug_era', 'dose_era', 'condition_era'],
  episode: ['episode', 'episode_event'],
  other: [],
};

export const DOMAIN_INFO: DomainInfo[] = [
  {
    name: 'clinical',
    label: 'Clinical',
    color: '#2563eb',
    classes: DOMAIN_CLASSES.clinical,
  },
  {
    name: 'vocabulary',
    label: 'Vocabulary',
    color: '#7c3aed',
    classes: DOMAIN_CLASSES.vocabulary,
  },
  {
    name: 'infrastructure',
    label: 'Infrastructure',
    color: '#059669',
    classes: DOMAIN_CLASSES.infrastructure,
  },
  {
    name: 'era',
    label: 'Era',
    color: '#d97706',
    classes: DOMAIN_CLASSES.era,
  },
  {
    name: 'episode',
    label: 'Episode',
    color: '#dc2626',
    classes: DOMAIN_CLASSES.episode,
  },
  {
    name: 'other',
    label: 'Other',
    color: '#6b7280',
    classes: [],
  },
];

/** Build a reverse lookup: class name → domain */
function buildDomainMap(classNames: string[]): Map<string, DomainName> {
  const map = new Map<string, DomainName>();
  // First pass: known domains
  for (const [domain, classes] of Object.entries(DOMAIN_CLASSES) as [DomainName, string[]][]) {
    for (const cls of classes) {
      map.set(cls, domain);
    }
  }
  // Second pass: anything not in a known domain → 'other'
  for (const cls of classNames) {
    if (!map.has(cls)) {
      map.set(cls, 'other');
      DOMAIN_CLASSES.other.push(cls);
      const otherInfo = DOMAIN_INFO.find((d) => d.name === 'other');
      if (otherInfo && !otherInfo.classes.includes(cls)) {
        otherInfo.classes.push(cls);
      }
    }
  }
  return map;
}

// ---------------------------------------------------------------------------
// Primitive type set (ranges that are NOT foreign keys)
// ---------------------------------------------------------------------------

const PRIMITIVE_RANGES = new Set([
  'string',
  'integer',
  'float',
  'double',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'time',
  'date_or_datetime',
  'uri',
  'uriorcurie',
  'curie',
  'ncname',
  'objectidentifier',
  'nodeidentifier',
  'jsonpointer',
  'jsonpath',
  'sparqlpath',
]);

// ---------------------------------------------------------------------------
// Parser: normalized JSON (from our Python export)
// ---------------------------------------------------------------------------

/** Check whether the input looks like our normalized JSON export */
function isNormalizedJson(raw: unknown): raw is NormalizedSchema {
  return (
    typeof raw === 'object' &&
    raw !== null &&
    'classes' in raw &&
    typeof (raw as Record<string, unknown>).classes === 'object'
  );
}

function parseNormalizedJson(raw: NormalizedSchema): NormalizedSchema {
  // Reset 'other' domain classes so re-parsing works correctly
  DOMAIN_CLASSES.other = [];
  const otherInfo = DOMAIN_INFO.find((d) => d.name === 'other');
  if (otherInfo) otherInfo.classes = [];

  const classNames = Object.keys(raw.classes);
  buildDomainMap(classNames);
  return raw; // already in correct shape
}

// ---------------------------------------------------------------------------
// Parser: raw LinkML YAML
// ---------------------------------------------------------------------------

function parseRawLinkML(raw: RawLinkMLSchema): NormalizedSchema {
  // Reset 'other' domain classes
  DOMAIN_CLASSES.other = [];
  const otherInfo = DOMAIN_INFO.find((d) => d.name === 'other');
  if (otherInfo) otherInfo.classes = [];

  const rawClasses = raw.classes ?? {};
  const rawSlots = raw.slots ?? {};
  const classNames = new Set(Object.keys(rawClasses));

  buildDomainMap([...classNames]);

  const classes: Record<string, ErdClass> = {};

  for (const [className, classDef] of Object.entries(rawClasses)) {
    if (classDef.abstract) continue; // skip abstract classes

    const slotList = classDef.slots ?? [];
    const slotUsage = classDef.slot_usage ?? {};

    const slots: ErdSlot[] = slotList.map((slotRefName): ErdSlot => {
      // The slot definition comes from either slot_usage (class-scoped) or top-level slots
      const topSlot: RawLinkMLSlot = rawSlots[slotRefName] ?? {};
      const usageSlot: Partial<RawLinkMLSlot> = slotUsage[slotRefName] ?? {};

      // Merge: slot_usage overrides top-level
      const merged: RawLinkMLSlot = { ...topSlot, ...usageSlot };

      // Display name: prefer alias, then strip class prefix from slot name
      const displayName =
        merged.alias ??
        (slotRefName.startsWith(className + '_')
          ? slotRefName.slice(className.length + 1)
          : slotRefName);

      const range = merged.range ?? 'string';
      const isIdentifier = Boolean(merged.identifier);
      const isFk = classNames.has(range) && !isIdentifier && !PRIMITIVE_RANGES.has(range);

      return {
        name: displayName,
        slot_name: slotRefName,
        range,
        required: Boolean(merged.required),
        identifier: isIdentifier,
        multivalued: Boolean(merged.multivalued),
        is_fk: isFk,
        description: String(merged.description ?? ''),
      };
    });

    classes[className] = {
      name: className,
      description: String(classDef.description ?? ''),
      slots,
    };
  }

  return {
    name: String(raw.name ?? 'Unknown schema'),
    description: String(raw.description ?? ''),
    id: String(raw.id ?? ''),
    classes,
  };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Parse a LinkML schema from either:
 *  - A pre-parsed object (our normalized JSON export, or raw YAML parsed by js-yaml)
 *  - A raw YAML/JSON string
 */
export function parseLinkMLSchema(input: unknown): NormalizedSchema {
  let raw: unknown = input;

  // If given a string, parse it first
  if (typeof input === 'string') {
    const trimmed = input.trimStart();
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      raw = JSON.parse(input);
    } else {
      raw = yaml.load(input);
    }
  }

  if (isNormalizedJson(raw)) {
    return parseNormalizedJson(raw);
  }

  // Try treating as raw LinkML YAML
  return parseRawLinkML(raw as RawLinkMLSchema);
}

/**
 * Load the default OMOP CDM schema from the static asset.
 */
export async function loadDefaultSchema(): Promise<NormalizedSchema> {
  const res = await fetch(`${base}/omop_cdm.schema.json`);
  if (!res.ok) throw new Error(`Failed to load default schema: ${res.statusText}`);
  const json = await res.json();
  return parseLinkMLSchema(json);
}
