import Link from "next/link";
import type { ReactNode } from "react";
import { resolveDevDestination } from "./destinations";
import styles from "./dev-travel.module.css";

const LOCAL_PATHS = [
  {
    id: "mission-jungle-vey",
    label: "Oseris‑IV · Canopée, dépeçage et trophée",
    description: "Pars en chasse, grimpe par les appuis, utilise l’outil de dépeçage et termine l’extraction avec le trophée.",
  },
  {
    id: "mission-volcano-bad-blood",
    label: "Cinder‑12 · Décors du sanctuaire",
    description: "Suis la chasse volcanique et inspecte les repères de la crête et les accessoires du clan.",
  },
  {
    id: "homeworld-port",
    label: "Homeworld · Atlas et noms locaux",
    description: "Ouvre le voyage régional au port, cherche une région par son nom local et lis le nom et la fonction du village.",
  },
  {
    id: "ship",
    label: "Vaisseau personnel · Carte et services",
    description: "Utilise les salles du vaisseau pour ouvrir la carte stellaire, examiner l’équipement et essayer les réglages.",
  },
] as const;

function NativePath({ label, description, children }: { label: string; description: string; children: ReactNode }) {
  return <li>
    <strong>{label}</strong>
    <p>{description}</p>
    {children}
  </li>;
}

export default function NativePaths({ onSelect }: { onSelect: (id: string) => void }) {
  return <details className={styles.nativePaths} data-dev-native-paths>
    <summary>Autres parcours à vérifier</summary>
    <ul>
      {LOCAL_PATHS.map(path => resolveDevDestination(path.id) && <NativePath key={path.id} {...path}>
        <button type="button" onClick={() => onSelect(path.id)}>Ouvrir cet essai</button>
      </NativePath>)}
      <NativePath label="Campagne · Droits de coque M044 et mémoire M055"
        description="Reprends une campagne qui remplit les prérequis. Vérifie le dossier de coque dans le vaisseau du clan, puis les traces de mémoire dans le chapitre Longue Mémoire.">
        <Link href="/" prefetch={false}>Retour au menu du jeu</Link>
      </NativePath>
      <NativePath label="The Pit · Atelier d’animation"
        description="Contrôle les animations et les poses des Masques brisés dans l’atelier. Le menu du jeu donne accès au scénario jouable selon ta progression.">
        <Link href="/pit-lab" prefetch={false}>Ouvrir l’atelier The Pit</Link>
      </NativePath>
    </ul>
  </details>;
}
