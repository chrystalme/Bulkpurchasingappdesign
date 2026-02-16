import { jest } from '@jest/globals';

// Mock pool before importing
const mockQuery = jest.fn();
jest.unstable_mockModule('../config/database.js', () => ({
  default: { query: mockQuery },
}));

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

const { SentProvider } = await import('../services/notifications/sentProvider.js');

// Import the module to get the class via the singleton
const notificationModule = await import('../services/notifications/notificationService.js');

describe('SentProvider', () => {
  let provider;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.SENT_SENDER_ID = 'test-sender';
    process.env.SENT_API_KEY = 'test-key';
    process.env.SENT_DEFAULT_TEMPLATE_ID = 'test-template';
    provider = new SentProvider();
  });

  afterEach(() => {
    delete process.env.SENT_SENDER_ID;
    delete process.env.SENT_API_KEY;
    delete process.env.SENT_DEFAULT_TEMPLATE_ID;
  });

  test('isConfigured returns true when env vars are set', () => {
    expect(provider.isConfigured()).toBe(true);
  });

  test('isConfigured returns false when env vars are missing', () => {
    delete process.env.SENT_SENDER_ID;
    delete process.env.SENT_API_KEY;
    const p = new SentProvider();
    expect(p.isConfigured()).toBe(false);
  });

  test('sendSMS calls Sent.dm API with correct params', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true, messageId: 'msg-1', channel: 'sms' }),
    });

    const result = await provider.sendSMS('+1234567890', 'Hello');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, options] = mockFetch.mock.calls[0];
    expect(url).toBe('https://api.sent.dm/v2/messages/contact');
    expect(options.method).toBe('POST');
    expect(options.headers['x-sender-id']).toBe('test-sender');
    expect(options.headers['x-api-key']).toBe('test-key');
    const body = JSON.parse(options.body);
    expect(body.channel).toBe('sms');
    expect(body.phoneNumber).toBe('+1234567890');
    expect(result.success).toBe(true);
  });

  test('sendWhatsApp calls API with whatsapp channel', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await provider.sendWhatsApp('+1234567890', 'Hello');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.channel).toBe('whatsapp');
  });

  test('sendMessage omits channel for intelligent routing', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });

    await provider.sendMessage('+1234567890', 'Hello');

    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.channel).toBeUndefined();
  });

  test('returns error object when API returns error', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      status: 400,
      json: () => Promise.resolve({ message: 'Invalid phone' }),
    });

    const result = await provider.sendSMS('+bad', 'Hello');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid phone');
  });

  test('returns error when not configured', async () => {
    delete process.env.SENT_SENDER_ID;
    delete process.env.SENT_API_KEY;
    const p = new SentProvider();

    const result = await p.sendSMS('+1234567890', 'Hello');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not configured');
  });
});

describe('NotificationService', () => {
  let service;

  beforeEach(() => {
    jest.clearAllMocks();
    mockQuery.mockReset();
    // Create a fresh service instance for each test
    const ServiceClass = notificationModule.notificationService.constructor;
    service = new ServiceClass();
  });

  test('isAvailable returns false when no provider', () => {
    expect(service.isAvailable()).toBe(false);
  });

  test('isAvailable returns true after setting configured provider', () => {
    const mockProvider = { isConfigured: () => true, name: 'mock' };
    service.setProvider(mockProvider);
    expect(service.isAvailable()).toBe(true);
  });

  test('notifyOfflineParticipants does nothing when no provider', async () => {
    await service.notifyOfflineParticipants('conv-1', 'user-1', 'Alice', 'Hello');
    expect(mockQuery).not.toHaveBeenCalled();
  });

  test('notifyOfflineParticipants queries offline users and sends messages', async () => {
    const mockProvider = {
      isConfigured: () => true,
      name: 'mock',
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };
    service.setProvider(mockProvider);

    mockQuery.mockResolvedValue({
      rows: [
        { id: 'user-2', name: 'Bob', phone: '+1111111111', email: 'bob@test.com' },
        { id: 'user-3', name: 'Charlie', phone: '+2222222222', email: 'charlie@test.com' },
      ],
    });

    await service.notifyOfflineParticipants('conv-1', 'user-1', 'Alice', 'Hello everyone');

    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockProvider.sendMessage).toHaveBeenCalledTimes(2);
    expect(mockProvider.sendMessage.mock.calls[0][0]).toBe('+1111111111');
    expect(mockProvider.sendMessage.mock.calls[0][1]).toBe('Alice: Hello everyone');
  });

  test('notifyOfflineParticipants truncates long messages', async () => {
    const mockProvider = {
      isConfigured: () => true,
      name: 'mock',
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };
    service.setProvider(mockProvider);

    mockQuery.mockResolvedValue({
      rows: [{ id: 'user-2', name: 'Bob', phone: '+1111111111', email: 'bob@test.com' }],
    });

    const longContent = 'A'.repeat(150);
    await service.notifyOfflineParticipants('conv-1', 'user-1', 'Alice', longContent);

    const sentMessage = mockProvider.sendMessage.mock.calls[0][1];
    expect(sentMessage.startsWith('Alice: ')).toBe(true);
    expect(sentMessage).toContain('...');
  });

  test('notifyOfflineParticipants handles provider errors gracefully', async () => {
    const mockProvider = {
      isConfigured: () => true,
      name: 'mock',
      sendMessage: jest.fn().mockRejectedValue(new Error('API down')),
    };
    service.setProvider(mockProvider);

    mockQuery.mockResolvedValue({
      rows: [{ id: 'user-2', name: 'Bob', phone: '+1111111111', email: 'bob@test.com' }],
    });

    // Should not throw
    await service.notifyOfflineParticipants('conv-1', 'user-1', 'Alice', 'Hello');
  });

  test('notifyUser does nothing when user has no phone', async () => {
    const mockProvider = {
      isConfigured: () => true,
      name: 'mock',
      sendMessage: jest.fn(),
    };
    service.setProvider(mockProvider);

    mockQuery.mockResolvedValue({ rows: [] });

    await service.notifyUser('user-1', 'Hello');
    expect(mockProvider.sendMessage).not.toHaveBeenCalled();
  });

  test('notifyUser sends message to user with phone', async () => {
    const mockProvider = {
      isConfigured: () => true,
      name: 'mock',
      sendMessage: jest.fn().mockResolvedValue({ success: true }),
    };
    service.setProvider(mockProvider);

    mockQuery.mockResolvedValue({
      rows: [{ phone: '+1234567890', name: 'Alice' }],
    });

    await service.notifyUser('user-1', 'You have a new message');
    expect(mockProvider.sendMessage).toHaveBeenCalledWith(
      '+1234567890',
      'You have a new message',
      expect.objectContaining({
        variables: expect.objectContaining({
          recipientName: 'Alice',
        }),
      })
    );
  });
});
