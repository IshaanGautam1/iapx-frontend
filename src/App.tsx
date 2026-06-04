/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/Navbar';
import { DataIngestion } from './components/DataIngestion';
import { ReconciliationScreen } from './components/ReconciliationScreen';
import { CfoDashboardScreen } from './components/CfoDashboardScreen';
import { ApApprovalScreen } from './components/ApApprovalScreen';
import { ErrorBoundary } from './components/ErrorBoundary';

function AppContent() {
  const { dataLoaded, activeScreen, updateModalOpen } = useApp();

  // State 1 — DATA NOT LOADED: Show full page Data Ingestion screen, hide nav
  if (!dataLoaded) {
    return <DataIngestion isModal={false} />;
  }

  // State 2 — DATA LOADED: Show navigation bar and the selected active app view
  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col font-sans transition-colors duration-300">
      <Navbar />

      <main className="flex-1 w-full">
        {activeScreen === 'reconciliation' ? (
          <ReconciliationScreen />
        ) : activeScreen === 'cfoDashboard' ? (
          <CfoDashboardScreen />
        ) : (
          <ApApprovalScreen />
        )}
      </main>

      {/* Screen 2: Data Ingestion overlay as update modal when open */}
      {updateModalOpen && <DataIngestion isModal={true} />}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AppContent />
      </AppProvider>
    </ErrorBoundary>
  );
}

