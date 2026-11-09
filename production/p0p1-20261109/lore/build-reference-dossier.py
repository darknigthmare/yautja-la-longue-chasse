#!/usr/bin/env python3
"""Build a read-only, reproducible reference dossier; never grant art approval."""
from __future__ import annotations

import argparse
import hashlib
import html
import json
import os
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
OUT = Path(__file__).resolve().parent


def read(path):
    return json.loads((ROOT / path).read_text())


def fingerprint(path):
    data = (ROOT / path).read_bytes()
    return {"path": path, "bytes": len(data), "sha256": hashlib.sha256(data).hexdigest()}


REFERENCES = [
    {"id": "REF-OPS-01", "work": "Alien vs. Predator (2004)", "kind": "official-film-synopsis", "url": "https://www.20thcenturystudios.com/movies/alien-vs-predator", "supports": "Rite initiatique de la pyramide et coopération avec Lex.", "doesNotEstablish": "Plan intérieur, mandat ou seuil chiffré de progression."},
    {"id": "REF-OPS-02", "work": "Alien vs. Predator (2004) / objet ADI d'exposition", "kind": "production-object-notice", "url": "https://propstoreauction.com/lot-details/index/catalog/489/lot/185392/13-Elder-Predator-Ian-Whyte-Display-Bio-Mask-AVP-ALIEN-VS-PREDATOR-2004", "supports": "Provenance ADI du masque exposé et rappel de la reconnaissance de Lex.", "doesNotEstablish": "Cet exemplaire redécoré comme masque filmé ou un commandement de Lex."},
    {"id": "REF-OPS-04", "work": "The Predator (2018)", "kind": "vfx-vendor-account", "url": "https://www.rsp.com.au/our-work/filmography/the-predator/", "supports": "Poursuite de deux appareils et intérieur/extérieur d'une coque accidentée.", "doesNotEstablish": "Armement, boucliers, proportions ou plan du Clan Ship AVP 2004."},
    {"id": "REF-OPS-05", "work": "Plusieurs films, sections distinctes", "kind": "secondary-illustrated-index", "url": "https://www.avpgalaxy.net/predator/spacecrafts/", "supports": "Pistes d'images de vaisseaux, passerelle, projection de pyramide et capsules.", "doesNotEstablish": "Mesures canoniques de notre table, sept pièces ou effectifs."},
    {"id": "REF-OPS-06", "work": "Aliens vs. Predator: The Essential Comics Volume 1", "kind": "publisher-bibliography", "url": "https://digital.darkhorse.com/books/9bb496a44e944fcda26662b44db247be/aliens-vs-predator-the-essential-comics-volume-1", "supports": "Identification éditoriale du corpus de Machiko.", "doesNotEstablish": "Aucune page ou géométrie précise de vie à bord sans lecture des planches."},
    {"id": "REF-OPS-07", "work": "Aliens/Predator: War", "kind": "secondary-comics-index", "url": "https://www.comics.org/issue/552792/", "supports": "Synopsis indexé de vie de Machiko à bord et reine captive.", "doesNotEstablish": "Pages non consultées, protocole d'intégration ou loi universelle des clans."},
    {"id": "REF-OPS-08", "work": "Aliens vs. Predator: Three World War", "kind": "distributor-synopsis", "url": "https://www.g-mart.com/static/f104197.html", "supports": "Conflit de clans et alliance circonstancielle avec des humains dans cette œuvre.", "doesNotEstablish": "Doctrine de tous les clans ou contrôle standard des Xénomorphes."},
    {"id": "REF-OPS-09", "work": "Alien vs. Predator (2004)", "kind": "vfx-vendor-account", "url": "https://www.mpcvfx.com/en/filmography/alien-vs-predator/", "supports": "Travail du prestataire sur les vaisseaux et environnements spatiaux.", "doesNotEstablish": "Plan complet, mobilier mesuré ou amarrage personnel."},
    {"id": "REF-OPS-10", "work": "Alien vs. Predator (2004)", "kind": "production-interview", "url": "https://www.awn.com/vfxworld/alien-vs-predator-battle-merge-practical-effects-and-cgi", "supports": "Témoignages sur le vaisseau mère et la projection tridimensionnelle de la station baleinière.", "doesNotEstablish": "Grande table militaire de notre jeu, menus et proportions."},
]

