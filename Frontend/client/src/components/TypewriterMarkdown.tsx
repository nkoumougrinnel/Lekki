import { useEffect, useRef, useState } from 'react';
import { Streamdown } from 'streamdown';

interface TypewriterMarkdownProps {
  text: string;
  onDone?: () => void;
  onProgress?: () => void;
}

/**
 * Révèle un texte Markdown progressivement pour simuler une génération
 * « token par token » (rendu via Streamdown). La cadence s'adapte à la
 * longueur afin de borner la durée totale (~2 s) quelle que soit la taille.
 */
export function TypewriterMarkdown({ text, onDone, onProgress }: TypewriterMarkdownProps) {
  const [count, setCount] = useState(0);
  const doneRef = useRef(false);
  const step = Math.max(2, Math.ceil(text.length / 110));

  useEffect(() => {
    setCount(0);
    doneRef.current = false;
  }, [text]);

  useEffect(() => {
    if (count >= text.length) {
      if (!doneRef.current) {
        doneRef.current = true;
        onDone?.();
      }
      return;
    }
    const id = setTimeout(() => {
      setCount((c) => Math.min(text.length, c + step));
      onProgress?.();
    }, 18);
    return () => clearTimeout(id);
  }, [count, text, step, onDone, onProgress]);

  return <Streamdown>{text.slice(0, count)}</Streamdown>;
}
