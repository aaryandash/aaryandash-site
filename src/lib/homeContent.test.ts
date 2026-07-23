import { describe, it, expect } from 'vitest';
import { parseHome } from './homeContent';

const valid = {
  subheading: 'Rising junior · mechanical design & CAD',
  description: 'I design mechanisms and print them on a Bambu A1.',
};

describe('parseHome', () => {
  it('parses well-formed home content', () => {
    expect(parseHome(valid)).toEqual(valid);
  });

  it('rejects a missing subheading', () => {
    const { subheading, ...rest } = valid;
    expect(() => parseHome(rest)).toThrow();
  });

  it('rejects an empty description', () => {
    expect(() => parseHome({ ...valid, description: '' })).toThrow();
  });
});
