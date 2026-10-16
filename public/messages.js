// Translate messages kept by an existing server session or earlier saved readings.
const legacyMessages = [
  [
    "No consultation links were found. If the portal uses row menus, open a registration and its Indicateur de rang, then use Read open indicator.",
    "Aucun lien de consultation n’a été trouvé. Ouvrez une demande et son indicateur de rang, puis utilisez « Lire l’indicateur ouvert »."
  ],
  [
    "The indicator was not readable, or it contains multiple counts. Open the rank page and use Read open indicator to choose the correct value.",
    "L’indicateur est illisible ou contient plusieurs valeurs. Ouvrez sa page, puis utilisez « Lire l’indicateur ouvert » pour choisir la bonne valeur."
  ],
  [
    "Sign in in the portal browser, open Mes demandes d’admission, then click Refresh from portal here.",
    "Connectez-vous dans le navigateur du portail, ouvrez « Mes demandes d’admission », puis cliquez sur « Actualiser » ici."
  ],
  [
    "Stopped after three unreadable registrations. Check the open indicator before trying again.",
    "Arrêt après trois demandes illisibles. Vérifiez l’indicateur ouvert avant de réessayer."
  ],
  [
    "Your portal session needs a sign-in. Finish signing in in the browser, then refresh again.",
    "Votre session a expiré. Connectez-vous dans le navigateur du portail, puis actualisez de nouveau."
  ],
  [
    "Sign in and open a registration’s Indicateur de rang page in the connected browser first.",
    "Connectez-vous et ouvrez d’abord l’indicateur de rang d’une demande dans le navigateur du portail."
  ],
  [
    "This snapshot contains a single reading. Other registrations were not refreshed.",
    "Ce relevé contient une seule demande. Les autres demandes n’ont pas été actualisées."
  ],
  [
    "Finish signing in in the portal browser, then click Refresh from portal.",
    "Terminez votre connexion dans le navigateur du portail, puis cliquez sur « Actualiser »."
  ],
  [
    "Pagination repeated a page. Remaining registrations were not collected.",
    "Une page a été répétée. Les demandes restantes n’ont pas été relevées."
  ],
  [
    "Duplicate registration detected. History has not been changed.",
    "Une demande en double a été détectée. L’historique n’a pas été modifié."
  ],
  [
    "The registration list changed while collecting. Refresh again.",
    "La liste des demandes a changé pendant la collecte. Veuillez actualiser de nouveau."
  ],
  [
    "No registrations were read. Existing history has been kept.",
    "Aucune demande n’a pu être relevée. L’historique existant a été conservé."
  ],
  [
    "Stopped after 50 list pages. More registrations may remain.",
    "Arrêt après 50 pages. Certaines demandes n’ont peut-être pas été relevées."
  ],
  [
    "Invalid waiting-list count. History has not been changed.",
    "Le nombre d’enfants est invalide. L’historique n’a pas été modifié."
  ],
  [
    "Browser closed. Your saved history is still available.",
    "Le navigateur est fermé. Votre historique enregistré reste accessible."
  ],
  [
    "Use a count or range, for example 42, 11–50, or 201+.",
    "Saisissez un nombre ou un intervalle, par exemple 42, 11–50 ou 201+."
  ],
  [
    "Portal connected. Refresh to read your registrations.",
    "Connexion au portail établie. Cliquez sur « Actualiser » pour relever vos demandes."
  ],
  [
    "Connect to the portal to collect your first reading.",
    "Connectez-vous au portail pour effectuer votre premier relevé."
  ],
  [
    "The next page had no readable consultation controls.",
    "La page suivante ne contient aucune commande de consultation lisible."
  ],
  [
    "The row menu did not contain a consultation action.",
    "Le menu de la demande ne contient aucune action de consultation."
  ],
  [
    "The reading must come from the childcare portal.",
    "Le relevé doit provenir du portail des services de garde."
  ],
  [
    "A collection or connection is already running.",
    "Une collecte ou une connexion est déjà en cours."
  ],
  [
    "Open the local dashboard to use this action.",
    "Ouvrez le tableau de bord local pour utiliser cette action."
  ],
  [
    "Wait for the current collection to finish.",
    "Veuillez attendre la fin de la collecte en cours."
  ],
  [
    "Enter the service de garde name.",
    "Saisissez le nom du service de garde."
  ],
  [
    "A collection is already running.",
    "Une collecte est déjà en cours."
  ],
  [
    "Wait for collection to finish.",
    "Veuillez attendre la fin de la collecte."
  ],
  [
    "The browser is already busy.",
    "Le navigateur est déjà occupé."
  ],
  [
    "Opening your portal browser…",
    "Ouverture du navigateur du portail…"
  ],
  [
    "Sign in to the portal first.",
    "Connectez-vous d’abord au portail."
  ],
  [
    "Finding your registrations…",
    "Recherche de vos demandes…"
  ],
  [
    "No indicators were read.",
    "Aucun indicateur n’a pu être relevé."
  ],
  [
    "Request is too large.",
    "La demande est trop volumineuse."
  ],
  [
    "Method not allowed.",
    "Méthode non autorisée."
  ],
  [
    "Garderie dashboard:",
    "Tableau de bord des services de garde :"
  ],
  [
    "Local access only.",
    "Accès local uniquement."
  ],
  [
    "Unknown action.",
    "Action inconnue."
  ],
  [
    "Expected JSON.",
    "Des données au format JSON sont requises."
  ],
  [
    "Not found.",
    "Ressource introuvable."
  ]
];

export function frenchMessage(value = '') {
  let text = String(value);
  for (const [source, translation] of legacyMessages) text = text.split(source).join(translation);
  text = text.replace(/\bSaved (\d+) registrations?/g, (_, count) => count + ' demande' + (Number(count) > 1 ? 's' : '') + ' enregistrée' + (Number(count) > 1 ? 's' : ''));
  text = text.replace(/; (\d+) item\(s\) need attention/g, (_, count) => '; ' + count + ' élément' + (Number(count) > 1 ? 's' : '') + ' à vérifier');
  text = text.replace(/^Reading (.+) \(list page (\d+)\)…$/, (_, name, page) => 'Lecture de ' + name + ' (page ' + page + ')…');
  text = text.replace(/Registration (\d+)/g, 'Demande $1');
  if (/^(?:Could not open the portal browser|browserType\.|browserContext\.)/.test(text)) return 'Impossible d’ouvrir le navigateur du portail. Vérifiez que Microsoft Edge est installé, puis réessayez.';
  if (/Timeout|has been closed|net::ERR_|page\.[a-zA-Z]+:/.test(text)) return 'La lecture du portail a échoué. Vérifiez la connexion et la page ouverte, puis réessayez.';
  if (/Failed to fetch|fetch failed|NetworkError|Unexpected token|Unexpected end/.test(text)) return 'Impossible de communiquer avec le serveur local. Vérifiez que l’application est démarrée, puis réessayez.';
  if (/^(?:ENOENT|EACCES|EPERM|EBUSY|ENOSPC):/.test(text)) return 'Impossible de lire ou d’enregistrer les fichiers locaux. Vérifiez leur accès et l’espace disponible.';
  return text;
}
