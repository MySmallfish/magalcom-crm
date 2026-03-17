const app = document.getElementById("app");

const DEFAULT_FILTERS = {
  search: "",
  ownerSubjectId: "",
  customerId: "",
  workTypeId: "",
  contractType: "",
  stage: "",
  offerStatus: "",
  dueDateFrom: "",
  dueDateTo: "",
  amountMin: "",
  amountMax: "",
  sortBy: "updatedAt"
};

const LocaleCodes = Object.freeze({
  Hebrew: "he",
  English: "en"
});

const StageValues = Object.freeze(["Before", "AuctionKnown", "AuctionActive", "Sent"]);
const OfferStatusValues = Object.freeze(["Open", "Win", "Lose", "Suspended", "Cancelled"]);

const MessageTypes = Object.freeze({
  ShellContext: "magalcom.shell.context",
  MiniAppCommand: "magalcom.miniapp.command"
});

const MessageVersion = "v1";
const AmountInputPattern = /^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/;
const AmountInputPatternAttribute = "^(?:\\d+|\\d{1,3}(?:,\\d{3})+)(?:\\.\\d{1,2})?$";

const HostCommandNames = Object.freeze({
  SetPageHeader: "shell.header.set"
});

const DashboardStageColors = Object.freeze({
  Before: "#8ea1c5",
  AuctionKnown: "#5573ad",
  AuctionActive: "#355f9f",
  Sent: "#274884",
  Unstaged: "#a3b3c1"
});

const DashboardStatusColors = Object.freeze({
  Open: "#5573ad",
  Win: "#274884",
  Lose: "#b4423f",
  Suspended: "#8ea1c5",
  Cancelled: "#8597a6"
});

const DashboardWorkTypeColors = Object.freeze({
  DataCenter: "#274884",
  Security: "#19345f",
  Safety: "#6d88b9",
  Multimedia: "#4f69a1",
  Transport: "#90a3c5",
  Communications: "#3b5e9c"
});

const DashboardFallbackPalette = Object.freeze([
  "#274884",
  "#19345f",
  "#4f69a1",
  "#6d88b9",
  "#90a3c5",
  "#b3c0d9"
]);

const hostOrigin = resolveOrigin(document.referrer) || window.location.origin;
let lastHeaderAnnouncement = "";

const textCatalog = Object.freeze({
  "app.title": { he: "ניהול לידים", en: "Leads Management" },
  "view.dashboard": { he: "דשבורד", en: "Dashboard" },
  "view.list": { he: "רשימת לידים", en: "Lead List" },
  "view.newLead": { he: "ליד חדש", en: "New Lead" },
  "view.editLead": { he: "עריכת ליד", en: "Edit Lead" },
  "view.salesMonthlyReport": { he: "דוח סטטיסטיקות", en: "Statistics Report" },
  "app.subtitle.dashboard": { he: "מבט מרוכז על פייפליין, תחזית וסיכונים פתוחים.", en: "A focused view of pipeline, forecast, and open risks." },
  "app.subtitle.list": { he: "סינון, סקירה ותחזוקה שוטפת של כל הלידים הפעילים.", en: "Filter, review, and manage the active lead pipeline." },
  "question.knows-customer-personally": { he: "מכירים את הלקוח באופן אישי?", en: "Know the customer personally?" },
  "question.returning-customer": { he: "לקוח חוזר?", en: "Returning customer?" },
  "question.involved-in-planning": { he: "מעורבים בתכנון הפרויקט?", en: "Involved in project planning?" },
  "question.consultant-relationship": { he: "קשר טוב עם היועץ?", en: "Relationship with consultant?" },
  "question.project-management-relationship": { he: "קשר חזק עם הנהלת הפרויקט?", en: "Strong relationship with project management?" },
  "question.customer-under-price-list": { he: "הלקוח תחת מחירון?", en: "Customer under price list?" },
  "WorkType.DataCenter": { he: "דאטה סנטר", en: "Data Center" },
  "WorkType.Security": { he: "אבטחה", en: "Security" },
  "WorkType.Safety": { he: "בטיחות", en: "Safety" },
  "WorkType.Multimedia": { he: "מולטימדיה", en: "Multimedia" },
  "WorkType.Transport": { he: "תחבורה", en: "Transport" },
  "WorkType.Communications": { he: "תקשורת", en: "Communications" },
  "form.header.newLeadSubtitle": { he: "מלאו פרטי לקוח, היקף, כשירות ותחזית כדי לפתוח ליד חדש.", en: "Add customer, scope, qualification, and forecast details to open a new lead." },
  "form.header.editLeadSubtitle": { he: "עדכנו פרטי לקוח, היקף, כשירות ותחזית עבור הליד הקיים.", en: "Update customer, scope, qualification, and forecast details for this lead." },
  "form.keyboardHint": { he: "אפשר להשתמש במקלדת כדי לעבור בין שדות, לבחור תשובות ולשמור עם Ctrl/Cmd + Enter.", en: "You can use your keyboard to move between fields, choose answers, and save with Ctrl/Cmd + Enter." },
  "state.waitingEyebrow": { he: "מודול CRM משובץ", en: "Embedded CRM module" },
  "state.waitingTitle": { he: "ממתינים להקשר מהמארח", en: "Waiting for host context" },
  "state.waitingDescription": { he: "אפליקציית הלידים מתחילה רק אחרי שמעטפת ה-CRM שולחת את המשתמש, ההגדרות והטוקן הנוכחיים.", en: "The leads app only starts after the parent CRM posts the current user, configuration, and access token." },
  "state.handshakeEyebrow": { he: "נדרש חיבור למעטפת", en: "Host handshake required" },
  "state.handshakeTitle": { he: "הקשר ה-CRM לא התקבל", en: "CRM context was not received" },
  "state.handshakeDescription": { he: "פתחו את המודול מתוך מעטפת ה-CRM כדי שה-iframe יקבל הודעת postMessage תקינה.", en: "Open this module from the CRM shell so the iframe can receive a valid postMessage payload." },
  "state.loadFailedEyebrow": { he: "הטעינה נכשלה", en: "Load failed" },
  "state.loadFailedTitle": { he: "לא ניתן היה לטעון את נתוני הלידים", en: "Leads data could not be loaded" },
  "state.connectedAs": { he: "מחובר כ-{name}", en: "Connected as {name}" },
  "state.loadingTitle": { he: "מסנכרנים את סביבת הלידים", en: "Syncing lead workspace" },
  "state.loadingDescription": { he: "טוענים לקוחות, פרויקטים, סוגי עבודה והפייפליין הנוכחי מ-CRM API.", en: "Loading customers, projects, work types, and the current pipeline from the CRM API." },
  "error.missingAccessToken": { he: "הקשר מהמארח חסר טוקן גישה.", en: "Host context is missing an access token." },
  "error.requestFailedStatus": { he: "הבקשה נכשלה עם סטטוס {status}.", en: "Request failed with status {status}." },
  "nav.dashboard": { he: "דשבורד", en: "Dashboard" },
  "nav.list": { he: "רשימת לידים", en: "Lead List" },
  "nav.newLead": { he: "ליד חדש", en: "New Lead" },
  "common.dismiss": { he: "סגירה", en: "Dismiss" },
  "common.cancel": { he: "ביטול", en: "Cancel" },
  "common.close": { he: "סגירה", en: "Close" },
  "common.all": { he: "הכל", en: "All" },
  "common.notSet": { he: "לא הוגדר", en: "Not set" },
  "common.noDueDate": { he: "ללא רבעון יעד", en: "No due quarter" },
  "common.yes": { he: "כן", en: "Yes" },
  "common.no": { he: "לא", en: "No" },
  "common.open": { he: "פתיחה", en: "Open" },
  "common.remove": { he: "הסרה", en: "Remove" },
  "common.exporting": { he: "מייצא...", en: "Exporting..." },
  "common.selectType": { he: "בחירת סוג", en: "Select type" },
  "common.selectQuarter": { he: "בחירת רבעון", en: "Select quarter" },
  "common.memoryOnly": { he: "בזיכרון בלבד", en: "memory only" },
  "common.incomplete": { he: "לא הושלם", en: "Incomplete" },
  "common.noData": { he: "עדיין אין נתונים להצגה.", en: "No data available yet." },
  "common.noImmediateAction": { he: "אין כרגע לידים שדורשים טיפול מיידי.", en: "No leads currently require immediate action." },
  "dashboard.openLeads": { he: "לידים פתוחים", en: "Open leads" },
  "dashboard.pipelineAmount": { he: "סכום פייפליין", en: "Pipeline amount" },
  "dashboard.weightedForecast": { he: "תחזית משוקללת", en: "Weighted forecast" },
  "dashboard.perpetualValue": { he: "שווי חוזים מתמשכים", en: "Perpetual value" },
  "dashboard.wins": { he: "זכיות", en: "Wins" },
  "dashboard.highConfidence": { he: "תחזית בביטחון גבוה", en: "High-confidence forecast" },
  "dashboard.averageChance": { he: "סיכוי ממוצע", en: "Average chance" },
  "dashboard.atRiskExposure": { he: "חשיפה בסיכון", en: "At-risk exposure" },
  "dashboard.pipelineByOwner": { he: "פייפליין לפי בעלים", en: "Pipeline by owner" },
  "dashboard.stageMix": { he: "התפלגות שלבים", en: "Stage mix" },
  "dashboard.topCustomers": { he: "לקוחות מובילים", en: "Top customers" },
  "dashboard.workTypeConcentration": { he: "ריכוז לפי סוג עבודה", en: "Work type concentration" },
  "dashboard.monthlyForecast": { he: "תחזית רבעונית", en: "Quarterly forecast" },
  "dashboard.riskWidget": { he: "לידים בסיכון", en: "Risk widget" },
  "dashboard.noStageData": { he: "עדיין אין נתוני שלבים.", en: "No stage data available yet." },
  "dashboard.openFilteredList": { he: "פתיחת רשימה מסוננת", en: "Open filtered list" },
  "dashboard.liveOverview": { he: "תמונת מצב חיה", en: "Live pipeline snapshot" },
  "dashboard.snapshotTitle": { he: "{count} לידים פעילים אצל {customers} לקוחות", en: "{count} active pursuits across {customers} customers" },
  "dashboard.snapshotDescription": { he: "תחזית משוקללת של {forecast} מתוך פייפליין כולל של {pipeline}, עם חלוקה לפי שלבים, סטטוסים וסוגי עבודה.", en: "Weighted forecast of {forecast} out of a total pipeline of {pipeline}, broken down by stages, statuses, and work types." },
  "dashboard.dueSoon": { he: "יעד ב-30 הימים הקרובים", en: "Due in 30 days" },
  "dashboard.overdue": { he: "עבר תאריך יעד", en: "Overdue" },
  "dashboard.winRate": { he: "שיעור זכייה", en: "Win rate" },
  "dashboard.forecastCoverage": { he: "כיסוי תחזית", en: "Forecast coverage" },
  "dashboard.pipelineFunnel": { he: "משפך פייפליין", en: "Pipeline funnel" },
  "dashboard.statusPortfolio": { he: "התפלגות סטטוסים", en: "Status portfolio" },
  "dashboard.workTypePortfolio": { he: "תמהיל סוגי עבודה", en: "Work type portfolio" },
  "dashboard.monthlyRunRate": { he: "תחזית לפי רבעונים", en: "Quarterly forecast run-rate" },
  "dashboard.ownerLeaderboard": { he: "דירוג בעלי פייפליין", en: "Owner leaderboard" },
  "dashboard.customerExposure": { he: "חשיפה לפי לקוח", en: "Customer exposure" },
  "dashboard.portfolioHealth": { he: "בריאות הפורטפוליו", en: "Portfolio health" },
  "dashboard.topOpportunity": { he: "הזדמנות מובילה", en: "Top opportunity" },
  "dashboard.topCustomer": { he: "לקוח מוביל", en: "Top customer" },
  "dashboard.topOwner": { he: "בעלים מוביל", en: "Top owner" },
  "dashboard.emptySpotlight": { he: "עדיין אין מספיק נתונים להצגת מוקד.", en: "Not enough data yet to show a spotlight." },
  "dashboard.exploreList": { he: "פתיחת הרשימה", en: "Open lead list" },
  "dashboard.report": { he: "דוח", en: "Report" },
  "dashboard.salesMonthlyReport": { he: "דוח סטטיסטיקות", en: "Statistics Report" },
  "dashboard.ofPipeline": { he: "מהפייפליין", en: "of pipeline" },
  "dashboard.ofForecast": { he: "מהתחזית", en: "of forecast" },
  "dashboard.leadsCount": { he: "{count} לידים", en: "{count} leads" },
  "dashboard.customersCount": { he: "{count} לקוחות", en: "{count} customers" },
  "dashboard.stageValueShare": { he: "חלק יחסי לפי סכום", en: "Value share by stage" },
  "dashboard.valueMix": { he: "חלוקה לפי סכום", en: "Value mix" },
  "dashboard.pipelinePressure": { he: "עומס טיפול", en: "Attention load" },
  "dashboard.requiresAttention": { he: "דורש טיפול", en: "requires attention" },
  "dashboard.highConfidenceShare": { he: "חלק התחזית בביטחון גבוה", en: "High-confidence share" },
  "dashboard.perpetualShare": { he: "חלק חוזים מתמשכים", en: "Perpetual share" },
  "dashboard.closedWinRate": { he: "זכיות מתוך סגירות", en: "Closed-win rate" },
  "dashboard.riskShare": { he: "חלק מהפייפליין בסיכון", en: "Pipeline at risk" },
  "list.search": { he: "חיפוש", en: "Search" },
  "list.searchPlaceholder": { he: "חיפוש לקוח או פרויקט", en: "Search customer or project" },
  "list.owner": { he: "בעלים", en: "Owner" },
  "list.customer": { he: "לקוח", en: "Customer" },
  "list.workType": { he: "סוג עבודה", en: "Work Type" },
  "list.contractType": { he: "סוג חוזה", en: "Contract Type" },
  "list.stage": { he: "סוג ליד", en: "Lead Type" },
  "list.offerStatus": { he: "סטטוס מכרז", en: "Auction Status" },
  "list.dueFrom": { he: "רבעון יעד מ-", en: "Due quarter from" },
  "list.dueTo": { he: "רבעון יעד עד", en: "Due quarter to" },
  "list.amountMin": { he: "סכום מינימלי", en: "Amount min" },
  "list.amountMax": { he: "סכום מקסימלי", en: "Amount max" },
  "list.sortBy": { he: "מיון לפי", en: "Sort By" },
  "list.resetFilters": { he: "איפוס מסננים", en: "Reset Filters" },
  "list.export": { he: "ייצוא לאקסל", en: "Export to Excel" },
  "list.resultsCount": { he: "{count} לידים תואמים", en: "{count} matching leads" },
  "list.noResults": { he: "אין לידים שתואמים למסננים הנוכחיים.", en: "No leads match the current filter set." },
  "list.contract.perpetual": { he: "מתמשך", en: "Perpetual" },
  "list.contract.auction": { he: "מכרז / חד-פעמי", en: "Auction / One-time" },
  "list.sort.updatedAt": { he: "עודכן לאחרונה", en: "Last Updated" },
  "list.sort.dueDate": { he: "רבעון יעד", en: "Due Quarter" },
  "list.sort.totalAmount": { he: "סכום כולל", en: "Total Amount" },
  "list.sort.forecastAmount": { he: "תחזית", en: "Forecast Amount" },
  "list.sort.chanceToWin": { he: "סיכויי זכייה", en: "Chance to Win" },
  "table.customerProject": { he: "לקוח / פרויקט", en: "Customer / Project" },
  "table.status": { he: "סטטוס", en: "Status" },
  "table.total": { he: "סה\"כ", en: "Total" },
  "table.forecast": { he: "תחזית", en: "Forecast" },
  "table.chance": { he: "סיכוי", en: "Chance" },
  "table.due": { he: "יעד", en: "Due" },
  "table.updated": { he: "עודכן", en: "Updated" },
  "report.subtitle": { he: "השוואת תחזית מול ביצוע בפועל לפי חודש ולפי איש מכירות, ממקור נתונים סטטיסטי נפרד.", en: "Compare projected and actual sales by month and salesperson from a dedicated statistics source." },
  "report.fromDate": { he: "מתאריך", en: "From date" },
  "report.toDate": { he: "עד תאריך", en: "To date" },
  "report.salesperson": { he: "איש מכירות", en: "Salesperson" },
  "report.allSalespeople": { he: "כל אנשי המכירות", en: "All salespeople" },
  "report.run": { he: "הצגת דוח", en: "Run report" },
  "report.export": { he: "ייצוא לאקסל", en: "Export to Excel" },
  "report.loading": { he: "טוען דוח...", en: "Loading report..." },
  "report.metric": { he: "מדד", en: "Metric" },
  "report.projected": { he: "תחזית", en: "Projected" },
  "report.actual": { he: "בפועל", en: "Actual" },
  "report.total": { he: "סה\"כ", en: "Total" },
  "report.noData": { he: "אין נתונים להצגה עבור המסננים שנבחרו.", en: "No data is available for the selected filters." },
  "report.basisNote": { he: "מקור הנתונים לדוח הוא טבלת סטטיסטיקות ייעודית לפי תאריך ואיש מכירות.", en: "This report uses a dedicated statistics table by date and salesperson." },
  "report.lockedToCurrentUser": { he: "הדוח מוגבל לאיש המכירות המחובר.", en: "This report is limited to the signed-in salesperson." },
  "report.summary.projected": { he: "תחזית כוללת", en: "Projected total" },
  "report.summary.actual": { he: "בפועל כולל", en: "Actual total" },
  "report.summary.salespeople": { he: "אנשי מכירות", en: "Salespeople" },
  "report.summary.months": { he: "חודשים", en: "Months" },
  "report.chart.salespeople": { he: "חלוקה לפי אנשי מכירות", en: "Salesperson distribution" },
  "report.chart.months": { he: "מגמה חודשית", en: "Monthly trend" },
  "report.chart.projected": { he: "עמודות תחזית", en: "Projected bars" },
  "report.chart.actual": { he: "קו בפועל", en: "Actual line" },
  "report.sort.asc": { he: "מיון עולה", en: "Sort ascending" },
  "report.sort.desc": { he: "מיון יורד", en: "Sort descending" },
  "validation.reportDatesRequired": { he: "חובה לבחור תאריך התחלה ותאריך סיום לדוח.", en: "From and to dates are required for the report." },
  "validation.reportDateRange": { he: "תאריך ההתחלה חייב להיות מוקדם או שווה לתאריך הסיום.", en: "From date must be earlier than or equal to the to date." },
  "toast.filtered": { he: "הרשימה סוננה לפי {label}.", en: "Filtered list by {label}." },
  "toast.created": { he: "הליד נוצר בהצלחה.", en: "Lead created successfully." },
  "toast.updated": { he: "הליד עודכן בהצלחה.", en: "Lead updated successfully." },
  "validation.customerRequired": { he: "חובה לבחור לקוח.", en: "Customer is required." },
  "validation.projectRequired": { he: "חובה להזין פרויקט.", en: "Project is required." },
  "validation.dueDateRequired": { he: "חובה לבחור רבעון יעד.", en: "Due quarter is required." },
  "validation.amountLineWorkType": { he: "בשורת סכום {index} חובה לבחור סוג עבודה.", en: "Amount line {index} must include a work type." },
  "validation.amountLineAmount": { he: "בשורת סכום {index} חובה להזין סכום חיובי.", en: "Amount line {index} must include a positive amount." },
  "validation.amountLineAmountInvalid": { he: "בשורת סכום {index} יש להזין מספר תקין, למשל 1250000 או 1,250,000.", en: "Amount line {index} must be a valid number, for example 1250000 or 1,250,000." },
  "validation.actualAwardedRequired": { he: "בסטטוס זכייה חובה להזין סכום זכייה בפועל.", en: "Actual awarded amount is required when the offer status is Win." },
  "validation.actualAwardedInvalid": { he: "סכום הזכייה בפועל חייב להיות מספר תקין, למשל 1250000 או 1,250,000.", en: "Actual awarded amount must be a valid number, for example 1250000 or 1,250,000." },
  "validation.summaryTitle": { he: "יש לתקן את השדות הבאים לפני השמירה:", en: "Fix these fields before saving:" },
  "validation.summaryButton": { he: "{count} שגיאות", en: "{count} issues" },
  "form.backToList": { he: "חזרה לרשימה", en: "Back to List" },
  "form.saveLead": { he: "שמירת ליד", en: "Save Lead" },
  "form.saving": { he: "שומר...", en: "Saving..." },
  "form.businessContext": { he: "הקשר עסקי", en: "Business context" },
  "form.customer": { he: "לקוח", en: "Customer" },
  "form.selectCustomer": { he: "בחירת לקוח CRM", en: "Select CRM customer" },
  "form.customerPlaceholder": { he: "התחילו להקליד שם לקוח", en: "Start typing a customer name" },
  "form.project": { he: "פרויקט", en: "Project" },
  "form.projectPlaceholder": { he: "שימוש בפרויקט קיים או יצירת חדש", en: "Reuse or create a project" },
  "form.offerStatus": { he: "סטטוס מכרז", en: "Auction Status" },
  "form.comments": { he: "הערות", en: "Comments" },
  "form.commentsPlaceholder": { he: "תעדו הקשר, חסמים ופעולות המשך.", en: "Capture deal context, blockers, and action items." },
  "form.qualificationAnswers": { he: "תשובות כשירות", en: "Qualification answers" },
  "form.overrideRule": { he: "כלל עוקף", en: "Override rule" },
  "form.weight": { he: "משקל {value}%", en: "{value}% weight" },
  "form.pipelineStageOutcome": { he: "מצב הזדמנות ותזמון", en: "Opportunity status and timing" },
  "form.stage": { he: "סוג ליד", en: "Lead Type" },
  "form.perpetualContract": { he: "חוזה מתמשך?", en: "Perpetual contract?" },
  "form.year": { he: "שנה", en: "Year" },
  "form.quarter": { he: "רבעון", en: "Quarter" },
  "form.dueDate": { he: "רבעון יעד", en: "Due quarter" },
  "form.actualAwardedAmount": { he: "סכום זכייה בפועל", en: "Actual awarded amount" },
  "form.amountLines": { he: "שורות סכומים", en: "Amount lines" },
  "form.amountLinesHelp": { he: "הסכומים נשמרים לפי סוג עבודה. הסכום הכולל מחושב תמיד משורות אלו.", en: "Amounts are captured per work type. Total amount is always calculated from these lines." },
  "form.addLine": { he: "הוספת שורה", en: "Add line" },
  "form.note": { he: "הערה", en: "Note" },
  "form.notePlaceholder": { he: "הערת שורה אופציונלית", en: "Optional line note" },
  "form.auditTrail": { he: "יומן שינויים", en: "Audit trail" },
  "form.liveCalculations": { he: "חישובים חיים", en: "Live calculations" },
  "form.totalAmount": { he: "סכום כולל", en: "Total Amount" },
  "form.qualificationScore": { he: "ציון כשירות", en: "Qualification Score" },
  "form.qualificationContribution": { he: "תרומת כשירות", en: "Qualification Contribution" },
  "form.stageContribution": { he: "תרומת שלב", en: "Stage Contribution" },
  "form.chanceToWin": { he: "סיכוי לזכייה", en: "Chance to Win" },
  "form.forecastAmount": { he: "סכום תחזית", en: "Forecast Amount" },
  "form.highConfidenceForecast": { he: "תחזית בביטחון גבוה", en: "High-Confidence Forecast" },
  "form.wonAmount": { he: "סכום זכייה", en: "Won Amount" },
  "form.forecastInclusion": { he: "הכללה בתחזית", en: "Forecast inclusion" },
  "form.forecastIncomplete": { he: "הליד אינו שלם עד להשלמת השדות הבאים:", en: "Incomplete until these fields are supplied:" },
  "form.forecastComplete": { he: "הליד שלם מספיק כדי להשתתף בווידג'טי התחזית.", en: "This lead is complete enough to participate in forecast widgets." },
  "form.currentOwner": { he: "בעלים נוכחי", en: "Current owner" },
  "stage.Before": { he: "לפני", en: "Before" },
  "stage.AuctionKnown": { he: "מכרז ידוע", en: "Auction is Known" },
  "stage.AuctionActive": { he: "מכרז פעיל", en: "Auction is Active" },
  "stage.Sent": { he: "נשלח", en: "Sent" },
  "offerStatus.Open": { he: "פתוח", en: "Open" },
  "offerStatus.Win": { he: "זכייה", en: "Win" },
  "offerStatus.Lose": { he: "הפסד", en: "Lose" },
  "offerStatus.Suspended": { he: "מושהה", en: "Suspended" },
  "offerStatus.Cancelled": { he: "בוטל", en: "Cancelled" }
});

