import { ObfuscatePipe } from './obfuscate.pipe';

describe('ObfuscatePipe', () => {
  const pipe = new ObfuscatePipe();

  it('should encode text correctly', () => {
    const cipher = { 'h': 'x', 'e': 'y', 'l': 'z', 'o': 'w', '1': '@', '2': '#', '3': '$' };
    expect(pipe.transform('hello123', cipher, 'encode')).toEqual('xyzzw@#$');
  });

  it('should decode text correctly', () => {
    const cipher = { 'h': 'x', 'e': 'y', 'l': 'z', 'o': 'w', '1': '@', '2': '#', '3': '$' };
    expect(pipe.transform('xyzzw@#$', cipher, 'decode')).toEqual('hello123');
  });

  it('should return unchanged value if cipher is missing', () => {
    expect(pipe.transform('hello123', {}, 'encode')).toEqual('hello123');
  });

  it('should handle unsupported characters', () => {
    const cipher = { 'h': 'x', 'e': 'y' };
    expect(pipe.transform('hi there!', cipher, 'encode')).toEqual('xi txyry!');
  });
});
