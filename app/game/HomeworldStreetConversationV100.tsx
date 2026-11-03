'use client';

import { useState } from 'react';
import YautjaTranslationV67 from './YautjaTranslationV67';
import type { HomeworldProgress } from './systems/homeworld';
import type { HomeworldUrbanExtraV78 } from './systems/homeworldUrbanPopulationV78';
import { HOMEWORLD_STREET_TOPICS_V100, homeworldStreetConversationV100, homeworldStreetPlacesV100, type HomeworldStreetTopicV100 } from './systems/homeworldStreetContactsV100';
import styles from './HomeworldStreetConversationV100.module.css';

export default function HomeworldStreetConversationV100({ contact, progress, seconds, youth, disabled, onLandmark }: {
  contact: HomeworldUrbanExtraV78; progress: HomeworldProgress; seconds: number; youth: boolean; disabled: boolean;
  onLandmark(id: string): void;
}) {
  const [topic, setTopic] = useState<HomeworldStreetTopicV100>('work');
  const places = homeworldStreetPlacesV100(contact, progress);
  return <section className={styles.conversation} data-homeworld-street-conversation-v100={contact.id}>
    <div className={styles.topics} role="group" aria-label="Parler avec cet habitant">
      {HOMEWORLD_STREET_TOPICS_V100.map(choice => <button key={choice.id} type="button" aria-pressed={choice.id === topic} disabled={disabled} onClick={() => setTopic(choice.id)}>{choice.label}</button>)}
    </div>
    <p data-homeworld-street-topic-v100={topic}><YautjaTranslationV67 key={topic} text={homeworldStreetConversationV100(contact, topic, seconds, youth)} paused={disabled} /></p>
    {topic === 'places' && <div className={styles.places} aria-label="Repères déjà connus de ce quartier">
      {places.length ? places.map(place => <button type="button" key={place.id} data-homeworld-street-landmark-v100={place.id} disabled={disabled} onClick={() => onLandmark(place.id)}>Repérer · {place.label}</button>)
        : <p>Explore les passages de ce quartier pour en conserver les repères.</p>}
    </div>}
  </section>;
}