const state = {
  shellContext: null,
  loadingContext: true,
  loadingData: false,
  saving: false,
  exporting: false,
  reportLoading: false,
  reportExporting: false,
  error: "",
  toast: null,
  validationErrors: [],
  showValidationSummary: false,
  view: "dashboard",
  metadata: null,
  leads: [],
  filters: { ...DEFAULT_FILTERS },
  reportFilters: createDefaultReportFilters(),
  reportData: null,
  reportSort: { key: "", direction: "desc" },
  form: createEmptyForm(),
  selectedLeadId: null,
  formModalOpen: false,
  reportModalOpen: false
};

const focusableSelector = [
  "button:not([disabled])",
  "[href]",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])"
].join(", ");

let pendingFocusRequest = null;
let modalTriggerFocusRequest = null;
let pendingModalViewport = null;
let reportTableScrollElement = null;
let reportSummaryScrollElement = null;
let reportFrozenScrollElement = null;
let syncingReportScroll = false;

const allowedOrigins = new Set([window.location.origin]);
if (document.referrer) {
  try {
    allowedOrigins.add(new URL(document.referrer).origin);
  } catch {
    // Ignore malformed referrer; same-origin allowance still exists.
  }
}

function resolveOrigin(value) {
  try {
    return value ? new URL(value).origin : null;
  } catch {
    return null;
  }
}

function currentLocale() {
  return state.shellContext?.locale === LocaleCodes.English
    ? LocaleCodes.English
    : LocaleCodes.Hebrew;
}

function currentDirection() {
  return state.shellContext?.direction === "ltr" ? "ltr" : "rtl";
}

function isAdminUser() {
  return (state.shellContext?.user?.roles || []).some((role) =>
    String(role).toLowerCase() === "admin"
  );
}

function shouldShowQualificationQuestions(stage = state.form.stage) {
  return stage === "AuctionKnown";
}

function shouldShowOfferStatus(stage = state.form.stage) {
  return stage === "AuctionActive";
}

function shouldShowPerpetualContract(stage = state.form.stage) {
  return stage === "AuctionKnown" || stage === "AuctionActive" || stage === "Sent";
}

function getLeadOfferStatus(lead) {
  return lead?.stage === "AuctionActive" ? lead.offerStatus : null;
}

function getQuarterOptionLabel(year, quarter) {
  return currentLocale() === LocaleCodes.Hebrew
    ? `רבעון ${quarter} ${year}`
    : `Q${quarter} ${year}`;
}

function getQuarterChoiceLabel(quarter) {
  return currentLocale() === LocaleCodes.Hebrew
    ? `רבעון ${quarter}`
    : `Q${quarter}`;
}

function getQuarterStartDate(value) {
  if (!value) {
    return null;
  }

  const text = String(value).trim();
  const quarterMatch = /^(\d{4})-Q([1-4])$/i.exec(text);
  if (quarterMatch) {
    const [, yearText, quarterText] = quarterMatch;
    const month = (Number(quarterText) - 1) * 3 + 1;
    return new Date(Number(yearText), month - 1, 1);
  }

  const normalized = text.slice(0, 10);
  const [yearText, monthText] = normalized.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }

  const quarterStartMonth = Math.floor((month - 1) / 3) * 3 + 1;
  return new Date(year, quarterStartMonth - 1, 1);
}

function normalizeDueQuarterValue(value) {
  const quarterStart = getQuarterStartDate(value);
  if (!quarterStart) {
    return "";
  }

  const year = quarterStart.getFullYear();
  const month = String(quarterStart.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}-01`;
}

function parseDateOnly(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value || "").trim());
  if (!match) {
    return null;
  }

  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function getQuarterKey(value) {
  const quarterStart = getQuarterStartDate(value);
  if (!quarterStart) {
    return "";
  }

  return `${quarterStart.getFullYear()}-Q${Math.floor(quarterStart.getMonth() / 3) + 1}`;
}

function getQuarterLabel(value) {
  const quarterStart = getQuarterStartDate(value);
  if (!quarterStart) {
    return translate("common.noDueDate");
  }

  const quarter = Math.floor(quarterStart.getMonth() / 3) + 1;
  return getQuarterOptionLabel(quarterStart.getFullYear(), quarter);
}

function getQuarterEndDate(value) {
  const quarterStart = getQuarterStartDate(value);
  if (!quarterStart) {
    return null;
  }

  return new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);
}

function getDueQuarterOptions() {
  const today = new Date();
  const startYear = today.getFullYear() - 1;
  const endYear = today.getFullYear() + 10;
  const options = [];

  for (let year = startYear; year <= endYear; year += 1) {
    for (let quarter = 1; quarter <= 4; quarter += 1) {
      const month = (quarter - 1) * 3 + 1;
      const value = `${year}-${String(month).padStart(2, "0")}-01`;
      options.push({
        value,
        label: getQuarterOptionLabel(year, quarter)
      });
    }
  }

  return options;
}

function translate(key, params = {}) {
  const entry = textCatalog[key];
  const locale = currentLocale();
  const template = entry?.[locale] ?? entry?.[LocaleCodes.Hebrew] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, paramKey) => (
    params[paramKey] == null ? match : String(params[paramKey])
  ));
}

function translateStage(value) {
  return translate(`stage.${value}`);
}

function translateOfferStatus(value) {
  return translate(`offerStatus.${value}`);
}

function translateQualificationQuestion(question) {
  const translated = translate(`question.${question.code}`);
  return translated === `question.${question.code}` ? question.label : translated;
}

function translateWorkTypeLabel(code, fallback) {
  if (!code) {
    return fallback || "";
  }

  const key = `WorkType.${code}`;
  const translated = translate(key);
  return translated === key ? (fallback || code) : translated;
}

function translateWorkType(workType) {
  return translateWorkTypeLabel(workType?.code, workType?.name);
}

function findCustomerMatch(value) {
  const normalized = normalize(value);
  if (!normalized) {
    return null;
  }

  return (state.metadata?.customers || []).find((customer) => normalize(customer.name) === normalized) || null;
}

function parseAmountInput(value) {
  const text = String(value ?? "").trim();
  if (!text) {
    return {
      text,
      value: null,
      isEmpty: true,
      isValid: true
    };
  }

  if (!AmountInputPattern.test(text)) {
    return {
      text,
      value: null,
      isEmpty: false,
      isValid: false
    };
  }

  const numericValue = Number(text.replaceAll(",", ""));
  return {
    text,
    value: Number.isFinite(numericValue) ? numericValue : null,
    isEmpty: false,
    isValid: Number.isFinite(numericValue)
  };
}

function isLeadFormOpen() {
  return state.formModalOpen === true;
}

function isReportModalOpen() {
  return state.reportModalOpen === true;
}

function isAnyModalOpen() {
  return isLeadFormOpen() || isReportModalOpen();
}

function getHeaderContent() {
  if (isReportModalOpen()) {
    return {
      header: translate("view.salesMonthlyReport"),
      subHeader: state.view === "list" ? translate("view.list") : translate("view.dashboard")
    };
  }

  if (isLeadFormOpen()) {
    return {
      header: state.selectedLeadId ? translate("view.editLead") : translate("view.newLead"),
      subHeader: state.view === "list" ? translate("view.list") : translate("view.dashboard")
    };
  }

  if (state.view === "list") {
    return {
      header: translate("app.title"),
      subHeader: translate("view.list")
    };
  }

  return {
    header: translate("app.title"),
    subHeader: translate("view.dashboard")
  };
}

function getInternalHeaderContent() {
  return {
    header: translate("app.title"),
    subHeader: state.view === "list"
      ? translate("app.subtitle.list")
      : translate("app.subtitle.dashboard")
  };
}

function getLeadFormHeaderContent() {
  return {
    header: state.selectedLeadId ? translate("view.editLead") : translate("view.newLead"),
    subHeader: state.selectedLeadId
      ? translate("form.header.editLeadSubtitle")
      : translate("form.header.newLeadSubtitle")
  };
}

function postHostCommand(command, payload) {
  if (window.parent === window) {
    return;
  }

  window.parent.postMessage(
    {
      type: MessageTypes.MiniAppCommand,
      version: MessageVersion,
      command,
      payload
    },
    hostOrigin
  );
}

function syncHostHeader() {
  if (!state.shellContext) {
    return;
  }

  const { header, subHeader } = getHeaderContent();
  const signature = JSON.stringify([header, subHeader]);
  if (signature === lastHeaderAnnouncement) {
    return;
  }

  lastHeaderAnnouncement = signature;
  postHostCommand(HostCommandNames.SetPageHeader, {
    header,
    subHeader: subHeader || undefined
  });
}

function applyShellPresentation() {
  const locale = currentLocale();
  const direction = currentDirection();

  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
  document.body.lang = locale;
  document.body.dir = direction;
}

window.addEventListener("message", onShellMessage);
window.addEventListener("keydown", onKeyDown);
app.addEventListener("click", onClick);
app.addEventListener("input", onInput);
app.addEventListener("change", onChange);
app.addEventListener("submit", onSubmit);

render();

setTimeout(() => {
  if (!state.shellContext) {
    state.loadingContext = false;
    render();
  }
}, 500);

function createEmptyForm() {
  const defaultDueYear = getDefaultDueYear();
  return {
    id: "",
    customerId: "",
    customerSearch: "",
    projectName: "",
    comments: "",
    stage: "",
    isPerpetual: "",
    dueYear: defaultDueYear,
    dueQuarter: "",
    dueDate: "",
    offerStatus: "Open",
    actualAwardedAmount: "",
    qualificationAnswers: {},
    amountLines: [createEmptyAmountLine()],
    auditTrail: []
  };
}

function createDefaultReportFilters(ownerSubjectId = "") {
  const today = new Date();
  const year = today.getFullYear();
  return {
    fromDate: formatDateInputValue(new Date(year, 0, 1)),
    toDate: formatDateInputValue(new Date(year, 11, 31)),
    ownerSubjectId
  };
}

function getDefaultDueYear() {
  const today = new Date();
  const year = today.getFullYear();
  return String(today.getMonth() >= 10 ? year + 1 : year);
}

function formatDateInputValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function toQuarterParts(value) {
  const quarterStart = getQuarterStartDate(value);
  if (!quarterStart) {
    return { year: "", quarter: "" };
  }

  return {
    year: String(quarterStart.getFullYear()),
    quarter: String(Math.floor(quarterStart.getMonth() / 3) + 1)
  };
}

function composeDueQuarterValue(year, quarter) {
  const normalizedYear = String(year || "").replace(/\D/g, "").slice(0, 4);
  const normalizedQuarter = String(quarter || "");
  if (normalizedYear.length !== 4 || !/^[1-4]$/.test(normalizedQuarter)) {
    return "";
  }

  const month = (Number(normalizedQuarter) - 1) * 3 + 1;
  return `${normalizedYear}-${String(month).padStart(2, "0")}-01`;
}

function syncFormDueQuarter() {
  state.form.dueDate = composeDueQuarterValue(state.form.dueYear, state.form.dueQuarter);
}

function createEmptyAmountLine() {
  return {
    id: crypto.randomUUID(),
    workTypeId: "",
    amount: "",
    note: ""
  };
}

function escapeSelectorValue(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("\"", "\\\"");
}

function createFocusRequest(selector, options = {}) {
  if (!selector) {
    return null;
  }

  return {
    selector,
    selectionStart: options.selectionStart ?? null,
    selectionEnd: options.selectionEnd ?? null
  };
}

function describeFocusableElement(element) {
  if (!(element instanceof HTMLElement)) {
    return null;
  }

  const selectorParts = [];

  if (element.dataset.testid) {
    selectorParts.push(`[data-testid="${escapeSelectorValue(element.dataset.testid)}"]`);
  } else if (element.dataset.formField) {
    selectorParts.push(`[data-form-field="${escapeSelectorValue(element.dataset.formField)}"]`);
  } else if (element.dataset.filterField) {
    selectorParts.push(`[data-filter-field="${escapeSelectorValue(element.dataset.filterField)}"]`);
  } else if (element.dataset.reportField) {
    selectorParts.push(`[data-report-field="${escapeSelectorValue(element.dataset.reportField)}"]`);
  } else if (element.dataset.lineField) {
    selectorParts.push(`[data-line-field="${escapeSelectorValue(element.dataset.lineField)}"]`);
    selectorParts.push(`[data-index="${escapeSelectorValue(element.dataset.index)}"]`);
  } else if (element.dataset.questionCode) {
    selectorParts.push(`[data-question-code="${escapeSelectorValue(element.dataset.questionCode)}"]`);
    selectorParts.push(`[value="${escapeSelectorValue(element.value)}"]`);
  } else if (element.dataset.toggleField) {
    selectorParts.push(`[data-toggle-field="${escapeSelectorValue(element.dataset.toggleField)}"]`);
    selectorParts.push(`[value="${escapeSelectorValue(element.value)}"]`);
  } else if (element.dataset.action) {
    selectorParts.push(`[data-action="${escapeSelectorValue(element.dataset.action)}"]`);
    if (element.dataset.leadId) {
      selectorParts.push(`[data-lead-id="${escapeSelectorValue(element.dataset.leadId)}"]`);
    }
    if (element.dataset.index) {
      selectorParts.push(`[data-index="${escapeSelectorValue(element.dataset.index)}"]`);
    }
  } else if (element.id) {
    selectorParts.push(`#${escapeSelectorValue(element.id)}`);
  }

  if (!selectorParts.length) {
    return null;
  }

  const request = createFocusRequest(selectorParts.join(""), {
    selectionStart: typeof element.selectionStart === "number" ? element.selectionStart : null,
    selectionEnd: typeof element.selectionEnd === "number" ? element.selectionEnd : null
  });

  return request;
}

