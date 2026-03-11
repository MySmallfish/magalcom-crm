import { assign, createActor, createMachine } from "https://cdn.jsdelivr.net/npm/xstate@5/+esm";

const shellMachine = createMachine({
  id: "shell",
  initial: "boot",
  context: {
    user: null,
    route: "/",
    routeQuery: {},
    sitemap: [],
    miniApps: [],
    notifications: [],
    activeMiniAppId: null,
    error: null
  },
  on: {
    NAVIGATE: {
      actions: assign({
        route: ({ event }) => event.route,
        routeQuery: ({ event }) => event.query ?? {}
      })
    }
  },
  states: {
    boot: {
      on: {
        AUTH_REQUIRED: "authenticating"
      }
    },
    authenticating: {
      on: {
        AUTH_SUCCESS: {
          target: "sessionLoading",
          actions: assign({ user: ({ event }) => event.user, error: null })
        },
        AUTH_FAILURE: {
          target: "error",
          actions: assign({ error: ({ event }) => event.error })
        }
      }
    },
    sessionLoading: {
      on: {
        SESSION_READY: {
          target: "ready",
          actions: assign({
            user: ({ event, context }) => event.user ?? context.user,
            sitemap: ({ event }) => event.sitemap ?? [],
            miniApps: ({ event }) => event.miniApps ?? [],
            error: null
          })
        },
        SESSION_FAILED: {
          target: "error",
          actions: assign({ error: ({ event }) => event.error })
        }
      }
    },
    ready: {
      on: {
        SITEMAP_LOADED: {
          actions: assign({ sitemap: ({ event }) => event.sitemap })
        },
        MINI_APPS_LOADED: {
          actions: assign({ miniApps: ({ event }) => event.miniApps })
        },
        ACTIVE_MINI_APP_CHANGED: {
          actions: assign({ activeMiniAppId: ({ event }) => event.miniAppId ?? null })
        },
        NOTIFICATION_ADDED: {
          actions: assign({
            notifications: ({ context, event }) => [
              ...context.notifications,
              {
                id: event.id || crypto.randomUUID(),
                level: event.level || "info",
                message: event.message
              }
            ]
          })
        },
        NOTIFICATION_DISMISSED: {
          actions: assign({
            notifications: ({ context, event }) => context.notifications.filter((item) => item.id !== event.id)
          })
        },
        SET_USER: {
          actions: assign({ user: ({ event }) => event.user })
        },
        LOGOUT: {
          target: "boot",
          actions: assign({
            user: null,
            route: "/",
            routeQuery: {},
            sitemap: [],
            miniApps: [],
            notifications: [],
            activeMiniAppId: null
          })
        }
      }
    },
    error: {
      on: {
        RESET: {
          target: "boot",
          actions: assign({ error: null })
        }
      }
    }
  }
});

export function createShellActor() {
  return createActor(shellMachine);
}
