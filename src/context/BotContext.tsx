import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getBots, createBot as createBotApi } from '@/services/api';

const BOT_STORAGE_KEY = 'indicbot_current_bot_id';

type Bot = { _id: string; name: string; slug: string };

type BotContextType = {
  bots: Bot[];
  currentBotId: string | null;
  currentBot: Bot | null;
  setCurrentBotId: (id: string | null) => void;
  refreshBots: () => Promise<void>;
  addBot: (name: string, slug?: string) => Promise<Bot>;
};

const BotContext = createContext<BotContextType | null>(null);

export function BotProvider({ children }: { children: React.ReactNode }) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [currentBotId, setCurrentBotIdState] = useState<string | null>(() =>
    typeof window !== 'undefined' ? localStorage.getItem(BOT_STORAGE_KEY) : null
  );

  const refreshBots = useCallback(async () => {
    try {
      const { bots: list } = await getBots();
      setBots(list || []);
      if (list?.length && !currentBotId) {
        const first = list[0]._id;
        setCurrentBotIdState(first);
        localStorage.setItem(BOT_STORAGE_KEY, first);
      }
      if (list?.length && currentBotId && !list.find((b) => b._id === currentBotId)) {
        setCurrentBotIdState(list[0]._id);
        localStorage.setItem(BOT_STORAGE_KEY, list[0]._id);
      }
    } catch {
      setBots([]);
    }
  }, [currentBotId]);

  useEffect(() => {
    refreshBots();
  }, []);

  const setCurrentBotId = useCallback((id: string | null) => {
    setCurrentBotIdState(id);
    if (typeof window !== 'undefined') {
      if (id) localStorage.setItem(BOT_STORAGE_KEY, id);
      else localStorage.removeItem(BOT_STORAGE_KEY);
    }
  }, []);

  const addBot = useCallback(async (name: string, slug?: string) => {
    const bot = await createBotApi({ name, slug });
    await refreshBots();
    setCurrentBotId(bot._id);
    return bot;
  }, [refreshBots, setCurrentBotId]);

  const currentBot = bots.find((b) => b._id === currentBotId) || bots[0] || null;

  return (
    <BotContext.Provider
      value={{
        bots,
        currentBotId: currentBotId || currentBot?._id || null,
        currentBot,
        setCurrentBotId,
        refreshBots,
        addBot
      }}
    >
      {children}
    </BotContext.Provider>
  );
}

export function useBot() {
  const ctx = useContext(BotContext);
  return ctx;
}
