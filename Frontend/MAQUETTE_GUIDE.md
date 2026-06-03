# Guide de la Maquette Lekki Wiki

## Vue d'ensemble

Cette maquette interactive présente une plateforme de gestion des connaissances interne inspirée de Notion, structurée autour de quatre écrans principaux : le Dashboard, l'Éditeur Markdown, la Recherche RAG et la Gestion des Droits d'Accès.

## Architecture de la Maquette

### Structure des Fichiers

```
client/src/
├── components/
│   ├── Sidebar.tsx              # Navigation latérale avec arborescence
│   ├── Header.tsx               # En-tête avec navigation principale
│   ├── Dashboard.tsx            # Écran d'accueil avec statistiques
│   ├── MarkdownEditor.tsx       # Éditeur Markdown avec aperçu
│   ├── RAGSearch.tsx            # Moteur de recherche RAG
│   └── AccessControl.tsx        # Gestion des droits d'accès
├── types/
│   └── wiki.ts                  # Définitions TypeScript
├── lib/
│   └── mockData.ts              # Données de démonstration
└── index.css                    # Design system Lekki
```

## Écrans Principaux

### 1. Dashboard (Accueil)

L'écran d'accueil affiche une vue d'ensemble de la plateforme avec les éléments suivants :

- **Statistiques** : Nombre total de documents, dossiers, contributeurs et dernière mise à jour
- **Documents récemment mis à jour** : Liste des documents modifiés récemment avec auteur et date
- **Favoris** : Affichage en grille des documents marqués comme favoris
- **Actions rapides** : Boutons pour créer un nouveau document, un dossier ou accéder à la recherche

**Accès** : Cliquez sur l'onglet "Dashboard" dans le header

### 2. Éditeur Markdown

L'éditeur offre une expérience d'édition en temps réel avec :

- **Barre d'outils** : Boutons pour formater le texte (gras, italique, titres, listes, code, liens)
- **Éditeur Markdown** : Zone de saisie avec support complet de la syntaxe Markdown
- **Aperçu en direct** : Prévisualisation en temps réel du rendu Markdown
- **Gestion des versions** : Affichage du statut de sauvegarde et historique

**Accès** : Cliquez sur un document dans la Sidebar pour l'ouvrir en édition

### 3. Recherche RAG (Retrieval-Augmented Generation)

Le moteur de recherche alimenté par l'IA permet de :

- **Interroger la base de connaissances** : Poser des questions en langage naturel
- **Obtenir des réponses générées** : Réponses synthétisées à partir des documents pertinents
- **Score de confiance** : Barre de progression indiquant la fiabilité de la réponse
- **Sources citées** : Liste des documents utilisés pour générer la réponse avec score de pertinence

**Accès** : Cliquez sur l'onglet "Search" dans le header

### 4. Gestion des Droits d'Accès

Contrôlez l'accès aux documents avec :

- **Visibilité publique/privée** : Basculer entre accès public et accès restreint
- **Gestion des utilisateurs** : Ajouter/supprimer des utilisateurs avec leurs rôles
- **Rôles de permissions** :
  - **Admin** : Voir, éditer, supprimer, gérer l'accès
  - **Editor** : Voir et éditer
  - **Reader** : Voir uniquement

**Accès** : Cliquez sur l'onglet "Access Control" dans le header

## Design System Lekki

### Palette de Couleurs

| Couleur | Hex | Usage |
|---------|-----|-------|
| Ink | `#0D0F12` | Fond sombre, texte principal |
| Emerald | `#00C896` | Boutons primaires, accents actifs |
| Sapphire | `#3B82F6` | Texte secondaire, liens, code |
| Amber | `#F59E0B` | Alertes, avertissements |
| Rose | `#E43F5E` | Erreurs, actions destructrices |
| Mist | `#8892A4` | Texte tertiaire, placeholders |
| Smoke | `#EBEBF0` | Bords, fonds légers |
| White | `#F8F9FA` | Fond clair, texte sur sombre |

### Typographie

