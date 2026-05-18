<script>
  import { cn } from "$lib/utils.js";
  let { class: className, ref = $bindable(null), children, ...rest } = $props();
</script>

<th
  bind:this={ref}
  class={cn("h-10 px-2 text-left align-middle font-medium text-muted-foreground [&:has([role=checkbox])]:pr-0", className)}
  {...rest}
>
  {@render children?.()}
</th>
