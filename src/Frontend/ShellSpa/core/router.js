export function createHashRouter(onRouteChanged) {
  const notify = () => {
    const route = window.location.hash?.replace("#", "") || "/";
    onRouteChanged(route);
  };

  window.addEventListener("hashchange", notify);
  notify();

  return {
    navigate(route) {
      if (!route.startsWith("/")) {
        route = `/${route}`;
      }

      window.location.hash = route;
    }
  };
}
