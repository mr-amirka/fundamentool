import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'fundamentool',
  description: 'TypeScript utility library',
  base: '/',

  // typedoc-plugin-markdown generates README.md as directory index files;
  // VitePress expects index.md. These rewrites map each README.md to index.md
  // so directory URLs like /api/ resolve correctly without renaming generated files.
  rewrites: {
    'api/README.md': 'api/index.md',
    'api/index/README.md': 'api/index/index.md',
    'api/node/README.md': 'api/node/index.md',
    'api/node/namespaces/file/README.md': 'api/node/namespaces/file/index.md',
    'api/node/namespaces/file/namespaces/csv/README.md': 'api/node/namespaces/file/namespaces/csv/index.md',
    'api/node/namespaces/file/namespaces/json/README.md': 'api/node/namespaces/file/namespaces/json/index.md',
    'api/node/namespaces/jsonl/README.md': 'api/node/namespaces/jsonl/index.md',
  },

  themeConfig: {

    siteTitle: 'fundamentool',

    nav: [
      { text: 'Guide', link: '/guide/' },
      { text: 'API', link: '/api/' },
    ],

    sidebar: {
      '/api/': [
        {
          text: 'Overview',
          link: '/api/',
        },
        {
          text: 'fundamentool',
          link: '/api/index/',
          collapsed: false,
          items: [
            { text: 'csv (namespace)', link: '/api/index/namespaces/csv' },
          ],
        },
        {
          text: 'fundamentool/async',
          link: '/api/async',
        },
        {
          text: 'fundamentool/is',
          link: '/api/is',
        },
        {
          text: 'fundamentool/browser',
          link: '/api/browser',
        },
        {
          text: 'fundamentool/jsonl',
          link: '/api/jsonl',
        },
        {
          text: 'fundamentool/join',
          link: '/api/join',
        },
        {
          text: 'fundamentool/split',
          link: '/api/split',
        },
        {
          text: 'fundamentool/node',
          link: '/api/node/',
          collapsed: true,
          items: [
            { text: 'file', link: '/api/node/namespaces/file/' },
            { text: 'file / csv', link: '/api/node/namespaces/file/namespaces/csv/' },
            { text: 'file / csv / snapshot', link: '/api/node/namespaces/file/namespaces/csv/namespaces/snapshot' },
            { text: 'file / json', link: '/api/node/namespaces/file/namespaces/json/' },
            { text: 'file / json / snapshot', link: '/api/node/namespaces/file/namespaces/json/namespaces/snapshot' },
            { text: 'hash', link: '/api/node/namespaces/hash' },
            { text: 'jsonl', link: '/api/node/namespaces/jsonl/' },
            { text: 'jsonl / promisify', link: '/api/node/namespaces/jsonl/namespaces/promisify' },
          ],
        },
        {
          text: 'fundamentool/rpc',
          link: '/api/rpc',
        },
        {
          text: 'fundamentool/rpc/browser',
          link: '/api/rpc/browser',
        },
        {
          text: 'fundamentool/rpc/node',
          link: '/api/rpc/node',
        },
      ],

      '/guide/': [
        {
          text: 'Getting started',
          link: '/guide/',
        },
      ],
    },

    search: {
      provider: 'local',
    },

    socialLinks: [],

    footer: {
      message: 'MIT License',
      copyright: 'fundamentool',
    },

    outline: {
      level: [2, 3],
      label: 'On this page',
    },
  },

  markdown: {
    lineNumbers: true,
  },
});
