# Design System - DevFlow Desktop

> Sistema de design para garantir consistência visual e experiência de usuário coesa.

---

## 1. Princípios de Design

### Filosofia
- **Foco no Desenvolvedor**: Interface que não atrapalha o fluxo de trabalho
- **Clareza**: Informação hierarquizada e facilmente escaneável
- **Feedback Visual**: Toda ação tem resposta clara
- **Dark-first**: Otimizado para longas sessões de código

### Personalidade
- **Tom**: Profissional e eficiente
- **Vibe**: Moderno, técnico, confiável
- **Sensação**: Produtividade silenciosa

---

## 2. Paleta de Cores

### Cores Base (Dark Theme)
```css
:root {
  /* Backgrounds - Escala de profundidade */
  --bg-deepest: #0a0a0f;      /* Background principal */
  --bg-base: #12121a;          /* Cards, modais */
  --bg-elevated: #1a1a24;      /* Cards destacados, stat cards */
  --bg-surface: #22222e;       /* Elementos interativos em hover */

  /* Foreground - Texto */
  --text-primary: #ffffff;     /* Títulos, texto importante */
  --text-secondary: #d1d5db;   /* Texto de corpo (gray-300) */
  --text-muted: #9ca3af;       /* Labels, hints (gray-400) */
  --text-dimmed: #6b7280;      /* Texto desabilitado (gray-500) */

  /* Borders */
  --border-subtle: rgba(255, 255, 255, 0.05);
  --border-default: rgba(255, 255, 255, 0.10);
  --border-emphasis: rgba(255, 255, 255, 0.20);
}
```

### Cores Semânticas (Agentes)
```css
:root {
  /* Purple - Primary / Brand */
  --color-primary: #a855f7;           /* purple-500 */
  --color-primary-light: #c084fc;     /* purple-400 */
  --color-primary-dark: #9333ea;      /* purple-600 */
  --color-primary-bg: rgba(168, 85, 247, 0.1);
  --color-primary-bg-hover: rgba(168, 85, 247, 0.2);

  /* Blue - Information / Strategist */
  --color-info: #3b82f6;              /* blue-500 */
  --color-info-light: #60a5fa;        /* blue-400 */
  --color-info-bg: rgba(59, 130, 246, 0.1);

  /* Green - Success / Guardian */
  --color-success: #22c55e;           /* green-500 */
  --color-success-light: #4ade80;     /* green-400 */
  --color-success-bg: rgba(34, 197, 94, 0.1);

  /* Amber - Warning / Builder */
  --color-warning: #f59e0b;           /* amber-500 */
  --color-warning-light: #fbbf24;     /* amber-400 */
  --color-warning-bg: rgba(245, 158, 11, 0.1);

  /* Red - Error / Danger */
  --color-error: #ef4444;             /* red-500 */
  --color-error-light: #f87171;       /* red-400 */
  --color-error-bg: rgba(239, 68, 68, 0.1);

  /* Rose - Designer */
  --color-rose: #f43f5e;              /* rose-500 */
  --color-rose-light: #fb7185;        /* rose-400 */
  --color-rose-bg: rgba(244, 63, 94, 0.1);

  /* Pink - Chronicler */
  --color-pink: #ec4899;              /* pink-500 */
  --color-pink-light: #f472b6;        /* pink-400 */
  --color-pink-bg: rgba(236, 72, 153, 0.1);
}
```

### Mapeamento de Agentes para Cores
| Agente | Cor Principal | Uso |
|--------|--------------|-----|
| Strategist | Blue-400 | Planejamento, análise |
| Architect | Purple-400 | Design técnico |
| Designer | Rose-400 | UX/UI |
| Builder | Amber-400 | Implementação |
| Guardian | Green-400 | Validação, segurança |
| Chronicler | Pink-400 | Documentação |

---

## 3. Tipografia

### Font Stack
```css
:root {
  --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', 'Menlo', monospace;
}
```

### Escala Tipográfica
| Token | Tamanho | Peso | Line Height | Uso |
|-------|---------|------|-------------|-----|
| `text-xs` | 10px | 500 | 1.4 | Badges, timestamps, labels pequenos |
| `text-sm` | 12px | 400 | 1.5 | Texto secundário, descrições |
| `text-base` | 14px | 400 | 1.5 | Texto de corpo padrão |
| `text-lg` | 16px | 500 | 1.4 | Subtítulos de seção |
| `text-xl` | 20px | 600 | 1.3 | Títulos de página |
| `text-2xl` | 24px | 700 | 1.2 | Números grandes, destaque |
| `text-3xl` | 30px | 700 | 1.2 | Hero numbers |

### Aplicação
```
Título de página:     text-xl font-semibold text-white
Título de seção:      text-lg font-medium text-white
Título de card:       text-sm font-medium text-white
Texto de corpo:       text-sm text-gray-300
Texto secundário:     text-xs text-gray-500
Labels:               text-[10px] font-medium uppercase tracking-wide text-gray-400
```

---

