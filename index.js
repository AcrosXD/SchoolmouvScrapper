const axios = require('axios');
const prompt = require('prompt-sync')();
const fs = require('fs/promises');
const cheerio = require('cheerio');

var token;
var userId;

async function fetchAndExtractData(url) {
  try {
    // Étape 1: Faire la requête GET pour récupérer le contenu HTML
    const response = await axios.get(url, {
      headers: {
        Cookie: "user_id=" + userId + "; token=" + token,
      }
    });
    const html = response.data;

    // Étape 2: Charger le HTML avec Cheerio pour manipuler le DOM
    const $ = cheerio.load(html);

    // Trouver le script contenant la variable JavaScript
    let scriptContent;
    $('script').each((i, script) => {
      const scriptText = $(script).html();
      if (scriptText.includes('window.__INITIAL_STATE__')) {
        scriptContent = scriptText;
      }
    });

    if (!scriptContent) {
      throw new Error('Variable JavaScript non trouvée dans les balises <script>.');
    }

    // Étape 3: Isoler et évaluer la variable JavaScript
    const regex = /window\.__INITIAL_STATE__\s*=\s*(\{.*\});/s;
    const match = scriptContent.match(regex);

    if (!match || match.length < 2) {
      throw new Error('Impossible de trouver la déclaration de la variable JavaScript.');
    }

    const variableData = match[1];

    //Utiliser eval pour évaluer la variable dans un contexte sécurisé
    const data = JSON.parse(variableData);

    //console.log(variableData);
    return data;

  } catch (error) {
    console.error('Erreur lors de la récupération des données:', error);
  }
}

async function downloadFile(middlePath, fileName) {
  try {
    axios.get('https://www.schoolmouv.fr/eleves/api/resources/cours/' + middlePath + '/fiche-de-cours/pdf', {
      headers: {
        Authorization: 'Bearer ' + token,
        "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
      }
    }).then(async (response1) => {
      if (response1.data == "Unauthorized") {
        console.log("[ACCOUNT] Il semblerait que ce compte n'ai pas accès aux téléchagements.");
        return;
      }
      const response = await axios.get(response1.data, {
        responseType: 'arraybuffer',
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
        }
      });
      const fileData = Buffer.from(response.data, 'binary');
      await fs.writeFile('./pdf/' + fileName + '.pdf', fileData);
    });
  } catch (error) {
    console.log('[ERROR] Erreur lors du téléchargement.');
    console.error(error);
  }
}
// https://www.schoolmouv.fr/eleves/cours/mouvements-et-cinematique/fiche-de-cours/pdf
// https://www.schoolmouv.fr/eleves/api/resources/cours/la-statique-des-fluides/fiche-de-cours/pdf
const login = (email, password) => {
  return axios.post('https://www.schoolmouv.fr/membre/api/signin', {
    login: email,
    password: password
  }).then((response) => {
    token = response.data.token;
    console.log('-----DEBUG LOG-----');
    console.log('Id: ' + response.data.user.id);
    userId = response.data.user.id;
    console.log('Account Type: ' + response.data.user.userType);
    console.log('-----Infos de DEBUG au dessus, tu peux les ignorer.-----');
    console.log('Tu es connecté !');
  }
  ).catch((error) => {
    console.log('[ERROR] Erreur lors de la connexion.');
    console.log(error);
  });
}
const getCourses = async (token) => {
  return axios.get('https://www.schoolmouv.fr/eleves/api/chapters-indexes/5ce7e370655d020100fcd923/chapters', {
    headers: {
      Authorization: 'Bearer ' + token,
      "User-Agent": "Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36",
      Referer: "https://www.schoolmouv.fr/eleves/physique-chimie"
    }
  })
};
console.log('Schoolmouv API Scrapper');
console.log('Pour commencer tu dois rentrer tes identifiants Schoolmouv.')
console.log('-----------------------------------');
let email = prompt('Email: ');
let password = prompt('Password: ');
let sure = prompt('Tu es sûr de vouloir continuer ? (y/n): ');
if (sure == 'y') {
  login(email, password).then((loginInfo) => {
    console.log('Choisis ce que tu veut scraper:');
    console.log('1. Cours Permière');
    console.log('2. Cours Terminale');
    console.log('0. DEBUG');
    let choice = prompt('Choix: ');
    console.log('-----------------------------------');
    if (choice == '0') {
      console.log('DEBUG')
      getCourses(token).then((response) => {
        response.data.forEach((course) => {
          for (i = 0; i < course.sheets.length; i++) {
            downloadFile(course.sheets[i].slug, course.sheets[i].name).then(() => {
              //console.log('Téléchargement de ' + course.sheets[i].name + '.pdf terminé.');
            });
          }
        });
      });
    }
    if (choice == '5') {
      fetchAndExtractData('https://www.schoolmouv.fr/eleves/').then((data) => {
        console.log(data);
      });
    }
  });
} else {
  console.log('Annulation.');
  return;
}