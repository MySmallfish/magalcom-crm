export const LocaleCodes = Object.freeze({
  Hebrew: "he",
  English: "en"
});

export const DefaultLocale = LocaleCodes.Hebrew;

const textCatalog = Object.freeze({
  "chrome.brand": { he: "מגלקום CRM", en: "Magalcom CRM" },
  "menu.home": { he: "בית", en: "Home" },
  "menu.profile": { he: "פרופיל", en: "Profile" },
  "menu.mini-apps": { he: "מיני אפליקציות", en: "Mini Apps" },
  "profile.guest": { he: "אורח", en: "Guest" },
  "profile.open": { he: "פרופיל", en: "Profile" },
  "profile.logout": { he: "התנתקות", en: "Logout" },
  "profile.language": { he: "שפה", en: "Language" },
  "profile.title": { he: "פרופיל משתמש", en: "User Profile" },
  "profile.description": { he: "פרטי הזיהוי והעדפות המעטפת נשמרים עבור המשתמש.", en: "Identity details and shell preferences are stored per user." },
  "profile.displayName": { he: "שם תצוגה", en: "Display Name" },
  "profile.email": { he: "דואר אלקטרוני", en: "Email" },
  "profile.subjectId": { he: "מזהה משתמש", en: "Subject ID" },
  "profile.roles": { he: "תפקידים", en: "Roles" },
  "profile.languageHelp": { he: "עברית היא ברירת המחדל. ניתן להחליף שפה בכל עת.", en: "Hebrew is the default. You can switch language at any time." },
  "profile.logoutButton": { he: "התנתקות", en: "Logout" },
  "common.none": { he: "ללא", en: "None" },
  "common.notAvailable": { he: "לא זמין", en: "N/A" },
  "auth.signingInTitle": { he: "מתחברים למערכת", en: "Signing in" },
  "auth.signingInDescription": { he: "מתבצעת בדיקת הסשן מול Microsoft Entra ID.", en: "Checking your session with Microsoft Entra ID." },
  "auth.redirectingTitle": { he: "מעבירים לכניסה", en: "Redirecting to sign in" },
  "auth.redirectingDescription": { he: "הדפדפן מועבר כעת למסך הכניסה של Microsoft Entra ID.", en: "The browser is being redirected to Microsoft Entra ID." },
  "auth.loadingSessionTitle": { he: "טוענים את הסשן", en: "Loading session" },
  "auth.loadingSessionDescription": { he: "נטענים פרטי המשתמש, המפה והמיני אפליקציות המורשות.", en: "Loading the user profile, sitemap, and authorized mini-apps." },
  "auth.failedTitle": { he: "הכניסה נכשלה", en: "Sign-in failed" },
  "auth.failedDescription": { he: "לא ניתן היה להשלים את ההתחברות: {message}", en: "The sign-in flow could not be completed: {message}" },
  "home.title": { he: "מעטפת מגלקום CRM", en: "Magalcom CRM Shell" },
  "home.loggedInAs": { he: "מחובר כ", en: "Logged in as" },
  "home.description": { he: "השתמשו בתפריט הצד לניווט בין דפי המעטפת והמיני אפליקציות.", en: "Use the side menu to navigate through shell pages and mini-app modules." },
  "miniapps.title": { he: "מיני אפליקציות", en: "Mini Apps" },
  "miniapps.description": { he: "בחרו מיני אפליקציה כדי לפתוח אותה בתוך המעטפת או הוסיפו קישור ישיר בתפריט דרך הגדרת המפה באתר ה-API.", en: "Open a mini-app from the catalog or add a direct menu link through the API sitemap configuration." },
  "miniapps.route": { he: "נתיב", en: "Route" },
  "miniapps.open": { he: "פתיחה", en: "Open" },
  "miniapps.empty": { he: "אין מיני אפליקציות זמינות למשתמש זה.", en: "No mini-apps are available for this user." },
  "shell.notificationDefault": { he: "התראה מהמעטפת", en: "Notification from shell" },
  "shell.sessionFailed": { he: "אתחול הסשן נכשל: {message}", en: "Session initialization failed: {message}" },
  "shell.routeRenderFailed": { he: "טעינת הדף נכשלה: {message}", en: "Route rendering failed: {message}" },
  "shell.pageNotFound": { he: "הדף לא נמצא", en: "Page not found" },
  "shell.pageFailed": { he: "טעינת הדף נכשלה", en: "Page failed to render" },
  "miniapp.notFoundTitle": { he: "המיני אפליקציה לא נמצאה", en: "Mini App Not Found" },
  "miniapp.notFoundDescription": { he: "המיני אפליקציה עם המזהה {miniAppId} אינה זמינה למשתמש זה.", en: "Mini-app with id {miniAppId} is not available for this user." }
});

const miniAppTitleCatalog = Object.freeze({});

function applyParams(template, params) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (params[key] == null) {
      return match;
    }

    return String(params[key]);
  });
}

export function normalizeLocale(locale) {
  return locale === LocaleCodes.English ? LocaleCodes.English : LocaleCodes.Hebrew;
}

export function getDirection(locale) {
  return normalizeLocale(locale) === LocaleCodes.Hebrew ? "rtl" : "ltr";
}

export function t(locale, key, params = {}) {
  const entry = textCatalog[key];
  if (!entry) {
    return key;
  }

  const normalized = normalizeLocale(locale);
  return applyParams(entry[normalized] ?? entry[DefaultLocale] ?? key, params);
}

function translateFromCatalog(locale, catalog, key, fallback) {
  const entry = catalog[key];
  if (!entry) {
    return fallback ?? String(key ?? "");
  }

  const normalized = normalizeLocale(locale);
  return entry[normalized] ?? entry[DefaultLocale] ?? fallback ?? String(key ?? "");
}

export function localizeMiniAppTitle(locale, miniAppId, fallback) {
  return translateFromCatalog(locale, miniAppTitleCatalog, miniAppId, fallback);
}
