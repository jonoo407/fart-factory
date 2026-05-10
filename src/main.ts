import { isFartFactory } from './sanity';

if (isFartFactory()) {
  const app = document.getElementById('app');
  if (app) {
    app.innerHTML = '<h1>The Fart Factory</h1><p>Tier 0 scaffold — content lands in next iteration.</p>';
  }
}
