<script>
  import { Command as CommandPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
    ref = $bindable(null),
    value,
    onSelect,
    disabled,
    keywords,
    children,
    ...rest
  } = $props();
</script>

<CommandPrimitive.Item
  bind:ref
  {value}
  {onSelect}
  {disabled}
  {keywords}
  class={cn(
    "relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-none data-[disabled=true]:pointer-events-none data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground data-[disabled=true]:opacity-50",
    className
  )}
  {...rest}
>
  {@render children?.()}
</CommandPrimitive.Item>
