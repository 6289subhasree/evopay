/** Every page in reading order. Used by the palette, the outro "next chapter" link and the top-bar counter. */
export const CHAPTERS = [
  { path: '/dashboard', title: 'Command Center', kicker: 'Operational overview', key: 'd' },
  { path: '/red-team', title: 'Red Team Lab', kicker: 'Adversarial operations', key: 'r' },
  { path: '/simulation', title: 'Attack Simulator', kicker: 'Controlled environment', key: 's' },
  { path: '/transactions', title: 'Transactions', kicker: 'Payment intelligence', key: 't' },
  { path: '/network', title: 'Fraud Network', kicker: 'Entity intelligence', key: 'n' },
  { path: '/blue-team', title: 'Blue Team', kicker: 'Defense operations', key: 'b' },
  { path: '/incidents', title: 'Incidents', kicker: 'Response queue', key: 'i' },
  { path: '/analytics', title: 'Analytics', kicker: 'Measured results', key: 'a' },
  { path: '/settings', title: 'Settings', kicker: 'Workspace configuration', key: 'c' },
] as const

export const chapterIndex = (path: string) => Math.max(0, CHAPTERS.findIndex((chapter) => chapter.path === path))
