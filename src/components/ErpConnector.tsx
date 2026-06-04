/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Database, Link2, X, Check, Globe, Shield } from 'lucide-react';

interface ErpConnectorProps {
  id: 'sap' | 'oracle' | 'msDynamics' | 'tally';
  name: string;
  status: 'Connected' | 'Not Configured';
  onConfigure: (host: string | null) => void;
  configuredHost?: string;
}

export function ErpConnector({ id, name, status, onConfigure, configuredHost }: ErpConnectorProps) {
  const [showForm, setShowForm] = useState(false);
  const [host, setHost] = useState(configuredHost || '');
  const [apiKey, setApiKey] = useState('');
  const [orgId, setOrgId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!host) return;

    setIsSubmitting(true);
    // Simulate integration check
    setTimeout(() => {
      onConfigure(host);
      setIsSubmitting(false);
      setShowForm(false);
    }, 850);
  };

  const handleDisconnect = () => {
    onConfigure(null);
    setHost('');
    setApiKey('');
    setOrgId('');
  };

  return (
    <div 
      className="bg-white rounded-xl border border-sky-100 p-4 transition-all duration-300 hover:border-sky-300 hover:shadow-sm"
      id={`erp-card-${id}`}
    >
      <div className="flex items-center justify-between">
        {/* Left side: ERP Name */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-slate-50 text-slate-500">
            <Database size={18} />
          </div>
          <div>
            <h4 className="font-semibold text-slate-800 text-sm leading-tight">{name}</h4>
            {status === 'Connected' && configuredHost && (
              <span className="text-[10px] text-slate-400 block truncate max-w-[120px]" title={configuredHost}>
                {configuredHost.replace(/^https?:\/\//, '')}
              </span>
            )}
          </div>
        </div>

        {/* Right side: Status and Config Link */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-1.5">
            <span 
              className={`h-2.5 w-2.5 rounded-full ${
                status === 'Connected' ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'
              }`}
            />
            <span className="text-xs font-medium text-slate-600">
              {status}
            </span>
          </div>

          {status === 'Connected' ? (
            <button
              onClick={handleDisconnect}
              className="text-xs font-semibold text-red-500 hover:text-red-700 bg-red-50/50 hover:bg-red-50 px-2 py-0.5 rounded transition"
            >
              Disconnect
            </button>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="text-xs font-semibold text-sky-500 hover:text-sky-700 hover:underline cursor-pointer"
            >
              Configure
            </button>
          )}
        </div>
      </div>

      {/* Inline Configuration Portal */}
      {showForm && (
        <div className="mt-4 border-t border-sky-100 pt-4 animate-fadeIn">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Link2 size={12} className="text-sky-500" />
              Configure {name} Setup
            </span>
            <button 
              onClick={() => setShowForm(false)}
              className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <X size={14} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                <Globe size={10} /> ERP Instance Server Endpoint *
              </label>
              <input
                type="url"
                required
                placeholder="https://sap-erp.company.com/api"
                value={host}
                onChange={(e) => setHost(e.target.value)}
                className="w-full text-xs px-2.5 py-1.5 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder-slate-300 bg-slate-50/50 focus:bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                  Organization ID
                </label>
                <input
                  type="text"
                  placeholder="ORG-2026"
                  value={orgId}
                  onChange={(e) => setOrgId(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder-slate-300"
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-slate-500 flex items-center gap-1 mb-1">
                  <Shield size={10} /> API Credential Key
                </label>
                <input
                  type="password"
                  placeholder="••••••••••••"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full text-xs px-2.5 py-1.5 border border-sky-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 placeholder-slate-300"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-1 justify-end">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-3.5 py-1.5 bg-sky-500 text-white rounded-lg text-xs font-semibold hover:bg-sky-600 disabled:opacity-50 flex items-center gap-1 transition shadow-sm"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-2.5 h-2.5 border-2 border-white/30 border-t-white rounded-full animate-spin pr-[1px]" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Check size={12} />
                    Establish Connection
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
