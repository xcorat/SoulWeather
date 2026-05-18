<script>
  import { Command as CommandPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
    ref = $bindable(null),
    value = $bindable(""),
    children,
    ...rest
  } = $props();
</script>

<CommandPrimitive.Root
  bind:ref
  bind:value
  class={cn(
    "flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground",
    className
  )}
  {...rest}
>
  {@render children?.()}
</CommandPrimitive.Root>
