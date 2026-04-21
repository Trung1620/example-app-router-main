import { routing } from './routing';

export { routing };

export const locales = routing.locales;
export type AppLocale = (typeof routing.locales)[number];
