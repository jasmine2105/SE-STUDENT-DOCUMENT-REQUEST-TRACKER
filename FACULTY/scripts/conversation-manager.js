// Conversation UI Handler for Faculty Portal
class ConversationManager {
  constructor() {
    this.currentRequestId = null;
    this.messages = [];
  }

  // Show conversation modal for a request
  async showConversation(requestId) {
    this.currentRequestId = requestId;

    // Create modal if it doesn't exist
    let modal = document.getElementById('conversationModal');
    if (!modal) {
      modal = this.createConversationModal();
      document.body.appendChild(modal);
    }

    // Load messages
    await this.loadMessages(requestId);

    // Show modal
    modal.classList.add('active');
  }

  // Create the conversation modal HTML
  createConversationModal() {
    const modal = document.createElement('div');
    modal.id = 'conversationModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="approval-modal" style="max-width: 700px;">
        <div class="modal-header">
          <h2>💬 Conversation Thread</h2>
          <button class="close-modal" onclick="conversationManager.closeModal()">&times;</button>
        </div>
        <div class="conversation-section">
          <div class="conversation-messages" id="conversationMessages">
            <div class="empty-state">
              <p>Loading messages...</p>
            </div>
          </div>
          <div class="conversation-input">
            <textarea id="messageInput" placeholder="Type your message here..."></textarea>
            <button class="btn-send-message" onclick="conversationManager.sendMessage()">Send</button>
          </div>
          <div style="margin-top: 1rem;">
            <label style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.9rem;">
              <input type="checkbox" id="internalMessageCheck" />
              <span>Internal message (visible to faculty and admin only)</span>
            </label>
          </div>
        </div>
      </div>
    `;

    // Close on overlay click
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        this.closeModal();
      }
    });

    return modal;
  }

  // Load messages for a request
  async loadMessages(requestId) {
    try {
      const messages = await Utils.apiRequest(`/conversations/${requestId}`, {
        method: 'GET'
      });

      this.messages = messages;
      this.renderMessages();
    } catch (error) {
      console.error('Failed to load messages:', error);
      const messagesEl = document.getElementById('conversationMessages');
      if (messagesEl) {
        messagesEl.innerHTML = `
          <div class="empty-state">
            <p>Failed to load messages</p>
          </div>
        `;
      }
    }
  }

  // Render messages in the UI
  renderMessages() {
    const messagesEl = document.getElementById('conversationMessages');
    if (!messagesEl) return;

    if (this.messages.length === 0) {
      messagesEl.innerHTML = `
        <div class="empty-state">
          <p>No messages yet. Start the conversation!</p>
        </div>
      `;
      return;
    }

    messagesEl.innerHTML = this.messages.map(msg => {
      const isInternal = msg.is_internal;
      const messageClass = isInternal ? 'conversation-message internal' : 'conversation-message';
      const internalBadge = isInternal ? '<span style="background: #E4B429; color: #000; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600;">INTERNAL</span>' : '';

      return `
        <div class="${messageClass}">
          <div class="message-header">
            <span class="message-author">${msg.full_name || 'Unknown'} (${msg.role || 'user'})</span>
            ${internalBadge}
            <span class="message-time">${this.formatTime(msg.created_at)}</span>
          </div>
          <div class="message-body">${this.escapeHtml(msg.message)}</div>
        </div>
      `;
    }).join('');

    // Scroll to bottom
    messagesEl.scrollTop = messagesEl.scrollHeight;
  }

  // Send a new message
  async sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const internalCheck = document.getElementById('internalMessageCheck');

    if (!messageInput) return;

    const message = messageInput.value.trim();
    if (!message) {
      alert('Please enter a message');
      return;
    }

    const isInternal = internalCheck ? internalCheck.checked : false;

    try {
      await Utils.apiRequest(`/conversations/${this.currentRequestId}`, {
        method: 'POST',
        body: JSON.stringify({
          message,
          isInternal
        })
      });

      // Clear input
      messageInput.value = '';
      if (internalCheck) internalCheck.checked = false;

      // Reload messages
      await this.loadMessages(this.currentRequestId);
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  // Close the modal
  closeModal() {
    const modal = document.getElementById('conversationModal');
    if (modal) {
      modal.classList.remove('active');
    }
  }

  // Helper: Format timestamp
  formatTime(timestamp) {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;

    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  // Helper: Escape HTML
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}

// Initialize global conversation manager
const conversationManager = new ConversationManager();
