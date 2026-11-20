/** Au démarrage du serveur : crée la base et le catalogue de départ si nécessaire, puis applique les identifiants
    administrateur définis dans les variables d'environnement (ADMIN_PASSWORD, ADMIN_PHONE, ADMIN_EMAIL). */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { seedIfEmpty, syncAdminFromEnv } = await import('./server/seed.js');
    try {
      await seedIfEmpty();
      await syncAdminFromEnv();
    } catch (e) {
      // Deux instances qui démarrent en même temps sur une base neuve : l'une crée le catalogue, l'autre échoue
      // sur les doublons (transaction annulée). Sans gravité : la base est prête.
      console.warn('[démarrage]', e.message);
    }
  }
}
