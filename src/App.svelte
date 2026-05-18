<script>
  import { onMount } from 'svelte';
  import ChartCanvas from './lib/ChartCanvas.svelte';
  import { julianDay, computePlanets, lahiriAyanamsa } from './lib/ephemeris.js';

  // ── State ─────────────────────────────────────────────────────────────────
  let birthDate = $state('');
  let birthTime = $state('12:00');
  let birthTzOffset = $state(0); // UTC offset in whole hours

  let birthPlanets  = $state([]);
  let currentPlanets = $state([]);
  let currentLabel  = $state('');
  let showForm = $state(true);

  // ── Derived birth label ───────────────────────────────────────────────────
  const birthLabel = $derived(
    birthDate
      ? `${birthDate}  ${birthTime}  UTC${birthTzOffset >= 0 ? '+' : ''}${birthTzOffset}`
      : ''
  );

  // ── UTC offset options ────────────────────────────────────────────────────
  const TZ_OPTIONS = Array.from({ length: 27 }, (_, i) => i - 12).map(h => ({
    value: h,
    label: `UTC${h >= 0 ? '+' : ''}${h}`,
  }));

  // ── Helpers ───────────────────────────────────────────────────────────────
  function parseBirthJD(date, time, tzOffset) {
    if (!date) return null;
    const [y, m, d] = date.split('-').map(Number);
    const [hr, min] = time.split(':').map(Number);
    const utcHour = hr - tzOffset; // convert local → UTC
    return julianDay(y, m, d, utcHour, min);
  }

  function refreshCurrentPlanets() {
    const now = new Date();
    const jd = julianDay(
      now.getUTCFullYear(), now.getUTCMonth() + 1, now.getUTCDate(),
      now.getUTCHours(), now.getUTCMinutes()
    );
    currentPlanets = computePlanets(jd);
    currentLabel = now.toUTCString().replace(' GMT', ' UTC').slice(5, 22);
  }

  function applyBirthData() {
    const jd = parseBirthJD(birthDate, birthTime, birthTzOffset);
    if (jd !== null) {
      birthPlanets = computePlanets(jd);
      localStorage.setItem('soulweather_birth', JSON.stringify({
        date: birthDate,
        time: birthTime,
        tz: birthTzOffset,
      }));
      showForm = false;
    }
  }

  // ── Lifecycle ─────────────────────────────────────────────────────────────
  onMount(() => {
    // Restore saved birth data
    try {
      const saved = JSON.parse(localStorage.getItem('soulweather_birth') || 'null');
      if (saved) {
        birthDate = saved.date || '';
        birthTime = saved.time || '12:00';
        birthTzOffset = saved.tz ?? 0;
        const jd = parseBirthJD(birthDate, birthTime, birthTzOffset);
        if (jd) {
          birthPlanets = computePlanets(jd);
          showForm = false;
        }
      }
    } catch { /* ignore corrupt data */ }

    refreshCurrentPlanets();
    const timer = setInterval(refreshCurrentPlanets, 60_000);
    return () => clearInterval(timer);
  });
</script>

<div class="app">
  <!-- ── Header ─────────────────────────────────────────────────────────── -->
  <header>
    <h1>☽ Soul Weather</h1>
    <p class="subtitle">Vedic Planetary Chart · Sidereal (Lahiri)</p>
    <button class="toggle-form" onclick={() => (showForm = !showForm)}>
      {showForm ? '▲ Hide form' : '✎ Edit birth data'}
    </button>
  </header>

  <!-- ── Birth-data form ────────────────────────────────────────────────── -->
  {#if showForm}
  <form class="birth-form" onsubmit={e => { e.preventDefault(); applyBirthData(); }}>
    <label>
      <span>Birth date</span>
      <input type="date" bind:value={birthDate} required />
    </label>
    <label>
      <span>Birth time</span>
      <input type="time" bind:value={birthTime} />
    </label>
    <label>
      <span>Time zone</span>
      <select bind:value={birthTzOffset}>
        {#each TZ_OPTIONS as opt}
          <option value={opt.value}>{opt.label}</option>
        {/each}
      </select>
    </label>
    <button type="submit">Draw chart</button>
  </form>
  {/if}

  <!-- ── Chart ──────────────────────────────────────────────────────────── -->
  <div class="chart-wrap">
    <ChartCanvas
      birthPlanets={birthPlanets}
      currentPlanets={currentPlanets}
      birthLabel={birthLabel}
      currentLabel={currentLabel}
    />
  </div>

  <!-- ── Planet table ───────────────────────────────────────────────────── -->
  {#if birthPlanets.length || currentPlanets.length}
  <div class="planet-tables">
    {#if birthPlanets.length}
    <table>
      <caption>Natal positions</caption>
      <thead><tr><th>Planet</th><th>Sign</th><th>Deg</th></tr></thead>
      <tbody>
        {#each birthPlanets as p}
          {@const sign = Math.floor(p.lon / 30)}
          {@const deg  = (p.lon % 30).toFixed(1)}
          <tr>
            <td><span class="sym" style="color:{p.color}">{p.symbol}</span> {p.name}</td>
            <td>{['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'][sign]}</td>
            <td>{deg}°</td>
          </tr>
        {/each}
      </tbody>
    </table>
    {/if}

    {#if currentPlanets.length}
    <table>
      <caption>Current transits</caption>
      <thead><tr><th>Planet</th><th>Sign</th><th>Deg</th></tr></thead>
      <tbody>
        {#each currentPlanets as p}
          {@const sign = Math.floor(p.lon / 30)}
          {@const deg  = (p.lon % 30).toFixed(1)}
          <tr>
            <td><span class="sym" style="color:{p.color}">{p.symbol}</span> {p.name}</td>
            <td>{['Ari','Tau','Gem','Can','Leo','Vir','Lib','Sco','Sag','Cap','Aqu','Pis'][sign]}</td>
            <td>{deg}°</td>
          </tr>
        {/each}
      </tbody>
    </table>
    {/if}
  </div>
  {/if}
</div>
