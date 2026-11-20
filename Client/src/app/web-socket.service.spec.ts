import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { WebSocketService, toBase64Url } from './web-socket.service';

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient()]
    });
    service = TestBed.inject(WebSocketService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should encode UTF-8 accented names to valid base64url', () => {
    const encoded = toBase64Url('João Vitória');
    // Standard base64url has no +, /, or = padding
    expect(encoded).not.toContain('+');
    expect(encoded).not.toContain('/');
    expect(encoded).not.toContain('=');

    // Decode back via UTF-8 TextDecoder to confirm round-trip fidelity
    const padded = encoded.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (encoded.length % 4)) % 4);
    const binary = atob(padded);
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    expect(decoded).toBe('João Vitória');
  });

  it('should not throw when sendMessage is called before connecting', () => {
    expect(() => service.sendMessage({ action: 'join', code: 'ABCD' })).not.toThrow();
  });
});
