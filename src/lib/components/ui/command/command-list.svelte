<script>
  import { Command as CommandPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let { class: className, ref = $bindable(null), children, ...rest } = $props();
</script>

<CommandPrimitive.List
  bind:ref
  class={cn("max-h-[300px] overflow-y-auto overflow-x-hidden", className)}
  {...rest}
>
  {@render children?.()}
</CommandPrimitive.List>
