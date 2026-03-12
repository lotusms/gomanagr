/**
 * Unit tests for fileInputResize: resizeAndCompressImage
 */
import { resizeAndCompressImage } from '@/components/ui/fileInputResize';

describe('fileInputResize', () => {
  let lastImageInstance;
  let mockCreateObjectURL;
  let mockRevokeObjectURL;
  let mockCanvas;
  let mockCtx;
  let toBlobCallbacks;

  beforeEach(() => {
    toBlobCallbacks = [];
    lastImageInstance = null;

    jest.spyOn(global, 'Image').mockImplementation(function MockImage() {
      this.width = 200;
      this.height = 150;
      this.onload = null;
      this.onerror = null;
      this._src = null;
      Object.defineProperty(this, 'src', {
        set(value) {
          this._src = value;
          lastImageInstance = this;
        },
        get() {
          return this._src;
        },
      });
      return this;
    });

    mockCreateObjectURL = jest.fn(() => 'blob:mock-url');
    mockRevokeObjectURL = jest.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    mockCtx = {
      drawImage: jest.fn(),
    };

    mockCanvas = {
      width: 200,
      height: 150,
      getContext: jest.fn(() => mockCtx),
      toBlob: jest.fn((callback, type, quality) => {
        toBlobCallbacks.push({ callback, type, quality });
      }),
    };

    jest.spyOn(document, 'createElement').mockImplementation((tagName) => {
      if (tagName === 'canvas') {
        return mockCanvas;
      }
      return document.createElement.bind(document)(tagName);
    });
  });

  /** Call after resizeAndCompressImage() to simulate image load. */
  function triggerImageLoad() {
    if (lastImageInstance && lastImageInstance.onload) {
      lastImageInstance.onload();
    }
  }

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('resolves with a resized File when image loads and blob is within max size', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });
    const smallBlob = new Blob(['a'], { type: 'image/png' });
    Object.defineProperty(smallBlob, 'size', { value: 100 });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    triggerImageLoad();
    await Promise.resolve();
    expect(toBlobCallbacks.length).toBeGreaterThanOrEqual(1);
    toBlobCallbacks[0].callback(smallBlob);

    const result = await p;
    expect(result).toBeInstanceOf(File);
    expect(result.name).toMatch(/\.png$/);
    expect(result.size).toBeLessThanOrEqual(500);
    expect(mockCreateObjectURL).toHaveBeenCalledWith(file);
    expect(mockRevokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
    expect(mockCtx.drawImage).toHaveBeenCalled();
  });

  it('resizes dimensions when image exceeds maxW and maxH', async () => {
    const file = new File(['x'], 'large.png', { type: 'image/png' });
    const smallBlob = new Blob(['a'], { type: 'image/png' });
    Object.defineProperty(smallBlob, 'size', { value: 50 });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    if (lastImageInstance) {
      lastImageInstance.width = 800;
      lastImageInstance.height = 600;
    }
    triggerImageLoad();
    await Promise.resolve();
    toBlobCallbacks[0].callback(smallBlob);

    await p;
    expect(mockCanvas.width).toBe(400);
    expect(mockCanvas.height).toBe(300);
  });

  it('uses image/jpeg and quality for jpeg input', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const smallBlob = new Blob(['a'], { type: 'image/jpeg' });
    Object.defineProperty(smallBlob, 'size', { value: 50 });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    triggerImageLoad();
    await Promise.resolve();
    expect(toBlobCallbacks[0].type).toBe('image/jpeg');
    expect(toBlobCallbacks[0].quality).toBe(0.85);
    toBlobCallbacks[0].callback(smallBlob);
    const result = await p;
    expect(result.name).toMatch(/\.jpg$/);
  });

  it('rejects when getContext returns null', async () => {
    mockCanvas.getContext = jest.fn(() => null);
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    triggerImageLoad();

    await expect(p).rejects.toThrow('Canvas not supported');
  });

  it('rejects when image fails to load', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    if (lastImageInstance && lastImageInstance.onerror) {
      lastImageInstance.onerror();
    }

    await expect(p).rejects.toThrow('Failed to load image');
    expect(mockRevokeObjectURL).toHaveBeenCalled();
  });

  it('tries lower quality when blob exceeds max size (jpeg)', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const bigBlob = new Blob(['x'.repeat(1000)], { type: 'image/jpeg' });
    Object.defineProperty(bigBlob, 'size', { value: 2000 });
    const smallBlob = new Blob(['a'], { type: 'image/jpeg' });
    Object.defineProperty(smallBlob, 'size', { value: 100 });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    triggerImageLoad();
    await Promise.resolve();
    toBlobCallbacks[0].callback(bigBlob);
    await Promise.resolve();
    toBlobCallbacks[1].callback(smallBlob);

    const result = await p;
    expect(result).toBeInstanceOf(File);
    expect(toBlobCallbacks.length).toBeGreaterThanOrEqual(2);
    expect(toBlobCallbacks[1].quality).toBe(0.7);
  });

  it('reduces dimensions when quality alone is not enough', async () => {
    const file = new File(['x'], 'photo.jpg', { type: 'image/jpeg' });
    const bigBlob = new Blob(['x'], { type: 'image/jpeg' });
    Object.defineProperty(bigBlob, 'size', { value: 2000 });
    const smallBlob = new Blob(['a'], { type: 'image/jpeg' });
    Object.defineProperty(smallBlob, 'size', { value: 100 });

    let callIndex = 0;
    mockCanvas.toBlob = jest.fn((callback) => {
      toBlobCallbacks.push({ callback });
      const idx = callIndex++;
      if (idx < 3) {
        setTimeout(() => callback(bigBlob), 0);
      } else {
        setTimeout(() => callback(smallBlob), 0);
      }
    });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    if (lastImageInstance) {
      lastImageInstance.width = 500;
      lastImageInstance.height = 500;
    }
    triggerImageLoad();

    const result = await p;
    expect(result).toBeInstanceOf(File);
    expect(mockCanvas.width).toBeLessThanOrEqual(500);
  });

  it('resolves with fallback file when toBlob returns null', async () => {
    const file = new File(['x'], 'photo.png', { type: 'image/png' });

    mockCanvas.toBlob = jest.fn((callback) => {
      toBlobCallbacks.push({ callback });
      setTimeout(() => callback(null), 0);
    });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    if (lastImageInstance) {
      lastImageInstance.width = 100;
      lastImageInstance.height = 100;
    }
    triggerImageLoad();
    await Promise.resolve();
    toBlobCallbacks[0].callback(null);
    await Promise.resolve();
    toBlobCallbacks[1].callback(null);

    const result = await p;
    expect(result).toBeInstanceOf(File);
    expect(result.name).toBe('photo.png');
    expect(result.type).toBe('image/png');
  });

  it('outputs .jpg for image/jpg type', async () => {
    const file = new File(['x'], 'photo.JPG', { type: 'image/jpg' });
    const smallBlob = new Blob(['a'], { type: 'image/jpeg' });
    Object.defineProperty(smallBlob, 'size', { value: 50 });

    const p = resizeAndCompressImage(file, 400, 400, 500);
    triggerImageLoad();
    await Promise.resolve();
    toBlobCallbacks[0].callback(smallBlob);

    const result = await p;
    expect(result.name).toMatch(/\.jpg$/);
  });
});
