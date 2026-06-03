import { WikiDocument, RAGResponse, User, WikiStats } from '@/types/wiki';

export const mockUser: User = {
  id: 'user-1',
  name: 'Alice Johnson',
  email: 'alice@lekki.com',
  role: 'editor',
  avatar: '👩‍💼',
};

export const mockDocuments: WikiDocument[] = [
  {
    id: 'doc-1',
    title: 'Documentation',
    content: '',
    parentId: null,
    createdAt: new Date('2024-01-15'),
    updatedAt: new Date('2024-06-01'),
    author: 'Alice Johnson',
    tags: [],
    access: { public: true, users: [], groups: [] },
    isFolder: true,
    children: [
      {
        id: 'doc-1-1',
        title: 'Getting Started',
        content: '# Getting Started\n\nWelcome to Lekki Wiki...',
        parentId: 'doc-1',
        createdAt: new Date('2024-01-20'),
        updatedAt: new Date('2024-05-28'),
        author: 'Alice Johnson',
        tags: ['tutorial', 'beginner'],
        access: { public: true, users: [], groups: [] },
        isFolder: false,
      },
      {
        id: 'doc-1-2',
        title: 'API Reference',
        content: '# API Reference\n\n## Endpoints\n\n### GET /api/documents...',
        parentId: 'doc-1',
        createdAt: new Date('2024-02-10'),
        updatedAt: new Date('2024-06-01'),
        author: 'Bob Smith',
        tags: ['api', 'technical'],
        access: { public: true, users: [], groups: [] },
        isFolder: false,
      },
    ],
  },
  {
    id: 'doc-2',
    title: 'Team Guidelines',
    content: '# Team Guidelines\n\n## Code of Conduct\n\n1. Respect...',
    parentId: null,
    createdAt: new Date('2024-03-01'),
    updatedAt: new Date('2024-05-15'),
    author: 'Charlie Brown',
    tags: ['guidelines', 'team'],
    access: { public: true, users: [], groups: [] },
    isFolder: false,
  },
  {
    id: 'doc-3',
    title: 'Projects',
    content: '',
    parentId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-06-02'),
    author: 'Alice Johnson',
    tags: [],
    access: { public: false, users: [{ userId: 'user-1', role: 'editor' }], groups: [] },
    isFolder: true,
    children: [
      {
        id: 'doc-3-1',
        title: 'Q2 Roadmap',
        content: '# Q2 Roadmap\n\n## Objectives\n\n- [ ] Feature A\n- [ ] Feature B',
        parentId: 'doc-3',
        createdAt: new Date('2024-04-01'),
        updatedAt: new Date('2024-06-02'),
        author: 'Alice Johnson',
        tags: ['roadmap', 'planning'],
        access: { public: false, users: [{ userId: 'user-1', role: 'editor' }], groups: [] },
        isFolder: false,
      },
    ],
  },
];

export const mockRAGResponse: RAGResponse = {
  query: 'How do I get started with Lekki Wiki?',
  answer:
    'To get started with Lekki Wiki, follow these steps: 1) Create a new document in the Documentation folder, 2) Write your content in Markdown format, 3) Set access permissions as needed, 4) Use the search feature to find related documents. For more details, refer to the Getting Started guide.',
  confidence: 92,
  sources: [
    {
      documentId: 'doc-1-1',
      title: 'Getting Started',
      excerpt: 'Welcome to Lekki Wiki. This guide will help you get started...',
      relevance: 98,
    },
    {
      documentId: 'doc-1',
      title: 'Documentation',
      excerpt: 'Our documentation covers all aspects of using Lekki Wiki...',
      relevance: 85,
    },
  ],
  generatedAt: new Date(),
};

export const mockStats: WikiStats = {
  totalDocuments: 24,
  totalFolders: 5,
  recentlyUpdated: mockDocuments.slice(0, 3),
  favorites: [mockDocuments[0], mockDocuments[1]],
  contributorsCount: 8,
};

export const mockUsers: User[] = [
  mockUser,
  {
    id: 'user-2',
    name: 'Bob Smith',
    email: 'bob@lekki.com',
    role: 'editor',
    avatar: '👨‍💻',
  },
  {
    id: 'user-3',
    name: 'Charlie Brown',
    email: 'charlie@lekki.com',
    role: 'admin',
    avatar: '👨‍⚕️',
  },
  {
    id: 'user-4',
    name: 'Diana Prince',
    email: 'diana@lekki.com',
    role: 'reader',
    avatar: '👩‍🔬',
  },
];
