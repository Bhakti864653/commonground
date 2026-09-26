import { afterEach, describe, expect, it, vi } from "vitest";
import { parseNominatimItem, partsFromAddress, placeAtPoint, searchPlaces } from "@/lib/places/geocode";

describe("partsFromAddress", () => {
  it("maps country-specific address keys to country / region / city / neighborhood", () => {
    expect(partsFromAddress({ country: "Canada", province: "Québec", city: "Montréal", neighbourhood: "Plateau-Mont-Royal" })).toEqual({
      country: "Canada",
      region: "Québec",
      city: "Montréal",
      neighborhood: "Plateau-Mont-Royal",
    });
    expect(partsFromAddress({ country: "United States", state: "Texas", town: "Marfa" })).toMatchObject({ region: "Texas", city: "Marfa" });
    expect(partsFromAddress({ country: "India", state: "Karnataka", city: "Bengaluru", suburb: "Indiranagar" })).toMatchObject({ neighborhood: "Indiranagar" });
  });

  it("returns null without a country", () => {
    expect(partsFromAddress({ city: "Nowhere" })).toBeNull();
    expect(partsFromAddress(undefined)).toBeNull();
  });
});

describe("parseNominatimItem", () => {
  it("keeps an area label built from parts, the parts, and a numeric bounding box — nothing else", () => {
    const item = {
      place_id: 1,
      osm_id: 2,
      lat: "45.52",
      lon: "-73.58",
      addresstype: "suburb",
      display_name: "Le Plateau-Mont-Royal, Montréal, H2T 1S6, Québec, Canada",
      boundingbox: ["45.50", "45.54", "-73.60", "-73.56"],
      address: { country: "Canada", province: "Québec", city: "Montréal", neighbourhood: "Plateau-Mont-Royal" },
    };
    const parsed = parseNominatimItem(item)!;
    expect(parsed.label).toBe("Plateau-Mont-Royal, Montréal, Québec, Canada"); // no postcode
    expect(parsed.bbox).toEqual([45.5, 45.54, -73.6, -73.56]);
    expect(Object.keys(parsed).sort()).toEqual(["bbox", "label", "parts"]);
  });

  it("never offers buildings, shops, or streets", () => {
    const base = { boundingbox: ["1", "2", "3", "4"], address: { country: "Canada", city: "Montréal", road: "Boulevard Saint-Laurent" } };
    for (const addresstype of ["office", "tourism", "road", "building", "amenity", "house_number"]) {
      expect(parseNominatimItem({ ...base, addresstype }), addresstype).toBeNull();
    }
    expect(parseNominatimItem({ ...base, addresstype: "city" })).not.toBeNull();
  });

  it("rejects malformed items", () => {
    expect(parseNominatimItem({ display_name: "x" })).toBeNull();
    expect(parseNominatimItem({ display_name: "x", boundingbox: ["a", "b", "c", "d"], address: { country: "C" } })).toBeNull();
    expect(parseNominatimItem(null)).toBeNull();
  });
});

describe("Nominatim requests", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("identifies the app, asks in the visitor's language, and caches repeat searches", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const query = `cache-test-${Date.now()}`;
    await searchPlaces(query, "fr");
    await searchPlaces(`  ${query.toUpperCase()} `, "fr");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain("accept-language=fr");
    expect(url).not.toContain("autocomplete");
    expect(url).toContain("featureType=settlement");
    expect((init.headers as Record<string, string>)["User-Agent"]).toMatch(/^CommonGround\//);
  });

  it("rounds a tapped point to about 100 m before it leaves the server", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({}), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await placeAtPoint(45.523456789, -73.581234567, "en");
    const [url] = fetchMock.mock.calls[0] as unknown as [string];
    expect(url).toContain("lat=45.523&");
    expect(url).toContain("lon=-73.581");
    expect(url).toContain("zoom=14");
  });

  it("reports failure instead of throwing", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("busy", { status: 503 })));
    expect(await searchPlaces(`fail-${Date.now()}`, "en")).toEqual({ ok: false });
  });
});
