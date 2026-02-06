import type { Agent } from '@/lib/types';

// Agent definitions
export const AGENTS: Agent[] = [
  {
    id: 'strategist',
    name: '@strategist',
    displayName: 'Strategist',
    icon: '📊',
    color: '#3B82F6',
    description: 'Product Manager & Analista - Transforma problemas em planos',
    shortDescription: 'Planejamento & Produto',
  },
  {
    id: 'architect',
    name: '@architect',
    displayName: 'Architect',
    icon: '🏗️',
    color: '#8B5CF6',
    description: 'Solutions Architect - Design técnico e decisões',
    shortDescription: 'Design & Arquitetura',
  },
  {
    id: 'designer',
    name: '@designer',
    displayName: 'Designer',
    icon: '🎨',
    color: '#F472B6',
    description: 'UX/UI Designer - Design system e experiência visual',
    shortDescription: 'UX/UI & Visual',
  },
  {
    id: 'builder',
    name: '@builder',
    displayName: 'Builder',
    icon: '🔨',
    color: '#F59E0B',
    description: 'Senior Developer - Implementação de código',
    shortDescription: 'Implementação',
  },
  {
    id: 'guardian',
    name: '@guardian',
    displayName: 'Guardian',
    icon: '🛡️',
    color: '#10B981',
    description: 'QA Engineer - Qualidade e segurança',
    shortDescription: 'Qualidade & Testes',
  },
  {
    id: 'chronicler',
    name: '@chronicler',
    displayName: 'Chronicler',
    icon: '📝',
    color: '#EC4899',
    description: 'Technical Writer - Documentação',
    shortDescription: 'Documentação',
  },
];

export const getAgentById = (id: string): Agent | undefined => {
  return AGENTS.find(agent => agent.id === id);
};

export const getAgentByName = (name: string): Agent | undefined => {
  return AGENTS.find(agent => agent.name === name);
};
