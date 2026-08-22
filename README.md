# שגרת טיפוח — Skincare Analysis

אתר שסורק רשימות רכיבים של מוצרי טיפוח (מהמצלמה או מקובץ), מנתח אותן מול מאגר רכיבים, ונותן ציון איכות והתאמה לסוג עור. המוצרים נשמרים בפרופיל אישי עם שגרת בוקר ושגרת ערב הניתנות לעריכה.

אתר סטטי (Vite + React) שרץ מ-GitHub Pages, עם Supabase (Postgres + Auth) כ-backend הנקרא ישירות מהדפדפן. זיהוי הטקסט מהתמונה נעשה במלואו בדפדפן (Tesseract.js) ומאגר הרכיבים הוא מאגר חינמי שנבנה מראש ומתעדכן עם השימוש — אין תלות בשירותי AI/OCR בתשלום.

## הרצה מקומית

```bash
npm install
cp .env.example .env   # מלאו VITE_SUPABASE_URL ו-VITE_SUPABASE_ANON_KEY
npm run dev
```

**טיפ לפיתוח**: כדי לדלג על מסך ההתחברות בכל טעינה מקומית, הירשמו פעם אחת עם משתמש בדיקה ואז מלאו את `VITE_DEV_AUTO_LOGIN_EMAIL`/`VITE_DEV_AUTO_LOGIN_PASSWORD` ב-`.env` — האפליקציה תתחבר איתו אוטומטית ב-`npm run dev` בלבד. זה לא פעיל ב-build לפרודקשן (`npm run build`), כך שב-GitHub Pages תמיד מוצג מסך ההתחברות האמיתי.

## הקמת Supabase (חד-פעמי)

1. צרו פרויקט חינמי ב-[Supabase](https://supabase.com).
2. תחת SQL Editor, הריצו את `supabase/schema.sql` (יוצר את כל הטבלאות ומדיניות ה-RLS).
3. תחת Settings → API, העתיקו את ה-Project URL וה-`anon` key ל-`.env` (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), ואת ה-`service_role` key ל-`SUPABASE_SERVICE_ROLE_KEY` (לשימוש מקומי בלבד — לעולם לא לחשוף בצד לקוח).
4. זרעו את מאגר הרכיבים הראשוני. שתי דרכים שקולות:
   - **עם טרמינל**: `npm run seed`
   - **בלי טרמינל (גם מהנייד)**: פתחו את `supabase/seed/ingredients-seed.sql`, העתיקו את כל התוכן, והדביקו/הריצו אותו ב-SQL Editor של Supabase (בדפדפן, אותו מקום שהרצתם בו את `schema.sql`). לא דורש את ה-`service_role` key בכלל.

   כל רכיב חדש שהמערכת נתקלת בו בזמן סריקה נוסף אוטומטית כ"טרם דורג" ומרחיב את המאגר עם הזמן.

## הרצה מהטלפון בלי טרמינל בכלל

כל השלבים למעלה (יצירת פרויקט Supabase, הרצת ה-SQL, קבלת ה-URL וה-`anon` key) אפשריים מדפדפן בנייד — Supabase הוא אתר רגיל. השלב שדורש מחשב/טרמינל הוא רק כתיבת קוד; להרצה חיה בלי טרמינל בכלל:

1. ודאו שהוקם הפרויקט ב-Supabase והורצו `schema.sql` ו-`ingredients-seed.sql` כמו למעלה (מדפדפן).
2. בריפו ב-GitHub (גם מהנייד): **Settings → Secrets and variables → Actions** → הוסיפו שני secrets: `VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY` עם הערכים מ-Supabase (Settings → API).
3. **Settings → Pages** → תחת Source בחרו **GitHub Actions**.
4. ודאו שה-PR של הענף מוזג ל-`main` (זה מפעיל את ה-workflow שבונה ומפרסם את האתר אוטומטית).
5. פתחו בנייד את `https://<username>.github.io/Skincare-Analysis/` — האתר האמיתי, כולל מסך התחברות/הרשמה תקין, כי הוא כבר מחובר ל-Supabase שלכם.

## פריסה ל-GitHub Pages

1. ב-Settings → Pages של הריפו, הגדירו Source = GitHub Actions.
2. הוסיפו ב-Settings → Secrets and variables → Actions את `VITE_SUPABASE_URL` ו-`VITE_SUPABASE_ANON_KEY`.
3. כל push ל-`main` מריץ את `.github/workflows/deploy.yml` שבונה ומפרסם את האתר אוטומטית לכתובת `https://<username>.github.io/Skincare-Analysis/`.

## איך זה עובד

1. **סריקה** — צילום/העלאת תמונה של רשימת הרכיבים → OCR בדפדפן (Tesseract.js) → מסך לעריכת הטקסט המזוהה → בחירת קטגוריית מוצר (סרום/לחות/סבון פנים/טונר וכו').
2. **ניתוח** — כל רכיב ברשימה מותאם (התאמה מדויקת ואז מטושטשת) מול מאגר הרכיבים ב-Supabase. רכיב לא מוכר נוסף כרשומה נייטרלית "טרם דורג" כדי לא לחסום את התהליך.
3. **ציון** — מנוע ניקוד דטרמיניסטי (`src/lib/scoring`) משקלל את איכות הרכיבים לפי מיקום ברשימה (ריכוז יורד לפי כללי INCI) ולפי קטגוריית המוצר (מוצרי שטיפה כמו סבון פנים מקבלים משקל נמוך יותר לרכיבים בעייתיים, כי זמן המגע קצר), ומפיק ציון כללי 0-100 והתאמה מדורגת לסוגי עור.
4. **מטמון** — מוצר עם רצף רכיבים זהה (hash) לא מנותח מחדש — נעשה שימוש חוזר באותה רשומה, וכך המערכת נעשית יעילה יותר ככל שסורקים יותר מוצרים.
5. **שגרות** — מהעמוד "שגרות" ניתן להוסיף/להסיר/לסדר מחדש (גרירה) מוצרים בשגרת בוקר ובשגרת ערב.

## מבנה הפרויקט

```
supabase/
  schema.sql              # טבלאות + RLS
  seed/ingredients-seed.ts # מאגר הרכיבים הראשוני
  seed/run-seed.ts         # סקריפט זריעה חד-פעמי
src/
  lib/scoring/             # מנוע הניקוד (פונקציות טהורות)
  lib/ingredients/         # פענוח, נרמול, התאמה מטושטשת של רכיבים
  lib/ocr/                 # עטיפת Tesseract.js
  lib/data/                # קריאות ל-Supabase (מוצרים, שגרות, פרופיל עור)
  pages/, components/      # ממשק המשתמש
```

## הערה

הדירוגים במאגר הרכיבים הם מידע כללי בלבד, מבוסס ידע כימי-קוסמטי נפוץ ופומבי — אינם ייעוץ רפואי ואינם תחליף לחוות דעת דרמטולוגית.
