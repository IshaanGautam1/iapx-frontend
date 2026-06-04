/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { useApp } from '../context/AppContext';
import { 
  ShieldCheck, 
  AlertTriangle, 
  HelpCircle, 
  TrendingUp, 
  Building2, 
  ArrowUpRight, 
  Receipt,
  Download,
  AlertCircle,
  FileBarChart2,
  Calendar
} from 'lucide-react';

export function CfoDashboardScreen() {
  const { prData, vendorProfiles, matchResults, summary } = useApp();

  // Helper to fallback / extract clean status
  const getStatus = (inv: any): string => {
    return (inv.match_status || inv.status || '').trim();
  };

  // Simple dynamic frontend date calculations for countdown cards:
  const getGstr3bDeadline = () => {
    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    
    let deadlineYear = todayZero.getFullYear();
    let deadlineMonth = todayZero.getMonth(); // 0-indexed
    
    // If today's date is on or before the 20th of current month, deadline is 20th of current month
    if (todayZero.getDate() <= 20) {
      // Kept current month & year
    } else {
      // Deadline is the 20th of next month
      deadlineMonth += 1;
      if (deadlineMonth > 11) {
        deadlineMonth = 0;
        deadlineYear += 1;
      }
    }
    
    const deadline = new Date(deadlineYear, deadlineMonth, 20);
    const diffTime = deadline.getTime() - todayZero.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    const monthNames = [
      "January", "February", "March", "April", "May", "June", 
      "July", "August", "September", "October", "November", "December"
    ];
    const formattedDeadline = `Due: 20 ${monthNames[deadlineMonth]} ${deadlineYear}`;
    
    return {
      daysRemaining,
      formattedDeadline
    };
  };

  const getSec16Deadline = () => {
    const today = new Date();
    const todayZero = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    // Fixed: 30 November 2026
    const deadline = new Date(2026, 10, 30); // November is month 10 in JS (0-indexed)
    
    const diffTime = deadline.getTime() - todayZero.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    return {
      daysRemaining,
      formattedDeadline: "Due: 30 November 2026"
    };
  };

  const gstr3b = getGstr3bDeadline();
  const sec16 = getSec16Deadline();

  // 1. Compute ITC Summary Cards Data
  let itcSecured = 0;
  let itcAtRisk = 0;
  let itcPendingReview = 0;
  let totalGstInPr = 0;

  (prData || []).forEach((inv) => {
    const gstAmount = Number(inv.gst_amount) || 0;
    const status = getStatus(inv);
    totalGstInPr += gstAmount;
    
    if (status === 'Fully Matched' || status === 'Matched') {
      itcSecured += gstAmount;
    } else if (status === 'Missing') {
      itcAtRisk += gstAmount;
    } else if (status === 'AI Matched' || status === 'AI Probable Match') {
      itcPendingReview += gstAmount;
    }
  });

  // 2. Compute Vendor Risk Table Data
  const profilesArray = Array.isArray(vendorProfiles)
    ? vendorProfiles
    : (vendorProfiles ? Object.values(vendorProfiles) : []);

  const vendorRiskData = profilesArray.map((vendor: any) => {
    const vGstin = vendor.gstin || vendor.vendorGstin || '';
    
    // Sum of gst_amount from prData where gstin matches and match_status === 'Missing'
    const matchingPrInvoices = (prData || []).filter((inv) => {
      const invGstin = inv.gstin || '';
      const invStatus = getStatus(inv);
      return invGstin === vGstin && invStatus === 'Missing';
    });
    
    const itcAtRiskVal = matchingPrInvoices.reduce((sum, inv) => sum + (Number(inv.gst_amount) || 0), 0);
    
    return {
      ...vendor,
      computedItcAtRisk: itcAtRiskVal,
    };
  });

  // Sort by ITC At Risk descending
  vendorRiskData.sort((a, b) => b.computedItcAtRisk - a.computedItcAtRisk);

  // 3. Invoice Status Breakdown Computations
  const totalInvoicesCount = summary.totalInvoices || prData.length || 1;
  const fullyMatchedCount = summary.fullyMatched ?? (prData || []).filter(i => getStatus(i) === 'Fully Matched' || getStatus(i) === 'Matched').length;
  const aiMatchedCount = summary.aiMatched ?? (prData || []).filter(i => getStatus(i) === 'AI Matched').length;
  const aiProbableCount = summary.aiProbableMatch ?? (prData || []).filter(i => getStatus(i) === 'AI Probable Match').length;
  const missingCount = summary.missing ?? (prData || []).filter(i => getStatus(i) === 'Missing').length;

  const fullyMatchedPct = (fullyMatchedCount / totalInvoicesCount) * 100;
  const aiMatchedPct = (aiMatchedCount / totalInvoicesCount) * 100;
  const aiProbablePct = (aiProbableCount / totalInvoicesCount) * 100;
  const missingPct = (missingCount / totalInvoicesCount) * 100;

  const fullyMatchedGst = (prData || []).filter(i => getStatus(i) === 'Fully Matched' || getStatus(i) === 'Matched').reduce((sum, i) => sum + (Number(i.gst_amount) || 0), 0);
  const aiMatchedGst = (prData || []).filter(i => getStatus(i) === 'AI Matched').reduce((sum, i) => sum + (Number(i.gst_amount) || 0), 0);
  const aiProbableGst = (prData || []).filter(i => getStatus(i) === 'AI Probable Match').reduce((sum, i) => sum + (Number(i.gst_amount) || 0), 0);
  const missingGst = (prData || []).filter(i => getStatus(i) === 'Missing').reduce((sum, i) => sum + (Number(i.gst_amount) || 0), 0);

  // 4. Top 5 Vendors by ITC At Risk
  const top5RiskVendors = vendorRiskData
    .filter(v => v.computedItcAtRisk > 0)
    .slice(0, 5);

  const formatPercentage = (val: number) => {
    return val.toLocaleString('en-IN', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
  };

  const formatCurrency = (amount: number) => {
    return '₹' + amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const getFilingRateText = (profile: any) => {
    if (profile.filing_rate !== undefined) {
      const rateNum = Number(profile.filing_rate) || 0;
      const ratePct = profile.filing_rate_pct !== undefined 
        ? profile.filing_rate_pct 
        : Math.round((rateNum / 6) * 100);
      return `${ratePct}% (${rateNum}/6 M)`;
    }
    return 'N/A';
  };

  return (
    <div className="py-6 px-4 sm:py-8 sm:px-6 md:px-8 max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-fadeIn" id="cfo-dashboard-container">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-sky-100 pb-5">
        <div>
          <div className="flex items-center gap-2 text-[#0ea5e9]">
            <FileBarChart2 size={20} className="stroke-[2.5]" />
            <span className="text-xs font-black uppercase tracking-wider">CFO Analytics Workbench</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-800 tracking-tight mt-1">CFO Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-500 font-medium">Real-time Input Tax Credit (ITC) optimization ledger & compliance summary</p>
        </div>
        <div className="flex items-center gap-2 border border-sky-100 bg-white shadow-sm p-3 rounded-2xl self-start sm:self-auto text-xs text-slate-600 font-bold">
          <Calendar size={14} className="text-[#0ea5e9]" />
          <span>Filing Period: April 2026 (Reflected in 2A/2B)</span>
        </div>
      </div>

      {/* SECTION 1 — ITC Summary Cards (top row, 4 cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="cfo-summary-cards">
        
        {/* Card 1: ITC Secured (green) */}
        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-sm flex flex-col justify-between hover:shadow transition duration-200" id="card-itc-secured">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-2 py-1 rounded">ITC Secured</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-500">
              <ShieldCheck size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-emerald-700 font-mono tracking-tight">
              {formatCurrency(itcSecured)}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Fully matched invoices, ITC claimable</p>
          </div>
        </div>

        {/* Card 2: ITC At Risk (red) */}
        <div className="bg-white rounded-2xl p-5 border border-rose-100 shadow-sm flex flex-col justify-between hover:shadow transition duration-200" id="card-itc-at-risk">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-rose-600 uppercase tracking-wider bg-rose-50 px-2 py-1 rounded">ITC At Risk</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-500">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-rose-600 font-mono tracking-tight">
              {formatCurrency(itcAtRisk)}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Invoices not found in GSTR-2A</p>
          </div>
        </div>

        {/* Card 3: ITC Pending Review (amber) */}
        <div className="bg-white rounded-2xl p-5 border border-amber-100 shadow-sm flex flex-col justify-between hover:shadow transition duration-200" id="card-itc-pending">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-amber-600 uppercase tracking-wider bg-amber-50 px-2 py-1 rounded">Pending Review</span>
            <div className="p-2 bg-amber-50 rounded-xl text-amber-500">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-amber-700 font-mono tracking-tight">
              {formatCurrency(itcPendingReview)}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Requires manual verification</p>
          </div>
        </div>

        {/* Card 4: Total GST in PR (blue) */}
        <div className="bg-white rounded-2xl p-5 border border-sky-100 shadow-sm flex flex-col justify-between hover:shadow transition duration-200" id="card-total-gst">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-sky-600 uppercase tracking-wider bg-sky-50 px-2 py-1 rounded">Total GST in PR</span>
            <div className="p-2 bg-sky-50 rounded-xl text-sky-500">
              <Receipt size={18} />
            </div>
          </div>
          <div className="mt-4">
            <h3 className="text-xl sm:text-2xl font-black text-slate-800 font-mono tracking-tight">
              {formatCurrency(totalGstInPr)}
            </h3>
            <p className="text-[11px] text-slate-500 font-semibold mt-1">Total GST across all PR invoices</p>
          </div>
        </div>

      </div>

      {/* Countdown Row: GSTR-3B & Section 16(4) Timers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="cfo-countdown-row">
        
        {/* Countdown Card 1: GSTR-3B Filing Deadline */}
        <div 
          className={`rounded-2xl p-5 border border-sky-200 shadow-sm flex flex-col justify-between hover:shadow transition duration-200 ${
            gstr3b.daysRemaining < 5 
              ? 'bg-rose-50/90 text-rose-900' 
              : 'bg-amber-50/50 text-amber-900'
          }`}
          id="card-countdown-gstr3b"
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded ${
              gstr3b.daysRemaining < 5 
                ? 'bg-rose-100 text-rose-700' 
                : 'bg-amber-100 text-amber-800'
            }`}>
              GSTR-3B Filing Deadline
            </span>
            <div className={`p-2 rounded-xl ${
              gstr3b.daysRemaining < 5 ? 'bg-rose-100 text-rose-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <Calendar size={18} />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className={`text-2xl sm:text-3xl font-black font-mono tracking-tight ${
                gstr3b.daysRemaining < 5 ? 'text-rose-700' : 'text-amber-700'
              }`}>
                {gstr3b.daysRemaining}
              </span>
              <span className="text-xs font-bold text-slate-500">days remaining</span>
            </div>
            <p className="text-[11px] font-bold font-sans mt-1 text-slate-600">{gstr3b.formattedDeadline}</p>
          </div>

          {gstr3b.daysRemaining < 5 ? (
            <div className="mt-3 text-[10px] font-extrabold text-rose-600 uppercase tracking-wider flex items-center gap-1.5 bg-white/80 border border-rose-200 p-2 rounded-lg animate-pulse shadow-sm">
              <AlertCircle size={12} className="shrink-0 text-rose-600" />
              <span>⚠️ CRITICAL WARNING: Urgent priority filing required immediately to protect client-side Input Tax Credit!</span>
            </div>
          ) : (
            <p className="text-[10px] text-amber-700 mt-3 font-semibold italic">On-track & normal. Status: On-track to meet scheduled statutory deadlines.</p>
          )}
        </div>

        {/* Countdown Card 2: Section 16(4) ITC Expiry */}
        <div 
          className="bg-rose-50 text-rose-900 rounded-2xl p-5 border border-sky-200 shadow-sm flex flex-col justify-between hover:shadow transition duration-200"
          id="card-countdown-sec16"
        >
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-extrabold text-rose-700 uppercase tracking-wider bg-rose-100 px-2 py-0.5 rounded">
              ITC Permanent Expiry (Sec 16(4))
            </span>
            <div className="p-2 bg-rose-100 rounded-xl text-rose-600">
              <AlertTriangle size={18} />
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-black text-rose-700 font-mono tracking-tight">
                {sec16.daysRemaining}
              </span>
              <span className="text-xs font-bold text-slate-500">days remaining</span>
            </div>
            <p className="text-[11px] font-bold font-sans mt-0.5 text-slate-600">{sec16.formattedDeadline}</p>
            <p className="text-[10px] text-rose-600 mt-1 font-bold leading-normal">
              Unresolved ITC will be permanently lost after this date
            </p>
          </div>

          <div className="mt-3 p-2 bg-white/70 rounded-xl border border-rose-200 flex items-center justify-between text-[11px] font-bold">
            <span className="text-rose-800">ITC Currently at Risk:</span>
            <span className="font-mono text-rose-600 font-black">{formatCurrency(itcAtRisk)}</span>
          </div>
        </div>

      </div>

      {/* Middle Row Layout: Visual Breakdown (Section 3) & Top Vendors by ITC Risk (Section 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
        
        {/* SECTION 3 — Invoice Status Breakdown */}
        <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-sky-150 shadow-sm flex flex-col justify-between" id="section-invoice-breakdown">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <TrendingUp size={16} className="text-[#0ea5e9]" />
                Invoice Status Breakdown
              </h2>
              <span className="text-[11px] font-bold text-[#0ea5e9] bg-sky-50 px-2 py-0.5 rounded-full border border-sky-100">
                {totalInvoicesCount} Total Invoices
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-6 font-medium leading-relaxed">
              Consolidated distribution of matched and discrepancy status counters, mapped directly from current purchase registry cycles.
            </p>
          </div>

          <div className="space-y-5">
            {/* Horizontal Bar Visual Stack */}
            <div className="h-6 w-full rounded-xl overflow-hidden flex shadow-inner border border-slate-150" id="visual-breakdown-stacked-bar">
              {fullyMatchedCount > 0 && (
                <div 
                  style={{ width: `${fullyMatchedPct}%` }} 
                  className="bg-emerald-500 h-full transition-all duration-300 hover:opacity-90 relative group cursor-pointer"
                  title={`Fully Matched: ${fullyMatchedCount}`}
                />
              )}
              {aiMatchedCount > 0 && (
                <div 
                  style={{ width: `${aiMatchedPct}%` }} 
                  className="bg-sky-400 h-full transition-all duration-300 hover:opacity-90 relative group cursor-pointer"
                  title={`AI Matched: ${aiMatchedCount}`}
                />
              )}
              {aiProbableCount > 0 && (
                <div 
                  style={{ width: `${aiProbablePct}%` }} 
                  className="bg-amber-400 h-full transition-all duration-300 hover:opacity-90 relative group cursor-pointer"
                  title={`AI Probable Match: ${aiProbableCount}`}
                />
              )}
              {missingCount > 0 && (
                <div 
                  style={{ width: `${missingPct}%` }} 
                  className="bg-rose-500 h-full transition-all duration-300 hover:opacity-90 relative group cursor-pointer"
                  title={`Missing GSTR-2A: ${missingCount}`}
                />
              )}
            </div>

            {/* Structured Breakdown List */}
            <div className="grid grid-cols-2 gap-4 pt-4 text-xs">
              
              <div className="flex flex-col justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/[0.12] hover:bg-emerald-50/[0.2] transition duration-150">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                    <span className="font-extrabold text-slate-800 tracking-tight">Fully Matched</span>
                  </div>
                  <span className="text-emerald-700 bg-emerald-100/80 text-[10px] font-black px-2 py-0.5 rounded-md">
                    {formatPercentage(fullyMatchedPct)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-slate-500 font-bold text-[11px]">{fullyMatchedCount} {fullyMatchedCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="font-mono font-black text-xs text-slate-800">{formatCurrency(fullyMatchedGst)}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-emerald-100/40 text-[10px] text-slate-500 font-bold leading-normal">
                  Guaranteed safe to claim in current filing.
                </div>
              </div>

              <div className="flex flex-col justify-between p-4 rounded-xl border border-sky-100 bg-sky-50/[0.12] hover:bg-sky-50/[0.2] transition duration-150">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shadow-sm" />
                    <span className="font-extrabold text-slate-800 tracking-tight">AI Matched</span>
                  </div>
                  <span className="text-sky-700 bg-sky-100/80 text-[10px] font-black px-2 py-0.5 rounded-md">
                    {formatPercentage(aiMatchedPct)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-slate-500 font-bold text-[11px]">{aiMatchedCount} {aiMatchedCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="font-mono font-black text-xs text-slate-800">{formatCurrency(aiMatchedGst)}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-sky-100/40 text-[10px] text-slate-500 font-bold leading-normal">
                  Minor discrepancies dynamically resolved by AI.
                </div>
              </div>

              <div className="flex flex-col justify-between p-4 rounded-xl border border-amber-100 bg-amber-50/[0.12] hover:bg-amber-50/[0.2] transition duration-150">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-sm" />
                    <span className="font-extrabold text-slate-800 tracking-tight">AI Probable</span>
                  </div>
                  <span className="text-amber-700 bg-amber-100/80 text-[10px] font-black px-2 py-0.5 rounded-md">
                    {formatPercentage(aiProbablePct)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-slate-500 font-bold text-[11px]">{aiProbableCount} {aiProbableCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="font-mono font-black text-xs text-slate-800">{formatCurrency(aiProbableGst)}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-amber-100/40 text-[10px] text-slate-500 font-bold leading-normal">
                  High confidence match. Pending swift human signoff.
                </div>
              </div>

              <div className="flex flex-col justify-between p-4 rounded-xl border border-rose-100 bg-rose-50/[0.12] hover:bg-rose-50/[0.2] transition duration-150">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-400 shadow-sm" />
                    <span className="font-extrabold text-slate-800 tracking-tight">Missing 2A</span>
                  </div>
                  <span className="text-rose-700 bg-rose-100/80 text-[10px] font-black px-2 py-0.5 rounded-md">
                    {formatPercentage(missingPct)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-slate-500 font-bold text-[11px]">{missingCount} {missingCount === 1 ? 'Invoice' : 'Invoices'}</span>
                  <span className="font-mono font-black text-xs text-rose-600">{formatCurrency(missingGst)}</span>
                </div>
                <div className="mt-2.5 pt-2 border-t border-rose-100/40 text-[10px] text-slate-500 font-bold leading-normal">
                  Not uploaded by suppliers. Requires urgent follow up.
                </div>
              </div>

            </div>
          </div>
        </div>

        {/* SECTION 4 — Top Vendors by ITC At Risk */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-sky-150 shadow-sm flex flex-col justify-between" id="section-top-vendors-risk">
          <div>
            <h2 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Building2 size={16} className="text-[#0ea5e9]" />
              Top Vendors by ITC At Risk
            </h2>
            <p className="text-[11px] text-slate-500 mb-6 font-medium leading-relaxed">
              Top 5 corporate accounts ranked descending by their locked or unfiled tax credit volumes that require rapid reconciliation.
            </p>
          </div>

          <div className="space-y-4 font-sans">
            {top5RiskVendors.length > 0 ? (
              top5RiskVendors.map((vendor, index) => {
                const ratio = itcAtRisk > 0 ? (vendor.computedItcAtRisk / itcAtRisk) * 100 : 0;
                return (
                  <div key={vendor.gstin || index} className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs font-bold text-slate-700">
                      <span className="truncate max-w-[160px]" title={vendor.vendor_name}>{vendor.vendor_name}</span>
                      <span className="font-mono text-rose-600">{formatCurrency(vendor.computedItcAtRisk)}</span>
                    </div>
                    
                    {/* Compact relative progress bar */}
                    <div className="relative w-full h-2 rounded bg-slate-100 overflow-hidden shadow-inner flex">
                      <div 
                        style={{ width: `${ratio}%` }} 
                        className="bg-rose-500 h-full rounded transition-all duration-300"
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 font-mono">
                      <span>GSTIN: {vendor.gstin || 'N/A'}</span>
                      <span>{formatPercentage(ratio)} of Total Risk</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="py-8 text-center text-xs text-slate-400 italic">
                No active ITC discrepancy / unfiled risk detected amongst vendor profiles.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* SECTION 2 — Vendor Risk Table */}
      <div className="bg-white rounded-3xl border border-sky-150 shadow-sm overflow-hidden" id="section-vendor-risk-table-container">
        
        {/* Table Title Bar */}
        <div className="p-6 border-b border-sky-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 leading-tight">Vendor Risk Overview</h2>
            <p className="text-xs text-slate-400 font-medium">Interactive register tracking individual compliance standings, audit records, and potential locked statutory claims</p>
          </div>
          <div className="text-xs bg-white border border-sky-100 rounded-xl px-3 py-1.5 font-bold text-slate-600 shadow-sm self-start sm:self-auto uppercase tracking-wide flex items-center gap-1">
            <span>Total Inspected:</span>
            <span className="font-mono font-black text-[#0ea5e9]">{vendorRiskData.length} Vendors</span>
          </div>
        </div>

        {/* Responsive Table Wrap */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse" id="vendor-risk-table-element">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[11px] font-extrabold uppercase tracking-wider">
                <th className="py-4 px-6">Vendor Name</th>
                <th className="py-4 px-5">GSTIN</th>
                <th className="py-4 px-5 text-center">Importance</th>
                <th className="py-4 px-5 text-center">Compliance Rating</th>
                <th className="py-4 px-5 text-center">Filing Rate</th>
                <th className="py-4 px-5 text-center">Prev Month 3B Filed</th>
                <th className="py-4 px-5 text-center">Risk Level</th>
                <th className="py-4 px-6 text-right">ITC At Risk (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
              {vendorRiskData.map((vendor, idx) => {
                const risk = vendor.risk_level || 'Low';
                const hasRisk = vendor.computedItcAtRisk > 0;
                
                // Risk Badge Styles
                let riskBadgeClass = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                if (risk === 'High') {
                  riskBadgeClass = 'bg-rose-50 text-rose-700 border-rose-200';
                } else if (risk === 'Medium') {
                  riskBadgeClass = 'bg-amber-50 text-amber-700 border-amber-200';
                }

                return (
                  <tr key={vendor.gstin || idx} className="hover:bg-slate-50/50 transition">
                    
                    {/* Vendor Name */}
                    <td className="py-4 px-6 font-bold text-slate-800">
                      {vendor.vendor_name || 'Generic Vendor'}
                    </td>

                    {/* GSTIN */}
                    <td className="py-4 px-5 font-mono text-xs text-slate-500 whitespace-nowrap">
                      {vendor.gstin || 'N/A'}
                    </td>

                    {/* Importance */}
                    <td className="py-4 px-5 text-center font-semibold text-slate-600 whitespace-nowrap">
                      {vendor.importance || 'Medium'}
                    </td>

                    {/* Compliance Rating */}
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full font-bold text-[10.5px] ${
                        vendor.compliance_rating === 'Excellent' || vendor.compliance_rating === 'Good'
                          ? 'bg-emerald-50 text-emerald-700'
                          : vendor.compliance_rating === 'Moderate'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-rose-50 text-rose-700'
                      }`}>
                        {vendor.compliance_rating || vendor.compliance || 'Good'}
                      </span>
                    </td>

                    {/* Filing Rate */}
                    <td className="py-4 px-5 text-center font-mono font-bold whitespace-nowrap">
                      {getFilingRateText(vendor)}
                    </td>

                    {/* Prev Month 3B Filed */}
                    <td className="py-4 px-5 text-center whitespace-nowrap font-bold">
                      {vendor.prev_month_3b_filed === 'Yes' || vendor.prev_month_3b_filed === true ? (
                        <span className="text-emerald-500 text-sm" title="Yes">✓</span>
                      ) : (
                        <span className="text-rose-500 text-sm" title="No">✗</span>
                      )}
                    </td>

                    {/* Risk Level */}
                    <td className="py-4 px-5 text-center whitespace-nowrap">
                      <span className={`inline-block px-2.5 py-0.5 rounded border text-[10px] font-extrabold uppercase tracking-wide ${riskBadgeClass}`}>
                        {risk}
                      </span>
                    </td>

                    {/* ITC At Risk */}
                    <td className="py-4 px-6 text-right font-mono font-bold whitespace-nowrap">
                      {hasRisk ? (
                        <span className="text-rose-600 bg-rose-50/80 border border-rose-100 px-2 py-0.5 rounded inline-block font-extrabold">
                          {formatCurrency(vendor.computedItcAtRisk)}
                        </span>
                      ) : (
                        <span className="text-slate-400 font-normal">₹0.00</span>
                      )}
                    </td>

                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>

    </div>
  );
}

export default CfoDashboardScreen;
