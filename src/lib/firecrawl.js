// src/lib/firecrawl.js
import FirecrawlApp from '@mendable/firecrawl-js';

// Utiliser la version open source self-hosted si disponible
const apiKey = process.env.FIRECRAWL_API_KEY || 'dummy-key'; // Clé factice pour self-hosted
const apiUrl = process.env.FIRECRAWL_API_URL || 'https://api.firecrawl.dev'; // URL par défaut ou self-hosted

// Si FIRECRAWL_API_URL est défini, utiliser l'instance self-hosted
// Sinon, utiliser l'API cloud (nécessite une vraie clé API)
const app = new FirecrawlApp({
    apiKey: apiKey,
    apiUrl: apiUrl // URL de l'instance self-hosted (ex: http://localhost:3001)
});

export default app;

