<script>
  import { cn } from "$lib/utils.js";
  let { class: className, ref = $bindable(null), children, ...rest } = $props();
</script>

<caption
  bind:this={ref}
  class={cn("mt-4 text-sm text-muted-foreground", className)}
  {...rest}
>
  {@render children?.()}
</caption>
