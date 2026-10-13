// src/types/placeLookup.ts

// Granularity levels a named area can sit at, used to pick a place's default
// name (see utils/placeNaming.ts). Each place category prefers a different
// level — a school is known by its campus, a home by its estate.
export type PlaceNameLevel =
  | 'institution' // university / school / hospital campus
  | 'estate' // housing estate, named city block
  | 'building' // a single named building
  | 'venue' // mall, gym, shop, restaurant…
  | 'street' // house number + road
  | 'locality'; // neighbourhood / quarter / suburb

export type OsmTags = Record<string, string>;

// One named OSM way/relation that contains the picked point (Overpass
// is_in). areaDeg2 is the bounding-box area in square degrees — only used to
// rank candidates at the same level smallest-first, so absolute accuracy
// doesn't matter. null when the server didn't return bounds.
export type EnclosingArea = {
  tags: OsmTags;
  areaDeg2: number | null;
};

// Nominatim's reverse-geocode answer, trimmed to the fields naming uses.
export type ReverseGeocodeResult = {
  displayName: string;
  // OSM category/type of the matched object, e.g. amenity/restaurant.
  category?: string;
  type?: string;
  name?: string;
  namedetails?: OsmTags;
  address: Record<string, string>;
};

// Everything known about a picked point — either source may be missing
// (offline, server busy), and naming degrades gracefully to what's left.
export type PlaceContext = {
  enclosingAreas: EnclosingArea[];
  reverse: ReverseGeocodeResult | null;
};
