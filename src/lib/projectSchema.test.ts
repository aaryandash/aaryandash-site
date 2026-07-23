import { describe, it, expect } from 'vitest';
import { z } from 'astro/zod';
import { projectSchema } from './projectSchema';

/** Stand-in for Astro's image() helper, which only exists during a build. */
const imageStub = () => z.string();
const schema = projectSchema({ image: imageStub });

const valid = {
  title: 'Intake Wedges',
  order: 1,
  season: 'FRC 2025',
  role: 'Design lead',
  summary: 'Compliant wedges that funnel game pieces into the intake throat.',
  tools: ['Onshape', 'Bambu Studio'],
  materials: ['PETG'],
  specs: [{ label: 'Material', value: 'PETG' }],
  heroRender: 'hero.webp',
  heroAlt: 'Isometric view of the left intake wedge',
};

describe('projectSchema', () => {
  it('accepts a well-formed project', () => {
    expect(() => schema.parse(valid)).not.toThrow();
  });

  it('defaults gallery to an empty array', () => {
    expect(schema.parse(valid).gallery).toEqual([]);
  });

  it('defaults featured to false', () => {
    expect(schema.parse(valid).featured).toBe(false);
  });

  it('rejects a missing title', () => {
    const { title, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('rejects an empty title', () => {
    expect(() => schema.parse({ ...valid, title: '' })).toThrow();
  });

  it('rejects a hero render with no alt text — accessibility is a build error, not a review note', () => {
    const { heroAlt, ...rest } = valid;
    expect(() => schema.parse(rest)).toThrow();
  });

  it('rejects empty alt text', () => {
    expect(() => schema.parse({ ...valid, heroAlt: '' })).toThrow();
  });

  it('rejects a gallery image with no alt text', () => {
    const withBadGallery = {
      ...valid,
      gallery: [{ src: 'a.webp', alt: '', caption: 'A caption' }],
    };
    expect(() => schema.parse(withBadGallery)).toThrow();
  });

  it('rejects a project with no tools listed', () => {
    expect(() => schema.parse({ ...valid, tools: [] })).toThrow();
  });

  it('rejects a negative order', () => {
    expect(() => schema.parse({ ...valid, order: -1 })).toThrow();
  });

  it('rejects a summary longer than 200 characters', () => {
    expect(() => schema.parse({ ...valid, summary: 'x'.repeat(201) })).toThrow();
  });

  it('treats the 3D model as optional', () => {
    expect(schema.parse(valid).model).toBeUndefined();
  });

  it('accepts a project with a 3D model path', () => {
    const parsed = schema.parse({ ...valid, model: './intake.glb' });
    expect(parsed.model).toBe('./intake.glb');
  });
});
