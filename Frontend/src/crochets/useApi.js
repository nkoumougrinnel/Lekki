import { useState, useCallback } from 'react';
import { API_BASE_URL } from '../config/api';
import { apiFetch, setToken, getToken } from '../services/apiClient';

export const useApi = () => {
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState(null);
  const [chatId, setChatId] = useState(null);

  const connecterUtilisateur = useCallback(async (email, motDePasse) => {
    setChargement(true);
    setErreur(null);
    try {
      const body = new URLSearchParams();
      body.append('username', email);
      body.append('password', motDePasse);

      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail ?? 'Identifiants incorrects');
      }

      const data = await res.json();
      setToken(data.access_token);
      return data.user;
    } catch (err) {
      setErreur(err.message);
      return null;
    } finally {
      setChargement(false);
    }
  }, []);

  const chargerSession = useCallback(async () => {
    if (!getToken()) return null;
    setChargement(true);
    setErreur(null);
    try {
      return await apiFetch('/auth/me');
    } catch {
      setToken(null);
      return null;
    } finally {
      setChargement(false);
    }
  }, []);

  const deconnecter = useCallback(() => {
    setToken(null);
    setChatId(null);
  }, []);

  const recupererPages = useCallback(async (category = null) => {
    setChargement(true);
    setErreur(null);
    try {
      const params = new URLSearchParams({ limit: '100' });
      if (category) params.set('category', category);
      return await apiFetch(`/pages?${params}`);
    } catch (err) {
      setErreur(err.message);
      return [];
    } finally {
      setChargement(false);
    }
  }, []);

  const rechercherPages = useCallback(async (q) => {
    if (!q?.trim()) return [];
    try {
      return await apiFetch(`/pages/search?q=${encodeURIComponent(q.trim())}`);
    } catch (err) {
      setErreur(err.message);
      return [];
    }
  }, []);

  const recupererPage = useCallback(async (id) => {
    try {
      return await apiFetch(`/pages/${id}`);
    } catch (err) {
      setErreur(err.message);
      return null;
    }
  }, []);

  const recupererHistoriqueChat = useCallback(async () => {
    try {
      const chats = await apiFetch('/chats');
      if (!Array.isArray(chats) || chats.length === 0) return { messages: [], chatId: null };

      const actif = chats[0];
      const messages = await apiFetch(`/chats/${actif.id}/messages?limit=50`);
      setChatId(actif.id);
      return { messages: Array.isArray(messages) ? messages : [], chatId: actif.id };
    } catch {
      return { messages: [], chatId: null };
    }
  }, []);

  const envoyerMessageChat = useCallback(async (question, chatIdActuel) => {
    try {
      let idChat = chatIdActuel;
      if (!idChat) {
        const nouveau = await apiFetch('/chats', {
          method: 'POST',
          body: { title: question.slice(0, 80) || 'Nouvelle conversation' },
        });
        idChat = nouveau.id;
        setChatId(idChat);
      }

      const reponse = await apiFetch('/ask', {
        method: 'POST',
        body: { question, chat_id: idChat },
      });

      return {
        chatId: idChat,
        messageUtilisateur: {
          id: reponse.user_message_id ?? `user-${Date.now()}`,
          role: 'user',
          content: question,
        },
        messageAssistant: {
          id: reponse.message_id ?? `assistant-${Date.now()}`,
          role: 'assistant',
          content: reponse.answer ?? reponse.content ?? '',
          sources: reponse.sources ?? [],
          score_confiance:
            reponse.confidence != null ? Math.round(reponse.confidence * 100) : null,
        },
      };
    } catch (err) {
      if (err.status === 404 || err.status === 405) {
        return {
          chatId: chatIdActuel,
          indisponible: true,
          message: "Le chatbot RAG (/ask) n'est pas encore activé sur le serveur.",
        };
      }
      setErreur(err.message);
      return { erreur: err.message };
    }
  }, []);

  return {
    chargement,
    erreur,
    chatId,
    connecterUtilisateur,
    chargerSession,
    deconnecter,
    recupererPages,
    rechercherPages,
    recupererPage,
    recupererHistoriqueChat,
    envoyerMessageChat,
  };
};
