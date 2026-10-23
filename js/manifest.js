/* Rippl — قائمة ملفات JS بالترتيب الدقيق لتشغيلها.
   الملفات تتشارك نطاقًا واحدًا (مثل الملف الأصلي)، فلا تغيّر الترتيب. */
window.RIPPL_MANIFEST = {
  scripts: [
    'js/core/app-core.js',
    'js/pages/users/user-profile.js',
    'js/pages/inbox/new-group.js',
    'js/features/status-sheet.js',
    'js/pages/inbox/inbox.js',
    'js/pages/notifications/notifications.js',
    'js/pages/home/feed.js',
    'js/pages/profile/my-profile.js',
    'js/features/post-actions.js',
    'js/pages/home/composer.js',
    'js/core/tabs.js',
    'js/pages/chat/chat.js',
    'js/pages/servers/servers.js',
    'js/core/auth-gate-preshow.js',
    'js/features/auth.js',
    'js/pages/profile/edit-profile.js',
    'js/pages/profile/settings.js',
    'js/features/offline-db.js',
    'js/features/chats-sync.js',
    'js/features/feed-sync.js',
    'js/features/social-sync.js',
    'js/features/notifications-sync.js',
    'js/features/live-presence.js',
    'js/features/pull-refresh.js',
    'js/features/scroll-hide.js',
    'js/core/native-shell.js'
  ]
};
