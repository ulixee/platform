import { escapeUnescapedChar } from '../lib/utils';

test('should escape unescaped regex chars', () => {
  const result = escapeUnescapedChar('http://test.com?param=1', '?');
  expect(result).toBe('http://test.com\\?param=1');
});

test('should not escape already unescaped regex chars', () => {
  const result = escapeUnescapedChar('http://test.com\\?param=1', '?');
  expect(result).toBe('http://test.com\\?param=1');
});
