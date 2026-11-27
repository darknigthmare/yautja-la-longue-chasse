# The PIT — Les Masques Brisés

**Version de conception 1 — 27 novembre 2026.**

Cette extension originale ajoute **10 combattants, 20 arènes, 20 types d’ennemis, 20 boss, 20 props et 10 projectiles**. La campagne couvre **5 actes de 4 étapes**. Les combattants disposent de **30 spéciaux et 10 supers** ; les boss de **60 phases décrites**.

Le registre est complet au niveau de la conception. Les éléments portent le statut `designed`. Les images produites dans le même lot disposent d’un suivi artistique séparé : une pose neutre ou une scène composite ne clôt pas les animations, les couches de décor, le kit ou la rencontre.

Source structurée : [extension.v1.json](../../content/the-pit/les-masques-brises/extension.v1.json). Raccordement : [bible The PIT](BIBLE_THE_PIT.md), [exigences communes de combat](combat-guide/combat_extensions_requirements.json) et [guide de développement du projet](../GAMEDEV_AGENT_GUIDE.md).

## Intention et histoire

Un masque volé dans un dépôt ne prouve aucune victoire. Quand des balises falsifiées conduisent les chasseurs dans des pièges, dix rivaux suivent les traces matérielles du mensonge.

Le réseau repose sur des objets matériels : masques, armes, balises, listes de routes et cellules de transport. Les dix chasseurs s’y opposent pour des raisons différentes. Ils cherchent un compagnon, une preuve, une arme ou la réparation d’une faute ; leur alliance est circonstancielle. La campagne traverse un dépôt pillé, une lune sèche, un estuaire, une lune gelée et un porteur renégat.

Les nouveaux noms sont des noms d’usage français. Les individus, espèces et lieux sont créés pour ce jeu ; ils ne modifient pas le destin d’un personnage officiel. L’arbitre et les convoyeurs appartiennent à une organisation locale à cette intrigue. Les matières, l’anatomie, les familles d’armes et les comportements s’appuient sur les références listées en fin de document, dans la portée propre à chacune.

## Principes de jeu et de production

- Conserver un plan latéral unique, un sol lisible et des silhouettes entières.
- Prévoir une version compétitive de chaque arène sans danger, collision mobile ou caméra imposée.
- Donner à chaque provocation une entrée, une tenue, une sortie et une interruption ; conserver sa vulnérabilité et l’absence de gain de jauge.
- Maintenir l’absence d’une arme en main pendant son détachement. Disques, filets, munitions et pièges ont un propriétaire et un budget.
- Enseigner une lecture avant de la combiner à une autre. Une transition de phase ne donne pas de dégâts gratuits et n’efface pas le combo.
- Régler dégâts, portées et timings dans le moteur existant. Les intentions de cette bible ne sont pas des valeurs déjà testées.
- Donner aux kits de contact un accès effectif aux modules nécessaires des machines ; aucun projectile obligatoire ajouté par surprise.
- Porter l’histoire par les gestes, les preuves et les motifs personnels. Les conclusions non létales prévues restent des résolutions valides.

