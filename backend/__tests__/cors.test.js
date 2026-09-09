/**
 * CORS Configuration Tests
 * Validates origin handling, preflight OPTIONS, and credentials for frontend origins.
 */
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { getAllowedOrigins, corsOptions, DEFAULT_ALLOWED_ORIGINS } from '../config/cors.js';

describe('CORS Configuration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  test('default allowed origins include localhost:5173 and localhost:3000', () => {
    delete process.env.CORS_ORIGIN;
    delete process.env.CLIENT_URL;

    const origins = getAllowedOrigins();
    expect(origins).toContain('http://localhost:5173');
    expect(origins).toContain('http://localhost:3000');
  });

  test('merges custom origins from CORS_ORIGIN environment variable', () => {
    process.env.CORS_ORIGIN = 'https://app.example.com, https://preview.example.com';

    const origins = getAllowedOrigins();
    expect(origins).toContain('http://localhost:5173');
    expect(origins).toContain('http://localhost:3000');
    expect(origins).toContain('https://app.example.com');
    expect(origins).toContain('https://preview.example.com');
  });

  describe('Express CORS middleware integration', () => {
    let app;

    beforeEach(() => {
      app = express();
      app.use(cors(corsOptions));
      app.get('/api/products', (req, res) => {
        res.json({ success: true, data: [] });
      });
    });

    test('preflight OPTIONS request from localhost:5173 returns 204 with Access-Control-Allow-Origin', async () => {
      const response = await request(app)
        .options('/api/products')
        .set('Origin', 'http://localhost:5173')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
    });

    test('preflight OPTIONS request from localhost:3000 returns 204 with Access-Control-Allow-Origin', async () => {
      const response = await request(app)
        .options('/api/products')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET');

      expect(response.status).toBe(204);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('GET request from localhost:5173 includes Access-Control-Allow-Origin header', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Origin', 'http://localhost:5173');

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
      expect(response.headers['access-control-allow-credentials']).toBe('true');
    });

    test('requests from unauthorized origins do not receive Access-Control-Allow-Origin', async () => {
      const response = await request(app)
        .get('/api/products')
        .set('Origin', 'http://malicious-site.com');

      expect(response.headers['access-control-allow-origin']).toBeUndefined();
    });
  });
});
