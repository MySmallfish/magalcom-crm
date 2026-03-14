export const MessageVersion = "v1";

export const MessageTypes = Object.freeze({
  ShellContext: "magalcom.shell.context",
  ShellEvent: "magalcom.shell.event",
  MiniAppCommand: "magalcom.miniapp.command"
});

export const ShellCommandNames = Object.freeze({
  Navigate: "navigate",
  OpenProfile: "profile.open",
  Logout: "auth.logout",
  Notify: "shell.notify",
  OpenMiniApp: "miniapp.open",
  SetPageHeader: "shell.header.set",
  ExecuteSqlQuery: "miniapp.sql.query.execute"
});

export const ShellEventNames = Object.freeze({
  ShellReady: "shell.ready",
  RouteChanged: "shell.route.changed",
  MiniAppCommandExecuted: "miniapp.command.executed",
  MiniAppCommandFailed: "miniapp.command.failed",
  MiniAppSqlQueryResult: "miniapp.sql.query.result",
  MiniAppSqlQueryFailed: "miniapp.sql.query.failed",
  CommandExecuting: "command.executing",
  CommandExecuted: "command.executed",
  CommandFailed: "command.failed"
});

export function createShellContextMessage(payload) {
  return {
    type: MessageTypes.ShellContext,
    version: MessageVersion,
    ...payload
  };
}

export function createShellEventMessage(eventType, payload) {
  return {
    type: MessageTypes.ShellEvent,
    version: MessageVersion,
    eventType,
    payload
  };
}

export function isMiniAppCommandMessage(message) {
  return Boolean(
    message
    && message.type === MessageTypes.MiniAppCommand
    && message.version === MessageVersion
    && typeof message.command === "string"
  );
}
