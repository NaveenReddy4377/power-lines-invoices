'use client';

import { useState, useEffect } from 'react';
import { InventoryItem } from '@/types';
import { getInventory, saveInventoryItem } from '@/app/actions';
import FailureModal from '@/components/FailureModal';
import { Package, Plus, Save, X, Search, Hash, ScanLine, IndianRupee } from 'lucide-react';

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [failureModal, setFailureModal] = useState<{ isOpen: boolean; message: string; details?: string; onRetry?: () => void }>({
    isOpen: false,
    message: '',
    details: ''
  });

  useEffect(() => {
    loadInventory();
  }, []);

  async function loadInventory() {
    setIsLoading(true);
    try {
      const data = await getInventory();
      setItems(data);
    } catch (e) {
      console.error(e);
    }
    setIsLoading(false);
  }

  const handleAddNew = () => {
    setEditingItem({
      id: crypto.randomUUID(),
      name: '',
      description: '',
      hsn: '9987',
      quantityUnit: 'NOS',
      price: 0
    });
  };

  const handleSave = async () => {
    if (!editingItem || !editingItem.name.trim()) {
      setFailureModal({
        isOpen: true,
        message: 'Item name is required before saving.',
        details: 'Please fill in the Item Name field.'
      });
      return;
    }
    setIsSaving(true);
    try {
      const res = await saveInventoryItem(editingItem);
      if (res.success) {
        setEditingItem(null);
        await loadInventory();
      } else {
        setFailureModal({
          isOpen: true,
          message: `Failed to save inventory item "${editingItem.name}" into Google Sheets.`,
          details: res.error || 'Spreadsheet update error.',
          onRetry: handleSave
        });
      }
    } catch (e: any) {
      setFailureModal({
        isOpen: true,
        message: `Failed to save inventory item "${editingItem.name}" into Google Sheets.`,
        details: e.message || 'Network error occurred.',
        onRetry: handleSave
      });
    }
    setIsSaving(false);
  };

  const filteredItems = items.filter(i => 
    i.name.toLowerCase().includes(search.toLowerCase()) || 
    i.hsn.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-full bg-slate-50 font-sans text-slate-800 flex flex-col pt-8 px-6 lg:px-12 pb-20 overflow-y-auto">
      <div className="max-w-6xl w-full mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
                <Package className="w-5 h-5 text-orange-600" />
              </div>
              <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Inventory Catalog</h1>
            </div>
            <p className="text-sm text-slate-500 mt-2 font-medium ml-13">Pre-fill items easily across all your invoices.</p>
          </div>
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-5 py-2.5 rounded-xl font-bold shadow-sm shadow-orange-200 transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" /> Add Item
          </button>
        </div>

        {/* Edit Modal / Form */}
        {editingItem && (
          <div className="bg-white border border-orange-200 rounded-2xl shadow-xl shadow-orange-900/5 p-6 mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <ScanLine className="w-5 h-5 text-orange-500" />
                {items.find(i => i.id === editingItem.id) ? 'Edit Item' : 'New Item'}
              </h3>
              <button onClick={() => setEditingItem(null)} className="p-1.5 hover:bg-slate-100 rounded-full text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="col-span-1 md:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Item Name / Title</label>
                <input 
                  type="text" 
                  autoFocus
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none transition-all font-semibold"
                  value={editingItem.name}
                  onChange={e => setEditingItem({...editingItem, name: e.target.value})}
                  placeholder="e.g. Rewinding 5HP Motor"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">HSN Code</label>
                <input 
                  type="text" 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-mono"
                  value={editingItem.hsn}
                  onChange={e => setEditingItem({...editingItem, hsn: e.target.value})}
                  placeholder="8501"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Def. Rate (₹)</label>
                  <input 
                    type="number" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all font-semibold text-slate-900"
                    value={editingItem.price === 0 ? '' : editingItem.price}
                    onChange={e => setEditingItem({...editingItem, price: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Unit</label>
                  <input 
                    type="text" 
                    className="w-full border border-slate-200 rounded-xl px-4 py-2.5 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={editingItem.quantityUnit}
                    onChange={e => setEditingItem({...editingItem, quantityUnit: e.target.value})}
                    placeholder="NOS"
                  />
                </div>
              </div>

            </div>

            <div className="mt-6 flex justify-end">
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50"
              >
                {isSaving ? <span className="animate-pulse">Saving...</span> : <><Save className="w-4 h-4" /> Save Item</>}
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
              placeholder="Search items by name or HSN..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-transparent outline-none pl-12 pr-4 py-2 text-slate-700 font-medium placeholder-slate-400"
            />
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="py-20 text-center font-medium text-slate-400 animate-pulse">Loading inventory...</div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-slate-200 rounded-2xl bg-white/50">
            <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-slate-500">No items found</p>
            <p className="text-sm text-slate-400 mt-1">Try a different search or add a new item.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {filteredItems.map(item => (
              <div 
                key={item.id}
                className="bg-white border border-slate-200 rounded-2xl p-5 hover:border-orange-300 hover:shadow-lg hover:shadow-orange-900/5 transition-all group flex flex-col"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0">
                    <ScanLine className="w-5 h-5 text-slate-400" />
                  </div>
                  <button 
                    onClick={() => setEditingItem(item)}
                    className="text-[10px] font-bold text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-100 hover:bg-orange-100 hover:text-orange-600 px-3 py-1 rounded-full"
                  >
                    Edit
                  </button>
                </div>
                
                <h3 className="font-bold text-slate-800 leading-tight mb-2 truncate" title={item.name}>
                  {item.name}
                </h3>
                
                <div className="mt-auto pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-400 uppercase">
                    HSN: {item.hsn || '-'}
                  </div>
                  <div className="flex items-center gap-1 font-black text-slate-800">
                    <IndianRupee className="w-3.5 h-3.5 text-orange-500" />
                    {item.price.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Failure Popup for Inventory */}
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
