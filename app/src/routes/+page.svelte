<script lang="ts">
  import { onMount } from 'svelte';
  import {
    SvelteFlow,
    Background,
    Controls,
    MiniMap,
    type Node,
    type Edge,
  } from '@xyflow/svelte';
  import '@xyflow/svelte/dist/style.css';

  import TableNode from '$lib/components/TableNode.svelte';
  import GhostNode from '$lib/components/GhostNode.svelte';
  import DomainSidebar from '$lib/components/DomainSidebar.svelte';
  import SchemaUploader from '$lib/components/SchemaUploader.svelte';

  import { loadDefaultSchema, DOMAIN_INFO } from '$lib/linkml';
  import { buildGraph } from '$lib/layout';
  import type { NormalizedSchema, DomainName, ErdNodeData } from '$lib/types';

  // ---------------------------------------------------------------------------
  // Node types registration
  // ---------------------------------------------------------------------------
  const nodeTypes = {
    table: TableNode,
    ghost: GhostNode,
  };

  // ---------------------------------------------------------------------------
  // State
  // ---------------------------------------------------------------------------
  let schema = $state<NormalizedSchema | null>(null);
  let loadError = $state('');

  // Active domains — start with 'clinical' selected
  let activeDomains = $state<Set<DomainName>>(new Set(['clinical']));

  // Collapsed nodes
  let collapsed = $state<Set<string>>(new Set());

  // Svelte Flow reactive nodes/edges
  let nodes = $state.raw<Node[]>([]);
  let edges = $state.raw<Edge[]>([]);

  // ---------------------------------------------------------------------------
  // Derived: rebuild graph whenever schema, domains, or collapsed set changes
  // ---------------------------------------------------------------------------
  $effect(() => {
    if (!schema) return;
    const result = buildGraph(schema, activeDomains, collapsed);
    nodes = result.nodes;
    edges = result.edges;
  });

  // ---------------------------------------------------------------------------
  // Domain sidebar handlers
  // ---------------------------------------------------------------------------
  function toggleDomain(domain: DomainName) {
    const next = new Set(activeDomains);
    if (next.has(domain)) {
      next.delete(domain);
    } else {
      next.add(domain);
    }
    activeDomains = next;
  }

  function selectAllDomains() {
    activeDomains = new Set(DOMAIN_INFO.map((d) => d.name));
  }

  function clearAllDomains() {
    activeDomains = new Set();
  }

  // ---------------------------------------------------------------------------
  // Schema loading
  // ---------------------------------------------------------------------------
  async function loadDefault() {
    loadError = '';
    try {
      schema = await loadDefaultSchema();
      // Reset to clinical domain on new schema load
      activeDomains = new Set(['clinical']);
      collapsed = new Set();
    } catch (e) {
      loadError = `Failed to load default schema: ${(e as Error).message}`;
    }
  }

  function handleUploadedSchema(s: NormalizedSchema) {
    schema = s;
    // For non-OMOP schemas, show all domains initially
    activeDomains = new Set(DOMAIN_INFO.map((d) => d.name));
    collapsed = new Set();
  }

  onMount(loadDefault);

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const classCount = $derived(schema ? Object.keys(schema.classes).length : 0);
  const schemaName = $derived(schema?.name ?? 'Loading…');

  // Domain info with dynamic class lists (updated by parseLinkMLSchema)
  const domainInfo = $derived(DOMAIN_INFO.filter((d) => d.classes.length > 0 || d.name === 'other'));
</script>

<div class="app">
  <!-- Sidebar -->
  {#if schema}
    <DomainSidebar
      domains={domainInfo}
      {activeDomains}
      ontoggle={toggleDomain}
      onselectall={selectAllDomains}
      onclearall={clearAllDomains}
      {schemaName}
      {classCount}
    />
  {/if}

  <!-- Main canvas area -->
  <div class="canvas-wrap">
    <!-- Top bar -->
    <div class="topbar">
      <div class="topbar-left">
        <span class="app-title">LinkML ERD Viewer</span>
        {#if schema}
          <span class="node-count">{nodes.filter((n) => n.type === 'table').length} tables · {edges.length} FK edges</span>
        {/if}
        {#if loadError}
          <span class="load-error">⚠ {loadError}</span>
        {/if}
      </div>
      <div class="topbar-right">
        <div class="uploader-wrap">
          <SchemaUploader onschema={handleUploadedSchema} onreset={loadDefault} />
        </div>
      </div>
    </div>

    <!-- Svelte Flow canvas -->
    {#if schema && nodes.length > 0}
      <SvelteFlow
        bind:nodes
        bind:edges
        {nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.1}
        maxZoom={2}
        proOptions={{ hideAttribution: false }}
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(n) => {
            const data = n.data as unknown as ErdNodeData;
            return DOMAIN_INFO.find((d) => d.name === data?.domain)?.color ?? '#9ca3af';
          }}
          nodeStrokeWidth={3}
          zoomable
          pannable
        />
      </SvelteFlow>
    {:else if schema && nodes.length === 0}
      <div class="empty-state">
        <p>No tables to show.</p>
        <p>Select a domain in the sidebar to display tables.</p>
      </div>
    {:else}
      <div class="loading-state">
        <span class="loading-spinner">⟳</span>
        Loading schema…
      </div>
    {/if}
  </div>
</div>

<style>
  :global(body) {
    margin: 0;
    padding: 0;
    overflow: hidden;
  }

  .app {
    display: flex;
    height: 100vh;
    width: 100vw;
    font-family: ui-sans-serif, system-ui, sans-serif;
    background: #f3f4f6;
  }

  .canvas-wrap {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    position: relative;
  }

  /* Top bar */
  .topbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 14px;
    background: #fff;
    border-bottom: 1px solid #e5e7eb;
    z-index: 20;
    gap: 12px;
    flex-shrink: 0;
  }

  .topbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .app-title {
    font-size: 14px;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
  }

  .node-count {
    font-size: 11px;
    color: #6b7280;
    white-space: nowrap;
  }

  .load-error {
    font-size: 11px;
    color: #dc2626;
  }

  .topbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-shrink: 0;
  }

  .uploader-wrap {
    position: relative;
  }

  /* Canvas */
  :global(.svelte-flow) {
    flex: 1;
  }

  .empty-state,
  .loading-state {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #6b7280;
    font-size: 14px;
    gap: 8px;
  }

  .loading-spinner {
    font-size: 28px;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
</style>
