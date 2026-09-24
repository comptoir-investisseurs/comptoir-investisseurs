/* =========================================================================
   Relais de cours (Yahoo Finance) pour l'onglet Produits structurés.
   -------------------------------------------------------------------------
   Les proxys CORS publics gratuits (corsproxy.io, allorigins…) utilisés
   auparavant sont trop peu fiables (souvent hors service ou bloqués par
   Yahoo). Ce petit service, hébergé sur Render en plus du site statique,
   va chercher les cours lui-même côté serveur (pas de souci de CORS côté
   serveur) et les renvoie tels quels au navigateur.
   Aucune donnée n'est stockée : simple relais, sans état.
   ========================================================================= */
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  next();
});

app.get('/', (req, res) => res.send('LFDR quotes proxy OK'));

app.get('/chart/:ticker', async (req, res) => {
  const ticker = req.params.ticker;
  const period1 = req.query.period1;
  const period2 = req.query.period2;
  const interval = req.query.interval || '1wk';
  if (!ticker || !period1 || !period2) {
    return res.status(400).json({ error: 'Paramètres manquants (ticker, period1, period2).' });
  }
  const hosts = ['https://query1.finance.yahoo.com', 'https://query2.finance.yahoo.com'];
  for (const host of hosts) {
    try {
      const url = host + '/v8/finance/chart/' + encodeURIComponent(ticker) +
        '?period1=' + encodeURIComponent(period1) + '&period2=' + encodeURIComponent(period2) + '&interval=' + encodeURIComponent(interval);
      const r = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (compatible; LFDR-quotes/1.0)' } });
      if (r.ok) {
        const data = await r.json();
        res.set('Cache-Control', 'public, max-age=3600');
        return res.json(data);
      }
    } catch (e) { /* on tente l'hôte suivant */ }
  }
  res.status(502).json({ error: 'Yahoo Finance indisponible pour le moment.' });
});

app.listen(PORT, () => console.log('LFDR quotes proxy listening on port ' + PORT));
