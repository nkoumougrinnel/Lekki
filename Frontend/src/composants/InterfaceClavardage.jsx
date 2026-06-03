import React, { useState, useEffect, useRef } from 'react';
import { normaliserMessage } from '../utils/affichage';

export const InterfaceClavardage = ({
  messages,
  surEnvoyerMessage,
  chargementIa,
  ragIndisponible,
}) => {
  const [saisie, setSaisie] = useState('');
  const finDiscussionRef = useRef(null);

  useEffect(() => {
    finDiscussionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chargementIa]);

  const gererSoumission = async (e) => {
    e.preventDefault();
    if (!saisie.trim() || chargementIa) return;
    const texte = saisie.trim();
    setSaisie('');
    await surEnvoyerMessage(texte);
  };

  const obtenirCouleurConfiance = (score) => {
    if (score >= 85) return 'bg-[#00C896] text-black';
    if (score >= 60) return 'bg-[#F59B0B] text-white';
    return 'bg-[#EB355E] text-white';
  };

  const messagesAffichables = messages.map(normaliserMessage);

  return (
    <div className="flex flex-col h-full bg-[#13171C] border-l border-[#232931] w-[380px]">
      <div className="p-4 border-b border-[#232931] flex items-center justify-between">
        <div>
          <h3 className="text-white font-bold text-sm">Lekki Chat IA</h3>
          <p className="text-xs text-gray-400">POST /ask · RAG backend</p>
        </div>
        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-md bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20">
          {ragIndisponible ? 'Hors ligne' : 'Bêta'}
        </span>
      </div>

      {ragIndisponible && (
        <div className="mx-4 mt-3 p-2 bg-[#F59B0B]/10 border border-[#F59B0B]/30 text-[#F59B0B] text-[10px] rounded-md">
          Les routes /chats et /ask ne sont pas encore exposées par le serveur. Les messages restent locaux.
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messagesAffichables.length === 0 && (
          <p className="text-xs text-gray-500 text-center py-8">
            Posez une question sur la base documentaire.
          </p>
        )}

        {messagesAffichables.map((msg) => (
          <div
            key={msg.id}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[90%] rounded-md p-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-[#3B6EFF] text-white rounded-br-none'
                  : 'bg-[#1A2026] text-gray-200 border border-[#232931] rounded-bl-none'
              }`}
            >
              {msg.content}

              {msg.role === 'assistant' && msg.score_confiance != null && (
                <div className="mt-3 pt-2 border-t border-[#232931] space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-gray-400">Score sémantique :</span>
                    <span
                      className={`px-1.5 py-0.5 rounded-md font-bold ${obtenirCouleurConfiance(msg.score_confiance)}`}
                    >
                      {msg.score_confiance}%
                    </span>
                  </div>
                  {msg.sources?.length > 0 && (
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
