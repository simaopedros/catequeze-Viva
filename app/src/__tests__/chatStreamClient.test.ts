import { describe, it, expect } from 'vitest';
import {
  looksLikeHtml,
  validateChatStreamResponse,
  isInfrastructureChatError,
} from '../catequese/lib/chatStreamClient';

function mockHeaders(contentType: string | null) {
  return {
    get: (name: string) =>
      name.toLowerCase() === 'content-type' ? contentType : null,
  };
}

describe('validateChatStreamResponse', () => {
  it('rejects HTML content-type (SPA fallback) as infrastructure error', () => {
    const result = validateChatStreamResponse({
      ok: true,
      status: 200,
      headers: mockHeaders('text/html; charset=utf-8') as Headers,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('html');
      expect(result.message).toMatch(/^INFRA:/);
      expect(result.message).toMatch(/\/api\/\*/);
    }
  });

  it('rejects HTML body preview even when content-type is missing', () => {
    const result = validateChatStreamResponse(
      {
        ok: true,
        status: 200,
        headers: mockHeaders(null) as Headers,
      },
      '<!DOCTYPE html><html><head><title>Catechis</title>',
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('html');
    }
  });

  it('rejects unexpected JSON with HTTP 200', () => {
    const result = validateChatStreamResponse({
      ok: true,
      status: 200,
      headers: mockHeaders('application/json') as Headers,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('json');
      expect(result.message).toMatch(/^INFRA:/);
    }
  });

  it('accepts text/event-stream', () => {
    const result = validateChatStreamResponse({
      ok: true,
      status: 200,
      headers: mockHeaders('text/event-stream') as Headers,
    });
    expect(result).toEqual({ ok: true });
  });

  it('maps non-OK responses as http errors', () => {
    const result = validateChatStreamResponse({
      ok: false,
      status: 503,
      headers: mockHeaders('application/json') as Headers,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.kind).toBe('http');
      expect(result.message).toBe('HTTP 503');
    }
  });
});

describe('looksLikeHtml', () => {
  it('detects doctype and html roots', () => {
    expect(looksLikeHtml('<!DOCTYPE html>')).toBe(true);
    expect(looksLikeHtml('  <html lang="pt">')).toBe(true);
    expect(looksLikeHtml('data: {"chunk":"ok"}')).toBe(false);
  });
});

describe('isInfrastructureChatError', () => {
  it('detects INFRA prefix', () => {
    expect(isInfrastructureChatError('INFRA: proxy misconfigured')).toBe(true);
    expect(isInfrastructureChatError('Resposta vazia')).toBe(false);
  });
});
