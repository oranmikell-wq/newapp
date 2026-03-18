// i18n.js — תרגומים עברית/אנגלית

const TRANSLATIONS = {
  he: {
    tagline: 'ניתוח מניות בלחיצת כפתור',
    searchPlaceholder: 'חפש מניה... (AAPL, תל אביב, אמזון)',
    search: 'חפש',
    trending: 'מניות טרנדינג',
    recentSearches: 'חיפושים אחרונים',
    analyzing: 'מנתח מניה...',
    stockNotFound: 'המניה לא נמצאה',
    back: 'חזור',
    offlineData: 'נתונים מ-',
    partialData: 'נתונים חלקיים',
    price: 'מחיר',
    marketCap: 'שווי שוק',
    beta: 'תנודתיות (Beta)',
    dividend: 'דיבידנד',
    earningsDate: 'דוח הבא',
    priceTarget: 'מחיר יעד',
    analysis: 'ניתוח מפורט',
    news: 'חדשות אחרונות',
    addToCompare: 'הוסף להשוואה',
    disclaimer: 'אין לראות בניתוח זה ייעוץ פיננסי. המידע מוצג למטרות לימודיות בלבד.',
    compare: 'השוואת מניות',
    watchlist: 'רשימת מעקב',
    home: 'בית',
    buy: 'אזור מעניין',
    wait: 'המתן',
    sell: 'אזור לא מעניין',
    noData: 'אין מידע',
    daysUntil: 'בעוד {n} ימים',
    daysAgo: 'לפני {n} ימים',
    today: 'היום',
    sector_technology: 'טכנולוגיה',
    sector_financials: 'בנקים ופיננסים',
    sector_energy: 'אנרגיה',
    sector_healthcare: 'בריאות',
    sector_real_estate: 'נדל"ן',
    sector_consumer: 'צריכה',
    sector_industrials: 'תעשייה',
    sector_communication: 'תקשורת',
    sector_utilities: 'תשתיות',
    sector_materials: 'חומרים',
    criteria_eps: 'צמיחת רווחים (EPS)',
    criteria_eps_desc: 'האם החברה מגדילה את הרווח למניה משנה לשנה? ציון גבוה = צמיחה עקבית.',
    criteria_multiples: 'מכפילים (P/E, P/B, P/S)',
    criteria_multiples_desc: 'האם המניה זולה יחסית לסקטור שלה? P/E נמוך = מניה זולה יחסית לרווחים.',
    criteria_revenue: 'צמיחת הכנסות',
    criteria_revenue_desc: 'האם ההכנסות של החברה גדלות? צמיחה עקבית מעידה על ביקוש גובר.',
    criteria_analysts: 'המלצות אנליסטים',
    criteria_analysts_desc: 'מה אנליסטים מקצועיים חושבים על המניה? מבוסס על ממוצע המלצות קנה/מכור.',
    criteria_momentum: 'מומנטום מחיר',
    criteria_momentum_desc: 'האם המניה במגמת עלייה? מניות שעולות נוטות להמשיך לעלות בטווח הקצר.',
    criteria_institutional: 'אחזקות מוסדיים',
    criteria_institutional_desc: 'כמה מהמניות מוחזקות על ידי קרנות ובנקים גדולים? "כסף חכם" = אינדיקציה חיובית.',
    criteria_debt: 'חוב (Debt/Equity)',
    criteria_debt_desc: 'האם לחברה יש חוב גבוה? חוב נמוך = בריאות פיננסית טובה יותר.',
    criteria_technical: 'אינדיקטורים טכניים (RSI, MACD)',
    criteria_technical_desc: 'RSI מודד האם המניה קנויה יתר על המידה. MACD מראה שינויי מגמה.',
    criteria_ath: 'מרחק משיא (52w / ATH)',
    criteria_ath_desc: 'כמה רחוקה המניה מהשיא שלה? מניה קרובה לשיא = עוצמה; רחוקה מאוד = אולי הזדמנות.',
    criteria_highs: 'שיאים שנשברו',
    criteria_highs_desc: 'כמה פעמים המניה שברה שיאים חדשים בשנה/3 שנים/5 שנים? מעיד על טרנד חזק.',
    about: 'אודותינו',
    about_what_title: 'מה זה Interesting Zone?',
    about_what_body: 'Interesting Zone היא אפליקציית ניתוח מניות חינמית המיועדת לכולם — ללא צורך בידע פיננסי. הזן סימול מניה וקבל דירוג מיידי: קנה / המתן / אל תקנה, המבוסס על 10 קריטריונים מקצועיים.',
    about_how_title: 'איך מחושב הציון?',
    about_data_title: 'מקורות מידע',
    about_data_body: 'נתוני מחיר מגיעים מ-Yahoo Finance בזמן אמת. נתונים פונדמנטליים (P/E, צמיחה, חוב, המלצות אנליסטים) מגיעים מ-Twelve Data. חדשות מגיעות מ-Yahoo Finance. כל הנתונים נשמרים מקומית לביצועים אופטימליים.',
    about_disclaimer_title: 'הצהרת אחריות',
    watchlistAdded: 'נוסף לרשימת המעקב',
    watchlistRemoved: 'הוסר מרשימת המעקב',
    watchlistEmpty: 'רשימת המעקב ריקה',
    compareEmpty: 'אין מניות להשוואה',
    compareMax: 'ניתן להשוות עד 3 מניות',
    compareAdded: 'נוסף להשוואה',
    removeFromCompare: 'הסר מהשוואה',
    linkCopied: 'הקישור הועתק!',
    ratingChanged: 'הדירוג של {symbol} השתנה: {old} → {new}',
    closed: 'סגור',
    taseMarketHours: 'שעות מסחר: 9:00–17:30',
  },
  en: {
    tagline: 'Stock analysis in one click',
    searchPlaceholder: 'Search stock... (AAPL, Tesla, Apple)',
    search: 'Search',
    trending: 'Trending Stocks',
    recentSearches: 'Recent Searches',
    analyzing: 'Analyzing stock...',
    stockNotFound: 'Stock not found',
    back: 'Back',
    offlineData: 'Data from ',
    partialData: 'Partial data',
    price: 'Price',
    marketCap: 'Market Cap',
    beta: 'Beta',
    dividend: 'Dividend',
    earningsDate: 'Next Earnings',
    priceTarget: 'Price Target',
    analysis: 'Detailed Analysis',
    news: 'Latest News',
    addToCompare: 'Add to Compare',
    disclaimer: 'This analysis is not financial advice. For educational purposes only.',
    compare: 'Compare Stocks',
    watchlist: 'Watchlist',
    home: 'Home',
    buy: 'Interesting Zone',
    wait: 'Wait',
    sell: 'Not Interesting',
    noData: 'No data',
    daysUntil: 'In {n} days',
    daysAgo: '{n} days ago',
    today: 'Today',
    sector_technology: 'Technology',
    sector_financials: 'Financials',
    sector_energy: 'Energy',
    sector_healthcare: 'Healthcare',
    sector_real_estate: 'Real Estate',
    sector_consumer: 'Consumer',
    sector_industrials: 'Industrials',
    sector_communication: 'Communication',
    sector_utilities: 'Utilities',
    sector_materials: 'Materials',
    criteria_eps: 'Earnings Growth (EPS)',
    criteria_eps_desc: 'Is the company growing earnings per share year over year? High score = consistent growth.',
    criteria_multiples: 'Valuation (P/E, P/B, P/S)',
    criteria_multiples_desc: 'Is the stock cheap relative to its sector? Low P/E = cheap relative to earnings.',
    criteria_revenue: 'Revenue Growth',
    criteria_revenue_desc: 'Are revenues growing? Consistent growth signals increasing demand.',
    criteria_analysts: 'Analyst Recommendations',
    criteria_analysts_desc: 'What do professional analysts think? Based on average buy/sell ratings.',
    criteria_momentum: 'Price Momentum',
    criteria_momentum_desc: 'Is the stock trending up? Rising stocks tend to keep rising short-term.',
    criteria_institutional: 'Institutional Holdings',
    criteria_institutional_desc: 'How much is held by large funds and banks? "Smart money" is a positive signal.',
    criteria_debt: 'Debt (Debt/Equity)',
    criteria_debt_desc: 'Does the company carry heavy debt? Low debt = better financial health.',
    criteria_technical: 'Technical Indicators (RSI, MACD)',
    criteria_technical_desc: 'RSI measures if a stock is overbought. MACD shows trend changes.',
    criteria_ath: 'Distance from High (52w / ATH)',
    criteria_ath_desc: 'How far is the stock from its high? Near ATH = strength; Far = maybe opportunity.',
    criteria_highs: 'Highs Broken',
    criteria_highs_desc: 'How many new highs has the stock set in 1/3/5 years? Signals strong trend.',
    about: 'About Us',
    about_what_title: 'What is Interesting Zone?',
    about_what_body: 'Interesting Zone is a free stock analysis app designed for everyone — no financial background needed. Enter any stock symbol and get an instant Buy / Wait / Don\'t Buy rating based on 10 professional criteria.',
    about_how_title: 'How does the score work?',
    about_data_title: 'Data Sources',
    about_data_body: 'Price data is sourced from Yahoo Finance in real time. Fundamental data (P/E, growth, debt, analyst ratings) is sourced from Twelve Data. News is fetched from Yahoo Finance. All data is cached locally for performance.',
    about_disclaimer_title: 'Disclaimer',
    watchlistAdded: 'Added to watchlist',
    watchlistRemoved: 'Removed from watchlist',
    watchlistEmpty: 'Watchlist is empty',
    compareEmpty: 'No stocks to compare',
    compareMax: 'Up to 3 stocks can be compared',
    compareAdded: 'Added to comparison',
    removeFromCompare: 'Remove from Compare',
    linkCopied: 'Link copied!',
    ratingChanged: '{symbol} rating changed: {old} → {new}',
    closed: 'Closed',
    taseMarketHours: 'Market hours: 9:00–17:30',
  }
};

let currentLang = localStorage.getItem('bon-lang') || 'en';

function t(key, vars = {}) {
  let str = TRANSLATIONS[currentLang][key] || TRANSLATIONS['he'][key] || key;
  Object.entries(vars).forEach(([k, v]) => { str = str.replace(`{${k}}`, v); });
  return str;
}

function setLang(lang) {
  currentLang = lang;
  localStorage.setItem('bon-lang', lang);
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
  applyTranslations();
  // Re-render dynamic content if on results page
  if (typeof currentStock !== 'undefined' && currentStock &&
      document.getElementById('page-results')?.classList.contains('active')) {
    renderResults(currentStock, currentStock);
    applyTranslations();
  }
  // Re-render trending badges on home page
  if (typeof renderTrendingList === 'function') renderTrendingList();
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.textContent = currentLang === 'he' ? 'EN' : 'עב';
  });
}

function toggleLang() {
  setLang(currentLang === 'he' ? 'en' : 'he');
}
