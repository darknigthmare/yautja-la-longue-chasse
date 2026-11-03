#!/usr/bin/env python3
"""Index the certified V111 open requirements without changing their status."""
import argparse
from collections import Counter
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCE = 'docs/v111-homeworld-followup.json'
SOURCE_SHA256 = '2c71e1d09de23d3adeef64ef10cc2065bcc8d9733dbc26670c862e59c28a7a3f'
FAMILY_SCOPE = {
    'pit-roster-kits': ('The Pit · identités et kits', 'P2', 'Références nominatives, deux sens natifs, anatomie/équipement et kit complet réellement raccordé.'),
    'war-structures': ('Guerre de clans · ouvrages', 'P1', 'Mêmes objets, stocks finis, trajet réel, refus/reprise persistants ; acquisition et accord de campagne restent distincts des exercices.'),
    'preserve-expansion': ('Preserve Hunt · expansion', 'P2', 'Secteurs contigus réellement jouables et adultes uniques ; fiches H001–H100 et art ne sont pas remplacés par trois atlas partagés.'),
    'enforcer-provenance': ('Provenance Enforcers', 'P3', 'Récupérer les reçus/traces historiques authentiques ; un nouveau dessin ou reçu ne répare pas leur absence.'),
    'pit-actions': ('The Pit · actions Feral / Scar', 'P1', 'Vrais partenaires, objets et états autorisés ; collisions, coût, réaction, interruption, sauvegarde et recette compilée par sens.'),
    'pit-campaigns': ('The Pit · campagnes', 'P2', 'Scène source et acteurs exacts ; les seize étapes ne sont pas remplacées par un exercice libre.'),
    'pit-variants': ('The Pit · variantes', 'P2', 'Deux sens natifs, armes/masque/armure réels et transitions persistantes ; pas de clôture par miroir ou pose statique.'),
}
HOMEWORLD = [
    {'id': 'HW112-SPATIAL-COHERENCE', 'section': '12 / 18 / 23', 'need': 'Former des groupes urbains cohérents, des rues/ruelles/cours et des accès lisibles ; corriger les placements sans fermer les passages.', 'acceptance': 'Mesurer les chevauchements et accès sur la géométrie réelle ; conserver les passages et vérifier les déplacements du moteur puis le rendu compilé.'},
    {'id': 'HW112-MOBILITY-ACCESS', 'section': '18 / 20 / 23', 'need': 'Raccorder les destinations, seuils et trajets à des points réellement atteignables, sans téléportation ni collision affaiblie.', 'acceptance': 'Ancien cas bloqué reproduit, route suivie par le corps réel, changements de charge/phase invalidant les propositions périmées.'},
    {'id': 'HW112-CITY-LIFE', 'section': '12 / 15 / 16 / 21', 'need': 'Réduire les espaces visuellement vides avec un tissu urbain et une activité cohérente ; garder la lisibilité et les distances d’activation.', 'acceptance': 'Éléments ancrés et réutilisés explicitement, aucun faux objet interactif ; captures du jeu compilé et contrôles des accès, mouvement réduit et pause.'},
    {'id': 'HW112-OPEN-GAMEPLAY', 'section': '14 / 15 / 25', 'need': 'Faire progresser une activité ou un besoin source vérifiable par son vrai comportement, pas par un compteur décoratif.', 'acceptance': 'Préconditions, interaction effective, persistance et refus testés ; portée exacte liée au besoin sans clore un rôle ou une famille entière.'},
    {'id': 'HW112-UPGRADE-RECOVERY', 'section': '23 / 26 — QA 7 sauvegarde', 'need': 'Préserver une reprise cohérente quand un ancien checkpoint ou point de phase enregistré est occupé par un nouveau meuble V112.', 'acceptance': 'Reproduire le même checkpoint V111 libre avant mise à jour et bloqué après, proposer une récupération explicitement confirmée avec sauvegarde des sept registres, refuser les reçus étrangers/périmés et vérifier le vrai moteur, le quota et le rechargement.'},
]


def sha(data):
    return hashlib.sha256(data).hexdigest()


