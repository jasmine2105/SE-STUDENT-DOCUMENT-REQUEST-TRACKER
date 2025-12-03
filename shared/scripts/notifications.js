// Shared notifications helper
(function (global) {
  const Notifications = {
    async fetchNotifications(userId) {
      try {
        const endpoint = userId ? `/notifications?userId=${encodeURIComponent(userId)}` : '/notifications';
        const data = await Utils.apiRequest(endpoint, { method: 'GET' });
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.warn('Notifications fetch failed:', error.message || error);
        return [];
      }
    },

    renderNotificationItem(n) {
      const div = document.createElement('div');
      div.className = 'notification-item';
      const title = document.createElement('div');
      title.className = 'notification-title';
      title.textContent = n.title || 'Notification';
      const msg = document.createElement('div');
      msg.className = 'notification-message';
      msg.textContent = n.message || '';
      const time = document.createElement('div');
      time.className = 'notification-time';
      time.textContent = Utils.formatRelativeTime(n.created_at || n.createdAt || n.createdAtTimestamp);
      div.appendChild(title);
      div.appendChild(msg);
      div.appendChild(time);
      div.dataset.notificationId = n.id;
      return div;
    },

    async markAllRead(ids = []) {
      try {
        // Attempt to call a server endpoint if exists
        await Utils.apiRequest('/notifications/mark-read', { method: 'POST', body: { ids } });
      } catch (err) {
        // If server endpoint is not available, silently continue
        console.info('markAllRead: server endpoint not available or failed', err.message || err);
      }
    },

    async init({ userId, bellId, countId, dropdownId, listId, markAllBtnId }) {
      const bell = document.getElementById(bellId);
      const countEl = document.getElementById(countId);
      const dropdown = document.getElementById(dropdownId);
      const list = document.getElementById(listId);
      const markAllBtn = markAllBtnId ? document.getElementById(markAllBtnId) : null;

      if (!bell || !countEl || !dropdown || !list) return;

      async function refresh() {
        const notifications = await Notifications.fetchNotifications(userId);
        list.innerHTML = '';
        if (!notifications.length) {
          const empty = document.createElement('div');
          empty.className = 'empty-state';
          empty.innerHTML = '<div class="empty-state-icon">🔕</div><h4>No notifications</h4>';
          list.appendChild(empty);
          countEl.classList.add('hidden');
          countEl.textContent = '0';
          return;
        }

        notifications.forEach(n => list.appendChild(Notifications.renderNotificationItem(n)));
        const unreadCount = notifications.filter(n => !n.read_flag && !n.read).length || 0;
        if (unreadCount > 0) {
          countEl.classList.remove('hidden');
          countEl.textContent = String(unreadCount);
        } else {
          countEl.classList.add('hidden');
          countEl.textContent = '0';
        }
      }

      // Toggle dropdown
      bell.addEventListener('click', (e) => {
        dropdown.classList.toggle('hidden');
      });

      if (markAllBtn) {
        markAllBtn.addEventListener('click', async () => {
          const items = Array.from(list.querySelectorAll('[data-notification-id]'));
          const ids = items.map(i => Number(i.dataset.notificationId)).filter(Boolean);
          await Notifications.markAllRead(ids);
          // locally clear
          items.forEach(it => it.classList.add('read'));
          countEl.classList.add('hidden');
        });
      }

      // Initial fetch
      await refresh();

      // Expose a manual refresh
      return { refresh };
    }
  };

  global.Notifications = Notifications;
})(window);
