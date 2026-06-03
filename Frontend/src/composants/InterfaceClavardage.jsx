import { useState, useEffect, useRef } from 'react';
import { normaliserMessage } from '../utils/affichage';

// ── Keyframes + styles injectés une seule fois ─────────────────────────────
const STYLES = `
@keyframes fadeSlideUp {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes shimmer {
  0%   { background-position: -200% center; }
  100% { background-position:  200% center; }
}
@keyframes pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0,200,150,0); opacity: 1; }
  50%       { box-shadow: 0 0 8px 3px rgba(0,200,150,0.35); opacity: 0.75; }
}
@keyframes spinSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes haloAppear {
  0%   { box-shadow: 0 0 0 0 rgba(0,200,150,0); }
  40%  { box-shadow: 0 0 18px 4px rgba(0,200,150,0.25); }
  100% { box-shadow: 0 0 6px 1px rgba(0,200,150,0.08); }
}

.msg-user {
  animation: fadeSlideUp 0.32s cubic-bezier(0.22,1,0.36,1) both;
}
.msg-assistant {
  animation: fadeSlideUp 0.38s cubic-bezier(0.22,1,0.36,1) both;
}
.msg-sources {
  animation: fadeIn 0.45s ease 0.15s both;
}
.assistant-halo {
  animation: haloAppear 0.7s ease both;
}
.shimmer-bar {
  background: linear-gradient(90deg,
    #232931 25%,
    #2e3d48 45%,
    #3a5060 55%,
    #232931 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}
.spin-slow {
  display: inline-block;
  animation: spinSlow 2.4s linear infinite;
}
.pulse-glow {
  animation: pulseGlow 1.8s ease-in-out infinite;
}
.src-row {
  transition: background 0.25s, border-color 0.25s, transform 0.18s;
}
.src-row:hover {
  background: rgba(59,110,255,0.07);
  border-color: rgba(59,110,255,0.45);
  transform: translateX(2px);
}
.send-btn {
  transition: transform 0.15s, background 0.15s, box-shadow 0.15s;
}
.send-btn:hover:not(:disabled) {
  transform: scale(1.1);
  box-shadow: 0 0 10px rgba(0,200,150,0.4);
}
.send-btn:active:not(:disabled) {
  transform: scale(0.95);
}
`;

const obtenirCouleurConfiance = (score) => {
  if (score >= 85) return '#00C896';
  if (score >= 60) return '#F59B0B';
  return '#EB355E';
};

