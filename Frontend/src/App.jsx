import React, { useState, useEffect } from 'react';
import { PageConnexion } from './vues/PageConnexion';
import { TableauDeBordWiki } from './vues/TableauDeBordWiki';
import { useApi } from './crochets/useApi';

export default function App() {
  const [utilisateurConnecte, setUtilisateurConnecte] = useState(null);
  const [initialisation, setInitialisation] = useState(true);
  const api = useApi();

  useEffect(() => {
    const restaurerSession = async () => {
      const user = await api.chargerSession();
      if (user) setUtilisateurConnecte(user);
      setInitialisation(false);
    };
    restaurerSession();
  }, []);

  if (initialisation) {
    return (
      <div className="min-h-screen bg-[#0D0F12] text-white flex items-center justify-center font-mono text-xs">
        Initialisation Lekki...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0D0F12] text-white font-sans antialiased">
      {!utilisateurConnecte ? (
        <PageConnexion
          surConnexionReussie={(user) => setUtilisateurConnecte(user)}
          methodeConnexionApi={api.connecterUtilisateur}
          chargementApi={api.chargement}
          erreurApi={api.erreur}
        />
      ) : (
        <TableauDeBordWiki
          utilisateur={utilisateurConnecte}
          fonctionsApi={api}
          surDeconnexion={() => {
            api.deconnecter();
            setUtilisateurConnecte(null);
          }}
        />
      )}
    </div>
  );
}
