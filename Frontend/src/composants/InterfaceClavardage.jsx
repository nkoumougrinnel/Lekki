import React, { useState, useEffect, useRef } from 'react';

export const InterfaceClavardage = ({ historiqueInitial, surEnvoyerMessage, chargementIa }) => {
  const [messages, setMessages] = useState([]);
  const [saisie, setSaisie] = useState('');
  const finDiscussionRef = useRef(null);

  useEffect(() => {
    setMessages(historiqueInitial);
  }, [historiqueInitial]);

  useEffect(() => {
    finDiscussionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chargementIa]);

  const gererSoumission = async (e) => {
    e.preventDefault();
    if (!saisie.trim()) return;

    const messageUtilisateur = {
      id: `msg-user-${Date.now()}`,
      expediteur: 'utilisateur',
      texte: saisie
    };

    setMessages(prev => [...prev, messageUtilisateur]);
    setSaisie('');
    
    const reponsesGenerees = await surEnvoyerMessage(messageUtilisateur);
    if (reponsesGenerees && reponsesGenerees.length > 1) {
      setMessages(prev => [...prev, reponsesGenerees[1]]);
    }
  };

  const obtenirCouleurConfiance = (score) => {
    if (score >= 85) return 'bg-[#00C896] text-black';
    if (score >= 60) return 'bg-[#F59B0B] text-white';
    return 'bg-[#EB355E] text-white';
  };

  return (
    <div className="flex flex-col h-full bg-[#13171C] border-l border-[#232931] w-[380px]">
      <div className="p-4 border-b border-[#232931] flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Lekki Chat IA</h3>
          <p className="text-xs text-gray-400">Assistant propulsé par RAG local</p>
        </div>
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20">
          Bêta
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <div key={msg.id} className={`flex flex-col ${msg.expediteur === 'utilisateur' ? 'items-end' : 'items-start'}`}>
            <div className={`max-w-[90%] rounded-md p-3 text-xs leading-relaxed ${
              msg.expediteur === 'utilisateur' 
                ? 'bg-[#3B6EFF] text-white rounded-br-none' 
                : 'bg-[#1A2026] text-gray-200 border border-[#232931] rounded-bl-none'
            }`}>
              {msg.texte}

              {msg.expediteur === 'ia' && msg.score_confiance && (
                <div className="mt-3 pt-2 border-t border-[#232931] space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Score sémantique :</span>
                    <span className={`px-1.5 py-0.5 rounded-md font-bold ${obtenirCouleurConfiance(msg.score_confiance)}`}>
                      {msg.score_confiance}%
                    </span>
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="text-[10px]">
                      <span className="text-gray-400 block mb-1">Sources citées :</span>
                      {msg.sources.map((src, idx) => (
                        <div key={idx} className="text-[#3B6EFF] underline cursor-pointer truncate">
                          📄 {src}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {chargementIa && (
          <div className="flex flex-col items-start animate-pulse">
            <div className="bg-[#1A2026] text-gray-400 border border-[#232931] rounded-md rounded-bl-none p-3 text-xs w-[80%]">
              Génération vectorielle et synthèse en cours...
            </div>
          </div>
        )}
        <div ref={finDiscussionRef} />
      </div>

      <form onSubmit={gererSoumission} className="p-4 border-t border-[#232931] bg-[#0D0F12]">
        <div className="relative">
          <input
            type="text"
            placeholder="Posez votre question au système..."
            value={saisie}
            onChange={(e) => setSaisie(e.target.value)}
            disabled={chargementIa}
            className="w-full bg-[#13171C] border border-[#232931] text-white text-xs rounded-md pl-3 pr-10 py-2.5 focus:outline-none focus:border-[#3B6EFF] disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={chargementIa}
            className="absolute right-2 top-2 text-[#00C896] font-bold text-sm px-1.5 hover:text-white transition-colors disabled:opacity-50"
          >
            ➔
          </button>
        </div>
      </form>
    </div>
  );
};