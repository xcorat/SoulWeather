<script>
  import { cn } from "$lib/utils.js";
  let { class: className, ref = $bindable(null), children, ...rest } = $props();
</script>

<tr
  bind:this={ref}
  class={cn("border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted", className)}
  {...rest}
>
  {@render children?.()}
</tr>
