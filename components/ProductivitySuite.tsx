
import React, { useState, useMemo } from 'react';

interface ToolProps { onOpenAI: () => void; }

const ProductivitySuite: React.FC<ToolProps> = ({ onOpenAI }) => {
  const isDark = document.documentElement.classList.contains('dark');
  const [activeTool, setActiveTool] = useState('ledger');

  // Ledger Logic
  const [ledgerEntries, setLedgerEntries] = useState<{ id: number; amt: number; side: 'DR' | 'CR'; label: string }[]>([]);
  const [ledgerAmt, setLedgerAmt] = useState('');
  const [ledgerLabel, setLedgerLabel] = useState('');
  
  // Ratio Engine Logic
  const [ca, setCa] = useState('');
  const [cl, setCl] = useState('');

  const tools = [
    { id: 'ledger', name: 'T-Ledger Node', icon: '📓', desc: 'Double-entry auditor' },
    { id: 'ratios', name: 'Ratio Intelligence', icon: '📊', desc: 'Liquidity & Solvency' },
    { id: 'partnership', name: 'PSR Allocator', icon: '🤝', desc: 'Gaining & Sacrificing' },
    { id: 'goodwill', name: 'Goodwill Valuer', icon: '💎', desc: 'Super Profit Engine' },
    { id: 'shares', name: 'Forfeiture Node', icon: '⛓️', desc: 'Pro-rata & Reissue' },
    { id: 'iod', name: 'Interest Driller', icon: '🕒', desc: 'IOD/IOC Calculations' },
    { id: 'revaluation', name: 'Reval Expert', icon: '🏠', desc: 'Asset/Liability Reval' },
    { id: 'realization', name: 'Realization Hub', icon: '🚪', desc: 'Dissolution P/L' },
    { id: 'depr', name: 'Asset Engine', icon: '🏗️', desc: 'SLM vs WDV Logic' },
    { id: 'gst', name: 'GST Matcher', icon: '📑', desc: 'ITC Credit Auditor' },
    { id: 'comparative', name: 'Statement Node', icon: '⚖️', desc: 'Common Size Trends' },
    { id: 'inventory', name: 'Valuation Node', icon: '📦', desc: 'FIFO/LIFO Simulator' },
    { id: 'pdd', name: 'Provision Hub', icon: '🛡️', desc: 'Bad Debt Estimator' },
    { id: 'cashflow', name: 'Flow Forecaster', icon: '🌊', desc: 'Operating/Financing' },
    { id: 'capital', name: 'Working Capital', icon: '⚙️', desc: 'Operating Cycles' },
    { id: 'npo', name: 'NPO Receipts', icon: '🎗️', desc: 'Fund-based accounting' },
    { id: 'debentures', name: 'Redemption Node', icon: '🎫', desc: 'Sinking Fund Logic' },
    { id: 'final_accounts', name: 'Finalizer', icon: '🏁', desc: 'Balance Sheet Node' },
    { id: 'gains', name: 'Capital Gains', icon: '📈', desc: 'Share Transaction Tax' },
    { id: 'audit', name: 'Audit Trail', icon: '📜', desc: 'Reconciliation Log' },
  ];

  const currentRatio = useMemo(() => {
    const a = parseFloat(ca), l = parseFloat(cl);
    return (l !== 0 && !isNaN(a)) ? (a / l).toFixed(2) : '0.00';
  }, [ca, cl]);

  const addLedgerEntry = (side: 'DR' | 'CR') => {
    const val = parseFloat(ledgerAmt);
    if (!isNaN(val)) {
      setLedgerEntries([...ledgerEntries, { id: Date.now(), amt: val, side, label: ledgerLabel || 'Journal' }]);
      setLedgerAmt('');
      setLedgerLabel('');
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 lg:gap-10 items-start">
      
      {/* TOOL SELECTOR - Laptop: Sidebar Grid, Mobile: Scrollable horizontal list */}
      <div className="col-span-12 lg:col-span-4 xl:col-span-3 order-2 lg:order-1">
        <div className="flex lg:flex-col gap-4 overflow-x-auto lg:overflow-y-auto lg:max-h-[800px] pb-4 lg:pb-0 hide-scrollbar scroll-smooth">
          {tools.map((t, idx) => (
            <button 
              key={t.id} 
              onClick={() => setActiveTool(t.id)}
              className={`flex-shrink-0 w-64 lg:w-full p-6 rounded-[2rem] text-left transition-all flex items-center space-x-4 border animate-slide-up group ${
                activeTool === t.id 
                ? 'bg-blue-600 border-blue-500 text-white shadow-2xl shadow-blue-600/30 lg:translate-x-4' 
                : 'bg-white dark:bg-zinc-950 border-black/5 dark:border-white/5 hover:border-blue-500/50'
              }`}
              style={{ animationDelay: `${idx * 0.03}s` }}
            >
              <span className={`text-2xl transition-transform group-hover:scale-110 ${activeTool === t.id ? 'scale-110' : ''}`}>{t.icon}</span>
              <div className="flex-1 overflow-hidden">
                <p className="text-[10px] font-black uppercase tracking-widest">{t.name}</p>
                <p className={`text-[8px] font-bold mt-1 opacity-50 truncate ${activeTool === t.id ? 'text-white/80' : ''}`}>{t.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* MAIN TOOL WORKSPACE */}
      <div className={`col-span-12 lg:col-span-8 xl:col-span-9 p-8 sm:p-14 lg:p-20 rounded-[3rem] sm:rounded-[4rem] border apple-card min-h-[600px] flex flex-col order-1 lg:order-2 ${isDark ? 'bg-zinc-950 border-white/5' : 'bg-white border-black/5 shadow-2xl shadow-blue-500/5'}`}>
         
         <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12 sm:mb-16">
            <div>
               <h4 className="text-4xl sm:text-6xl font-black tracking-tighter uppercase italic opacity-10">{activeTool.replace('_', ' ')} Node</h4>
               <p className="text-[10px] font-black text-blue-500 uppercase tracking-[0.5em] mt-2">Analytical State: 100% Secure</p>
            </div>
            <button 
              onClick={onOpenAI} 
              className="px-8 py-4 rounded-full bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-500/30 hover:scale-105 active:scale-95 transition-all flex items-center justify-center space-x-2"
            >
               <span>✨</span> <span>Deep AI Audit</span>
            </button>
         </div>

         <div className="flex-1 animate-fade">
           {activeTool === 'ledger' && (
             <div className="flex flex-col h-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                   <input 
                     value={ledgerLabel} 
                     onChange={e => setLedgerLabel(e.target.value)} 
                     placeholder="Transaction Narrative..." 
                     className={`p-5 rounded-2xl border outline-none font-bold text-sm ${isDark ? 'bg-black border-white/5 text-white focus:border-blue-600' : 'bg-zinc-50 border-black/5 focus:border-blue-600'}`} 
                   />
                   <div className="flex space-x-2">
                      <input 
                        type="number" 
                        value={ledgerAmt} 
                        onChange={e => setLedgerAmt(e.target.value)} 
                        placeholder="Amt..." 
                        className={`w-full p-5 rounded-2xl border outline-none font-bold text-sm ${isDark ? 'bg-black border-white/5 text-white' : 'bg-zinc-50 border-black/5'}`} 
                      />
                      <button onClick={() => addLedgerEntry('DR')} className="px-6 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-blue-700 transition-colors">DR</button>
                      <button onClick={() => addLedgerEntry('CR')} className="px-6 rounded-2xl bg-zinc-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-colors">CR</button>
                   </div>
                </div>
                
                <div className="flex-1 grid grid-cols-2 divide-x-2 divide-black/5 dark:divide-white/10 min-h-[300px] overflow-y-auto mb-10 pr-2 hide-scrollbar">
                   <div className="pr-6 sm:pr-10 text-right space-y-4">
                      <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.4em] text-blue-600 mb-6">Debit Column</p>
                      {ledgerEntries.filter(e => e.side === 'DR').map(e => <div key={e.id} className="font-bold flex justify-between text-sm animate-slide-up"><span className="opacity-40 italic text-[10px] truncate max-w-[100px]">{e.label}</span> <span>{e.amt.toLocaleString()}</span></div>)}
                   </div>
                   <div className="pl-6 sm:pl-10 space-y-4">
                      <p className="text-[9px] font-black opacity-30 uppercase tracking-[0.4em] text-zinc-500 mb-6">Credit Column</p>
                      {ledgerEntries.filter(e => e.side === 'CR').map(e => <div key={e.id} className="font-bold flex justify-between text-sm animate-slide-up"><span>{e.amt.toLocaleString()}</span> <span className="opacity-40 italic text-[10px] truncate max-w-[100px]">{e.label}</span></div>)}
                   </div>
                </div>
                
                <div className="p-8 sm:p-10 rounded-[2.5rem] bg-zinc-100 dark:bg-black/40 border border-black/5 dark:border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4">
                   <p className="text-[10px] font-black uppercase tracking-[0.5em] opacity-30">Status: Balanced Tracking</p>
                   <p className={`text-4xl sm:text-5xl font-black tracking-tighter tabular-nums ${ledgerEntries.reduce((a,b) => a + (b.side==='DR' ? b.amt : -b.amt), 0) === 0 ? 'text-green-500' : 'text-blue-600'}`}>
                    {ledgerEntries.reduce((a,b) => a + (b.side==='DR' ? b.amt : -b.amt), 0).toLocaleString()}
                   </p>
                </div>
             </div>
           )}

           {activeTool === 'ratios' && (
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10 lg:gap-16">
                <div className="space-y-8">
                   <div className="space-y-3">
                      <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.5em]">Current Assets</p>
                      <input type="number" value={ca} onChange={e => setCa(e.target.value)} className={`w-full p-6 sm:p-8 rounded-[2rem] border outline-none font-black text-xl sm:text-2xl ${isDark ? 'bg-black border-white/5 text-white' : 'bg-zinc-50 border-black/5'}`} />
                   </div>
                   <div className="space-y-3">
                      <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.5em]">Current Liabilities</p>
                      <input type="number" value={cl} onChange={e => setCl(e.target.value)} className={`w-full p-6 sm:p-8 rounded-[2rem] border outline-none font-black text-xl sm:text-2xl ${isDark ? 'bg-black border-white/5 text-white' : 'bg-zinc-50 border-black/5'}`} />
                   </div>
                </div>
                <div className="flex flex-col items-center justify-center p-12 lg:p-16 rounded-[4rem] bg-blue-600/5 border-2 border-dashed border-blue-600/20 text-center relative overflow-hidden group">
                   <div className="absolute inset-0 bg-blue-600 opacity-0 group-hover:opacity-[0.02] transition-opacity"></div>
                   <p className="text-[10px] font-black text-blue-600 uppercase tracking-[0.5em] mb-6">Current Ratio</p>
                   <p className="text-8xl sm:text-[10rem] font-black text-blue-600 tracking-tighter leading-none">{currentRatio}</p>
                   <p className="text-[9px] font-bold text-blue-500 uppercase mt-8 tracking-widest opacity-60">Ideal Standard 2.00:1</p>
                </div>
             </div>
           )}

           {!['ledger', 'ratios'].includes(activeTool) && (
             <div className="flex-1 flex flex-col items-center justify-center py-20 opacity-30 text-center animate-fade">
                <div className="w-24 h-24 rounded-full bg-blue-600/10 flex items-center justify-center text-5xl mb-10 shadow-inner">
                  {tools.find(t => t.id === activeTool)?.icon || '⚙️'}
                </div>
                <p className="text-2xl sm:text-3xl font-black uppercase tracking-tighter">{activeTool.replace('_', ' ')} Logic Node</p>
                <p className="text-[10px] font-bold mt-4 uppercase tracking-[0.6em] max-w-xs mx-auto">This module requires specific AI context calibration in v3.0.</p>
                <button 
                  onClick={onOpenAI} 
                  className="mt-12 px-12 py-5 rounded-full border-2 border-blue-600 text-blue-600 font-black text-[10px] uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all shadow-lg hover:shadow-blue-500/20"
                >
                  Sync with AI Consultant
                </button>
             </div>
           )}
         </div>
      </div>

    </div>
  );
};

export default ProductivitySuite;
