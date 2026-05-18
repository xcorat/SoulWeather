<script>
  import { cn } from "$lib/utils.js";
  let { class: className, ref = $bindable(null), level = 3, children, ...rest } = $props();
</script>

<svelte:element
  this={`h${level}`}
  bind:this={ref}
  class={cn("text-2xl font-semibold leading-none tracking-tight", className)}
  {...rest}
>
  {@render children?.()}
</svelte:element>
