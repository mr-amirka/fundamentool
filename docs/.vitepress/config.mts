import { defineConfig } from 'vitepress';

export default defineConfig({
  title: 'mn-utils',
  description: 'TypeScript utility library',
  base: '/',

  themeConfig: {
    logo: null,
    siteTitle: 'mn-utils',

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
          text: 'mn-utils',
          link: '/api/index/',
          collapsed: false,
          items: [
            { text: 'csv (namespace)', link: '/api/index/namespaces/csv' },
          ],
        },
        {
          text: 'mn-utils/async',
          link: '/api/async',
        },
        {
          text: 'mn-utils/is',
          link: '/api/is',
        },
        {
          text: 'mn-utils/browser',
          link: '/api/browser',
        },
        {
          text: 'mn-utils/jsonl',
          link: '/api/jsonl',
        },
        {
          text: 'mn-utils/join',
          link: '/api/join',
        },
        {
          text: 'mn-utils/split',
          link: '/api/split',
        },
        {
          text: 'mn-utils/node',
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
          text: 'mn-utils/rpc',
          link: '/api/rpc',
        },
        {
          text: 'mn-utils/rpc/browser',
          link: '/api/rpc/browser',
        },
        {
          text: 'mn-utils/rpc/node',
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
      copyright: 'mn-utils',
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
