<script>
  import { Label as LabelPrimitive } from "bits-ui";
  import { cn } from "$lib/utils.js";

  let {
    class: className,
    ref = $bindable(null),
    for: forProp,
    children,
    ...rest
  } = $props();
</script>

<LabelPrimitive.Root
  bind:ref
  for={forProp}
  class={cn(
    "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70",
    className
  )}
  {...rest}
>
  {@render children?.()}
</LabelPrimitive.Root>
