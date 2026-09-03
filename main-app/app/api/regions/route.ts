import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { attendanceEntries, siteMasters } from "@/db/schema";
import { coordinateKey, parseCoordinateValue } from "@/app/lib/coordinates";

type RegionInfo = { prefecture: string; municipality: string };
type AddressUpdates = {
  entries: Record<string, string>;
  siteMasters: Record<string, string>;
};

const SITE_SEPARATOR = "｜";
let municipalityMapPromise: Promise<Map<string, RegionInfo>> | null = null;

function municipalityMap() {
  if (!municipalityMapPromise)
    municipalityMapPromise = fetch("https://maps.gsi.go.jp/js/muni.js").then(
      async (response) => {
        if (!response.ok)
          throw new Error("市区町村情報を取得できませんでした");
        const source = await response.text();
        const map = new Map<string, RegionInfo>();
        const pattern = /MUNI_ARRAY\["(\d+)"\]\s*=\s*'([^']+)'/g;
        for (const match of source.matchAll(pattern)) {
          const parts = match[2].split(",");
          if (parts.length < 4) continue;
          map.set(String(Number(match[1])), {
            prefecture: parts[1],
            municipality: parts.slice(3).join(",").replace(/[　\s]+/g, ""),
          });
        }
        return map;
      },
    );
  return municipalityMapPromise;
}

function filledAddress(
  addressValue: string,
  coordinateValue: string,
  resolvedAddresses: Record<string, string>,
) {
  const coordinates = coordinateValue ? coordinateValue.split(SITE_SEPARATOR) : [];
  const addresses = addressValue ? addressValue.split(SITE_SEPARATOR) : [];
  while (addresses.length < coordinates.length) addresses.push("");
  let changed = false;
  coordinates.forEach((coordinate, index) => {
    const resolved = resolvedAddresses[coordinateKey(coordinate)];
    const current = addresses[index]?.trim() ?? "";
    if (resolved && (!current || coordinateKey(current))) {
      addresses[index] = resolved;
      changed = true;
    }
  });
  return changed ? addresses.join(SITE_SEPARATOR) : null;
}

async function persistResolvedAddresses(
  resolvedAddresses: Record<string, string>,
): Promise<AddressUpdates> {
  const db = await getDb();
  const updates: AddressUpdates = { entries: {}, siteMasters: {} };
  const [masters, entries] = await Promise.all([
    db.select().from(siteMasters),
    db
      .select()
      .from(attendanceEntries)
      .where(eq(attendanceEntries.deletedAt, "")),
  ]);

  for (const master of masters) {
    const address = filledAddress(
      master.address,
      master.coordinates,
      resolvedAddresses,
    );
    if (!address) continue;
    await db
      .update(siteMasters)
      .set({ address, updatedAt: new Date().toISOString() })
      .where(eq(siteMasters.id, master.id));
    updates.siteMasters[String(master.id)] = address;
  }
  for (const entry of entries) {
    const address = filledAddress(
      entry.address,
      entry.coordinates,
      resolvedAddresses,
    );
    if (!address) continue;
    await db
      .update(attendanceEntries)
      .set({ address })
      .where(eq(attendanceEntries.id, entry.id));
    updates.entries[String(entry.id)] = address;
  }
  return updates;
}

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as {
      coordinates?: string[];
      persist?: boolean;
    };
    const coordinates = [
      ...new Map(
        (payload.coordinates ?? [])
          .slice(0, 100)
          .map(parseCoordinateValue)
          .filter((item): item is NonNullable<typeof item> => Boolean(item))
          .map((item) => [item.key, item] as const),
      ).values(),
    ];
    const municipalities = await municipalityMap();
    const regions: Record<string, RegionInfo> = {};
    const addresses: Record<string, string> = {};
    await Promise.all(
      coordinates.map(async ({ key, lat, lon }) => {
        const response = await fetch(
          `https://mreversegeocoder.gsi.go.jp/reverse-geocoder/LonLatToAddress?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`,
        );
        if (!response.ok) return;
        const data = (await response.json()) as {
          results?: { muniCd?: string; lv01Nm?: string };
        };
        const region = data.results?.muniCd
          ? municipalities.get(String(Number(data.results.muniCd)))
          : undefined;
        if (region) {
          regions[key] = region;
          addresses[key] = `${region.prefecture}${region.municipality}${data.results?.lv01Nm ?? ""}`;
        }
      }),
    );
    const updates = payload.persist
      ? await persistResolvedAddresses(addresses)
      : { entries: {}, siteMasters: {} };
    return Response.json(
      { regions, addresses, updates },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof Error ? error.message : "地域を取得できませんでした",
      },
      { status: 502 },
    );
  }
}
