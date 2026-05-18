<script>
  /**
   * LocationPicker — searchable combobox of world cities backed by a static
   * `public/cities.json` (offline GeoNames dump). Bubbles up the selected
   * city's coordinates and IANA timezone via `onSelect`.
   *
   * Props:
   *   value:    currently selected city object (or null)
   *   onSelect: callback fired with the picked { name, country, lat, lon, tz }
   */
  import * as Popover from "$lib/components/ui/popover/index.js";
  import * as Command from "$lib/components/ui/command/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import ChevronsUpDown from "@lucide/svelte/icons/chevrons-up-down";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { cn } from "$lib/utils.js";

  let { value = null, onSelect } = $props();

  let open = $state(false);
  let cities = $state(/** @type {Array<{n:string,c:string,lat:number,lon:number,tz:string}>} */ ([]));
  let loaded = $state(false);
  let loadError = $state("");
  let search = $state("");

  // Resolve cities.json under Vite's base URL so it works under sub-paths
  // (e.g. GitHub Pages deployments).
  const CITIES_URL = `${import.meta.env.BASE_URL || "/"}cities.json`.replace(/\/+/g, "/");

  async function loadCitiesOnce() {
    if (loaded || loadError) return;
    try {
      const res = await fetch(CITIES_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("invalid cities.json");
      cities = data;
      loaded = true;
    } catch (err) {
      loadError = err instanceof Error ? err.message : String(err);
    }
  }

  // Lazy-load the dataset the first time the popover opens.
  $effect(() => {
    if (open) void loadCitiesOnce();
  });

  /** @returns {Array<{n:string,c:string,lat:number,lon:number,tz:string}>} */
  function filtered() {
    if (!loaded) return [];
    const q = search.trim().toLowerCase();
    if (!q) return cities.slice(0, 50);
    const matches = [];
    for (const city of cities) {
      const hay = `${city.n} ${city.c}`.toLowerCase();
      if (hay.includes(q)) {
        matches.push(city);
        if (matches.length >= 100) break;
      }
    }
    return matches;
  }

  function pick(city) {
    onSelect?.({
      name: city.n,
      country: city.c,
      lat: city.lat,
      lon: city.lon,
      tz: city.tz,
    });
    open = false;
    search = "";
  }
</script>

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="outline"
        class={cn("w-full justify-between font-normal", !value && "text-muted-foreground")}
        aria-label="Choose birth location"
      >
        <span class="flex items-center gap-2 truncate">
          <MapPin class="size-4 shrink-0 opacity-60" />
          {#if value}
            <span class="truncate">{value.name}, {value.country}</span>
          {:else}
            <span>Select a city…</span>
          {/if}
        </span>
        <ChevronsUpDown class="ml-2 size-4 shrink-0 opacity-50" />
      </Button>
    {/snippet}
  </Popover.Trigger>
  <Popover.Content class="w-[min(22rem,90vw)] p-0" align="start">
    <Command.Root shouldFilter={false}>
      <Command.Input
        bind:value={search}
        placeholder="Search cities…"
      />
      <Command.List>
        {#if loadError}
          <Command.Empty>Failed to load cities ({loadError}).</Command.Empty>
        {:else if !loaded}
          <Command.Empty>Loading cities…</Command.Empty>
        {:else}
          {@const list = filtered()}
          {#if list.length === 0}
            <Command.Empty>No matching cities.</Command.Empty>
          {:else}
            <Command.Group heading={search.trim() ? "Matches" : "Popular cities"}>
              {#each list as city (`${city.n}|${city.c}|${city.lat}|${city.lon}`)}
                <Command.Item
                  value={`${city.n} ${city.c}`}
                  onSelect={() => pick(city)}
                >
                  <span class="truncate">{city.n}</span>
                  <span class="ml-auto text-xs text-muted-foreground">{city.c} · {city.tz}</span>
                </Command.Item>
              {/each}
            </Command.Group>
          {/if}
        {/if}
      </Command.List>
    </Command.Root>
  </Popover.Content>
</Popover.Root>
