/**
 * NotificationProvider - Abstract interface for notification providers.
 * All notification providers must implement this interface.
 * This enables swapping between providers (Sent.dm, Twilio, etc.)
 * without changing business logic.
 */
export class NotificationProvider {
  /**
   * @param {Object} config - Provider-specific configuration
   */
  constructor(config = {}) {
    if (new.target === NotificationProvider) {
      throw new Error('NotificationProvider is abstract and cannot be instantiated directly');
    }
    this.config = config;
  }

  /**
   * Send an SMS message.
   * @param {string} phoneNumber - Recipient phone number (E.164 format)
   * @param {string} message - Message content
   * @param {Object} options - Additional options (templateId, variables, etc.)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendSMS(phoneNumber, message, options = {}) {
    throw new Error('sendSMS() must be implemented by provider');
  }

  /**
   * Send a WhatsApp message.
   * @param {string} phoneNumber - Recipient phone number (E.164 format)
   * @param {string} message - Message content
   * @param {Object} options - Additional options (templateId, variables, etc.)
   * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
   */
  async sendWhatsApp(phoneNumber, message, options = {}) {
    throw new Error('sendWhatsApp() must be implemented by provider');
  }

  /**
   * Send a message via the optimal channel (provider decides).
   * @param {string} phoneNumber - Recipient phone number
   * @param {string} message - Message content
   * @param {Object} options - Additional options
   * @returns {Promise<{success: boolean, messageId?: string, channel?: string, error?: string}>}
   */
  async sendMessage(phoneNumber, message, options = {}) {
    throw new Error('sendMessage() must be implemented by provider');
  }

  /**
   * Check if the provider is properly configured and ready.
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }

  /**
   * Get the provider name.
   * @returns {string}
   */
  get name() {
    return 'abstract';
  }
}

export default NotificationProvider;
