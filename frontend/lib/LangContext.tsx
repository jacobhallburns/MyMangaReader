import { createContext, useContext } from 'react';

interface LangContextValue {
  lang: string;
  setLang: (lang: string) => void;
}

export const LangContext = createContext<LangContextValue>({
  lang: 'en',
  setLang: () => {},
});

export const useLang = () => useContext(LangContext);
