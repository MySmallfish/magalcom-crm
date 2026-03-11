import { normalizeRoute } from "./router.js";

function matchPattern(pattern, route) {
  const normalizedPattern = normalizeRoute(pattern);
  const normalizedRoute = normalizeRoute(route);

  const patternSegments = normalizedPattern.split("/").filter(Boolean);
  const routeSegments = normalizedRoute.split("/").filter(Boolean);

  if (patternSegments.length !== routeSegments.length) {
    return null;
  }

  const params = {};

  for (let i = 0; i < patternSegments.length; i += 1) {
    const patternSegment = patternSegments[i];
    const routeSegment = routeSegments[i];

    if (patternSegment.startsWith(":")) {
      params[patternSegment.slice(1)] = decodeURIComponent(routeSegment);
      continue;
    }

    if (patternSegment !== routeSegment) {
      return null;
    }
  }

  return params;
}

export class PluginRegistry {
  #plugins = [];
  #miniAppsById = new Map();

  register(plugin) {
    if (!plugin?.id || !plugin?.pattern || typeof plugin.render !== "function") {
      throw new Error("Plugin must include id, pattern, and render(context) function.");
    }

    const exists = this.#plugins.some((item) => item.id === plugin.id);
    if (exists) {
      throw new Error(`Plugin already registered: ${plugin.id}`);
    }

    this.#plugins.push({
      order: plugin.order ?? 100,
      ...plugin
    });

    this.#plugins.sort((a, b) => a.order - b.order);
  }

  setMiniApps(miniApps) {
    this.#miniAppsById.clear();

    for (const miniApp of miniApps || []) {
      if (!miniApp?.id) {
        continue;
      }

      this.#miniAppsById.set(miniApp.id, miniApp);
    }
  }

  listMiniApps() {
    return [...this.#miniAppsById.values()].sort((a, b) => a.title.localeCompare(b.title));
  }

  getMiniApp(miniAppId) {
    return this.#miniAppsById.get(miniAppId) || null;
  }

  getMiniAppByRoute(route) {
    const normalizedRoute = normalizeRoute(route);
    return [...this.#miniAppsById.values()].find((miniApp) => normalizeRoute(miniApp.route) === normalizedRoute) || null;
  }

  resolve(route) {
    for (const plugin of this.#plugins) {
      const params = matchPattern(plugin.pattern, route);
      if (params) {
        return {
          plugin,
          params
        };
      }
    }

    return null;
  }
}
