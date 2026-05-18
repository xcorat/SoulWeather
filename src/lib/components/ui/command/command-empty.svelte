<script>
  import { Command as CommandPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let { class: className, ref = $bindable(null), children, ...rest } = $props();
</script>

<CommandPrimitive.Empty
  bind:ref
  class={cn("py-6 text-center text-sm", className)}
  {...rest}
>
  {@render children?.()}
</CommandPrimitive.Empty>
