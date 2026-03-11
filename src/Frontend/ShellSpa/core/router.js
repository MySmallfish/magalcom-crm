export function normalizeRoute(route) {
  if (!route) {
    return "/";
  }

  const normalized = route.startsWith("/") ? route : `/${route}`;
  return normalized.replace(/\/{2,}/g, "/");
}

export function parseRoute(routeValue) {
  const raw = routeValue || "/";
  const [pathPart, queryPart] = raw.split("?");
  const path = normalizeRoute(pathPart);
  const query = Object.fromEntries(new URLSearchParams(queryPart || ""));

  return {
    raw,
    path,
    query
  };
}

export function createHashRouter(onRouteChanged) {
  const notify = () => {
    const route = parseRoute(window.location.hash?.replace("#", "") || "/");
    onRouteChanged(route.path, route);
  };

  window.addEventListener("hashchange", notify);
  notify();

  return {
    navigate(route) {
      const normalized = normalizeRoute(route);
      const current = parseRoute(window.location.hash?.replace("#", "") || "/");
      if (current.path === normalized) {
        notify();
        return;
      }

      window.location.hash = normalized;
    },
    current() {
      return parseRoute(window.location.hash?.replace("#", "") || "/");
    },
    dispose() {
      window.removeEventListener("hashchange", notify);
    },
    replace(route) {
      const normalized = normalizeRoute(route);

      const target = `${window.location.pathname}${window.location.search}#${normalized}`;
      window.history.replaceState(null, "", target);
      notify();
    }
  };
}
