/**
 * SentProvider - Sent.dm notification provider implementation.
 * Uses the Sent.dm unified API for SMS and WhatsApp messaging.
 * API docs: https://docs.sent.dm
 */
import { NotificationProvider } from './notificationProvider.js';

const SENT_API_BASE = 'https://api.sent.dm/v2';

export class SentProvider extends NotificationProvider {
  /**
   * @param {Object} config
   * @param {string} config.senderId - Sent.dm x-sender-id
   * @param {string} config.apiKey - Sent.dm x-api-key
   * @param {string} [config.defaultTemplateId] - Default template ID for notifications
   */
  constructor(config = {}) {
    super(config);
    this.senderId = config.senderId || process.env.SENT_SENDER_ID;
    this.apiKey = config.apiKey || process.env.SENT_API_KEY;
    this.defaultTemplateId = config.defaultTemplateId || process.env.SENT_DEFAULT_TEMPLATE_ID;
  }

  get name() {
    return 'sent.dm';
  }

  isConfigured() {
    return !!(this.senderId && this.apiKey);
  }

  /**
   * Make an authenticated request to the Sent.dm API.
   */
  async _request(endpoint, body) {
    if (!this.isConfigured()) {
      return { success: false, error: 'Sent.dm provider is not configured' };
    }

    try {
      const response = await fetch(`${SENT_API_BASE}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-sender-id': this.senderId,
          'x-api-key': this.apiKey,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.message || `Sent.dm API error: ${response.status}`,
        };
      }

      const data = await response.json();
      return {
        success: true,
        messageId: data.messageId,
        channel: data.channel,
      };
    } catch (error) {
      console.error('Sent.dm API request failed:', error.message);
      return { success: false, error: error.message };
    }
  }

  async sendSMS(phoneNumber, message, options = {}) {
    return this._request('/messages/contact', {
      phoneNumber,
      templateId: options.templateId || this.defaultTemplateId,
      channel: 'sms',
      variables: options.variables || { message },
    });
  }

  async sendWhatsApp(phoneNumber, message, options = {}) {
    return this._request('/messages/contact', {
      phoneNumber,
      templateId: options.templateId || this.defaultTemplateId,
      channel: 'whatsapp',
      variables: options.variables || { message },
    });
  }

  async sendMessage(phoneNumber, message, options = {}) {
    // Let Sent.dm's intelligent routing decide the best channel
    return this._request('/messages/contact', {
      phoneNumber,
      templateId: options.templateId || this.defaultTemplateId,
      variables: options.variables || { message },
    });
  }
}

export default SentProvider;
