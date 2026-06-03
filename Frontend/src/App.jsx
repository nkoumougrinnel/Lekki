import React, { useState } from 'react';
import { PageConnexion } from './vues/PageConnexion';
import { TableauDeBordWiki } from './vues/TableauDeBordWiki';
import { useApi } from './crochets/useApi';

export default function App() {
  const [utilisateurConnecte, setUtilisateurConnecte] = useState(null);
  const api = useApi();

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
        />
      )}
    </div>
  );
}