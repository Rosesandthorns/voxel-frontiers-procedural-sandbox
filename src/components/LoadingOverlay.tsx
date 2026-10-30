import React from 'react';
export function LoadingOverlay({ progress, error, onCancel }: { progress: number; stageMessage: string; error?: string | null; onCancel?: () => void }) {
 return <div className="loading-screen"><p className="menu-eyebrow">Biome</p><h1>{error ? 'Could not load world' : 'Preparing your world'}</h1>{error ? <p role="alert">{error}</p> : <progress aria-label="Loading world" max={100} value={progress}/>}<button className="entry-back" onClick={onCancel}>Back to worlds</button></div>;
}
