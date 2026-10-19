# Lekki API Specification

Version: `v1`
Base URL: `/api/v1`

FastAPI expose aussi la documentation interactive à `/docs` et `/redoc` lorsque le backend est lancé.

## Authentication

Les routes protégées utilisent :

```http
Authorization: Bearer <access_token>
```

### `POST /auth/login`

Connexion ou création de l'utilisateur de développement.

```json
{
  "username": "grinnel",
  "password": "optional"
}
```

Response: `TokenResponse`

### `POST /auth/register`

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "name": "Alice",
  "password": "secret",
  "role": "editor"
}
```

### `GET /auth/me`

Retourne l'utilisateur courant.

### `GET /users`
### `GET /users/{user_id}`

Liste ou détail d'un utilisateur.

## Workspaces

Un utilisateur peut appartenir à plusieurs workspaces. Le workspace fournit le périmètre d'accès aux données Drive et Wiki.

### `GET /workspaces`

Liste les workspaces accessibles par l'utilisateur courant.

### `POST /workspaces`

```json
{
  "name": "SUP'PTIC - 3A IR",
  "description": "Espace de cours",
  "icon": "school"
}
```

Le créateur devient automatiquement `owner`.

### `GET /workspaces/{workspace_id}`
### `GET /workspaces/{workspace_id}/members`
### `POST /workspaces/{workspace_id}/members`

```json
{
  "user_id": "u-123",
  "role": "member"
}
```

### `DELETE /workspaces/{workspace_id}/members/{user_id}`

## Drive

### `GET /drive/folders`

Query params : `scope`, `workspace_id`, `parent_id`.

### `POST /drive/folders`

```json
{
  "name": "Cours",
  "workspace_id": "ws-123",
  "parent_id": null
}
```

### `PUT /drive/folders/{folder_id}`
### `DELETE /drive/folders/{folder_id}`

### `GET /drive/files`

Query params : `scope`, `workspace_id`, `folder_id`, `search`.

Scopes supportés : `personal`, `shared_with_me`, `starred`, `trash`, `workspace`, `all`.

### `GET /drive/files/{file_id}`
### `POST /drive/files`

```json
{
  "name": "cours-ospf.pdf",
  "extension": "pdf",
  "content": "Texte indexable",
  "summary": "Résumé optionnel",
  "workspace_id": "ws-123",
  "folder_id": null,
  "tags": ["réseaux", "ospf"]
}
```

### `PUT /drive/files/{file_id}`
### `DELETE /drive/files/{file_id}?permanent=false`

`permanent=true` supprime définitivement le fichier.

## Wiki

### `GET /wiki/pages`

Query params : `workspace_id`, `category`, `topic`, `section`, `status`.

### `GET /wiki/pages/{page_id}`
### `POST /wiki/pages`

```json
{
  "title": "OSPF - Comprendre simplement",
  "content": "# OSPF\n\n...",
  "category": "cours",
  "topic": "Réseaux",
  "section": "Routage",
  "workspace_id": "ws-123",
  "related_document_ids": ["file-123"],
  "related_wiki_ids": []
}
```

### `PUT /wiki/pages/{page_id}`

Met à jour le contenu, l'organisation et les relations. Le champ `comment` décrit la modification historique.

### `POST /wiki/pages/{page_id}/status`

```json
{
  "status": "draft"
}
```

Statuts : `draft`, `community`, `verified`.

### `POST /wiki/pages/{page_id}/restore/{version}`

Restaure une version historique.

### `DELETE /wiki/pages/{page_id}`

## Search

### `GET /search`

Query params :

- `q` : texte recherché ;
- `workspace_id` : workspace à interroger.

Retourne les documents et pages Wiki accessibles avec leur provenance.

## AI / RAG

### `POST /ask`

Recherche dans le périmètre demandé, génère une réponse et retourne les sources citées.

```json
{
  "question": "Explique OSPF",
  "workspace_id": "ws-123",
  "chat_id": null
}
```

Response :

```json
{
  "message_id": "msg-123",
  "answer": "...",
  "sources": [
    {
      "id": "file-123",
      "title": "Cours OSPF",
      "type": "document",
      "detail": "Drive · PDF",
      "excerpt": "...",
      "score": 0.92
    }
  ],
  "contradiction": null,
  "confidence": 0.92,
  "provider": "Lekki AI"
}
```

## Conversations

Les conversations appartiennent à l'utilisateur et sont transversales aux workspaces. `workspace_id` est uniquement le contexte de la question.

### `GET /chats/history`

Retourne les messages de l'utilisateur courant dans l'ordre chronologique.

### `DELETE /chats/history`

Supprime l'historique de l'utilisateur courant.

## Health

### `GET /api/health`

```json
{
  "status": "ok",
  "app": "Lekki Wiki",
  "version": "1.0.0"
}
```

## Principes de contrat

- Les routes ne manipulent pas directement les détails internes des autres modules.
- `workspace_id` délimite l'accès aux connaissances Drive/Wiki.
- Les conversations restent liées à `user_id`, pas au workspace.
- Les réponses IA doivent retourner leurs sources et leur score de confiance.
- Les détails OpenAPI générés par FastAPI restent la source technique finale du schéma JSON.
