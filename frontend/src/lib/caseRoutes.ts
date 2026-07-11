export type CasePage = "discrepancies" | "claims";

export function caseScopedPath(caseId: string, page: CasePage) {
  return `/cases/${encodeURIComponent(caseId)}/${page}`;
}