function queueFocusRestore(request) {
  pendingFocusRequest = request;
}

function queueActiveElementRestore() {
  queueModalViewportRestore();
  queueFocusRestore(describeFocusableElement(document.activeElement));
}

function queueModalViewportRestore() {
  const modalBody = app.querySelector("[data-modal-body]");
  if (!(modalBody instanceof HTMLElement)) {
    return;
  }

  pendingModalViewport = {
    top: modalBody.scrollTop,
    left: modalBody.scrollLeft
  };
}

function restoreModalViewport() {
  const viewport = pendingModalViewport;
  pendingModalViewport = null;
  if (!viewport) {
    return;
  }

  const modalBody = app.querySelector("[data-modal-body]");
  if (!(modalBody instanceof HTMLElement)) {
    return;
  }

  modalBody.scrollTop = viewport.top;
  modalBody.scrollLeft = viewport.left;
}

function restorePendingFocus() {
  const request = pendingFocusRequest;
  pendingFocusRequest = null;
  if (!request?.selector) {
    return;
  }

  const element = app.querySelector(request.selector);
  if (!(element instanceof HTMLElement)) {
    return;
  }

  element.focus({ preventScroll: true });

  if (
    typeof request.selectionStart === "number"
    && typeof request.selectionEnd === "number"
    && typeof element.setSelectionRange === "function"
  ) {
    try {
      element.setSelectionRange(request.selectionStart, request.selectionEnd);
    } catch {
      // Selection restore is best-effort only.
    }
  }
}

function getModalRoot() {
  return app.querySelector("[data-modal-root]");
}

function getFocusableElements(root) {
  return Array.from(root.querySelectorAll(focusableSelector)).filter((element) =>
    element instanceof HTMLElement
    && !element.hasAttribute("hidden")
    && element.getAttribute("aria-hidden") !== "true"
  );
}

function syncModalPresentation() {
  document.body.style.overflow = isAnyModalOpen() ? "hidden" : "";
}

function finalizeRender({ syncHeader = false } = {}) {
  syncModalPresentation();
  if (syncHeader) {
    syncHostHeader();
  }
  syncReportSummaryFooter();
  restoreModalViewport();
  restorePendingFocus();
}

function syncReportSummaryFooter() {
  const tableScroll = app.querySelector("[data-report-table-scroll]");
  const summaryScroll = app.querySelector("[data-report-summary-scroll]");
  const frozenScroll = app.querySelector("[data-report-frozen-scroll]");

  if (
    !(tableScroll instanceof HTMLElement)
    || !(summaryScroll instanceof HTMLElement)
    || !(frozenScroll instanceof HTMLElement)
  ) {
    if (reportTableScrollElement) {
      reportTableScrollElement.removeEventListener("scroll", onReportTableScroll);
    }
    reportFrozenScrollElement = null;

    reportTableScrollElement = null;
    reportSummaryScrollElement = null;
    return;
  }

  if (reportTableScrollElement !== tableScroll) {
    if (reportTableScrollElement) {
      reportTableScrollElement.removeEventListener("scroll", onReportTableScroll);
    }

    reportTableScrollElement = tableScroll;
    reportTableScrollElement.addEventListener("scroll", onReportTableScroll, { passive: true });
  }

  reportSummaryScrollElement = summaryScroll;
  reportFrozenScrollElement = frozenScroll;
  reportSummaryScrollElement.scrollLeft = reportTableScrollElement.scrollLeft;
  reportFrozenScrollElement.scrollTop = reportTableScrollElement.scrollTop;
}

function onReportTableScroll() {
  if (
    !reportTableScrollElement
    || !reportSummaryScrollElement
    || !reportFrozenScrollElement
    || syncingReportScroll
  ) {
    return;
  }

  syncingReportScroll = true;
  reportSummaryScrollElement.scrollLeft = reportTableScrollElement.scrollLeft;
  reportFrozenScrollElement.scrollTop = reportTableScrollElement.scrollTop;
  syncingReportScroll = false;
}

function openLeadForm({ lead = null, opener = null } = {}) {
  modalTriggerFocusRequest = describeFocusableElement(opener) || describeFocusableElement(document.activeElement);
  state.selectedLeadId = lead?.id || null;
  state.form = lead ? mapLeadToForm(lead) : createEmptyForm();
  state.formModalOpen = true;
  state.toast = null;
  clearValidationState();
  queueFocusRestore(createFocusRequest(
    lead ? "[data-modal-root] [data-testid=\"project-input\"]" : "[data-modal-root] [data-testid=\"customer-input\"]"
  ));
  render();
}

function closeLeadForm({ nextFocusRequest = null } = {}) {
  state.formModalOpen = false;
  state.selectedLeadId = null;
  queueFocusRestore(nextFocusRequest || modalTriggerFocusRequest);
  modalTriggerFocusRequest = null;
}

function openSalesReportModal({ opener = null } = {}) {
  modalTriggerFocusRequest = describeFocusableElement(opener) || describeFocusableElement(document.activeElement);
  state.reportFilters = {
    ...createDefaultReportFilters(state.reportFilters.ownerSubjectId),
    ...state.reportFilters
  };
  if (!isAdminUser()) {
    state.reportFilters.ownerSubjectId = state.shellContext?.user?.subjectId || "";
  }
  state.reportModalOpen = true;
  state.toast = null;
  queueFocusRestore(createFocusRequest("[data-modal-root] [data-testid=\"report-from-date\"]"));
  render();
  void loadSalesMonthlyReport({ preserveToast: true });
}

function closeSalesReportModal({ nextFocusRequest = null } = {}) {
  state.reportModalOpen = false;
  queueFocusRestore(nextFocusRequest || modalTriggerFocusRequest);
  modalTriggerFocusRequest = null;
}

function clearValidationState() {
  state.validationErrors = [];
  state.showValidationSummary = false;
}

function refreshValidationState({ forceShow = false } = {}) {
  const errors = validateForm();
  state.validationErrors = errors;
  state.showValidationSummary = errors.length > 0 && (forceShow || state.showValidationSummary);
  if (!errors.length) {
    state.showValidationSummary = false;
  }

  return errors;
}

async function onShellMessage(event) {
  if (!allowedOrigins.has(event.origin)) {
    return;
  }

  const message = event.data;
  if (!message || message.type !== MessageTypes.ShellContext || message.version !== MessageVersion) {
    return;
  }

  state.shellContext = message;
  state.loadingContext = false;
  state.error = "";
  applyShellPresentation();
  render();

  if (!state.metadata) {
    await loadModule();
  }
}

async function loadModule() {
  state.loadingData = true;
  render();

  try {
    const [metadata, leads] = await Promise.all([
      apiRequest("/api/v1/leads/metadata"),
      apiRequest("/api/v1/leads")
    ]);

    state.metadata = metadata;
    state.leads = leads;
    state.loadingData = false;
    state.toast = null;
    render();
  } catch (error) {
    state.loadingData = false;
    state.error = String(error.message || error);
    render();
  }
}

function createApiHeaders(extraHeaders = {}, { includeJsonContentType = true } = {}) {
  return {
    ...(includeJsonContentType ? { "Content-Type": "application/json" } : {}),
    Authorization: `Bearer ${state.shellContext.accessToken}`,
    ...extraHeaders
  };
}

async function apiRequest(path, options = {}) {
  if (!state.shellContext?.accessToken) {
    throw new Error(translate("error.missingAccessToken"));
  }

  const response = await fetch(`${state.shellContext.configuration.apiBaseUrl}${path}`, {
    ...options,
    headers: createApiHeaders(options.headers || {})
  });

  if (!response.ok) {
    let errorMessage = translate("error.requestFailedStatus", { status: response.status });
    try {
      const payload = await response.json();
      errorMessage = payload.error || payload.title || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text || errorMessage;
    }

    throw new Error(errorMessage);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

async function apiDownload(path) {
  if (!state.shellContext?.accessToken) {
    throw new Error(translate("error.missingAccessToken"));
  }

  const response = await fetch(`${state.shellContext.configuration.apiBaseUrl}${path}`, {
    headers: createApiHeaders({}, { includeJsonContentType: false })
  });

  if (!response.ok) {
    let errorMessage = translate("error.requestFailedStatus", { status: response.status });
    try {
      const payload = await response.json();
      errorMessage = payload.error || payload.title || errorMessage;
    } catch {
      const text = await response.text();
      errorMessage = text || errorMessage;
    }

    throw new Error(errorMessage);
  }

  return {
    blob: await response.blob(),
    fileName: extractFileName(response.headers.get("Content-Disposition"))
  };
}

function extractFileName(contentDisposition) {
  if (!contentDisposition) {
    return "leads-export.xlsx";
  }

  const encodedMatch = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (encodedMatch?.[1]) {
    return decodeURIComponent(encodedMatch[1]);
  }

  const simpleMatch = /filename="?([^\";]+)"?/i.exec(contentDisposition);
  return simpleMatch?.[1] || "leads-export.xlsx";
}

function buildLeadExportPath(filters) {
  const params = new URLSearchParams();
  const exportFilters = filters || DEFAULT_FILTERS;

  const setParam = (key, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  };

  setParam("search", exportFilters.search);
  setParam("ownerSubjectId", exportFilters.ownerSubjectId);
  setParam("customerId", exportFilters.customerId);
  setParam("workTypeId", exportFilters.workTypeId);
  setParam("contractType", exportFilters.contractType);
  setParam("stage", exportFilters.stage);
  setParam("offerStatus", exportFilters.offerStatus);
  setParam("dueDateFrom", exportFilters.dueDateFrom);
  setParam("dueDateTo", exportFilters.dueDateTo);
  setParam("amountMin", exportFilters.amountMin);
  setParam("amountMax", exportFilters.amountMax);
  setParam("sortBy", exportFilters.sortBy || DEFAULT_FILTERS.sortBy);
  setParam("locale", currentLocale());

  const query = params.toString();
  return query ? `/api/v1/leads/export?${query}` : "/api/v1/leads/export";
}

function buildSalesMonthlyReportPath(filters, { exportMode = false } = {}) {
  const params = new URLSearchParams();
  const reportFilters = filters || createDefaultReportFilters();

  const setParam = (key, value) => {
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      params.set(key, String(value));
    }
  };

  setParam("fromDate", reportFilters.fromDate);
  setParam("toDate", reportFilters.toDate);
  setParam("ownerSubjectId", reportFilters.ownerSubjectId);
  setParam("locale", currentLocale());

  const query = params.toString();
  const basePath = exportMode
    ? "/api/v1/statistics-report/export"
    : "/api/v1/statistics-report";

  return query ? `${basePath}?${query}` : basePath;
}

function triggerBrowserDownload(blob, fileName) {
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = fileName;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(downloadUrl), 0);
}

async function exportLeads(filters) {
  state.exporting = true;
  state.toast = null;
  render();

  try {
    const download = await apiDownload(buildLeadExportPath(filters));
    triggerBrowserDownload(download.blob, download.fileName);
    state.exporting = false;
    render();
  } catch (error) {
    state.exporting = false;
    state.toast = {
      type: "error",
      message: String(error.message || error)
    };
    render();
  }
}

function validateSalesMonthlyReportFilters(filters) {
  if (!filters.fromDate || !filters.toDate) {
    return translate("validation.reportDatesRequired");
  }

  if (String(filters.fromDate).localeCompare(String(filters.toDate)) > 0) {
    return translate("validation.reportDateRange");
  }

  return "";
}

async function loadSalesMonthlyReport({ preserveToast = false } = {}) {
  const validationMessage = validateSalesMonthlyReportFilters(state.reportFilters);
  if (validationMessage) {
    state.toast = { type: "error", message: validationMessage };
    render();
    return;
  }

  state.reportLoading = true;
  if (!preserveToast) {
    state.toast = null;
  }
  render();

  try {
    state.reportData = await apiRequest(buildSalesMonthlyReportPath(state.reportFilters));
    state.reportLoading = false;
    render();
  } catch (error) {
    state.reportLoading = false;
    state.toast = {
      type: "error",
      message: String(error.message || error)
    };
    render();
  }
}

async function exportSalesMonthlyReport() {
  const validationMessage = validateSalesMonthlyReportFilters(state.reportFilters);
  if (validationMessage) {
    state.toast = { type: "error", message: validationMessage };
    render();
    return;
  }

  state.reportExporting = true;
  state.toast = null;
  render();

  try {
    const download = await apiDownload(buildSalesMonthlyReportPath(state.reportFilters, { exportMode: true }));
    triggerBrowserDownload(download.blob, download.fileName);
    state.reportExporting = false;
    render();
  } catch (error) {
    state.reportExporting = false;
    state.toast = {
      type: "error",
      message: String(error.message || error)
    };
    render();
  }
}

function onClick(event) {
  const target = event.target.closest("[data-action], [data-view]");
  if (!target) {
    return;
  }

  if (target.dataset.view) {
    state.view = target.dataset.view;
    render();
    return;
  }

  const { action } = target.dataset;

  if (action === "new-lead") {
    openLeadForm({ opener: target });
    return;
  }

  if (action === "edit-lead") {
    const lead = state.leads.find((item) => item.id === target.dataset.leadId);
    if (!lead) {
      return;
    }

    openLeadForm({ lead, opener: target });
    return;
  }

  if (action === "cancel-form") {
    clearValidationState();
    closeLeadForm();
    state.toast = null;
    render();
    return;
  }

  if (action === "add-line") {
    const nextIndex = state.form.amountLines.length;
    const triggeredFromKeyboard = event.detail === 0;
    queueModalViewportRestore();
    state.form.amountLines = [...state.form.amountLines, createEmptyAmountLine()];
    queueFocusRestore(
      triggeredFromKeyboard
        ? createFocusRequest(`[data-testid="amount-line-worktype-${nextIndex}"]`)
        : describeFocusableElement(target)
    );
    if (state.validationErrors.length || state.showValidationSummary) {
      refreshValidationState();
    }
    render();
    return;
  }

  if (action === "remove-line") {
    queueModalViewportRestore();
    const index = Number(target.dataset.index);
    state.form.amountLines = state.form.amountLines.filter((_, itemIndex) => itemIndex !== index);
    if (state.form.amountLines.length === 0) {
      state.form.amountLines = [createEmptyAmountLine()];
    }
    if (state.validationErrors.length || state.showValidationSummary) {
      refreshValidationState();
    }
    render();
    return;
  }

  if (action === "toggle-validation-summary") {
    queueActiveElementRestore();
    state.showValidationSummary = !state.showValidationSummary;
    render();
    return;
  }

  if (action === "focus-validation") {
    const element = app.querySelector(target.dataset.selector || "");
    if (element instanceof HTMLElement) {
      element.scrollIntoView({ block: "center", behavior: "smooth" });
      element.focus({ preventScroll: true });
    }
    return;
  }

  if (action === "clear-toast") {
    state.toast = null;
    render();
    return;
  }

  if (action === "reset-filters") {
    state.filters = { ...DEFAULT_FILTERS };
    render();
    return;
  }

  if (action === "export-leads") {
    void exportLeads(state.filters);
    return;
  }

  if (action === "export-report") {
    openSalesReportModal({ opener: target });
    return;
  }

  if (action === "open-sales-report") {
    openSalesReportModal({ opener: target });
    return;
  }

  if (action === "close-sales-report") {
    closeSalesReportModal();
    render();
    return;
  }

  if (action === "refresh-sales-report") {
    void loadSalesMonthlyReport();
    return;
  }

  if (action === "export-sales-report") {
    void exportSalesMonthlyReport();
    return;
  }

  if (action === "sort-statistics-report") {
    const sortKey = target.dataset.sortKey || "";
    if (!sortKey) {
      return;
    }

    state.reportSort = state.reportSort.key === sortKey
      ? {
          key: sortKey,
          direction: state.reportSort.direction === "desc" ? "asc" : "desc"
        }
      : {
          key: sortKey,
          direction: "desc"
        };
    render();
    return;
  }

  if (action === "apply-dashboard-filter") {
    const { filterKey, filterValue, filterLabel } = target.dataset;
    state.filters = { ...DEFAULT_FILTERS, [filterKey]: filterValue || "" };
    state.view = "list";
    state.toast = filterLabel
      ? { type: "success", message: translate("toast.filtered", { label: filterLabel }) }
      : null;
    render();
    return;
  }
}

