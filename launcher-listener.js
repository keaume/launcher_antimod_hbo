const { execFile } = require('child_process');
const path = require('path');

const AUTO_SCRIPT = path.join(__dirname, 'habbo_auto.py');

const SITE = 'https://launcherantimodhbo-production.up.railway.app';
const LAUNCHER_SECRET = process.env.LAUNCHER_SECRET;

if (!LAUNCHER_SECRET) {
  console.log('❌ Variable LAUNCHER_SECRET manquante (même valeur que sur Railway).');
  process.exit(1);
}

// Un token Habbo ne contient que lettres, chiffres, "-", "_" et "."
const TOKEN_REGEX = /^[A-Za-z0-9._-]{1,200}$/;

let isLaunching = false;

async function checkLaunches() {

  try {

    const res = await fetch(`${SITE}/api/pending-launches`, {
      headers: { 'x-launcher-key': LAUNCHER_SECRET }
    });

    if (!res.ok) {
      console.log('Erreur serveur:', res.status);
      return;
    }

    const data = await res.json();

    if (!data.launches?.length) return;

for (const launch of data.launches) {

console.log(`Ouverture Habbo pour ${launch.username}`);

const token = (launch.personal_note || '').trim();

if (!TOKEN_REGEX.test(token)) {
  console.log(`⚠️ Token invalide pour ${launch.username}, lancement ignoré`);
  continue;
}

// Pas de shell : l'URL est passée comme un seul argument
execFile('rundll32', ['url.dll,FileProtocolHandler', `habbo://hab?server=hhfr&token=${token}`], (err) => {
  if (err) console.log('Erreur ouverture Habbo:', err.message);
  else console.log('Commande Habbo envoyée');
});

console.log('Attente 2 secondes avant auto script...');

setTimeout(() => {

  console.log('Lancement habbo_auto.py...');

  execFile('python', [AUTO_SCRIPT], { cwd: __dirname }, (err, stdout, stderr) => {

    if (err) {
      console.log('Erreur habbo_auto.py:', err.message);
      return;
    }

    if (stderr) console.log('STDERR:', stderr);
    if (stdout) console.log('STDOUT:', stdout);

    console.log('habbo_auto.py terminé');

  });

}, 2000);

}

  } catch (err) {
    console.log('Erreur:', err.message);
  }

}

console.log('🎧 Listener lancé...');

setInterval(checkLaunches, 500);