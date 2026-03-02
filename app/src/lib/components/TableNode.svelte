<script lang="ts">
  import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
  import type { ErdNodeData } from '$lib/types';
  import { DOMAIN_INFO } from '$lib/linkml';

  // Svelte Flow v1: NodeProps<Node<YourDataType>>
  type TableNodeProps = NodeProps<Node<Record<string, unknown>>>;

  let { id, data: rawData }: TableNodeProps = $props();
  const data = $derived(rawData as unknown as ErdNodeData);

  // Derive domain color from DOMAIN_INFO
  const domainColor = $derived(
    DOMAIN_INFO.find((d) => d.name === data.domain)?.color ?? '#6b7280'
  );

  // Local collapse toggle — synced reactively from data.collapsed
  let localCollapsed = $state(false);
  $effect(() => { localCollapsed = data.collapsed; });

  const MAX_ROWS = 20;
  const visibleSlots = $derived(localCollapsed ? [] : data.slots.slice(0, MAX_ROWS));
  const hiddenCount = $derived(localCollapsed ? 0 : Math.max(0, data.slots.length - MAX_ROWS));

  // Format range display
  function rangeLabel(range: string, isFk: boolean): string {
    if (isFk) return `→ ${range}`;
    if (range.length > 8) return range.slice(0, 8) + '…';
    return range;
  }
</script>

<!-- Target handle on the left -->
<Handle type="target" position={Position.Left} />

<div class="table-node" style="--domain-color: {domainColor}">
  <!-- Header -->
  <button
    class="table-header"
    onclick={() => (localCollapsed = !localCollapsed)}
    title={data.description || data.label}
  >
    <span class="table-icon">{localCollapsed ? '▶' : '▼'}</span>
    <span class="table-name">{data.label}</span>
    <span class="slot-count">{data.slots.length}</span>
  </button>

  <!-- Slot rows -->
  {#if !localCollapsed}
    <div class="slot-list">
      {#each visibleSlots as slot (slot.slot_name)}
        <div
          class="slot-row"
          class:slot-pk={slot.identifier}
          class:slot-fk={slot.is_fk}
          class:slot-required={slot.required && !slot.identifier}
          title={slot.description || slot.name}
        >
          <span class="slot-icon">
            {#if slot.identifier}🔑{:else if slot.is_fk}⇒{:else if slot.required}•{:else}◦{/if}
          </span>
          <span class="slot-name">{slot.name}</span>
          <span class="slot-range" class:slot-range-fk={slot.is_fk}>
            {rangeLabel(slot.range, slot.is_fk)}
          </span>
        </div>
      {/each}
      {#if hiddenCount > 0}
        <div class="slot-more">+{hiddenCount} more…</div>
      {/if}
    </div>
  {/if}
</div>

<!-- Source handle on the right -->
<Handle type="source" position={Position.Right} />

<style>
  .table-node {
    background: #fff;
    border: 2px solid var(--domain-color);
    border-radius: 6px;
    min-width: 220px;
    max-width: 260px;
    font-family: ui-monospace, 'Cascadia Code', monospace;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
    overflow: hidden;
  }

  .table-header {
    display: flex;
    align-items: center;
    gap: 6px;
    width: 100%;
    padding: 6px 10px;
    background: var(--domain-color);
    color: #fff;
    font-weight: 700;
    font-size: 12px;
    cursor: pointer;
    border: none;
    text-align: left;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .table-header:hover {
    filter: brightness(1.1);
  }

  .table-icon {
    font-size: 9px;
    flex-shrink: 0;
  }

  .table-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .slot-count {
    font-size: 10px;
    background: rgba(255, 255, 255, 0.25);
    border-radius: 10px;
    padding: 1px 5px;
    flex-shrink: 0;
  }

  .slot-list {
    padding: 2px 0;
  }

  .slot-row {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px 2px 6px;
    color: #374151;
    line-height: 1.5;
    border-bottom: 1px solid #f3f4f6;
  }

  .slot-row:last-child {
    border-bottom: none;
  }

  .slot-pk {
    background: #fffbeb;
    color: #92400e;
    font-weight: 600;
  }

  .slot-fk {
    background: #f0f9ff;
    color: #0c4a6e;
  }

  .slot-required {
    font-weight: 500;
  }

  .slot-icon {
    font-size: 10px;
    flex-shrink: 0;
    width: 14px;
    text-align: center;
  }

  .slot-name {
    flex: 1;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 11px;
  }

  .slot-range {
    font-size: 10px;
    color: #9ca3af;
    flex-shrink: 0;
    white-space: nowrap;
  }

  .slot-range-fk {
    color: var(--domain-color);
    font-weight: 600;
  }

  .slot-more {
    padding: 3px 8px;
    font-size: 10px;
    color: #9ca3af;
    font-style: italic;
    text-align: center;
  }
</style>
