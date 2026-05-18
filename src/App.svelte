<script>
  import { onMount } from "svelte";
  import ChartCanvas from "./lib/ChartCanvas.svelte";
  import { julianDay, computePlanets } from "./lib/ephemeris.js";
  import {
    browserTimeZone,
    zonedTimeToUtcDate,
    formatOffsetLabel,
  } from "./lib/tz.js";

  import * as Card from "$lib/components/ui/card/index.js";
  import * as Table from "$lib/components/ui/table/index.js";
  import { Button } from "$lib/components/ui/button/index.js";
  import { Input } from "$lib/components/ui/input/index.js";
  import { Label } from "$lib/components/ui/label/index.js";
  import { LocationPicker } from "$lib/components/ui/location-picker/index.js";

  import ChevronUp from "@lucide/svelte/icons/chevron-up";
  import Pencil from "@lucide/svelte/icons/pencil";

  // ── localStorage schema version (bumped from v0 integer-tz to v1 IANA-tz) ─
  const STORAGE_KEY = "soulweather_birth";
  const STORAGE_VERSION = 1;

  // ── State ─────────────────────────────────────────────────────────────────
  let birthDate = $state("");
  let birthTime = $state("12:00");
  /** @type {{ name:string, country:string, lat:number, lon:number, tz:string } | null} */
  let birthLocation = $state(null);

  let birthPlanets = $state([]);
  let currentPlanets = $state([]);
  let currentLabel = $state("");
  let showForm = $state(true);

  const SIGN_NAMES = ["Ari","Tau","Gem","Can","Leo","Vir","Lib","Sco","Sag","Cap","Aqu","Pis"];

  // ── Effective timezone: location's IANA, falling back to the browser zone ─
  const effectiveTz = $derived(birthLocation?.tz || browserTimeZone());

  const birthLabel = $derived.by(() => {
    if (!birthDate) return "";
    const utc = zonedTimeToUtcDate(...parseDateTime(birthDate, birthTime), effectiveTz);
    const offset = formatOffsetLabel(utc, effectiveTz);
    const loc = birthLocation ? ` · ${birthLocation.name}` : "";
    return `${birthDate}  ${birthTime}  (${offset})${loc}`;
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  /** @returns {[number, number, number, number, number]} year, month, day, hour, minute */
  function parseDateTime(date, time) {
    const [y, m, d] = date.split("-").map(Number);
    const [hr, min] = time.split(":").map(Number);
    return [y, m, d, hr, min || 0];
  }

  function birthJD() {
    if (!birthDate) return null;
    const utc = zonedTimeToUtcDate(...parseDateTime(birthDate, birthTime), effectiveTz);
    return julianDay(
      utc.getUTCFullYear(),
      utc.getUTCMonth() + 1,
      utc.getUTCDate(),
      utc.getUTCHours(),
      utc.getUTCMinutes(),
    );
  }

  function refreshCurrentPlanets() {
    const now = new Date();
    const jd = julianDay(
      now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
      now.getUTCHours(), now.getUTCMinutes(),
    );
    currentPlanets = computePlanets(jd);
    currentLabel = now.toUTCString().replace(" GMT", " UTC").slice(5, 22);
  }

  function applyBirthData() {
    const jd = birthJD();
    if (jd !== null) {
      birthPlanets = computePlanets(jd);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({
          v: STORAGE_VERSION,
          date: birthDate,
          time: birthTime,
          location: birthLocation,
        }));
      } catch {/* storage may be unavailable; non-fatal */}
      showForm = false;
    }
  }

  function restore() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved) return;
      birthDate = saved.date || "";
      birthTime = saved.time || "12:00";
      if (saved.v === STORAGE_VERSION && saved.location) {
        birthLocation = saved.location;
      }
      // Legacy v0 records stored an integer `tz` offset in hours. The new
      // model is keyed on IANA zones, so we drop the integer offset — the
      // user must re-select their birth location to get a precise zone.
      // Their date/time still restore.
      if (birthDate) {
        const jd = birthJD();
        if (jd !== null) {
          birthPlanets = computePlanets(jd);
          showForm = false;
        }
      }
    } catch {/* ignore corrupt data */}
  }

  function onLocationSelect(loc) {
    birthLocation = loc;
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => {
    restore();
    refreshCurrentPlanets();
    const timer = setInterval(refreshCurrentPlanets, 60_000);
    return () => clearInterval(timer);
  });
</script>

