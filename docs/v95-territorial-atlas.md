# Korthas : atlas des guerres territoriales V95

Depuis **Guerres des clans**, le front de Korthas s’ouvre sur une planète
orientable. Le globe et le planisphère représentent les 36 territoires du
scénario, regroupés en six terres distinctes. Les couleurs, motifs et symboles
suivent le contrôleur réel de chaque zone. Les six silhouettes constituent une
géographie schématique ; elles ne créent ni passages, ni ressources, ni bonus.

La carte permet de choisir le départ et une destination voisine, de centrer un
continent, d’afficher les routes et de voir les ordres réservés. Sa liste donne
aussi accès à tous les territoires au clavier et sur écran tactile. Les
pourcentages de contrôle et les régions entièrement tenues évoluent avec les
prises et les cessions résolues.

Les ordres utilisent le moteur stratégique existant : reconnaissance, assaut,
déplacement, cession négociée, transit, logistique et soins. Réserver un ordre
ne change aucun drapeau ; la confirmation du tour résout aussi les actions
adverses. Une reconnaissance fournit une estimation datée. Les effectifs,
stocks et liaisons exacts des autres factions ne sont pas dévoilés par l’atlas
ou le panneau de commandement.

Le front libre conserve son archive de Korthas et ses personnes. L’atelier de
la Bible V6 reste séparé : ses reconnaissances et ouvrages ne deviennent pas
des annexions. Cette livraison porte sur le théâtre jouable de Korthas ; elle
n’ajoute ni nouvelles planètes conquérables ni récompenses à la chasse principale.

## Vérifier

```sh
node --test tests/clan-war-atlas-v95.test.mjs tests/clan-war-atlas-ui-v95.test.mjs tests/clan-war-session-v85.test.mjs
npm run typecheck
npm run lint
npm run build
```

Avec le jeu démarré par `npm run dev`, le parcours navigateur réel se lance par :

```sh
node scripts/qa-clan-war-atlas-v95.mjs
```

Le script utilise un contexte Chromium neuf, ouvre le menu normal, joue une
reconnaissance puis un assaut, vérifie la capture et sa couleur, recharge la
partie et contrôle le clavier ainsi que le format mobile. Il n’injecte aucun
état de guerre ou de campagne. Il écrit son résultat et ses captures dans
`outputs/qa-clan-war-atlas-v95/`.

`YAUTJA_QA_BASE_URL` choisit un serveur local différent,
`CHROMIUM_EXECUTABLE_PATH` le binaire Chromium et `YAUTJA_ATLAS_QA_OUTPUT` le
dossier des preuves. Dans le cloud, l’exécution du navigateur et le canal IPC
du lanceur de tests doivent être autorisés par le sandbox ; un résultat qui
ne compte que les fichiers de tests ne confirme pas l’exécution des sous-tests.
