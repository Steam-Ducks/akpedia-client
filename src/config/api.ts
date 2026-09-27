// In development requests stay on the Vite origin and are proxied to the API (see vite.config.ts).
export const API_BASE_URL: string = import.meta.env.DEV
  ? ''
  : (import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8080')
