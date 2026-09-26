import { describe, expect, it } from "vitest";
import { formatCoords, haversineKm, isValidLatLon } from "@/lib/geo";

describe("haversineKm", () => {
  it("is zero for the same point", () => {
    expect(haversineKm({ lat: 31.77, lon: 35.21 }, { lat: 31.77, lon: 35.21 })).toBe(0);
  });

  it("measures Tel Aviv → Jerusalem at about 54 km", () => {
    const d = haversineKm({ lat: 32.0853, lon: 34.7818 }, { lat: 31.7683, lon: 35.2137 });
    expect(d).toBeGreaterThan(52);
    expect(d).toBeLessThan(56);
  });

  it("handles the antimeridian", () => {
    const d = haversineKm({ lat: 0, lon: 179.5 }, { lat: 0, lon: -179.5 });
    expect(d).toBeCloseTo(111.2, 0);
  });

  it("measures antipodes as half the circumference", () => {
    expect(haversineKm({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })).toBeCloseTo(20015, -1);
  });
});

describe("isValidLatLon", () => {
  it("accepts valid and rejects invalid coordinates", () => {
    expect(isValidLatLon({ lat: 10, lon: 20 })).toBe(true);
    expect(isValidLatLon({ lat: 91, lon: 0 })).toBe(false);
    expect(isValidLatLon({ lat: 0, lon: -181 })).toBe(false);
    expect(isValidLatLon({ lat: NaN, lon: 0 })).toBe(false);
    expect(isValidLatLon(null)).toBe(false);
  });
});

describe("formatCoords", () => {
  it("uses hemisphere letters", () => {
    expect(formatCoords({ lat: -33.8568, lon: 151.2153 })).toBe("33.85680°S, 151.21530°E");
    expect(formatCoords({ lat: 40.6892, lon: -74.0445 })).toBe("40.68920°N, 74.04450°W");
  });
});
