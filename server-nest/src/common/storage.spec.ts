import { promises as fs } from 'fs';
import { join, resolve, sep } from 'path';
import { tmpdir } from 'os';
import { StorageService } from './storage.service';
import { assertUpload } from './upload.util';

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
  let base: string;
  let service: StorageService;

  beforeEach(async () => {
    base = await fs.mkdtemp(join(tmpdir(), 'storage-spec-'));
    process.env.UPLOAD_DIR = base;
    service = new StorageService();
  });

  afterEach(async () => {
    delete process.env.UPLOAD_DIR;
    await fs.rm(base, { recursive: true, force: true });
  });

  it('writes a normal upload strictly inside <base>/<subdir>/', async () => {
    const file = fakeFile({ originalname: 'photo.png', mimetype: 'image/png' });
    const relPath = await service.save(file, 'praticiens/1/documents');

    expect(relPath).not.toContain('..');
    const abs = resolve(base, relPath);
    expect(abs.startsWith(resolve(base, 'praticiens/1/documents') + sep)).toBe(true);
    await expect(fs.readFile(abs)).resolves.toEqual(file.buffer);
  });

  it('neutralizes a path-traversal originalname and never escapes the subdir', async () => {
    const malicious = fakeFile({
      originalname: '../../../../etc/passed.txt',
      mimetype: 'application/pdf',
    });
    const relPath = await service.save(malicious, 'praticiens/1/documents');

    // Returned logical path never contains traversal sequences.
    expect(relPath).not.toContain('..');

    // The resolved absolute path stays strictly inside the intended subdir.
    const subdirAbs = resolve(base, 'praticiens/1/documents');
    const abs = resolve(base, relPath);
    expect(abs.startsWith(subdirAbs + sep)).toBe(true);

    // Nothing was written outside the storage base at all (e.g. no file
    // escaped up to a simulated "/etc" sibling directory).
    const escapedPath = resolve(base, '..', '..', '..', '..', 'etc', 'passed.txt');
    await expect(fs.readFile(escapedPath)).rejects.toThrow();

    // The file really was written, safely, inside the subdir.
    const filesInSubdir = await fs.readdir(subdirAbs);
    expect(filesInSubdir).toHaveLength(1);
  });

  it('derives the on-disk filename from a random id, not from originalname', async () => {
    const file = fakeFile({ originalname: 'some name with spaces & stuff.pdf' });
    const relPath = await service.save(file, 'sub');
    const filename = relPath.split('/').pop()!;
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
