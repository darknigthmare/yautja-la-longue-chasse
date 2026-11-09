# Conseil de guerre dans le vrai Next

Le [reçu actuel, tentative 4](attempt-4/final-receipt.json) atteste **18 contrôles
réussis**, sept PNG originaux ouverts et le build `mdrvYovYvfvhuJqeZXn1D`.
Les vingt sources ciblées restent identiques avant/après ; les trente scripts
Next reçus correspondent aux octets du build déclaré. Aucune erreur JS,
console, requête ou HTTP n’est observée. L’identité repose sur ces fichiers et
ce build ; un HEAD Git ou le texte du badge de version ne suffit pas.

Le pilote ouvre la campagne depuis le menu, parcourt réellement le vaisseau
jusqu’au conseil puis ouvre la guerre des clans. Les prérequis adultes/à bord
de la fixture B05 historique sont déclarés ; aucune campagne depuis zéro
n’est prétendue. Il ouvre les dialogues natifs, vérifie focus et retour Escape
avant le retour GameClient, parcourt les quatorze outils regroupés et contrôle
les écrans 390/320.

Trois contrôles supplémentaires mesurent désormais **le titre et le bouton
Quitter hors du rectangle du HUD global** en 1440/390/320. Le bouton est activé
et son centre est réellement atteint par `elementFromPoint`. Les sept PNG
originaux confirment la lisibilité des titres, l’absence de chevauchement des
stocks et la présence du globe. L’inset reprend `screen-safe` de `globals.css`
avec son seuil de 760 px, uniquement pour l’hôte direct `.screen.panel-screen` :
les fixtures et aperçus sans ce HUD restent inchangés.

Le briefing est annulé sans initialiser d’archive ni débiter de RAV, puis une
vraie opération RTS est lancée avec une seule équipe : `W115-OPS-0001`, 119 RAV.
Le vrai bouton **Quitter le conseil** est ensuite cliqué et le pilote attend le
retour visible au vaisseau. La sauvegarde de campagne entière, avant/après ce
parcours, comporte **10 767 octets strictement identiques**, acceptés aussi par
le vrai `parseSaveImport` courant appelé en lecture seule. Aucune clé sentinelle
ne sert de substitut de sauvegarde.

Les tentatives antérieures restent datées. La 1 conserve l’échec de mesure
pendant l’animation native d’entrée de 0,18 seconde ; seul le pilote a ensuite
attendu sa fin, sans modifier les bornes. Les 2 et 3 ont réussi leurs 15 contrôles
d’interaction, mais leurs captures ont montré l’en-tête couvert par la barre
absolue du jeu. La 3 a reproduit le défaut à défilement revenu en haut, permettant de distinguer
le problème d’intégration d’un simple cadrage. La 4 teste le vrai correctif CSS
avec les trois nouveaux contrôles et le retour effectif. **Les répétitions ne
sont pas additionnées comme 45 contrôles uniques.** Aucun ancien rapport brut
n’a été réécrit pour prétendre au nouvel état.

Vérification des reçus et fichiers en lecture seule (dernière tentative
finalisée par défaut ; `--attempt 3` permet de relire un état antérieur) :

```bash
python3 production/clan-war-command-20261109/qa/next/verify.py
```

Le terrain RTS demeure l’épreuve existante 9 × 6 ; ce lancement ne vaut ni victoire
RTS ni achèvement d’une grande carte source. Manette physique, revue artistique
humaine, fidélité AAA/canonique globale, partie serveur et fermeture de tous
les P0/P1 restent hors de cette qualification. Les reçus de composants et du
hook manette synthétique conservent leur périmètre propre.
