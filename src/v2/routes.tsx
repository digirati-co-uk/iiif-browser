export interface FixedRouteDefinition {
  type: "fixed";
  url: string;
  router: string;
  fallback?: boolean;
  title: string;
  description?: string;
}

export interface ResourceRouteDefinition {
  type: "resource";
  resource: string;
  url: string;
}

export type BrowserRoutes = Array<
  FixedRouteDefinition | ResourceRouteDefinition
>;

export const fixedRoutes: FixedRouteDefinition[] = [
  {
    type: "fixed",
    url: "/",
    router: "iiif://home",
    title: "Home",
  },
  {
    type: "fixed",
    url: "/about",
    router: "iiif://about",
    title: "About",
  },
  {
    type: "fixed",
    url: "/history",
    router: "iiif://history",
    title: "History",
  },
  {
    type: "fixed",
    url: "/not-found",
    router: "iiif://not-found",
    title: "Not Found",
    fallback: true,
  },
];

export const routes: BrowserRoutes = [
  ...fixedRoutes,
  {
    type: "resource",
    resource: "Collection",
    url: "/collection",
  },
  {
    type: "resource",
    resource: "Manifest",
    url: "/manifest",
  },
];
