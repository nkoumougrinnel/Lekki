import { useState } from 'react';

/** Comptes du seed backend (data/seed.py) */
const COMPTE_DEMO = { email: 'admin@lekki.io', password: 'Admin1234!' };

export const PageConnexion = ({ surConnexionReussie, methodeConnexionApi, chargementApi, erreurApi }) => {
  const [email, setEmail] = useState('');
  const [motDePasse, setMotDePasse] = useState('');
  const [erreurLocale, setErreurLocale] = useState(null);

  const executerConnexion = async (e) => {
    e.preventDefault();
    setErreurLocale(null);
    if (!email || !motDePasse) {
      setErreurLocale('Veuillez remplir l\'ensemble des champs de sécurité.');
      return;
    }
    const utilisateur = await methodeConnexionApi(email, motDePasse);
    if (utilisateur) surConnexionReussie(utilisateur);
  };

  const declencherAccesDemo = async () => {
    setErreurLocale(null);
    const utilisateurDemo = await methodeConnexionApi(COMPTE_DEMO.email, COMPTE_DEMO.password);
    if (utilisateurDemo) surConnexionReussie(utilisateurDemo);
  };

  return (
    <div className="min-h-screen w-full bg-[#0D0F12] flex items-center justify-center p-4 selection:bg-[#00C896]/30">
      <div className="w-full max-w-md bg-[#13171C] border border-[#232931] p-8 rounded-md shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center space-x-2 mb-2">
            <span className="text-[#00C896] text-3xl font-black tracking-tighter">L</span>
            <h1 className="text-white text-2xl font-bold tracking-tight font-sans">Lekki</h1>
          </div>
          <p className="text-xs text-gray-400 uppercase tracking-widest font-mono">Think. Write. Search.</p>
        </div>

        {(erreurLocale || erreurApi) && (
          <div className="mb-4 p-3 bg-[#EB355E]/10 border border-[#EB355E]/20 text-[#EB355E] text-xs rounded-md">
            {erreurLocale || erreurApi}
          </div>
        )}

        <form onSubmit={executerConnexion} className="space-y-4">
          <div>
            <label className="block text-gray-400 text-xs mb-1.5 font-medium">Email ou identifiant</label>
            <input
              type="text"
              placeholder="admin@lekki.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0D0F12] border border-[#232931] text-white px-3 py-2 text-sm rounded-md focus:outline-none focus:border-[#3B6EFF] transition-colors"
            />
          </div>

          <div>
            <label className="block text-gray-400 text-xs mb-1.5 font-medium">Mot de passe</label>
            <input
              type="password"
              placeholder="••••••••"
              value={motDePasse}
              onChange={(e) => setMotDePasse(e.target.value)}
              className="w-full bg-[#0D0F12] border border-[#232931] text-white px-3 py-2 text-sm rounded-md focus:outline-none focus:border-[#3B6EFF] transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={chargementApi}
            className="w-full bg-[#00C896] text-black font-bold text-sm py-2 px-4 rounded-md hover:bg-[#00C896]/90 transition-colors disabled:opacity-50 mt-2"
          >
            {chargementApi ? 'Vérification...' : 'Se connecter'}
          </button>
        </form>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-[#232931]"></div></div>
          <div className="relative flex justify-center text-[10px] uppercase"><span className="bg-[#13171C] px-2 text-gray-500 font-mono">Évaluation</span></div>
        </div>

        <button
          type="button"
          onClick={declencherAccesDemo}
          disabled={chargementApi}
          className="w-full bg-[#3B6EFF] text-white font-bold text-sm py-2 px-4 rounded-md hover:bg-[#3B6EFF]/90 transition-colors disabled:opacity-50"
        >
          Accès démo (admin seed)
        </button>
        <p className="mt-3 text-[10px] text-gray-500 text-center font-mono">
          API : localhost:8000 · {COMPTE_DEMO.email}
        </p>
      </div>
    </div>
  );
};