def collect(root=ROOT):
    raw = (root / SOURCE).read_bytes()
    assert sha(raw) == SOURCE_SHA256, 'Published V111 source snapshot changed'
    source = json.loads(raw)
    assert source['release'] == 'V111' and len(source['sourceItems']) == 56 and len(source['artTargets']) == 354
    rows = []
    for row in source['sourceItems']:
        family, priority, acceptance = FAMILY_SCOPE[row['familyId']]
        remaining = next((row[k] for k in ['remainingV111', 'remainingV110', 'remainingV109', 'remainingV108', 'remaining'] if row.get(k)), '')
        rows.append({'id': row['id'], 'familyId': row['familyId'], 'family': family, 'domain': row['domain'], 'source': row['source'],
                     'status': 'OUVERT_SOURCE', 'priority': priority, 'originalNeed': row.get('sourceRemaining', row['remaining']),
                     'latestRecordedRemaining': remaining, 'acceptance': acceptance,
                     'originalRowSha256': sha((json.dumps(row, ensure_ascii=False, sort_keys=True, separators=(',', ':')) + '\n').encode())})
    family_counts = Counter(row['familyId'] for row in rows)
    assert family_counts == {'pit-roster-kits': 7, 'war-structures': 6, 'preserve-expansion': 2, 'enforcer-provenance': 2, 'pit-actions': 9, 'pit-campaigns': 16, 'pit-variants': 14}
    art = [{key: row[key] for key in ['id', 'section', 'family', 'label', 'lore', 'inventoryStatusV111']} for row in source['artTargets']]
    return {'schemaVersion': 1, 'release': 'V112', 'asOf': '2026-10-28',
            'sourceSnapshot': {'path': SOURCE, 'sha256': sha(raw), 'bytes': len(raw)},
            'sourceCommit': 'def899ad07fea582053c5c204e4e578d8e0d7f9b',
            'method': 'Audit of the immutable V111 snapshot. Nine action requirements are already included in the 56 source rows. Homeworld needs and the 354 art targets are separate scopes. This index neither re-runs historical gameplay nor certifies current rendering.',
            'facts': {'openSourceRequirements': len(rows), 'includedSourceActions': family_counts['pit-actions'], 'additionalSourceActions': 0,
                      'families': dict(sorted(family_counts.items())), 'artTargets': len(art),
                      'historicalV111ArtPresence': dict(sorted(Counter(row['inventoryStatusV111'] for row in art).items())),
                      'newClosures': 0},
            'sourceItems': rows, 'homeworldNeeds': HOMEWORLD, 'artTargets': art,
            'limits': ['Les 56 lignes source ne sont pas 56 petits correctifs Homeworld : les campagnes, partenaires, variantes et productions artistiques restent individuellement nécessaires.',
                       'Les neuf actions sont un sous-ensemble des 56 exigences, pas neuf lignes supplémentaires.',
                       'Les 313 candidats artistiques, 40 absences de candidats et une animation manquante sont un état de présence V111 ; une présence ne certifie ni admission ni qualité.',
                       'La mesure Preserve héritée V109 est 32 secteurs / 64 adultes, cibles 80 / 100 ; ces nombres ne sont pas une nouvelle mesure V112.',
                       'Les preuves V111 demeurent historiques ; chaque avancée V112 exige des preuves de son propre périmètre.']}


def markdown(audit):
    lines = ['# Ouverts Excel et priorités V112', '',
             'Les **56 exigences source incluent les neuf actions Feral / Scar**. Le brief Homeworld et les 354 cibles artistiques sont suivis séparément ; aucun total ne doit les additionner comme s’il s’agissait de tâches équivalentes.', '',
             '| Famille | Lignes ouvertes | Priorité | Condition de livraison |', '| --- | ---: | --- | --- |']
    for family_id, count in audit['facts']['families'].items():
        name, priority, acceptance = FAMILY_SCOPE[family_id]
        lines.append(f'| {name} | {count} | {priority} | {acceptance} |')
    lines += ['', '## Homeworld : placements, vides et vie', '']
    for row in audit['homeworldNeeds']:
        lines += [f"- **{row['id']}** — brief V81 §§{row['section']} : {row['need']} {row['acceptance']}"]
    lines += ['', '## Exigences source prioritaires', '']
    for family in ['pit-actions', 'war-structures', 'preserve-expansion']:
        lines += ['| ID | Source exacte | Besoin initial |', '| --- | --- | --- |']
        for row in audit['sourceItems']:
            if row['familyId'] == family:
                text = row['originalNeed'].replace('\n', '<br>').replace('|', '\\|')
                lines.append(f"| {row['id']} | {row['source']} | {text} |")
        lines.append('')
    lines += ['## Limites', ''] + ['- ' + value for value in audit['limits']]
    return '\n'.join(lines) + '\n'


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    args = parser.parse_args()
    audit = collect()
    for file, data in [('docs/v112-open-workstreams-audit.json', (json.dumps(audit, ensure_ascii=False, indent=2) + '\n').encode()),
                       ('docs/v112-open-workstreams-audit.md', markdown(audit).encode())]:
        if args.check:
            assert (ROOT / file).read_bytes() == data, 'Stale open-workstream audit: ' + file
        else:
            (ROOT / file).write_bytes(data)
    print(json.dumps({'result': 'PASS_AUDIT_INDEX', 'facts': audit['facts'], 'check': args.check}))
