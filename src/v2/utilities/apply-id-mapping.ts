import { type Path, compile, match } from "path-to-regexp";

// Example config:
// {
//   'https://presentation-api.dlcs.digirati.io/:customer/:type/:id': 'https://portal.iiifcs.digirati.io/api/iiif/c/:type/:id',
// }
//
// Example input: https://presentation-api.dlcs.digirati.io/58/collections/epfavq24ztyo5vjgs47r
// Example output: https://portal.iiifcs.digirati.io/api/iiif/c/collections/epfavq24ztyo5vjgs47r
const globalCache = new Map<Path, Pattern>();

type Pattern = {
  compile: ReturnType<typeof compile>;
  match: ReturnType<typeof match>;
};

function cachedCompile(pattern: string): Pattern {
  const existingValue = globalCache.get(pattern);
  if (existingValue) {
    return existingValue;
  }

  const value = {
    compile: compile(pattern),
    match: match(pattern),
  };

  globalCache.set(pattern, value);
  return value;
}

export function applyIdMapping(
  inputUrl: string,
  config: Record<string, string>,
  defaultParams: Record<string, string>,
): string {
  const protocol = new URL(inputUrl).protocol;
  const inputUrlWithoutProtocol = inputUrl.replace(/^https?:\/\//, "");
  const configEntries = Object.entries(config);
  for (const [pattern, replacement] of configEntries) {
    try {
      const matcher = cachedCompile(pattern);
      const match = matcher.match(inputUrlWithoutProtocol);
      if (match) {
        const mappedPattern = cachedCompile(replacement);
        const mappedUrl = mappedPattern.compile({
          ...defaultParams,
          ...match.params,
        });
        return `${protocol}//${mappedUrl}`;
      }
    } catch (error) {
      console.error(`Error compiling pattern "${pattern}":`, error);
    }
  }
  return inputUrl;
}
