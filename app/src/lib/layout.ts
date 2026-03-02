/**
 * Dagre-based auto-layout for ERD nodes and edges.
 *
 * Given a set of ERD classes and their FK relationships, produces
 * Svelte Flow Node and Edge arrays with computed x/y positions.
 */

import dagre from '@dagrejs/dagre';
import { Position, type Node, type Edge, MarkerType } from '@xyflow/svelte';
import type { NormalizedSchema, ErdNodeData, ErdEdgeData, DomainName } from './types';
import { DOMAIN_INFO } from './linkml';

// Estimated node dimensions — used for dagre sizing
const NODE_WIDTH = 260;
const NODE_HEADER_HEIGHT = 36;
const NODE_ROW_HEIGHT = 24;
const NODE_COLLAPSED_HEIGHT = NODE_HEADER_HEIGHT;
const MAX_VISIBLE_ROWS = 20;

function estimateNodeHeight(slotCount: number, collapsed: boolean): number {
  if (collapsed) return NODE_COLLAPSED_HEIGHT;
  const visibleRows = Math.min(slotCount, MAX_VISIBLE_ROWS);
  return NODE_HEADER_HEIGHT + visibleRows * NODE_ROW_HEIGHT + 8; // 8px padding
}

/** Map domain name → hex color for edges */
const DOMAIN_COLOR_MAP = new Map<DomainName, string>(
  DOMAIN_INFO.map((d) => [d.name, d.color])
);

/**
 * Build Svelte Flow nodes and edges from a normalized schema,
 * filtered to the given set of active domain names.
 *
 * Cross-domain FK edges are preserved; target nodes outside the active
 * domains are rendered as lightweight "ghost" stub nodes.
 */
export function buildGraph(
  schema: NormalizedSchema,
  activeDomains: Set<DomainName>,
  collapsed: Set<string>
): { nodes: Node[]; edges: Edge[] } {
  const allClasses = schema.classes;
  const classNames = new Set(Object.keys(allClasses));

  // Determine which classes belong to active domains
  const activeClassNames = new Set<string>();
  for (const [className, cls] of Object.entries(allClasses)) {
    const domain = getDomainForClass(className);
    if (activeDomains.has(domain)) {
      activeClassNames.add(className);
    }
  }

  // Collect all FK edges between ALL classes (not just active ones)
  // so we can identify cross-domain ghosts
  const allEdges: Array<{ source: string; target: string; slotName: string; required: boolean }> = [];
  for (const [className, cls] of Object.entries(allClasses)) {
    if (!activeClassNames.has(className)) continue;
    for (const slot of cls.slots) {
      if (slot.is_fk && classNames.has(slot.range) && slot.range !== className) {
        allEdges.push({
          source: className,
          target: slot.range,
          slotName: slot.name,
          required: slot.required,
        });
      }
    }
  }

  // Ghost nodes: FK targets that are outside active domains
  const ghostClassNames = new Set<string>();
  for (const edge of allEdges) {
    if (!activeClassNames.has(edge.target)) {
      ghostClassNames.add(edge.target);
    }
  }

  // All nodes to render
  const nodesToRender = new Set([...activeClassNames, ...ghostClassNames]);

  // ---------------------------------------------------------------------------
  // Dagre layout
  // ---------------------------------------------------------------------------
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({
    rankdir: 'LR',
    nodesep: 40,
    ranksep: 80,
    edgesep: 20,
    marginx: 20,
    marginy: 20,
  });

  for (const className of nodesToRender) {
    const cls = allClasses[className];
    const isGhost = ghostClassNames.has(className);
    const isCollapsed = collapsed.has(className) || isGhost;
    const slotCount = cls?.slots.length ?? 0;
    const height = isGhost ? NODE_HEADER_HEIGHT : estimateNodeHeight(slotCount, isCollapsed);
    g.setNode(className, { width: NODE_WIDTH, height });
  }

  for (const edge of allEdges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  // ---------------------------------------------------------------------------
  // Build Svelte Flow nodes
  // ---------------------------------------------------------------------------
  const nodes: Node[] = [];

  for (const className of nodesToRender) {
    const dagreNode = g.node(className);
    const cls = allClasses[className];
    const isGhost = ghostClassNames.has(className);
    const domain = getDomainForClass(className);
    const isCollapsed = collapsed.has(className) || isGhost;

    nodes.push({
      id: className,
      type: isGhost ? 'ghost' : 'table',
      position: {
        x: dagreNode.x - NODE_WIDTH / 2,
        y: dagreNode.y - dagreNode.height / 2,
      },
      data: {
        label: className,
        description: cls?.description ?? '',
        domain,
        slots: cls?.slots ?? [],
        collapsed: isCollapsed,
      } as unknown as Record<string, unknown>,
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });
  }

  // ---------------------------------------------------------------------------
  // Build Svelte Flow edges
  // ---------------------------------------------------------------------------
  const edges: Edge[] = [];
  const edgeIdCounts = new Map<string, number>();

  for (const edge of allEdges) {
    const baseId = `${edge.source}--${edge.slotName}--${edge.target}`;
    const count = (edgeIdCounts.get(baseId) ?? 0) + 1;
    edgeIdCounts.set(baseId, count);
    const edgeId = count > 1 ? `${baseId}-${count}` : baseId;

    const sourceDomain = getDomainForClass(edge.source);
    const color = DOMAIN_COLOR_MAP.get(sourceDomain) ?? '#6b7280';
    const isGhostTarget = ghostClassNames.has(edge.target);

    edges.push({
      id: edgeId,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: false,
      style: `stroke: ${color}; stroke-width: ${edge.required ? 2 : 1.5};`,
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color,
        width: 16,
        height: 16,
      },
      data: {
        slotName: edge.slotName,
        required: edge.required,
        targetClass: edge.target,
      } as unknown as Record<string, unknown>,
      label: edge.slotName,
      labelStyle: 'font-size: 10px; fill: #6b7280;',
      labelBgStyle: 'fill: rgba(255,255,255,0.85);',
    });
  }

  return { nodes, edges };
}

// ---------------------------------------------------------------------------
// Helper: get domain for a class name
// ---------------------------------------------------------------------------

let _domainCacheSchema: NormalizedSchema | null = null;
let _domainCache: Map<string, DomainName> | null = null;

function getDomainForClass(className: string): DomainName {
  // Check DOMAIN_INFO which is kept in sync by linkml.ts buildDomainMap
  for (const info of DOMAIN_INFO) {
    if (info.classes.includes(className)) return info.name;
  }
  return 'other';
}
