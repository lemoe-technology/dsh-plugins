import type { ThemeDefinition } from '@deepseek-ai/dsh-client-ui-theme/client';

export const definition: ThemeDefinition = {
  id: 'vscode-2026-dark',
  colorScheme: 'dark',
  tokens: {
    // bg
    '--dsw-alias-bg-base': '#121314',
    '--dsw-alias-bg-layer-1': '#202122',
    '--dsw-alias-bg-layer-2': '#242526',
    '--dsw-alias-bg-overlay': '#242526',
    '--dsw-alias-bg-document-selection': '#276782dd',
    '--dsw-alias-bg-multi-select': '#2c2d2e',

    // label
    '--dsw-alias-label-primary': '#d4d4d4',
    '--dsw-alias-label-secondary': '#8c8c8c',

    // border
    '--dsw-alias-border-l1': '#2a2b2c',
    '--dsw-alias-border-l2': '#333536',

    // button
    '--dsw-alias-button-info-fill': '#297aa0',
    '--dsw-alias-button-info-hover': '#3994bc',

    // menu
    '--dsw-menu-surface-fill': '#202122',
    '--dsw-specific-menu': '#202122',
    '--dsw-alias-menu-group-header-fill': '#202122',

    // link
    '--dsw-alias-link': '#48a0c7',

    // markdown
    '--dsw-alias-markdown-code-block': '#191a1b',
    '--dsw-alias-markdown-code-block-banner': '#202122',
    '--dsw-alias-markdown-inline-code': '#262626',
    '--dsw-alias-markdown-citation': '#242526',

    // state
    '--dsw-alias-state-error-primary': '#f48771',
    '--dsw-alias-state-success-primary': '#73c991',
    '--dsw-alias-state-warn-primary': '#e5ba7d',
    '--dsw-alias-state-idle-primary': '#555555',
    '--dsw-alias-state-business-primary': '#3994bc',

    // diff
    '--dsw-alias-code-diff-added': '#57ab5a4d',
    '--dsw-alias-code-diff-deleted': '#f470674d',
    '--dsw-alias-file-diff-added-bg': '#347d3926',
    '--dsw-alias-file-diff-added-gutter': '#347d3926',
    '--dsw-alias-file-diff-added-marker': '#73c991',
    '--dsw-alias-file-diff-deleted-bg': '#c93c3726',
    '--dsw-alias-file-diff-deleted-gutter': '#c93c3726',
    '--dsw-alias-file-diff-deleted-marker': '#f48771',

    // toast
    '--dsw-alias-toast-bg': '#202122',

    // tooltip
    '--dsw-alias-tooltip-bg': '#202122',

    // specific
    '--dsw-specific-sidebar-fill': '#191a1b',
    '--dsw-specific-bubble': '#191a1b',
    '--dsw-specific-input-major': '#191a1b',

    // shiki
    '--shiki-foreground': '#bbbebf',
    '--shiki-token-comment': '#8b949e',
    '--shiki-token-keyword': '#ff7b72',
    '--shiki-token-string': '#a5d6ff',
    '--shiki-token-string-expression': '#a5d6ff',
    '--shiki-token-constant': '#79c0ff',
    '--shiki-token-function': '#d2a8ff',
    '--shiki-token-parameter': '#ffa657',
    '--shiki-token-punctuation': '#c9d1d9',
    '--shiki-token-link': '#48a0c7',
    '--shiki-token-inserted': '#73c991',
    '--shiki-token-deleted': '#f48771',
    '--shiki-token-changed': '#e5ba7d',
  },
};
