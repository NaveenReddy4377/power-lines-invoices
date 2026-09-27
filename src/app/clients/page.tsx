'use client';

import { useState, useEffect } from 'react';
import { Client } from '@/types';
import { getClients, saveClient, saveBulkClients } from '@/app/actions';
import FailureModal from '@/components/FailureModal';
import { Users, Plus, Save, X, Building2, Search, MapPin, Hash, Check, Code } from 'lucide-react';

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [failureModal, setFailureModal] = useState<{ isOpen: boolean; message: string; details?: string; onRetry?: () => void }>({
    isOpen: false,
    message: '',
    details: ''
  });

  useEffect(() => {
    loadClients();
  }, []);

  async function loadClients() {
    setIsLoading(true);
    try {
      const data = await getClients();
      setClients(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }

  const handleAddNew = () => {
    setEditingClient({
      id: crypto.randomUUID(),
      name: '',
      gstin: '',
      address: '',
      placeOfSupply: 'Telangana'
    });
  };

  const handleSave = async () => {
    if (!editingClient || !editingClient.name.trim()) {
      setFailureModal({
        isOpen: true,
        message: 'Client name is required before saving.',
        details: 'Please fill in the client name field.'
      });
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveClient(editingClient);
      if (res.success) {
        setEditingClient(null);
        await loadClients();
      } else {
        setFailureModal({
          isOpen: true,
          message: `Failed to save client "${editingClient.name}" into Google Sheets.`,
          details: res.error || 'Spreadsheet update error.',
          onRetry: handleSave
        });
      }
    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: `Failed to save client "${editingClient.name}" into Google Sheets.`,
        details: e.message || 'Network error occurred.',
        onRetry: handleSave
      });
    }
    setIsSaving(false);
  };

  const handleImport = async () => {
    if (!importText.trim()) return;
    setIsImporting(true);
    try {
      const res = await saveBulkClients(importText);
      if (res.success) {
        alert(`Successfully imported ${res.inserted} new clients. Skipped ${res.skipped} duplicates.`);
        setShowImport(false);
        setImportText('');
        await loadClients();
      } else {
        setFailureModal({
          isOpen: true,
          message: 'Bulk import of clients to Google Sheets failed.',
          details: res.error || 'Spreadsheet bulk insertion failed.',
          onRetry: handleImport
        });
      }
    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: 'Bulk import of clients to Google Sheets failed.',
        details: e.message || 'Parsing or network error.',
        onRetry: handleImport
      });
    }
    setIsImporting(false);
  };

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.gstin.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-slate-50 font-sans text-slate-800 flex flex-col pt-8 px-6 lg:px-12 pb-20 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Client Directory</h1>
            </div>
            <p className="text-sm text-slate-500 mt-2 font-medium ml-13">Manage recurring customers and billing profiles.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowImport(true)}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm transition-all active:scale-95"
            >
              <Code className="w-4 h-4" /> Import JSON
            </button>
            <button 
              onClick={handleAddNew}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm shadow-blue-200 transition-all active:scale-95"
            >
              <Plus className="w-4 h-4" /> Add New Client
            </button>
          </div>
        </div>

        {/* Bulk Import Modal */}
        {showImport && (
          <div className="bg-white border border-purple-200 rounded-2xl shadow-xl shadow-purple-900/5 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Code className="w-5 h-5 text-purple-600" />
                Bulk Import Clients (JSON)
              </h3>
              <button onClick={() => setShowImport(false)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-slate-500 mb-4">Paste an array of client objects here. We expect <code className="bg-slate-100 text-slate-600 px-1 py-0.5 rounded">[{'{'} "name": "", "gstin": "", "address": "" {'}'}]</code> format. Duplicates with identical names will be skipped.</p>
            
            <textarea 
              rows={8}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-purple-500 outline-none transition-all font-mono text-xs leading-relaxed"
              value={importText}
              onChange={e => setImportText(e.target.value)}
              placeholder='[ { "name": "Company A", "gstin": "...", "address": "..." } ]'
            />

            <div className="mt-4 flex justify-end">
              <button 
                onClick={handleImport}
                disabled={isImporting || !importText.trim()}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isImporting ? <span className="animate-pulse">Importing to Spreadsheet...</span> : <><Save className="w-4 h-4" /> Process Import</>}
              </button>
            </div>
          </div>
        )}

        {/* Edit Modal / Form */}
        {editingClient && (
          <div className="bg-white border border-blue-200 rounded-2xl shadow-xl shadow-blue-900/5 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-500" />
                {clients.find(c => c.id === editingClient.id) ? 'Edit Client' : 'New Client'}
              </h3>
              <button onClick={() => setEditingClient(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Company / Client Name</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all font-semibold"
                  value={editingClient.name}
                  onChange={e => setEditingClient({...editingClient, name: e.target.value})}
                  placeholder="e.g. Apex Pharma Ltd."
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">GSTIN Number</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all font-mono uppercase"
                  value={editingClient.gstin}
                  onChange={e => setEditingClient({...editingClient, gstin: e.target.value})}
                  placeholder="22AAAAA0000A1Z5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Place of Supply</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  value={editingClient.placeOfSupply}
                  onChange={e => setEditingClient({...editingClient, placeOfSupply: e.target.value})}
                />
              </div>

              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Full Address</label>
                <textarea 
                  rows={2}
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm leading-relaxed"
                  value={editingClient.address}
                  onChange={e => setEditingClient({...editingClient, address: e.target.value})}
                  placeholder="Billing address goes here..."
                />
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save className="w-4 h-4" /> Save Profile</>}
              </button>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-4 bg-white p-2 border border-slate-200 rounded-2xl shadow-sm">
          <div className="flex-1 relative flex items-center">
            <Search className="w-5 h-5 text-slate-400 absolute left-4" />
            <input 
              type="text" 
              placeholder="Search clients by name or GSTIN..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none pl-12 pr-4 py-2 text-slate-700 font-medium placeholder-slate-400"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="py-20 text-center font-medium text-slate-400 animate-pulse">Loading clients...</div>
        ) : filteredClients.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
            <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">No clients found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different search or add a new client.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredClients.map(client => (
              <div 
                key={client.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-blue-300 hover:shadow-lg hover:shadow-blue-900/5 transition-all group flex flex-col"
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-lg shrink-0">
                    {client.name.charAt(0).toUpperCase()}
                  </div>
                  <button 
                    onClick={() => setEditingClient(client)}
                    className="text-xs font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 hover:bg-blue-100 hover:text-blue-600 px-3 py-1 rounded-full"
                  >
                    Edit
                  </button>
                </div>
                
                <h3 className="font-extrabold text-slate-800 text-lg leading-tight mb-1 truncate" title={client.name}>
                  {client.name}
                </h3>
                
                <div className="space-y-1 mt-auto overflow-hidden">
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                    <Hash className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{client.gstin || 'No GSTIN'}</span>
                  </div>
                  <div className="flex items-start gap-2 text-xs text-slate-500 mt-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{client.address || 'No Address'}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failure Popup for Clients */}
      <FailureModal
        isOpen={failureModal.isOpen}
        onClose={() => setFailureModal(prev => ({ ...prev, isOpen: false }))}
        message={failureModal.message}
        details={failureModal.details}
        onRetry={failureModal.onRetry}
      />
    </div>
  );
}
