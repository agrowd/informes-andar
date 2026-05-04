import { describe, it, expect } from 'vitest';
import { htmlToPdfBuffer } from '../src/lib/pdf/render';

describe('PDF rendering', () => {
  it('convierte HTML simple en un buffer PDF', async () => {
    const html = '<html><body><h1>Test</h1><p>Hola</p></body></html>';
    const buf = await htmlToPdfBuffer(html);
    expect(Buffer.isBuffer(buf)).toBe(true);
    // PDF empieza con %PDF-
    expect(buf.slice(0, 5).toString()).toBe('%PDF-');
  }, 20000);
});


