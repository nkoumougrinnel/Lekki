import { useState, useEffect, useCallback } from 'react';
import { BarreDeRecherche } from '../composants/BarreDeRecherche';
import { InterfaceClavardage } from '../composants/InterfaceClavardage';
import { CATEGORIES_PAGES } from '../config/api';
import {
  libelleCategorie,
  libelleRole,
  formaterDateRelative,
  normaliserMessage,
} from '../utils/affichage';

export const TableauDeBordWiki = ({ utilisateur, fonctionsApi, surDeconnexion }) => {
  const [pages, setPages] = useState([]);
  const [messagesChat, setMessagesChat] = useState([]);
  const [chatId, setChatId] = useState(null);
  const [pageSelectionnee, setPageSelectionnee] = useState(null);
  const [categorieActive, setCategorieActive] = useState(null);
  const [chargementDonnees, setChargementDonnees] = useState(true);
  const [chargementMessageIa, setChargementMessageIa] = useState(false);
  const [ragIndisponible, setRagIndisponible] = useState(false);

  useEffect(() => {
    const chargerInitialisation = async () => {
      const docs = await fonctionsApi.recupererPages();
      const { messages, chatId: idChat } = await fonctionsApi.recupererHistoriqueChat();
      setPages(docs);
      setMessagesChat(messages.map(normaliserMessage));
      setChatId(idChat);
      if (docs.length > 0) setPageSelectionnee(docs[0]);
      setChargementDonnees(false);
    };
    chargerInitialisation();
  }, [fonctionsApi]);

  const pagesFiltrees = categorieActive
    ? pages.filter((p) => p.category === categorieActive)
    : pages;

  const gererEnvoiMessageChat = async (question) => {
    setChargementMessageIa(true);
    const msgUser = {
      id: `local-user-${Date.now()}`,
      role: 'user',
      content: question,
    };
    setMessagesChat((prev) => [...prev, msgUser]);

    const resultat = await fonctionsApi.envoyerMessageChat(question, chatId);

    if (resultat.indisponible) {
      setRagIndisponible(true);
      setMessagesChat((prev) => [
        ...prev,
        {
          id: `local-info-${Date.now()}`,
          role: 'assistant',
          content: resultat.message,
        },
      ]);
    } else if (resultat.messageAssistant) {
      setRagIndisponible(false);
      if (resultat.chatId) setChatId(resultat.chatId);
      setMessagesChat((prev) => [...prev, normaliserMessage(resultat.messageAssistant)]);
    } else if (resultat.erreur) {
      setMessagesChat((prev) => [
        ...prev,
        {
          id: `local-err-${Date.now()}`,
          role: 'assistant',
          content: resultat.erreur,
        },
      ]);
    }

    setChargementMessageIa(false);
  };

  const surRechercheApi = useCallback(
    (q) => fonctionsApi.rechercherPages(q),
    [fonctionsApi]
  );

  const obtenirCouleurBadge = (category) => {
    switch (category) {
      case 'rh':
        return 'bg-[#00C896]/10 text-[#00C896] border-[#00C896]/20';
      case 'technique':
        return 'bg-[#3B6EFF]/10 text-[#3B6EFF] border-[#3B6EFF]/20';
      case 'guides':
        return 'bg-[#A78BFA]/10 text-[#A78BFA] border-[#A78BFA]/20';
      default:
        return 'bg-[#F59B0B]/10 text-[#F59B0B] border-[#F59B0B]/20';
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
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider px-2 mb-2">
              Catégories API
            </p>
            <nav className="space-y-1">
              {CATEGORIES_PAGES.map(({ key, label }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setCategorieActive(key)}
                  className={`w-full text-left px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center justify-between ${
                    categorieActive === key
                      ? 'bg-[#3B6EFF] text-white'
                      : 'text-gray-400 hover:bg-[#1A2026] hover:text-white'
                  }`}
                >
                  <span>{key === null ? '📂 Toutes' : `📁 ${label}`}</span>
                  <span className="text-[10px] bg-[#0D0F12]/40 px-1.5 py-0.2 rounded-md">
                    {key === null
                      ? pages.length
                      : pages.filter((p) => p.category === key).length}
                  </span>
                </button>
              ))}
            </nav>
          </div>
        </div>
        <div className="p-4 border-t border-[#232931] bg-[#0D0F12]/50">
          <div className="flex items-center justify-between mb-2">
            <div className="truncate pr-2">
              <p className="text-xs font-bold text-white truncate">{utilisateur.username}</p>
              <p className="text-[10px] text-gray-500 font-mono">{libelleRole(utilisateur.role)}</p>
            </div>
            <span className="w-2 h-2 rounded-full bg-[#00C896] animate-pulse shrink-0" />
          </div>
          <button
            type="button"
            onClick={surDeconnexion}
            className="w-full text-[10px] text-gray-500 hover:text-white font-mono uppercase tracking-wider"
          >
            Déconnexion
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 border-b border-[#232931] px-6 flex items-center justify-between bg-[#13171C]/40">
          <BarreDeRecherche
            surRechercheApi={surRechercheApi}
            surSelectionPage={(p) => setPageSelectionnee(p)}
          />
          <div className="text-xs text-gray-400 font-mono hidden md:block">
            {pages.length} page(s) · API v1
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <h2 className="text-gray-400 text-xs uppercase tracking-widest font-mono mb-3">
              Index des documents ({pagesFiltrees.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {pagesFiltrees.map((page) => (
                <div
                  key={page.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setPageSelectionnee(page)}
                  onKeyDown={(e) => e.key === 'Enter' && setPageSelectionnee(page)}
                  className={`p-4 rounded-md border cursor-pointer transition-all ${
                    pageSelectionnee?.id === page.id
                      ? 'bg-[#1A2026] border-[#3B6EFF] shadow-lg'
                      : 'bg-[#13171C] border-[#232931] hover:border-gray-700'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-md border font-mono ${obtenirCouleurBadge(page.category)}`}
                    >
                      {libelleCategorie(page.category)}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">
                      {formaterDateRelative(page.updated_at ?? page.created_at)}
                    </span>
                  </div>
                  <h4 className="text-white text-xs font-bold truncate mb-1">{page.title}</h4>
                  <p className="text-[11px] text-gray-400 truncate font-mono">
                    vues: {page.view_count ?? 0}
                    {page.is_embedded ? ' · indexé' : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {pageSelectionnee && (
            <div className="bg-[#13171C] border border-[#232931] rounded-md overflow-hidden flex flex-col min-h-[350px]">
              <div className="p-3 bg-[#1A2026] border-b border-[#232931] flex items-center justify-between">
                <span className="text-xs font-bold text-white">Visualiseur Markdown</span>
                <span className="text-[10px] text-gray-400 font-mono">ID: {pageSelectionnee.id}</span>
              </div>
              <div className="p-6 prose prose-invert max-w-none overflow-y-auto text-xs text-gray-300 space-y-4">
                {pageSelectionnee.content.split('\n').map((ligne, i) => {
                  if (ligne.startsWith('# '))
                    return (
                      <h1
                        key={i}
                        className="text-white text-lg font-bold border-b border-[#232931] pb-2 mt-2 font-sans"
                      >
                        {ligne.replace('# ', '')}
                      </h1>
                    );
                  if (ligne.startsWith('## '))
                    return (
                      <h2 key={i} className="text-white text-sm font-bold pt-2 font-sans text-[#3B6EFF]">
                        {ligne.replace('## ', '')}
                      </h2>
                    );
                  if (ligne.startsWith('- '))
                    return (
                      <li key={i} className="ml-4 list-disc text-gray-300">
                        {ligne.replace('- ', '')}
                      </li>
                    );
                  if (ligne.trim() === '') return <div key={i} className="h-2" />;
                  return (
                    <p key={i} className="leading-relaxed font-sans">
                      {ligne}
                    </p>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      <InterfaceClavardage
        messages={messagesChat}
        surEnvoyerMessage={gererEnvoiMessageChat}
        chargementIa={chargementMessageIa}
        ragIndisponible={ragIndisponible}
      />
    </div>
  );
};
