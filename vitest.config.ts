import { defineConfig } from 'vitest/config';

process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ''} --experimental-require-module`.trim();

export default defineConfig({
  test: {
    pool: 'forks',
  },
});
