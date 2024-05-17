const axios = require('axios');
const prompt = require('prompt-sync')();
const fs = require('fs/promises');

var token;

async function downloadFile(middlePath, fileName) {
  try {
    const response = await axios.get('https://www.schoolmouv.fr/eleves/api/resources/cours/' + middlePath + '/fiche-de-cours/pdf', { responseType: 'arraybuffer' });
    if (response.data == "Unauthorized") {
      console.log("[ACCOUNT] Il semblerait que ce compte n'ai pas accès aux téléchagements.");
      return;
    }
    const fileData = Buffer.from(response.data, 'binary');
    await fs.writeFile('./pdf/' + fileName + '.pdf', fileData);
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
      console.log('DEBUG');
      getCourses(token).then((response) => {
        response.data.forEach((course) => {
          for (i = 0; i < course.sheets.length; i++) {
            downloadFile(course.sheets[i].slug, course.sheets[i].name).then(() => {
              console.log('Téléchargement de ' + course.sheets[i].name + '.pdf terminé.');
            });
          }
        });
      });
    }
  });
} else {
  console.log('Annulation.');
  return;
}