## 4. Espaçamento

### Sistema Base (4px)
```css
:root {
  --space-0: 0;
  --space-1: 4px;    /* 0.25rem - gaps mínimos */
  --space-2: 8px;    /* 0.5rem - padding inline */
  --space-3: 12px;   /* 0.75rem - padding elementos pequenos */
  --space-4: 16px;   /* 1rem - padding padrão */
  --space-5: 20px;   /* 1.25rem */
  --space-6: 24px;   /* 1.5rem - padding cards */
  --space-8: 32px;   /* 2rem - margin entre seções */
  --space-10: 40px;  /* 2.5rem */
  --space-12: 48px;  /* 3rem - margin grandes */
}
```

### Aplicação
| Contexto | Valor |
|----------|-------|
| Gap entre ícone e texto | space-2 (8px) |
| Padding de botões | px-3 py-1.5 (12px / 6px) |
| Padding de cards | space-4 (16px) |
| Gap entre cards | space-4 (16px) |
| Margin entre seções | space-6 (24px) |
| Padding de página | space-6 (24px) |

---

## 5. Bordas & Sombras

### Border Radius
```css
:root {
  --radius-sm: 4px;    /* Inputs pequenos, badges */
  --radius-md: 8px;    /* Botões, cards, inputs */
  --radius-lg: 12px;   /* Modais, cards grandes */
  --radius-xl: 16px;   /* Elementos destacados */
  --radius-full: 9999px; /* Pills, avatars */
}
```

### Sombras
```css
:root {
  /* Sombras sutis para dark mode */
  --shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.4);
  --shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.5);
  --shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.5);

  /* Glow effects para primary */
  --shadow-primary: 0 4px 14px rgba(168, 85, 247, 0.3);
  --shadow-primary-lg: 0 8px 25px rgba(168, 85, 247, 0.4);
}
```

### Aplicação
| Elemento | Radius | Shadow |
|----------|--------|--------|
| Botão | md (8px) | sm (hover: md + primary) |
| Card | lg (12px) | nenhum (usa border) |
| Modal | xl (16px) | xl |
| Badge | full | nenhum |
| Input | md (8px) | nenhum |
| Avatar | full | nenhum |

---

## 6. Componentes

### Button
```
Variantes:
- primary: bg-purple-600 hover:bg-purple-700 text-white shadow-lg shadow-purple-500/20
- secondary: bg-white/10 hover:bg-white/20 text-gray-200
- ghost: hover:bg-white/10 text-gray-300
- danger: bg-red-600 hover:bg-red-700 text-white

Tamanhos:
- sm: text-xs px-2 py-1
- md: text-sm px-3 py-1.5
- lg: text-base px-4 py-2
- icon: p-1.5

Estados:
- disabled: opacity-50 cursor-not-allowed
- loading: spinner animado
- focus: ring-2 ring-purple-500/50
```

### Badge
```
Variantes:
- default: bg-white/10 text-gray-300
- success: bg-green-500/20 text-green-400
- warning: bg-yellow-500/20 text-yellow-400
- error: bg-red-500/20 text-red-400
- info: bg-blue-500/20 text-blue-400
- purple: bg-purple-500/20 text-purple-400

Tamanhos:
- sm: text-[10px] px-1.5 py-0.5
- md: text-xs px-2 py-1
```

### Card
```
Estrutura base:
- Background: bg-[#1a1a24] ou bg-[#12121a]
- Border: border border-white/10
- Radius: rounded-lg (8px) ou rounded-xl (12px)
- Padding: p-4 (padrão) ou p-6 (grande)

Variações:
- Hover: hover:bg-white/5 hover:border-white/20
- Active: border-purple-500/30 bg-purple-500/5
- Selected: ring-2 ring-purple-500/50
```

### Input
```
Base:
- bg-white/5 border border-white/10 rounded-lg
- px-3 py-2 text-sm text-white
- placeholder-gray-500

Estados:
- focus: border-purple-500 ring-1 ring-purple-500/50
- error: border-red-500
- disabled: opacity-50 cursor-not-allowed
```

---

## 7. Animações

### Timing
```css
:root {
  --duration-fast: 150ms;     /* Hover, micro-interações */
  --duration-normal: 200ms;   /* Transições padrão */
  --duration-slow: 300ms;     /* Entrada de elementos */
  --duration-slower: 500ms;   /* Transições de página */

  --ease-out: cubic-bezier(0, 0, 0.2, 1);
  --ease-in-out: cubic-bezier(0.4, 0, 0.2, 1);
  --ease-bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55);
}
```

