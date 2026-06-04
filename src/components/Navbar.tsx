/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RefreshCw, ArrowRightLeft, FileCheck, Menu, X, BarChart3 } from 'lucide-react';
import { useApp } from '../context/AppContext';

export function Navbar() {
  const { activeScreen, setActiveScreen, setUpdateModalOpen } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  return (
    <nav 
      className="w-full bg-white border-b border-[#bae6fd] sticky top-0 z-40 px-4 sm:px-6 md:px-8 font-sans"
      id="top-navigation-bar"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between h-16">
        {/* Left side: Logo */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <img 
            src="https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcQkJ0BvMUPR4gW4BLu3sD1VWmuglPKX_YHpog&s" 
            alt="iAPX" 
            style={{ height: '36px', objectFit: 'contain' }}
            className="cursor-pointer hover:opacity-90 active:scale-95 transition"
            onClick={() => setActiveScreen('reconciliation')}
          />
        </div>

        {/* Center: Navigation Links Desktop */}
        <div className="hidden md:flex items-center justify-center space-x-8 absolute left-1/2 transform -translate-x-1/2">
          <button
            onClick={() => setActiveScreen('reconciliation')}
            id="nav-link-reconciliation"
            className={`relative py-5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeScreen === 'reconciliation'
                ? 'text-[#0ea5e9] font-bold'
                : 'text-[#64748b] hover:text-[#0ea5e9]'
            }`}
          >
            Reconciliation
            {activeScreen === 'reconciliation' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0ea5e9] rounded-t-full transition-all duration-300" />
            )}
          </button>

          <button
            onClick={() => setActiveScreen('cfoDashboard')}
            id="nav-link-cfodashboard"
            className={`relative py-5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeScreen === 'cfoDashboard'
                ? 'text-[#0ea5e9] font-bold'
                : 'text-[#64748b] hover:text-[#0ea5e9]'
            }`}
          >
            CFO Dashboard
            {activeScreen === 'cfoDashboard' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0ea5e9] rounded-t-full transition-all duration-300" />
            )}
          </button>

          <button
            onClick={() => setActiveScreen('apApproval')}
            id="nav-link-apapproval"
            className={`relative py-5 text-sm font-semibold transition-all duration-200 cursor-pointer ${
              activeScreen === 'apApproval'
                ? 'text-[#0ea5e9] font-bold'
                : 'text-[#64748b] hover:text-[#0ea5e9]'
            }`}
          >
            AP Approval
            {activeScreen === 'apApproval' && (
              <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#0ea5e9] rounded-t-full transition-all duration-300" />
            )}
          </button>
        </div>

        {/* Right side: Action Controls (Update Data) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => setUpdateModalOpen(true)}
            id="update-data-action-btn"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg border border-[#0ea5e9] text-[#0ea5e9] text-xs font-bold hover:bg-[#e0f2fe] bg-white cursor-pointer select-none active:scale-95 transition duration-200 shadow-sm"
          >
            <RefreshCw size={12} className="text-[#0ea5e9]" />
            Update Data
          </button>
        </div>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          {/* Mobile update button */}
          <button
            onClick={() => setUpdateModalOpen(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-[#0ea5e9] text-[#0ea5e9] text-[11px] font-bold bg-white"
          >
            <RefreshCw size={10} />
            Update
          </button>

          {/* Toggle Menu */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-slate-500 hover:text-[#0ea5e9] hover:bg-[#e0f2fe] rounded-lg transition"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-[#bae6fd] py-3 bg-white space-y-2 flex flex-col items-stretch absolute left-0 right-0 border-b shadow-md z-50 animate-fadeIn">
          <button
            onClick={() => {
              setActiveScreen('reconciliation');
              setMobileMenuOpen(false);
            }}
            className={`px-6 py-2.5 text-left text-sm font-semibold flex items-center gap-2 ${
              activeScreen === 'reconciliation'
                ? 'bg-[#e0f2fe] text-[#0ea5e9]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <ArrowRightLeft size={16} />
            Reconciliation
          </button>

          <button
            onClick={() => {
              setActiveScreen('cfoDashboard');
              setMobileMenuOpen(false);
            }}
            className={`px-6 py-2.5 text-left text-sm font-semibold flex items-center gap-2 ${
              activeScreen === 'cfoDashboard'
                ? 'bg-[#e0f2fe] text-[#0ea5e9]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BarChart3 size={16} />
            CFO Dashboard
          </button>

          <button
            onClick={() => {
              setActiveScreen('apApproval');
              setMobileMenuOpen(false);
            }}
            className={`px-6 py-2.5 text-left text-sm font-semibold flex items-center gap-2 ${
              activeScreen === 'apApproval'
                ? 'bg-[#e0f2fe] text-[#0ea5e9]'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <FileCheck size={16} />
            AP Approval
          </button>
        </div>
      )}
    </nav>
  );
}
export default Navbar;
