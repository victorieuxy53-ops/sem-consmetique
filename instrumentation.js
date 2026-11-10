/** Au démarrage du serveur : crée la base et le catalogue de départ si nécessaire. */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { seedIfEmpty } = await import('./server/seed.js');
    await seedIfEmpty();
  }
}
 