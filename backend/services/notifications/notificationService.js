/**
 * NotificationService - Orchestrates notification delivery for the chat system.
 * Uses a pluggable provider pattern to support different notification backends.
 * 
 * Currently supports:
 * - Sent.dm (SMS + WhatsApp via unified API)
 * 
 * Future providers can be added by implementing NotificationProvider interface.
 */
import pool from '../../config/database.js';
import { SentProvider } from './sentProvider.js';

class NotificationService {
  constructor() {
    this.provider = null;
    this._initialized = false;
  }

  /**
   * Initialize with default provider (Sent.dm) if configured.
   */
  initialize() {
    if (this._initialized) return;

    const sentProvider = new SentProvider();
    if (sentProvider.isConfigured()) {
      this.provider = sentProvider;
      console.log(`✅ Notification provider initialized: ${sentProvider.name}`);
    } else {
      console.log('ℹ️  No notification provider configured. External notifications disabled.');
    }
    this._initialized = true;
  }

  /**
   * Set a custom notification provider.
   * @param {import('./notificationProvider.js').NotificationProvider} provider
   */
  setProvider(provider) {
    this.provider = provider;
    console.log(`✅ Notification provider set: ${provider.name}`);
  }

  /**
   * Check if notifications are available.
   */
  isAvailable() {
    return this.provider?.isConfigured() || false;
  }

  /**
   * Notify offline participants about a new chat message.
   * Only sends to users who are offline and have a phone number on file.
   * 
   * @param {string} conversationId - The conversation the message was sent in
   * @param {string} senderId - The user who sent the message
   * @param {string} senderName - Display name of the sender
   * @param {string} content - Message content (will be truncated for SMS)
   */
  async notifyOfflineParticipants(conversationId, senderId, senderName, content) {
    if (!this.isAvailable()) return;

    try {
      // Get offline participants with phone numbers (excluding sender)
      const result = await pool.query(
        `SELECT u.id, u.name, u.phone, u.email
         FROM conversation_participants cp
         JOIN users u ON cp.user_id = u.id
         WHERE cp.conversation_id = $1
           AND u.id != $2
           AND u.is_online = false
           AND u.phone IS NOT NULL`,
        [conversationId, senderId]
      );

      if (result.rows.length === 0) return;

      // Truncate content for SMS
      const truncatedContent = content.length > 100 
        ? content.substring(0, 97) + '...' 
        : content;

      const notificationMessage = `${senderName}: ${truncatedContent}`;

      // Send notifications in parallel (fire-and-forget)
      const promises = result.rows.map(user =>
        this.provider.sendMessage(user.phone, notificationMessage, {
          variables: {
            senderName,
            message: truncatedContent,
            recipientName: user.name,
          },
        }).catch(err => {
          console.error(`Failed to notify user ${user.id}:`, err.message);
        })
      );

      await Promise.allSettled(promises);
    } catch (error) {
      // Notification failures should never break the chat flow
      console.error('Error sending offline notifications:', error.message);
    }
  }

  /**
   * Send a direct notification to a specific user.
   * @param {string} userId - User to notify
   * @param {string} message - Notification message
   * @param {Object} options - Additional options
   */
  async notifyUser(userId, message, options = {}) {
    if (!this.isAvailable()) return;

    try {
      const result = await pool.query(
        'SELECT phone, name FROM users WHERE id = $1 AND phone IS NOT NULL',
        [userId]
      );

      if (result.rows.length === 0) return;

      const user = result.rows[0];
      return this.provider.sendMessage(user.phone, message, {
        variables: {
          recipientName: user.name,
          message,
          ...options.variables,
        },
        ...options,
      });
    } catch (error) {
      console.error(`Error notifying user ${userId}:`, error.message);
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();
export default notificationService;
