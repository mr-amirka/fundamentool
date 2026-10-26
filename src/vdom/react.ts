// React's module, as a bundler or a test runner stands it in for `react`, `react-dom`, `react-dom/client` and
// `react/jsx-runtime` (fundamentool D-073): every member of `fundamentool/vdom`, and the whole namespace as the
// default export — libraries written for React (MUI, emotion) do `import React from 'react'`.
import * as React from './index';

export * from './index';
// coding.md §6.7's exception for what a tool requires: libraries read React through its default export
// eslint-disable-next-line no-restricted-exports
export default React;
