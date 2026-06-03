# Lekki Wiki - Concept de Design

## Vision Globale

**Lekki Wiki** est une plateforme de gestion des connaissances interne qui combine la flexibilité de Notion avec la puissance d'un moteur de recherche sémantique basé sur RAG (Retrieval-Augmented Generation). Elle permet aux collaborateurs de créer, organiser et découvrir des connaissances structurées en Markdown, tout en bénéficiant d'une recherche intelligente alimentée par l'IA.

## Principes de Design

### 1. Clarté Hiérarchique
La plateforme doit guider l'utilisateur à travers une arborescence claire de documents. L'interface utilise une navigation latérale persistante pour l'exploration des dossiers, tandis que l'éditeur central occupe l'espace principal.

### 2. Efficacité Cognitive
Chaque élément de l'interface doit servir un objectif clair. Les couleurs de la charte Lekki (Emerald pour l'action, Sapphire pour l'information, Rose pour les alertes) codent les intentions de manière intuitive.

### 3. Accessibilité des Données
La recherche RAG doit être immédiatement accessible, avec un score de confiance visible et des citations sources pour valider les réponses.

## Écrans Principaux

### Écran 1 : Dashboard / Accueil
- **Objectif** : Vue d'ensemble de la plateforme et accès rapide aux documents récents.
- **Composants** :
  - Header avec logo Lekki, barre de recherche RAG, et menu utilisateur.
  - Sidebar gauche affichant l'arborescence des dossiers/documents.
  - Zone centrale montrant les documents récents, favoris, et statistiques d'utilisation.
  - Footer avec informations de version et liens.

### Écran 2 : Éditeur de Document
- **Objectif** : Édition en temps réel de fichiers Markdown avec aperçu.
- **Composants** :
  - Barre d'outils d'édition (gras, italique, titre, listes, code, etc.).
  - Éditeur Markdown à gauche avec aperçu en direct à droite.
  - Panneau latéral droit affichant les propriétés du document (titre, tags, droits d'accès).
  - Boutons de sauvegarde et d'historique.

### Écran 3 : Recherche RAG
- **Objectif** : Interroger la base de connaissances avec une réponse générée par IA.
- **Composants** :
  - Barre de recherche en haut avec icône IA.
  - Zone de réponse affichant la réponse générée avec score de confiance.
  - Liste des documents sources utilisés pour générer la réponse.
  - Filtres par catégorie, date, auteur.

### Écran 4 : Gestion des Droits d'Accès
- **Objectif** : Contrôler qui peut voir/éditer chaque document.
- **Composants** :
  - Liste des utilisateurs/groupes avec leurs permissions (Admin, Editor, Reader).
  - Badges de statut (Actif, Archivé, Marqué).
  - Boutons d'action (Ajouter, Supprimer, Modifier).

## Palette de Couleurs (Charte Lekki)

| Couleur | Hex | Usage |
|---------|-----|-------|
| **Ink** | `#0D0F12` | Fond sombre, header, texte principal |
| **Emerald** | `#00C896` | Boutons primaires, icônes IA, badges actifs |
| **Sapphire** | `#3B82F6` | Texte secondaire, blocs de code, liens |
| **Amber** | `#F59E0B` | Alertes, documents obsolètes |
| **Rose** | `#E43F5E` | Erreurs, suppression, actions destructrices |
| **Mist** | `#8892A4` | Texte tertiaire, placeholders |
| **Smoke** | `#EBEBF0` | Bords, fonds légers |
| **White** | `#F8F9FA` | Fond clair, texte sur fond sombre |

## Typographie

- **Titres (Display)** : Helvetica-Bold, taille 32px–48px
- **Sous-titres** : Helvetica-Bold, taille 18px–24px
- **Corps** : Helvetica, taille 14px–16px
- **Code** : Courier, taille 12px–14px

## Composants Clés

### Boutons
- **Primaire** : Fond Emerald, texte White, radius 8px
- **Secondaire** : Fond Ink, texte White, radius 8px
- **Ghost** : Bord Smoke, texte Ink, radius 8px
- **Danger** : Fond Rose, texte White, radius 8px

### Badges
- **Actif** : Fond Emerald, texte White
- **Inactif** : Fond Mist, texte Ink
- **Archivé** : Fond Smoke, texte Mist
- **Marqué** : Fond Amber, texte Ink

### Barres de Progression (Confiance RAG)
- Gradient de Rose (faible) à Emerald (élevé)
- Hauteur : 4px, radius : 2px

## Interactions & Animations

- **Survol de boutons** : Légère augmentation d'opacité (10%), transition 150ms
- **Clic de boutons** : Réduction d'échelle (95%), transition 100ms
- **Apparition de modales** : Fade-in 200ms + slide-up 50px
- **Changement d'onglet** : Transition fluide 150ms
- **Édition de texte** : Curseur avec animation de pulsation légère

## Hiérarchie de l'Information

1. **Niveau 1** : Logo, titre principal, appels à l'action critiques
2. **Niveau 2** : Sous-titres, sections principales, boutons secondaires
3. **Niveau 3** : Texte de corps, détails, métadonnées
4. **Niveau 4** : Placeholders, texte désactivé, notes

## Accessibilité

- Tous les textes respectent un contraste minimum WCAG AA (4.5:1 pour le texte normal)
- Les icônes sont accompagnées de labels textuels
- Les formulaires incluent des labels explicites et des messages d'erreur clairs
- La navigation au clavier est entièrement fonctionnelle

## Responsive Design

- **Mobile** (< 640px) : Sidebar repliée en hamburger menu, éditeur en plein écran
- **Tablet** (640px–1024px) : Sidebar réduite, éditeur avec aperçu réduit
- **Desktop** (> 1024px) : Sidebar complète, éditeur avec aperçu côte à côte

## Prochaines Étapes

1. Développer les composants React réutilisables
2. Implémenter les écrans principaux
3. Ajouter les animations
