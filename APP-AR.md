# تحويل Sheen إلى تطبيق أندرويد (APK)

نفس طريقة QUARK AI: مشروع Capacitor يُبنى تلقائيًا في GitHub Actions، ولا تحتاج Android Studio.

## الخطوات (من الهاتف أو الحاسوب)
1. أنشئ مستودعًا جديدًا على GitHub وارفع **كل محتويات هذا المجلد** (بما فيها المجلد المخفي `.github`).
2. افتح تبويب **Actions** ← **Build APK** ← **Run workflow**.
3. بعد دقائق نزّل الملف `sheen-apk` من أسفل صفحة التشغيل، وفكّ الضغط، ثم ثبّت `app-debug.apk` (أو `app-release.apk`).

## التوقيع الثابت (اختياري)
أضف في Settings ← Secrets ← Actions الأسرار: `KEYSTORE_BASE64` و`KEYSTORE_PASSWORD` و`KEY_ALIAS` و`KEY_PASSWORD`.
يمكنك استعمال نفس مفتاح QUARK AI، فيتحدّث التطبيق فوق النسخة القديمة بدل حذفه.

## مهم
- التطبيق يحتاج الإنترنت (Supabase). شغّل `supabase/schema-v11.sql` و`schema-v12.sql` مرة واحدة.
- معرّف التطبيق `com.sheen.app` وتغييره من `capacitor.config.json`.
- زر الرجوع في أندرويد يغلق الشاشة المفتوحة، وإن لم توجد يصغّر التطبيق.
- للتثبيت من المتصفح بدل APK: ارفع الملفات على استضافة HTTPS ثم «إضافة إلى الشاشة الرئيسية».
- الإشعارات الفورية والتطبيق مغلق تحتاج Firebase، وهي خطوة لاحقة.
