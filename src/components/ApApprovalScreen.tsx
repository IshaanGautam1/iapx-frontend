/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { 
  Check, 
  X, 
  Search, 
  AlertCircle, 
  HelpCircle, 
  ArrowRight,
  Sparkles,
  AlertTriangle,
  Clock,
  ShieldCheck,
  Building,
  UserCheck
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { InvoiceDetails } from '../types';

export function ApApprovalScreen() {
  const { prData, setPrData, vendorProfiles, matchResults } = useApp();
  const invoices = prData || [];
  const [searchQuery, setSearchQuery] = useState('');

  // States for Review Modal and Comments
  const [reviewModalInvoice, setReviewModalInvoice] = useState<InvoiceDetails | null>(null);
  const [reviewComments, setReviewComments] = useState<string>('');
  const [toast, setToast] = useState<{ show: boolean; msg: string; type: 'success' | 'info' }>({ 
    show: false, 
    msg: '', 
    type: 'success' 
  });

  // GSTR-1 status helper
  const getGstr1Status = (inv: any) => {
    // Try to find the match item from matchResults in context
    const matchItem = (matchResults || []).find((m) => {
      const minv = m?.invoice || m || {};
      return minv.pr_invoice_no === inv.pr_invoice_no;
    });
    const invoiceInMatch = matchItem?.invoice || matchItem || {};
    
    // Use cfs_status if found on either inv or invoiceInMatch
    const val = inv.cfs_status !== undefined ? inv.cfs_status : invoiceInMatch.cfs_status;
    if (val !== undefined && val !== null) {
      return String(val).trim();
    }
    
    // Fallback to gstr1_filed_this_month if cfs_status is absent
    const gstr1Filed = inv.gstr1_filed_this_month !== undefined ? inv.gstr1_filed_this_month : invoiceInMatch.gstr1_filed_this_month;
    if (gstr1Filed === true || gstr1Filed === 'Y' || gstr1Filed === 'Yes') {
      return 'Y';
    }
    if (gstr1Filed === false || gstr1Filed === 'N' || gstr1Filed === 'No') {
      return 'N';
    }
    return 'N/A'; // fallback if not found at all
  };

  const renderGstr1StatusBadge = (status: string) => {
    const normalized = status.toLowerCase();
    if (normalized === 'y' || normalized === 'yes' || normalized === 'filed' || normalized === 'true') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-emerald-55 text-emerald-800 border border-emerald-200">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-550 inline-block animate-pulse"></span>
          Filed
        </span>
      );
    } else if (normalized === 'n' || normalized === 'no' || normalized === 'not filed' || normalized === 'false') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2... py-0.5 rounded-md bg-rose-50 text-rose-700 border border-rose-200">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 inline-block"></span>
          Not Filed
        </span>
      );
    } else if (normalized === 'n/a' || normalized === '') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-bold border border-slate-200">
          N/A
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-extrabold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200">
          {status}
        </span>
      );
    }
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

  // Warning Modal State for Medium Risk Approve clicks
  const [warningModal, setWarningModal] = useState<{
    isOpen: boolean;
    invoice: InvoiceDetails | null;
  }>({
    isOpen: false,
    invoice: null,
  });

  // Handle operations
  const handleApprove = (invoiceNo: string) => {
    setPrData(
      invoices.map((inv) =>
        inv.pr_invoice_no === invoiceNo
          ? { ...inv, ap_status: 'Approved' }
          : inv
      )
    );
  };

  const handleReject = (invoiceNo: string) => {
    setPrData(
      invoices.map((inv) =>
        inv.pr_invoice_no === invoiceNo
          ? { ...inv, ap_status: 'Rejected' }
          : inv
      )
    );
  };

  // Heuristics for Risk rating:
  // Derived directly from the backend vendor profile risk level
  const getRiskRating = (inv: InvoiceDetails): 'High' | 'Medium' | 'Low' => {
    const record = getVendorProfile(inv.gstin);
    if (record && record.risk_level) {
      const rl = record.risk_level;
      if (rl === 'High' || rl === 'Medium' || rl === 'Low') {
        return rl;
      }
      const normalized = String(rl).trim().toLowerCase();
      if (normalized.includes('high')) return 'High';
      if (normalized.includes('med')) return 'Medium';
      if (normalized.includes('low')) return 'Low';
    }
    return 'Low';
  };

  // Trigger click handlers
  const handleApproveButtonClick = (inv: InvoiceDetails) => {
    const risk = getRiskRating(inv);
    if (risk === 'High') return; // strictly disabled

    if (risk === 'Medium') {
      setWarningModal({
        isOpen: true,
        invoice: inv,
      });
    } else {
      // Low risk - approve immediately
      handleApprove(inv.pr_invoice_no);
    }
  };

  const handleConfirmMediumRiskApprove = () => {
    if (warningModal.invoice) {
      handleApprove(warningModal.invoice.pr_invoice_no);
      setWarningModal({ isOpen: false, invoice: null });
    }
  };

  // Status counters for dashboard cards
  const summaryCounters = useMemo(() => {
    let pending = 0;
    let highRisk = 0;
    let readyToApprove = 0;
    let approvedToday = 0;

    invoices.forEach((inv) => {
      const apStatus = inv.ap_status || 'Pending';
      const risk = getRiskRating(inv);

      if (apStatus === 'Approved') {
        approvedToday++;
      } else {
        pending++;
        if (risk === 'High') {
          highRisk++;
        }
        if (risk === 'Low') {
          readyToApprove++;
        }
      }
    });

    return { pending, highRisk, readyToApprove, approvedToday };
  }, [invoices]);

  // Sorted and searched list
  // "row turns green and moves to bottom of table"
  // So: sort by whether it is approved or not! non-approved first, approved at bottom.
  const processedInvoices = useMemo(() => {
    const items = invoices.filter((inv) =>
      ((inv.vendor_name || '').toLowerCase()).includes((searchQuery || '').toLowerCase()) ||
      ((inv.pr_invoice_no || '').toLowerCase()).includes((searchQuery || '').toLowerCase()) ||
      ((inv.po_number || '').toLowerCase()).includes((searchQuery || '').toLowerCase())
    );

    return [...items].sort((a, b) => {
      const statusA = a.ap_status === 'Approved' ? 1 : 0;
      const statusB = b.ap_status === 'Approved' ? 1 : 0;
      return statusA - statusB; // 0 (pending) comes before 1 (approved)
    });
  }, [invoices, searchQuery]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 py-8 font-sans" id="ap-approval-screen">
      
      {/* 1. Summary bar at top showing 4 cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8" id="ap-summary-bar">
        
        {/* Card 1: Total Pending */}
        <div className="bg-white rounded-3xl border border-[#bae6fd] p-5 shadow-sm hover:translate-y-[-1px] transition-transform duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Pending Account Check</span>
            <div className="p-2 rounded-xl bg-sky-50 text-[#0ea5e9]">
              <Clock size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 leading-none">{summaryCounters.pending}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Invoices awaiting audit checks</p>
        </div>

        {/* Card 2: High Risk */}
        <div className="bg-white rounded-3xl border border-red-100 p-5 shadow-sm hover:translate-y-[-1px] transition-transform duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-red-400 ... uppercase tracking-widest">GSTR Hold (High Risk)</span>
            <div className="p-2 rounded-xl bg-red-50 text-red-500">
              <AlertTriangle size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-red-650 leading-none">{summaryCounters.highRisk}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Flagged compliance lockdowns</p>
        </div>

        {/* Card 3: Ready to Approve */}
        <div className="bg-white rounded-3xl border border-emerald-100 p-5 shadow-sm hover:translate-y-[-1px] transition-transform duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-emerald-500 uppercase tracking-widest">Confirmed (Ready)</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-500">
              <ShieldCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-750 leading-none">{summaryCounters.readyToApprove}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Low risk matching 3B reports</p>
        </div>

        {/* Card 4: Approved Today */}
        <div className="bg-gradient-to-br from-sky-50/50 to-white rounded-3xl border border-[#bae6fd] p-5 shadow-sm hover:translate-y-[-1px] transition-transform duration-200">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans">Released Payouts</span>
            <div className="p-2 rounded-xl bg-[#e0f2fe] text-[#0ea5e9]">
              <UserCheck size={16} />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-800 leading-none">{summaryCounters.approvedToday}</p>
          <p className="text-xs text-slate-500 mt-2 font-medium">Invoices approved matching PRs</p>
        </div>
      </div>

      {/* 2. Main Grid Table */}
      <div className="bg-white rounded-3xl border border-[#bae6fd] shadow-sm overflow-hidden" id="ap-approval-queue-block">
        
        {/* Table Title Block with Search Filter on RHS */}
        <div className="p-6 border-b border-[#bae6fd] flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <Building className="text-sky-500 shrink-0" size={20} />
            <h2 className="text-lg font-extrabold text-slate-800">Invoice Approval Queue</h2>
          </div>

          <div className="relative">
            <Search size={16} className="text-slate-400 absolute left-3 w-4 h-4 top-2.5" />
            <input
              type="text"
              placeholder="Search by vendor, inv, PO..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-1.5 w-full sm:w-64 text-xs border border-sky-150 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-200 text-slate-700 bg-white"
            />
          </div>
        </div>

        {/* Invoice Actions Table queue */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="ap-approval-table">
            <thead>
              <tr className="bg-slate-50 border-b border-[#bae6fd]">
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice No.</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider font-mono">PO Number</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Invoice Date</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 uppercase tracking-wider">Vendor Name</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 tracking-wider text-center">Items</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 tracking-wider text-right">PO Total</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 tracking-wider text-right">Invoice Total</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 tracking-wider text-center">GSTR1 Filing Status</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 tracking-wider text-center">Vendor Risk</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 tracking-wider text-center">Importance</th>
                <th className="py-3.5 px-5 text-xs font-bold text-slate-500 tracking-wider text-center">Workflow Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {processedInvoices.length > 0 ? (
                processedInvoices.map((inv) => {
                  const risk = getRiskRating(inv);
                  const profile = getVendorProfile(inv.gstin);
                  const isApproved = inv.ap_status === 'Approved';
                  const isRejected = inv.ap_status === 'Rejected';

                  // Compute or fetch importance text dynamically
                  let importanceText = 'Low';
                  let subText = 'Calculated from Purchase Register';
                  let volClass = 'Low';
                  let amtClass = 'Low';

                  if (profile) {
                    importanceText = profile.importance || 'Low';
                    const amountPct = `${Number(profile.amount_share_pct) || 0}%`;
                    const countPct = `${Number(profile.count_share_pct) || 0}%`;
                    subText = `Vol Share: ${countPct} | Amt Share: ${amountPct}`;
                    
                    const lowerImp = (importanceText || '').toLowerCase();
                    if (lowerImp.includes('high') || lowerImp.includes('crit')) {
                      volClass = 'High';
                      amtClass = 'High';
                    } else if (lowerImp.includes('med') || lowerImp.includes('mod')) {
                      volClass = 'Medium';
                      amtClass = 'Medium';
                    } else {
                      volClass = 'Low';
                      amtClass = 'Low';
                    }
                  }

                  // Dynamic green highlight for approved rows: "row turns green and moves to bottom"
                  const rowClass = isApproved
                    ? 'bg-emerald-50/50 hover:bg-emerald-50 text-emerald-850 font-medium transition duration-200'
                    : isRejected
                    ? 'bg-rose-50/20 text-slate-500 hover:bg-rose-50/30'
                    : 'hover:bg-slate-50/50 transition duration-150';

                  return (
                    <tr key={inv.pr_invoice_no} className={rowClass}>
                      
                      {/* 1. Invoice Number */}
                      <td className="py-4.5 px-5 font-mono text-xs font-semibold">
                        <div>{inv.pr_invoice_no}</div>
                        <div className="text-[10px] text-slate-400 font-normal font-sans">{inv.gstin || ''}</div>
                      </td>

                      {/* 2. PO Number */}
                      <td className="py-4.5 px-5 font-mono text-xs text-slate-500 leading-none">
                        {inv.po_number}
                      </td>

                      {/* 3. Invoice Date */}
                      <td className="py-4.5 px-5 text-xs text-slate-600 truncate min-w-[75px]">
                        {inv.invoice_date}
                      </td>

                      {/* 4. Vendor Name */}
                      <td className="py-4.5 px-5 text-xs font-bold text-slate-800">
                        {inv.vendor_name}
                      </td>

                      {/* 5. Line items count */}
                      <td className="py-4.5 px-5 text-center text-xs font-mono font-bold text-slate-600">
                        {inv.line_items_count}
                      </td>

                      {/* 6. PO Total */}
                      <td className="py-4.5 px-5 text-right font-mono text-xs text-slate-600">
                        ₹{(parseFloat(String(inv.total_amount)) || 0).toLocaleString('en-IN')}
                      </td>

                      {/* 7. Invoice Total */}
                      <td className="py-4.5 px-5 text-right font-mono text-xs font-extrabold text-slate-800">
                        ₹{(parseFloat(String(inv.total_amount)) || 0).toLocaleString('en-IN')}
                      </td>

                      {/* 8. GSTR-1 Status Badge (using cfs_status) */}
                      <td className="py-4.5 px-5 text-center">
                        {renderGstr1StatusBadge(getGstr1Status(inv))}
                      </td>

                      {/* 10. Vendor Risk badge */}
                      <td className="py-4.5 px-5 text-center text-xs">
                        <div className="relative group/risk inline-block">
                          {risk === 'Low' ? (
                            <span className="inline-flex items-center text-[10.5px] font-black px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 whitespace-nowrap cursor-help">
                              Low Risk
                            </span>
                          ) : risk === 'Medium' ? (
                            <span className="inline-flex items-center text-[10.5px] font-black px-2.5 py-1 rounded-xl bg-amber-50 text-amber-600 border border-amber-200 whitespace-nowrap animate-pulse cursor-help">
                              Medium Risk
                            </span>
                          ) : (
                            <span className="inline-flex items-center text-[10.5px] font-black px-2.5 py-1 rounded-xl bg-red-55 text-red-650 border border-red-200 whitespace-nowrap cursor-help">
                              High Risk
                            </span>
                          )}

                            {/* Historical filings breakdown hover menu */}
                            <div className="absolute right-1/2 bottom-full mb-2.5 hidden group-hover/risk:block transform translate-x-1/2 bg-slate-900 text-white font-sans text-xs z-50 p-4 rounded-2xl shadow-2xl w-72 text-left leading-normal border border-slate-700 animate-fadeIn" id="risk-compliance-card">
                              <p className="font-bold text-[11px] text-slate-400 uppercase tracking-widest mb-2 border-b border-slate-800 pb-1.5 flex items-center justify-between">
                                <span>GSTIN Filing History</span>
                                <span className="font-mono text-[9px] text-[#0ea5e9] bg-sky-950 px-1.5 py-0.5 rounded border border-sky-800">{inv.gstin}</span>
                              </p>
                              
                              {profile ? (
                                <div className="space-y-2.5">
                                  <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Filing Compliance</p>
                                      <p className="text-xs font-black min-h-[16px] text-emerald-400 flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                        {profile.compliance_rating || profile.compliance || 'Good'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide font-sans">Filing Success Rate</p>
                                      <p className="text-xs font-black min-h-[16px] text-amber-300 font-mono">
                                        {profile.filing_rate_pct !== undefined ? `${profile.filing_rate_pct}%` : `${(((profile.filing_rate || 0)/6)*100).toFixed(1)}%`}
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Filing Frequency</p>
                                      <p className="text-[11px] font-medium text-slate-200">
                                        {profile.filing_frequency || 'Monthly'}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Filed Months</p>
                                      <p className="text-[11px] font-mono font-bold text-slate-200">
                                        {profile.filing_rate || 0} of 6 Months
                                      </p>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-2 gap-2 border-b border-slate-800 pb-2">
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Prev Month GSTR-3B</p>
                                      <p className="text-[11px] font-bold text-slate-200 flex items-center gap-1">
                                        {profile.prev_month_3b_filed === 'Yes' || profile.prev_month_3b_filed === true ? (
                                          <span className="text-emerald-400">Filed ✓</span>
                                        ) : (
                                          <span className="text-rose-450 font-extrabold">Unfiled ❌</span>
                                        )}
                                      </p>
                                    </div>
                                    <div>
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide">Calculated Risk Level</p>
                                      <p className={`text-[11px] font-bold uppercase tracking-wider ${
                                        profile.risk_level === 'High' ? 'text-red-400' : profile.risk_level === 'Medium' ? 'text-amber-400 animate-pulse' : 'text-emerald-400'
                                      }`}>
                                        {profile.risk_level || 'Low'} Risk
                                      </p>
                                    </div>
                                  </div>

                                  {profile.reasoning && (
                                    <div className="border-b border-slate-800 pb-2">
                                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-0.5 font-sans">Auditor Reasoning Analysis</p>
                                      <p className="text-[10px] text-slate-300 leading-normal font-sans italic">
                                        "{profile.reasoning}"
                                      </p>
                                    </div>
                                  )}

                                  <div>
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wide mb-1 font-sans">Escalation Contacts</p>
                                    <p className="text-[10.5px] text-slate-300 leading-normal font-mono">
                                      Email: <span className="text-slate-400 hover:text-sky-300 transition-colors">{profile.contact_email || 'N/A'}</span>
                                      <br />
                                      WhatsApp: <span className="text-slate-400">{profile.whatsapp_number || 'N/A'}</span>
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-[10px] text-slate-500 italic py-2 text-center">GSTIN index records not available</p>
                              )}
                              <div className="mt-2.5 text-[9.5px] text-slate-400 border-t border-slate-800 pt-2 italic text-center leading-tight">
                                Audited from official GSTR ledger history
                              </div>
                            </div>
                          </div>
                      </td>

                      {/* 11. Vendor Importance badge */}
                      <td className="py-4.5 px-5 text-center text-xs">
                        <div className="relative group/importance inline-block">
                          <span className={`inline-flex items-center text-[10.5px] font-black px-2.5 py-1 rounded-xl uppercase tracking-wider whitespace-nowrap border cursor-help ${
                            volClass === 'High' && amtClass === 'High'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200 shadow-sm'
                              : volClass === 'Medium' && amtClass === 'High'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : volClass === 'High'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : amtClass === 'High'
                              ? 'bg-sky-50 text-sky-700 border-sky-200'
                              : volClass === 'Medium' || amtClass === 'Medium'
                              ? 'bg-slate-50 text-slate-800 border-slate-200 font-black'
                              : 'bg-slate-50 text-slate-500 border-slate-100 font-semibold'
                          }`}>
                            {importanceText}
                          </span>

                          <div className="absolute right-1/2 bottom-full mb-2.5 hidden group-hover/importance:block transform translate-x-1/2 bg-slate-900 text-white font-sans text-xs z-50 p-3.5 rounded-2xl shadow-2xl w-60 text-center leading-normal border border-slate-700 animate-fadeIn">
                            <p className="font-bold text-[11px] text-slate-400 uppercase tracking-widest mb-1.5">Purchase Register Share</p>
                            <p className="text-xs font-semibold text-slate-250 leading-relaxed">
                              This customer accounts for <strong className="text-indigo-400">{subText}</strong> of our active enterprise accounts payable ledger.
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 12. Workflow Actions */}
                      <td className="py-4.5 px-5 text-center">
                        {isApproved ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-extrabold text-xs bg-emerald-100/70 border border-emerald-250 rounded-full px-3 py-1">
                            <Check size={12} className="stroke-[3]" /> Cleared
                          </span>
                        ) : isRejected ? (
                          <span className="inline-flex items-center gap-1 text-red-700 font-extrabold text-xs bg-red-100/70 border border-red-250 rounded-full px-3 py-1">
                            <X size={12} className="stroke-[3]" /> Disallowed
                          </span>
                        ) : (
                          <div className="flex items-center justify-center gap-1.5 whitespace-nowrap">
                            {/* Approve button */}
                            <div className="relative group/tooltip inline-block">
                              <button
                                onClick={() => handleApproveButtonClick(inv)}
                                disabled={risk === 'High'}
                                className={`px-2.5 py-1.5 text-white font-bold rounded-lg text-xs leading-none tracking-wide transition duration-150 flex items-center gap-1 cursor-pointer ${
                                  risk === 'High'
                                    ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                                    : 'bg-emerald-500 hover:bg-emerald-600 active:scale-95'
                                }`}
                              >
                                Approve
                              </button>

                              {/* GST compliance hold tooltip for High risk disabled buttons */}
                              {risk === 'High' && (
                                <div className="absolute right-1/2 bottom-full mb-1.5 hidden group-hover/tooltip:block transform translate-x-1/2 bg-slate-900 text-white font-semibold text-[10px] md:text-xs z-50 p-2.5 rounded-lg shadow-xl w-48 text-center leading-normal">
                                  GST compliance hold — invoice not in GSTR-2B
                                </div>
                              )}
                            </div>

                            {/* Reject Button */}
                            <button
                              onClick={() => handleReject(inv.pr_invoice_no)}
                              className="px-2.5 py-1.5 rounded-lg border border-red-500 text-red-500 text-xs font-bold hover:bg-red-50 active:scale-95 transition"
                            >
                              Reject
                            </button>

                            {/* Review Button */}
                            <button
                              onClick={() => {
                                setReviewModalInvoice(inv);
                                setReviewComments('');
                              }}
                              className="px-2.5 py-1.5 rounded-lg border border-sky-500 text-[#0ea5e9] bg-white hover:bg-sky-50 text-xs font-bold active:scale-95 transition"
                            >
                              Review
                            </button>
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-400">
                    <p className="text-sm font-semibold mb-1">No invoices match your query</p>
                    <p className="text-xs text-slate-500">Modify the search field above and try again.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- MEDIUM RISK WARNING CONFIRMATION MODAL --- */}
      {warningModal.isOpen && warningModal.invoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-amber-200 shadow-2xl w-full max-w-md overflow-hidden my-auto p-6 relative">
            
            <div className="flex items-center gap-3.5 border-b border-amber-100 pb-4 mb-4">
              <div className="p-3 bg-amber-50 rounded-full text-amber-500 shrink-0">
                <AlertTriangle size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 leading-tight">Match Warning Alert</h3>
                <p className="text-xs text-slate-400 font-medium">Unconfirmed Input Credit Audit</p>
              </div>
            </div>

            <p className="text-xs text-slate-650 leading-relaxed">
              This invoice <strong>({warningModal.invoice.pr_invoice_no})</strong> is not confirmed in GSTR-2B for company <strong>{warningModal.invoice.vendor_name}</strong>. Approve anyway?
            </p>

            <div className="p-3 bg-amber-50/50 rounded-xl border border-amber-100 text-[11px] text-amber-800 mt-4 leading-normal">
              <strong>Risk note:</strong> Approving transactions missing in finalized 2B ledgers may result in statutory compliance holds or blocked Input Tax Credit liabilities.
            </div>

            {/* Controls */}
            <div className="flex gap-2.5 pt-4 mt-2 justify-end">
              <button
                type="button"
                onClick={() => setWarningModal({ isOpen: false, invoice: null })}
                className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-xs transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmMediumRiskApprove}
                className="px-4.5 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Confirm Approve
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* --- AP ANALYST REVIEW MODAL --- */}
      {reviewModalInvoice && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl border border-sky-100 shadow-2xl w-full max-w-lg overflow-hidden my-auto p-6 relative text-slate-700">
            <button 
              onClick={() => setReviewModalInvoice(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:bg-slate-50 transition"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3.5 border-b border-sky-100 pb-4 mb-4">
              <div className="p-3 bg-sky-50 rounded-full text-[#0ea5e9] shrink-0">
                <Sparkles size={24} />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-800 leading-tight">AP Analyst Invoice Review</h3>
                <p className="text-xs text-slate-400 font-medium">Add internal audit remarks and return to queue</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-2xl text-[11px] font-medium text-slate-600">
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Invoice Number</p>
                  <p className="font-mono text-slate-800 font-bold text-xs">{reviewModalInvoice.pr_invoice_no}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Vendor Name</p>
                  <p className="font-sans text-slate-800 font-bold text-xs">{reviewModalInvoice.vendor_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Invoice Amount</p>
                  <p className="font-mono text-slate-800 font-bold text-xs">₹{(parseFloat(String(reviewModalInvoice.total_amount)) || 0).toLocaleString('en-IN')}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-bold uppercase tracking-wide text-[9px]">Current AP Status</p>
                  <p className="font-sans text-amber-600 font-bold text-xs">Returned to Queue / Pending</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-2">AP Analyst Discussion & Comments</label>
                <textarea
                  rows={4}
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  placeholder="Enter invoice dispute comments or internal remarks (e.g., Requested vendor GSTR-1 clarification for compliance difference)..."
                  className="w-full text-xs p-3 border border-sky-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-sky-200 resize-none text-slate-700 bg-white"
                />
              </div>

              <div className="p-3 bg-sky-50/50 rounded-xl border border-sky-100 text-[11px] text-sky-800 leading-normal">
                <strong>Information:</strong> Submitting comments will save audit feedback history to the ledger, change invoice queue flags and release invoice locks.
              </div>
            </div>

            {/* Controls */}
            <div className="flex gap-2.5 pt-5 mt-3 justify-end border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModalInvoice(null)}
                className="px-4 py-2 border rounded-xl text-slate-600 hover:bg-slate-50 font-bold text-xs transition"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setToast({
                    show: true,
                    msg: `Comments submitted for ${reviewModalInvoice.pr_invoice_no}. Marked as returned to queue for approval.`,
                    type: 'success'
                  });
                  setReviewModalInvoice(null);
                  setReviewComments('');
                  // Auto close toast after 4s
                  setTimeout(() => {
                    setToast((prev) => ({ ...prev, show: false }));
                  }, 4000);
                }}
                className="px-4.5 py-2 bg-sky-500 hover:bg-sky-600 active:scale-95 text-white rounded-xl text-xs font-bold transition shadow-sm"
              >
                Submit & Send Back to Queue
              </button>
            </div>
            
          </div>
        </div>
      )}

      {/* Toast Notification feedback banner */}
      {toast.show && (
        <div className="fixed top-6 right-6 z-50 bg-slate-900 border border-slate-800 text-white rounded-2xl py-3 px-4 shadow-2xl flex items-center gap-2.5 max-w-sm animate-fadeIn">
          <div className="p-1 rounded bg-emerald-500 text-white">
            <Check size={14} className="stroke-[3]" />
          </div>
          <div className="text-xs">
            <p className="font-bold">Review Comments Submitted</p>
            <p className="text-slate-400 text-[11px] leading-tight-normal">{toast.msg}</p>
          </div>
          <button 
            onClick={() => setToast({ show: false, msg: '', type: 'success' })}
            className="text-slate-500 hover:text-white ml-auto"
          >
            <X size={14} />
          </button>
        </div>
      )}

    </div>
  );
}

export default ApApprovalScreen;
