# Réconciliation des opérations V115 : patrouilles, verrou et marche forcée

Cette branche réunit la PR #69 (verrou V115, gantelets #42 et migration de
patrouille #67) avec la marche forcée Outer Ops de #70. Le conflit d'import du
composant conserve les commandes des deux modes. Les PR parentes et leurs
classeurs restent inchangés ; les branches restent distinctes de main.

Dans l'essai Chromium, un autre onglet maintient le verrou pendant un ordre de
marche forcée : aucun RAV ni octet d'archive ne change et un message invite à
réessayer. Après libération, le coût de 3 RAV n'est appliqué qu'une fois, le
rechargement conserve la marche et le rappel reste possible. Les tests couvrent
aussi les archives de test produites par le moteur #57 avec et sans rappel,
les deux formats de patrouille, les réinitialisations périmées et minuteries.

Les archives sont produites pour les tests et ne sont pas des sauvegardes
historiques de joueurs. Le banc Chromium est une fixture Vite, pas un serveur
Next de production. Le cloud, les autres appareils, les clients non coopérants,
la campagne complète et la fidélité visuelle 1:1 restent à valider. Les règles
de coût et de durée sont des règles de jeu, pas une revendication canonique.
