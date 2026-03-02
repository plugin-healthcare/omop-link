<script lang="ts">
  import type { DomainInfo, DomainName } from '$lib/types';

  interface Props {
    domains: DomainInfo[];
    activeDomains: Set<DomainName>;
    ontoggle: (domain: DomainName) => void;
    onselectall: () => void;
    onclearall: () => void;
    schemaName: string;
    classCount: number;
  }

  let {
    domains,
    activeDomains,
    ontoggle,
    onselectall,
    onclearall,
    schemaName,
    classCount,
  }: Props = $props();
</script>

<aside class="sidebar">
  <div class="sidebar-header">
    <div class="schema-info">
      <span class="schema-label">Schema</span>
      <span class="schema-name" title={schemaName}>{schemaName}</span>
      <span class="schema-meta">{classCount} tables</span>
    </div>
  </div>

  <div class="domain-section">
    <div class="section-label">
      Domains
      <span class="quick-actions">
        <button class="text-btn" onclick={onselectall}>all</button>
        /
        <button class="text-btn" onclick={onclearall}>none</button>
      </span>
    </div>

    {#each domains as domain (domain.name)}
      {@const active = activeDomains.has(domain.name)}
      <button
        class="domain-chip"
        class:active
        style="--color: {domain.color}"
        onclick={() => ontoggle(domain.name)}
        title="{domain.classes.length} tables"
      >
        <span class="chip-dot"></span>
        <span class="chip-label">{domain.label}</span>
        <span class="chip-count">{domain.classes.length}</span>
      </button>
    {/each}
  </div>

  <div class="legend">
    <div class="legend-title">Legend</div>
    <div class="legend-row"><span class="legend-icon">🔑</span> Primary key</div>
    <div class="legend-row"><span class="legend-icon">⇒</span> Foreign key</div>
    <div class="legend-row"><span class="legend-icon">•</span> Required field</div>
    <div class="legend-row"><span class="legend-icon">◦</span> Optional field</div>
    <div class="legend-row ghost-row">
      <span class="ghost-swatch"></span> External table (ghost)
    </div>
  </div>
</aside>

<style>
  .sidebar {
    width: 190px;
    flex-shrink: 0;
    background: #fff;
    border-right: 1px solid #e5e7eb;
    display: flex;
    flex-direction: column;
    gap: 0;
    overflow-y: auto;
    z-index: 10;
  }

  .sidebar-header {
    padding: 12px 12px 8px;
    border-bottom: 1px solid #e5e7eb;
  }

  .schema-info {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .schema-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
  }

  .schema-name {
    font-size: 12px;
    font-weight: 700;
    color: #111827;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .schema-meta {
    font-size: 10px;
    color: #6b7280;
  }

  .domain-section {
    padding: 10px 10px 6px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    border-bottom: 1px solid #e5e7eb;
  }

  .section-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 4px;
  }

  .quick-actions {
    font-weight: 400;
    text-transform: none;
    letter-spacing: 0;
    color: #6b7280;
    display: flex;
    align-items: center;
    gap: 2px;
  }

  .text-btn {
    background: none;
    border: none;
    cursor: pointer;
    padding: 0;
    font-size: 9px;
    color: #6b7280;
    text-decoration: underline;
  }

  .text-btn:hover {
    color: #111827;
  }

  .domain-chip {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 8px;
    border-radius: 6px;
    border: 1.5px solid #e5e7eb;
    background: #f9fafb;
    cursor: pointer;
    font-size: 12px;
    font-weight: 500;
    color: #374151;
    text-align: left;
    transition: all 0.12s ease;
  }

  .domain-chip:hover {
    border-color: var(--color);
    background: color-mix(in srgb, var(--color) 8%, #fff);
  }

  .domain-chip.active {
    border-color: var(--color);
    background: color-mix(in srgb, var(--color) 12%, #fff);
    color: var(--color);
    font-weight: 700;
  }

  .chip-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--color);
    flex-shrink: 0;
    opacity: 0.4;
  }

  .domain-chip.active .chip-dot {
    opacity: 1;
  }

  .chip-label {
    flex: 1;
    white-space: nowrap;
  }

  .chip-count {
    font-size: 10px;
    background: #e5e7eb;
    border-radius: 8px;
    padding: 1px 5px;
    color: #6b7280;
    flex-shrink: 0;
  }

  .domain-chip.active .chip-count {
    background: color-mix(in srgb, var(--color) 20%, #fff);
    color: var(--color);
  }

  .legend {
    padding: 10px 12px;
    font-size: 11px;
    color: #6b7280;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .legend-title {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #9ca3af;
    margin-bottom: 2px;
  }

  .legend-row {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .legend-icon {
    font-size: 11px;
    width: 16px;
    text-align: center;
  }

  .ghost-swatch {
    width: 16px;
    height: 12px;
    border: 1.5px dashed #9ca3af;
    border-radius: 3px;
    background: #f9fafb;
    flex-shrink: 0;
  }
</style>
