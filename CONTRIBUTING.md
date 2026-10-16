# Contribuer à Petits pas

Les corrections et les retours sur d’autres configurations sont bienvenus. L’interface et la documentation destinée aux parents sont en français.

## Développer et vérifier

1. Installez Git et Node.js 22 ou plus récent, puis les dépendances avec `npm ci`.
2. Exécutez `npm run check` et `npm test`.
3. Pour une modification du collecteur, exécutez aussi `npm run test:browser`. Configurez `BROWSER_CHANNEL` si Edge n’est pas installé; consultez le README pour utiliser Chrome ou Chromium.
4. Avant de proposer les changements, exécutez `npm run check:share` et relisez `git diff` ainsi que les fichiers ajoutés.

Les tests doivent rester indépendants d’un vrai compte. Utilisez des noms, des identifiants et des pages fictifs. Les tests avec navigateur interceptent les requêtes réseau du portail.

Pour modifier un sélecteur, ajoutez un cas reproduisant la structure observée sans recopier des données personnelles. Vérifiez que les actions restent limitées à la consultation : la collecte ne doit jamais modifier, supprimer ou déposer une demande.

## Signaler un problème

Précisez le système d’exploitation, les versions de Node.js et du navigateur, les étapes suivies et le message affiché. Indiquez si le portail est bien en français et si le service propose un indicateur de rang.

Ne joignez pas de mot de passe, de code de vérification, de cookie, de profil de navigateur, de fichier `.local/history.json`, d’export réel ou de capture non masquée. Les noms d’enfants et les identifiants présents dans les URL doivent aussi être retirés. Un extrait de page doit être réduit à la structure nécessaire et rempli avec des données fictives.

Une nouvelle configuration réussie peut être documentée; elle ne doit pas être présentée comme une validation de tous les comptes.