function onInput(event) {
  const reportField = event.target.dataset.reportField;
  if (reportField) {
    state.reportFilters[reportField] = event.target.value;
    return;
  }

  const field = event.target.dataset.formField;
  if (field) {
    if (field === "customerSearch") {
      const previousCustomerId = state.form.customerId;
      const match = findCustomerMatch(event.target.value);
      state.form.customerSearch = event.target.value;
      state.form.customerId = match?.id || "";
      if (previousCustomerId !== state.form.customerId) {
        state.form.projectName = "";
      }
      const shouldRender = previousCustomerId !== state.form.customerId || state.validationErrors.length || state.showValidationSummary;
      if (state.validationErrors.length || state.showValidationSummary) {
        refreshValidationState();
      }
      if (shouldRender) {
        queueActiveElementRestore();
        render();
      }
      return;
    }

    queueActiveElementRestore();
    state.form[field] = event.target.value;
    if (field === "dueYear") {
      state.form.dueYear = String(state.form.dueYear || "").replace(/\D/g, "").slice(0, 4);
      syncFormDueQuarter();
    }
    if (field === "customerId") {
      state.form.projectName = "";
    }
    if (state.validationErrors.length || state.showValidationSummary) {
      refreshValidationState();
    }
    render();
    return;
  }

  const filterField = event.target.dataset.filterField;
  if (filterField) {
    queueActiveElementRestore();
    state.filters[filterField] = event.target.value;
    render();
    return;
  }

  const lineField = event.target.dataset.lineField;
  if (lineField) {
    queueActiveElementRestore();
    const index = Number(event.target.dataset.index);
    state.form.amountLines = state.form.amountLines.map((line, lineIndex) =>
      lineIndex === index
        ? {
            ...line,
            [lineField]: event.target.value
          }
        : line
    );
    if (state.validationErrors.length || state.showValidationSummary) {
      refreshValidationState();
    }
    render();
  }
}

function onChange(event) {
  const reportField = event.target.dataset.reportField;
  if (reportField) {
    queueActiveElementRestore();
    state.reportFilters[reportField] = event.target.value;
    render();
    return;
  }

  const questionCode = event.target.dataset.questionCode;
  if (questionCode) {
    queueActiveElementRestore();
    state.form.qualificationAnswers = {
      ...state.form.qualificationAnswers,
      [questionCode]: event.target.value === "true"
    };
    if (state.validationErrors.length || state.showValidationSummary) {
      refreshValidationState();
    }
    render();
    return;
  }

  const toggleField = event.target.dataset.toggleField;
  if (toggleField) {
    queueActiveElementRestore();
    state.form[toggleField] = event.target.value;
    if (toggleField === "dueQuarter") {
      syncFormDueQuarter();
    }
    if (state.validationErrors.length || state.showValidationSummary) {
      refreshValidationState();
    }
    render();
  }
}

function onSubmit(event) {
  if (event.target.closest("[data-report-filters-form]")) {
    event.preventDefault();
    void loadSalesMonthlyReport();
    return;
  }

  if (!event.target.closest("[data-lead-form]")) {
    return;
  }

  event.preventDefault();
  void saveLead();
}

function onKeyDown(event) {
  if (!isAnyModalOpen()) {
    return;
  }

  if (event.key === "Escape" && !state.saving && !state.reportLoading && !state.reportExporting) {
    event.preventDefault();
    if (isLeadFormOpen()) {
      clearValidationState();
      state.toast = null;
      closeLeadForm();
    } else if (isReportModalOpen()) {
      closeSalesReportModal();
    }
    render();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && isLeadFormOpen() && !state.saving) {
    event.preventDefault();
    void saveLead();
    return;
  }

  if ((event.metaKey || event.ctrlKey) && event.key === "Enter" && isReportModalOpen() && !state.reportLoading) {
    event.preventDefault();
    void loadSalesMonthlyReport();
    return;
  }

  if (event.key !== "Tab") {
    return;
  }

  const modalRoot = getModalRoot();
  if (!(modalRoot instanceof HTMLElement)) {
    return;
  }

  const focusableElements = getFocusableElements(modalRoot);
  if (!focusableElements.length) {
    return;
  }

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];
  const activeElement = document.activeElement;

  if (event.shiftKey) {
    if (activeElement === firstElement || !modalRoot.contains(activeElement)) {
      event.preventDefault();
      lastElement.focus();
    }
    return;
  }

  if (activeElement === lastElement) {
    event.preventDefault();
    firstElement.focus();
  }
}

async function saveLead() {
  const errors = refreshValidationState({ forceShow: true });
  if (errors.length > 0) {
    state.toast = null;
    queueFocusRestore(createFocusRequest("[data-testid=\"validation-toggle\"]"));
    render();
    return;
  }

  state.saving = true;
  state.toast = null;
  clearValidationState();
  render();

  try {
    const wasEditing = Boolean(state.selectedLeadId);
    const payload = buildLeadPayload();
    const path = state.selectedLeadId
      ? `/api/v1/leads/${state.selectedLeadId}`
      : "/api/v1/leads";
    const method = state.selectedLeadId ? "PUT" : "POST";

    const savedLead = await apiRequest(path, {
      method,
      body: JSON.stringify(payload)
    });

    const [metadata, leads] = await Promise.all([
      apiRequest("/api/v1/leads/metadata"),
      apiRequest("/api/v1/leads")
    ]);

    state.metadata = metadata;
    state.leads = leads;
    state.saving = false;
    clearValidationState();
    closeLeadForm({
      nextFocusRequest: state.view === "list"
        ? createFocusRequest(`[data-action="edit-lead"][data-lead-id="${escapeSelectorValue(savedLead.id)}"]`)
        : modalTriggerFocusRequest
    });
    state.toast = {
      type: "success",
      message: wasEditing ? translate("toast.updated") : translate("toast.created")
    };
    render();
  } catch (error) {
    state.saving = false;
    state.toast = {
      type: "error",
      message: String(error.message || error)
    };
    render();
  }
}

function validateForm() {
  const errors = [];
  if (!state.form.customerId) {
    errors.push({
      id: "validation-customer",
      fieldKey: "customerId",
      selector: "#customer-search",
      message: translate("validation.customerRequired")
    });
  }

  if (!state.form.projectName.trim()) {
    errors.push({
      id: "validation-project",
      fieldKey: "projectName",
      selector: "#project",
      message: translate("validation.projectRequired")
    });
  }

  if (!state.form.dueDate) {
    errors.push({
      id: "validation-due-date",
      fieldKey: "dueDate",
      selector: "#due-date-year",
      message: translate("validation.dueDateRequired")
    });
  }

  const meaningfulLines = getMeaningfulAmountLines();
  meaningfulLines.forEach((line, index) => {
    if (!line.workTypeId) {
      errors.push({
        id: `validation-amount-line-worktype-${index}`,
        fieldKey: `amountLines.${index}.workTypeId`,
        selector: `[data-testid="amount-line-worktype-${index}"]`,
        message: translate("validation.amountLineWorkType", { index: index + 1 })
      });
    }

    const amount = parseAmountInput(line.amount);
    if (!amount.isEmpty && !amount.isValid) {
      errors.push({
        id: `validation-amount-line-amount-${index}`,
        fieldKey: `amountLines.${index}.amount`,
        selector: `[data-testid="amount-line-amount-${index}"]`,
        message: translate("validation.amountLineAmountInvalid", { index: index + 1 })
      });
    } else if (amount.isEmpty || !amount.value || amount.value <= 0) {
      errors.push({
        id: `validation-amount-line-amount-${index}`,
        fieldKey: `amountLines.${index}.amount`,
        selector: `[data-testid="amount-line-amount-${index}"]`,
        message: translate("validation.amountLineAmount", { index: index + 1 })
      });
    }
  });

  const statusVisible = shouldShowOfferStatus();
  const effectiveOfferStatus = statusVisible ? state.form.offerStatus : "Open";
  const actualAwardedAmount = parseAmountInput(state.form.actualAwardedAmount);
  if (effectiveOfferStatus === "Win" && actualAwardedAmount.isEmpty) {
    errors.push({
      id: "validation-actual-awarded-required",
      fieldKey: "actualAwardedAmount",
      selector: "#actual-awarded",
      message: translate("validation.actualAwardedRequired")
    });
  } else if (
    (!actualAwardedAmount.isEmpty && !actualAwardedAmount.isValid)
    || (effectiveOfferStatus === "Win" && (!actualAwardedAmount.value || actualAwardedAmount.value <= 0))
  ) {
    errors.push({
      id: "validation-actual-awarded-invalid",
      fieldKey: "actualAwardedAmount",
      selector: "#actual-awarded",
      message: translate("validation.actualAwardedInvalid")
    });
  }

  return errors;
}

function getMeaningfulAmountLines() {
  return state.form.amountLines.filter((line) =>
    line.workTypeId || line.amount || line.note.trim()
  );
}

function buildLeadPayload() {
  const projectMatch = getProjectMatch(state.form.customerId, state.form.projectName);
  const qualificationAnswers = shouldShowQualificationQuestions()
    ? (state.metadata?.qualificationQuestions || []).map((question) => ({
        questionCode: question.code,
        answer: Object.prototype.hasOwnProperty.call(state.form.qualificationAnswers, question.code)
          ? state.form.qualificationAnswers[question.code]
          : null
      }))
    : (state.metadata?.qualificationQuestions || []).map((question) => ({
        questionCode: question.code,
        answer: null
      }));
  const offerStatus = shouldShowOfferStatus() ? state.form.offerStatus : "Open";

  return {
    customerId: state.form.customerId,
    projectId: projectMatch ? projectMatch.id : null,
    projectName: state.form.projectName.trim(),
    comments: state.form.comments.trim(),
    qualificationAnswers,
    stage: state.form.stage || null,
    isPerpetual: shouldShowPerpetualContract()
      ? (state.form.isPerpetual === "" ? null : state.form.isPerpetual === "true")
      : null,
    dueDate: state.form.dueDate || null,
    offerStatus,
    actualAwardedAmount: offerStatus === "Win" ? parseAmountInput(state.form.actualAwardedAmount).value : null,
    amountLines: getMeaningfulAmountLines().map((line) => ({
      id: line.id || null,
      workTypeId: line.workTypeId,
      amount: parseAmountInput(line.amount).value,
      note: line.note.trim()
    }))
  };
}

function mapLeadToForm(lead) {
  const qualificationAnswers = {};
  (lead.qualificationAnswers || []).forEach((answer) => {
    if (answer.answer !== null) {
      qualificationAnswers[answer.questionCode] = answer.answer;
    }
  });

  return {
    id: lead.id,
    customerId: lead.customer.id,
    customerSearch: lead.customer.name,
    projectName: lead.project.name,
    comments: lead.comments || "",
    stage: lead.stage || "",
    isPerpetual:
      lead.isPerpetual === null || lead.isPerpetual === undefined
        ? ""
        : String(lead.isPerpetual),
    dueYear: toQuarterParts(lead.dueDate).year,
    dueQuarter: toQuarterParts(lead.dueDate).quarter,
    dueDate: normalizeDueQuarterValue(lead.dueDate),
    offerStatus: lead.offerStatus || "Open",
    actualAwardedAmount:
      lead.actualAwardedAmount === null || lead.actualAwardedAmount === undefined
        ? ""
        : String(lead.actualAwardedAmount),
    qualificationAnswers,
    amountLines: ((lead.amountLines || []).length ? lead.amountLines : [createEmptyAmountLine()]).map((line) => ({
      id: line.id,
      workTypeId: line.workTypeId,
      amount: String(line.amount),
      note: line.note || ""
    })),
    auditTrail: lead.auditTrail || []
  };
}

function getProjectMatch(customerId, projectName) {
  const normalized = normalize(projectName);
  return (state.metadata?.projects || []).find((project) =>
    project.customerId === customerId && normalize(project.name) === normalized
  );
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function getFilteredLeads() {
  const search = normalize(state.filters.search);

  const leads = (state.leads || []).filter((lead) => {
    if (
      search &&
      !normalize(`${lead.customer.name} ${lead.project.name} ${lead.comments}`).includes(search)
    ) {
      return false;
    }

    if (state.filters.ownerSubjectId && lead.owner.subjectId !== state.filters.ownerSubjectId) {
      return false;
    }

    if (state.filters.customerId && lead.customer.id !== state.filters.customerId) {
      return false;
    }

    if (state.filters.workTypeId && !lead.amountLines.some((line) => line.workTypeId === state.filters.workTypeId)) {
      return false;
    }

    if (state.filters.contractType === "perpetual" && lead.isPerpetual !== true) {
      return false;
    }

    if (state.filters.contractType === "auction" && lead.isPerpetual !== false) {
      return false;
    }

    if (state.filters.stage && lead.stage !== state.filters.stage) {
      return false;
    }

    if (state.filters.offerStatus && getLeadOfferStatus(lead) !== state.filters.offerStatus) {
      return false;
    }

    if (state.filters.dueDateFrom && (!lead.dueDate || lead.dueDate < state.filters.dueDateFrom)) {
      return false;
    }

    if (state.filters.dueDateTo && (!lead.dueDate || lead.dueDate > state.filters.dueDateTo)) {
      return false;
    }

    if (state.filters.amountMin && lead.metrics.totalAmount < Number(state.filters.amountMin)) {
      return false;
    }

    if (state.filters.amountMax && lead.metrics.totalAmount > Number(state.filters.amountMax)) {
      return false;
    }

    return true;
  });

  return leads.sort((left, right) => compareLeads(left, right, state.filters.sortBy));
}

function compareLeads(left, right, sortBy) {
  if (sortBy === "dueDate") {
    return String(left.dueDate || "9999-12-31").localeCompare(String(right.dueDate || "9999-12-31"));
  }

  if (sortBy === "totalAmount") {
    return right.metrics.totalAmount - left.metrics.totalAmount;
  }

  if (sortBy === "forecastAmount") {
    return right.metrics.forecastAmount - left.metrics.forecastAmount;
  }

  if (sortBy === "chanceToWin") {
    return right.metrics.chanceToWin - left.metrics.chanceToWin;
  }

  return String(right.updatedAtUtc).localeCompare(String(left.updatedAtUtc));
}

function getOwners() {
  const map = new Map();
  (state.leads || []).forEach((lead) => {
    map.set(lead.owner.subjectId, lead.owner);
  });
  return Array.from(map.values()).sort((left, right) => left.displayName.localeCompare(right.displayName));
}

function getStageColor(stage) {
  return DashboardStageColors[stage] || DashboardStageColors.Unstaged;
}

function getStatusColor(status) {
  return DashboardStatusColors[status] || "#8597a6";
}

function getWorkTypeColor(code, index = 0) {
  return DashboardWorkTypeColors[code] || DashboardFallbackPalette[index % DashboardFallbackPalette.length];
}

function getDueInDays(dateValue) {
  const dueDate = getQuarterEndDate(dateValue);
  if (!dueDate) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((dueDate - today) / 86400000);
}

function toMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function buildForecastTimeline(leads) {
  const monthlyMap = new Map();
  leads.forEach((lead) => {
    if (!lead.dueDate) {
      return;
    }

    const key = getQuarterKey(lead.dueDate);
    if (key) {
      monthlyMap.set(key, (monthlyMap.get(key) || 0) + lead.metrics.forecastAmount);
    }
  });

  const start = new Date();
  start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);

  const timeline = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + (index * 3), 1);
    const key = `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`;
    return {
      id: key,
      label: key,
      value: monthlyMap.get(key) || 0
    };
  });

  if (timeline.some((item) => item.value > 0) || monthlyMap.size === 0) {
    return timeline;
  }

  return Array.from(monthlyMap.entries())
    .sort((left, right) => String(left[0]).localeCompare(String(right[0])))
    .slice(0, 6)
    .map(([key, value]) => ({
      id: key,
      label: key,
      value
    }));
}

function groupByMetrics(items, labelSelector, valueSelector, idSelector = null) {
  const map = new Map();
  items.forEach((item) => {
    const label = labelSelector(item);
    const key = idSelector ? idSelector(item) : label;
    const existing = map.get(key) || { id: key, label, value: 0, count: 0 };
    existing.value += valueSelector(item);
    existing.count += 1;
    map.set(key, existing);
  });

  return Array.from(map.values()).sort((left, right) => {
    if (right.value !== left.value) {
      return right.value - left.value;
    }

    return right.count - left.count;
  });
}

