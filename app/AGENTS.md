# AGENTS.md — LinkML ERD Viewer

Summary of the project, architecture, and setup for AI coding agents picking up this codebase.

---

## What this is

An interactive **Entity Relationship Diagram (ERD) viewer** built with SvelteKit + Svelte Flow,
designed to visualise any LinkML schema as a pannable/zoomable canvas of table nodes and FK edges.
It ships with the **OMOP CDM v5.4** schema pre-loaded as a static JSON asset.

The app lives entirely in the `app/` directory, which is a self-contained SvelteKit project.
The surrounding Python project (`src/`, `uv.lock`, `pyproject.toml`) is the omop-link library
and is **unrelated** to building or running the frontend.

---

## Tech stack

| Layer | Choice |
|---|---|
| Framework | SvelteKit 2 + Svelte 5 (runes syntax) |
| Canvas | `@xyflow/svelte` v1.5.x (Svelte Flow) |
| Layout engine | `@dagrejs/dagre` v2 (LR directed graph) |
| YAML parsing | `js-yaml` v4 |
| Language | TypeScript 5, strict mode |
| Build tool | Vite 7 |
| Package manager | npm (Node) |

---

## Directory layout

```
app/
├── package.json              # deps and scripts
├── vite.config.ts            # minimal: just sveltekit()
├── svelte.config.js
├── tsconfig.json
├── static/
│   └── omop_cdm.schema.json  # pre-generated normalized schema (3 279 lines, 37 classes)
└── src/
    ├── routes/
    │   ├── +layout.svelte    # minimal HTML shell, imports Svelte Flow CSS
    │   └── +page.svelte      # main app page (state, wiring, SvelteFlow canvas)
    └── lib/
        ├── types.ts          # all shared TypeScript interfaces
        ├── linkml.ts         # schema parser (JSON + raw YAML) and DOMAIN_INFO
        ├── layout.ts         # dagre auto-layout → Svelte Flow nodes/edges
        └── components/
            ├── TableNode.svelte     # custom node: collapsible table card
            ├── GhostNode.svelte     # stub node for cross-domain FK targets
            ├── DomainSidebar.svelte # left panel: domain filter chips + legend
            └── SchemaUploader.svelte # top-bar button + drop zone / file picker
```

---

## Running the app

```bash
cd app
npm install          # first time only
npm run dev          # dev server at http://localhost:5173
npm run build        # production build (output in .svelte-kit/output)
npm run preview      # preview the production build
```

There is no backend. Everything runs in the browser.

---

## How the default schema is generated

`app/static/omop_cdm.schema.json` is produced by a Python script that uses
`linkml_runtime.utils.schemaview.SchemaView` to read
`src/omop_cdm/schema/omop_cdm.yaml` and emit a normalized JSON object.

> **Why not `gen-json-schema`?**  The LinkML CLI tool crashes with a
> `RecursionError` on this schema due to self-referential identifier slot patterns.
> The custom script uses `class_induced_slots()` instead, which handles
> the recursion correctly.

The normalized JSON format is:

```json
{
  "name": "OMOP CDM",
  "description": "...",
  "id": "...",
  "classes": {
    "person": {
      "name": "person",
      "description": "...",
      "slots": [
        {
          "name": "person_id",       // alias-resolved display name
          "slot_name": "person_person_id",  // internal LinkML name
          "range": "integer",
          "required": true,
          "identifier": true,        // true = primary key
          "multivalued": false,
          "is_fk": false,            // true when range is another class
          "description": "..."
        }
      ]
    }
  }
}
```

If you modify the source YAML schema, regenerate the JSON by running a script like:

