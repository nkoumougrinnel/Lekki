import { useState, useCallback } from 'react';

export const useApi = () => {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);

  const connecterUtilisateur = useCallback(async (email, motDePasse) => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch('http://localhost:3000/utilisateurs');
      if (!res.ok) throw new Error('Erreur réseau de connexion');
      const utilisateurs = await res.json();
      const user = utilisateurs.find(u => u.email === email);
      if (user || (email === 'demo@lekki.cm' && motDePasse === 'demo')) {
        return user || { id: '1', email: 'demo@lekki.cm', nom: 'Alexandre D.', role: 'Admin' };
      }
      throw new Error('Identifiants invalides');
    } catch (err) {
      setErreur(err.message);
      return null;
    } finally {
      setChargement(false);
    }
  }, []);

  const recupererOuvrages = useCallback(async () => {
    setChargement(true);
    setErreur(null);
    try {
      const res = await fetch('http://localhost:3000/ouvrages');
      if (!res.ok) throw new Error('Impossible de charger les ouvrages');
      return await res.json();
    } catch (err) {
      setErreur(err.message);
      return [];
    } finally {
      setChargement(false);
    }
  }, []);

  const recupererHistoriqueChat = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:3000/historique_chat');
      if (!res.ok) throw new Error('Impossible de charger l\'historique');
      return await res.json();
    } catch (err) {
      return [];
    }
  }, []);

  const envoyerMessageChat = useCallback(async (nouveauMessage, historiqueActuel) => {
    try {
      await fetch('http://localhost:3000/historique_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nouveauMessage)
      });
      
      const simulateurIA = {
        id: `msg-ia-${Date.now()}`,
        expediteur: 'ia',
        texte: `Réponse simulée sémantiquement à propos de: "${nouveauMessage.texte}". Les chunks de 512 tokens ont été correctement indexés localement par Lekki.`,
        score_confiance: 88,
        sources: ["Architecture Système Lekki AI (p. 1)"]
      };

      await fetch('http://localhost:3000/historique_chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(simulateurIA)
      });

      return [nouveauMessage, simulateurIA];
    } catch (err) {
      return [nouveauMessage];
    }
  }, []);

  return {
    chargement,
    erreur,
    connecterUtilisateur,
    recupererOuvrages,
    recupererHistoriqueChat,
    envoyerMessageChat
  };
};