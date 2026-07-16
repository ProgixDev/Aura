import { StorageService } from './storage.service';
import { assertUpload } from './upload.util';

const uploadMock = jest.fn().mockResolvedValue({ data: {}, error: null });
const downloadMock = jest.fn();
const fromMock = jest.fn(() => ({ upload: uploadMock, download: downloadMock }));

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ storage: { from: fromMock } })),
}));

function fakeFile(overrides: Partial<Express.Multer.File>): Express.Multer.File {
  return {
    fieldname: 'file',
    originalname: 'test.pdf',
    encoding: '7bit',
    mimetype: 'application/pdf',
    size: 4,
    buffer: Buffer.from('test'),
    stream: undefined as never,
    destination: '',
    filename: '',
    path: '',
    ...overrides,
  };
}

describe('StorageService.save', () => {
  let service: StorageService;

  beforeEach(() => {
    uploadMock.mockClear();
    service = new StorageService();
  });

  it('uploads under <subdir>/<random-uuid>.<ext> and returns that key', async () => {
    const file = fakeFile({ originalname: 'photo.png', mimetype: 'image/png' });
    const objectKey = await service.save(file, 'praticiens/1/documents');

    expect(objectKey).not.toContain('..');
    expect(objectKey).toMatch(/^praticiens\/1\/documents\/[0-9a-f-]{36}\.png$/);
    expect(uploadMock).toHaveBeenCalledWith(objectKey, file.buffer, { contentType: 'image/png' });
  });

  it('neutralizes a path-traversal originalname — never lets it reach the object key', async () => {
    const malicious = fakeFile({
      originalname: '../../../../etc/passed.txt',
      mimetype: 'application/pdf',
    });
    const objectKey = await service.save(malicious, 'praticiens/1/documents');

    expect(objectKey).not.toContain('..');
    expect(objectKey.startsWith('praticiens/1/documents/')).toBe(true);
  });

  it('derives the object key filename from a random id, not from originalname', async () => {
    const file = fakeFile({ originalname: 'some name with spaces & stuff.pdf' });
    const objectKey = await service.save(file, 'sub');
    const filename = objectKey.split('/').pop()!;
    expect(filename).not.toContain('some name');
    expect(filename).toMatch(/^[0-9a-f-]{36}\.pdf$/);
  });
});

describe('assertUpload extension/mimetype cross-check', () => {
  it('passes when mimetype and extension both match an allowed type', () => {
    const file = fakeFile({ originalname: 'doc.pdf', mimetype: 'application/pdf', size: 100 });
    expect(() => assertUpload(file, 'documents.piece_identite', ['jpg', 'jpeg', 'png', 'pdf'])).not.toThrow();
  });

  it('rejects a spoofed mimetype with a mismatched extension (e.g. .html with pdf mimetype)', () => {
    const file = fakeFile({ originalname: 'payload.html', mimetype: 'application/pdf', size: 100 });
    expect(() => assertUpload(file, 'documents.piece_identite', ['jpg', 'jpeg', 'png', 'pdf']))
      .toThrow();
  });

  it('rejects a correct extension with a mismatched/invalid mimetype', () => {
    const file = fakeFile({ originalname: 'doc.pdf', mimetype: 'text/html', size: 100 });
    expect(() => assertUpload(file, 'documents.piece_identite', ['jpg', 'jpeg', 'png', 'pdf']))
      .toThrow();
  });

  it('still rejects oversized files regardless of type', () => {
    const file = fakeFile({
      originalname: 'doc.pdf', mimetype: 'application/pdf', size: 10 * 1024 * 1024,
    });
    expect(() => assertUpload(file, 'documents.piece_identite', ['jpg', 'jpeg', 'png', 'pdf'], 5120))
      .toThrow();
  });
});