// ── Composant principal (contrôlé par les props du TableauDeBordWiki) ───────
export const InterfaceClavardage = ({
  messages,
  surEnvoyerMessage,
  chargementIa,
  ragIndisponible = false,
}) => {
  const [saisie, setSaisie] = useState('');
  const finDiscussionRef = useRef(null);

  useEffect(() => {
    finDiscussionRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, chargementIa]);

  const gererSoumission = async (e) => {
    e?.preventDefault();
    if (!saisie.trim() || chargementIa) return;
    const texte = saisie.trim();
    setSaisie('');
    await surEnvoyerMessage(texte);
  };

  const messagesAffichables = messages.map(normaliserMessage);

  return (
    <>
      <style>{STYLES}</style>
      <div className="flex flex-col h-full bg-[#13171C] border-l border-[#232931] w-[380px]">

        {/* ── Header ── */}
        <div className="px-4 py-3 border-b border-[#232931] flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center flex-shrink-0 pulse-glow">
            <span className="text-[#00C896] text-sm leading-none">✦</span>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-bold text-sm leading-tight">Lekki Chat IA</h3>
            <p className="text-[10px] text-gray-400 leading-tight truncate">
              Assistant IA propulsé par la recherche augmentée (RAG)
            </p>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-[#00C896]/10 text-[#00C896] border border-[#00C896]/20 flex-shrink-0">
            {ragIndisponible ? 'HORS LIGNE' : 'BÊTA'}
          </span>
        </div>

        {/* ── Bannière RAG indisponible ── */}
        {ragIndisponible && (
          <div className="mx-4 mt-3 p-2 bg-[#F59B0B]/10 border border-[#F59B0B]/30 text-[#F59B0B] text-[10px] rounded-md">
            Les routes /chats et /ask ne sont pas encore exposées par le serveur. Les messages restent locaux.
          </div>
        )}

        {/* ── Zone messages ── */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messagesAffichables.length === 0 && (
            <p className="text-xs text-gray-500 text-center py-8">
              Posez une question sur la base documentaire.
            </p>
          )}

          {messagesAffichables.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'} items-end`}
            >
              {/* Avatar assistant */}
              {msg.role === 'assistant' && (
                <div className="w-7 h-7 rounded-full bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center flex-shrink-0 mb-0.5">
                  <span className="text-[#00C896] text-[11px] leading-none">✦</span>
                </div>
              )}

              <div className="flex flex-col max-w-[82%]">
                {/* Bulle */}
                <div
                  className={`p-3 text-xs leading-relaxed ${
                    msg.role === 'user'
                      ? 'msg-user bg-[#00C896] text-[#0D0F12] font-medium rounded-xl rounded-br-none'
                      : 'msg-assistant bg-[#1A2026] text-gray-200 border border-[#232931] rounded-xl rounded-bl-none'
                  }`}
                  style={msg.role === 'assistant' ? { whiteSpace: 'pre-line' } : undefined}
                >
                  {msg.content}
                </div>

                {/* Bloc sources + confidence (assistant uniquement) */}
                {msg.role === 'assistant' &&
                  (msg.sources?.length > 0 || msg.score_confiance != null) && (
                    <div className="mt-2 assistant-halo bg-[#1A2026] border border-[#232931] rounded-xl rounded-bl-none overflow-hidden">

                      {/* Sources */}
                      {msg.sources?.length > 0 && (
                        <div className="msg-sources px-3 pt-3 pb-2">
                          <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase block mb-2">
                            Sources citées
                          </span>
                          <div className="space-y-1">
                            {msg.sources.map((src, idx) => (
                              <div
                                key={idx}
                                className="src-row flex items-center justify-between gap-2 border border-[#232931] rounded-md px-2 py-1.5 cursor-pointer"
                              >
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-[11px] flex-shrink-0">📄</span>
                                  <span className="text-[10px] text-gray-300 truncate">{src}</span>
                                </div>
                                <span className="text-[9px] text-gray-500 flex-shrink-0">
                                  p. {idx + 1}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Confidence score (si fourni par le backend) */}
                      {msg.score_confiance != null && (
                        <div className="px-3 py-2 border-t border-[#232931]">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-[9px] font-bold tracking-widest text-gray-500 uppercase">
                              Score de confiance
                            </span>
                            <span
                              className="text-[11px] font-bold"
                              style={{ color: obtenirCouleurConfiance(msg.score_confiance) }}
                            >
                              {msg.score_confiance}%
                            </span>
                          </div>
                          <div className="w-full h-1.5 bg-[#232931] rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${msg.score_confiance}%`,
                                backgroundColor: obtenirCouleurConfiance(msg.score_confiance),
                              }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </div>
          ))}

          {/* ── Skeleton chargement IA ── */}
          {chargementIa && (
            <div className="flex flex-row items-end gap-2">
              <div className="w-7 h-7 rounded-full bg-[#00C896]/10 border border-[#00C896]/20 flex items-center justify-center flex-shrink-0">
                <span className="spin-slow text-[#00C896] text-[11px] leading-none">✦</span>
              </div>
              <div className="flex flex-col gap-2 w-[70%] bg-[#1A2026] border border-[#232931] rounded-xl rounded-bl-none p-3">
                <div className="h-3 shimmer-bar rounded-md w-full" />
                <div className="h-3 shimmer-bar rounded-md w-4/5" />
                <div className="h-3 shimmer-bar rounded-md w-2/3" />
              </div>
            </div>
          )}

          <div ref={finDiscussionRef} />
        </div>

        {/* ── Zone saisie ── */}
        <div className="border-t border-[#232931] bg-[#0D0F12] px-4 pt-3 pb-2">
          <form onSubmit={gererSoumission}>
            <div className="flex items-center gap-2 bg-[#13171C] border border-[#232931] rounded-xl px-3 py-2 focus-within:border-[#00C896]/50 focus-within:shadow-[0_0_12px_rgba(0,200,150,0.08)] transition-all duration-300">
              <input
                type="text"
                placeholder="Posez votre question..."
                value={saisie}
                onChange={(e) => setSaisie(e.target.value)}
                disabled={chargementIa}
                className="flex-1 bg-transparent text-white text-xs placeholder-gray-500 focus:outline-none disabled:opacity-50"
              />
              <button
                type="submit"
                disabled={chargementIa || !saisie.trim()}
                className="send-btn w-7 h-7 rounded-full bg-[#00C896] flex items-center justify-center flex-shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <span className="text-[#0D0F12] text-sm font-bold leading-none">➔</span>
              </button>
            </div>
          </form>
          <p className="text-[9px] text-gray-600 text-center mt-2">
            Les réponses de l&apos;IA peuvent contenir des erreurs.
          </p>
        </div>

      </div>
    </>
  );
};
