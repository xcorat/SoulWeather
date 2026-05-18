<script>
  import { Command as CommandPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
    ref = $bindable(null),
    heading,
    value,
    children,
    ...rest
  } = $props();
</script>

<CommandPrimitive.Group
  bind:ref
  {value}
  class={cn(
    "overflow-hidden p-1 text-foreground [&_[data-slot=command-group-heading]]:px-2 [&_[data-slot=command-group-heading]]:py-1.5 [&_[data-slot=command-group-heading]]:text-xs [&_[data-slot=command-group-heading]]:font-medium [&_[data-slot=command-group-heading]]:text-muted-foreground",
    className
  )}
  {...rest}
>
  {#if heading}
    <CommandPrimitive.GroupHeading data-slot="command-group-heading">
      {heading}
    </CommandPrimitive.GroupHeading>
  {/if}
  <CommandPrimitive.GroupItems>
    {@render children?.()}
  </CommandPrimitive.GroupItems>
</CommandPrimitive.Group>
