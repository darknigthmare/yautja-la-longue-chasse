# PR #4 — Menus et lancement Next, 16 octobre 2026

Cette passe repart du commit bb216b0d2819917fe7e002030c675d254ab5132e. Les changements antérieurs de la branche sont conservés, sans fusion de main.

## Changements directement intégrés

Le hook partagé useMenuGamepad refuse maintenant d’ajuster les contrôles désactivés, invisibles ou placés sous un ancêtre ARIA désactivé. Le sélecteur générique tabindex ne doit pas réintroduire un bouton/curseur nativement désactivé. La sélection ignore les options cachées et les options appartenant à un optgroup désactivé. Atteindre une borne sans modifier une valeur ne produit plus d’événements input/change superflus. Les fronts d’appui, répétitions, commandes Retour et protections des fenêtres restent conservés.

Les nouveaux tests Node exécutent le véritable adaptateur privé extrait de la source, avec doubles DOM ; sept des neuf nouveaux cas échouent sur sa version antérieure, puis neuf réussissent après correction. Les six tests de navigation existants sont également exécutés (15 réussites locales au total). Leurs doubles sont complétés avec matches/closest/useRef et l’attente d’un double événement sur valeur inchangée est corrigée. Ces tests ne sont pas présentés comme des parcours avec une manette physique.

Un montage React dédié ajoute dix scénarios avec les vrais contrôles du navigateur et une manette émulée. Il est exécuté en CI. Le navigateur local de cette session refuse le serveur local avec ERR_BLOCKED_BY_ADMINISTRATOR ; ses protections n’ont pas été contournées et aucun succès navigateur local n’est annoncé.

## Lancement local

Le script historique npm start lance Vinext et reste inchangé. Le nouveau script npm run start:production lance explicitement next start et doit suivre npm run build:production. qa:next-production démarre le CLI Next installé sur une interface de boucle locale, contrôle la page principale et son JavaScript compilé, puis vérifie que les trois routes de diagnostic restent fermées sans activation locale explicite. Le processus est arrêté à la fin. Ce contrôle n’est pas une partie complète ni une publication Vercel.

## Correctif de combat préparé, mais NON intégré

Un patch séparé corrige les coups de mêlée ratés devenant des projectiles, les impacts de mêlée à travers les structures solid et les dégâts secondaires de plasma à travers ces structures. Il conserve les plateformes one-way et les règles de couverture existantes. Ses 37 nouveaux tests passent sur la copie corrigée ; 16 échouaient contre HuntCanvas avant modification. Le lot de 132 tests sélectionnés ainsi que TypeScript et le lint ont réussi dans le job 117026735968 de l’exécution GitHub 38916945668.

Cependant, l’étape d’écriture du runner a échoué. Une modification de cette méthode a été bloquée par les contrôles de sécurité ; elle n’a pas été poursuivie. HuntCanvas n’a donc PAS reçu ce correctif dans la branche. Les fichiers temporaires et les tests non raccordés ont été retirés pour ne pas présenter un faux succès ou laisser la suite courante volontairement en échec. Le patch de combat et ses preuves sont fournis séparément dans le compte rendu téléchargeable.

## Qualification

La description de PR doit associer chaque résultat CI au SHA effectivement testé. Cette note ne suppose pas que les nouveaux scénarios HTTP/Chrome sont déjà verts avant leur exécution. Aucun asset, aucune sauvegarde réelle, aucune clé et aucun paramètre de compte n’est modifié. La PR reste en brouillon ; campagne intégrale, nouveaux DLC, art et qualification de production restent ouverts.