<div class="mx-auto flex min-h-screen w-full max-w-3xl flex-col items-center gap-4 px-4 py-4">
  <!-- ── Header ─────────────────────────────────────────────────────── -->
  <header class="w-full text-center">
    <h1 class="text-2xl font-light tracking-[0.1em] text-[oklch(0.78_0.05_260)]">☽ Soul Weather</h1>
    <p class="mt-1 text-xs uppercase tracking-wider text-muted-foreground">
      Vedic Planetary Chart · Sidereal (Lahiri)
    </p>
    <Button
      variant="outline"
      size="sm"
      class="mt-2"
      onclick={() => (showForm = !showForm)}
    >
      {#if showForm}
        <ChevronUp class="size-4" /> Hide form
      {:else}
        <Pencil class="size-4" /> Edit birth data
      {/if}
    </Button>
  </header>

  <!-- ── Birth-data form ────────────────────────────────────────────── -->
  {#if showForm}
    <Card.Root class="w-full">
      <Card.Content class="pt-6">
        <form
          class="grid grid-cols-1 gap-4 sm:grid-cols-2"
          onsubmit={(e) => { e.preventDefault(); applyBirthData(); }}
        >
          <div class="flex flex-col gap-1.5">
            <Label for="birth-date">Birth date</Label>
            <Input id="birth-date" type="date" bind:value={birthDate} required />
          </div>
          <div class="flex flex-col gap-1.5">
            <Label for="birth-time">Birth time</Label>
            <Input id="birth-time" type="time" bind:value={birthTime} />
          </div>
          <div class="flex flex-col gap-1.5 sm:col-span-2">
            <Label>Birth location</Label>
            <LocationPicker value={birthLocation} onSelect={onLocationSelect} />
            <p class="text-xs text-muted-foreground">
              Time zone: <span class="font-mono">{effectiveTz}</span>
              {#if !birthLocation}
                <span class="opacity-70">(browser default — pick a city for precision)</span>
              {/if}
            </p>
          </div>
          <div class="sm:col-span-2">
            <Button type="submit" class="w-full sm:w-auto">Draw chart</Button>
          </div>
        </form>
      </Card.Content>
    </Card.Root>
  {/if}

  <!-- ── Chart ──────────────────────────────────────────────────────── -->
  <div class="aspect-square w-full max-w-[680px] overflow-hidden rounded-full border bg-[oklch(0.10_0.04_270)]">
    <ChartCanvas
      birthPlanets={birthPlanets}
      currentPlanets={currentPlanets}
      birthLabel={birthLabel}
      currentLabel={currentLabel}
    />
  </div>

  <!-- ── Planet tables ───────────────────────────────────────────────── -->
  {#if birthPlanets.length || currentPlanets.length}
    <div class="grid w-full grid-cols-1 gap-4 sm:grid-cols-2">
      {#if birthPlanets.length}
        <Card.Root>
          <Card.Header class="py-3">
            <Card.Title level={2} class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Natal positions
            </Card.Title>
          </Card.Header>
          <Card.Content class="p-0">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Planet</Table.Head>
                  <Table.Head>Sign</Table.Head>
                  <Table.Head>Deg</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each birthPlanets as p}
                  {@const sign = Math.floor(p.lon / 30)}
                  {@const deg = (p.lon % 30).toFixed(1)}
                  <Table.Row>
                    <Table.Cell>
                      <span style="color:{p.color}">{p.symbol}</span> {p.name}
                    </Table.Cell>
                    <Table.Cell>{SIGN_NAMES[sign]}</Table.Cell>
                    <Table.Cell>{deg}°</Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        </Card.Root>
      {/if}

      {#if currentPlanets.length}
        <Card.Root>
          <Card.Header class="py-3">
            <Card.Title level={2} class="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Current transits
            </Card.Title>
          </Card.Header>
          <Card.Content class="p-0">
            <Table.Root>
              <Table.Header>
                <Table.Row>
                  <Table.Head>Planet</Table.Head>
                  <Table.Head>Sign</Table.Head>
                  <Table.Head>Deg</Table.Head>
                </Table.Row>
              </Table.Header>
              <Table.Body>
                {#each currentPlanets as p}
                  {@const sign = Math.floor(p.lon / 30)}
                  {@const deg = (p.lon % 30).toFixed(1)}
                  <Table.Row>
                    <Table.Cell>
                      <span style="color:{p.color}">{p.symbol}</span> {p.name}
                    </Table.Cell>
                    <Table.Cell>{SIGN_NAMES[sign]}</Table.Cell>
                    <Table.Cell>{deg}°</Table.Cell>
                  </Table.Row>
                {/each}
              </Table.Body>
            </Table.Root>
          </Card.Content>
        </Card.Root>
      {/if}
    </div>
  {/if}
</div>