function getDashboardModel() {
  const allLeads = state.leads || [];
  const activeLeads = allLeads.filter((lead) => {
    const offerStatus = getLeadOfferStatus(lead);
    return offerStatus === null || offerStatus === "Open" || offerStatus === "Suspended";
  });
  const forecastEligible = activeLeads.filter((lead) => !lead.isIncomplete);
  const wins = allLeads.filter((lead) => getLeadOfferStatus(lead) === "Win");
  const closedLeads = allLeads.filter((lead) => {
    const offerStatus = getLeadOfferStatus(lead);
    return offerStatus === "Win" || offerStatus === "Lose" || offerStatus === "Cancelled";
  });

  const pipelineByOwner = groupByMetrics(
    activeLeads,
    (lead) => lead.owner.displayName,
    (lead) => lead.metrics.totalAmount,
    (lead) => lead.owner.subjectId
  );
  const pipelineByCustomer = groupByMetrics(
    activeLeads,
    (lead) => lead.customer.name,
    (lead) => lead.metrics.totalAmount,
    (lead) => lead.customer.id
  );

  const workTypeTotals = new Map();
  activeLeads.forEach((lead) => {
    (lead.amountTotalsByWorkType || []).forEach((total) => {
      const existing = workTypeTotals.get(total.workTypeId) || {
        id: total.workTypeId,
        code: total.workTypeCode,
        label: translateWorkTypeLabel(total.workTypeCode, total.workTypeName),
        value: 0,
        count: 0
      };
      existing.value += total.amount;
      existing.count += 1;
      workTypeTotals.set(total.workTypeId, existing);
    });
  });

  const riskLeads = allLeads.filter((lead) => {
    if (lead.isIncomplete || getLeadOfferStatus(lead) === "Suspended") {
      return true;
    }

    const diffDays = getDueInDays(lead.dueDate);
    return diffDays != null && diffDays <= 7;
  });

  const cards = {
    openCount: activeLeads.length,
    pipelineAmount: sum(activeLeads, (lead) => lead.metrics.totalAmount),
    weightedForecast: sum(forecastEligible, (lead) => lead.metrics.forecastAmount),
    perpetualValue: sum(
      forecastEligible.filter((lead) => lead.isPerpetual === true),
      (lead) => lead.metrics.forecastAmount
    ),
    highConfidence: sum(forecastEligible, (lead) => lead.metrics.highConfidenceForecastAmount),
    wins: sum(wins, (lead) => lead.metrics.wonAmount),
    atRiskAmount: sum(riskLeads, (lead) => lead.metrics.totalAmount)
  };

  const totalActiveAmount = Math.max(cards.pipelineAmount, 0);
  const dueSoonCount = activeLeads.filter((lead) => {
    const diffDays = getDueInDays(lead.dueDate);
    return diffDays != null && diffDays >= 0 && diffDays <= 30;
  }).length;
  const overdueCount = activeLeads.filter((lead) => {
    const diffDays = getDueInDays(lead.dueDate);
    return diffDays != null && diffDays < 0;
  }).length;
  const averageChance = forecastEligible.length
    ? sum(forecastEligible, (lead) => lead.metrics.chanceToWin) / forecastEligible.length
    : 0;
  const winRate = closedLeads.length
    ? (wins.length / closedLeads.length) * 100
    : 0;
  const forecastCoverage = totalActiveAmount
    ? (cards.weightedForecast / totalActiveAmount) * 100
    : 0;
  const highConfidenceShare = cards.weightedForecast
    ? (cards.highConfidence / cards.weightedForecast) * 100
    : 0;
  const perpetualShare = cards.weightedForecast
    ? (cards.perpetualValue / cards.weightedForecast) * 100
    : 0;
  const riskShare = totalActiveAmount
    ? (cards.atRiskAmount / totalActiveAmount) * 100
    : 0;

  const totalActiveCount = activeLeads.length;
  const stagePerformance = [...StageValues, "Unstaged"].map((stage) => {
    const matchingLeads = activeLeads.filter((lead) => (lead.stage || "Unstaged") === stage);
    const amount = sum(matchingLeads, (lead) => lead.metrics.totalAmount);
    const count = matchingLeads.length;
    return {
      id: stage,
      label: stage === "Unstaged" ? translate("common.incomplete") : translateStage(stage),
      value: amount,
      count,
      color: getStageColor(stage),
      shareAmount: totalActiveAmount ? (amount / totalActiveAmount) * 100 : 0,
      shareCount: totalActiveCount ? (count / totalActiveCount) * 100 : 0,
      filterValue: stage === "Unstaged" ? "" : stage
    };
  });

  const statusMix = OfferStatusValues.map((status) => {
    const matchingLeads = allLeads.filter((lead) => getLeadOfferStatus(lead) === status);
    return {
      id: status,
      label: translateOfferStatus(status),
      value: sum(matchingLeads, (lead) => lead.metrics.totalAmount),
      count: matchingLeads.length,
      color: getStatusColor(status),
      filterValue: status
    };
  }).filter((item) => item.count > 0);

  const workTypeBreakdown = Array.from(workTypeTotals.values())
    .sort((left, right) => right.value - left.value)
    .map((item, index) => ({
      ...item,
      color: getWorkTypeColor(item.code, index),
      filterValue: item.id
    }));

  const spotlightLead = [...activeLeads]
    .sort((left, right) => right.metrics.forecastAmount - left.metrics.forecastAmount)[0] || null;
  const spotlightCustomer = pipelineByCustomer[0] || null;
  const spotlightOwner = pipelineByOwner[0] || null;

  const customerCount = new Set(activeLeads.map((lead) => lead.customer.id)).size;

  return {
    cards,
    summary: {
      activeLeadCount: activeLeads.length,
      customerCount,
      dueSoonCount,
      overdueCount,
      averageChance,
      winRate,
      forecastCoverage,
      highConfidenceShare,
      perpetualShare,
      riskShare
    },
    pipelineByOwner: pipelineByOwner.slice(0, 5),
    pipelineByCustomer: pipelineByCustomer.slice(0, 5),
    workTypeBreakdown,
    stagePerformance,
    statusMix,
    monthlyForecast: buildForecastTimeline(forecastEligible),
    riskLeads: riskLeads.sort((left, right) => compareLeads(left, right, "dueDate")).slice(0, 8),
    spotlightLead,
    spotlightCustomer,
    spotlightOwner
  };
}

function groupBy(items, labelSelector, valueSelector, idSelector = null) {
  const map = new Map();
  items.forEach((item) => {
    const label = labelSelector(item);
    const key = idSelector ? idSelector(item) : label;
    const existing = map.get(key) || { id: key, label, value: 0 };
    existing.value += valueSelector(item);
    map.set(key, existing);
  });
  return Array.from(map.values()).sort((left, right) => right.value - left.value);
}

function sum(items, selector) {
  return items.reduce((total, item) => total + selector(item), 0);
}

function computeDraftMetrics() {
  const stageCoefficientMap = new Map(
    (state.metadata?.stageCoefficients || []).map((item) => [item.stage, Number(item.value)])
  );
  const questionMap = new Map(
    (shouldShowQualificationQuestions() ? (state.metadata?.qualificationQuestions || []) : []).map((item) => [item.code, item])
  );
  const workTypesById = new Map((state.metadata?.workTypes || []).map((item) => [item.id, item]));

  const lines = getMeaningfulAmountLines()
    .map((line) => ({
      ...line,
      parsedAmount: parseAmountInput(line.amount)
    }))
    .filter((line) => line.workTypeId && line.parsedAmount.isValid && line.parsedAmount.value > 0)
    .map((line) => ({
      workType: workTypesById.get(line.workTypeId),
      amount: line.parsedAmount.value
    }))
    .filter((line) => line.workType);

  const totalAmount = lines.reduce((total, line) => total + line.amount, 0);
  const priceListAnswer = shouldShowQualificationQuestions()
    && state.form.qualificationAnswers["customer-under-price-list"] === true;
  const qualificationScore = priceListAnswer
    ? 100
    : Array.from(questionMap.values()).reduce((total, question) => {
        if (question.isOverrideRule) {
          return total;
        }

        return total + (state.form.qualificationAnswers[question.code] === true ? Number(question.weight) : 0);
      }, 0);
  const qualificationContribution = qualificationScore * 0.3;
  const stageContribution = stageCoefficientMap.get(state.form.stage) || 0;
  const chanceToWin = Math.min(100, qualificationContribution + stageContribution);
  const perpetual = shouldShowPerpetualContract() && state.form.isPerpetual === "true";
  const forecastAmount = perpetual ? totalAmount : totalAmount * (chanceToWin / 100);
  const highConfidence = perpetual || chanceToWin >= 50 ? forecastAmount : 0;
  const effectiveOfferStatus = shouldShowOfferStatus() ? state.form.offerStatus : "Open";
  const actualAwardedAmount = parseAmountInput(state.form.actualAwardedAmount);
  const wonAmount =
    effectiveOfferStatus === "Win" && actualAwardedAmount.isValid && actualAwardedAmount.value
      ? actualAwardedAmount.value
      : 0;

  const missingFields = [];
  if (!state.form.stage) {
    missingFields.push(translate("form.stage"));
  }
  if (!state.form.dueDate) {
    missingFields.push(translate("form.dueDate"));
  }
  if (shouldShowPerpetualContract() && state.form.isPerpetual === "") {
    missingFields.push(translate("form.perpetualContract"));
  }
  if (lines.length === 0) {
    missingFields.push(translate("form.amountLines"));
  }
  if (effectiveOfferStatus === "Win" && (!actualAwardedAmount.isValid || actualAwardedAmount.isEmpty || !actualAwardedAmount.value)) {
    missingFields.push(translate("form.actualAwardedAmount"));
  }

  return {
    totalAmount,
    qualificationScore,
    qualificationContribution,
    stageContribution,
    chanceToWin,
    forecastAmount,
    highConfidence,
    wonAmount,
    missingFields
  };
}

function render() {
  if (state.loadingContext) {
    app.innerHTML = `
      <section class="waiting-shell">
        <article class="waiting-card">
          <div class="eyebrow">${escapeHtml(translate("state.waitingEyebrow"))}</div>
          <h1>${escapeHtml(translate("state.waitingTitle"))}</h1>
          <p>${escapeHtml(translate("state.waitingDescription"))}</p>
        </article>
      </section>
    `;
    finalizeRender();
    return;
  }

  if (!state.shellContext) {
    app.innerHTML = `
      <section class="error-shell">
        <article class="error-card">
          <div class="eyebrow">${escapeHtml(translate("state.handshakeEyebrow"))}</div>
          <h1>${escapeHtml(translate("state.handshakeTitle"))}</h1>
          <p>${escapeHtml(translate("state.handshakeDescription"))}</p>
        </article>
      </section>
    `;
    finalizeRender();
    return;
  }

  if (state.error) {
    app.innerHTML = `
      <section class="error-shell">
        <article class="error-card">
          <div class="eyebrow">${escapeHtml(translate("state.loadFailedEyebrow"))}</div>
          <h1>${escapeHtml(translate("state.loadFailedTitle"))}</h1>
          <p>${escapeHtml(state.error)}</p>
        </article>
      </section>
    `;
    finalizeRender({ syncHeader: true });
    return;
  }

  if (!state.metadata || state.loadingData) {
    app.innerHTML = `
      <section class="waiting-shell">
        <article class="waiting-card">
          <div class="eyebrow">${escapeHtml(translate("state.connectedAs", { name: state.shellContext.user.displayName }))}</div>
          <h1>${escapeHtml(translate("state.loadingTitle"))}</h1>
          <p>${escapeHtml(translate("state.loadingDescription"))}</p>
        </article>
      </section>
    `;
    finalizeRender({ syncHeader: true });
    return;
  }

  const dashboard = getDashboardModel();
  const filteredLeads = getFilteredLeads();
  const draftMetrics = computeDraftMetrics();
  const shellContentAttributes = isAnyModalOpen() ? " aria-hidden=\"true\" inert" : "";

  app.innerHTML = `
    <div class="shell" dir="${currentDirection()}">
      <div class="shell-content"${shellContentAttributes}>
        ${renderInternalHeader()}
        ${renderNav()}
        ${state.toast ? renderToast() : ""}
        ${state.view === "dashboard" ? renderDashboard(dashboard) : renderLeadList(filteredLeads)}
      </div>
      ${isLeadFormOpen() ? renderLeadForm(draftMetrics) : ""}
      ${isReportModalOpen() ? renderSalesMonthlyReportModal() : ""}
    </div>
  `;
  finalizeRender({ syncHeader: true });
}

function renderInternalHeader() {
  const { header, subHeader } = getInternalHeaderContent();

  return `
    <header class="app-header" data-testid="app-header">
      <h1 class="app-header-title">${escapeHtml(header)}</h1>
      <p class="app-header-subtitle">${escapeHtml(subHeader)}</p>
    </header>
  `;
}

function renderNav() {
  return `
    <nav class="nav" data-testid="view-nav">
      <button type="button" data-view="dashboard" class="${state.view === "dashboard" ? "active" : ""}">${escapeHtml(translate("nav.dashboard"))}</button>
      <button type="button" data-view="list" class="${state.view === "list" ? "active" : ""}">${escapeHtml(translate("nav.list"))}</button>
    </nav>
  `;
}

function renderToast() {
  return `
    <section class="toast ${escapeHtml(state.toast.type)}">
      <div class="meta-row">
        <strong>${escapeHtml(state.toast.message)}</strong>
        <button type="button" class="ghost-button" data-action="clear-toast">${escapeHtml(translate("common.dismiss"))}</button>
      </div>
    </section>
  `;
}

