export const NS = 'commands';

export const zh = {
  'card.title.one': '已执行 {count} 个命令',
  'card.title.other': '已执行 {count} 个命令',
  'meta.failed': '{count} 失败',
};

export type CommandsKey = keyof typeof zh;

export const en: Record<CommandsKey, string> = {
  'card.title.one': 'Ran {count} command',
  'card.title.other': 'Ran {count} commands',
  'meta.failed': '{count} failed',
};
