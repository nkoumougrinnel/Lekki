import React, { useState, useEffect } from 'react';
import { BarreDeRecherche } from '../composants/BarreDeRecherche';
import { InterfaceClavardage } from '../composants/InterfaceClavardage';

export const TableauDeBordWiki = ({ utilisateur, fonctionsApi }) => {
  const [ouvrages, setOuvrages] = useState([]);
  const [ouvragesFiltres, setOuvragesFiltres] = useState([]);
  const [historiqueChat, setHistoriqueChat] = useState([]);
  const [ouvrageSelectionne, setOuvrageSelectionne] = useState(null);
  const [categorieActive, setCategorieActive] = useState('Tous');
  const [chargementDonnees, setChargementDonnees] = useState(true);
  const [chargementMessageIa, setChargementMessageIa] = useState(false);

  const categories = ['Tous', 'RH', 'Technique', 'Commercial'];

  useEffect(() => {
    const chargerInitialisation = async () => {
      const docs = await fonctionsApi.recupererOuvrages();
      const chat = await fonctionsApi.recupererHistoriqueChat();
      setOuvrages(docs);
      setOuvragesFiltres(docs);
      setHistoriqueChat(chat);
      if (docs.length > 0) setOuvrageSelectionne(docs[0]);
      setChargementDonnees(false);
    };
    chargerInitialisation();
  }, [fonctionsApi]);

  useEffect(() => {
    if (categorieActive === 'Tous') {
      setOuvragesFiltres(ouvrages);
    } else {
      setOuvragesFiltres(ouvrages.filter(o => o.categorie === categorieActive));
    }
  }, [categorieActive, ouvrages]);

  const gererEnvoiMessageChat = async (nouveauMessage) => {
    setChargementMessageIa(true);
    const majThread = await fonctionsApi.envoyerMessageChat(nouveauMessage, historiqueChat);
    setHistoriqueChat(prev => [...prev, nouveauMessage]);
    
    if (majThread.length > 1) {
      setTimeout(() => {
        setHistoriqueChat(prev => [...prev, majThread[1]]);
        setChargementMessageIa(false);
      }, 1000);
    } else {
      setChargementMessageIa(false);
    }
    return majThread;
  };

  const obtenirCouleurBadge = (cat) => {
    switch (cat) {
      case 'RH': return 'bg-[#00C896]/10 text-[#00C896] border-[#00C896]/20';
      case 'Technique': return 'bg-[#3B6EFF]/10 text-[#3B6EFF] border-[#3B6EFF]/20';
      default: return 'bg-[#F59B0B]/10 text-[#F59B0B] border-[#F59B0B]/20';
    }
  };

  if (chargementDonnees) {
    return (
      <div className="min-h-screen bg-[#0D0F12] text-white flex items-center justify-center font-mono text-xs">
        Chargement de l'infrastructure d'entreprise Lekki...
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-[#0D0F12] flex overflow-hidden selection:bg-[#3B6EFF]/30">
      <div className="w-64 bg-[#13171C] border-r border-[#232931] flex flex-col justify-between">
        <div>
          <div className="p-4 border-b border-[#232931] flex items-center space-x-2">
            <span className="text-[#00C896] text-xl font-black">L</span>
            <span className="text-white font-bold text-md font-sans">Lekki Wiki</span>
          </div>
          <div className="p-3">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-2 mb-2">Espaces de travail</p>
            <nav className="space-y-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategorieActive(cat)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    categorieActive === cat 
                      ? 'bg-[#3B6EFF] text-white' 
                      : 'text-gray-400 hover:bg-[#1A2026] hover:text-white'
                  }`}
                >
                  <span>{cat === 'Tous' ? '📂 Base globale' : `📁 ${cat}`}</span>
                  <span className="text-[10px] bg-[#0D0F12]/40 px-1.5 py-0.2 rounded-md">
                    {cat === 'Tous' ? ouvrages.length : ouvrages.filter(o => o.categorie === cat).length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="p-4 border-t border-[#232931] bg-[#0D0F12]/50 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-xs font-bold text-white truncate">{utilisateur.nom}</p>
            <p className="text-[10px] text-gray-500 font-mono">{utilisateur.role}</p>
          </div>
          <span className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse"></span>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-[#232931] px-6 flex items-center justify-between bg-[#13171C]/40">
          <BarreDeRecherche ouvrages={ouvrages} surSelectionOuvrage={(o) => setOuvrageSelectionne(o)} />
          <div className="text-xs text-gray-400 font-mono hidden md:block">
            Souveraineté: <span className="text-[#00C896]">Locale</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-3">Index des documents ({ouvragesFiltres.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {ouvragesFiltres.map((ouvrage) => (
                <div
                  key={ouvrage.id}
                  onClick={() => setOuvrageSelectionne(ouvrage)}
                  className={`p-4 rounded-md border cursor-pointer transition-all ${
                    ouvrageSelectionne?.id === ouvrage.id
                      ? 'bg-[#1A2026] border-[#3B6EFF] shadow-lg'
                      : 'bg-[#13171C] border-[#232931] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${obtenirCouleurBadge(ouvrage.categorie)}`}>
                      {ouvrage.categorie}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{ouvrage.derniere_activite}</span>
                  </div>
                  <h4 className="text-white text-xs font-bold truncate mb-1">{ouvrage.titre}</h4>
                  <p className="text-[11px] text-gray-400 truncate">{ouvrage.auteur}</p>
                </div>
              ))}
            </div>
          </div>

          {ouvrageSelectionne && (
            <div className="bg-[#13171C] border border-[#232931] rounded-md overflow-hidden flex flex-col min-h-[350px]">
              <div className="p-3 bg-[#1A2026] border-b border-[#232931] flex items-center justify-between">
                <span className="text-xs font-bold text-white">Visualiseur Markdown Intégré</span>
                <span className="text-[10px] text-gray-400 font-mono">ID: {ouvrageSelectionne.id}</span>
              </div>
              <div className="p-6 prose prose-invert max-w-none overflow-y-auto text-xs text-gray-300 space-y-4">
                {ouvrageSelectionne.contenu.split('\n').map((ligne, i) => {
                  if (ligne.startsWith('# ')) return <h1 key={i} className="text-white text-lg font-bold border-b border-[#232931] pb-2 mt-2 font-sans">{ligne.replace('# ', '')}</h1>;
                  if (ligne.startsWith('## ')) return <h2 key={i} className="text-white text-sm font-bold pt-2 font-sans text-[#3B6EFF]">{ligne.replace('## ', '')}</h2>;
                  if (ligne.startsWith('- ')) return <li key={i} className="ml-4 list-disc text-gray-300">{ligne.replace('- ', '')}</li>;
                  if (ligne.trim() === '') return <div key={i} className="h-2" />;
                  return <p key={i} className="leading-relaxed font-sans">{ligne}</p>;
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <InterfaceClavardage
        historiqueInitial={historiqueChat}
        surEnvoyerMessage={gererEnvoiMessageChat}
        chargementIa={chargementMessageIa}
      />
    </div>
  );
};