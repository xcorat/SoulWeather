<script>
  import { cn } from "$lib/utils.js";
  import { buttonVariants } from "./button-variants.js";

  let {
    class: className,
    variant = "default",
    size = "default",
    type = "button",
    href,
    ref = $bindable(null),
    children,
    ...rest
  } = $props();
</script>

{#if href}
  <a
    bind:this={ref}
    class={cn(buttonVariants({ variant, size }), className)}
    {href}
    {...rest}
  >
    {@render children?.()}
  </a>
{:else}
  <button
    bind:this={ref}
    class={cn(buttonVariants({ variant, size }), className)}
    {type}
    {...rest}
  >
    {@render children?.()}
  </button>
{/if}
