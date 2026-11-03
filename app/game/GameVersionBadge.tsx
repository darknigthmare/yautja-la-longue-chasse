import { GAME_BUILD_ID, GAME_BUILD_LABEL, GAME_RELEASE_VERSION, GAME_VERSION_LABEL } from "./buildInfo";
import styles from "./GameVersionBadge.module.css";

export default function GameVersionBadge({ className = "", compact = false }: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={`${styles.badge} ${compact ? styles.compact : ""} ${className}`.trim()}
      data-game-version={GAME_RELEASE_VERSION}
      data-game-build={GAME_BUILD_ID}
      aria-label={`Version du jeu ${GAME_RELEASE_VERSION}, build ${GAME_BUILD_LABEL}`}
      title={`La Longue Chasse · version ${GAME_RELEASE_VERSION} · build ${GAME_BUILD_LABEL}`}
    >
      <span className={styles.label} aria-hidden="true">Version</span>
      <strong aria-hidden="true">{GAME_VERSION_LABEL}</strong>
      <span className={styles.separator} aria-hidden="true">·</span>
      <code aria-hidden="true">{GAME_BUILD_ID === "local" ? "local" : GAME_BUILD_ID}</code>
    </span>
  );
}
