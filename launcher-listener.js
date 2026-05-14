const { exec } = require('child_process');

const SITE = 'https://launcherantimodhbo-production.up.railway.app';

async function checkLaunches() {

  try {

    const res = await fetch(`${SITE}/api/pending-launches`);
    const data = await res.json();

    if (!data.launches?.length) return;

    for (const launch of data.launches) {

      const token = launch.personal_note;

      if (!token) continue;

      console.log('🚀 Launch:', token);

      exec(`start "" "habbo://hab?server=hhfr&token=${token}"`);
    }

  } catch (err) {
    console.log('Erreur:', err.message);
  }

}

console.log('🎧 Listener lancé...');

setInterval(checkLaunches, 500);