import { useState, useEffect, useRef } from 'react';
import { libelleCategorie } from '../utils/affichage';

export const BarreDeRecherche = ({ surRechercheApi, surSelectionPage }) => {
  const [requete, setRequete] = useState('');
  const [resultats, setResultats] = useState([]);
  const [estOuvert, setEstOuvert] = useState(false);
  const [rechercheEnCours, setRechercheEnCours] = useState(false);
  const conteneurRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = requete.trim();
      if (q === '') {
        setResultats([]);
        return;
      }
      setRechercheEnCours(true);
      const pages = await surRechercheApi(q);
      setResultats(pages);
      setRechercheEnCours(false);
    }, 300);

    return () => clearTimeout(timer);
  }, [requete, surRechercheApi]);

  useEffect(() => {
    const cliquageExterieur = (e) => {
      if (conteneurRef.current && !conteneurRef.current.contains(e.target)) {
        setEstOuvert(false);
      }
    };
    document.addEventListener('mousedown', cliquageExterieur);
    return () => document.removeEventListener('mousedown', cliquageExterieur);
  }, []);

  return (
    <div ref={conteneurRef} className="relative w-full max-w-xl">
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher (FTS5 backend)…"
          value={requete}
          onChange={(e) => { setRequete(e.target.value); setEstOuvert(true); }}
          onFocus={() => setEstOuvert(true)}
          className="w-full bg-[#13171C] border border-[#232931] text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:border-[#3B6EFF] transition-colors text-sm"
        />
        <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
        {rechercheEnCours && (
          <span className="absolute right-3 top-2.5 text-[10px] text-gray-500 font-mono">…</span>
        )}
      </div>

      {estOuvert && requete.trim() && (
        <div className="absolute left-0 right-0 mt-2 bg-[#13171C] border border-[#232931] rounded-md shadow-2xl z-50 max-h-60 overflow-y-auto">
          {resultats.length === 0 && !rechercheEnCours ? (
            <p className="p-3 text-xs text-gray-500">Aucun résultat pour « {requete} »</p>
          ) : (
            resultats.map((page) => (
              <div
                key={page.id}
                onClick={() => {
                  surSelectionPage(page);
                  setEstOuvert(false);
                  setRequete('');
                }}
                className="p-3 border-b border-[#232931] last:border-0 hover:bg-[#1A2026] cursor-pointer transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-white text-sm font-medium">{page.title}</span>
                  <span className="text-xs px-2 py-0.5 rounded-md bg-[#232931] text-gray-400">
                    {libelleCategorie(page.category)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1 truncate">
                  {page.content.replace(/[#*`]/g, '')}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