SCOPE_NOTES = {
    "room-background": ("original-game-adaptation", "Sept décors générés pour un parcours latéral jouable, voûtes bronze et éclairages turquoise/ambre. Leur plan n'est pas un relevé filmique.", "Portes, hauteurs, alcôves, texture, palette et disposition des pièces : comparer une référence précise avant toute approbation."),
    "clan-prop": ("original-game-adaptation", "Objet individuel créé pour la fonction de jeu, avec pivot et empreinte propres.", "Comparer silhouette, proportions, nombre de pièces et matériaux au même angle ; le rôle ne prouve pas l'identité filmique."),
    "crew-sprite": ("original-game-character", "Personne et surnom originaux, réemploi d'un dessin individuel V84 au rôle attribué.", "Aucun personnage canonique n'est identifié par ce réemploi. Anatomie, masque, équipement et geste de rôle restent des comparaisons distinctes."),
    "shared-prop": ("original-game-adaptation", "Objet partagé des kits V21/V22, réemployé sans nouvelle attribution canonique.", "Ne pas certifier porte, console ou râtelier AVP par la seule présence du kit dans le dépôt."),
    "ship-profile": ("film-identity-project-render", "Identité d'appareil conservée dans le catalogue ; le rendu reste un fichier du projet.", "Comparer la même incarnation et le même angle ; les qualifications historiques du catalogue ne s'étendent pas au plan intérieur."),
    "incident-prop": ("original-game-adaptation", "Objet d'incident original : commandes et indicateurs appartiennent aux opérations du projet.", "Aucun isolateur ou relais de film précis n'est revendiqué ; conserver les proportions de son propre module."),
}

CAPTURES = [
    ("approach", "production/clan-ship-20261104/qa-interior/run-41818690041/01-approach-desktop.png", "22fad968311d252310fe2fde281f71564a401a64", [
        ("Profil du vaisseau collectif ; vue de trois quarts", [136, 396, 550, 173]),
        ("Vaisseau personnel affiché séparément ; échelle de carte UI", [98, 695, 90, 40])]),
    ("council", "production/clan-ship-20261104/qa-operations/browser-final/captures/02-council-massive-table.png", "1137faaf80051b37fa2205af73414bed099024a9", [
        ("Table collective et son support : création de jeu", [454, 680, 540, 185]),
        ("Projection SVG ; géométrie et inscription originales", [480, 527, 481, 239])]),
    ("armory", "production/clan-ship-20261104/qa-interior/run-41818690041/interior-armurerie-desktop.png", "22fad968311d252310fe2fde281f71564a401a64", [
        ("Râtelier et armes dessinées : adaptation fonctionnelle", [510, 408, 300, 215]),
        ("Forge verticale : proportions propres au prop", [910, 408, 150, 242])]),
    ("medical", "production/clan-ship-20261104/qa-interior/run-41818690041/interior-soins-desktop.png", "22fad968311d252310fe2fde281f71564a401a64", [
        ("Lit médical individuel ; chambres vitrées dans le fond", [568, 635, 310, 120])]),
]


