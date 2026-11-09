# Tutoriel intégré — vrai Next/GameClient

**20 contrôles réussis** sur le build `kS-6-0gmSFRZVosfYvnq6`, depuis le
checkpoint initial déclaré de Young Blood historique. Le joueur marche à la
porte réelle du Mausolée, entre, rejoint le poste des trophées et ouvre le
tutoriel depuis le service. Les dix-huit gestes sont réellement accomplis
avec vingt-et-un événements confirmés par le writer principal de `SaveGame`.

Trois interruptions/rechargements conservent le même modèle et le journal :
après le relevé du geste3, après la seule face du geste9, puis après la plaque
du geste16. Le refus d'un vrai `Storage.setItem` de campagne par
`QuotaExceededError` laisse les octets principaux et le geste inchangés ;
la méthode native est restaurée avant la confirmation suivante.

Les contrôles vérifient les largeurs390/320, l'absence d'obstruction du HUD,
le retour au véritable poste intérieur, les valeurs de rang/honneur/marques,
les vrais trophées et missions. Le sidecar de progression du vaisseau reste
absent ; aucune nouvelle clé de flotte n'est créée. Les manifestes présents
dans les quatre checkpoints de slot comparés conservent le même état métier ;
seuls `updatedAt` et `loadoutPresets[].savedAt` y sont régénérés par les API de
reprise en l'absence de sidecar. Aucun octet identique de slot complet n'est
revendiqué. L'état d'acquisition reste absent. Les 128 réponses JavaScript
(32 fichiers distincts) correspondent aux fichiers compilés. Les quatre
documents Next annoncent le build attendu. Aucun script, HTTP, requête ou
console ne présente d'erreur ; neuf sources ciblées et le build restent
identiques avant/après. Les 1 293 entrées applicatives ont aussi été comparées
à la source gelée du build après le parcours.

Les onze PNG originaux ont été ouverts. Le
[supplément de reprise](../native-replay-completed/report.json) restaure
**le véritable checkpoint final gagné**, puis éloigne le chasseur au clavier.
Ses trois contrôles supplémentaires montrent le modèle immobile au cabinet,
sans réécriture ou duplication du journal. Sa capture originale a été ouverte.
Ce supplément est distinct des vingt contrôles du parcours complet.

L'initialisation de scénario est explicitement décrite dans
`fixture-disclosure.json` : `defaultSave` legacy Young Blood sans prologue,
trophées ni activité préparés ; seul un checkpoint extérieur valide est donné.
Les API de campagne préparent le slot avant le montage du jeu. Cela ne prouve
ni une campagne depuis la nurserie, ni le rite Young Blood actuel. Le modèle
pédagogique est la branche permise par TR-M01 ; les originaux chassés, les
chaînes avancées, l'avis artistique humain et les manettes physiques ne sont
pas qualifiés. Aucun bonus, rang ou vaisseau n'est créé par cette activité.

La tentative1 reste conservée : son pilote visait le centre non praticable du
comptoir. Le pilote final choisit une approche libre satisfaisant le véritable
contact métier, puis marche jusqu'à ce point. Aucun code applicatif n'a été
modifié entre ces tentatives et le build n'a pas été refait.

Vérification d'intégrité sans nouvelle partie :

```bash
python3 production/clan-war-command-20261109/qa/trophy-tutorial/verify-native.py
```
