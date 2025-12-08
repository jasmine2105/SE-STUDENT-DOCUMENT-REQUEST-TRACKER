// Shared notifications helper
(function (global) {
  const Notifications = {
    async fetchNotifications(userId) {
      try {
        // The server uses authMiddleware to get userId from token, so we don't need to pass it in query
        // But we'll log it for debugging
        console.log('🔔 Fetching notifications, userId from param:', userId);
        const currentUser = Utils.getCurrentUser();
        console.log('🔔 Current user from localStorage:', currentUser?.id, currentUser?.fullName);
        
        const endpoint = '/notifications';
        const data = await Utils.apiRequest(endpoint, { method: 'GET' });
        
        console.log('🔔 Notifications received:', Array.isArray(data) ? data.length : 0, 'notifications');
        if (Array.isArray(data) && data.length > 0) {
          console.log('  Sample notification:', data[0].title);
        }
        
        return Array.isArray(data) ? data : [];
      } catch (error) {
        console.error('❌ Notifications fetch failed:', error.message || error);
        return [];
      }
    },

    renderNotificationItem(n, onClick) {
      const div = document.createElement('div');
      div.className = 'notification-item';
      if (n.request_id || n.requestId) {
        div.style.cursor = 'pointer';
        div.dataset.requestId = n.request_id || n.requestId;
      }
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
      
      // Add click handler if provided and notification has a request_id
      if (onClick && (n.request_id || n.requestId)) {
        div.addEventListener('click', () => {
          onClick(n.request_id || n.requestId, n);
        });
      }
      
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

    async init({ userId, bellId, countId, dropdownId, listId, markAllBtnId, onNotificationClick }) {
      const bell = document.getElementById(bellId);
      const countEl = document.getElementById(countId);
      const dropdown = document.getElementById(dropdownId);
      const list = document.getElementById(listId);
      const markAllBtn = markAllBtnId ? document.getElementById(markAllBtnId) : null;

      if (!bell || !countEl || !dropdown || !list) return;

      async function refresh() {
        console.log('🔄 Refreshing notifications...');
        const notifications = await Notifications.fetchNotifications(userId);
        console.log('🔄 Refresh complete, got', notifications.length, 'notifications');
        
        list.innerHTML = '';
        if (!notifications.length) {
          console.log('⚠️ No notifications to display');
          const empty = document.createElement('div');
          empty.className = 'empty-state';
          empty.innerHTML = '<div class="empty-state-icon">🔕</div><h4>No notifications</h4>';
          list.appendChild(empty);
          countEl.classList.add('hidden');
          countEl.textContent = '0';
          return;
        }
        
        console.log('✅ Rendering', notifications.length, 'notifications');

        notifications.forEach(n => {
          const item = Notifications.renderNotificationItem(n, (requestId, notification) => {
            // Close dropdown
            dropdown.classList.add('hidden');
            // Call the custom click handler if provided
            if (onNotificationClick) {
              onNotificationClick(requestId, notification);
            }
          });
          list.appendChild(item);
        });
        
        const unreadCount = notifications.filter(n => !n.read_flag && !n.read).length || 0;
        if (unreadCount > 0) {
          countEl.classList.remove('hidden');
          countEl.textContent = String(unreadCount);
        } else {
          countEl.classList.add('hidden');
          countEl.textContent = '0';
        }
      }

      // Toggle dropdown and refresh when opened
      bell.addEventListener('click', async (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        dropdown.classList.toggle('hidden');
        
        // Refresh notifications when opening the dropdown
        if (isHidden) {
          console.log('🔔 Bell clicked, refreshing notifications...');
          await refresh();
        }
      });
      
      // Close dropdown when clicking outside
      document.addEventListener('click', (e) => {
        if (!bell.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.classList.add('hidden');
        }
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

      // Auto-refresh notifications every 30 seconds
      const refreshInterval = setInterval(async () => {
        // Only refresh if dropdown is closed (to avoid interrupting user)
        if (dropdown.classList.contains('hidden')) {
          await refresh();
        }
      }, 30000);

      // Expose a manual refresh and cleanup
      return { 
        refresh,
        destroy: () => {
          clearInterval(refreshInterval);
        }
      };
    }
  };

  global.Notifications = Notifications;
})(window);
