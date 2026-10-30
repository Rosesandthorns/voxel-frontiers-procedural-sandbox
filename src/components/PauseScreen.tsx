import React, { useState } from 'react';
import {FriendsPanel} from './FriendsPanel';
interface Props { onResume: () => void; onOpenSettings: () => void; onSaveAndQuit: () => boolean; getSaveError: () => string | null }
export function PauseScreen({ onResume, onOpenSettings, onSaveAndQuit, getSaveError }: Props) {
  const [error, setError] = useState<string | null>(null);
  return <div className="pause-backdrop"><section className="pause-panel" role="dialog" aria-modal="true" aria-labelledby="pause-title">
    <p className="menu-eyebrow">Biome</p><h1 id="pause-title">Paused</h1><div className="menu-rule"/>
    <nav className="menu-actions"><FriendsPanel/><button className="primary" autoFocus onClick={onResume}>Resume <kbd>Esc</kbd></button><button onClick={onOpenSettings}>Settings</button><button onClick={() => setError(onSaveAndQuit() ? null : getSaveError() || 'The save did not complete. Retry Save & return to menu.')}>Save & return to menu</button></nav>
    {error && <p role="alert">{error}</p>}
  </section></div>;
}
