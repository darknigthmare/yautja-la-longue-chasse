# Présentation des combattants V93

Le runtime lit les cinq familles natives `pit.presentation.intro`, `victory`, `defeat`, `dizzy`, `taunt`, en plus de l'idle existant. Une inscription dans un catalogue ne suffit pas : le loader doit décoder les pixels distincts, valider le costume exact et la direction native. Les banques annulées, les pages illisibles, les cellules vides/dupliquées ou les costumes voisins ne permettent pas d'activer une provocation.

Les entrées et résultats conservent leurs anciennes horloges. La victoire/défaite de **manche** reste distincte du résultat de **match**, via le `sourcePhase` du cue. Le mode training conserve son transport exact. Un ancien idle réutilisé, une pose tenue ou un bitmap restent explicitement des replis, jamais une nouvelle plaquette native.

## Fenêtre de conclusion

Après la cérémonie d'un vrai KO décisif et uniquement dans la fenêtre de choix V80, le gagnant attend en idle et le perdant peut utiliser `pit.presentation.dizzy`. Cela ne ranime pas le perdant : santé nulle, identité, physique et reçu de match restent inchangés. Une défaite de manche, un timeout, une relecture, le mode off ou un parcours stage-journey ne deviennent pas artificiellement une attente de fatalité. Le dizzy peut boucler ; les autres familles dédiées ne bouclent pas.

Une provocation volontaire du gagnant possède une horloge indépendante. Elle ne remet à zéro ni les cinq secondes de choix ni le dizzy adverse. Une vraie sélection, un skip, l'expiration ou le prochain duel retire ce geste. Le CPU conserve sa politique de conclusion existante ; aucune nouvelle entrée CPU n'est inventée.

## Provocation jouable pendant un round

Si le vrai clip natif est chargé pour le costume et la direction, un bouton HUD de 44 px minimum et un raccourci libre sont proposés. Les touches sont choisies parmi T/Y/G/B/V/N en excluant **tous** les bindings personnalisés ; les libellés et attributs DOM annoncent les touches effectivement disponibles. J2 n'est commandable que dans le versus local. Le même bouton fonctionne au clic, au clavier focalisé et au toucher ; il n'est pas dépendant de la détection tactile.

Le geste commence seulement au sol, en état neutre, hors garde/camouflage/projection. Il utilise les ticks existants du round, sans horloge supplémentaire ni arrêt adverse. Il n'accorde aucune invulnérabilité, ressource, récompense ou propriété canon. Une tentative d'attaque, de déplacement, de saut, de garde, de projection ou de ressource l'interrompt ; une modification réelle de santé, position, orientation, état ou manche l'interrompt aussi. L'adversaire conserve sa vraie animation de combat, y compris quand les deux joueurs provoquent simultanément.

Les pauses/onglets masqués/chargements gèlent les transports existants. Le mode mouvement réduit tient le dessin final de chaque famille dédiée, sans interpolation ni miroir. Les leçons guidées, l'enregistrement/lecture du mannequin et les replays ne reçoivent pas de commande de provocation.

## Frontières et validation bornée

`pitLifecyclePresentationV93.ts` fournit des états éphémères et une projection de rendu ; cette projection n'est jamais publiée dans le contrôleur des rounds. Aucun champ de combat, version de moteur, moveset, codec de sauvegarde, fixture historique ou récompense n'est modifié. Les adapters `hunterSpriteMotion.ts`/`pitFighterAnimation.ts` restent inchangés, puisqu'il ne faut pas transformer un geste visuel en action de combat fictive.

Validation locale : 12 tests V93 (6 sur le vrai moteur et ses KO/dégâts/ticks, 6 sur le vrai loader de pixels, ses frontières temporelles à 30/60Hz et le HUD SSR), plus 44 tests historiques ciblés présentation/finishers/replay, sans modifier ces derniers. Le transport millisecondes ne perd plus un tick aux frontières 31/62/65 : seuls quelques ULP de représentation flottante sont corrigés avant floor, et un instant réellement antérieur reste dans le dessin précédent. Les pixels synthétiques des tests sont déclarés et ne prouvent aucune nouvelle planche de production. Le lint ciblé passe sur les fichiers runtime/HUD. La couverture réelle des PNG V93 et la revue navigateur sont des vérifications séparées ; ce lot ne certifie pas les six familles sur les 201 identités.
