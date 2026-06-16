import type { ReactNode } from "react";
import { useLocation } from "../context";

interface RouterSwitchProps {
  routes: Array<[string, ReactNode]>;
}

export function RouterSwitch({ routes }: RouterSwitchProps) {
  const location = useLocation();
  const match = routes.find(([path]) => path === location.pathname);
  return <>{match ? match[1] : null}</>;
}
