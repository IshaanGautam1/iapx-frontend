/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MockFile {
  name: string;
  size: number;
  type: string;
  uploadedAt: string;
}

export interface UploadedFiles {
  purchaseRegister: MockFile | null;
  vendorMaster: MockFile | null;
  gstr2a2b: MockFile | null;
  gstinFilingHistory: MockFile | null;
}

export interface ErpConfig {
  sap: { status: 'Connected' | 'Not Configured'; host?: string } | null;
  oracle: { status: 'Connected' | 'Not Configured'; host?: string } | null;
  msDynamics: { status: 'Connected' | 'Not Configured'; host?: string } | null;
  tally: { status: 'Connected' | 'Not Configured'; host?: string } | null;
}

export interface InvoiceDetails {
  pr_invoice_no: string;
  invoice_date: string;
  vendor_name: string;
  gstin: string;
  taxable_value: number;
  gst_rate: number;
  gst_amount: number;
  total_amount: number;
  hsn_code: string;
  po_number: string;
  match_status: 'Matched' | 'Missing' | 'AI Probable Match' | 'Data Error';
  filed_2a: boolean;
  filed_2b: boolean;
  suggested_action?: string;
  confidence_score?: number;
  line_items_count: number;
  filing_frequency: 'Monthly' | 'Quarterly';
  ap_status?: 'Pending' | 'Approved' | 'Rejected';
  filing_history_6m?: boolean[];
}

export type ScreenType = 'reconciliation' | 'cfoDashboard' | 'apApproval';

export interface AppContextType {
  dataLoaded: boolean;
  loading: boolean;
  error: string | null;
  prData: any[];
  vendorProfiles: Record<string, any>;
  matchResults: any[];
  summary: {
    totalInvoices: number;
    fullyMatched: number;
    aiMatched: number;
    aiProbableMatch: number;
    missing: number;
  };
  uploadedFiles: UploadedFiles;
  erpConfigs: ErpConfig;
  activeScreen: ScreenType;
  updateModalOpen: boolean;
  setUploadedFiles: (files: UploadedFiles | ((prev: UploadedFiles) => UploadedFiles)) => void;
  setDataLoaded: (loaded: boolean) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setPrData: (data: any[]) => void;
  setVendorProfiles: (profiles: Record<string, any>) => void;
  setMatchResults: (results: any[]) => void;
  setSummary: (summary: any) => void;
  setActiveScreen: (screen: ScreenType) => void;
  setUpdateModalOpen: (open: boolean) => void;
  setErpConfigs: (configs: ErpConfig | ((prev: ErpConfig) => ErpConfig)) => void;
}
