import { useState } from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import type { HomeworldResidentV69 } from './systems/homeworldLifeV69';
import { HOMEWORLD_RESIDENT_TOPICS_V75, homeworldResidentConversationV75, homeworldResidentPlacesV75, type HomeworldResidentTopicV75 } from './systems/homeworldResidentConversationsV75';
import styles from './HomeworldResidentConversationV75.module.css';

/** Lives inside the existing city modal and its keyboard/gamepad focus trap.
 * Only an explicit destination click emits a read-only wayfinding request. */
export default function HomeworldResidentConversationV75({ resident, seconds, paused, onLandmark }: {
  resident: HomeworldResidentV69; seconds: number; paused: boolean; onLandmark(id: string): void;
}) {
  const [topic, setTopic] = useState<HomeworldResidentTopicV75>('daily');
  return <section data-homeworld-conversation-v75={resident.id} className={styles.conversation}>
    <div className={styles.topics} role="group" aria-label="Sujets de conversation">
      {HOMEWORLD_RESIDENT_TOPICS_V75.map(choice => <button key={choice.id} type="button" aria-pressed={topic === choice.id} onClick={() => setTopic(choice.id)}>{choice.label}</button>)}
    </div>
    <p data-homeworld-conversation-topic={topic}><YautjaTranslationV67 key={topic} text={homeworldResidentConversationV75(resident, topic, seconds)} paused={paused} /></p>
    {topic === 'places' && <div className={styles.places} aria-label="Repères conseillés">
      {homeworldResidentPlacesV75(resident).map(place => <button type="button" key={place.id} data-homeworld-resident-landmark={place.id} onClick={() => onLandmark(place.id)}>Repérer · {place.label}</button>)}
    </div>}
    <small>Usages locaux du clan · ces conseils ne donnent ni récompense ni permission.</small>
  </section>;
}
