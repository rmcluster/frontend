import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { deleteConversation as deleteConversationRequest, listConversations } from '../lib/api';
import type { ChatMessage, Conversation } from '../types/ui';

function messagesEqual(a: ChatMessage, b: ChatMessage): boolean {
  return a.role === b.role && a.content === b.content && a.tokensPerSec === b.tokensPerSec;
}

type ConversationContextValue = {
  conversations: Conversation[];
  activeId: string | null;
  setActiveId: (id: string | null) => void;
  createConversation: (model: string) => Conversation;
  appendMessages: (id: string, messages: ChatMessage[]) => void;
  appendMessage: (id: string, message: ChatMessage) => void;
  updateLastMessage: (id: string, updater: (prev: string) => string, tokensPerSec?: number) => void;
  upsertAssistantMessage: (id: string, content: string, tokensPerSec?: number) => void;
  updateConversationModel: (id: string, model: string) => void;
  deleteConversation: (id: string) => void;
  renameConversation: (id: string, title: string) => void;
};

const ConversationContext = createContext<ConversationContextValue | null>(null);

export function ConversationProvider({ children }: { children: ReactNode }) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  const update = useCallback((updater: (prev: Conversation[]) => Conversation[]) => {
    setConversations((prev) => updater(prev));
  }, []);

  useEffect(() => {
    void listConversations().then(setConversations).catch(() => undefined);
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

  const appendMessages = useCallback((id: string, messages: ChatMessage[]) => {
    if (messages.length === 0) return;
    update((prev) =>
      prev.map((c) =>
        c.id === id
          ? {
              ...c,
              messages:
                c.messages.length >= messages.length &&
                c.messages
                  .slice(c.messages.length - messages.length)
                  .every((existing, index) => messagesEqual(existing, messages[index]))
                  ? c.messages
                  : [...c.messages, ...messages],
              title:
                c.title === 'New conversation' && messages[0]?.role === 'user'
                  ? messages[0].content.slice(0, 40)
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

  const upsertAssistantMessage = useCallback((id: string, content: string, tokensPerSec?: number) => {
    update((prev) =>
      prev.map((c) => {
        if (c.id !== id) return c;
        const msgs = [...c.messages];
        const last = msgs[msgs.length - 1];
        if (last?.role === 'assistant') {
          const updated: ChatMessage = { ...last, content };
          if (tokensPerSec !== undefined) updated.tokensPerSec = tokensPerSec;
          msgs[msgs.length - 1] = updated;
        } else {
          const next: ChatMessage = { role: 'assistant', content };
          if (tokensPerSec !== undefined) next.tokensPerSec = tokensPerSec;
          msgs.push(next);
        }
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
    void deleteConversationRequest(id).catch(() => undefined);
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
        appendMessages,
        appendMessage,
        updateLastMessage,
        upsertAssistantMessage,
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