function renderDashboard(model) {
  const showAdminAnalytics = isAdminUser();
  const totalStatuses = model.statusMix.reduce((total, item) => total + item.count, 0);
  const totalWorkTypes = model.workTypeBreakdown.reduce((total, item) => total + item.value, 0);
  const metricCards = [
    {
      label: translate("dashboard.pipelineAmount"),
      value: formatCompactAmount(model.cards.pipelineAmount),
      detail: formatAmount(model.cards.pipelineAmount)
    },
    {
      label: translate("dashboard.weightedForecast"),
      value: formatCompactAmount(model.cards.weightedForecast),
      detail: `${formatPercent(model.summary.forecastCoverage)} ${translate("dashboard.ofPipeline")}`
    },
    {
      label: translate("dashboard.highConfidence"),
      value: formatCompactAmount(model.cards.highConfidence),
      detail: `${formatPercent(model.summary.highConfidenceShare)} ${translate("dashboard.ofForecast")}`
    },
    {
      label: translate("dashboard.wins"),
      value: formatCompactAmount(model.cards.wins),
      detail: `${formatPercent(model.summary.winRate)} ${translate("dashboard.closedWinRate")}`
    },
    {
      label: translate("dashboard.averageChance"),
      value: formatPercent(model.summary.averageChance),
      detail: formatLeadCount(model.cards.openCount)
    },
    {
      label: translate("dashboard.atRiskExposure"),
      value: formatCompactAmount(model.cards.atRiskAmount),
      detail: `${formatNumber(model.summary.overdueCount)} ${translate("dashboard.requiresAttention")}`
    }
  ];

  const healthMetrics = [
    {
      label: translate("dashboard.forecastCoverage"),
      value: formatPercent(model.summary.forecastCoverage),
      percent: model.summary.forecastCoverage,
      color: "#274884"
    },
    {
      label: translate("dashboard.highConfidenceShare"),
      value: formatPercent(model.summary.highConfidenceShare),
      percent: model.summary.highConfidenceShare,
      color: "#19345f"
    },
    {
      label: translate("dashboard.perpetualShare"),
      value: formatPercent(model.summary.perpetualShare),
      percent: model.summary.perpetualShare,
      color: "#6d88b9"
    },
    {
      label: translate("dashboard.riskShare"),
      value: formatPercent(model.summary.riskShare),
      percent: model.summary.riskShare,
      color: "#b4423f"
    }
  ];

  return `
    <section class="dashboard-hero panel">
      <div class="dashboard-hero-copy">
        <div class="eyebrow">${escapeHtml(translate("dashboard.liveOverview"))}</div>
        <h2 class="dashboard-hero-title">${escapeHtml(translate("dashboard.snapshotTitle", {
          count: formatNumber(model.summary.activeLeadCount),
          customers: formatNumber(model.summary.customerCount)
        }))}</h2>
        <p class="dashboard-hero-description">${escapeHtml(translate("dashboard.snapshotDescription", {
          forecast: formatCompactAmount(model.cards.weightedForecast),
          pipeline: formatCompactAmount(model.cards.pipelineAmount)
        }))}</p>
        <div class="dashboard-highlight-grid">
          ${renderDashboardHighlight(translate("dashboard.openLeads"), formatNumber(model.cards.openCount))}
          ${renderDashboardHighlight(translate("dashboard.dueSoon"), formatNumber(model.summary.dueSoonCount))}
          ${renderDashboardHighlight(translate("dashboard.overdue"), formatNumber(model.summary.overdueCount))}
          ${renderDashboardHighlight(translate("dashboard.winRate"), formatPercent(model.summary.winRate))}
        </div>
      </div>
      <div class="dashboard-hero-side">
        <article class="dashboard-coverage-card">
          ${renderProgressDial(
            model.summary.forecastCoverage,
            formatPercent(model.summary.forecastCoverage),
            translate("dashboard.forecastCoverage"),
            `${formatCompactAmount(model.cards.weightedForecast)} / ${formatCompactAmount(model.cards.pipelineAmount)}`
          )}
        </article>
        <div class="dashboard-spotlight-grid">
          ${renderSpotlightCard(
            translate("dashboard.topOpportunity"),
            model.spotlightLead ? model.spotlightLead.customer.name : translate("dashboard.emptySpotlight"),
            model.spotlightLead ? model.spotlightLead.project.name : "",
            model.spotlightLead ? formatAmount(model.spotlightLead.metrics.forecastAmount) : ""
          )}
          ${renderSpotlightCard(
            translate("dashboard.topCustomer"),
            model.spotlightCustomer ? model.spotlightCustomer.label : translate("dashboard.emptySpotlight"),
            model.spotlightCustomer ? formatLeadCount(model.spotlightCustomer.count) : "",
            model.spotlightCustomer ? formatAmount(model.spotlightCustomer.value) : ""
          )}
          ${showAdminAnalytics ? renderSpotlightCard(
            translate("dashboard.topOwner"),
            model.spotlightOwner ? model.spotlightOwner.label : translate("dashboard.emptySpotlight"),
            model.spotlightOwner ? formatLeadCount(model.spotlightOwner.count) : "",
            model.spotlightOwner ? formatAmount(model.spotlightOwner.value) : ""
          ) : ""}
        </div>
        <div class="dashboard-hero-actions">
          <button type="button" class="ghost-button" data-action="open-sales-report">${escapeHtml(translate("dashboard.salesMonthlyReport"))}</button>
          <button type="button" class="primary-button" data-action="new-lead" data-testid="dashboard-new-lead">${escapeHtml(translate("nav.newLead"))}</button>
          <button type="button" class="soft-button" data-view="list">${escapeHtml(translate("dashboard.exploreList"))}</button>
        </div>
      </div>
    </section>
    <section class="dashboard-kpi-grid">
      ${metricCards.map((card) => renderDashboardMetricCard(card)).join("")}
    </section>
    <section class="dashboard-visual-grid dashboard-visual-grid-hero">
      <article class="table-card analytics-card analytics-card-wide">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(translate("dashboard.pipelineFunnel"))}</h3>
            <p>${escapeHtml(translate("dashboard.stageValueShare"))}</p>
          </div>
          <span class="chip">${escapeHtml(formatLeadCount(model.cards.openCount))}</span>
        </div>
        ${renderStageFunnel(model.stagePerformance)}
      </article>
      ${renderDonutPanel({
        title: translate("dashboard.statusPortfolio"),
        subtitle: translate("dashboard.valueMix"),
        centerValue: formatNumber(totalStatuses),
        centerLabel: translate("table.status"),
        total: totalStatuses,
        items: model.statusMix.map((item) => ({
          ...item,
          chartValue: item.count,
          primaryValue: formatNumber(item.count),
          secondaryValue: formatAmount(item.value),
          filterKey: "offerStatus"
        }))
      })}
    </section>
    <section class="dashboard-visual-grid">
      <article class="table-card analytics-card">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(translate("dashboard.monthlyRunRate"))}</h3>
            <p>${escapeHtml(translate("dashboard.monthlyForecast"))}</p>
          </div>
          <span class="chip">${escapeHtml(formatCompactAmount(model.cards.weightedForecast))}</span>
        </div>
        ${renderForecastColumns(model.monthlyForecast)}
      </article>
      ${renderDonutPanel({
        title: translate("dashboard.workTypePortfolio"),
        subtitle: translate("dashboard.workTypeConcentration"),
        centerValue: formatCompactAmount(totalWorkTypes),
        centerLabel: translate("dashboard.pipelineAmount"),
        total: totalWorkTypes,
        items: model.workTypeBreakdown.map((item) => ({
          ...item,
          chartValue: item.value,
          primaryValue: formatAmount(item.value),
          secondaryValue: formatLeadCount(item.count),
          filterKey: "workTypeId"
        }))
      })}
    </section>
    ${showAdminAnalytics ? `
    <section class="dashboard-visual-grid">
      <article class="table-card analytics-card">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(translate("dashboard.ownerLeaderboard"))}</h3>
            <p>${escapeHtml(translate("dashboard.pipelineByOwner"))}</p>
          </div>
        </div>
        ${renderLeaderboard(model.pipelineByOwner, "ownerSubjectId")}
      </article>
      <article class="table-card analytics-card">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(translate("dashboard.customerExposure"))}</h3>
            <p>${escapeHtml(translate("dashboard.topCustomers"))}</p>
          </div>
        </div>
        ${renderLeaderboard(model.pipelineByCustomer, "customerId")}
      </article>
    </section>
    ` : ""}
    <section class="dashboard-visual-grid">
      <article class="table-card analytics-card">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(translate("dashboard.riskWidget"))}</h3>
            <p>${escapeHtml(translate("dashboard.pipelinePressure"))}</p>
          </div>
          <span class="chip">${escapeHtml(formatCompactAmount(model.cards.atRiskAmount))}</span>
        </div>
        <div class="risk-list risk-list-rich">
          ${model.riskLeads.map((lead) => `
            <button type="button" class="ghost-button risk-item risk-item-rich" data-action="edit-lead" data-lead-id="${lead.id}">
              <span>
                <strong>${escapeHtml(lead.customer.name)}</strong><br />
                <span class="muted">${escapeHtml(lead.project.name)}</span>
              </span>
              <span class="risk-meta">
                <span class="${lead.isIncomplete ? "warning-text" : "danger-text"}">
                  ${lead.isIncomplete
                    ? escapeHtml(translate("common.incomplete"))
                    : escapeHtml(getLeadOfferStatus(lead) ? translateOfferStatus(getLeadOfferStatus(lead)) : (lead.stage ? translateStage(lead.stage) : translate("common.notSet")))}
                </span>
                <span class="muted">${lead.dueDate ? escapeHtml(formatDate(lead.dueDate)) : escapeHtml(translate("common.noDueDate"))}</span>
              </span>
            </button>
          `).join("") || `<p class="empty-state">${escapeHtml(translate("common.noImmediateAction"))}</p>`}
        </div>
      </article>
      <article class="table-card analytics-card">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(translate("dashboard.portfolioHealth"))}</h3>
            <p>${escapeHtml(translate("dashboard.valueMix"))}</p>
          </div>
        </div>
        ${renderHealthMetrics(healthMetrics)}
      </article>
    </section>
  `;
}

function renderDashboardHighlight(label, value) {
  return `
    <article class="dashboard-highlight">
      <small>${escapeHtml(label)}</small>
      <strong>${escapeHtml(value)}</strong>
    </article>
  `;
}

function renderDashboardMetricCard(card) {
  return `
    <article class="metric-card metric-card-rich">
      <small>${escapeHtml(card.label)}</small>
      <strong>${escapeHtml(card.value)}</strong>
      <span class="metric-detail">${escapeHtml(card.detail)}</span>
    </article>
  `;
}

function renderSpotlightCard(title, primary, secondary, tertiary) {
  return `
    <article class="dashboard-spotlight">
      <small>${escapeHtml(title)}</small>
      <strong>${escapeHtml(primary || "—")}</strong>
      ${secondary ? `<span class="muted">${escapeHtml(secondary)}</span>` : ""}
      ${tertiary ? `<span class="dashboard-spotlight-value">${escapeHtml(tertiary)}</span>` : ""}
    </article>
  `;
}

function renderProgressDial(percent, valueText, label, detail) {
  const safePercent = Math.max(0, Math.min(100, Number(percent || 0)));
  const background = `conic-gradient(var(--accent) 0deg ${safePercent * 3.6}deg, rgba(19, 48, 66, 0.1) ${safePercent * 3.6}deg 360deg)`;
  return `
    <div class="progress-dial-shell">
      <div class="progress-dial" style="background:${background}">
        <div class="progress-dial-inner">
          <strong>${escapeHtml(valueText)}</strong>
          <span>${escapeHtml(label)}</span>
        </div>
      </div>
      <div class="progress-dial-copy">
        <strong>${escapeHtml(label)}</strong>
        <span class="muted">${escapeHtml(detail)}</span>
      </div>
    </div>
  `;
}

function renderStageFunnel(items) {
  if (!items.some((item) => item.count > 0)) {
    return `<p class="empty-state">${escapeHtml(translate("dashboard.noStageData"))}</p>`;
  }

  return `
    <div class="funnel-list">
      ${items.map((item) => `
        <article class="funnel-stage">
          <div class="funnel-stage-header">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(formatPercent(item.shareAmount))}</span>
          </div>
          <div class="funnel-stage-track">
            <span class="funnel-stage-fill" style="width:${item.shareAmount > 0 ? Math.max(8, item.shareAmount) : 0}%; background:${item.color};"></span>
          </div>
          <div class="funnel-stage-meta">
            <span>${escapeHtml(formatLeadCount(item.count))}</span>
            <strong>${escapeHtml(formatAmount(item.value))}</strong>
            ${item.filterValue
              ? `<button type="button" class="soft-button inline-filter-button" data-action="apply-dashboard-filter" data-filter-key="stage" data-filter-value="${item.filterValue}" data-filter-label="${escapeHtml(item.label)}">${escapeHtml(translate("dashboard.openFilteredList"))}</button>`
              : ""}
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderDonutPanel({ title, subtitle, centerValue, centerLabel, total, items }) {
  if (!items.length || !total) {
    return `
      <article class="table-card analytics-card">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(title)}</h3>
            <p>${escapeHtml(subtitle)}</p>
          </div>
        </div>
        <p class="empty-state">${escapeHtml(translate("common.noData"))}</p>
      </article>
    `;
  }

  return `
    <article class="table-card analytics-card">
      <div class="card-heading">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(subtitle)}</p>
        </div>
      </div>
      <div class="donut-card-grid">
        ${renderDonutChart(items, total, centerValue, centerLabel)}
        <div class="legend-list">
          ${items.map((item) => `
            <div class="legend-item">
              <div class="legend-label">
                <span class="legend-swatch" style="background:${item.color};"></span>
                <span>${escapeHtml(item.label)}</span>
              </div>
              <div class="legend-values">
                <strong>${escapeHtml(item.primaryValue)}</strong>
                <span>${escapeHtml(item.secondaryValue)}</span>
              </div>
              ${item.filterKey && item.filterValue
                ? `<button type="button" class="soft-button inline-filter-button" data-action="apply-dashboard-filter" data-filter-key="${item.filterKey}" data-filter-value="${item.filterValue}" data-filter-label="${escapeHtml(item.label)}">${escapeHtml(translate("dashboard.openFilteredList"))}</button>`
                : ""}
            </div>
          `).join("")}
        </div>
      </div>
    </article>
  `;
}

function renderDonutChart(items, total, centerValue, centerLabel) {
  return `
    <div class="donut-chart" style="background:${buildDonutGradient(items, total)}">
      <div class="donut-chart-inner">
        <strong>${escapeHtml(centerValue)}</strong>
        <span>${escapeHtml(centerLabel)}</span>
      </div>
    </div>
  `;
}

function buildDonutGradient(items, total) {
  if (!total) {
    return "conic-gradient(rgba(19, 48, 66, 0.1) 0deg 360deg)";
  }

  let cursor = 0;
  const segments = items
    .filter((item) => item.chartValue > 0)
    .map((item) => {
      const start = cursor * 360;
      const nextCursor = cursor + (item.chartValue / total);
      const end = nextCursor * 360;
      cursor = nextCursor;
      return `${item.color} ${start}deg ${end}deg`;
    });

  if (!segments.length) {
    return "conic-gradient(rgba(19, 48, 66, 0.1) 0deg 360deg)";
  }

  if (cursor < 1) {
    segments.push(`rgba(19, 48, 66, 0.08) ${cursor * 360}deg 360deg`);
  }

  return `conic-gradient(${segments.join(", ")})`;
}

