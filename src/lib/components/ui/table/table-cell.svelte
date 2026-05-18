<script>
  import { cn } from "$lib/utils.js";
  let { class: className, ref = $bindable(null), children, ...rest } = $props();
</script>

<td
  bind:this={ref}
  class={cn("p-2 align-middle [&:has([role=checkbox])]:pr-0", className)}
  {...rest}
>
  {@render children?.()}
</td>
