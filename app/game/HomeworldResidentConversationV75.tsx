import { useState } from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import type { HomeworldResidentV69 } from './systems/homeworldLifeV69';
import { HOMEWORLD_RESIDENT_TOPICS_V75, homeworldResidentConversationV75, homeworldResidentPlacesV75, type HomeworldResidentTopicV75 } from './systems/homeworldResidentConversationsV75';
import styles from './HomeworldResidentConversationV75.module.css';

/** Lives inside the existing city modal and its keyboard/gamepad focus trap.
 * Only an explicit destination click emits a read-only wayfinding request. */
type ResidentPlaceV75 = ReturnType<typeof homeworldResidentPlacesV75>[number];

export function HomeworldResidentLandmarksV75({ places, disabled, onLandmark }: {
  places: readonly ResidentPlaceV75[]; disabled: boolean; onLandmark(id: string): void;
}) {
  return <div className={styles.places} aria-label="Repères conseillés">
    {places.length ? places.map(place => <button type="button" key={place.id} data-homeworld-resident-landmark={place.id}
      disabled={disabled} onClick={() => { if (!disabled) onLandmark(place.id); }}>Repérer · {place.label}</button>)
      : <p>Explore les passages de ce quartier pour en conserver les repères.</p>}
  </div>;
}

export default function HomeworldResidentConversationV75({ resident, seconds, paused, disabled = paused, places, onLandmark }: {
  resident: HomeworldResidentV69; seconds: number; paused: boolean; disabled?: boolean;
  places?: readonly ResidentPlaceV75[]; onLandmark(id: string): void;
}) {
  const [topic, setTopic] = useState<HomeworldResidentTopicV75>('daily');
  const controlsDisabled = paused || disabled;
  const text = topic === 'places' && places !== undefined
    ? places.length ? 'Dans ce quartier, je peux t’indiquer : ' + places.map(place => place.label).join(' · ') + '. Rejoins la porte à pied ; la personne sur place recevra ta demande.'
      : 'Parcours ce quartier pour en conserver les repères. Une conversation ne découvre pas les lieux à ta place.'
    : homeworldResidentConversationV75(resident, topic, seconds);
  return <section data-homeworld-conversation-v75={resident.id} className={styles.conversation}>
    <div className={styles.topics} role="group" aria-label="Sujets de conversation">
      {HOMEWORLD_RESIDENT_TOPICS_V75.map(choice => <button key={choice.id} type="button" aria-pressed={topic === choice.id}
        disabled={controlsDisabled} onClick={() => { if (!controlsDisabled) setTopic(choice.id); }}>{choice.label}</button>)}
    </div>
    <p data-homeworld-conversation-topic={topic}><YautjaTranslationV67 key={topic} text={text} paused={controlsDisabled} /></p>
    {topic === 'places' && <HomeworldResidentLandmarksV75 places={places ?? homeworldResidentPlacesV75(resident)} disabled={controlsDisabled} onLandmark={onLandmark} />}
    <small>Usages locaux du clan · ces conseils ne donnent ni récompense ni permission.</small>
  </section>;
}
