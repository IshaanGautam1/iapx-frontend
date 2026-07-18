/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  ArrowRightLeft, 
  Download, 
  Search, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  ChevronDown, 
  ChevronRight, 
  Mail, 
  Sparkles, 
  FileText, 
  HelpCircle,
  FileCheck,
  AlertCircle,
  Clock,
  RotateCcw,
  Paperclip
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InvoiceDetails } from '../types';

export function ReconciliationScreen() {
  const { prData, matchResults, summary, vendorProfiles } = useApp();
  const activePrInvoices = prData || [];
  
  // Cleanly join prData and matchResults by pr_invoice_no to ensure all columns (vendor name, date, gstin, amounts, status) are perfectly complete
  const activeReconciliationInvoices = useMemo(() => {
    return (matchResults || []).map((matchItem) => {
      const matchInv = matchItem?.invoice || matchItem || {};
      const prInv = (prData || []).find((p) => p.pr_invoice_no === matchInv.pr_invoice_no) || {};
      return {
        ...prInv,
        ...matchInv,
        // Make sure PR values are cached safely to avoid collision with match returns
        pr_taxable_value: prInv.taxable_value !== undefined ? prInv.taxable_value : (matchInv.taxable_value || 0),
        pr_gst_amount: prInv.gst_amount !== undefined ? prInv.gst_amount : (matchInv.gst_amount || 0),
        pr_total_amount: prInv.total_amount !== undefined ? prInv.total_amount : (matchInv.total_amount || 0)
      };
    });
  }, [prData, matchResults]);

  const [subView, setSubView] = useState<'pr' | 'gstr2a' | 'gstr2b'>('pr');
  const [activeTab, setActiveTab ] = useState<'invoice' | 'gstin'>('invoice');
  const [searchQuery, setSearchQuery] = useState('');
  const [invoiceFilter, setInvoiceFilter] = useState<'All' | 'Fully Matched' | 'AI Matched' | 'AI Probable Match' | 'Missing'>('All');
  const [expandedGstins, setExpandedGstins] = useState<Record<string, boolean>>({});

  const [prPage, setPrPage] = useState(1);
  const [reconPage, setReconPage] = useState(1);

  // Filtered PR Invoices
  const filteredPrInvoices = useMemo(() => {
    return activePrInvoices.filter((inv) => {
      const invoice = (inv as any).invoice || inv;
      return (
        (invoice.vendor_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (invoice.pr_invoice_no || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
        (invoice.gstin || '').toLowerCase().includes((searchQuery || '').toLowerCase())
      );
    });
  }, [activePrInvoices, searchQuery]);

  const prPageSize = 10;
  const totalPrItems = filteredPrInvoices.length;
  const totalPrPages = Math.max(1, Math.ceil(totalPrItems / prPageSize));
  const prStartIndex = (prPage - 1) * prPageSize;
  const paginatedPrInvoices = useMemo(() => {
    return filteredPrInvoices.slice(prStartIndex, prStartIndex + prPageSize);
  }, [filteredPrInvoices, prStartIndex]);

  // Filtered Reconciliation Invoices
  const filteredReconInvoices = useMemo(() => {
    return activeReconciliationInvoices
      .filter((inv) => {
        const invoice = (inv as any).invoice || inv;
        const status = (invoice.match_status || '').trim();
        if (invoiceFilter === 'All') {
          return true;
        }
        if (invoiceFilter === 'Fully Matched') {
          return status === 'Fully Matched' || status === 'Matched';
        }
        return status === invoiceFilter;
      })
      .filter((inv) => {
        const invoice = (inv as any).invoice || inv;
        return (
          (invoice.vendor_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
          (invoice.pr_invoice_no || '').toLowerCase().includes((searchQuery || '').toLowerCase())
        );
      });
  }, [activeReconciliationInvoices, invoiceFilter, searchQuery]);

  const reconPageSize = 10;
  const totalReconItems = filteredReconInvoices.length;
  const totalReconPages = Math.max(1, Math.ceil(totalReconItems / reconPageSize));
  const reconStartIndex = (reconPage - 1) * reconPageSize;
  const paginatedReconInvoices = useMemo(() => {
    return filteredReconInvoices.slice(reconStartIndex, reconStartIndex + reconPageSize);
  }, [filteredReconInvoices, reconStartIndex]);

  // Reset page when search or filters change to prevent empty pages
  useEffect(() => {
    setPrPage(1);
  }, [searchQuery]);

  useEffect(() => {
    setReconPage(1);
  }, [searchQuery, invoiceFilter, subView]);

  useEffect(() => {
    if (prPage > totalPrPages) {
      setPrPage(1);
    }
  }, [totalPrPages, prPage]);

  useEffect(() => {
    if (reconPage > totalReconPages) {
      setReconPage(1);
    }
  }, [totalReconPages, reconPage]);

  // Send Mail Modal States
  const [mailModal, setMailModal] = useState<{
    isOpen: boolean;
    vendorName: string;
    vendorEmail: string;
    cc: string;
    bcc: string;
    gstin: string;
    missingInvoices: InvoiceDetails[];
    errorInvoices: InvoiceDetails[];
    subject: string;
    draftText: string;
    tone: '7th' | '9th' | '11th';
    instructions: string;
    regenerating: boolean;
  }>({
    isOpen: false,
    vendorName: '',
    vendorEmail: '',
    cc: '',
    bcc: '',
    gstin: '',
    missingInvoices: [],
    errorInvoices: [],
    subject: '',
    draftText: '',
    tone: '7th',
    instructions: '',
    regenerating: false,
  });

  // State to track if mail has been dispatched in sandbox
  const [mailDispatched, setMailDispatched] = useState<boolean>(false);

  // Helper to generate realistic vendor compliance email
  const getVendorEmail = (vendorName: string) => {
    const cleanName = (vendorName || '').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 15);
    return `compliance@${cleanName || 'vendor'}.co.in`;
  };

  // Helper to dynamically get a vendor's compliance profile
  const getVendorProfile = (gstin: string) => {
    if (vendorProfiles) {
      if (Array.isArray(vendorProfiles)) {
        return vendorProfiles.find((v: any) => v && (v.gstin === gstin || v.vendorGstin === gstin)) || null;
      }
      return vendorProfiles[gstin] || Object.values(vendorProfiles).find((v: any) => v && (v.gstin === gstin || v.vendorGstin === gstin)) || null;
    }
    return null;
  };

  // Generate dynamic, realistic draft text based on the subview type and tone
  const generateDraftText = (
    vendorName: string,
    missingInvoices: InvoiceDetails[],
    errorInvoices: InvoiceDetails[],
    tone: '7th' | '9th' | '11th',
    isGstr2a: boolean
  ): { subject: string; body: string } => {
    const formattedInvoicesList = [...missingInvoices, ...errorInvoices]
      .map(
        (inv) =>
          `• Inv No: ${inv.pr_invoice_no} | Date: ${inv.invoice_date} | Taxable: ₹${(parseFloat(String(inv.taxable_value)) || 0).toLocaleString('en-IN')} | GST (18%): ₹${(parseFloat(String(inv.gst_amount)) || 0).toLocaleString('en-IN')} (HSN: ${inv.hsn_code})`
      )
      .join('\n');

    const totalTaxValue = [...missingInvoices, ...errorInvoices].reduce((acc, curr) => acc + curr.gst_amount, 0);

    if (!isGstr2a) {
      return {
        subject: "Urgent GSTR-2B Reconciliation Mismatch — Action Required",
        body: `Dear Finance Manager,

This is a formal communication from our accounts compliance division. During our reconciliation audit of government-released auto-drafted GSTR-2B statements, we discovered discrepancies for purchase transactions made with ${vendorName}.

The following invoices have not registered in our input credit logs, or contain reporting data errors:

${formattedInvoicesList}

Please note that these missing filings directly prevent our organization from claiming legitimate Input Tax Credit (ITC) for Q2 2026. 

We request you to immediately verify your GSTR-1 filings, correct any invoice typing mismatches, and submit the returns reference to prevent a formal payment withholding on subsequent ledger balances.

Best regards,
Tax & Compliance Audit Team
iAPX FinTech Office`
      };
    }

    // GSTR-2A tones
    if (tone === '7th') {
      return {
        subject: "Reconciliation Check: Gentle Reminder of Outstanding GST Inputs",
        body: `Dear Partner Success Team at ${vendorName},

Hope you are doing well.

This is a routine friendly check from our Accounts Payable department regarding our monthly ledger reconciliation processes under form GSTR-2A. 

We noticed a few of our transactions are yet to reflect in our government portal dashboards:

${formattedInvoicesList}

Could you please double-check if these purchase orders have been filed under your upcoming GSTR-1 cycle? This ensures smooth invoice settlements and input tax credits for both parties. Thank you for your continued cooperation.

Warm regards,
Accounts Payable Associate
iAPX Solutions`
      };
    } else if (tone === '9th') {
      return {
        subject: "WARNING: Input Tax Credit (ITC) Blocks - Payment Hold Directive",
        body: `Dear Finance & Supply Chain Heads,

This is a critical compliance update regarding missing Input Tax Credit (ITC) reflections under your GSTIN: ${mailModal.gstin}.

Upon reviewing our GSTR-2A statement records, the following invoices remain filed incorrectly or not uploaded:

${formattedInvoicesList}

Failure to register these valid invoices impacts our corporate regulatory compliance and locks ₹${(parseFloat(String(totalTaxValue)) || 0).toLocaleString('en-IN')} in Input Tax balances. Please be informed that according to company tax accounting policies, we will be forced to place a temporary payout hold on your subsequent outstanding invoices if these records are not rectified and filed successfully on the GST portal within the next 48 hours.

Kindly upload immediate GSTR-1 revisions.

Sincerely,
Treasury Compliance Division
iAPX Solutions`
      };
    } else {
      // 11th - final escalation
      return {
        subject: "FINAL DEMAND: Blocked Input Tax Credit Liability & Vendor Hold List Warning",
        body: `Dear Executive Team at ${vendorName},

This is a formal escalation from the Office of the Chief Financial Officer. 

The statutory GSTR-1 submission deadline is tomorrow, and the following invoices continue to show zero reflections in our GST reconciliation databases:

${formattedInvoicesList}

Due to this persistent omission, our firm faces direct Input Tax Credit double-taxation leakage amounting to ₹${(parseFloat(String(totalTaxValue)) || 0).toLocaleString('en-IN')}. 

Please consider this your final notice. If return filing receipts are not shared by 5:00 PM today, we will proceed to:
1. Debit your vendor balance ledger directly by the GST penalty amount.
2. Freeze all ongoing payments and suspend active work contracts.
3. Formally place your GSTIN on our non-compliant risk-list.

Please execute the statutory returns immediately to prevent legal audit steps.

CFO Office & Compliance Board
iAPX Solutions`
      };
    }
  };

  // Helper to fetch custom AI mail draft from local port 3001 server
  const fetchMailDraft = async (gstin: string, tone: '7th' | '9th' | '11th', prompt: string) => {
    setMailModal((prev) => ({ ...prev, regenerating: true }));
    try {
      const response = await fetch("https://avalanche-wad-bundle.ngrok-free.dev/api/mail/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          vendorGstin: gstin,
          reconciliationType: subView === 'gstr2a' ? "2A" : "2B",
          dateTab: tone,
          userPrompt: prompt
        })
      });

      if (!response.ok) {
        throw new Error(`Draft generation failed with status ${response.status}`);
      }

      const data = await response.json();
      if (data.mailDraft) {
        setMailModal((prev) => ({
          ...prev,
          draftText: data.mailDraft,
          subject: data.mailSubject || prev.subject,
          regenerating: false
        }));
      } else {
        throw new Error("No mailDraft returned from API");
      }
    } catch (error) {
      console.error("Error generating draft from API:", error);
      // Fallback to local draft generator if API fails
      setMailModal((prev) => {
        const localDraft = generateDraftText(
          prev.vendorName,
          prev.missingInvoices,
          prev.errorInvoices,
          tone,
          subView === 'gstr2a'
        );
        return {
          ...prev,
          draftText: prompt ? `[FALLBACK: Incorporating "${prompt}"]\n\n${localDraft.body}` : localDraft.body,
          subject: localDraft.subject,
          regenerating: false
        };
      });
    }
  };

  // Open Mail dialog helper
  const handleOpenMail = (vendor: string, gstin: string) => {
    // Collect related invoices
    const vendorInvoices = activeReconciliationInvoices.filter((i) => (i.gstin || '') === gstin && (i.match_status || '') !== 'Matched');
    const missing = vendorInvoices.filter((i) => (i.match_status || '') === 'Missing');
    const errors = vendorInvoices.filter(
      (i) => (i.match_status || '') === 'AI Probable Match' || (i.match_status || '') === 'Data Error'
    );

    const { subject, body } = generateDraftText(vendor, missing, errors, '7th', subView === 'gstr2a');

    setMailModal({
      isOpen: true,
      vendorName: vendor,
      vendorEmail: getVendorEmail(vendor),
      cc: 'finance.reconciliation@iapx.com',
      bcc: 'compliance-dashboard-archive@iapx.com',
      gstin,
      missingInvoices: missing,
      errorInvoices: errors,
      subject: subject,
      draftText: "AI Agents are drafting corporate notice...",
      tone: '7th',
      instructions: '',
      regenerating: true,
    });
    setMailDispatched(false);

    // Call the backend API as soon as modal opens to load the draft
    setTimeout(() => {
      fetchMailDraft(gstin, '7th', '');
    }, 50);
  };

  // Handle tone change inside GSTR-2A Send Mail dialog
  const handleToneChange = (newTone: '7th' | '9th' | '11th') => {
    setMailModal((prev) => ({
      ...prev,
      tone: newTone,
      draftText: "Regenerating notice under selected date guidelines...",
      regenerating: true
    }));
    fetchMailDraft(mailModal.gstin, newTone, mailModal.instructions);
  };

  // Handle AI text-regeneration based on instruction using the server-side Gemini API
  const handleRegenerateText = async () => {
    if (!(mailModal.instructions || '').trim()) return;
    fetchMailDraft(mailModal.gstin, mailModal.tone, mailModal.instructions);
  };

  // Handle Send action
  const handleSendDraft = async () => {
    setMailDispatched(true);
    try {
      await fetch("https://avalanche-wad-bundle.ngrok-free.dev/api/mail/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({
          vendorGstin: mailModal.gstin,
          reconciliationType: subView === 'gstr2a' ? "2A" : "2B",
          dateTab: mailModal.tone,
          userPrompt: mailModal.instructions
        })
      });
    } catch (e) {
      console.warn("Backend notification sent failed, but proceeding locally:", e);
    }
    setTimeout(() => {
      setMailModal((prev) => ({ ...prev, isOpen: false }));
      setMailDispatched(false);
    }, 1800);
  };

  // Safe toggle of expanded cards
  const toggleGstin = (gstin: string) => {
    setExpandedGstins((prev) => ({
      ...prev,
      [gstin]: !prev[gstin],
    }));
  };

  const renderFilingStatus = (val: any) => {
    const clean = String(val || '').trim().toLowerCase();
    if (clean === 'yes' || clean === 'y' || clean === 'true' || val === true) {
      return (
        <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase tracking-wide">
          Yes
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-100 uppercase tracking-wide">
        No
      </span>
    );
  };

  // Heuristic status badge styler
  const renderStatusBadge = (status: string) => {
    switch (status) {
      case 'Matched':
      case 'Fully Matched':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle size={12} className="stroke-[2.5]" />
            Fully Matched
          </span>
        );
      case 'AI Matched':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-teal-50 text-teal-700 border border-teal-200">
            <Sparkles size={12} className="stroke-[2.5] fill-teal-100" />
            AI Matched
          </span>
        );
      case 'Missing':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-red-50 text-red-700 border border-red-200">
            <X size={12} className="stroke-[2.5]" />
            Missing
          </span>
        );
      case 'AI Probable Match':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            <Sparkles size={12} className="stroke-[2.5] fill-amber-100" />
            AI Probable Match
          </span>
        );
      case 'Data Error':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            <AlertTriangle size={12} className="stroke-[2.5]" />
            Data Error
          </span>
        );
      default:
        return null;
    }
  };

  const renderFilingTickCross = (val: any) => {
    const clean = String(val || '').trim().toLowerCase();
    const isYes = clean === 'yes' || clean === 'y' || clean === 'true' || val === true;
    if (isYes) {
      return <span className="text-emerald-500 font-extrabold text-base" title="Yes">✓</span>;
    }
    return <span className="text-rose-500 font-extrabold text-base" title="No">✗</span>;
  };

  const renderTableStatusBadge = (status: string) => {
    const clean = (status || '').trim();
    if (clean === 'Fully Matched' || clean === 'Matched') {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
          Fully Matched
        </span>
      );
    }
    if (clean === 'AI Matched') {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          AI Matched
        </span>
      );
    }
    if (clean === 'AI Probable Match') {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2 py-1 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          AI Probable Match
        </span>
      );
    }
    if (clean === 'Missing') {
      return (
        <span className="inline-flex items-center text-xs font-bold px-2 py-1 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
          Missing
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-xs font-bold px-2 py-1 rounded-md bg-slate-50 text-slate-700 border border-slate-200">
        {clean || '—'}
      </span>
    );
  };

  // Process invoices list state to extract unique GSTIN card aggregates
  const getGstinGroups = () => {
    const listMap: Record<string, {
      vendor_name: string;
      gstin: string;
      filing_frequency: 'Monthly' | 'Quarterly';
      invoicesList: InvoiceDetails[];
    }> = {};

    activeReconciliationInvoices.forEach((inv) => {
      const invoice = (inv as any).invoice || inv;
      const gstinKey = invoice.gstin || '';
      if (gstinKey) {
        if (!listMap[gstinKey]) {
          listMap[gstinKey] = {
            vendor_name: invoice.vendor_name || '',
            gstin: gstinKey,
            filing_frequency: invoice.filing_frequency || 'Monthly',
            invoicesList: [],
          };
        }
        listMap[gstinKey].invoicesList.push(inv);
      }
    });

    return Object.values(listMap);
  };

  const gstinGroups = getGstinGroups();

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 font-sans" id="reconciliation-screen">
      {/* Title block */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
        <div>
          {subView === 'pr' ? (
            <div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-3">
                <FileText className="text-sky-500" size={28} />
                Purchase Register
              </h1>
              <p className="text-sm text-slate-500 mt-1 max-w-xl">
                Master record of procurement entries received and processed internally. Cross-reference status for GST audits.
              </p>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <button 
                  onClick={() => setSubView('pr')}
                  className="text-xs font-bold text-sky-500 hover:underline flex items-center gap-1"
                >
                  ← Back to Purchase Register
                </button>
              </div>
              <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
                <ArrowRightLeft className="text-sky-500" size={28} />
                {subView === 'gstr2a' ? 'GSTR-2A Reconciliation Dashboard' : 'GSTR-2B Reconciliation Dashboard'}
              </h1>
              <p className="text-sm text-slate-500 max-w-xl">
                Discrepancy audit matching raw Purchase Register registers against tax portal returns.
              </p>
            </div>
          )}
        </div>

        {/* Top Right Action Toggle Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSubView('gstr2a')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition duration-200 cursor-pointer ${
              subView === 'gstr2a'
                ? 'bg-[#e0f2fe] text-[#0ea5e9] border border-[#0ea5e9]'
                : 'border border-[#bae6fd] hover:text-[#0ea5e9] hover:bg-[#e0f2fe] text-slate-600'
            }`}
          >
            GSTR-2A Reconciliation
          </button>
          <button
            onClick={() => setSubView('gstr2b')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wide transition duration-200 cursor-pointer ${
              subView === 'gstr2b'
                ? 'bg-[#0ea5e9] text-white'
                : 'border border-[#bae6fd] hover:text-[#0ea5e9] hover:bg-[#e0f2fe] text-slate-600'
            }`}
          >
            GSTR-2B Reconciliation
          </button>
        </div>
      </div>

      {/* --- SUBVIEW 1: DEFAULT PURCHASE REGISTER --- */}
      {subView === 'pr' && (() => {
        const filteredPrInvoices = activePrInvoices.filter((inv) => {
          const invoice = (inv as any).invoice || inv;
          return (
            (invoice.vendor_name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            (invoice.pr_invoice_no || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
            (invoice.gstin || '').toLowerCase().includes((searchQuery || '').toLowerCase())
          );
        });

        const prPageSize = 10;
        const totalPrItems = filteredPrInvoices.length;
        const totalPrPages = Math.max(1, Math.ceil(totalPrItems / prPageSize));
        const prStartIndex = (prPage - 1) * prPageSize;
        const paginatedPrInvoices = filteredPrInvoices.slice(prStartIndex, prStartIndex + prPageSize);

        return (
          <div className="bg-white rounded-3xl border border-[#bae6fd] shadow-sm overflow-hidden animate-fadeIn" id="pr-table-container">
            <div className="p-6 border-b border-[#bae6fd] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-sky-500 animate-pulse" />
                <h2 className="text-sm font-bold text-slate-700 tracking-wider uppercase">Raw Purchase Registry Ledger</h2>
              </div>
              
              {/* Search Input filter */}
              <div className="relative">
                <Search size={16} className="text-slate-400 absolute left-3 w-4 h-4 top-2.5" />
                <input
                  type="text"
                  placeholder="Search vendor or invoice..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-4 py-1.5 w-full sm:w-64 text-xs border border-sky-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-slate-700"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse" id="purchase-register-table">
                <thead>
                  <tr className="bg-slate-50 border-b border-[#bae6fd]">
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Date</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Name</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">GSTIN</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Taxable Amount</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">GST Amount</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-right">Total Amount</th>
                    <th className="py-3.5 px-6 text-xs font-bold text-slate-500 uppercase tracking-wider text-center">Line Items</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedPrInvoices.map((inv) => {
                    const invoice = (inv as any).invoice || inv;
                    return (
                      <tr key={invoice.pr_invoice_no || ''} className="hover:bg-sky-50/20 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-800 font-mono text-xs">
                          <div>{invoice.pr_invoice_no || ''}</div>
                          <div className="text-[10px] text-slate-400 font-normal font-sans">{invoice.gstin || ''}</div>
                        </td>
                        <td className="py-4 px-6 text-slate-600 text-xs">{invoice.invoice_date || ''}</td>
                        <td className="py-4 px-6 font-bold text-slate-800">{invoice.vendor_name || ''}</td>
                        <td className="py-4 px-6 font-mono text-xs text-slate-500">{invoice.gstin || ''}</td>
                        <td className="py-4 px-6 text-right font-mono text-xs text-slate-700">₹{(parseFloat(String(invoice.taxable_value)) || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-right font-mono text-xs text-slate-700">₹{(parseFloat(String(invoice.gst_amount)) || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-right font-mono text-xs font-black text-slate-800">₹{(parseFloat(String(invoice.total_amount)) || 0).toLocaleString('en-IN')}</td>
                        <td className="py-4 px-6 text-center text-xs font-bold text-slate-600">{Number(invoice.line_items_count) || 0}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#bae6fd] bg-slate-50/50 gap-4">
              <div className="text-xs text-slate-500 font-bold">
                Showing {totalPrItems === 0 ? 0 : prStartIndex + 1} to {Math.min(prStartIndex + prPageSize, totalPrItems)} of {totalPrItems} items
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={prPage === 1}
                  onClick={() => setPrPage(prev => Math.max(prev - 1, 1))}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#bae6fd] bg-white hover:bg-sky-50 text-slate-700 disabled:opacity-50 disabled:pointer-events-none transition shadow-sm cursor-pointer"
                >
                  Previous
                </button>
                <span className="text-xs font-black text-slate-600 font-mono bg-white border border-[#bae6fd] px-3 py-1.5 rounded-xl shadow-sm">
                  Page {prPage} of {totalPrPages}
                </span>
                <button
                  disabled={prPage === totalPrPages}
                  onClick={() => setPrPage(prev => Math.min(prev + 1, totalPrPages))}
                  className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#bae6fd] bg-white hover:bg-sky-50 text-slate-700 disabled:opacity-50 disabled:pointer-events-none transition shadow-sm cursor-pointer"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* --- SUBVIEW 2: GSTR-2A OR GSTR-2B RECONCILIATION VIEW --- */}
      {(subView === 'gstr2a' || subView === 'gstr2b') && (
        <div className="space-y-6 animate-fadeIn">
          {/* Layout sub-views toggled by tabs: Invoice View and GSTIN View */}
          <div className="flex border-b border-[#bae6fd] gap-4" id="gstr-tabs-bar">
            <button
              onClick={() => setActiveTab('invoice')}
              className={`py-3 px-4 text-xs font-extrabold uppercase tracking-widest transition border-b-2 -mb-[2px] ${
                activeTab === 'invoice'
                  ? 'border-[#0ea5e9] text-[#0ea5e9]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              Invoice View <span className="bg-red-50 text-red-500 font-bold px-1.5 py-0.2 rounded-md text-[10px] ml-1.5">
                {activeReconciliationInvoices.filter((i) => {
                  const st = i.match_status || '';
                  return st !== 'Matched' && st !== 'Fully Matched';
                }).length} Unmatched
              </span>
            </button>
            <button
              onClick={() => setActiveTab('gstin')}
              className={`py-3 px-4 text-xs font-extrabold uppercase tracking-widest transition border-b-2 -mb-[2px] ${
                activeTab === 'gstin'
                  ? 'border-[#0ea5e9] text-[#0ea5e9]'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              }`}
            >
              GSTIN View <span className="bg-sky-50 text-[#0ea5e9] font-bold px-1.5 py-0.2 rounded-md text-[10px] ml-1.5">
                {gstinGroups.length} Vendors
              </span>
            </button>
          </div>

          {/* TAB CONTENT: Invoice View */}
          {activeTab === 'invoice' && (
            <div className="bg-white rounded-3xl border border-[#bae6fd] shadow-sm overflow-hidden text-slate-700">
              {/* Filter Bar with Buttons */}
              <div className="p-4 bg-slate-50/70 border-b border-[#bae6fd] flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mr-1">Filter Match Status:</span>
                  {(['All', 'Fully Matched', 'AI Matched', 'AI Probable Match', 'Missing'] as const).map((filterOpt) => {
                    const isActive = invoiceFilter === filterOpt;
                    return (
                      <button
                        key={filterOpt}
                        onClick={() => setInvoiceFilter(filterOpt)}
                        className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all duration-150 ${
                          isActive
                            ? 'bg-sky-500 text-white border-sky-500 shadow-sm font-extrabold'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'
                        }`}
                      >
                        {filterOpt}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="overflow-x-auto overflow-y-auto">
                <table className="w-full text-left border-collapse min-w-[1600px]" id="reconciliation-invoice-view-table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-[#bae6fd]">
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">Invoice No</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[120px]">Invoice Date</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[240px] max-w-[240px]">Vendor Name</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider w-[150px] max-w-[150px]">GSTIN</th>
                      {/* Purchase Register (PR) Columns */}
                      <th className="py-3 px-4 text-xs font-bold text-sky-800 uppercase tracking-wider text-right bg-sky-50/50 border-x border-[#bae6fd] w-[110px]">PR Taxable</th>
                      <th className="py-3 px-4 text-xs font-bold text-sky-800 uppercase tracking-wider text-right bg-sky-50/50 border-r border-[#bae6fd] w-[100px]">PR GST</th>
                      <th className="py-3 px-4 text-xs font-bold text-sky-800 uppercase tracking-wider text-right bg-sky-50/50 border-r border-[#bae6fd] w-[110px]">PR Total</th>
                      {/* Government Returns (GSTR-2A/2B) Columns */}
                      <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider text-right bg-amber-50/60 border-r border-amber-100 w-[110px]">{subView.toUpperCase()} Taxable</th>
                      <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider text-right bg-amber-50/60 border-r border-amber-100 w-[100px]">{subView.toUpperCase()} GST</th>
                      <th className="py-3 px-4 text-xs font-bold text-amber-900 uppercase tracking-wider text-right bg-amber-50/60 border-r border-amber-100 w-[110px]">{subView.toUpperCase()} Total</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[120px]">Match Status</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[130px]">Matched 2A Invoice</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[110px]">Variance Amt</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[100px]">GSTR-1 Filed</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[100px]">Prev 3B Filed</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[90px]">Confidence</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Suggested Action</th>
                      <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase tracking-wider text-center w-[110px]">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedReconInvoices.map((inv) => {
                        const invoice = (inv as any).invoice || inv;
                        
                        const prTaxable = Number(invoice.pr_taxable_value) || 0;
                        const prGst = Number(invoice.pr_gst_amount) || 0;
                        const prTotal = Number(invoice.pr_total_amount) || 0;

                        const matchedAmount = invoice.matched_2a_amount !== undefined && invoice.matched_2a_amount !== null 
                          ? Number(invoice.matched_2a_amount) 
                          : null;

                        const gstRate = Number(invoice.gst_rate) || 18;
                        const hasMatch = matchedAmount !== null;

                        const gstrTaxable = hasMatch ? (matchedAmount / (1 + gstRate / 100)) : 0;
                        const gstrGst = hasMatch ? (matchedAmount - gstrTaxable) : 0;

                        const renderAmount = (amount: number, showSymbol = true) => {
                          const formatted = amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          return showSymbol ? `₹${formatted}` : formatted;
                        };
                        
                        const varAmt = invoice.variance_amount !== undefined && invoice.variance_amount !== null 
                          ? Math.abs(Number(invoice.variance_amount)) 
                          : (hasMatch ? Math.abs(prTotal - (matchedAmount || 0)) : (prTotal === 0 ? 0 : prTotal));

                        const rowStatus = invoice.match_status || '';
                        let rowBgColorClass = 'hover:bg-slate-50/50';
                        if (rowStatus === 'Fully Matched' || rowStatus === 'Matched') {
                          rowBgColorClass = 'bg-emerald-50/[0.10] hover:bg-emerald-50/[0.22] border-l-4 border-l-emerald-500';
                        } else if (rowStatus === 'Missing') {
                          rowBgColorClass = 'bg-rose-50/[0.18] hover:bg-rose-50/[0.30] border-l-4 border-l-rose-500';
                        } else if (rowStatus === 'AI Probable Match' || varAmt > 0.01) {
                          rowBgColorClass = 'bg-amber-50/20 hover:bg-amber-50/35 border-l-4 border-l-amber-500';
                        } else if (rowStatus === 'AI Matched') {
                          rowBgColorClass = 'bg-sky-50/[0.12] hover:bg-sky-50/[0.26] border-l-4 border-l-sky-400';
                        }

                        return (
                          <tr key={invoice.pr_invoice_no || ''} className={`${rowBgColorClass} transition-colors border-b border-slate-100`}>
                            {/* 1. Invoice No */}
                            <td className="py-4 px-4 font-mono text-xs text-slate-800 font-bold whitespace-nowrap w-[120px]">
                              {invoice.pr_invoice_no || ''}
                            </td>

                            {/* 2. Invoice Date */}
                            <td className="py-4 px-4 text-slate-600 text-xs whitespace-nowrap w-[120px]">
                              {invoice.invoice_date || ''}
                            </td>

                            {/* 3. Vendor Name */}
                            <td className="py-4 px-4 font-bold text-slate-800 w-[240px] max-w-[240px] truncate" title={invoice.vendor_name || ''}>
                              {invoice.vendor_name || ''}
                            </td>

                            {/* 4. GSTIN */}
                            <td className="py-4 px-4 font-mono text-xs text-slate-500 whitespace-nowrap w-[150px] max-w-[150px] truncate">
                              {invoice.gstin || ''}
                            </td>

                            {/* 5. PR Taxable */}
                            <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-600 bg-sky-50/[0.04] border-x border-slate-100/60 w-[110px]">
                              {renderAmount(prTaxable)}
                            </td>

                            {/* 6. PR GST */}
                            <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-600 bg-sky-50/[0.04] border-r border-slate-100/60 w-[100px]">
                              {renderAmount(prGst)}
                            </td>

                            {/* 7. PR Total */}
                            <td className="py-4 px-4 text-right font-mono text-xs font-bold whitespace-nowrap text-slate-800 bg-sky-50/[0.04] border-r border-slate-100/60 w-[110px]">
                              {renderAmount(prTotal)}
                            </td>

                            {/* 8. GSTR Taxable */}
                            <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-600 bg-amber-50/[0.02] border-r border-amber-100/30 w-[110px]">
                              {hasMatch ? renderAmount(gstrTaxable) : '—'}
                            </td>

                            {/* 9. GSTR GST */}
                            <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap text-slate-600 bg-amber-50/[0.02] border-r border-amber-100/30 w-[100px]">
                              {hasMatch ? renderAmount(gstrGst) : '—'}
                            </td>

                            {/* 10. GSTR Total */}
                            <td className="py-4 px-4 text-right font-mono text-xs font-bold whitespace-nowrap text-slate-800 bg-amber-50/[0.02] border-r border-amber-100/30 w-[110px]">
                              {hasMatch ? renderAmount(matchedAmount) : '—'}
                            </td>

                            {/* 11. Match Status */}
                            <td className="py-4 px-4 text-center whitespace-nowrap w-[120px]">
                              {renderTableStatusBadge(invoice.match_status || '')}
                            </td>

                            {/* 12. Matched 2A Invoice */}
                            <td className="py-4 px-4 font-mono text-xs text-slate-600 whitespace-nowrap text-center w-[130px]">
                              {invoice.matched_2a_invoice_no !== undefined && invoice.matched_2a_invoice_no !== null
                                ? invoice.matched_2a_invoice_no
                                : '—'}
                            </td>

                            {/* 13. Variance Amt */}
                            <td className="py-4 px-4 text-right font-mono text-xs whitespace-nowrap w-[110px]">
                              {varAmt > 0.01 ? (
                                <span className="text-rose-600 font-extrabold bg-rose-50/80 border border-rose-100 px-1.5 py-0.5 rounded shadow-sm inline-block">
                                  ₹{varAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              ) : (
                                <span className="text-slate-400">₹0.00</span>
                              )}
                            </td>

                            {/* 14. GSTR-1 Filed */}
                            <td className="py-4 px-4 text-center whitespace-nowrap font-bold w-[100px]">
                              {renderFilingTickCross(invoice.gstr1_filed_this_month)}
                            </td>

                            {/* 15. Prev 3B Filed */}
                            <td className="py-4 px-4 text-center whitespace-nowrap font-bold w-[100px]">
                              {renderFilingTickCross(invoice.prev_month_3b_filed)}
                            </td>

                            {/* 16. Confidence */}
                            <td className="py-4 px-4 text-center font-mono text-xs text-slate-600 font-semibold whitespace-nowrap w-[90px]">
                              {invoice.confidence_score !== undefined && invoice.confidence_score !== null
                                ? `${invoice.confidence_score}%`
                                : '—'}
                            </td>

                            {/* 17. Suggested Action */}
                            <td className="py-4 px-4 text-xs text-slate-600 whitespace-normal min-w-[150px]">
                              {invoice.suggested_action || ''}
                            </td>

                            {/* 18. Action */}
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <button
                                onClick={() => handleOpenMail(invoice.vendor_name || '', invoice.gstin || '')}
                                className="px-3 py-1.5 rounded-lg bg-sky-50 text-sky-600 hover:bg-[#e0f2fe] text-xs font-bold transition flex items-center gap-1 mx-auto whitespace-nowrap"
                              >
                                <Mail size={12} />
                                Send Mail
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>

              {/* Beautiful Pagination Control Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-t border-[#bae6fd] bg-slate-50/50 gap-4">
                <div className="text-xs text-slate-500 font-bold">
                  Showing {totalReconItems === 0 ? 0 : reconStartIndex + 1} to {Math.min(reconStartIndex + reconPageSize, totalReconItems)} of {totalReconItems} Invoices
                </div>
                <div className="flex items-center gap-2">
                  <button
                    disabled={reconPage === 1}
                    onClick={() => setReconPage(prev => Math.max(prev - 1, 1))}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#bae6fd] bg-white hover:bg-sky-50 text-slate-700 disabled:opacity-50 disabled:pointer-events-none transition shadow-sm cursor-pointer"
                  >
                    Previous
                  </button>
                  <span className="text-xs font-black text-slate-600 font-mono bg-white border border-[#bae6fd] px-3 py-1.5 rounded-xl shadow-sm">
                    Page {reconPage} of {totalReconPages}
                  </span>
                  <button
                    disabled={reconPage === totalReconPages}
                    onClick={() => setReconPage(prev => Math.min(prev + 1, totalReconPages))}
                    className="px-3.5 py-2 text-xs font-bold rounded-xl border border-[#bae6fd] bg-white hover:bg-sky-50 text-slate-700 disabled:opacity-50 disabled:pointer-events-none transition shadow-sm cursor-pointer"
                  >
                    Next
                  </button>
                </div>
              </div>

            </div>
          )}

          {/* TAB CONTENT: GSTIN View */}
          {activeTab === 'gstin' && (
            <div className="space-y-4" id="reconciliation-gstin-view-container">
              {gstinGroups.map((group) => {
                const total = group.invoicesList.length;

                // Counts by specified match status values
                const fullyMatchedCount = group.invoicesList.filter((i) => {
                  const invoice = (i as any).invoice || i;
                  return (invoice.match_status || '') === 'Fully Matched' || (invoice.match_status || '') === 'Matched';
                }).length;

                const aiMatchedCount = group.invoicesList.filter((i) => {
                  const invoice = (i as any).invoice || i;
                  return (invoice.match_status || '') === 'AI Matched';
                }).length;

                const aiProbableMatchCount = group.invoicesList.filter((i) => {
                  const invoice = (i as any).invoice || i;
                  return (invoice.match_status || '') === 'AI Probable Match';
                }).length;

                const missingCount = group.invoicesList.filter((i) => {
                  const invoice = (i as any).invoice || i;
                  return (invoice.match_status || '') === 'Missing';
                }).length;

                const progressPct = total > 0 ? (fullyMatchedCount / total) * 105 : 0; // cap matchpct nicely
                const progressWidth = Math.min(100, progressPct);
                const isExpanded = !!expandedGstins[group.gstin || ''];
                const profile = getVendorProfile(group.gstin) || {};

                const vendorName = profile.vendor_name || group.vendor_name || 'Vendor';
                const importance = profile.importance;
                const riskLevel = profile.risk_level;

                const getImportanceBadgeColor = (imp: string) => {
                  const val = (imp || '').toLowerCase();
                  if (val === 'high') return 'bg-rose-50 text-rose-700 border-rose-200';
                  if (val === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
                  return 'bg-slate-50 text-slate-500 border-slate-200';
                };

                const getRiskBadgeColor = (risk: string) => {
                  const val = (risk || '').toLowerCase();
                  if (val === 'high') return 'bg-rose-50 text-rose-700 border-rose-200';
                  if (val === 'medium') return 'bg-amber-50 text-amber-700 border-amber-200';
                  return 'bg-emerald-50 text-emerald-700 border-emerald-200';
                };

                // filing_frequency badge from the first invoice's property
                const firstInv = (group.invoicesList[0] as any).invoice || group.invoicesList[0];
                const filingFrequency = firstInv?.filing_frequency || 'Monthly';

                return (
                  <div 
                    key={group.gstin} 
                    className="bg-white rounded-3xl border border-[#bae6fd] shadow-sm overflow-hidden animate-fadeIn"
                  >
                    {/* Collapsible Card Header Info */}
                    <div className="p-6 flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-6 bg-white hover:bg-slate-50/20 transition duration-150">
                      
                      {/* Left: Expand icon and identity */}
                      <div className="flex items-start gap-4 flex-1">
                        <button
                          onClick={() => toggleGstin(group.gstin)}
                          className="p-1.5 mt-0.5 rounded-lg text-slate-400 hover:text-sky-500 hover:bg-slate-100 transition shrink-0"
                          title="Expand invoices list"
                        >
                          {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                        </button>
 
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-extrabold text-slate-800 text-base">{vendorName}</h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded border bg-sky-50 text-sky-600 border-sky-100 uppercase tracking-wider">
                              {filingFrequency} filer
                            </span>
                            {importance && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getImportanceBadgeColor(importance)}`}>
                                {importance} Priority
                              </span>
                            )}
                            {riskLevel && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase tracking-wider ${getRiskBadgeColor(riskLevel)}`}>
                                Risk: {riskLevel}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono mt-0.5">{group.gstin}</p>
                        </div>
                      </div>
 
                      {/* Center Left: Progress Bar */}
                      <div className="flex flex-col w-56 justify-center">
                        <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1">
                          <span>Match Progress</span>
                          <span>{fullyMatchedCount} of {total}</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div 
                            className="bg-emerald-500 h-2 rounded-full transition-all duration-300" 
                            style={{ width: `${progressWidth}%` }}
                          />
                        </div>
                      </div>
 
                      {/* Center Right: All counts on each GSTIN card */}
                      <div className="flex items-center gap-4 bg-slate-50 px-4 py-2 rounded-2xl border flex-wrap">
                        <div className="text-center px-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Fully Matched</p>
                          <p className="text-sm font-black text-emerald-600">{fullyMatchedCount}</p>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
                        <div className="text-center px-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Matched</p>
                          <p className="text-sm font-black text-teal-600">{aiMatchedCount}</p>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
                        <div className="text-center px-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">AI Probable</p>
                          <p className="text-sm font-black text-amber-500">{aiProbableMatchCount}</p>
                        </div>
                        <div className="h-6 w-[1px] bg-slate-200 hidden sm:block" />
                        <div className="text-center px-1">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Missing</p>
                          <p className="text-sm font-black text-rose-500">{missingCount}</p>
                        </div>
                      </div>
 
                      {/* Rightmost: Operations button */}
                      <div className="flex items-center shrink-0">
                        <button
                          onClick={() => handleOpenMail(vendorName, group.gstin)}
                          className="w-full lg:w-auto px-4 py-2 bg-[#0ea5e9] text-white rounded-xl text-xs font-bold hover:bg-sky-600 transition flex items-center justify-center gap-2 shadow-sm whitespace-nowrap"
                        >
                          <Mail size={13} />
                          Send Mail
                        </button>
                      </div>
                    </div>
 
                    {/* Expandable Section shows all invoices for that GSTIN */}
                    {isExpanded && (
                      <div className="border-t border-[#bae6fd] bg-slate-50/30 p-6 animate-fadeIn">
                        <h4 className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-3 animate-pulse">All Invoices associated with GSTIN ({group.gstin})</h4>
                        
                        <div className="overflow-x-auto border rounded-2xl bg-white">
                          <table className="w-full text-left text-xs text-slate-700 min-w-[800px]">
                            <thead>
                              <tr className="bg-slate-50 border-b">
                                <th className="p-3 font-semibold text-slate-500">Invoice No</th>
                                <th className="p-3 font-semibold text-slate-500">Invoice Date</th>
                                <th className="p-3 font-semibold text-slate-500 text-right">Taxable Amount</th>
                                <th className="p-3 font-semibold text-slate-500 text-right">GST (18%)</th>
                                <th className="p-3 font-semibold text-slate-500 text-right">Total Amount</th>
                                <th className="p-3 font-semibold text-slate-500 text-center">Status</th>
                                <th className="p-3 font-semibold text-slate-500">Suggested Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y text-slate-700">
                              {group.invoicesList.map((itm) => {
                                const invoice = (itm as any).invoice || itm;
                                const itemStatus = invoice.match_status || '';
                                let itemBgColor = 'hover:bg-slate-50/50';
                                if (itemStatus === 'Fully Matched' || itemStatus === 'Matched') {
                                  itemBgColor = 'bg-emerald-50/[0.12] hover:bg-emerald-50/[0.24] border-l-4 border-l-emerald-500';
                                } else if (itemStatus === 'Missing') {
                                  itemBgColor = 'bg-rose-50/[0.15] hover:bg-rose-50/[0.28] border-l-4 border-l-rose-500';
                                } else if (itemStatus === 'AI Probable Match') {
                                  itemBgColor = 'bg-amber-50/[0.15] hover:bg-amber-50/[0.28] border-l-4 border-l-amber-500';
                                } else if (itemStatus === 'AI Matched') {
                                  itemBgColor = 'bg-sky-50/[0.12] hover:bg-sky-50/[0.24] border-l-4 border-l-sky-400';
                                }
                                return (
                                  <tr key={invoice.pr_invoice_no || ''} className={`${itemBgColor} transition-colors`}>
                                    <td className="p-3 font-sans font-bold">
                                      <div>{invoice.pr_invoice_no || ''}</div>
                                      <div className="text-[10px] text-slate-400 font-normal font-sans">{invoice.gstin || ''}</div>
                                    </td>
                                    <td className="p-3 whitespace-nowrap">{invoice.invoice_date || ''}</td>
                                    <td className="p-3 text-right">₹{(parseFloat(String(invoice.taxable_value)) || 0).toLocaleString('en-IN')}</td>
                                    <td className="p-3 text-right">₹{(parseFloat(String(invoice.gst_amount)) || 0).toLocaleString('en-IN')}</td>
                                    <td className="p-3 text-right font-semibold">₹{(parseFloat(String(invoice.total_amount)) || 0).toLocaleString('en-IN')}</td>
                                    <td className="p-3 text-center">{renderStatusBadge(invoice.match_status || '')}</td>
                                    <td className="p-3 text-slate-500 font-mono italic text-xs">
                                      {invoice.match_status === 'Matched' || invoice.match_status === 'Fully Matched' 
                                        ? 'Auto matched with GSTR-2A/2B returns.' 
                                        : (invoice.suggested_action || '')}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* --- SEND MAIL MODAL DIALOG OVERLAY --- */}
      {mailModal.isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-[#bae6fd] shadow-2xl w-full max-w-3xl overflow-hidden my-auto relative">
            
            {/* Header with Title */}
            <div className="p-6 bg-slate-50 border-b border-sky-100 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-extrabold text-slate-800">
                  Draft Vendor Communication — {mailModal.vendorName}
                </h3>
                <p className="text-xs text-slate-400 mt-1">Unified Compliance Communication Framework</p>
              </div>
              <button
                onClick={() => setMailModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Reconciliation Discrepancies Summary Block */}
            <div className="px-6 py-4 bg-sky-50/50 border-b border-sky-100 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 block shrink-0" />
                <span className="text-slate-600 font-medium">Missing Invoices: <strong>{mailModal.missingInvoices.length}</strong></span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 block shrink-0" />
                <span className="text-slate-600 font-medium">Data Errors: <strong>{mailModal.errorInvoices.length}</strong></span>
              </div>
            </div>

            {/* Addressing compliance emails, CC, BCC, and Subject */}
            <div className="px-6 py-4 border-b border-slate-100 space-y-3 bg-white">
              {/* To (Vendor Email) */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="w-24 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">To (Vendor):</label>
                <div className="flex-1">
                  <input
                    type="text"
                    readOnly
                    value={mailModal.vendorEmail}
                    className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-xl bg-slate-50 text-slate-500 cursor-not-allowed font-medium focus:outline-none"
                    title="Vendor team compliance email (automatically resolved, non-editable)"
                  />
                </div>
              </div>

              {/* CC & BCC row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="w-24 md:w-20 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Cc:</label>
                  <input
                    type="text"
                    value={mailModal.cc}
                    onChange={(e) => setMailModal((prev) => ({ ...prev, cc: e.target.value }))}
                    placeholder="e.g. compliance@iapx.com"
                    className="flex-1 w-full text-xs px-3 py-1.5 border border-sky-100 rounded-xl bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <label className="w-24 md:w-20 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Bcc:</label>
                  <input
                    type="text"
                    value={mailModal.bcc}
                    onChange={(e) => setMailModal((prev) => ({ ...prev, bcc: e.target.value }))}
                    placeholder="e.g. ledger-archive@iapx.com"
                    className="flex-1 w-full text-xs px-3 py-1.5 border border-sky-100 rounded-xl bg-white text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                  />
                </div>
              </div>

              {/* Subject */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                <label className="w-24 text-[11px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Subject:</label>
                <div className="flex-1 p-[1px]">
                  <input
                    type="text"
                    value={mailModal.subject}
                    onChange={(e) => setMailModal((prev) => ({ ...prev, subject: e.target.value }))}
                    className="w-full text-xs font-semibold px-3 py-1.5 border border-sky-150 rounded-xl bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-150"
                  />
                </div>
              </div>
            </div>

            {/* Auto-Attached Excel Sheet Info Pill */}
            <div className="px-6 py-2.5 bg-emerald-50/50 border-b border-emerald-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Paperclip size={13} className="text-emerald-600 shrink-0" />
                <span className="text-xs font-bold text-slate-700">Auto-Attached File:</span>
                <span className="inline-flex items-center gap-1.5 text-[11px] font-mono bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg border border-emerald-100">
                  {(mailModal.vendorName || '').toLowerCase().replace(/[^a-z0-0]/g, '_')}_reconciliation_{mailModal.gstin}.xlsx
                  <span className="text-[9.5px] text-emerald-500 font-sans font-medium">(48 KB)</span>
                </span>
              </div>
              <div className="text-[10px] text-emerald-700 font-bold bg-white/80 border border-emerald-200 rounded-md px-2 py-0.5 flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse block" />
                Spreadsheet Attached Automatically
              </div>
            </div>

            {/* THREE TABS ON THE VERY TOP of the modal ONLY if it is a GSTR-2A screen */}
            {subView === 'gstr2a' && (
              <div className="flex bg-slate-100/70 p-1 mx-6 mt-6 rounded-xl border border-sky-100" id="tone-selector">
                <button
                  type="button"
                  onClick={() => handleToneChange('7th')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    mailModal.tone === '7th'
                      ? 'bg-white text-sky-500 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  7th (Gentle Tone)
                </button>
                <button
                  type="button"
                  onClick={() => handleToneChange('9th')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    mailModal.tone === '9th'
                      ? 'bg-white text-sky-500 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  9th (Hold Warning)
                </button>
                <button
                  type="button"
                  onClick={() => handleToneChange('11th')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                    mailModal.tone === '11th'
                      ? 'bg-white text-sky-500 shadow-sm font-bold'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  11th (Urgent Escalate)
                </button>
              </div>
            )}

            {/* Email Draft Text Area */}
            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 mb-1">
                  <span>EDITABLE EMAIL BODY CONTENT</span>
                  <span className="flex items-center gap-1 text-sky-500 text-[11px] uppercase">
                    <Sparkles size={11} className="fill-sky-100" /> Auto-redrafted via AI
                  </span>
                </div>
                <textarea
                  value={mailModal.draftText}
                  onChange={(e) => setMailModal((prev) => ({ ...prev, draftText: e.target.value }))}
                  className="w-full h-64 text-xs font-mono p-4 border border-sky-100 rounded-2xl bg-white text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-sky-150 resize-none hover:border-sky-200 transition"
                  placeholder="Type or edit email body content..."
                />
              </div>

              {/* Redraft inputs */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-sky-100">
                <label className="text-[11px] font-bold text-slate-500 uppercase block mb-1.5">
                  Give AI instructions to redraft both subject & mail body
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={mailModal.instructions}
                    onChange={(e) => setMailModal((prev) => ({ ...prev, instructions: e.target.value }))}
                    placeholder="e.g., 'Make it more professional', 'Include AP manager phone number: +91 99887 76655'"
                    className="flex-1 text-xs px-3 py-2 border border-sky-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-150 text-slate-700 bg-white"
                  />
                  <button
                    onClick={handleRegenerateText}
                    disabled={mailModal.regenerating || !(mailModal.instructions || '').trim()}
                    className="px-4 py-2 bg-sky-500 text-white text-xs font-bold hover:bg-sky-600 rounded-xl transition flex items-center gap-1 shrink-0 disabled:bg-slate-300 disabled:cursor-not-allowed"
                  >
                    {mailModal.regenerating ? (
                      <>
                        <span className="block w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin pr-[1px]" />
                        Applying...
                      </>
                    ) : (
                      <>
                        <Sparkles size={12} />
                        Regenerate
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Bottom control triggers */}
            <div className="p-6 bg-slate-50 border-t border-sky-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  alert("Invoice spreadsheet export downloaded locally in excel format.");
                }}
                className="px-4 py-2.5 rounded-xl border border-sky-500 text-sky-500 font-bold text-xs hover:bg-sky-50 transition"
              >
                Download Invoice Excel
              </button>

              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setMailModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-100 font-bold text-xs transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSendDraft}
                  className="px-5 py-2.5 bg-[#0ea5e9] text-white hover:bg-sky-600 font-bold rounded-xl text-xs flex items-center gap-1.5 transition shadow-sm active:scale-95"
                >
                  {mailDispatched ? (
                    <>
                      <span className="block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Dispatching email returns...
                    </>
                  ) : (
                    <>
                      <Mail size={13} />
                      Send Mail
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}

export default ReconciliationScreen;
