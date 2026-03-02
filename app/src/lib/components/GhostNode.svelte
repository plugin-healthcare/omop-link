<script lang="ts">
  import { Handle, Position, type NodeProps, type Node } from '@xyflow/svelte';
  import type { ErdNodeData } from '$lib/types';
  import { DOMAIN_INFO } from '$lib/linkml';

  let { id, data: rawData }: NodeProps<Node<Record<string, unknown>>> = $props();
  const data = $derived(rawData as unknown as ErdNodeData);

  const domainColor = $derived(
    DOMAIN_INFO.find((d) => d.name === data.domain)?.color ?? '#6b7280'
  );
</script>

<Handle type="target" position={Position.Left} />

<div class="ghost-node" style="--domain-color: {domainColor}" title="External table: {data.label}">
  <span class="ghost-icon">⇢</span>
  <span class="ghost-name">{data.label}</span>
</div>

<Handle type="source" position={Position.Right} />

<style>
  .ghost-node {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    background: #f9fafb;
    border: 1.5px dashed var(--domain-color);
    border-radius: 6px;
    min-width: 120px;
    font-family: ui-monospace, 'Cascadia Code', monospace;
    font-size: 11px;
    color: var(--domain-color);
    opacity: 0.75;
    cursor: default;
  }

  .ghost-icon {
    font-size: 12px;
  }

  .ghost-name {
    font-weight: 600;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>
