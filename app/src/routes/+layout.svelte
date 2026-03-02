<script lang="ts">
  let { children } = $props();
</script>

<svelte:head>
  <title>LinkML ERD Viewer</title>
  <meta name="description" content="Interactive ERD viewer for LinkML schemas" />
</svelte:head>

{@render children()}

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(html, body) {
    margin: 0;
    padding: 0;
    height: 100%;
    width: 100%;
    overflow: hidden;
  }
</style>
