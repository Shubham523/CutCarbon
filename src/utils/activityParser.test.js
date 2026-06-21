import { describe, it, expect } from "vitest";
import {
  calculateTransitImpact,
  resolveDate,
  processAndMergeActivities,
  groupActivities,
  TRANSIT_EMISSIONS,
  AVG_SPEED_KMH,
} from "./activityParser";

/**
 * Test suite for verifying core activity calculation and parsing utilities.
 */
describe("activityParser", () => {
  // ── resolveDate ──────────────────────────────────────────────────────

  describe("resolveDate", () => {
    /**
     * Verifies that resolveDate correctly normalizes different input types into Date objects.
     */
    it("resolves Date objects unchanged", () => {
      const d = new Date(1718870400000);
      expect(resolveDate(d).getTime()).toBe(1718870400000);
    });

    it("resolves epoch milliseconds", () => {
      expect(resolveDate(1718870400000).getTime()).toBe(1718870400000);
    });

    it("resolves ISO string", () => {
      expect(resolveDate("2026-06-20").getDate()).toBe(
        new Date("2026-06-20").getDate(),
      );
    });

    it("resolves Firestore-style { seconds } object", () => {
      const ts = { seconds: 1718870400, nanoseconds: 0 };
      expect(resolveDate(ts).getTime()).toBe(1718870400000);
    });

    it("returns current date for null/undefined input", () => {
      const before = Date.now();
      const result = resolveDate(null).getTime();
      const after = Date.now();
      expect(result).toBeGreaterThanOrEqual(before);
      expect(result).toBeLessThanOrEqual(after);
    });
  });

  // ── calculateTransitImpact ───────────────────────────────────────────

  describe("calculateTransitImpact", () => {
    /**
     * Bus mode — 1 hour at 40 km/h = 40 km.
     * Solo car baseline: 40 × 0.192 = 7.68 kg.
     * Bus factor: 0.082 → actual: 40 × 0.082 = 3.28 kg. Saved: 7.68 − 3.28 = 4.4 kg.
     */
    it("calculates bus transit emissions correctly", () => {
      const res = calculateTransitImpact(3600000, "bus");
      expect(res.emitted_kg).toBe(3.28);
      expect(res.prevented_kg).toBe(4.4);
    });

    it("calculates solo_car with no savings", () => {
      const res = calculateTransitImpact(3600000, "solo_car");
      expect(res.emitted_kg).toBe(7.68);
      expect(res.prevented_kg).toBe(0);
    });

    it("calculates carpool savings with 2 passengers", () => {
      const res = calculateTransitImpact(3600000, "carpool", 2);
      expect(res.emitted_kg).toBe(3.84);
      expect(res.prevented_kg).toBe(3.84);
    });

    it("calculates carpool savings with 4 passengers", () => {
      const res = calculateTransitImpact(3600000, "carpool", 4);
      expect(res.emitted_kg).toBe(1.92);
      expect(res.prevented_kg).toBe(5.76);
    });

    it("returns zero for zero duration", () => {
      const res = calculateTransitImpact(0, "bus");
      expect(res.emitted_kg).toBe(0);
      expect(res.prevented_kg).toBe(0);
    });

    it("defaults to solo_car for unknown mode", () => {
      const res = calculateTransitImpact(3600000, "helicopter");
      expect(res.emitted_kg).toBe(7.68);
      expect(res.prevented_kg).toBe(0);
    });

    it("uses train emission factor correctly", () => {
      const res = calculateTransitImpact(3600000, "train");
      expect(res.emitted_kg).toBe(1.64);
      expect(res.prevented_kg).toBe(6.04);
    });
  });

  // ── processAndMergeActivities ────────────────────────────────────────

  describe("processAndMergeActivities", () => {
    it("returns empty array for null input", () => {
      expect(processAndMergeActivities(null)).toEqual([]);
    });

    it("returns empty array for empty array", () => {
      expect(processAndMergeActivities([])).toEqual([]);
    });

    it("deduplicates entries with identical timestamps", () => {
      const ts = "2026-06-20T10:00:00Z";
      const input = [
        { timestamp: ts, item_name: "Walking", duration_ms: 60000 },
        { timestamp: ts, item_name: "Walking", duration_ms: 60000 },
      ];
      const result = processAndMergeActivities(input);
      expect(result).toHaveLength(1);
    });

    it("merges consecutive same-name segments within 60s gap", () => {
      const input = [
        {
          timestamp: "2026-06-20T10:00:00Z",
          item_name: "Walking",
          date_string: "Friday, Jun 20",
          duration_ms: 300000,
          co2_score_kg: 0,
          co2_prevented_kg: 0.5,
        },
        {
          timestamp: "2026-06-20T10:05:30Z",
          item_name: "Walking",
          date_string: "Friday, Jun 20",
          duration_ms: 300000,
          co2_score_kg: 0,
          co2_prevented_kg: 0.5,
        },
      ];
      const result = processAndMergeActivities(input);
      expect(result).toHaveLength(1);
      expect(result[0].sub_blocks).toHaveLength(2);
      expect(result[0].co2_prevented_kg).toBe(1);
    });

    it("does NOT merge segments across different days", () => {
      const input = [
        {
          timestamp: "2026-06-20T23:59:00Z",
          item_name: "Walking",
          date_string: "Friday, Jun 20",
          duration_ms: 120000,
        },
        {
          timestamp: "2026-06-21T00:01:00Z",
          item_name: "Walking",
          date_string: "Saturday, Jun 21",
          duration_ms: 120000,
        },
      ];
      const result = processAndMergeActivities(input);
      expect(result).toHaveLength(2);
    });

    it("does NOT merge segments with different item_name", () => {
      const input = [
        {
          timestamp: "2026-06-20T10:00:00Z",
          item_name: "Walking",
          date_string: "Friday, Jun 20",
          duration_ms: 60000,
        },
        {
          timestamp: "2026-06-20T10:01:30Z",
          item_name: "Running",
          date_string: "Friday, Jun 20",
          duration_ms: 60000,
        },
      ];
      const result = processAndMergeActivities(input);
      expect(result).toHaveLength(2);
    });
  });

  // ── groupActivities ─────────────────────────────────────────────────

  describe("groupActivities", () => {
    it("returns empty object for null input", () => {
      expect(groupActivities(null)).toEqual({});
    });

    it("returns empty object for empty array", () => {
      expect(groupActivities([])).toEqual({});
    });

    it("groups fitness entries by date and item name", () => {
      const input = [
        {
          type: "fitness",
          item_name: "Walking",
          date_string: "Friday, Jun 20",
          icon: "🏃",
          co2_prevented_kg: 1.5,
          duration_ms: 3600000,
          timestamp: "2026-06-20T10:00:00Z",
          id: "doc1",
        },
      ];
      const result = groupActivities(input);
      const keys = Object.keys(result);
      expect(keys).toHaveLength(1);
      expect(result[keys[0]].type).toBe("fitness");
      expect(result[keys[0]].total_prevented).toBe(1.5);
    });

    it("groups grocery/scanned items separately", () => {
      const input = [
        {
          type: "scanned_product",
          item_name: "Milk",
          co2_score_kg: 1.2,
          timestamp: "2026-06-20T10:00:00Z",
          id: "g1",
        },
        {
          type: "fitness",
          item_name: "Walking",
          date_string: "Friday, Jun 20",
          co2_prevented_kg: 0.5,
          duration_ms: 600000,
          timestamp: "2026-06-20T10:00:00Z",
          id: "f1",
        },
      ];
      const result = groupActivities(input);
      const keys = Object.keys(result);
      expect(keys).toHaveLength(2);
    });

    it("assigns synthetic IDs to entries lacking one", () => {
      const input = [
        {
          type: "fitness",
          item_name: "Running",
          date_string: "Friday, Jun 20",
          co2_prevented_kg: 2.0,
          duration_ms: 1800000,
          timestamp: "2026-06-20T10:00:00Z",
        },
      ];
      const result = groupActivities(input);
      const group = Object.values(result)[0];
      expect(group.entries[0].id).toContain("synthetic-");
    });
  });

  // ── Constants sanity ────────────────────────────────────────────────

  describe("constants", () => {
    it("exports correct transit emission factors", () => {
      expect(TRANSIT_EMISSIONS.solo_car).toBe(0.192);
      expect(TRANSIT_EMISSIONS.bus).toBe(0.082);
      expect(TRANSIT_EMISSIONS.train).toBe(0.041);
      expect(TRANSIT_EMISSIONS.metro).toBe(0.041);
    });

    it("exports correct average speed constant", () => {
      expect(AVG_SPEED_KMH).toBe(40);
    });
  });
});
