/** Console Apps grid filter pills — portfolio (client) before studio tools, then environment. */
export const APPS_GRID_FILTERS = ['all', 'client', 'studio', 'local', 'production'] as const;

export type AppsGridFilter = (typeof APPS_GRID_FILTERS)[number];
