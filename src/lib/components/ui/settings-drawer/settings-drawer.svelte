<script>
  import { Dialog } from "bits-ui";
  import Menu from "@lucide/svelte/icons/menu";
  import X from "@lucide/svelte/icons/x";
  import { Button } from "$lib/components/ui/button/index.js";

  let {
    showPlanetNames = $bindable(true),
  } = $props();
</script>

<!-- Trigger button fixed at top-left -->
<Dialog.Root>
  <Dialog.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon"
        aria-label="Open settings"
        title="Settings"
        class="fixed left-3 top-3 z-30"
      >
        <Menu class="size-5" />
      </Button>
    {/snippet}
  </Dialog.Trigger>

  <Dialog.Portal>
    <Dialog.Overlay
      class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
    />
    <Dialog.Content
      class="fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r bg-background shadow-xl"
      aria-label="Settings"
    >
      <!-- Header -->
      <div class="flex items-center justify-between border-b px-4 py-3">
        <h2 class="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Settings
        </h2>
        <Dialog.Close>
          {#snippet child({ props })}
            <Button {...props} variant="ghost" size="icon" aria-label="Close settings">
              <X class="size-4" />
            </Button>
          {/snippet}
        </Dialog.Close>
      </div>

      <!-- Settings content -->
      <div class="flex flex-col gap-6 overflow-y-auto p-4">
        <!-- Planet names toggle -->
        <div class="flex items-center justify-between gap-4">
          <div class="flex flex-col gap-0.5">
            <span class="text-sm font-medium">Planet names</span>
            <span class="text-xs text-muted-foreground">
              Show abbreviations on chart
            </span>
          </div>
          <button
            role="switch"
            aria-checked={showPlanetNames}
            aria-label="Toggle planet names"
            onclick={() => (showPlanetNames = !showPlanetNames)}
            class={[
              "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              showPlanetNames ? "bg-primary" : "bg-input",
            ].join(" ")}
          >
            <span
              class={[
                "pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg transition-transform",
                showPlanetNames ? "translate-x-5" : "translate-x-0",
              ].join(" ")}
            ></span>
          </button>
        </div>
      </div>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
