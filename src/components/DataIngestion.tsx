/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { X, RefreshCw, AlertCircle, Database, UploadCloud } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { UploadZone } from './UploadZone';
import { ErpConnector } from './ErpConnector';
import { UploadedFiles, ErpConfig } from '../types';

interface DataIngestionProps {
  isModal?: boolean;
}

export function DataIngestion({ isModal = false }: DataIngestionProps) {
  const {
    uploadedFiles,
    setUploadedFiles,
    setDataLoaded,
    setActiveScreen,
    setUpdateModalOpen,
    erpConfigs,
    setErpConfigs,
    setPrData,
    setVendorProfiles,
    setMatchResults,
    setSummary,
  } = useApp();

  // Keep temporary states in memory so that modal dismissals don't commit changes unless approved
  const [localFiles, setLocalFiles] = useState<UploadedFiles>({
    purchaseRegister: null,
    vendorMaster: null,
    gstr2a2b: null,
    gstinFilingHistory: null,
  });

  const [localErp, setLocalErp] = useState<ErpConfig>({
    sap: null,
    oracle: null,
    msDynamics: null,
    tally: null,
  });

  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Load context state into local temporary arrays on mount or when context updates
  useEffect(() => {
    setLocalFiles({ ...uploadedFiles });
    setLocalErp({ ...erpConfigs });
  }, [uploadedFiles, erpConfigs, isModal]);

  // Handle specific file category updates locally
  const handleFileChange = (category: keyof UploadedFiles, file: any) => {
    setLocalFiles((prev) => ({
      ...prev,
      [category]: file,
    }));
  };

  // Handle ERP connection settings locally
  const handleErpChange = (erpId: keyof ErpConfig, host: string | null) => {
    setLocalErp((prev) => ({
      ...prev,
      [erpId]: host ? { status: 'Connected', host } : null,
    }));
  };

  // All 4 files are required
  const isFormValid = !!(
    localFiles.purchaseRegister &&
    localFiles.vendorMaster &&
    localFiles.gstr2a2b &&
    localFiles.gstinFilingHistory
  );

  // Bottom action: confirmation
  const handleConfirm = async () => {
    if (!isFormValid) return;

    setIsAnalyzing(true);
    setApiError(null);

    try {
      const httpResponse = await fetch("https://avalanche-wad-bundle.ngrok-free.dev/api/load-data", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({}),
      });

      if (!httpResponse.ok) {
        throw new Error(`Load data failed with status ${httpResponse.status}`);
      }

      const data = await httpResponse.json();

      const apiResponse = data;
      const response = data; // alias for exact logging requirement
      const cleanedPrData = (apiResponse.prData || []).map((inv: any) => ({
        ...inv,
        taxable_value: parseFloat(String(inv.taxable_value)) || 0,
        gst_amount: parseFloat(String(inv.gst_amount)) || 0,
        total_amount: parseFloat(String(inv.total_amount)) || 0,
        line_items_count: parseInt(String(inv.line_items_count)) || 0,
        gst_rate: parseFloat(String(inv.gst_rate)) || 0,
      }));

      // Store response fields directly in context as-is without any transformations or local renaming
      setPrData(cleanedPrData);
      setVendorProfiles(data.vendorProfiles || {});
      setMatchResults(data.matchResults || []);
      setSummary(data.summary || {
        totalInvoices: 0,
        fullyMatched: 0,
        aiMatched: 0,
        aiProbableMatch: 0,
        missing: 0
      });

      // Save back to global context state
      setUploadedFiles(localFiles);
      setErpConfigs(localErp);
      setDataLoaded(true);
      setActiveScreen('reconciliation');

      if (isModal) {
        setUpdateModalOpen(false);
      }
    } catch (err: any) {
      console.error("API error during load data:", err);
      setApiError(err?.message || "Connection to analysis engine failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Trigger quick demo fill to help the user test the interface quickly
  const handleLoadDemoData = () => {
    const timestamp = new Date().toLocaleTimeString();
    setLocalFiles({
      purchaseRegister: {
        name: 'purchase_register_Q2_2026.xlsx',
        size: 2451000,
        type: 'xlsx',
        uploadedAt: timestamp,
      },
      vendorMaster: {
        name: 'global_vendor_directory_v5.csv',
        size: 512000,
        type: 'csv',
        uploadedAt: timestamp,
      },
      gstr2a2b: {
        name: 'GSTR2A_2B_combined_declaration_may.json',
        size: 182000,
        type: 'json',
        uploadedAt: timestamp,
      },
      gstinFilingHistory: {
        name: 'GSTIN_filing_history_may.json',
        size: 194000,
        type: 'json',
        uploadedAt: timestamp,
      },
    });

    setLocalErp({
      sap: { status: 'Connected', host: 'https://sap.internal.iapx.host/api' },
      oracle: null,
      msDynamics: null,
      tally: null,
    });
  };

  const containerContent = (
    <div className="w-full max-w-5xl mx-auto bg-white rounded-3xl border border-sky-100 p-6 md:p-12 shadow-xl md:shadow-2xl relative my-3">
      {/* If it is an update modal, add a close button inside the main container */}
      {isModal && (
        <button
          onClick={() => setUpdateModalOpen(false)}
          className="absolute top-6 right-6 p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition duration-200"
          title="Dismiss updates"
          id="close-ingestion-modal"
        >
          <X size={24} />
        </button>
      )}

      {/* Header section */}
      <div className="flex flex-col items-center justify-center text-center mb-10">
        <img
          src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkJ0BvMUPR4gW4BLu3sD1VWmuglPKX_YHpog&s"
          alt="iAPX"
          style={{ height: '56px', objectFit: 'contain' }}
          className="mb-6 hover:scale-105 transition-transform duration-300"
        />
        <h2 className="text-3xl font-extrabold text-slate-800 tracking-tight">
          Load Your Data
        </h2>
        <p className="text-slate-500 mt-2 max-w-md text-sm md:text-base">
          Upload your files or connect your ERP to get started. Complete the required file ingestion below.
        </p>

        {/* Demo data shortcut */}
        <button
          type="button"
          onClick={handleLoadDemoData}
          className="mt-4 flex items-center gap-1.5 text-xs text-sky-500 font-semibold px-3 py-1.5 rounded-full border border-sky-100 bg-sky-50/50 hover:bg-sky-50 transition"
        >
          <RefreshCw size={12} />
          Auto-fill Premium Demo Data
        </button>
      </div>

      {/* Main Panels: Side-by-side with OR divider */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_80px_1fr] items-stretch gap-6 lg:gap-0">
        {/* Left Panel: File Uploads */}
        <div className="flex flex-col gap-5 p-2 lg:p-4 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 p-4">
          <div className="mb-1">
            <h3 className="text-lg font-bold text-sky-500 flex items-center gap-2">
              <UploadCloud size={20} />
              Upload Files
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">Please provide required accounting and tax registries.</p>
          </div>

          <div className="space-y-4">
            <UploadZone
              id="purchase-register"
              label="Purchase Register"
              accept=".csv, .xlsx"
              file={localFiles.purchaseRegister}
              onFileSelect={(file) => handleFileChange('purchaseRegister', file)}
              required
            />

            <UploadZone
              id="vendor-master"
              label="Vendor Master"
              accept=".csv, .xlsx"
              file={localFiles.vendorMaster}
              onFileSelect={(file) => handleFileChange('vendorMaster', file)}
              required
            />

            <UploadZone
              id="gstr2a"
              label="GSTR-2A/2B Combined Ledger"
              accept=".json, .xlsx"
              file={localFiles.gstr2a2b}
              onFileSelect={(file) => handleFileChange('gstr2a2b', file)}
              required
            />

            <UploadZone
              id="gstr2b"
              label="GSTIN Filing History"
              accept=".json, .xlsx"
              file={localFiles.gstinFilingHistory}
              onFileSelect={(file) => handleFileChange('gstinFilingHistory', file)}
              required
            />
          </div>
        </div>

        {/* Divider: OR */}
        <div className="flex lg:flex-col items-center justify-center gap-4 lg:py-6">
          <div className="h-[1px] w-full lg:w-[1px] bg-slate-100 flex-1" />
          <span className="text-xs font-bold font-mono tracking-widest text-slate-400 bg-slate-50 px-3 py-1.5 rounded-full border border-slate-100 uppercase">
            Or
          </span>
          <div className="h-[1px] w-full lg:w-[1px] bg-slate-100 flex-1" />
        </div>

        {/* Right Panel: ERP Connectors */}
        <div className="flex flex-col gap-5 p-2 lg:p-4 justify-between">
          <div>
            <div className="mb-2">
              <h3 className="text-lg font-bold text-sky-500 flex items-center gap-2">
                <Database size={20} />
                Connect ERP
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Sync database directly with accounting software.</p>
            </div>

            <div className="space-y-3.5 mt-4">
              <ErpConnector
                id="sap"
                name="SAP Business Suite"
                status={localErp.sap ? 'Connected' : 'Not Configured'}
                configuredHost={localErp.sap?.host}
                onConfigure={(host) => handleErpChange('sap', host)}
              />

              <ErpConnector
                id="oracle"
                name="Oracle ERP Cloud"
                status={localErp.oracle ? 'Connected' : 'Not Configured'}
                configuredHost={localErp.oracle?.host}
                onConfigure={(host) => handleErpChange('oracle', host)}
              />

              <ErpConnector
                id="msDynamics"
                name="Microsoft Dynamics 365"
                status={localErp.msDynamics ? 'Connected' : 'Not Configured'}
                configuredHost={localErp.msDynamics?.host}
                onConfigure={(host) => handleErpChange('msDynamics', host)}
              />

              <ErpConnector
                id="tally"
                name="Tally Prime ERP"
                status={localErp.tally ? 'Connected' : 'Not Configured'}
                configuredHost={localErp.tally?.host}
                onConfigure={(host) => handleErpChange('tally', host)}
              />
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-sky-100 flex items-start gap-2.5 mt-5">
            <AlertCircle className="text-sky-500 shrink-0 mt-0.5" size={16} />
            <div className="text-left">
              <p className="text-[11px] font-semibold text-slate-700">ERP Sync Pre-requisite</p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                ERP integrations extract real-time vendor master ledger journals. For safety audits, manual files uploads take priority during reconciling.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Required Files Validation Warning Section */}
      {!isFormValid && (
        <div className="mt-8 p-3 rounded-2xl bg-amber-50 border border-amber-200 flex items-center gap-3 justify-center text-amber-700 text-xs font-medium animate-pulse">
          <AlertCircle size={16} />
          <span>Upload <strong>all 4 files</strong> (Purchase Register, Vendor Master, GSTR-2A/2B Combined, and GSTIN Filing History) to enable system matching.</span>
        </div>
      )}

      {apiError && (
        <div className="mt-6 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs text-left max-w-md mx-auto">
          <p className="font-bold flex items-center gap-1.5 justify-center">
            <AlertCircle size={14} className="stroke-[2]" />
            Unable to connect to dynamic backend:
          </p>
          <p className="mt-1 text-center font-mono opacity-90">{apiError}</p>
          <p className="mt-2 text-[10px] text-center text-slate-500 font-sans">
            Make sure the backend is active and click again to retry.
          </p>
        </div>
      )}

      {/* Bottom Button */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex justify-center">
        <button
          onClick={handleConfirm}
          disabled={!isFormValid}
          id="confirm-ingestion-files"
          className={`px-10 py-4.5 rounded-2xl font-bold uppercase text-sm tracking-wide transition-all duration-300 shadow-md ${
            isFormValid
              ? 'bg-sky-500 hover:bg-sky-600 text-white cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0'
              : 'bg-slate-100 border border-slate-200 text-slate-400 cursor-not-allowed shadow-none'
          }`}
        >
          {isModal ? 'Update & Reload' : 'Load Data & Enter App'}
        </button>
      </div>
    </div>
  );

  if (isAnalyzing) {
    const loadingScreen = (
      <div className="w-full max-w-lg mx-auto bg-white rounded-3xl border border-sky-100 p-8 text-center shadow-2xl flex flex-col items-center justify-center animate-fadeIn">
        <div className="relative mb-6">
          <div className="w-16 h-16 rounded-full border-4 border-sky-100 border-t-sky-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="w-3.5 h-3.5 bg-sky-500 rounded-full animate-ping" />
          </div>
        </div>
        <h3 className="text-xl font-extrabold text-slate-800 tracking-tight animate-pulse">
          AI Agents are analyzing your data...
        </h3>
        <p className="text-sm text-slate-500 mt-2 max-w-sm">
          Securing connections, fetching GSTR indices, and running AI reconciliation matching algorithms.
        </p>
      </div>
    );

    if (isModal) {
      return (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center animate-fadeIn"
          id="modal-backdrop-overlay"
        >
          {loadingScreen}
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        {loadingScreen}
      </div>
    );
  }

  // Return formatted structure depending on modal context
  if (isModal) {
    return (
      <div 
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-4 md:p-8 flex items-center justify-center animate-fadeIn"
        id="modal-backdrop-overlay"
      >
        <div className="w-full max-w-5xl my-auto">
          {containerContent}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/50 flex flex-col justify-center px-4 py-8 md:p-12 font-sans">
      {containerContent}
    </div>
  );
}

export default DataIngestion;