function renderForecastColumns(items) {
  if (!items.length || !items.some((item) => item.value > 0)) {
    return `<p class="empty-state">${escapeHtml(translate("common.noData"))}</p>`;
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  return `
    <div class="column-chart">
      ${items.map((item) => `
        <div class="column-item">
          <div class="column-shell">
            <span class="column-bar" style="height:${item.value > 0 ? Math.max(8, (item.value / max) * 100) : 0}%"></span>
          </div>
          <strong class="column-value">${escapeHtml(formatCompactAmount(item.value))}</strong>
          <span class="column-label">${escapeHtml(formatMonth(item.label))}</span>
        </div>
      `).join("")}
    </div>
  `;
}

function renderLeaderboard(items, filterKey) {
  if (!items.length) {
    return `<p class="empty-state">${escapeHtml(translate("common.noData"))}</p>`;
  }

  const max = Math.max(...items.map((item) => item.value), 1);
  return `
    <div class="leaderboard-list">
      ${items.map((item, index) => `
        <article class="leaderboard-row">
          <div class="leaderboard-rank">${index + 1}</div>
          <div class="leaderboard-main">
            <div class="leaderboard-head">
              <strong>${escapeHtml(item.label)}</strong>
              <span>${escapeHtml(formatAmount(item.value))}</span>
            </div>
            <div class="leaderboard-bar">
              <span class="leaderboard-bar-fill" style="width:${item.value > 0 ? Math.max(8, (item.value / max) * 100) : 0}%"></span>
            </div>
            <div class="leaderboard-foot">
              <span class="muted">${escapeHtml(formatLeadCount(item.count))}</span>
              <button type="button" class="soft-button inline-filter-button" data-action="apply-dashboard-filter" data-filter-key="${filterKey}" data-filter-value="${item.id}" data-filter-label="${escapeHtml(item.label)}">${escapeHtml(translate("dashboard.openFilteredList"))}</button>
            </div>
          </div>
        </article>
      `).join("")}
    </div>
  `;
}

function renderHealthMetrics(items) {
  return `
    <div class="health-list">
      ${items.map((item) => `
        <div class="health-row">
          <div class="health-row-head">
            <span>${escapeHtml(item.label)}</span>
            <strong>${escapeHtml(item.value)}</strong>
          </div>
          <div class="health-track">
            <span class="health-fill" style="width:${item.percent > 0 ? Math.max(6, item.percent) : 0}%; background:${item.color};"></span>
          </div>
        </div>
      `).join("")}
    </div>
  `;
}

function renderLeadList(leads) {
  const customers = state.metadata?.customers || [];
  const workTypes = state.metadata?.workTypes || [];
  const quarterOptions = getDueQuarterOptions();
  const showOwnerColumn = isAdminUser();

  return `
    <section class="panel">
      <div class="filter-grid">
        ${renderFilterField(translate("list.search"), "search", "search", translate("list.searchPlaceholder"))}
        ${showOwnerColumn
          ? renderSelectFilter(translate("list.owner"), "ownerSubjectId", getOwners().map((owner) => ({ value: owner.subjectId, label: owner.displayName })))
          : ""}
        ${renderSelectFilter(translate("list.customer"), "customerId", customers.map((customer) => ({ value: customer.id, label: customer.name })))}
        ${renderSelectFilter(translate("list.workType"), "workTypeId", workTypes.filter((item) => item.isActive).map((workType) => ({ value: workType.id, label: translateWorkType(workType) })))}
        ${renderSelectFilter(translate("list.contractType"), "contractType", [{ value: "perpetual", label: translate("list.contract.perpetual") }, { value: "auction", label: translate("list.contract.auction") }])}
        ${renderSelectFilter(translate("list.stage"), "stage", StageValues.map((value) => ({ value, label: translateStage(value) })))}
        ${renderSelectFilter(translate("list.offerStatus"), "offerStatus", OfferStatusValues.map((value) => ({ value, label: translateOfferStatus(value) })))}
        ${renderSelectFilter(translate("list.dueFrom"), "dueDateFrom", quarterOptions)}
        ${renderSelectFilter(translate("list.dueTo"), "dueDateTo", quarterOptions)}
        ${renderFilterField(translate("list.amountMin"), "number", "amountMin")}
        ${renderFilterField(translate("list.amountMax"), "number", "amountMax")}
        ${renderSelectFilter(translate("list.sortBy"), "sortBy", [
          { value: "updatedAt", label: translate("list.sort.updatedAt") },
          { value: "dueDate", label: translate("list.sort.dueDate") },
          { value: "totalAmount", label: translate("list.sort.totalAmount") },
          { value: "forecastAmount", label: translate("list.sort.forecastAmount") },
          { value: "chanceToWin", label: translate("list.sort.chanceToWin") }
        ])}
      </div>
      <div class="list-actions">
        <button type="button" class="primary-button list-action-button" data-action="new-lead" data-testid="lead-list-new">${escapeHtml(translate("nav.newLead"))}</button>
        <button type="button" class="ghost-button list-action-button" data-action="export-leads" ${state.exporting ? "disabled" : ""}>${escapeHtml(state.exporting ? translate("common.exporting") : translate("list.export"))}</button>
        <button type="button" class="ghost-button list-action-button" data-action="reset-filters">${escapeHtml(translate("list.resetFilters"))}</button>
      </div>
    </section>
    <section class="table-card">
      <p class="helper-text result-count">${escapeHtml(translate("list.resultsCount", { count: leads.length }))}</p>
      <div class="table-scroll">
        <table data-testid="lead-table">
          <thead>
            <tr>
              <th>${escapeHtml(translate("table.customerProject"))}</th>
              ${showOwnerColumn ? `<th>${escapeHtml(translate("list.owner"))}</th>` : ""}
              <th>${escapeHtml(translate("table.status"))}</th>
              <th>${escapeHtml(translate("list.stage"))}</th>
              <th>${escapeHtml(translate("table.total"))}</th>
              <th>${escapeHtml(translate("table.forecast"))}</th>
              <th>${escapeHtml(translate("table.chance"))}</th>
              <th>${escapeHtml(translate("table.due"))}</th>
              <th>${escapeHtml(translate("table.updated"))}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            ${leads.map((lead) => `
              <tr data-testid="lead-row-${lead.id}">
                <td>
                  <strong>${escapeHtml(lead.customer.name)}</strong><br />
                  <span class="muted">${escapeHtml(lead.project.name)}</span>
                </td>
                ${showOwnerColumn ? `<td>${escapeHtml(lead.owner.displayName)}</td>` : ""}
                <td>${getLeadOfferStatus(lead)
                  ? `<span class="chip status-${lead.offerStatus.toLowerCase()}">${escapeHtml(translateOfferStatus(lead.offerStatus))}</span>`
                  : `<span class="muted">${escapeHtml(translate("common.notSet"))}</span>`}</td>
                <td>${escapeHtml(lead.stage ? translateStage(lead.stage) : translate("common.incomplete"))}</td>
                <td>${formatAmount(lead.metrics.totalAmount)}</td>
                <td>${formatAmount(lead.metrics.forecastAmount)}</td>
                <td>${formatPercent(lead.metrics.chanceToWin)}</td>
                <td>${lead.dueDate ? formatDate(lead.dueDate) : escapeHtml(translate("common.notSet"))}</td>
                <td>${formatDateTime(lead.updatedAtUtc)}</td>
                <td><button type="button" class="soft-button" data-action="edit-lead" data-lead-id="${lead.id}">${escapeHtml(translate("common.open"))}</button></td>
              </tr>
            `).join("") || `
              <tr>
                <td colspan="${showOwnerColumn ? "10" : "9"}" class="empty-state">${escapeHtml(translate("list.noResults"))}</td>
              </tr>
            `}
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderLeadForm(draftMetrics) {
  const questions = state.metadata?.qualificationQuestions || [];
  const customers = state.metadata?.customers || [];
  const projects = state.metadata?.projects || [];
  const workTypes = state.metadata?.workTypes || [];
  const amountLines = state.form.amountLines || [];
  const formHeader = getLeadFormHeaderContent();
  const validationErrors = state.validationErrors || [];
  const showValidationSummary = state.showValidationSummary && validationErrors.length > 0;
  const validationFields = new Set(validationErrors.map((error) => error.fieldKey));
  const workTypeOptions = workTypes
    .filter((item) => item.isActive || amountLines.some((line) => line.workTypeId === item.id))
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const customerProjects = projects.filter((project) => project.customerId === state.form.customerId);
  const showQuestions = shouldShowQualificationQuestions();
  const showOfferStatusSection = shouldShowOfferStatus();
  const showPerpetualContractField = shouldShowPerpetualContract();
  const showActualAwardedAmount = showOfferStatusSection && state.form.offerStatus === "Win";

  return `
    <section class="lead-modal-overlay">
      <div class="lead-modal" data-modal-root role="dialog" aria-modal="true" aria-labelledby="lead-form-title" data-testid="lead-form-modal">
        <form class="lead-modal-shell" data-lead-form>
          <header class="lead-modal-header">
            <div class="lead-modal-header-copy">
              <h2 id="lead-form-title" class="lead-modal-title">${escapeHtml(formHeader.header)}</h2>
              <p class="lead-modal-subtitle">${escapeHtml(formHeader.subHeader)}</p>
            </div>
            <button type="button" class="icon-button" data-action="cancel-form" data-testid="close-lead-modal" aria-label="${escapeHtml(translate("common.close"))}" title="${escapeHtml(translate("common.close"))}">X</button>
          </header>
          <div class="lead-modal-body" data-modal-body>
            <section class="form-layout">
              <div>
        <article class="panel form-section">
          <div class="field-grid">
            <div class="field">
              <label for="customer-search">${escapeHtml(translate("form.customer"))}</label>
              <input id="customer-search" list="customer-suggestions" value="${escapeHtml(state.form.customerSearch || "")}" data-form-field="customerSearch" data-testid="customer-input" placeholder="${escapeHtml(translate("form.customerPlaceholder"))}" autocomplete="off" ${validationFields.has("customerId") ? "aria-invalid=\"true\"" : ""} />
              <datalist id="customer-suggestions">
                ${customers.map((customer) => `<option value="${escapeHtml(customer.name)}"></option>`).join("")}
              </datalist>
            </div>
            <div class="field">
              <label for="project">${escapeHtml(translate("form.project"))}</label>
              <input id="project" list="project-suggestions" value="${escapeHtml(state.form.projectName)}" data-form-field="projectName" data-testid="project-input" placeholder="${escapeHtml(translate("form.projectPlaceholder"))}" ${validationFields.has("projectName") ? "aria-invalid=\"true\"" : ""} />
              <datalist id="project-suggestions">
                ${customerProjects.map((project) => `<option value="${escapeHtml(project.name)}"></option>`).join("")}
              </datalist>
            </div>
          </div>
          <div class="field">
            <label for="comments">${escapeHtml(translate("form.comments"))}</label>
            <textarea id="comments" data-form-field="comments" data-testid="comments-input" placeholder="${escapeHtml(translate("form.commentsPlaceholder"))}">${escapeHtml(state.form.comments)}</textarea>
          </div>
          <fieldset class="binary-fieldset field-span-full">
            <legend>${escapeHtml(translate("form.stage"))}</legend>
            <div class="stage-picker" data-testid="stage-picker">
              ${StageValues.map((stage) => `
                <label>
                  <input type="radio" name="lead-stage" value="${stage}" data-toggle-field="stage" ${state.form.stage === stage ? "checked" : ""} />
                  ${escapeHtml(translateStage(stage))}
                </label>
              `).join("")}
            </div>
          </fieldset>
        </article>

        ${showQuestions ? `
        <article class="panel form-section">
          <div class="question-list">
            ${questions.map((question, index) => `
              <div class="question-row">
                <div class="question-row-copy">
                  <div class="question-row-label">
                    <span class="question-row-index">${index + 1}.</span>
                    <span>${escapeHtml(translateQualificationQuestion(question))}</span>
                  </div>
                  <span class="chip">${question.isOverrideRule ? escapeHtml(translate("form.overrideRule")) : escapeHtml(translate("form.weight", { value: question.weight }))}</span>
                </div>
                <div class="binary-options question-row-controls" role="group" aria-label="${escapeHtml(translateQualificationQuestion(question))}">
                  <label>
                    <input type="radio" name="question-${question.code}" value="true" data-question-code="${question.code}" ${state.form.qualificationAnswers[question.code] === true ? "checked" : ""} />
                    ${escapeHtml(translate("common.yes"))}
                  </label>
                  <label>
                    <input type="radio" name="question-${question.code}" value="false" data-question-code="${question.code}" ${state.form.qualificationAnswers[question.code] === false ? "checked" : ""} />
                    ${escapeHtml(translate("common.no"))}
                  </label>
                </div>
              </div>
            `).join("")}
          </div>
        </article>
        ` : ""}

        <article class="panel form-section">
          <h3>${escapeHtml(translate("form.pipelineStageOutcome"))}</h3>
          <div class="field-grid">
            ${showOfferStatusSection ? `
            <fieldset class="binary-fieldset field-span-full">
              <legend>${escapeHtml(translate("form.offerStatus"))}</legend>
              <div class="segmented-options" data-testid="offer-status-picker">
                ${OfferStatusValues.map((status) => `
                  <label>
                    <input type="radio" name="offer-status" value="${status}" data-toggle-field="offerStatus" ${state.form.offerStatus === status ? "checked" : ""} />
                    ${escapeHtml(translateOfferStatus(status))}
                  </label>
                `).join("")}
              </div>
            </fieldset>
            ` : ""}
            ${showPerpetualContractField ? `
            <fieldset class="binary-fieldset">
              <legend>${escapeHtml(translate("form.perpetualContract"))}</legend>
              <div class="binary-options" data-testid="perpetual-toggle">
                <label>
                  <input type="radio" name="is-perpetual" value="true" data-toggle-field="isPerpetual" ${state.form.isPerpetual === "true" ? "checked" : ""} />
                  ${escapeHtml(translate("common.yes"))}
                </label>
                <label>
                  <input type="radio" name="is-perpetual" value="false" data-toggle-field="isPerpetual" ${state.form.isPerpetual === "false" ? "checked" : ""} />
                  ${escapeHtml(translate("common.no"))}
                </label>
              </div>
            </fieldset>
            ` : ""}
            <div class="field">
              <label for="due-date-year">${escapeHtml(translate("form.year"))}</label>
              <input id="due-date-year" type="text" inputmode="numeric" maxlength="4" value="${escapeHtml(state.form.dueYear)}" data-form-field="dueYear" data-testid="due-year-input" autocomplete="off" placeholder="2026" ${validationFields.has("dueDate") ? "aria-invalid=\"true\"" : ""} />
            </div>
            <fieldset class="binary-fieldset">
              <legend>${escapeHtml(translate("form.quarter"))}</legend>
              <div class="binary-options" data-testid="due-quarter-picker">
                ${[1, 2, 3, 4].map((quarter) => `
                  <label>
                    <input type="radio" name="due-quarter" value="${quarter}" data-toggle-field="dueQuarter" ${state.form.dueQuarter === String(quarter) ? "checked" : ""} />
                    ${escapeHtml(getQuarterChoiceLabel(quarter))}
                  </label>
                `).join("")}
              </div>
            </fieldset>
            ${showActualAwardedAmount ? `
            <div class="field">
              <label for="actual-awarded">${escapeHtml(translate("form.actualAwardedAmount"))}</label>
              <input id="actual-awarded" class="amount-input mono" type="text" inputmode="decimal" pattern="${AmountInputPatternAttribute}" dir="ltr" value="${escapeHtml(state.form.actualAwardedAmount)}" data-form-field="actualAwardedAmount" data-testid="actual-awarded-input" autocomplete="off" ${validationFields.has("actualAwardedAmount") ? "aria-invalid=\"true\"" : ""} />
            </div>
            ` : ""}
          </div>
        </article>

        <article class="panel form-section">
          <div>
            <h3>${escapeHtml(translate("form.amountLines"))}</h3>
            <p class="helper-text">${escapeHtml(translate("form.amountLinesHelp"))}</p>
          </div>
          <div class="amount-lines-table">
            <div class="amount-lines-header" aria-hidden="true">
              <span class="amount-lines-header-spacer amount-lines-header-add"></span>
              <span class="amount-lines-header-cell amount-lines-header-note">${escapeHtml(translate("form.note"))}</span>
              <span class="amount-lines-header-cell amount-lines-header-amount">${escapeHtml(translate("form.totalAmount"))}</span>
              <span class="amount-lines-header-cell amount-lines-header-worktype">${escapeHtml(translate("list.workType"))}</span>
              <span class="amount-lines-header-spacer amount-lines-header-remove"></span>
            </div>
            <div class="amount-lines">
              ${state.form.amountLines.map((line, index) => `
                <div class="amount-line" data-testid="amount-line-${index}">
                  <button type="button" class="icon-button line-remove-button" data-action="remove-line" data-index="${index}" tabindex="-1" aria-label="${escapeHtml(translate("common.remove"))}" title="${escapeHtml(translate("common.remove"))}">
                    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                      <path d="M9.5 4.5h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                      <path d="M6 7.5h12" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                      <path d="M8 7.5v10a1.5 1.5 0 0 0 1.5 1.5h5A1.5 1.5 0 0 0 16 17.5v-10" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"></path>
                      <path d="M10 10.5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                      <path d="M14 10.5v5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path>
                    </svg>
                  </button>
                  <div class="field amount-line-field amount-line-field-worktype">
                    <select aria-label="${escapeHtml(translate("list.workType"))}" data-line-field="workTypeId" data-index="${index}" data-testid="amount-line-worktype-${index}" ${validationFields.has(`amountLines.${index}.workTypeId`) ? "aria-invalid=\"true\"" : ""}>
                      <option value="">${escapeHtml(translate("common.selectType"))}</option>
                      ${workTypeOptions.map((workType) => `
                        <option value="${workType.id}" ${line.workTypeId === workType.id ? "selected" : ""}>${escapeHtml(translateWorkType(workType))}</option>
                      `).join("")}
                    </select>
                  </div>
                  <div class="field amount-line-field amount-line-field-amount">
                    <input class="amount-input mono" aria-label="${escapeHtml(translate("form.totalAmount"))}" type="text" inputmode="decimal" pattern="${AmountInputPatternAttribute}" dir="ltr" value="${escapeHtml(line.amount)}" data-line-field="amount" data-index="${index}" data-testid="amount-line-amount-${index}" autocomplete="off" ${validationFields.has(`amountLines.${index}.amount`) ? "aria-invalid=\"true\"" : ""} />
                  </div>
                  <div class="field amount-line-field amount-line-field-note">
                    <input aria-label="${escapeHtml(translate("form.note"))}" value="${escapeHtml(line.note)}" data-line-field="note" data-index="${index}" data-testid="amount-line-note-${index}" placeholder="${escapeHtml(translate("form.notePlaceholder"))}" />
                  </div>
                  ${index === state.form.amountLines.length - 1
                    ? `
                      <button
                        type="button"
                        class="icon-button add-line-button"
                        data-action="add-line"
                        data-testid="add-amount-line"
                        aria-label="${escapeHtml(translate("form.addLine"))}"
                        title="${escapeHtml(translate("form.addLine"))}">
                        <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
                          <path d="M12 5v14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
                          <path d="M5 12h14" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"></path>
                        </svg>
                      </button>
                    `
                    : `<span class="add-line-placeholder" aria-hidden="true"></span>`}
                </div>
              `).join("")}
            </div>
          </div>
        </article>

        ${state.form.auditTrail.length ? `
          <article class="panel form-section">
            <h3>${escapeHtml(translate("form.auditTrail"))}</h3>
            <div class="audit-list">
              ${state.form.auditTrail.map((entry) => `
                <div class="audit-item">
                  <span>
                    <strong>${escapeHtml(entry.action)}</strong><br />
                    <span class="muted">${escapeHtml(entry.summary)}</span>
                  </span>
                  <span class="muted">${escapeHtml(entry.changedBy)} · ${formatDateTime(entry.changedAtUtc)}</span>
                </div>
              `).join("")}
            </div>
          </article>
        ` : ""}
              </div>

              <aside class="summary-grid">
                <article class="sidebar-card">
          <h3>${escapeHtml(translate("form.liveCalculations"))}</h3>
          <div class="summary-list">
            ${renderSummaryRow(translate("form.totalAmount"), formatAmount(draftMetrics.totalAmount))}
            ${renderSummaryRow(translate("form.qualificationScore"), formatPercent(draftMetrics.qualificationScore))}
            ${renderSummaryRow(translate("form.qualificationContribution"), formatPercent(draftMetrics.qualificationContribution))}
            ${renderSummaryRow(translate("form.stageContribution"), formatPercent(draftMetrics.stageContribution))}
            ${renderSummaryRow(translate("form.chanceToWin"), formatPercent(draftMetrics.chanceToWin))}
            ${renderSummaryRow(translate("form.forecastAmount"), formatAmount(draftMetrics.forecastAmount))}
            ${renderSummaryRow(translate("form.highConfidenceForecast"), formatAmount(draftMetrics.highConfidence))}
            ${renderSummaryRow(translate("form.wonAmount"), formatAmount(draftMetrics.wonAmount))}
          </div>
        </article>
        <article class="sidebar-card">
          <h3>${escapeHtml(translate("form.forecastInclusion"))}</h3>
          ${draftMetrics.missingFields.length
            ? `<p class="warning-text">${escapeHtml(translate("form.forecastIncomplete"))}</p>
               <div class="chip-row">
                 ${draftMetrics.missingFields.map((field) => `<span class="chip">${escapeHtml(field)}</span>`).join("")}
               </div>`
            : `<p class="muted">${escapeHtml(translate("form.forecastComplete"))}</p>`}
        </article>
              </aside>
            </section>
            <p class="keyboard-hint keyboard-hint-bottom">${escapeHtml(translate("form.keyboardHint"))}</p>
          </div>
          <footer class="lead-modal-footer">
            ${showValidationSummary ? `
              <div class="validation-summary" aria-live="polite">
                <h4>${escapeHtml(translate("validation.summaryTitle"))}</h4>
                <div class="validation-summary-list">
                  ${validationErrors.map((error) => `
                    <button type="button" class="validation-link" data-action="focus-validation" data-selector="${escapeHtml(error.selector)}">${escapeHtml(error.message)}</button>
                  `).join("")}
                </div>
              </div>
            ` : ""}
            <div class="lead-modal-footer-actions">
              ${validationErrors.length ? `<button type="button" class="warning-button" data-action="toggle-validation-summary" data-testid="validation-toggle">${escapeHtml(translate("validation.summaryButton", { count: validationErrors.length }))}</button>` : ""}
              <button type="button" class="ghost-button" data-action="cancel-form" data-testid="cancel-lead-modal">${escapeHtml(translate("common.cancel"))}</button>
              <button type="submit" class="primary-button" data-testid="save-lead-button">${escapeHtml(state.saving ? translate("form.saving") : translate("form.saveLead"))}</button>
            </div>
          </footer>
        </form>
      </div>
    </section>
  `;
}

function renderSalesMonthlyReportModal() {
  const report = state.reportData;
  const owners = report?.availableSalesPeople || [];
  const isAdmin = isAdminUser();
  const signedInOwner = state.shellContext?.user || null;

  return `
    <section class="lead-modal-overlay">
      <div class="lead-modal report-modal" data-modal-root role="dialog" aria-modal="true" aria-labelledby="sales-report-title" data-testid="sales-report-modal">
        <div class="lead-modal-shell report-modal-shell">
          <header class="lead-modal-header">
            <div class="lead-modal-header-copy">
              <h2 id="sales-report-title" class="lead-modal-title">${escapeHtml(translate("view.salesMonthlyReport"))}</h2>
              <p class="lead-modal-subtitle">${escapeHtml(translate("report.subtitle"))}</p>
            </div>
            <button type="button" class="icon-button" data-action="close-sales-report" data-testid="close-sales-report-modal" aria-label="${escapeHtml(translate("common.close"))}" title="${escapeHtml(translate("common.close"))}">X</button>
          </header>
          <div class="lead-modal-body report-modal-body" data-modal-body>
            <form class="report-filter-form panel" data-report-filters-form>
              <div class="report-filter-grid">
                <div class="field">
                  <label for="report-from-date">${escapeHtml(translate("report.fromDate"))}</label>
                  <input id="report-from-date" type="date" value="${escapeHtml(state.reportFilters.fromDate)}" data-report-field="fromDate" data-testid="report-from-date" />
                </div>
                <div class="field">
                  <label for="report-to-date">${escapeHtml(translate("report.toDate"))}</label>
                  <input id="report-to-date" type="date" value="${escapeHtml(state.reportFilters.toDate)}" data-report-field="toDate" data-testid="report-to-date" />
                </div>
                ${isAdmin
                  ? `
                    <div class="field">
                      <label for="report-salesperson">${escapeHtml(translate("report.salesperson"))}</label>
                      <select id="report-salesperson" data-report-field="ownerSubjectId" data-testid="report-salesperson">
                        <option value="">${escapeHtml(translate("report.allSalespeople"))}</option>
                        ${owners.map((owner) => `
                          <option value="${escapeHtml(owner.subjectId)}" ${state.reportFilters.ownerSubjectId === owner.subjectId ? "selected" : ""}>${escapeHtml(owner.displayName)}</option>
                        `).join("")}
                      </select>
                    </div>
                  `
                  : `
                    <div class="field">
                      <label>${escapeHtml(translate("report.salesperson"))}</label>
                      <div class="report-locked-owner">${escapeHtml(signedInOwner?.displayName || "")}</div>
                      <p class="helper-text">${escapeHtml(translate("report.lockedToCurrentUser"))}</p>
                    </div>
                  `}
              </div>
              <div class="report-filter-footer">
                ${renderInlineReportStats(report)}
                <div class="report-filter-actions">
                  <button type="submit" class="primary-button" data-testid="run-sales-report" ${state.reportLoading ? "disabled" : ""}>${escapeHtml(state.reportLoading ? translate("report.loading") : translate("report.run"))}</button>
                  <button type="button" class="ghost-button" data-action="export-sales-report" data-testid="export-sales-report" ${state.reportExporting ? "disabled" : ""}>${escapeHtml(state.reportExporting ? translate("common.exporting") : translate("report.export"))}</button>
                </div>
              </div>
            </form>
            ${renderSalesMonthlyReportContent(report)}
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderSalesMonthlyReportContent(report) {
  if (state.reportLoading && !report) {
    return `<article class="table-card report-state-card"><p class="empty-state">${escapeHtml(translate("report.loading"))}</p></article>`;
  }

  if (!report || !report.rows?.length) {
    return `<article class="table-card report-state-card"><p class="empty-state">${escapeHtml(translate("report.noData"))}</p></article>`;
  }

  const rows = getSortedSalesReportRows(report.rows);
  const displayMonths = getDisplayReportMonths(report.months);

  return `
    <section class="report-content-grid">
      <section class="report-visual-grid">
        ${renderStatisticsPieCard(rows)}
        ${renderStatisticsTrendCard(report)}
      </section>
      <section class="table-card report-table-card" ${state.reportLoading ? "aria-busy=\"true\"" : ""}>
        <div class="report-table-grid">
          <div class="report-scroll-pane">
            <div class="table-scroll" data-report-table-scroll>
              <table class="monthly-report-table" data-testid="sales-report-table">
                ${renderReportScrollableColumnGroup(displayMonths)}
                <thead>
                  <tr>
                    ${displayMonths.map((month) => renderSortableMonthHeader(month)).join("")}
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((row) => renderSalesMonthlyReportScrollableRows(row, displayMonths)).join("")}
                </tbody>
              </table>
            </div>
          </div>
          <div class="report-frozen-pane">
            <div class="report-frozen-scroll" data-report-frozen-scroll>
              <table class="monthly-report-table monthly-report-frozen-table" aria-hidden="true">
                ${renderReportFrozenColumnGroup()}
                <thead>
                  <tr>
                    <th class="monthly-report-total-header">${escapeHtml(translate("report.total"))}</th>
                    <th class="monthly-report-person-header">${escapeHtml(translate("report.salesperson"))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows.map((row) => renderSalesMonthlyReportFrozenRows(row)).join("")}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="report-summary-footer">
          <div class="report-summary-grid">
            <div class="report-summary-scroll" data-report-summary-scroll>
              <table class="monthly-report-table monthly-report-summary-table" aria-hidden="true">
                ${renderReportScrollableColumnGroup(displayMonths)}
                <tbody>
                  ${renderSalesMonthlyReportScrollableSummaryRows(report.totals, displayMonths)}
                </tbody>
              </table>
            </div>
            <div class="report-summary-frozen-pane">
              <table class="monthly-report-table monthly-report-frozen-table monthly-report-summary-table" aria-hidden="true">
                ${renderReportFrozenColumnGroup()}
                <tbody>
                  ${renderSalesMonthlyReportFrozenSummaryRows(report.totals)}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>
    </section>
  `;
}

function getDisplayReportMonths(months) {
  return [...(months || [])].reverse();
}

function renderReportScrollableColumnGroup(displayMonths) {
  return `
    <colgroup>
      ${displayMonths.map(() => '<col class="monthly-report-col monthly-report-col-month" />').join("")}
    </colgroup>
  `;
}

function renderReportFrozenColumnGroup() {
  return `
    <colgroup>
      <col class="monthly-report-col monthly-report-col-total" />
      <col class="monthly-report-col monthly-report-col-person" />
    </colgroup>
  `;
}

function renderInlineReportStats(report) {
  if (!report || !report.rows?.length) {
    return "";
  }

  return `
    <section class="report-stat-strip" aria-label="${escapeHtml(translate("view.salesMonthlyReport"))}">
      ${renderInlineReportStat(
        translate("report.summary.salespeople"),
        formatNumber(report.rows.length),
        `${formatNumber(report.months.length)} ${translate("report.summary.months")}`
      )}
      ${renderInlineReportStat(
        translate("report.summary.actual"),
        formatCompactAmount(report.totals.actualTotal),
        formatAmount(report.totals.actualTotal)
      )}
      ${renderInlineReportStat(
        translate("report.summary.projected"),
        formatCompactAmount(report.totals.projectedTotal),
        formatAmount(report.totals.projectedTotal)
      )}
    </section>
  `;
}

function renderInlineReportStat(label, value, detail) {
  return `
    <article class="report-stat-inline">
      <div class="report-stat-inline-label">${escapeHtml(label)}</div>
      <div class="report-stat-inline-value">${escapeHtml(value)}</div>
      <div class="report-stat-inline-detail">${escapeHtml(detail)}</div>
    </article>
  `;
}

function renderSortableMonthHeader(month) {
  const monthKey = String(month.monthStart || "");
  const isActive = state.reportSort.key === monthKey;
  const direction = isActive ? state.reportSort.direction : "";
  const icon = direction === "asc" ? "↑" : direction === "desc" ? "↓" : "↕";
  const title = direction === "asc"
    ? translate("report.sort.asc")
    : direction === "desc"
      ? translate("report.sort.desc")
      : `${translate("report.sort.desc")} / ${translate("report.sort.asc")}`;

  return `
    <th>
      <button
        type="button"
        class="column-sort-button ${isActive ? "active" : ""}"
        data-action="sort-statistics-report"
        data-sort-key="${escapeHtml(monthKey)}"
        title="${escapeHtml(title)}">
        <span>${escapeHtml(formatReportMonth(month.monthStart))}</span>
        <span aria-hidden="true">${icon}</span>
      </button>
    </th>
  `;
}

function getSortedSalesReportRows(rows) {
  const items = [...(rows || [])];
  if (!state.reportSort.key) {
    return items.sort((left, right) => left.salesPerson.displayName.localeCompare(right.salesPerson.displayName));
  }

  const direction = state.reportSort.direction === "asc" ? 1 : -1;
  return items.sort((left, right) => {
    const difference = getReportMonthSortValue(left, state.reportSort.key) - getReportMonthSortValue(right, state.reportSort.key);
    if (difference !== 0) {
      return difference * direction;
    }

    return left.salesPerson.displayName.localeCompare(right.salesPerson.displayName);
  });
}

function getReportMonthSortValue(row, monthKey) {
  const month = (row.months || []).find((item) => String(item.monthStart) === String(monthKey));
  if (!month) {
    return 0;
  }

  return Number(month.projectedAmount || 0) + Number(month.actualAmount || 0);
}

function renderStatisticsPieCard(rows) {
  const segments = buildStatisticsPieSegments(rows);
  if (!segments.length) {
    return `
      <article class="table-card report-chart-card">
        <div class="card-heading">
          <div>
            <h3>${escapeHtml(translate("report.chart.salespeople"))}</h3>
          </div>
        </div>
        <p class="empty-state">${escapeHtml(translate("report.noData"))}</p>
      </article>
    `;
  }

  const gradient = segments.map((segment) =>
    `${segment.color} ${segment.start.toFixed(2)}% ${segment.end.toFixed(2)}%`
  ).join(", ");

  return `
    <article class="table-card report-chart-card">
      <div class="card-heading">
        <div>
          <h3>${escapeHtml(translate("report.chart.salespeople"))}</h3>
          <p>${escapeHtml(translate("report.summary.projected"))}</p>
        </div>
      </div>
      <div class="report-pie-layout">
        <div class="report-pie-chart" style="background: conic-gradient(${gradient});"></div>
        <div class="report-pie-legend">
          ${segments.map((segment) => `
            <div class="report-pie-legend-item">
              <span class="report-pie-swatch" style="background:${segment.color};"></span>
              <span class="report-pie-name">${escapeHtml(segment.label)}</span>
              <span class="report-pie-value">${escapeHtml(formatAmount(segment.value))}</span>
            </div>
          `).join("")}
        </div>
      </div>
    </article>
  `;
}

function buildStatisticsPieSegments(rows) {
  const baseItems = rows
    .map((row, index) => ({
      label: row.salesPerson.displayName,
      value: Number(row.projectedTotal || 0),
      color: DashboardFallbackPalette[index % DashboardFallbackPalette.length]
    }))
    .filter((item) => item.value > 0);

  const total = baseItems.reduce((sum, item) => sum + item.value, 0);
  if (!total) {
    return [];
  }

  let start = 0;
  return baseItems.map((item) => {
    const percent = (item.value / total) * 100;
    const segment = {
      ...item,
      start,
      end: start + percent
    };
    start += percent;
    return segment;
  });
}

function renderStatisticsTrendCard(report) {
  return `
    <article class="table-card report-chart-card">
      <div class="card-heading">
        <div>
          <h3>${escapeHtml(translate("report.chart.months"))}</h3>
          <p>${escapeHtml(translate("report.chart.projected"))} / ${escapeHtml(translate("report.chart.actual"))}</p>
        </div>
      </div>
      ${renderStatisticsTrendSvg(report)}
      <div class="report-chart-legend">
        <span class="report-chart-legend-item">
          <span class="report-chart-legend-bar"></span>
          ${escapeHtml(translate("report.projected"))}
        </span>
        <span class="report-chart-legend-item">
          <span class="report-chart-legend-line"></span>
          ${escapeHtml(translate("report.actual"))}
        </span>
      </div>
    </article>
  `;
}

function renderStatisticsTrendSvg(report) {
  const months = report.totals.months || [];
  const width = 720;
  const height = 180;
  const padding = { top: 10, right: 16, bottom: 34, left: 16 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...months.flatMap((month) => [Number(month.projectedAmount || 0), Number(month.actualAmount || 0)]));
  const step = months.length ? plotWidth / months.length : plotWidth;
  const barWidth = Math.max(14, Math.min(28, step * 0.48));

  const actualPoints = months.map((month, index) => {
    const x = padding.left + (step * index) + (step / 2);
    const y = padding.top + plotHeight - ((Number(month.actualAmount || 0) / maxValue) * plotHeight);
    return `${x},${y}`;
  }).join(" ");

  return `
    <svg class="report-trend-chart" viewBox="0 0 ${width} ${height}" role="img" aria-label="${escapeHtml(translate("report.chart.months"))}">
      <line x1="${padding.left}" y1="${padding.top + plotHeight}" x2="${width - padding.right}" y2="${padding.top + plotHeight}" stroke="rgba(19, 48, 66, 0.16)" stroke-width="1" />
      ${months.map((month, index) => {
        const barHeight = (Number(month.projectedAmount || 0) / maxValue) * plotHeight;
        const x = padding.left + (step * index) + ((step - barWidth) / 2);
        const y = padding.top + plotHeight - barHeight;
        const pointX = padding.left + (step * index) + (step / 2);
        const pointY = padding.top + plotHeight - ((Number(month.actualAmount || 0) / maxValue) * plotHeight);

        return `
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" rx="8" fill="#274884" fill-opacity="0.82"></rect>
          <circle cx="${pointX}" cy="${pointY}" r="3.5" fill="#b4423f"></circle>
          <text x="${pointX}" y="${height - 12}" text-anchor="middle" class="report-trend-label">${escapeHtml(formatChartMonthLabel(month.monthStart))}</text>
        `;
      }).join("")}
      ${actualPoints ? `<polyline points="${actualPoints}" fill="none" stroke="#b4423f" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>` : ""}
    </svg>
  `;
}

function formatChartMonthLabel(value) {
  const date = parseDateOnly(value);
  if (!date) {
    return String(value || "");
  }

  return new Intl.DateTimeFormat(currentLocale(), {
    month: "short"
  }).format(date);
}

function renderSalesMonthlyReportScrollableRows(row, displayMonths) {
  return `
    <tr class="monthly-report-projected-row">
      ${displayMonths.map((month) => {
        const currentMonth = row.months.find((item) => item.monthStart === month.monthStart) || { projectedAmount: 0 };
        return `<td class="monthly-report-value-cell">${formatAmount(currentMonth.projectedAmount)}</td>`;
      }).join("")}
    </tr>
    <tr class="monthly-report-actual-row">
      ${displayMonths.map((month) => {
        const currentMonth = row.months.find((item) => item.monthStart === month.monthStart) || { actualAmount: 0 };
        return `<td class="monthly-report-value-cell">${formatAmount(currentMonth.actualAmount)}</td>`;
      }).join("")}
    </tr>
  `;
}

function renderSalesMonthlyReportFrozenRows(row) {
  return `
    <tr class="monthly-report-projected-row">
      <td class="monthly-report-total-cell">${formatAmount(row.projectedTotal)}</td>
      <th rowspan="2" class="monthly-report-person-cell">${escapeHtml(row.salesPerson.displayName)}</th>
    </tr>
    <tr class="monthly-report-actual-row">
      <td class="monthly-report-total-cell">${formatAmount(row.actualTotal)}</td>
    </tr>
  `;
}

function renderSalesMonthlyReportScrollableSummaryRows(totals, displayMonths) {
  return `
    <tr class="monthly-report-projected-row monthly-report-summary-row">
      ${displayMonths.map((month) => {
        const currentMonth = totals.months.find((item) => item.monthStart === month.monthStart) || { projectedAmount: 0 };
        return `<td class="monthly-report-value-cell">${formatAmount(currentMonth.projectedAmount)}</td>`;
      }).join("")}
    </tr>
    <tr class="monthly-report-actual-row monthly-report-summary-row">
      ${displayMonths.map((month) => {
        const currentMonth = totals.months.find((item) => item.monthStart === month.monthStart) || { actualAmount: 0 };
        return `<td class="monthly-report-value-cell">${formatAmount(currentMonth.actualAmount)}</td>`;
      }).join("")}
    </tr>
  `;
}

function renderSalesMonthlyReportFrozenSummaryRows(totals) {
  return `
    <tr class="monthly-report-projected-row monthly-report-summary-row">
      <td class="monthly-report-total-cell">${formatAmount(totals.projectedTotal)}</td>
      <th rowspan="2" class="monthly-report-person-cell">${escapeHtml(translate("report.total"))}</th>
    </tr>
    <tr class="monthly-report-actual-row monthly-report-summary-row">
      <td class="monthly-report-total-cell">${formatAmount(totals.actualTotal)}</td>
    </tr>
  `;
}

function renderSummaryRow(label, value) {
  return `
    <div class="summary-row">
      <span class="muted">${escapeHtml(label)}</span>
      <strong>${escapeHtml(value)}</strong>
    </div>
  `;
}

function renderFilterField(label, type, field, placeholder = "") {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <input type="${type}" value="${escapeHtml(state.filters[field])}" data-filter-field="${field}" placeholder="${escapeHtml(placeholder)}" />
    </div>
  `;
}

function renderSelectFilter(label, field, options) {
  return `
    <div class="field">
      <label>${escapeHtml(label)}</label>
      <select data-filter-field="${field}">
        <option value="">${escapeHtml(translate("common.all"))}</option>
        ${options.map((option) => `
          <option value="${option.value}" ${state.filters[field] === option.value ? "selected" : ""}>${escapeHtml(option.label)}</option>
        `).join("")}
      </select>
    </div>
  `;
}

function formatAmount(value) {
  return new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatCompactAmount(value) {
  return new Intl.NumberFormat(currentLocale(), {
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1
  }).format(Number(value || 0));
}

function formatNumber(value) {
  return new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function formatLeadCount(value) {
  return translate("dashboard.leadsCount", { count: formatNumber(value) });
}

function formatPercent(value) {
  return `${new Intl.NumberFormat(currentLocale(), {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(Math.round(Number(value || 0)))}%`;
}

function formatDate(value) {
  return getQuarterLabel(value);
}

function formatDateTime(value) {
  return new Date(value).toLocaleString(currentLocale());
}

function formatReportMonth(value) {
  const date = parseDateOnly(value);
  if (!date) {
    return String(value || "");
  }

  return new Intl.DateTimeFormat(currentLocale(), {
    month: "short",
    year: "numeric"
  }).format(date);
}

function formatMonth(value) {
  return getQuarterLabel(value);
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}