def build():
    audit = read("production/clan-ship-20261104/qa-operations/asset-audit.json")
    crew = read("app/game/data/homeworldNpcVariantsV84.json")["variants"]
    incidents = read("public/game/clan-ship/incidents-v1/manifest.json")["assets"]
    prop_manifest = read("public/game/clan-ship/props/manifest.json")["assets"]
    ship_references = read("art-source/v14/ships/ship-reference-sources.json")["ships"]["avp-predator-mothership"]
    assets = []
    for item in audit["assets"]:
        current = fingerprint(item["path"])
        assert current["sha256"] == item["sha256"], item["path"]
        origin, observed, remaining = SCOPE_NOTES[item["category"]]
        facts = {"width": item["decoded"]["width"], "height": item["decoded"]["height"], "metadataSource": "historical-decoding-receipt; current bytes identical"}
        references = []
        if item["category"] == "crew-sprite":
            variant = next(v for v in crew if "public" + v["src"] == item["path"])
            facts.update({"variantId": variant["id"], "pivot": variant["pivot"], "alphaBounds": variant["alphaBounds"], "motionStatus": variant["motionStatus"]})
        if item["id"] in prop_manifest:
            prop = prop_manifest[item["id"]]
            facts.update({"pivot": prop["pivot"], "alphaBounds": prop["alphaBounds"], "visibleAspectRatio": round(prop["alphaBounds"]["width"] / prop["alphaBounds"]["height"], 6)})
        if item["id"] == "council-table":
            references = ["REF-OPS-05", "REF-OPS-09", "REF-OPS-10"]
            observed = "Plateau circulaire sur pieds, reliefs bronze ; projection géométrique SVG indépendante. Le thème holographique a un appui documentaire, la grande table et ses menus restent originaux."
            facts["runtimeUsage"] = {"roomId": "conseil", "maximumVisibleWidth": 560, "maximumVisibleHeight": 325, "footprint": {"width": 500, "depth": 65}, "units": "game-world-units; never metres"}
        if item["id"] == "shared-mothership":
            references = ["REF-OPS-05", "REF-OPS-09"]
            facts["historicalCatalogueStatus"] = "V14 reference-locked / manualInspection accepted; not re-awarded by this dossier"
            facts["supportingImageUrls"] = ship_references["supportingImageUrls"]
            facts["visualLocks"] = ship_references["visualLocks"]
            facts["forbiddenMixes"] = ship_references["forbiddenMixes"]
        assets.append({"id": item["id"], "category": item["category"], **current, "origin": origin,
            "referenceIds": references, "primaryPage": None, "primaryTimecode": None,
            "primaryLocatorStatus": "not-inspected; no locator invented", "facts": facts,
            "observedOrDeclared": observed, "comparisonRemaining": remaining, "newHumanArtApproval": False})
    for item in incidents:
        current = fingerprint(item["runtime"])
        assert current["sha256"] == item["sha256"]
        origin, observed, remaining = SCOPE_NOTES["incident-prop"]
        assets.append({"id": item["key"], "category": "incident-prop", **current, "origin": origin,
            "referenceIds": [], "primaryPage": None, "primaryTimecode": None,
            "primaryLocatorStatus": "original-project-object", "facts": {"width": item["sourceWidth"], "height": item["sourceHeight"], "pivot": item["pivot"], "alphaBounds": item["alphaBounds"]},
            "observedOrDeclared": observed, "comparisonRemaining": remaining, "newHumanArtApproval": False})
    assert len(assets) == 30 and len({a["path"] for a in assets}) == 30
    captures = []
    for key, path, commit, annotations in CAPTURES:
        raw = (ROOT / path).read_bytes()
        assert raw[:8] == b"\x89PNG\r\n\x1a\n"
        width, height = int.from_bytes(raw[16:20], "big"), int.from_bytes(raw[20:24], "big")
        for _, (x, y, w, h) in annotations:
            assert 0 <= x < x + w <= width and 0 <= y < y + h <= height
        captures.append({"id": key, **fingerprint(path), "sourceCommit": commit, "width": width, "height": height,
            "inspectedThisPass": True, "scope": "Existing native capture opened; not a new browser execution or film frame.",
            "annotations": [{"text": text, "rectPixels": rect} for text, rect in annotations]})
    inputs = ["production/clan-ship-20261104/references.md", "production/clan-ship-20261104/qa-operations/asset-audit.json",
        "public/game/clan-ship/manifest.json", "public/game/clan-ship/props/manifest.json", "public/game/clan-ship/incidents-v1/manifest.json",
        "art-source/v14/ships/ship-reference-sources.json", "art-source/v14/ships/ship-asset-manifest.json", "app/game/data/homeworldNpcVariantsV84.json"]
    report = {"schemaVersion": 1, "asOf": "2026-11-09", "baseCommit": "39b601ce1873a1f400d2f545f0fab97691b779e3",
        "requirements": ["OPS-B15", "OPS-F44", "OPS-Q23"], "scope": "Reference preparation and provenance; no primary-frame or human-art qualification.",
        "assetCount": 30, "nativeCapturesOpened": 4, "newBrowserRuns": 0, "newRasterAssets": 0, "humanArtApproval": False,
        "primaryReferencesNewlyInspected": 0, "referencePolicy": "Prior citations from references.md retained with their limits. Every page/timecode is nullable and remains absent without inspection.",
        "fetchLimit": {"command": "curl --location --fail --silent --show-error --max-time 20", "targets": [ship_references["supportingImageUrls"][1], ship_references["supportingImageUrls"][2], REFERENCES[-1]["url"]], "exitCode": 22, "curlReportedError": "The requested URL returned error: 403", "imagesDownloaded": 0},
        "requirementsState": {"OPS-F44": "Provenance separated and documented; no visual approval inferred.", "OPS-B15": "Partial: current-render annotations and shape/proportion metadata prepared; primary frames/pages and human comparison remain.", "OPS-Q23": "Human comparison and art approval remain open."},
        "references": REFERENCES, "inputFingerprints": [fingerprint(path) for path in inputs], "assets": assets, "captures": captures}
    return report


