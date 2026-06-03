import React, { useState, useEffect, useRef } from 'react';

export const BarreDeRecherche = ({ ouvrages, surSelectionOuvrage }) => {
  const [requete, setRequete] = useState('');
  const [resultats, setResultats] = useState([]);
  const [estOuvert, setEstOuvert] = useState(false);
  const conteneurRef = useRef(null);

  useEffect(() => {
    if (requete.trim() === '') {
      setResultats([]);
      return;
    }
    const filtres = ouvrages.filter(ouvrage =>
      ouvrage.titre.toLowerCase().includes(requete.toLowerCase()) ||
      ouvrage.contenu.toLowerCase().includes(requete.toLowerCase())
    );
    setResultats(filtres);
  }, [requete, ouvrages]);

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
          placeholder="Rechercher un document ou une procédure... (Ctrl+K)"
          value={requete}
          onChange={(e) => { setRequete(e.target.value); setEstOuvert(true); }}
          onFocus={() => setEstOuvert(true)}
          className="w-full bg-[#13171C] border border-[#232931] text-white px-4 py-2 pl-10 rounded-md focus:outline-none focus:border-[#3B6EFF] transition-colors text-sm"
        />
        <span className="absolute left-3 top-2.5 text-gray-500">🔍</span>
      </div>

      {estOuvert && resultats.length > 0 && (
        <div className="absolute left-0 right-0 mt-2 bg-[#13171C] border border-[#232931] rounded-md shadow-2xl z-50 max-h-60 overflow-y-auto">
          {resultats.map((ouvrage) => (
            <div
              key={ouvrage.id}
              onClick={() => {
                surSelectionOuvrage(ouvrage);
                setEstOuvert(false);
                setRequete('');
              }}
              className="p-3 border-b border-[#232931] last:border-0 hover:bg-[#1A2026] cursor-pointer transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-white text-sm font-medium">{ouvrage.titre}</span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-[#232931] text-gray-400">
                  {ouvrage.categorie}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 truncate">
                {ouvrage.contenu.replace(/[#*`]/g, '')}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};