- **Titres** : Helvetica Bold (32px–48px)
- **Sous-titres** : Helvetica Bold (18px–24px)
- **Corps** : Helvetica Regular (14px–16px)
- **Code** : Courier Prime (12px–14px)

### Composants UI

- **Boutons** : Radius 8px, hauteur 40px
- **Cartes** : Radius 8px, ombre légère
- **Entrées** : Radius 8px, hauteur 36px
- **Badges** : Radius 16px, padding 4px–8px

## Navigation

### Sidebar (Navigation Latérale)

La Sidebar affiche l'arborescence complète des documents et dossiers :

- **Expansion/Réduction** : Cliquez sur les chevrons pour développer/réduire les dossiers
- **Sélection** : Cliquez sur un document pour l'ouvrir
- **Icônes** : Les dossiers affichent une icône de dossier, les documents une icône de fichier
- **Accès** : Un cadenas indique les documents privés

### Header (Navigation Principale)

L'en-tête offre une navigation rapide entre les sections :

- **Dashboard** : Retour à l'accueil
- **Search** : Accès au moteur RAG
- **Access Control** : Gestion des droits
- **Menu utilisateur** : Profil, paramètres, déconnexion

## Données de Démonstration

La maquette utilise des données simulées pour démontrer les fonctionnalités :

- **Documents** : Arborescence avec dossiers "Documentation", "Team Guidelines" et "Projects"
- **Utilisateurs** : 4 utilisateurs avec rôles différents (Admin, Editor, Reader)
- **Réponse RAG** : Exemple de réponse générée avec sources et score de confiance

## Interactions

### Édition de Document

1. Cliquez sur un document dans la Sidebar
2. Utilisez la barre d'outils pour formater le texte
3. Tapez ou collez votre contenu Markdown
4. Cliquez sur "Save" pour enregistrer

### Recherche RAG

1. Cliquez sur l'onglet "Search"
2. Tapez votre question dans la barre de recherche
3. Cliquez sur "Search" ou appuyez sur Entrée
4. Consultez la réponse générée et les sources

### Gestion des Droits

1. Cliquez sur l'onglet "Access Control"
2. Basculez entre "Public" et "Private"
3. Ajoutez des utilisateurs avec leurs rôles
4. Modifiez ou supprimez les permissions existantes

## Fonctionnalités Futures

Cette maquette peut être étendue avec :

- **Intégration API réelle** : Connexion à un backend pour persister les données
- **Authentification** : Système de login/logout avec JWT
- **Collaboration en temps réel** : Édition collaborative avec WebSocket
- **Historique des versions** : Suivi des modifications et restauration
- **Intégration IA réelle** : Connexion à un vrai moteur RAG (OpenAI, Hugging Face, etc.)
- **Notifications** : Alertes en temps réel pour les mises à jour
- **Recherche avancée** : Filtres par date, auteur, tags, etc.

## Conseils de Personnalisation

### Modifier les Couleurs

Les couleurs sont définies dans `client/src/index.css` sous `:root`. Modifiez les variables CSS pour adapter la palette :

```css
--color-emerald: #00C896; /* Changez cette valeur */
```

### Ajouter de Nouveaux Documents

Modifiez `client/src/lib/mockData.ts` pour ajouter des documents à la structure `mockDocuments`.

### Personnaliser les Icônes

Les icônes proviennent de la bibliothèque `lucide-react`. Consultez la documentation pour ajouter d'autres icônes.

## Support et Dépannage

### Le serveur ne démarre pas

Assurez-vous que les dépendances sont installées :
```bash
cd client
pnpm install
```

### Les couleurs ne s'affichent pas correctement

Vérifiez que les variables CSS sont correctement définies dans `index.css` et que le ThemeProvider est configuré avec le bon thème.

### Les composants shadcn/ui ne s'affichent pas

Assurez-vous que tous les composants UI sont importés correctement depuis `@/components/ui/`.

## Conclusion

Cette maquette interactive démontre les capacités d'une plateforme de gestion des connaissances moderne, combinant l'édition Markdown, la recherche alimentée par l'IA et la gestion granulaire des droits d'accès. Elle peut servir de base pour un projet de production avec les ajustements et intégrations nécessaires.
