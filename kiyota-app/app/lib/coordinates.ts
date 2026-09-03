export type ParsedCoordinates = {
  key: string;
  lat: number;
  lon: number;
};

function validCoordinates(lat: number, lon: number) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lon) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lon) <= 180
  );
}

function result(lat: number, lon: number): ParsedCoordinates | null {
  if (!validCoordinates(lat, lon)) return null;
  return { key: `${lat.toFixed(6)},${lon.toFixed(6)}`, lat, lon };
}

function dmsValue(
  degrees: string,
  minutes: string | undefined,
  seconds: string | undefined,
  direction: string,
) {
  const decimal =
    Number(degrees) + Number(minutes || 0) / 60 + Number(seconds || 0) / 3600;
  return ["S", "W"].includes(direction.toUpperCase()) ? -decimal : decimal;
}

export function parseCoordinateValue(value: string): ParsedCoordinates | null {
  const normalized = value.normalize("NFKC").trim();
  if (!normalized) return null;

  const dmsPattern =
    /([+-]?\d+(?:\.\d+)?)\s*[°º]\s*(\d+(?:\.\d+)?)?\s*[′']?\s*(\d+(?:\.\d+)?)?\s*[″"]?\s*([NSEW])/gi;
  const dmsMatches = [...normalized.matchAll(dmsPattern)];
  if (dmsMatches.length >= 2) {
    const latitudeMatch = dmsMatches.find((match) =>
      ["N", "S"].includes(match[4].toUpperCase()),
    );
    const longitudeMatch = dmsMatches.find((match) =>
      ["E", "W"].includes(match[4].toUpperCase()),
    );
    if (latitudeMatch && longitudeMatch) {
      return result(
        dmsValue(
          latitudeMatch[1],
          latitudeMatch[2],
          latitudeMatch[3],
          latitudeMatch[4],
        ),
        dmsValue(
          longitudeMatch[1],
          longitudeMatch[2],
          longitudeMatch[3],
          longitudeMatch[4],
        ),
      );
    }
  }

  const numbers = normalized.match(/[+-]?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  if (numbers.length < 2) return null;
  return result(numbers[0], numbers[1]);
}

export function coordinateKey(value: string) {
  return parseCoordinateValue(value)?.key ?? "";
}