Le blockout précède le décor final. Les métriques se prennent dans les modules actuels de combat et de caméra, puis se vérifient en jeu. Chaque étape ménage observation, rencontre et retour au calme avant le départ. Cette méthode suit le [guide de level design épinglé par le projet](https://github.com/gamedev-skills/awesome-gamedev-agent-skills/blob/19d93f97c9c1ea0f8b306e77aa81e0d3e352d3e9/skills/disciplines/level-design/SKILL.md).

## Dix combattants originaux

| Combattant | Rôle | Rival |
| --- | --- | --- |
| Silex | Polyvalent à moyenne portée : estoc, tir ponctuel et récupération d’arme. | Le Porte-Masques |
| Cendre | Pression rapprochée et variations de rythme. | La Maîtresse des Cendres |
| Brisecroc | Saisies, déplacement adverse et filet risqué. | Le Ravisseur |
| Vigie | Contrôle de distance à l’arc au prix de l’immobilité. | La Traqueuse d’Échos |
| Éclat | Trajectoires aller-retour et gestion d’une arme unique. | Le Collecteur |
| Rempart | Défense active et punition, vulnérable aux prises et aux bas. | La Garde d’Os |
| Suture | Lanceur à chargeur limité et interceptions précises. | Le Chasseur de Reliques |
| Sillage | Mobilité et feinte de camouflage lisible. | Le Scelleur |
| Balafre | Contre-attaque et lecture du rythme. | Le Juge Déchu |
| Herse | Coups lourds engagés et contrôle du sol. | Le Premier Parjure |

### Silex

Un chasseur méthodique poursuit les balises volées dans le dépôt dont il avait accepté la garde.

**Identité visuelle.** Yautja adulte de carrure moyenne ; masque triangulaire cuivre mat avec deux sillons courts, peau ocre mouchetée, épaulière gauche basse et sangles brunes. Aucune corne ni cape.

**Caractère.** Il répond de la disparition du dépôt et veut rapporter des preuves. Mesuré, il ne confond pas victoire et exhibition.

**Intro.** Pose un fragment de balise au sol, déploie sa lance et relève la tête.

**Provocation.** Ramène la lance à la verticale → Frappe le sol une seule fois avec son talon → Reprend une garde à deux mains. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Pointe de garde (spécial) | Estoc horizontal qui arrête une avancée. | Pointe alignée et bras arrière ramené. Faire manquer la pointe, puis punir le rappel. | Aucune poursuite automatique ; vulnérable à mauvaise distance. |
| Trait de plasma (spécial) | Tir d’épaule à hauteur du buste. | Laser et charge lumineuse visibles. Sauter ou avancer après le départ. | Énergie consommée ; aucun tir en camouflage. |
| Lance détachée (spécial) | Lancer rectiligne du combistick, puis récupération. | Prise de lancer visible et transfert du poids. Esquiver et exploiter l’absence d’arme. | Une lance active ; estocs indisponibles avant son retour. |
| Preuve de la chasse (super) | Un estoc confirmé mène à un revers de hampe et un tir proche. | Lance abaissée avant l’engagement. Garder le premier contact ou le faire manquer. | Jauge consommée au départ ; aucune cinématique sur whiff. |

**Contre-jeu.** Rester près de lui réduit l’avantage de sa lance ; tirer ou lancer laisse une récupération franche.

**Victoire.** Récupère le fragment avant de ranger sa lance.

**Fin.** Les balises reviennent à leurs détenteurs. Silex laisse le masque du Porte-Masques dans la salle des preuves et reprend la garde du dépôt avec un autre chasseur, par choix.

**Pièces propres à produire.** Combistick fermé, déployé, en vol et au sol séparés ; Canon d’épaule et plasma indépendants.

### Cendre

Une chasseuse poursuit la vétérane qui a vendu les itinéraires de son groupe.

**Identité visuelle.** Yautja adulte athlétique, peau gris brun marquée cuivre, masque noir au front bas, deux avant-bras armés de lames ; cuir rouge sombre et armure légère. Aucun feu corporel.

**Caractère.** La Maîtresse des Cendres connaissait les siens. Cendre refuse que leur perte devienne une belle légende.

**Intro.** Retire un morceau de métal fondu d’une lame, le laisse tomber, avance.

**Provocation.** Rentre une lame → Présente la paume libre et attend → Redéploie la lame et reprend son appui. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Lames croisées (spécial) | Deux coupes proches avec engagement distinct sur la seconde. | Poignets écartés avant la première coupe. Interrompre l’intervalle ou punir la seconde coupe gardée. | Aucune chaîne indéfinie ni avantage garanti après garde. |
| Pas de cendre (spécial) | Court pas en avant suivi d’un revers. | Compression des jambes et épaule avancée. Frapper bas dans le déplacement ou punir le freinage. | Pas de téléportation ou invincibilité. |
| Remontée des lames (spécial) | Anti-air qui couvre le dessus du buste. | Avant-bras croisés sous le menton. Feinter le saut et punir la descente. | Portée faible au sol et réception vulnérable. |
| Aucune dette oubliée (super) | Premier contact confirmé, trois frappes puis rejet au neutre. | Un bref arrêt précède l’élan. Garder l’amorce ; pas de saisie automatique. | Conserve la limite et l’historique du combo. |

**Contre-jeu.** Ses déplacements ne traversent pas les attaques ; la repousser l’oblige à revenir à découvert.

**Victoire.** Nettoie ses lames puis regarde la sortie plutôt que le public.

**Fin.** Elle détruit le registre qui exposait son groupe et conserve le nom d’une survivante. La fosse est derrière elle ; une recherche commence.

**Pièces propres à produire.** Deux jeux de lames rentrées/sorties, côtés conservés ; Étincelles indépendantes ; pas de feu permanent.

### Brisecroc

Un vétéran massif cherche un compagnon capturé vivant par le Ravisseur.

**Identité visuelle.** Torse large, peau ocre tachetée, masque en fer gris patiné fendu à droite, mandibule inférieure marquée ; avant-bras gauche renforcé et filet compact. Trophées rares et lourds.

**Caractère.** Le Ravisseur a emporté son compagnon. Brisecroc refuse que son absence soit déjà racontée comme une mort glorieuse.

**Intro.** Serre une attache de captivité arrachée puis prend position.

**Provocation.** Ancre les pieds → Montre l’attache rompue dans sa main → Referme les poings et relève la garde. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Filet de prise (spécial) | Tir lent qui capture brièvement au sol. | Boîtier ouvert et coude en arrière. Sauter ou détruire le filet selon les interactions autorisées. | Une capture par combo et protection temporaire anti-boucle. |
| Étau de hanche (spécial) | Saisie proche qui renverse les positions. | Mains ouvertes et pas bref. Saut, recul ou déchoppe prévue par le mode. | Pas de saisie depuis un hitstun incompatible ; whiff visible. |
| Épaule de rupture (spécial) | Percussion lente pour sortir d’un coin. | Épaule reculée et souffle lourd. Esquiver puis punir ; les coups bas contestent l’avancée. | Armure éventuelle bornée à un contact, jamais aux saisies. |
| Chaîne rompue (super) | Saisie super courte avec soulèvement et projection. | Mains écartées sans avance cachée. Sauter ou rester hors de portée. | Sur géant, remplacer par une percussion compatible déclarée. |

**Contre-jeu.** Sauter les saisies, varier la distance et punir le filet ; aucune boucle de capture.

**Victoire.** Vérifie le passage libéré avant de ramasser son matériel.

**Fin.** Il ouvre les cellules sans réclamer les trophées des captifs. Son compagnon repart avec lui ; leur prochaine chasse attendra.

**Pièces propres à produire.** Filet roulé, ouvert, tendu et rompu séparés ; Attache et bracelets détachés.

### Vigie

Une pisteuse confronte les balises falsifiées aux traces réellement laissées au sol.

**Identité visuelle.** Silhouette longue, masque étroit olive sans crête, peau ocre sur les épaules, arc pliant et carquois court ; trophées plats fixés contre le corps.

**Caractère.** La Traqueuse d’Échos a appris auprès d’elle. Vigie veut comprendre pourquoi elle protège maintenant les convoyeurs.

**Intro.** Examine une empreinte puis vérifie la corde de son arc.

**Provocation.** Abaisse l’arc → Regarde ostensiblement derrière son adversaire → Reprend sa ligne de tir. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Flèche tendue (spécial) | Tir droit avec charge courte ou longue. | Traction de corde et coude fixe. Avancer entre les tirs ou sauter au départ. | Charge immobilisante et nombre de flèches simultanées borné. |
| Ligne haute (spécial) | Trait oblique vers une zone aérienne. | Arc relevé avant la traction. Rester au sol et avancer pendant la préparation. | Angle fixé au départ, sans recalage tardif. |
| Pas de mesure (spécial) | Recul suivi d’un coup d’arc si la poursuite continue. | Pied arrière déplacé et arc horizontal. S’arrêter avant le contact ou couvrir le recul. | Ne traverse pas le mur et n’est pas invulnérable. |
| Piste refermée (super) | Trois traits à angles annoncés avec intervalles fixes. | Trois repères du viseur et arc ouvert. Garder les lignes ou entrer dans l’intervalle. | Aucun guidage après départ ; jauge engagée entièrement. |

**Contre-jeu.** Réduire la distance ; la visée ne suit pas automatiquement un changement de côté.

**Victoire.** Range une flèche intacte et marque une nouvelle piste.

**Fin.** Elle transmet les trajets des convois aux chasseurs concernés. De sa rivale, elle rapporte un témoignage plutôt qu’une tête.

**Pièces propres à produire.** Arc fermé/déployé et tensions de corde ; Flèche, carquois et impacts séparés.

### Éclat

Un spécialiste du disque poursuit l’arme de sa première chasse, exposée par le Collecteur.

**Identité visuelle.** Masque argent brossé étroit, peau brun rouge, épaule droite dégagée, fourreau circulaire à la hanche gauche ; ornements métalliques réduits.

**Caractère.** Le Collecteur expose son arme comme preuve d’une victoire. Éclat veut récupérer l’objet et laisser le mensonge visible.

**Intro.** Ouvre la main devant son fourreau puis arme le disque de remplacement.

**Provocation.** Fait tourner le disque sur son bord → Le stabilise entre deux doigts → Le replace dans sa prise. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Disque en travers (spécial) | Lancer horizontal à distance choisie. | Épaule inclinée et disque montré. Passer au-dessus ou forcer son propriétaire à défendre. | Un disque unique ; aucune copie dans les supers. |
| Retour oblique (spécial) | Un changement de route de retour du disque actif. | Bracelet levé et signal de guidage. Quitter le corridor annoncé ou interrompre l’ordre. | Impossible si arme absente ou déjà rappelée ; cooldown conservé. |
| Tranche de garde (spécial) | Coupe circulaire très courte, disque en main. | Poignet tourné vers l’extérieur. Punir sa courte portée ou saisir. | Indisponible pendant le détachement du disque. |
| Orbite fermée (super) | Grande trajectoire aller-retour en deux passages lisibles. | Deux angles tracés au bracelet. Éviter l’aller puis se replacer pour le retour. | Disque disponible exigé ; historique de combo partagé. |

**Contre-jeu.** Presser quand le disque est loin ; son rappel n’est ni instantané ni garanti.

**Victoire.** Présente le côté marqué du disque à la lumière.

**Fin.** La fausse prise quitte la galerie. Éclat garde la marque rayée : elle raconte désormais deux chasses.

**Pièces propres à produire.** Disque tenu, vol, retour et fourreau vide distincts ; Main vide et réception natives, marque stable.

### Rempart

Un protecteur de convoi affronte une ancienne alliée passée au service du trafic.

**Identité visuelle.** Carrure large verticale, masque ivoire à bords bronze, plaques asymétriques ; bouclier pliant à gauche et lance à droite. Masque sans copie du crâne de Feral.

**Caractère.** La Garde d’Os défend les chaînes qu’ils brisaient ensemble. Rempart veut lui laisser une chance de déposer son arme.

**Intro.** Pose la lance contre le bouclier fermé puis ouvre les segments.

**Provocation.** Replie un segment → Montre la surface rayée du bouclier → Referme sa ligne de garde. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Abri de plaques (spécial) | Parade courte devant le haut du corps. | Segments qui s’ouvrent avec un bruit sec. Saisir, frapper bas ou attendre la fermeture. | Coût de garde ; pas de réflexion universelle. |
| Butoir (spécial) | Poussée proche avec le bouclier. | Pied avancé et bouclier rapproché du torse. Reculer puis punir. | Pas d’invulnérabilité de départ ou de garde en récupération. |
| Pointe sous garde (spécial) | Estoc bas après ouverture du bouclier. | Bouclier montant et lance descendante. Garder bas puis reprendre le tour. | Tête exposée ; aucune parade-attaque permanente. |
| Passage tenu (super) | Contre super de frappe de contact, puis riposte. | Ancrage immobile et garde abaissée. Saisir ou s’abstenir de frapper. | Échec long ; aucun géant ou projectile capturé par défaut. |

**Contre-jeu.** Saisie, attaque basse ou délai ; son bouclier ne protège pas tous les angles.

**Victoire.** Abaisse le bouclier et tend une main à l’adversaire conscient.

**Fin.** Il ramène la Garde d’Os devant les chasseurs lésés. Les marques de leur duel restent sur son bouclier.

**Pièces propres à produire.** Bouclier fermé/ouvert, chaque segment mobile détaché ; Lance, fourreau et attaches gauches conservées.

### Suture

Une réparatrice reconnaît les marques de son atelier sur les armes pillées.

**Identité visuelle.** Peau brun froid, masque gris riveté, prothèse d’avant-bras gauche fonctionnelle, câbles courts protégés et outils au flanc. Pas de robe ou aile mécanique.

**Caractère.** Le Chasseur de Reliques utilise ses pièces volées. Suture termine un travail ; elle refuse que sa prothèse soit réduite à une faiblesse.

**Intro.** Vérifie le verrou de la prothèse et éjecte une douille vide.

**Provocation.** Ouvre deux doigts mécaniques → Vérifie leur fermeture en fixant l’adversaire → Referme le poignet et relève le coude. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Trait de poignet (spécial) | Petit trait physique rapide. | Lanceur qui se relève. Garder puis avancer pendant la récupération. | Chargeur limité ; munition perdue dès le départ. |
| Verrou mécanique (spécial) | Parade de contact puis écartement du bras adverse. | Main mécanique ouverte et coude fixe. Saisir, frapper bas ou retarder. | Simple contact physique ; ne désactive pas les systèmes adverses. |
| Recharge couverte (spécial) | Recul d’un pas et remplacement du chargeur. | Chargeur visible, lanceur abaissé. La poursuivre pendant le remplacement. | Aucune munition avant insertion complète ; état conservé en réserve. |
| Dernière pièce (super) | Coup de prothèse confirmé puis tir et rejet. | Main mécanique qui se ferme lentement. Garder l’engagement ou rester hors portée. | Pas de soin ; coût de jauge et munition défini avant activation. |

**Contre-jeu.** Compter les tirs et approcher pendant la recharge ; pas de soin en combat.

**Victoire.** Ramasse un composant intact et le range.

**Fin.** Elle restitue les armes, répare les attaches du convoi libéré puis rouvre l’atelier. Aucun trophée nouveau n’orne sa porte.

**Pièces propres à produire.** Avant-bras, doigts et lanceur en pièces mobiles ; Chargeur plein/vide, douille et trait séparés.

### Sillage

Un éclaireur retrouve les passages que le Scelleur a convertis en couloirs de capture.

**Identité visuelle.** Yautja léger, peau gris bleu, masque ardoise à menton court, flancs peu armurés, lance courte et dreadlocks regroupées derrière le cou.

**Caractère.** Le Scelleur a retourné ses itinéraires contre les convois. Sillage sait toujours partir ; il apprend à rester pour quelqu’un.

**Intro.** Atterrit sur son appui avant, vérifie deux sorties et déploie la lance.

**Provocation.** Fait un pas de côté dans son plan de combat → Interrompt un voile bref en montrant sa silhouette → Reprend sa position. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Élan de crête (spécial) | Bond en avant à trajectoire fixe. | Jambes comprimées. Anti-air ou frappe à la réception. | Pas de correction brusque en vol ou de traversée de mur. |
| Pointe plongeante (spécial) | Estoc descendant en l’air. | Lance ramenée sous le buste. S’écarter puis punir l’atterrissage. | Angle fixé ; récupération obligatoire à terre. |
| Voile interrompu (spécial) | Camouflage bref suivi d’un déplacement court. | Bracelet touché et contour réfracté visible. Suivre le contour ou couvrir la sortie. | Énergie consommée ; coup reçu ou donné rompt le voile ; aucune invincibilité. |
| Sortie du piège (super) | Bond rasant et estoc confirmé inversent les positions. | Centre abaissé et lance vers la sortie opposée. Garder le premier contact ou le faire manquer. | Ne supprime pas les pièges et respecte les limites de scène. |

**Contre-jeu.** Punir les réceptions ; le voile conserve contour, son et indicateurs utiles.

**Victoire.** Attend que les alliés aient franchi la sortie.

**Fin.** Il guide le dernier convoi hors du porteur. Pour la première fois, il part le dernier.

**Pièces propres à produire.** Lance courte et attaches séparées ; Réfraction distincte du sprite ; mêmes proportions pendant le voile.

### Balafre

Une vétérane poursuit l’ancien arbitre qui protège le trafic qu’il devait arrêter.

**Identité visuelle.** Peau ocre sombre, cicatrice près de la mandibule droite, masque de bronze sobre, longue lame au dos, armure réparée et trois trophées discrets.

**Caractère.** Le Juge Déchu a partagé ses anciennes chasses. Elle refuse de l’excuser, comme de condamner tous ceux qui l’ont suivi.

**Intro.** Dépose un ancien insigne puis sort calmement sa lame.

**Provocation.** Abaisse la pointe → Incline la tête en silence → Remonte la lame en garde. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Coupe mesurée (spécial) | Longue coupe pour punir un coup manqué. | Lame ramenée à la hanche. Rester hors portée ou entrer avant l’armement. | Récupération longue ; aucune correction tardive de portée. |
| Réponse ancienne (spécial) | Contre de frappe haute ou moyenne, une riposte. | Lame verticale et immobilité. Bas, saisie, projectile ou délai. | Fenêtre étroite ; pas de déclenchement par décor. |
| Talon de lame (spécial) | Coup de pommeau très proche. | Garde resserrée près du visage. Rester loin ou garder puis punir. | Pas d’invulnérabilité ; exige un vrai intervalle. |
| La marque demeure (super) | Contre super puis taille confirmée. | Pointe presque rangée et garde ouverte. Patienter ou saisir. | Désarmement de mise en scène, aucune suppression permanente du kit adverse. |

**Contre-jeu.** Feinter, saisir et varier les délais ; son contre ne couvre pas toutes les attaques.

**Victoire.** Essuie la lame et reprend l’insigne sans le porter.

**Fin.** Elle dépose les témoignages devant les chasseurs lésés. La décision ne lui appartient plus ; son ancien insigne reste dans une boîte.

**Pièces propres à produire.** Longue lame, fourreau et insigne séparés ; Visage balafré stable dans toutes les poses.

### Herse

Un chasseur très puissant veut rendre le trophée volé que le Premier Parjure lui avait offert.

**Identité visuelle.** Appuis bas, peau brun terre, masque trapézoïdal sans cornes, épaulière droite épaisse et hache à deux mains aux lames brèves ; silhouette utilitaire sans code nordique copié.

**Caractère.** Le Premier Parjure a acheté sa fidélité avec une victoire truquée. Herse veut rendre ce qu’il a accepté.

**Intro.** Pose le trophée puis saisit sa hache à deux mains.

**Provocation.** Plante le talon de la hache → Desserre une main et attend → Soulève l’arme pour reprendre la garde. Vulnérable, interrompable par impact ; aucun gain de jauge.

| Technique | Intention | Signal et réponse | Risque |
| --- | --- | --- | --- |
| Fente lourde (spécial) | Coupe verticale à forte présence. | Hache montée au-dessus de l’épaule. Reculer ou passer derrière avant la descente. | Lent, vulnérable après garde ; pas de suivi tardif. |
| Balayage de hampe (spécial) | Coup bas large de la hampe. | Mains espacées et arme basse. Sauter ou garder bas. | Un passage ; aucune onde magique détachée de l’arme. |
| Avancée de fer (spécial) | Charge courte à vitesse fixe. | Pied arrière ancré, hache au torse. Sauter ou saisir dans la phase autorisée, puis punir l’arrêt. | Armure éventuelle bornée à un impact. |
| Trophée rendu (super) | Coupe confirmée, frappe de hampe puis coup final. | Hache levée et geste brièvement suspendu. Faire manquer ou garder la première coupe. | Aucune fin cinématique sur whiff ; armure cessant après engagement. |

**Contre-jeu.** Faire manquer ses grands armements ; ses coups lourds ne deviennent pas sûrs grâce à une jauge.

**Victoire.** Laisse le trophée à terre et reprend son arme.

**Fin.** Le trophée retourne à son vrai détenteur. Herse repart pour une chasse dont personne ne lui donnera l’issue.

**Pièces propres à produire.** Hache et prises de main cohérentes ; Trophée original et socle séparés.

## Campagne et vingt arènes

Chaque arène prévoit cinq plans natifs séparés : fond lointain, volumes de fond, profondeur proche, sol de combat et éléments latéraux. Le plan de contact reste fixe. Une image composite de direction artistique ne constitue pas ces cinq couches.

### Acte 1 — La garde rompue

Le dépôt pillé met dix chasseurs sur une piste commune.

**Objectif.** Retrouver les marques du vol et l’itinéraire de la navette. **Sortie.** Les coordonnées mènent à une lune sèche.

| Arène | Ambiance et sol | Rencontre | Histoire / compétition |
| --- | --- | --- | --- |
| Cour des masques | Cour en basalte, râteliers de masques inertes, colonnes bronze, ciel rouge avec satellites ; piste libre au premier plan. Dalles continues ; niches et masques restent en profondeur. | La Garde d’Os — Duel de garde : apprendre l’ouverture basse et la saisie. | Aucun danger actif ; les dégâts proviennent du duel. Compétition : dangers désactivés. |
| Quai des chasseurs | Hangar alien ouvert sur une baie, rampe massive, coque en profondeur et ferrures usées ; cuivre sombre et gris graphite. Quai horizontal ; rampe en profondeur, aucun vide sur la piste. | Le Scelleur — Lire le lance-filet et punir la fermeture de son boîtier. | Purge de rampe facultative en histoire, annoncée par voyant et sifflement ; corridor sûr permanent. Compétition : dangers désactivés. |
| Ravin de cendre | Ravin de basalte, végétaux coupants éloignés de la piste, crevasses chaudes et cendre basse ; orange sourd et noir. Plateau continu et sec ; chaleur et crevasses seulement en profondeur. | Grand Porte-Défenses — Reconnaître une charge, garder un espace de recul. | Cendre décorative ; les pierres du boss ont un signal et une zone distincts. Compétition : dangers désactivés. |
| Relais des pillards | Relais alien démonté, antennes, transmetteur central, plaques d’alliage et câbles ; vue latérale dégagée. Plateforme métallique stable ; les débris ne changent pas la hauteur du sol. | Treuil-Récolteur — Identifier un module mécanique après une attaque engagée. | Plaque suspendue du boss annoncée par une ombre fixe avant chute ; aucune chute aléatoire. Compétition : dangers désactivés. |

**Apprentissage.** Garde, capture, charge territoriale puis module mécanique. Après chaque rencontre : preuve, checkpoint, temps calme et trajet vers l’étape suivante.

### Acte 2 — La route de verre

Les convoyeurs vendent des victoires garanties avec les prises d’autrui.

**Objectif.** Récupérer le disque et la table des escales. **Sortie.** Un relais conduit vers un estuaire lointain.

| Arène | Ambiance et sol | Rencontre | Histoire / compétition |
| --- | --- | --- | --- |
| Dunes de Verre | Dunes pâles mêlées d’éclats vitrifiés, ombres violettes et masses lunaires lointaines. Roche plane sous une fine poussière ; aucune dune franchissable en duel. | Fouisseur-Roc — Lire une émergence depuis le sol. | Poussière décorative ; vibrations du fouisseur toujours visibles. Compétition : dangers désactivés. |
| Puits d’Extraction | Tours de forage, sédiments brûlés, conduites et lampes jaunes ; ocre et graphite. Plateforme sans vide ; le puits se trouve en profondeur. | La Maîtresse des Cendres — Punir une arme lourde après son engagement. | Purge latérale en histoire après alarme, interrompable par une vanne ; jamais deux côtés ensemble. Compétition : dangers désactivés. |
| Sépulcre de Basalte | Basalte en strates, niches de trophées et lumière dorée réduite ; aucun temple magique. Dalles continues ; urnes et socles hors piste. | Le Collecteur — Distinguer départ et retour du disque. | Aucun danger actif ; débris visuels sans dommages cachés. Compétition : dangers désactivés. |
| Arche des Vents | Pont de roche, vallée lointaine et toiles de transport courtes ; lumière de fin de jour. Pont horizontal ; parois basses cohérentes aux limites. | Râle de Nuit — Choisir déplacement au sol ou anti-air. | Rafales visuelles seulement en compétition ; aucun déplacement involontaire. Compétition : dangers désactivés. |

**Apprentissage.** Émergence, tempo lourd, disque aller-retour puis menace aérienne. Après chaque rencontre : preuve, checkpoint, temps calme et trajet vers l’étape suivante.

### Acte 3 — Les pistes noyées

La forêt cache des relais et une faune dérangée par le trafic.

**Objectif.** Traverser l’estuaire et interroger la Traqueuse d’Échos. **Sortie.** Les captifs sont partis vers une lune gelée.

| Arène | Ambiance et sol | Rencontre | Histoire / compétition |
| --- | --- | --- | --- |
| Mangrove Noire | Eau sombre, racines épaisses, barges, brume et luminescence discrète ; verts sourds. Racines aplaties ; eau en profondeur et pieds lisibles. | Cuirasse-Sel — Gérer une charge et un retrait lent de créature. | Montée d’eau de mise en scène sans modification de friction. Compétition : dangers désactivés. |
| Temple Noyé | Pierre submergée, réparations de métal et racines tendues ; aucun effet surnaturel. Dalle continue ; reflets peu contrastés près des pieds. | Racine-Étrangleuse — Couper une prise végétale avant d’atteindre son nœud. | Racines uniquement liées au boss, jamais un piège hors caméra. Compétition : dangers désactivés. |
| Canopée Suspendue | Passerelles à haubans, tronc massif, feuillages profonds et luminaires d’ambre. Plateforme fixe ; aucun balancement de collision. | La Traqueuse d’Échos — Lire une feinte de camouflage dans un milieu chargé. | Feuilles réduites autour des corps ; leurres différenciés des signaux utiles. Compétition : dangers désactivés. |
| Nid des Couronnes | Mues de chitine, plantes en éventail et nid minéral ; vert froid, pas d’œufs au premier plan. Pierre continue, fond calme derrière les membres du boss. | Mante-Couronne — Lire les bras avant et les angles d’épines. | Épines détachées ; le décor du nid ne blesse pas par simple contact. Compétition : dangers désactivés. |

**Apprentissage.** Charge, membre destructible, camouflage lisible puis angles organiques. Après chaque rencontre : preuve, checkpoint, temps calme et trajet vers l’étape suivante.

### Acte 4 — Les prises vivantes

Les chasseurs découvrent les captifs et l’atelier qui dépèce leurs armes.

**Objectif.** Ouvrir les cellules, restituer les pièces et copier les preuves. **Sortie.** Les balises retournées révèlent le porteur renégat.

| Arène | Ambiance et sol | Rencontre | Histoire / compétition |
| --- | --- | --- | --- |
| Faille Bleue | Glace translucide sombre, roche, lampes portatives et cordes ; cyan désaturé. Roche dégagée par le convoi, sans glissade supplémentaire. | Le Ravisseur — Sortir de l’angle d’une saisie et reconnaître un faux recul. | Neige visuelle ; stalactites hors piste. Compétition : dangers désactivés. |
| Carcasse sous la Glace | Coque entrouverte, givre en profondeur, racks et éclairage de maintenance gris bleu. Plancher continu ; givre hors des appuis. | Le Chasseur de Reliques — Lire et punir les changements d’armes. | Arcs de maintenance annoncés et désactivables en histoire. Compétition : dangers désactivés. |
| Pont des Captifs | Cloisons lourdes, cellules en retrait et fermoirs mécaniques ; lumière chaude locale. Couloir dégagé ; portes hors de l’aire de duel. | Gardien de Soute — Désactiver les appuis d’un gardien puis viser la cabine. | Alarmes sans dégâts ; les captifs ne sont jamais sur la piste. Compétition : dangers désactivés. |
| Salle des Balises | Trois cœurs matériels, consoles et câbles ; lumières utiles sobres et distinctes. Passerelle rectiligne ; modules avec zones d’interaction explicites. | Nœud de Chasse — Observer l’ordre de tir et atteindre le module actif. | Ordre des voyants et son annoncent chaque balayage ; zone sûre permanente. Compétition : dangers désactivés. |

**Apprentissage.** Saisies, changement d’arme, exo à modules et lecture de réseau. Après chaque rencontre : preuve, checkpoint, temps calme et trajet vers l’étape suivante.

### Acte 5 — Le masque tombe

Les fausses identités et l’autorité achetée du réseau ne tiennent plus.

**Objectif.** Arrêter le porteur et affronter le Premier Parjure. **Sortie.** Restitution, décision sur le prisonnier et dix conclusions individuelles.

| Arène | Ambiance et sol | Rencontre | Histoire / compétition |
| --- | --- | --- | --- |
| Hangar des Prises | Hangar vaste, cages vides, palettes, coque en profondeur ; métal chaud et noir. Plaque d’entretien horizontale ; stockage en profondeur. | Le Porte-Masques — Lire un changement de posture sans copie de pouvoirs. | Alarmes de baie décoratives, sans aspiration. Compétition : dangers désactivés. |
| Anneau Extérieur | Anneau sous écran protecteur, étoiles lentes et coque immense ; graphite et jalons blancs. Passerelle stable et garde-corps, pas de chute libre. | Intercepteur du Vide — Éviter les lignes de tir et punir un module rapproché. | Tirs dirigés annoncés ; caméra sans défilement forcé en compétition. Compétition : dangers désactivés. |
| Galerie des Masques | Niches individuelles, travées d’alliage et éclairage bas ; fonds neutres derrière les corps. Sol plan ; masques hors collision. | Le Juge Déchu — Contres catégoriels et variation des délais. | Aucun danger ; confrontation personnelle parfaitement lisible. Compétition : dangers désactivés. |
| Fosse du Parjure | Fosse industrielle, gradins étroits et supports de trophées ; blanc dur, bronze et noir. Disque de sol fixe ; pas de ring-out ni déplacement secret des limites. | Le Premier Parjure — Combiner les lectures apprises et reprendre le neutre. | Seules les attaques du boss font danger ; aucun effondrement sous le joueur. Compétition : dangers désactivés. |

**Apprentissage.** Postures, véhicule, vétéran de contre et synthèse finale. Après chaque rencontre : preuve, checkpoint, temps calme et trajet vers l’étape suivante.

## Vingt ennemis distincts

Les différences concernent la décision, le placement, l’armement et la récupération. Une simple recoloration ne représente pas un type supplémentaire.

| Ennemi | Comportement | Signal | Réponse |
| --- | --- | --- | --- |
| Pisteur renégat | Deux coups puis recul ; cherche un angle si le joueur attend. | Épaule levée avant l’assaut. | Garder deux contacts puis reprendre le tour. |
| Guetteur à arc | Choisit son angle puis le conserve ; recule à l’approche. | Corde tendue qui montre l’angle. | Avancer entre les tirs et punir le recul au bord. |
| Lancier de barrage | Alterner estoc court et long sans poursuivre hors secteur. | Changement de prise avant l’estoc long. | Faire manquer la pointe puis entrer. |
| Porte-filet | Tire sur une ligne libre puis recharge ; évite ses alliés. | Boîtier ouvert et coude reculé. | Sauter le filet puis punir la fermeture. |
| Duelliste au disque | Lance puis défend ; risque une ouverture pour guider le retour. | Disque présenté puis geste de bracelet. | L’attaquer quand son arme est loin et surveiller le retour. |
| Briseur de ligne | Une charge ou une coupe, puis retour au neutre. | Pieds ancrés avant charge. | Esquiver et punir le freinage. |
| Récupérateur blindé | Ouvre son bouclier face à une menace puis le ferme pour avancer. | Segments visibles qui s’ouvrent. | Bas, saisie ou pression à la fermeture. |
| Baliseur de convoi | Pose un relais visible puis le protège ; perception locale. | S’agenouille et allume le boîtier. | Interrompre la pose ou casser le relais. |
| Drone de veille | Balaye un secteur, signale puis tire une impulsion. | Optique alignée et son montant. | Quitter la ligne et viser sa stabilisation. |
| Mine rampeuse | Approche puis s’arrête avant explosion ; cesse le suivi à l’armement. | Arrêt net, clignotement et tic. | Détruire à distance ou quitter le rayon annoncé. |
| Tourelle sur rail | Atteint un repère, fixe sa ligne puis tire. | Freinage du chariot et visée continue. | Changer de hauteur ou viser pendant refroidissement. |
| Exo de levage | Soulève une charge, balaie puis doit la reposer. | Pince serrée et vérins montants. | Entrer derrière l’armement ou viser à la pose. |
| Synthétique de garde | Tient une ligne, pivote après délai puis frappe droit. | Épaule verrouillée et voyant de bras. | Changer de côté pendant pivot ou saisir selon le kit. |
| Synthétique opérateur | Choisit une machine abîmée, se branche puis répare en restant fixe. | Câble branché et outil posé. | Interrompre avant la fin ; pas de réparation instantanée. |
| Brouteur d’écaille | Recule, gratte puis charge ; se détourne après avoir créé de l’espace. | Trois grattements et tête abaissée. | Quitter la ligne et laisser passer ; flanc exposé à l’arrêt. |
| Morde-cendre | Un fixe le joueur pendant que l’autre prépare un bond ; budget d’agression commun. | Oreilles aplaties et deux pas latéraux. | Garder une sortie et interrompre le bond ; aucune attaque simultanée hors champ. |
| Échassier d’estuaire | Pique vers une zone fixée puis recule. | Cou replié et patte levée. | Passer sous le cou après la pique ou reculer avant. |
| Mante de verre | S’élève, marque une pause puis coupe à hauteur choisie. | Membres ouverts et membrane dorsale tendue. | Garder à la hauteur annoncée ou avancer sous l’envol. |
| Vrille affamée | Se tend, frappe puis expose son nœud avant rétraction. | Sève rassemblée et pointe redressée. | Quitter la zone puis frapper le nœud. |
| Fouisseur de schiste | Suit une ligne souterraine visible puis émerge à un point fixé. | Poussière continue et bosse de sol. | Quitter le point puis frapper pendant le dégagement des pattes. |

Les silhouettes, lieux d’apparition et pièces à détacher figurent individuellement dans le JSON. Tous les ennemis utilisent une perception locale et un retour visible au neutre. Une attaque hors champ exige une entrée et un avertissement lisibles.

## Vingt boss et soixante phases

Répartition : **10 duellistes Yautja originaux, 6 créatures originales et 4 machines originales**. Les transitions et issues narratives ont leurs propres besoins d’animation ; une barre de vie supérieure ne remplace pas une nouvelle rencontre.

### La Garde d’Os — Cour des masques

Ancienne protectrice des routes, elle croit préserver les siens en servant les convoyeurs.

**Silhouette.** Haute Yautja en plaques os claires, masque long sobre et bouclier à trois segments.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Garde de passage | Bouclier frontal et estocs espacés. | Bouclier haut avant un estoc bas. | Garder bas puis saisir pendant le rappel. |
| 2. Défense mobile | Recul court suivi d’une poussée de bouclier. | Talons rapprochés et segment inférieur replié. | Ne pas poursuivre automatiquement ; faire manquer la poussée. |
| 3. Dernier verrou | Range le bouclier pour une lance plus rapide. | Bouclier attaché au dos pendant la transition. | Exploiter la défense réduite et punir les estocs engagés. |

**Issue.** Le dépôt s’ouvre ; la route narrative autorise sa reddition.

**Pièces mobiles.** Bouclier en trois segments, lance, masque et sangle dorsale séparés.

### Le Scelleur — Quai des chasseurs

Il convertit les routes de fuite en corridors de capture et garde la rampe du quai.

**Silhouette.** Armure noire étroite, boîtier double de liens et masque à arête centrale.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Ligne de capture | Un filet puis une marche de rabattage. | Boîtier externe qui s’ouvre. | Sauter ou rompre le filet ; nouvelle capture impossible dans la même boucle. |
| 2. Passage fermé | Pose un lien visible puis couvre l’autre angle. | S’agenouille pour fixer le lien à une borne. | Détruire la borne ou laisser le lien se désarmer. |
| 3. Capture désespérée | Range ses pièges pour deux prises courtes successives. | Boîtiers fermés, mains ouvertes. | Rester hors de portée et punir chaque tentative. |

**Issue.** Son sceau de transport indique le trajet à travers le ravin.

**Pièces mobiles.** Filets, liens, bornes, mains de prise et boîtiers indépendants.

### Grand Porte-Défenses — Ravin de cendre

Bête rocailleuse affolée par les convois, elle défend l’accès à son ravin.

**Silhouette.** Quadrupède énorme, carapace volcanique basse et deux défenses vers l’avant ; espèce originale.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Territoire | Charge droite après trois grattements. | Tête abaissée et frappes du pied. | Quitter la ligne puis viser le flanc au freinage. |
| 2. Défenses accrochées | Une défense se coince dans une ferrure abandonnée après une charge ratée. | Frottement métallique et tête immobilisée. | Libérer la ferrure ou viser le flanc selon l’objectif de rencontre. |
| 3. Recul vers la faille | Recule en balayant pour regagner son passage. | Hanches tournées vers l’issue latérale. | Respecter le balayage et laisser une route de sortie. |

**Issue.** Ouvrir le passage en faisant fuir l’animal est une résolution valide.

**Pièces mobiles.** Défenses, tête, ferrure destructible et quatre appuis natifs.

### Treuil-Récolteur — Relais des pillards

Machine de récupération transformée en défense du relais falsificateur.

**Silhouette.** Cabine protégée, bras lourd, grappin, poulies et disque industriel sur quatre appuis.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Balayage de câble | Lance un grappin puis ramène un câble horizontal. | Poulie alignée et crochet suspendu. | Éviter la prise, sauter le câble puis viser la poulie. |
| 2. Charge suspendue | Soulève une plaque et la lâche sur un point fixé. | L’ombre cesse de suivre le joueur avant la chute. | Quitter la zone et frapper le vérin pendant sa remise en tension. |
| 3. Cabine exposée | Relève le blindage pour ventiler tandis que le disque ralentit. | Ouïes ouvertes et baisse du son moteur. | Attendre le ralentissement, atteindre la cabine puis ressortir. |

**Issue.** Les coordonnées de navette sont récupérées dans la commande du relais.

**Pièces mobiles.** Cabine, bras, poulies, câble articulé, grappin, plaque et disque séparés.

### Fouisseur-Roc — Dunes de Verre

Un grand fouisseur suit les vibrations des convois sur la lune sèche.

**Silhouette.** Anneaux de schiste, tête aplatie et deux membres de forage ; aucune anatomie xénomorphe.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Approche sous roche | Trajet visible puis sortie verticale. | Bosse et poussière continues ; point final marqué. | Quitter le point puis viser la jointure du cou. |
| 2. Balayage de surface | Tourne lentement le corps en restant dehors. | Plaques latérales ouvertes. | Sauter le balayage puis toucher le dos pendant la rotation. |
| 3. Retraite forcée | Deux émergences puis un long retour au sol. | Deux vibrations distinctes, sans retargetage après la seconde. | Garder de l’espace pour deux esquives puis punir l’arrêt. |

**Issue.** La route du convoi devient accessible ; aucune parenté officielle revendiquée.

**Pièces mobiles.** Anneaux, pattes de forage, tête et terre soulevée séparés.

### La Maîtresse des Cendres — Puits d’Extraction

Elle a vendu les itinéraires d’autres chasseurs pour faire évacuer son propre groupe.

**Silhouette.** Peau terre sombre, masque noir réparé, bras droit protégé et lourde lame patinée rouge ; aucun feu surnaturel.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Mesure froide | Deux attaques à tempos différents. | Arme haute pour l’une, hanche basse pour l’autre. | Lire la posture et ne pas répondre au même instant. |
| 2. Pression du chantier | Pousse vers un bord puis arme une frappe lente. | Épaule abaissée et pas latéral. | Inverser la position avant la frappe ou la faire manquer. |
| 3. Lame courte | Lâche une plaque et cherche le contact. | Plaque retirée pendant une transition sans dégât. | Reprendre de la distance : sa couverture et sa portée diminuent. |

**Issue.** Son témoignage révèle le dépôt du Collecteur ; ses raisons n’effacent pas ses actes.

**Pièces mobiles.** Plaque amovible, arme, attaches et masque réparé.

### Le Collecteur — Sépulcre de Basalte

Il revendique les prises d’autres chasseurs et expose leurs armes.

**Silhouette.** Masque argent gravé de marques ajoutées, sangles courtes et fourreau de disque ostentatoire.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Présentation du trophée | Un lancer droit suivi d’un retour lent. | Disque levé et fourreau ouvert. | Attaquer quand l’arme s’éloigne et surveiller son retour. |
| 2. Double trajectoire | Guide le même disque vers un second angle. | Bracelet levé et corridor de retour annoncé. | Changer de zone après le premier passage ou interrompre l’ordre. |
| 3. Main vide | Le disque tombe ; utilise une lame courte pour tenter de le reprendre. | Regard et main vers l’arme au sol. | Contester la récupération ; l’arme ne réapparaît pas gratuitement. |

**Issue.** Le disque marqué et les preuves des fausses victoires sont récupérés.

**Pièces mobiles.** Disque, fourreau, lame courte et masque séparés.

### Râle de Nuit — Arche des Vents

Prédateur aérien nichant sous l’arche de la lune sèche.

**Silhouette.** Deux grandes membranes, pattes crochues, tête osseuse et gorge gonflable.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Passage en piqué | Traverse l’aire à une hauteur fixée. | Gorge gonflée puis tête vers la ligne choisie. | S’accroupir ou se déplacer selon la hauteur ; pas de changement tardif. |
| 2. Appui sur l’arche | Se pose et frappe d’une patte avant de repartir. | Membranes repliées et patte levée. | Punir après la griffe puis éviter le décollage. |
| 3. Aile fatiguée | Deux piqués courts puis un atterrissage prolongé. | Battement asymétrique qui annonce la fatigue. | Esquiver les deux passages puis atteindre le corps au sol. |

**Issue.** Le trajet vers la navette s’ouvre ; la créature peut fuir dans la scène de sortie.

**Pièces mobiles.** Membranes, griffes, gorge, battements natifs et ombre séparée.

### Cuirasse-Sel — Mangrove Noire

Grand amphibie cuirassé défendant la rive empruntée par les barges.

**Silhouette.** Six pattes basses, plaques blanches et cou brun sombre ; yeux latéraux.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Rive fermée | Charge latérale courte avec arrêt lourd. | Pattes arrière qui creusent et tête proche du sol. | Se retirer puis toucher le cou pendant l’arrêt. |
| 2. Carapace levée | Soulève le corps avant un écrasement proche. | Six pattes tendues et ombre élargie. | Sortir de la zone puis punir la descente. |
| 3. Demi-tour | Tourne pour regagner l’eau et balaie de la queue. | Tête regardant derrière avant la rotation. | Sauter le balayage et exploiter le flanc exposé. |

**Issue.** La barge peut repartir ; l’animal reste une espèce originale.

**Pièces mobiles.** Six pattes, plaques, tête, queue et effets d’eau séparés.

### Racine-Étrangleuse — Temple Noyé

Colonie végétale recouvrant la table de navigation du poste noyé.

**Silhouette.** Nœud fibreux à quatre vrilles, crochets de bois et membranes de sève ; pas de visage ni conscience magique.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Prise basse | Une vrille cherche une cheville à un point annoncé. | Pointe dressée et sève au point de frappe. | Sauter ou couper avant fermeture. |
| 2. Voûte de vrilles | Deux membres composent une séquence haut/bas. | Le premier se tend avant le second. | Répondre dans l’ordre ; couper un membre réduit la séquence suivante. |
| 3. Nœud ouvert | Retrait des vrilles puis poussée qui découvre le cœur. | Membrane centrale qui se soulève. | Frapper dans l’intervalle et sortir de la poussée. |

**Issue.** La carte matérielle est libérée sans attribuer une conscience surnaturelle à la plante.

**Pièces mobiles.** Quatre vrilles segmentées, noyau ouvert/fermé, crochets et sève.

### La Traqueuse d’Échos — Canopée Suspendue

Ancienne élève de Vigie, elle se sert de la topographie pour couvrir les convoyeurs.

**Silhouette.** Longue armure verte, arc court, capteurs latéraux visibles et dreadlocks attachées haut.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Piste annoncée | Tire puis se déplace entre deux appuis. | Corde tendue et regard vers le prochain appui. | Avancer après le tir et couvrir cet appui. |
| 2. Écho de coque | Déclenche un boîtier sonore et un camouflage bref. | Boîtier au sol et contour du corps persistant. | Suivre le contour, casser le boîtier ou attendre l’épuisement d’énergie. |
| 3. Face à face | Abandonne les leurres et combat à l’arc de près. | Ramasse son boîtier et coupe le voile. | Punir la courte portée et l’armement visible des tirs. |

**Issue.** Elle révèle l’escale gelée après le duel ; ni télépathie ni invisibilité absolue.

**Pièces mobiles.** Arc, boîtier sonore, capteurs et réfraction séparés.

### Mante-Couronne — Nid des Couronnes

Prédatrice dominante du territoire de canopée.

**Silhouette.** Grande mante vert gris, plaques chitineuses radiales, quatre appuis et deux bras de coupe.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Lame haute | Un bras frappe haut puis l’autre balaie au sol. | Bras droit levé, gauche ouvert. | Garder ou entrer dans l’intervalle entre les deux bras. |
| 2. Épines de défense | Trois épines sont projetées selon des angles fixés. | Plaques dorsales qui s’ouvrent dans l’ordre. | Choisir le corridor libre ; aucun guidage après départ. |
| 3. Appuis fragiles | Expose ses articulations après deux coupes. | Tremblement des appuis puis bras croisés. | Laisser passer la paire et viser l’articulation accessible. |

**Issue.** Le passage est dégagé ; la route narrative permet de repousser la bête.

**Pièces mobiles.** Bras, quatre appuis, plaques de couronne et épines séparés.

### Le Ravisseur — Faille Bleue

Il capture les chasseurs vivants pour revendre leurs routes et leur matériel.

**Silhouette.** Épaules lourdes, masque brun renforcé, liens épais et filet compact.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Approche lente | Avance sous garde puis tente une prise courte. | Mains ouvertes et arrêt de marche. | Sauter ou reculer puis punir l’échec. |
| 2. Rabattage | Tire un filet pour pousser vers un côté. | Filet montré, pied arrière fixé. | Briser la ligne et inverser les positions en récupération. |
| 3. Convoi perdu | Feinte un recul puis tente une seule saisie. | Court recul sans rotation du buste. | Attendre la prise réelle ; pas de poursuite automatique derrière le joueur. |

**Issue.** Les captifs sont localisés et les attaches de transfert récupérées.

**Pièces mobiles.** Filet, liens, mains de prise et fermoirs séparés.

### Le Chasseur de Reliques — Carcasse sous la Glace

Il arme le trafic avec des pièces dont il maîtrise mal l’entretien.

**Silhouette.** Armure composite gris cuivre, épaulière récupérée et trois fourreaux différents.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Lance de prise | Combistick à longue portée. | Prise à deux mains et arme déployée. | Entrer après estoc raté ; aucun changement d’arme en récupération. |
| 2. Lanceur dérobé | Range la lance et utilise un chargeur limité. | Rangement complet puis insertion du chargeur. | Compter les tirs et approcher pendant la recharge. |
| 3. Matériel en défaut | Lanceur enrayé, recours à une lame de secours. | Voyant rouge et manipulation ratée. | Exploiter la portée réduite ; l’enrayage n’offre pas de dégâts automatiques. |

**Issue.** Suture identifie ses pièces ; les autres restent disponibles comme preuves.

**Pièces mobiles.** Trois armes, chargeur, épaulière et transitions de rangement natives.

### Gardien de Soute — Pont des Captifs

Synthétique industriel relié à un exo, il défend le couloir des cellules.

**Silhouette.** Pilote humanoïde dans une cabine à écran opaque, deux jambes lourdes et deux pinces.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Verrou frontal | Pince droite puis pas lourd. | Vérin droit chargé. | Passer près du pied opposé après la pince et viser son verrou. |
| 2. Deux appuis | Deux écrasements séparés par un intervalle fixe. | Voyants de jambes gauche puis droite. | Sauter dans l’ordre ou quitter la zone ; pas de dégât de proximité. |
| 3. Cabine déverrouillée | Ouvre l’écran pour ventiler puis referme. | Évent sonore et écran soulevé. | Toucher la cabine ouverte puis sortir avant la pince. |

**Issue.** L’arrêt permet d’ouvrir les cellules sans exposer les captifs au combat.

**Pièces mobiles.** Pilote, cabine, écran, jambes, pinces et vérins séparés.

### Nœud de Chasse — Salle des Balises

Le système falsifie les balises et dirige les défenses du porteur.

**Silhouette.** Trois noyaux matériels suspendus, optiques et canons ; aucune personnalité empruntée à une autre franchise.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Ordre simple | Un noyau allume une tourelle avant chaque tir. | Chaîne lumineuse du noyau au canon. | Observer, esquiver la ligne et viser le noyau actif. |
| 2. Relais croisés | Deux noyaux transmettent leur signal successivement. | Extinction du premier puis allumage du second. | Changer de zone entre les tirs ; un corridor reste libre. |
| 3. Signal local | Dernier noyau descendu pour une commande directe. | Bras de suspension abaissé et verrouillé. | Toucher le module rapproché pendant la faible couverture des canons. |

**Issue.** Les preuves sont copiées avant la coupure du système.

**Pièces mobiles.** Trois noyaux, suspensions, canons, câbles et signaux séparés.

### Le Porte-Masques — Hangar des Prises

Il joue plusieurs identités pour donner au trafic l’apparence d’une alliance de clans.

**Silhouette.** Yautja mince en bronze, masque sobre et trois masques distincts portés au harnais.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Identité empruntée | Adopte une garde à la lance rappelant Silex. | Prise trop haute et pied arrière immobile. | Punir l’estoc ; l’attitude ne donne aucun pouvoir copié. |
| 2. Masque changé | Range son masque pour une posture au disque. | Changement complet pendant une transition non offensive. | Mettre le propriétaire en défense lorsque son disque part. |
| 3. Visage découvert | Perd le harnais et passe aux lames. | Masque et harnais tombés au sol. | Contrôler la portée courte et punir les engagements. |

**Issue.** Le registre des routes et les fausses identités sont révélés.

**Pièces mobiles.** Trois masques, harnais, lance, disque et lames indépendants.

### Intercepteur du Vide — Anneau Extérieur

Petit appareil armé qui protège la fuite du porteur.

**Silhouette.** Vaisseau compact anguleux, deux nacelles et canon ventral ; design original.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Passe de tir | Se stabilise puis lance une salve. | Nacelle orientée et ligne sur le garde-corps. | Quitter la ligne puis frapper la nacelle lorsqu’elle approche. |
| 2. Appui endommagé | Se rapproche pour compenser une nacelle détruite. | Vol incliné et canon ventral sorti. | Éviter le tir puis atteindre le canon pendant sa récupération. |
| 3. Retrait avorté | Expose l’arrière pendant une rotation lente. | Moteurs au son différent et pivot visible. | Frapper le verrou de propulsion à portée de contact. |

**Issue.** Chaque kit peut atteindre un module lors d’une fenêtre rapprochée ; aucun projectile joueur obligatoire.

**Pièces mobiles.** Coque, nacelles, canon, moteurs et modules détruits séparés.

### Le Juge Déchu — Galerie des Masques

Ancien arbitre local, il a caché les vols pour conserver son autorité.

**Silhouette.** Armure ancienne sombre, masque bronze rayé, lame longue et insigne brisé ; aucun titre universel.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Sentence courte | Contre les contacts hauts et moyens uniquement. | Lame verticale et pieds arrêtés. | Bas, saisie, projectile ou attente. |
| 2. Changement de mesure | Avance derrière une longue coupe puis s’arrête. | Lame à la hanche avant l’engagement. | Faire manquer l’allonge et punir l’arrêt. |
| 3. Insigne perdu | Abandonne le contre pour deux frappes courtes. | Insigne arraché et arme à deux mains. | Garder les deux coups puis reprendre le tour. |

**Issue.** Son témoignage complète le dossier ; duel non létal prévu dans la route de Balafre.

**Pièces mobiles.** Lame, insigne, masque et prises natives.

### Le Premier Parjure — Fosse du Parjure

Chef du réseau, il promet des victoires assurées pour acheter la loyauté des chasseurs.

**Silhouette.** Très grand Yautja, masque noir bordé bronze, armure réparée et trophées hétérogènes ; aucune couronne divine.

| Phase | Action | Signal | Réponse |
| --- | --- | --- | --- |
| 1. Victoire promise | Hache lente, coups de corps et tir ponctuel. | Pose de hache distincte de la visée d’épaule. | Garder la bonne distance et punir chaque récupération. |
| 2. Récit brisé | Éjecte le canon abîmé et utilise lames et charge. | Canon détaché et garde basse. | Faire manquer la charge et exploiter sa couverture à distance réduite. |
| 3. Sans trophée | Retire le harnais lourd et combat avec une arme unique. | Harnais abandonné dans une transition claire. | Lire les variations déjà enseignées ; aucune régénération surprise. |

**Issue.** Restitution des prises et des preuves ; mise à mort ou remise aux chasseurs lésés change la scène finale, pas l’accès aux combattants.

**Pièces mobiles.** Hache, canon éjectable, harnais, masque et lames séparés.

## Projectiles et objets indépendants

| Projectile | Fonction | Lecture et réponse |
| --- | --- | --- |
| Trait de plasma de Silex | Décharge compacte rectiligne. | Visée et charge visibles. Garde, déplacement ou déviation autorisée ; aucun suivi après départ. |
| Combistick en vol | Arme physique lancée et récupérable. | Prise de lancer et main vide. Éviter puis punir le propriétaire sans arme. |
| Filet de capture | Filet qui s’ouvre en vol. | Boîtier ouvert et bruit de détente. Saut, destruction ou libération prévue ; protection anti-boucle. |
| Flèche de chasse | Trait physique de l’arc. | Angle de l’arc et traction. Quitter l’angle fixé ; garder ou dévier selon la catégorie. |
| Disque guidé | Arme unique sur un trajet aller-retour. | Arme présentée puis ordre de rappel. Surveiller deux passages et presser le propriétaire. |
| Trait de poignet | Petit trait mécanique issu d’un chargeur. | Lanceur relevé et mécanisme armé. Garder puis avancer à la récupération ou recharge. |
| Impulsion de sentinelle | Tir simple des drones et tourelles. | Optique alignée et charge sonore. Quitter la ligne avant départ ; portée bornée. |
| Épine de couronne | Défense organique de la Mante-Couronne. | Plaques dorsales ouvertes dans l’ordre. Choisir le corridor entre les angles ; aucun guidage. |
| Grappin du récolteur | Crochet retenu par un câble articulé. | Poulie alignée et crochet suspendu. Éviter la prise puis sauter le câble ; coupe selon contrat. |
| Salve d’intercepteur | Tir du canon ventral du véhicule. | Canon déployé et visée fixée. Quitter la ligne puis toucher un module rapproché. |

Chaque projectile conserve propriétaire, durée, nombre simultané et historique de combo. L’horloge de simulation régit pause et reprise. Les changements de round, de scène ou d’état de propriétaire ont une règle de nettoyage explicite. Les détails de réflexion et de réserve sont à raccorder au mode avant activation.

| Prop | Lieu | Usage | États / pièces |
| --- | --- | --- | --- |
| Râtelier aux emplacements vides | Cour des masques | Inspection des absences ; aucun équipement gratuit. | Râtelier intact, emplacements vides et marque en gros plan |
| Fermoir de rampe saboté | Quai des chasseurs | Inspection après le duel du quai ; la rampe ne bloque pas le combat. | Fermoir fermé, ouvert, sectionné et câbles |
| Balise de convoi arrachée | Ravin de cendre | Récupération après libération du passage du ravin. | Boîtier intact/brisé, panneau et roche de support |
| Console de relais pillée | Relais des pillards | Inspection après arrêt de la machine de récupération. | Console fermée/ouverte, carte et modules détachés |
| Balise enterrée | Dunes de Verre | Extraction après ouverture du passage. | Boîtier enfoui/dégagé et sable séparé |
| Foreuse à tête démontée | Puits d’Extraction | Décor de profondeur ; pas de scie permanente dans la piste. | Tête, support et dents séparées |
| Niche au disque usurpé | Sépulcre de Basalte | Version vide après récupération de l’arme. | Socle plein/vide et plaque de marque |
| Mât de signal brisé | Arche des Vents | Signal visuel sans poussée de vent sur les joueurs. | Mât, tissu, attache et version immobile |
| Coque de barge échouée | Mangrove Noire | Inventaire consultable après rencontre, en profondeur. | Coque, coffre et racines |
| Table de navigation rongée | Temple Noyé | La carte devient lisible après retrait du nœud. | Table couverte/dégagée, carte et racines |
| Relais camouflé de tronc | Canopée Suspendue | Destruction seulement selon le contrat de rencontre histoire. | Boîtier éteint/actif/brisé, sangles et antenne |
| Mue de couronne chitineuse | Nid des Couronnes | Décor sans butin aléatoire. | Mue entière, fragments et ombre |
| Harnais de transit vide | Faille Bleue | Indice sans personnage attaché dans l’aire de combat. | Harnais, fermoirs et cordes |
| Établi de prothèses volées | Carcasse sous la Glace | Inspection liée à Suture, sans bonus de dégâts. | Établi, prothèse, outils et étui |
| Fermoir de cellule | Pont des Captifs | État fermé/ouvert conservé à l’échelle de mission. | Verrou, poignée et panneau |
| Matrice de balises | Salle des Balises | Copie narrative avant coupure ; aucune connexion externe réelle. | Matrice, carte, logements et voyants |
| Palette de masques triés | Hangar des Prises | Pas de faux masque canonique inventé dans le lot. | Palette, un masque par image, sangles et couvercle |
| Bouclier de maintenance éventré | Anneau Extérieur | Reste aux bords sans masquer les combattants. | Panneau intact/abîmé, charnières et impacts |
| Vitrine de trophées falsifiés | Galerie des Masques | Inspection après duel puis restitution aux détenteurs. | Vitrine pleine/vide, plaques individuelles, lumière séparée |
| Socle du trophée usurpé | Fosse du Parjure | Reste vide après restitution ; aucune hausse de rang universelle. | Socle, trophée original séparé et version vide |

## Récompenses, reprise et accès

La progression donne cinq preuves matérielles : marques du dépôt, table des escales, témoignage de la pisteuse, registre des captifs et preuves du Parjure. Leur attribution est prévue comme permanente et idempotente. Une défaite reprend au checkpoint sans supprimer une preuve déjà acquise. Passer une scène déjà vue conserve ses conséquences.

Une conclusion individuelle s’ouvre après la campagne du personnage concerné. Aides, vitesse de texte et options de confort ne retirent pas une récompense narrative. La fuite d’une créature ou la remise d’un rival vivant restent des issues valides lorsque la rencontre les prévoit.

Les récompenses ne donnent pas de hausse permanente de dégâts. Le registre ne crée ni monnaie, ni paiement, ni abonnement. Les personnages et décors deviennent sélectionnables après leur intégration effective ; les accès du roster existant ne sont pas modifiés. Les faits de campagne seront raccordés au propriétaire de sauvegarde actuel au moment de l’implémentation.

## Images et animations à produire

Une image par sprite, acteur entier, fond transparent pour les acteurs et objets, plans de décor séparés. Masques, armes, segments mobiles, munitions, traînées et impacts restent indépendants lorsqu’ils doivent bouger seuls. La prothèse de Suture et les boucliers gardent leur côté dans les deux orientations.

Le contrat commun couvre : sélection et annulation, intro, idle, marches avant/arrière, dashes, phases du saut et réception, accroupissement, gardes, normaux debout/accroupis/aériens, saisie et déchoppe, impacts, chute, relevée, KO, trois spéciaux, super, taunt complet et victoire. Les fiches ajoutent les armes et accessoires propres à chacun. Miroir, translation ou déformation d’un PNG ne comptent pas comme poses natives.

La revue artistique contrôle silhouette, mandibules, dreadlocks, masque, attaches, palette, cadrage, alpha, ancrage et continuité. Les contrôles techniques ne remplacent pas la revue humaine qui autorise le statut artistique `validated`.

## Références et portée

Les références ci-dessous encadrent les familles d’armes, les silhouettes et les motifs narratifs. Elles ne documentent pas l’existence des personnages, espèces ou lieux créés dans cette extension. Les éléments des jeux et produits sous licence conservent leur continuité propre.

| Référence | Portée retenue | Limite |
| --- | --- | --- |
| [IllFonic — The Predator](https://predator.illfonic.com/the-predator/) | Jeu Predator: Hunting Grounds : camouflage, lames, plasma, combistick, disque, arc et compromis des classes. | N’atteste aucun personnage ou kit original de cette extension. |
| [IllFonic — catalogue DLC](https://predator.illfonic.com/) | Jeu sous licence : diversité individuelle, personnages féminins, prothèses de Bionic et matériel d’Emissary. | N’établit pas une nouvelle caste ou hiérarchie. |
| [NECA — Enforcer, série 12](https://store.necaonline.com/blogs/behind-the-scenes/closer-look-enforcer-predator-action-figure-from-series-12) | Produit sous licence explicitement rattaché à Predator: Bad Blood de Dark Horse ; Enforcer y est décrit en chasse des Bad Bloods. | Une référence comic/figurine ne devient pas automatiquement canon film. |
| [NECA — Ultimate Feral](https://store.necaonline.com/products/prey-7-action-figure-ultimate-feral-predator) | Figurine du film Prey : bouclier, masque, lances et arme à traits dans plusieurs états. | Rempart et les autres originaux ne sont pas des variantes officielles de Feral. |
| [Disney — Predator: Badlands](https://thewaltdisneycompany.com/news/predator-badlands/) | Présentation studio de Dek, Thia et de la chasse au Kalisk ; aventure Yautja et milieu extraterrestre hostile. | N’atteste aucune nouvelle faune, machine, espèce ou planète inventée ici. |
| [NECA — Lost Tribe série 6](https://store.necaonline.com/blogs/news/174246983-predators-introducing-the-lost-tribe-from-our-series-6-action-figures) | Silhouettes individuelles sous licence de la Lost Tribe de Predator 2. | Ne crée aucune parenté ou biographie pour les dix originaux. |
| [PlayStation / IllFonic — Viking et hache](https://blog.playstation.com/?p=342704) | Hache de combat et compromis de puissance/vitesse dans Hunting Grounds. | Herse n’est pas Viking ni une variante officielle. |

## Vérification du registre

Les contrôles d’auteur ont réussi le 27 novembre 2026 : six comptes de catalogue, 225 identifiants de définitions uniques (catalogues, techniques, phases, actes et variantes compétitives), références de sources et de propriétaires, liens réciproques entre arènes, ennemis et boss, 30 spéciaux, 10 supers, 60 phases, cinq actes de quatre arènes uniques, dix arcs narratifs et cohérence des quatre premiers noms avec les scènes du lot artistique.

Ces contrôles portent sur les données. Jouabilité, équilibrage, animations natives, sauvegarde en jeu, contrôle clavier/manette et revue artistique restent à implémenter puis à vérifier. Les états du JSON conservent cette distinction. Aucun build complet n’est nécessaire pour cet ajout de données et de documentation.

### Ordre d’intégration proposé

1. Prototyper Silex et la Cour des masques avec arme détachée, récupération, garde et métriques de sol correctes.
2. Brancher une rencontre de boss complète, ses trois phases, sa conclusion et sa reprise.
3. Développer les dix kits par familles mécaniques en conservant leurs différences et leurs coûts.
4. Produire les vingt scènes et rencontres ; contrôler séparément histoire et compétition.
5. Raccorder conclusions, preuves, récompenses et sauvegardes ; effectuer les essais de jeu et la revue artistique.

