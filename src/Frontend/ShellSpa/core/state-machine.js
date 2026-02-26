import { assign, createActor, createMachine } from "https://cdn.jsdelivr.net/npm/xstate@5/+esm";

const shellMachine = createMachine({
  id: "shell",
  initial: "boot",
  context: {
    user: null,
    route: "/",
    sitemap: [],
    miniApps: [],
    error: null
  },
  states: {
    boot: {
      on: {
        AUTH_REQUIRED: "authenticating",
        AUTH_DISABLED: "ready"
      }
    },
    authenticating: {
      on: {
        AUTH_SUCCESS: {
          target: "ready",
          actions: assign({ user: ({ event }) => event.user, error: null })
        },
        AUTH_FAILURE: {
          target: "error",
          actions: assign({ error: ({ event }) => event.error })
        }
      }
    },
    ready: {
      on: {
        NAVIGATE: {
          actions: assign({ route: ({ event }) => event.route })
        },
        SITEMAP_LOADED: {
          actions: assign({ sitemap: ({ event }) => event.sitemap })
        },
        MINI_APPS_LOADED: {
          actions: assign({ miniApps: ({ event }) => event.miniApps })
        },
        SET_USER: {
          actions: assign({ user: ({ event }) => event.user })
        },
        LOGOUT: {
          target: "boot",
          actions: assign({ user: null, route: "/", sitemap: [], miniApps: [] })
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