```python
# run with: uv run python scripts/export_schema.py
from linkml_runtime.utils.schemaview import SchemaView
import json, pathlib

sv = SchemaView("src/omop_cdm/schema/omop_cdm.yaml")
classes = {}
for class_name in sv.all_classes():
    cls = sv.get_class(class_name)
    if cls.abstract:
        continue
    slots = []
    for slot in sv.class_induced_slots(class_name):
        is_id = bool(slot.identifier)
        rng = str(slot.range or "string")
        is_fk = rng in sv.all_classes() and not is_id
        slots.append({
            "name": str(slot.alias or slot.name),
            "slot_name": str(slot.name),
            "range": rng,
            "required": bool(slot.required),
            "identifier": is_id,
            "multivalued": bool(slot.multivalued),
            "is_fk": is_fk,
            "description": str(slot.description or ""),
        })
    classes[class_name] = {
        "name": class_name,
        "description": str(cls.description or ""),
        "slots": slots,
    }

schema = sv.schema
out = {
    "name": str(schema.name),
    "description": str(schema.description or ""),
    "id": str(schema.id),
    "classes": classes,
}
pathlib.Path("app/static/omop_cdm.schema.json").write_text(json.dumps(out, indent=2))
```

---

## Key design decisions

### Schema parsing (`src/lib/linkml.ts`)

Two input paths are supported:

1. **Normalized JSON** — the pre-generated static asset, or any JSON file that
   has a top-level `classes` object. Detected by `isNormalizedJson()`, passed
   through as-is after rebuilding the domain map.

2. **Raw LinkML YAML** — any uploaded `.yaml`/`.yml` file. Parsed by `js-yaml`,
   then `parseRawLinkML()` walks `classes` + `slots`, resolves aliases, detects
   FK ranges (any `range` that names another class and is not an identifier slot),
   and returns the same normalized shape.

### Domain classification (`DOMAIN_INFO` in `linkml.ts`)

OMOP CDM tables are grouped into five domains:

| Domain | Color | Tables |
|---|---|---|
| clinical | `#2563eb` (blue) | person, visit_occurrence, condition_occurrence, … (14 tables) |
| vocabulary | `#7c3aed` (violet) | concept, vocabulary, domain, … (10 tables) |
| infrastructure | `#059669` (green) | location, care_site, provider, cdm_source, … (7 tables) |
| era | `#d97706` (amber) | drug_era, dose_era, condition_era |
| episode | `#dc2626` (red) | episode, episode_event |
| other | `#6b7280` (gray) | any class not matched above (for uploaded schemas) |

Classes from uploaded schemas that don't match any known domain are placed in `other`.

### Ghost nodes (`GhostNode.svelte`)

When a domain is active and one of its tables has a FK pointing to a table in an
**inactive** domain, the target is rendered as a lightweight dashed-border "ghost"
stub node instead of being hidden. This preserves graph connectivity without
forcing unrelated domains to be visible.

### TypeScript / Svelte Flow generics

Svelte Flow v1 requires `Node<Data>` where `Data extends Record<string, unknown>`.
`ErdNodeData` contains `slots: ErdSlot[]`, which TypeScript does not accept as
satisfying `Record<string, unknown>` under strict mode.

**Resolution:** `buildGraph()` in `layout.ts` returns plain `Node[]` / `Edge[]`
(the base unparameterised types). The `data` object is cast with
`as unknown as Record<string, unknown>` at construction time, preserving the
correct runtime shape. Custom node components (`TableNode`, `GhostNode`) accept
`NodeProps<Node<Record<string, unknown>>>` and immediately re-derive `data` as
`rawData as unknown as ErdNodeData`. State in `+page.svelte` uses `Node[]` /
`Edge[]` throughout.

### Auto-layout (`src/lib/layout.ts`)

dagre is configured in `LR` (left-to-right) rank direction. Node dimensions are
estimated from slot count (collapsed: 36 px header only; expanded: header +
24 px per row, capped at 20 rows). Layout runs on every change to the active
domain set or collapsed-node set via a Svelte 5 `$effect`.

---

## Known issues / pre-existing noise

- The LSP reports false-positive TypeScript errors in `TableNode.svelte`,
  `GhostNode.svelte`, and `+page.svelte` because the language server caches
  stale type information. **`npm run build` is clean** — use it as the ground
  truth, not the LSP.
- `src/omop_cdm/datamodel/omop_cdm.py` has pre-existing type errors from the
  LinkML Python code generator. These are unrelated to the frontend.
- `Using @sveltejs/adapter-auto: Could not detect a supported production environment`
  is an expected advisory after build — the app needs an explicit adapter
  (`adapter-node`, `adapter-static`, etc.) for real deployment.
- The `"handleConnectionChange" is imported … but never used` warning comes from
  inside `@xyflow/svelte` itself; it is not our code.
