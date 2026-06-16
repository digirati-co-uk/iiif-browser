import { useVaultSelector } from "react-iiif-vault";
import { useLocation, useSearchParams } from "../context";

export function useRouteResource() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const url = searchParams.get("id");

  return useVaultSelector((_, v) => (url ? v.get(url) : null), [url, location]);
}
