// AccessibilityContext.tsx

import React, { createContext, useContext, useEffect, useState } from "react";

type AccessibilitySettings = {
  highContrast: boolean;
  reducedMotion: boolean;
};

const defaultSettings: AccessibilitySettings = {
  highContrast: false,
  reducedMotion: false,
};

const AccessibilityContext = createContext<{
  settings: AccessibilitySettings;
  updateSetting: <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => void;
}>({
  settings: defaultSettings,
  updateSetting: () => {},
});

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<AccessibilitySettings>(() => {
    const saved = localStorage.getItem("accessibilitySettings");
    return saved ? JSON.parse(saved) : defaultSettings;
  });

  const updateSetting = <K extends keyof AccessibilitySettings>(key: K, value: AccessibilitySettings[K]) => {
    const updated = { ...settings, [key]: value };
    setSettings(updated);
    localStorage.setItem("accessibilitySettings", JSON.stringify(updated));
  };

  return (
    <AccessibilityContext.Provider value={{ settings, updateSetting }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => useContext(AccessibilityContext);
