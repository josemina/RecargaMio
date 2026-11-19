// Dirección de la API. Se configura en apps/mobile/.env (EXPO_PUBLIC_API_URL, ver .env.example).
// En el teléfono debe ser la IP del computador en la red local: localhost sería el propio teléfono.
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000').replace(/\/+$/, '');
