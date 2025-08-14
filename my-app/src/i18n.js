import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const resources = {
  en: {
    translation: {
      // Header
      dashboard: 'Dashboard',
      logout: 'Logout',

      // DashboardPage
      invoicesDashboard: 'Invoices Dashboard',
      totalIncome: 'Total Income',
      totalCredits: 'Total Credits',
      netTotal: 'Net Total',
      invoices: 'invoices',
      creditNotes: 'credit notes',
      allInvoices: 'All invoices',
      searchInvoices: 'Search invoices...',
      startDate: 'Start Date',
      endDate: 'End Date',
      clear: 'Clear',
      alertInvoice: 'There are invoices with missing fields – highlighted in red.',
      // Table Headers
      file: 'File',
      date: 'Date',
      amount: 'Amount',
      reference: 'Reference',
      city: 'City',
      rowCount: 'Row Count',
      actions: 'Actions',
      next: 'Next',
      previous: 'Previous',
      total: 'Total',
      perPage: 'Per Page',
      page: 'Page',
      of: 'of',
      cancel: 'Cancel',
      save: 'Save',
      undo: 'Undo',
      confirm: 'Confirm',
      edit: 'Edit',
      all: 'ALL',
      negativeAmount: 'Negative Amounts',
      allCities: 'All Cities',

      //Main page
    },
  },
  he: {
    translation: {
      // Header
      dashboard: 'לוח בקרה',
      logout: 'התנתק',

      // Invoice page
      invoicesDashboard: 'לוח חשבוניות',
      totalIncome: 'סך הכל הכנסות',
      totalCredits: 'סך הכל זיכויים',
      netTotal: 'סך הכל נטו',
      invoices: 'חשבוניות',
      creditNotes: 'חשבוניות זיכוי',
      allInvoices: 'כל החשבוניות',
      searchInvoices: 'חיפוש חשבוניות',
      startDate: 'תאריך התחלה',
      endDate: 'תאריך סיום',
      clear: 'נקה',
      alertInvoice: '.ישנן חשבוניות עם שדות חסרים - מסומנות באדום',
      // Table Headers
      file: 'קובץ',
      date: 'תאריך',
      amount: 'סכום',
      reference: 'אסמכתא',
      city: 'עיר',
      rowCount: 'מספר שורות',
      actions: 'פעולות',
      next: 'הבא',
      previous: 'הקודם',
      total: 'סך הכל',
      perPage: 'לכל עמוד',
      page: 'עמוד',
      of: 'מתוך',
      cancel: 'לבטל',
      save: 'לשמור',
      undo: 'לבטל',
      confirm: 'לאשר',
      edit: 'לערוך',
      all: 'הכל',
      negativeAmount: 'סכומים שליליים',
      allCities: 'כל הערים',
    },
  },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
    },
  });

export default i18n;