### Keyframes Existentes
```css
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slide-up {
  from {
    transform: translateY(10px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

### Micro-interações Recomendadas
| Elemento | Trigger | Animação | Duração |
|----------|---------|----------|---------|
| Button | hover | scale(1.02), brightness | 150ms |
| Button | click | scale(0.98) | 100ms |
| Card | hover | translateY(-2px), border-color | 200ms |
| Modal | open | fade-in + scale(0.95→1) | 200ms |
| Toast | enter | slide-up | 300ms |
| Dropdown | open | fade-in + translateY(-4px→0) | 200ms |

---

## 8. Sugestões de Melhorias

### Alta Prioridade

#### 1. Adicionar Gradientes Sutis nos Headers
**Problema**: Headers muito flat, sem distinção visual
**Solução**:
```css
.card-header-gradient {
  background: linear-gradient(
    135deg,
    rgba(168, 85, 247, 0.1) 0%,
    rgba(59, 130, 246, 0.05) 100%
  );
}
```

#### 2. Melhorar Feedback de Hover nos Cards
**Problema**: Hover states pouco perceptíveis
**Solução**:
```css
.card-interactive {
  transition: all 200ms ease-out;
}
.card-interactive:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
}
```

#### 3. Adicionar Skeletons para Loading States
**Problema**: Loading spinner genérico, sem contexto
**Solução**: Criar skeleton components que espelham o layout real

#### 4. Melhorar Contraste do Chat Output
**Problema**: Mensagens de agent vs user podem ser confusas
**Solução**: Usar cores mais distintas e adicionar indicador visual de "quem está falando"

### Média Prioridade

#### 5. Implementar Toast Notifications
**Onde usar**: Feedback de ações (commit, save, erro)
**Specs**:
- Posição: top-right
- Auto-dismiss: 5s
- Variantes: success, error, warning, info

#### 6. Adicionar Progress Indicators Mais Visuais
**Problema**: Progress bar simples no Dashboard
**Solução**: Ring progress ou animated bar com gradiente

#### 7. Melhorar a Hierarquia Visual das Stats
**Problema**: Todos os stat cards parecem iguais
**Solução**: Destacar métricas importantes com tamanho maior ou cor diferente

### Baixa Prioridade

#### 8. Implementar Dark Mode Toggle (futuro)
Preparar sistema para suportar light mode opcional

#### 9. Adicionar Ícones Animados para Agentes
Micro-animação no ícone do agente ativo

#### 10. Melhorar Scrollbars Customizadas
Tornar mais visíveis durante scroll ativo

---

## 9. Tokens para Tailwind

### tailwind.config.ts Extensões Sugeridas
```typescript
// Adicionar ao theme.extend
colors: {
  // Backgrounds semânticos
  'bg-deepest': '#0a0a0f',
  'bg-base': '#12121a',
  'bg-elevated': '#1a1a24',
  'bg-surface': '#22222e',
},
animation: {
  'slide-up': 'slide-up 0.2s ease-out',
  'scale-in': 'scale-in 0.2s ease-out',
  'bounce-in': 'bounce-in 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
},
keyframes: {
  'scale-in': {
    from: { opacity: '0', transform: 'scale(0.95)' },
    to: { opacity: '1', transform: 'scale(1)' },
  },
  'bounce-in': {
    '0%': { opacity: '0', transform: 'scale(0.3)' },
    '50%': { transform: 'scale(1.05)' },
    '70%': { transform: 'scale(0.9)' },
    '100%': { opacity: '1', transform: 'scale(1)' },
  },
},
```

---

## 10. Checklist de Implementação

- [x] Criar variáveis CSS globais para cores semânticas
- [x] Adicionar utilities CSS para gradientes e animações (globals.css)
- [x] Melhorar ChatOutput com avatars maiores e cores mais distintas
- [x] Adicionar gradientes nos headers de modal
- [x] Implementar skeleton components com shimmer effect
- [x] Melhorar feedback de hover nos cards (TaskCard, RequirementCard, DecisionCard, StatCard)
- [x] Melhorar ProgressCard com barra animada e estados visuais
- [x] Adicionar classe .card-interactive para efeitos de hover consistentes
- [ ] Criar Toast notification system (média prioridade)
- [ ] Documentar patterns de uso para novos componentes

---

## 11. Classes CSS Utilitárias Adicionadas

### Gradientes para Headers
```css
.gradient-header-purple  /* Para modais e headers principais */
.gradient-header-blue    /* Para seções informativas */
.gradient-header-green   /* Para seções de sucesso */
.gradient-header-amber   /* Para seções de alerta */
```

### Animações
```css
.animate-fade-in      /* Fade in suave */
.animate-slide-up     /* Slide de baixo para cima */
.animate-scale-in     /* Scale com fade */
.animate-shimmer      /* Efeito shimmer para loading */
.animate-pulse-glow   /* Glow pulsante para destaque */
```

### Cards Interativos
```css
.card-interactive     /* Hover: translateY(-2px), shadow, border */
```

### Skeleton
```css
.skeleton-shimmer     /* Skeleton com efeito shimmer automático */
```

### Chat Bubbles
```css
.chat-bubble-agent    /* Gradiente roxo para mensagens do agente */
.chat-bubble-user     /* Gradiente azul para mensagens do usuário */
```

---

**Última atualização**: Implementação das melhorias de alta prioridade
**Versão**: 1.1.0
