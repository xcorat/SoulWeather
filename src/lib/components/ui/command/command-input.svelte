<script>
  import { Command as CommandPrimitive } from "bits-ui";
  import Search from "@lucide/svelte/icons/search";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
    ref = $bindable(null),
    value = $bindable(""),
    ...rest
  } = $props();
</script>

<div class="flex items-center border-b px-3" data-slot="command-input-wrapper">
  <Search class="mr-2 size-4 shrink-0 opacity-50" />
  <CommandPrimitive.Input
    bind:ref
    bind:value
    class={cn(
      "flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...rest}
  />
</div>
