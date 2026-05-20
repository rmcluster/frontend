import { createContext, useCallback, useContext, useState } from 'react';
import type { ReactNode } from 'react';
import type { ChatMessage, Conversation } from '../types/ui';

const STORAGE_KEY = 'rmcluster_conversations';

function load(): Conversation[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

function save(convs: Conversation[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(convs));
}

type ConversationContextValue = {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createConversation: (model: string) => Conversation;
  appendMessage: (id: string, message: ChatMessage) => void;
  updateLastMessage: (id: string, updater: (prev: string) => string, tokensPerSec?: number) => void;
  updateConversationModel: (id: string, model: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>(load);
  const [activeId, setActiveId] = useState<string | null>(null);

  const update = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations((prev) => {
      const next = updater(prev);
      save(next);
      return next;
    });
  }, []);

  const createConversation = useCallback((model: string): Conversation => {
    const conv: Conversation = {
      id: crypto.randomUUID(),
      title: 'New conversation',
      model,
      messages: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    update((prev) => [conv, ...prev]);
    return conv;
  }, [update]);

  const appendMessage = useCallback((id: string, message: ChatMessage) => {
    update((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              messages: [...c.messages, message],
              title:
                c.title === 'New conversation' && message.role === 'user'
                  ? message.content.slice(0, 40)
                  : c.title,
              updated_at: new Date().toISOString(),
            }
          : c
      )
    );
  }, [update]);

  const updateLastMessage = useCallback((id: string, updater: (prev: string) => string, tokensPerSec?: number) => {
    update((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const msgs = [...c.messages];
        if (msgs.length === 0) return c;
        const last = msgs[msgs.length - 1];
        const updated: ChatMessage = { ...last, content: updater(last.content) };
        if (tokensPerSec !== undefined) updated.tokensPerSec = tokensPerSec;
        msgs[msgs.length - 1] = updated;
        return { ...c, messages: msgs, updated_at: new Date().toISOString() };
      })
    );
  }, [update]);

  const updateConversationModel = useCallback((id: string, model: string) => {
    update((prev) => prev.map((c) => c.id === id ? { ...c, model } : c));
  }, [update]);

  const deleteConversation = useCallback((id: string) => {
    update((prev) => prev.filter((c) => c.id !== id));
    setActiveId((prev) => (prev === id ? null : prev));
  }, [update]);

  const renameConversation = useCallback((id: string, title: string) => {
    update((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, [update]);

  return (
    <ConversationContext.Provider
      value={{
        conversations,
        activeId,
        setActiveId,
        createConversation,
        appendMessage,
        updateLastMessage,
        updateConversationModel,
        deleteConversation,
        renameConversation,
      }}
    >
      {children}
    </ConversationContext.Provider>
  );
}

export function useConversations(): ConversationContextValue {
  const ctx = useContext(ConversationContext);
  if (!ctx) throw new Error('useConversations must be used inside ConversationProvider');
  return ctx;
}
