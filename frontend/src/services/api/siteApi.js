import generationApi from "./generationApi";
import weatherApi from "./weatherApi";

export const STATIC_SITES = [
  {
    siteId: "SITE_001",
    name: "Solar Plant Alpha",
    fullName: "Solar Plant Alpha (SITE_001)",
    capacityKw: 500.0,
    location: "Bhadla Solar Park, Rajasthan, India",
    coordinates: "27.5387° N, 71.9172° E",
    inverters: ["INV_01", "INV_02", "INV_03", "INV_04"],
    inverterCapacityKw: 125.0,
    technology: "Monocrystalline Silicon, Dual-Axis Tracker",
    gridInterconnect: "415V 3-Phase AC @ 50 Hz",
    commissionedDate: "2025-01-15",
    lastReading: "2026-10-03T12:00:00Z",
  },
  {
    siteId: "SITE_002",
    name: "Solar Plant Beta",
    fullName: "Solar Plant Beta (SITE_002)",
    capacityKw: 750.0,
    location: "Charanka Solar Park, Gujarat, India",
    coordinates: "23.9069° N, 71.2025° E",
    inverters: ["INV_01", "INV_02", "INV_03", "INV_04"],
    inverterCapacityKw: 187.5,
    technology: "Bifacial Monocrystalline, Single-Axis Tracker",
    gridInterconnect: "415V 3-Phase AC @ 50 Hz",
    commissionedDate: "2025-06-20",
    lastReading: "2026-10-03T12:00:00Z",
  },
];

export const siteApi = {
  /**
   * Fetches all registered solar farm sites and calculates live aggregates.
   * Discovers sites from backend or falls back to known multi-site configuration (SITE_001 & SITE_002).
   */
  async getSitesOverview() {
    let records = [];
    let weatherRecords = [];

    try {
      [records, weatherRecords] = await Promise.all([
        generationApi.getAllGeneration().catch(() => []),
        weatherApi.getAllWeather().catch(() => []),
      ]);
    } catch {
      // Backend offline or unreachable
    }

    // Base template map
    const siteMap = new Map();
    STATIC_SITES.forEach((site) => {
      siteMap.set(site.siteId, {
        ...site,
        inverters: [...site.inverters],
        currentPowerKw: 0,
        totalEnergyKwh: 0,
        readingCount: 0,
        faultyInverters: new Set(),
        currentWeather: null,
      });
    });

    // Populate with real generation telemetry if present
    if (records && records.length > 0) {
      records.forEach((r) => {
        if (!siteMap.has(r.siteId)) {
          siteMap.set(r.siteId, {
            siteId: r.siteId,
            name: `Solar Plant ${r.siteId}`,
            fullName: `Solar Plant ${r.siteId}`,
            capacityKw: 500.0,
            location: "Solar Array Zone",
            coordinates: "India",
            inverters: [],
            inverterCapacityKw: 125.0,
            technology: "PV Solar Array",
            gridInterconnect: "415V 3-Phase AC",
            commissionedDate: "2025-01-01",
            lastReading: r.timestamp,
            currentPowerKw: 0,
            totalEnergyKwh: 0,
            readingCount: 0,
            faultyInverters: new Set(),
            currentWeather: null,
          });
        }

        const site = siteMap.get(r.siteId);
        if (!site.inverters.includes(r.inverterId)) {
          site.inverters.push(r.inverterId);
        }

        site.readingCount++;
        site.totalEnergyKwh += r.intervalEnergyKwh || 0;

        if (r.statusFlag === "FAULT" || r.statusFlag === "TRIP") {
          site.faultyInverters.add(r.inverterId);
        }

        if (
          !site.lastReading ||
          new Date(r.timestamp) > new Date(site.lastReading)
        ) {
          site.lastReading = r.timestamp;
        }
      });
    }

    // Populate latest weather per site
    if (weatherRecords && weatherRecords.length > 0) {
      weatherRecords.forEach((w) => {
        const site = siteMap.get(w.siteId);
        if (site) {
          if (
            !site.currentWeather ||
            new Date(w.timestamp) > new Date(site.currentWeather.timestamp || 0)
          ) {
            site.currentWeather = w;
          }
        }
      });
    }

    return Array.from(siteMap.values()).map((s) => ({
      ...s,
      inverters: s.inverters.sort(),
      faultyInverterCount: s.faultyInverters ? s.faultyInverters.size : 0,
      totalEnergyKwh: Number(s.totalEnergyKwh.toFixed(2)),
    }));
  },

  /**
   * Fetches detailed information for a specific site.
   */
  async getSiteById(siteId) {
    const sites = await this.getSitesOverview();
    const found = sites.find(
      (s) => s.siteId.toUpperCase() === siteId.toUpperCase(),
    );
    if (found) return found;

    return (
      STATIC_SITES.find(
        (s) => s.siteId.toUpperCase() === siteId.toUpperCase(),
      ) || STATIC_SITES[0]
    );
  },
};

export default siteApi;
