# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

**buyornot** — אפליקציית ניתוח מניות דו-לשונית (עברית/אנגלית) המיועדת לאנשים ללא ידע בשוק ההון.
המשתמש מחפש מניה, המערכת מנתחת אותה לפי קריטריונים מקצועיים ומייצרת אינדיקטור: 🔴 אל תקנה / 🟡 המתן / 🟢 קנה.

**Deploy:** GitHub Pages — `oranmikell-wq.github.io/buyornot`

## Tech Stack

- מבנה מרובה קבצים — ללא build system, ללא npm
- Vanilla JS + CSS
- localStorage לאחסון (watchlist, היסטוריית חיפושים)
- GitHub Pages לדפלוי

## מבנה קבצים

```
buyornot/
├── index.html        # מבנה HTML בלבד
├── css/
│   ├── main.css      # עיצוב כללי, משתני צבע, light/dark
│   ├── home.css      # דף הבית
│   ├── results.css   # דף תוצאות
│   └── compare.css   # דף השוואה
└── js/
    ├── app.js        # ניהול ניווט בין דפים, אתחול
    ├── api.js        # כל קריאות ה-API + corsproxy
    ├── scoring.js    # מנוע הציון המשוקלל
    ├── chart.js      # TradingView Lightweight Charts
    ├── watchlist.js  # watchlist + התראות
    ├── compare.js    # השוואת מניות
    └── i18n.js       # תרגומים עברית/אנגלית
```

## Architecture

### מבנה הדף

**Home Page:**
- Search bar גדול במרכז (Google-style)
- 5 מניות טרנדינג מתחת עם badge: 🔴/🟡/🟢
- Light/Dark mode toggle
- שפה: עברית כברירת מחדל, toggle לאנגלית

**Results Page:**
- Gauge/speedometer אנימטי עם ציון 0–100 — בולט בראש הדף
- אינדיקטור: 🔴 0–40 / 🟡 41–65 / 🟢 66–100
- גרף מחיר מלא עם טווחים: 1W / 1M / 3M / 6M / 1Y / 3Y / 5Y
- טבלת קריטריונים (ראה למטה)
- כפתור השוואה (עד 3 מניות)

**Comparison Page:**
- גרפים זה ליד זה
- ביצועים יחסיים (% שינוי מנקודת התחלה)
- טבלה השוואתית שורה-שורה

**Watchlist:**
- שמירת מניות למעקב
- התראה בתוך האפליקציה כשה-rating משתנה (🟡→🟢 וכו')

### קריטריונים + משקלות

| # | קטגוריה | משקל | נימוק |
|---|---------|------|-------|
| 1 | צמיחת רווחים (EPS Growth) | 18% | הפרדיקטור החזק ביותר לטווח ארוך |
| 2 | מכפילים (P/E, P/B, P/S) | 18% | בסיס כל ניתוח פונדמנטלי |
| 3 | צמיחת הכנסות (Revenue Growth) | 12% | איכות הצמיחה |
| 4 | המלצות אנליסטים | 12% | sentiment מקצועי |
| 5 | מומנטום מחיר | 12% | חזק לטווח בינוני |
| 6 | אחזקות מוסדיים | 8% | "כסף חכם" |
| 7 | חוב (Debt/Equity) | 8% | בריאות פיננסית |
| 8 | טכני (RSI, MACD) | 6% | פחות אמין לבדו |
| 9 | מרחק משיא (52w / ATH) | 4% | הקשר מחיר |
| 10 | שיאים שנשברו (1y/3y/5y) | 2% | עוצמת טרנד |

- כל קריטריון מוצג תמיד (לא ניתן להסתיר)
- כשאין נתון: מציג "אין מידע", לא מחשב בציון
- משקלות קבועות (המשתמש לא יכול לשנות)
- כל קריטריון כולל tooltip המסביר מה הוא אומר

### מקורות נתונים

| נתון | מקור | הערות |
|------|------|-------|
| מחיר, P/E, P/B, P/S, 52w high/low | Yahoo Finance | לא רשמי, דרך corsproxy |
| היסטוריית מחירים (RSI, MACD, גרף, שיאים) | Yahoo Finance | |
| המלצות אנליסטים, אחזקות מוסדיים | Finnhub | יש API key |
| EPS, Revenue, Debt/Equity | Financial Modeling Prep | חינמי, 250 req/day |
| מניות TASE | TASE API / Maya API | ריאל-טיים בשעות מסחר (9:00–17:30), מחוץ לשעות — מחיר אחרון עם תווית "סגור" |
| מניות טרנדינג (דף הבית) | רשימה קבועה S&P 500 + Finnhub | |

### TASE
- חיפוש לפי שם עברי **ולפי** מספר ניירת
- שעות מסחר: 9:00–17:30 → מחיר ריאל-טיים
- מחוץ לשעות → מחיר אחרון + תווית "סגור"

### עיצוב
- Light/Dark mode toggle
- רקע: לבן (light) / שחור (dark)
- צבע ראשי: ירוק
- RTL עברית, LTR אנגלית
- ברירת מחדל: עברית

### אחסון (localStorage)
- `bon-watchlist` — מניות במעקב
- `bon-history` — היסטוריית חיפושים אחרונים
- `bon-theme` — light/dark
- `bon-lang` — שפה נבחרת

## Libraries

| ספרייה | מטרה | אופן שימוש |
|--------|------|-----------|
| [TradingView Lightweight Charts](https://github.com/tradingview/lightweight-charts) | גרפי מחיר | CDN, Apache 2.0 |

## Key Conventions

- כל ה-API calls דרך corsproxy.io (CORS) או allorigins.win כ-fallback
- API keys נשמרים ב-localStorage, לא hardcoded
- ציון סופי = סכום (ציון קטגוריה × משקל) — רק קטגוריות עם נתון תקף
- מניה ללא מספיק נתונים → הציון מוצג עם אזהרה "נתונים חלקיים"
