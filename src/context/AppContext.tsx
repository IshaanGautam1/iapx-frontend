/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppContextType, UploadedFiles, ErpConfig, ScreenType } from '../types';

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [dataLoaded, setDataLoaded] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [prData, setPrData] = useState<any[]>([]);
  const [vendorProfiles, setVendorProfiles] = useState<Record<string, any>>({});
  const [matchResults, setMatchResults] = useState<any[]>([]);
  const [summary, setSummary] = useState<any>({
    totalInvoices: 0,
    fullyMatched: 0,
    aiMatched: 0,
    aiProbableMatch: 0,
    missing: 0,
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({
    purchaseRegister: null,
    vendorMaster: null,
    gstr2a2b: null,
    gstinFilingHistory: null,
  });

  const [erpConfigs, setErpConfigs] = useState<ErpConfig>({
    sap: null,
    oracle: null,
    msDynamics: null,
    tally: null,
  });

  const [activeScreen, setActiveScreen] = useState<ScreenType>('reconciliation');
  const [updateModalOpen, setUpdateModalOpen] = useState<boolean>(false);

  return (
    <AppContext.Provider
      value={{
        dataLoaded,
        loading,
        error,
        prData,
        vendorProfiles,
        matchResults,
        summary,
        uploadedFiles,
        erpConfigs,
        activeScreen,
        updateModalOpen,
        setDataLoaded,
        setLoading,
        setError,
        setPrData,
        setVendorProfiles,
        setMatchResults,
        setSummary,
        setUploadedFiles,
        setErpConfigs,
        setActiveScreen,
        setUpdateModalOpen,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}
