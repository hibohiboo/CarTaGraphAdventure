import { describe, expect, it } from 'vitest';
import { DOMAIN_VERSION } from './index';

describe('packages/domain の殻', () => {
  it('読み込める', () => {
    expect(DOMAIN_VERSION).toBe('0.0.0');
  });
});
