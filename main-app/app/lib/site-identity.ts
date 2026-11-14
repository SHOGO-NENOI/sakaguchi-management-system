export type SiteIdentity = {
  site: string;
  location: string;
  address: string;
  coordinates: string;
};

const normalizeIdentityValue = (value: string) =>
  value.normalize("NFKC").trim().replace(/\s+/g, "").toLocaleLowerCase();

/**
 * 同名の別現場を混同しないため、現場名と位置情報の組み合わせで識別する。
 * 住所がある場合は住所を優先し、なければ緯度経度、地域名の順に使う。
 */
export function siteIdentityKey(site: SiteIdentity) {
  const name = normalizeIdentityValue(site.site);
  const address = normalizeIdentityValue(site.address);
  const coordinates = normalizeIdentityValue(site.coordinates);
  const location = normalizeIdentityValue(site.location);
  const position = address
    ? `address:${address}`
    : coordinates
      ? `coordinates:${coordinates}`
      : location
        ? `location:${location}`
        : "position:unknown";

  return name ? `site:${name}|${position}` : position;
}