def render(report):
    e = html.escape
    def local(path):
        return e(os.path.relpath(ROOT / path, OUT), quote=True)
    sections = []
    for capture in report["captures"]:
        boxes = []
        for i, annotation in enumerate(capture["annotations"], 1):
            x, y, w, h = annotation["rectPixels"]
            boxes.append(f'<span class="box" style="left:{100*x/capture["width"]}%;top:{100*y/capture["height"]}%;width:{100*w/capture["width"]}%;height:{100*h/capture["height"]}%" title="{e(annotation["text"],quote=True)}">{i}</span>')
        labels = ''.join(f'<li>{e(a["text"])}</li>' for a in capture['annotations'])
        sections.append(f'<section><h2>{e(capture["id"])}</h2><p>Capture native antérieure · source {e(capture["sourceCommit"][:8])}</p><div class="capture"><img src="{local(capture["path"])}" alt="Capture du jeu : {e(capture["id"])}">{"".join(boxes)}</div><ol>{labels}</ol></section>')
    cards = []
    for asset in report["assets"]:
        refs = ', '.join(asset['referenceIds']) or 'Création du projet ; aucun plan canonique attribué'
        cards.append(f'<article><h3>{e(asset["id"])}</h3><a href="{local(asset["path"])}"><img loading="lazy" src="{local(asset["path"])}" alt="{e(asset["id"])}"></a><p><strong>{e(asset["origin"])}</strong> · {asset["facts"]["width"]} × {asset["facts"]["height"]} px</p><p>{e(asset["observedOrDeclared"])}</p><p>{e(asset["comparisonRemaining"])}</p><p>{e(refs)}</p><p>Page / timecode : non consultés. Approbation humaine nouvelle : aucune.</p></article>')
    sources = ''.join(f'<li><a href="{e(ref["url"],quote=True)}">{e(ref["id"])} · {e(ref["work"])}</a> — {e(ref["kind"])}. {e(ref["supports"])} Limite : {e(ref["doesNotEstablish"])}</li>' for ref in report['references'])
    return '<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Clan Ship · dossier de références</title><style>body{font:16px/1.55 system-ui;background:#111a1d;color:#e7edef;max-width:1200px;margin:auto;padding:24px}a{color:#a8e5f3}h1,h2{color:#edc78a}.capture{position:relative}.capture img{width:100%;display:block}.box{position:absolute;box-sizing:border-box;border:2px solid #ffe398;color:#fff;background:#e6a90015;font-weight:bold;text-shadow:1px 1px #000}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:18px}article{padding:16px;background:#1b292e;border:1px solid #49606a;overflow-wrap:anywhere}article img{width:100%;height:190px;object-fit:contain;background:repeating-conic-gradient(#26393e 0% 25%,#1a292e 0% 50%) 50%/20px 20px}section{margin-block:32px}li{margin-bottom:12px}:focus-visible{outline:3px solid #ffe398}</style><h1>Clan Ship : provenance et préparation de comparaison</h1><p>9 novembre 2026 · OPS-B15 / OPS-F44. Trente ressources existantes, quatre captures natives datées. Les cadres numérotés annotent les captures sans modifier leurs pixels.</p><p>Les références primaires ne sont pas consultées ici. Pages et timecodes restent absents. Aucune approbation artistique humaine 1:1 ni nouvelle recette navigateur.</p>'+''.join(sections)+'<h2>Objets et origines</h2><div class="grid">'+''.join(cards)+'</div><h2>Références attribuées et limites</h2><ul>'+sources+'</ul></html>\n'


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    report = build()
    outputs = {"reference-dossier.json": (json.dumps(report, ensure_ascii=False, indent=2) + "\n").encode(),
        "reference-dossier.html": render(report).encode()}
    for name, data in outputs.items():
        target = OUT / name
        if args.check:
            assert target.read_bytes() == data, f"Outdated dossier: {name}"
        else:
            target.write_bytes(data)
    print(json.dumps({"passed": True, "mode": "check" if args.check else "build", "assets": 30, "captures": 4,
        "newHumanApproval": False, "outputs": [fingerprint(str((OUT / name).relative_to(ROOT))) for name in outputs]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
