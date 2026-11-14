import type { Topology } from "topojson-specification";

/**
 * - `standard`: the ORP authority as defined by law, nothing special
 * - `verified`: special case (Prague, cities with districts), jurisdiction verified
 * - `unverified`: special case, jurisdiction not verified yet – the UI should suggest checking it
 */
export type Verification = "standard" | "verified" | "unverified";

export interface Authority {
  /** Name of the public authority as listed for its data box (RPP). */
  name: string;
  dataBoxId: string;
  ico: string | null;
  /** Department to address the notice to, if known. */
  office?: string;
  verification: Verification;
  note?: string;
}

export type AreaKind = "orp" | "praha-so";

export interface AreaProperties {
  /** `orp:<ORP code>` or `praha-so:<administrative district code>` – also the key into `authorities`. */
  id: string;
  name: string;
  kind: AreaKind;
}

export interface DataSource {
  name: string;
  url: string;
  licence: string;
}

export interface AuthorityDataset {
  version: 1;
  generatedAt: string;
  sources: DataSource[];
  authorities: Record<string, Authority>;
  /** TopoJSON with an `areas` object; each geometry's properties are `AreaProperties`. */
  areas: Topology;
}
