import { afterEach, describe, it, expect, vi } from 'vitest';
import { UpagJs } from '../src/client';
import { Files } from '../src/resources/files';

const FILE = {
  id: '6f1c2f0e-7c1b-4f0e-9d53-0d6c0c3b1a11',
  name: 'logo.png',
  size: 120,
  contentType: 'image/png',
  purpose: 'business_logo',
  url: 'https://assets.upag.io/acc/6f1c2f0e.png',
  createdAt: '2026-10-08T13:00:00.000Z',
};

function makeHttp() {
  return { post: vi.fn(async () => FILE) } as any;
}

describe('Files', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('is exposed on the client and shares its http client', () => {
    const upag = new UpagJs({ publicKey: 'pk_test_abc' }) as any;

    expect(upag.files).toBeInstanceOf(Files);
    expect(upag.files.http).toBe(upag.http);
  });

  it('posts the file and purpose as multipart to /files', async () => {
    const http = makeHttp();
    const blob = new Blob(['png bytes'], { type: 'image/png' });

    const file = await new Files(http).create({ file: blob, purpose: 'business_logo' });

    expect(file).toEqual(FILE);
    expect(http.post).toHaveBeenCalledTimes(1);
    const [path, body] = http.post.mock.calls[0];
    expect(path).toBe('/files');
    expect(body).toBeInstanceOf(FormData);
    expect(body.get('purpose')).toBe('business_logo');
    expect(body.get('file')).toBeInstanceOf(Blob);
    expect(body.has('name')).toBe(false);
  });

  it('keeps the name of a File and sends an explicit name when given', async () => {
    const http = makeHttp();
    const file = new File(['png bytes'], 'logo.png', { type: 'image/png' });

    await new Files(http).create({ file, purpose: 'product_image', name: 'Product shot' });

    const body = http.post.mock.calls[0][1] as FormData;
    expect((body.get('file') as File).name).toBe('logo.png');
    expect(body.get('name')).toBe('Product shot');
  });

  it('lets API errors through untouched', async () => {
    const error = { type: 'api_error', code: 'too_many_uploads', statusCode: 429 };
    const http = { post: vi.fn(async () => Promise.reject(error)) } as any;

    await expect(
      new Files(http).create({ file: new Blob(['x']), purpose: 'business_logo' }),
    ).rejects.toBe(error);
  });

  it('uploads through the real http client without forcing a JSON content type', async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify(FILE), { status: 201 }));
    vi.stubGlobal('fetch', fetchMock);
    const upag = new UpagJs({ publicKey: 'pk_test_abc', baseURL: 'https://api.test/v1' });

    const file = await upag.files.create({ file: new Blob(['x'], { type: 'image/png' }), purpose: 'business_logo' });

    expect(file.url).toBe(FILE.url);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.test/v1/files');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers).toEqual({ Authorization: 'Bearer pk_test_abc' });
  });
});
