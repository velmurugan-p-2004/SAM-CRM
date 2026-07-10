import React, { useState } from 'react';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Calendar,
  DollarSign,
  User,
  X,
  Save,
  Printer,
  ArrowRight,
  TrendingUp,
  FileText
} from 'lucide-react';
import { useServices, useCustomers } from '../hooks/useDatabase';
import { Service } from '../types';

const formatIndianVehicleNumber = (val: string) => {
  let clean = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length === 0) return '';
  
  // State code: max 2 letters
  let state = clean.slice(0, 2).replace(/[^A-Z]/g, '');
  let formatted = state;
  if (clean.length <= 2) return formatted;
  
  // District code: max 2 digits
  let districtIndex = state.length;
  let district = clean.slice(districtIndex, districtIndex + 2).replace(/[^0-9]/g, '');
  if (district) formatted += '-' + district;
  if (clean.length <= districtIndex + 2) return formatted;
  
  // Letters: max 3 letters
  let remaining = clean.slice(districtIndex + district.length);
  let lettersMatch = remaining.match(/^[A-Z]+/);
  let letters = lettersMatch ? lettersMatch[0].slice(0, 3) : '';
  if (letters) formatted += '-' + letters;
  
  // Digits: max 4 digits
  let digits = remaining.slice(letters.length).replace(/[^0-9]/g, '').slice(0, 4);
  if (digits) formatted += '-' + digits;
  
  return formatted;
};

const Services: React.FC = () => {
  const { services, addService, updateService, deleteService, loading } = useServices();
  const { customers } = useCustomers();

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'cancelled'>('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  
  // Search state for linking existing customer
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const [formData, setFormData] = useState({
    customerId: '' as string | number,
    vehicleName: '',
    vehicleNumber: '',
    serviceDate: new Date().toISOString().split('T')[0],
    description: '',
    estimatedCost: '' as string | number,
    status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'cancelled'
  });

  const handleInputChange = (field: string, value: string) => {
    let finalValue = value;
    if (field === 'vehicleNumber') {
      finalValue = formatIndianVehicleNumber(value);
    }
    setFormData(prev => ({
      ...prev,
      [field]: finalValue
    }));
  };

  const handleSelectCustomer = (cust: any) => {
    setFormData(prev => ({
      ...prev,
      customerId: cust.id,
      vehicleName: cust.vehicleName || prev.vehicleName,
      vehicleNumber: cust.vehicleNumber || prev.vehicleNumber
    }));
    setCustomerSearchQuery(cust.name);
    setShowCustomerDropdown(false);
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      vehicleName: '',
      vehicleNumber: '',
      serviceDate: new Date().toISOString().split('T')[0],
      description: '',
      estimatedCost: '',
      status: 'pending'
    });
    setCustomerSearchQuery('');
    setEditingService(null);
    setShowFormModal(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vehicleNumber.trim()) {
      alert('Vehicle number is required.');
      return;
    }

    try {
      const dataToSave = {
        customerId: formData.customerId ? parseInt(String(formData.customerId)) : null,
        vehicleName: formData.vehicleName.trim(),
        vehicleNumber: formData.vehicleNumber.trim(),
        serviceDate: formData.serviceDate,
        description: formData.description.trim(),
        estimatedCost: parseFloat(String(formData.estimatedCost)) || 0,
        status: formData.status
      };

      if (editingService) {
        await updateService(editingService.id, dataToSave);
        alert('Service ticket updated successfully!');
      } else {
        await addService(dataToSave);
        alert('Service ticket created successfully!');
      }
      resetForm();
    } catch (err) {
      console.error(err);
      alert('Failed to save service ticket.');
    }
  };

  const handleEdit = (srv: Service) => {
    setEditingService(srv);
    setFormData({
      customerId: srv.customerId || '',
      vehicleName: srv.vehicleName || '',
      vehicleNumber: srv.vehicleNumber || '',
      serviceDate: srv.serviceDate || new Date().toISOString().split('T')[0],
      description: srv.description || '',
      estimatedCost: srv.estimatedCost || 0,
      status: srv.status || 'pending'
    });
    
    if (srv.customerId) {
      const linkedCustomer = customers.find(c => c.id === srv.customerId);
      if (linkedCustomer) {
        setCustomerSearchQuery(linkedCustomer.name);
      }
    }
    
    setShowFormModal(true);
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this service ticket?')) {
      try {
        await deleteService(id);
        alert('Service ticket deleted.');
      } catch (e) {
        alert('Failed to delete service ticket.');
      }
    }
  };

  const handleStatusChange = async (srv: Service, newStatus: 'pending' | 'in_progress' | 'completed' | 'cancelled') => {
    try {
      await updateService(srv.id, { status: newStatus });
    } catch (e) {
      alert('Failed to update status.');
    }
  };

  const handleConvertToBill = (srv: Service) => {
    const billCustomer = srv.customerId ? customers.find(c => c.id === srv.customerId) : null;
    
    // Create payload for billing screen
    const convertData = {
      customerName: billCustomer ? billCustomer.name : 'Walk-in Customer',
      customerPhone: billCustomer ? billCustomer.phone : '',
      vehicleName: srv.vehicleName,
      vehicleNumber: srv.vehicleNumber,
      serviceCost: srv.estimatedCost,
      description: srv.description,
      serviceId: srv.id
    };

    localStorage.setItem('billing_import_service', JSON.stringify(convertData));
    alert('Importing service details into new bill!');
    // Trigger transition to billing page
    window.location.reload();
  };

  const printJobCard = (srv: Service) => {
    const cust = srv.customerId ? customers.find(c => c.id === srv.customerId) : null;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>Service Job Card #${srv.id}</title>
          <style>
            body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 30px; color: #333; }
            .header { text-align: center; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; margin-bottom: 20px; }
            .header h1 { margin: 0; font-size: 24px; color: #1e3a8a; }
            .grid { display: grid; grid-template-cols: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
            .section-title { font-weight: bold; font-size: 14px; text-transform: uppercase; color: #4b5563; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px; }
            .info-item { margin-bottom: 8px; font-size: 14px; }
            .info-label { font-weight: bold; color: #374151; }
            .desc-box { border: 1px solid #d1d5db; padding: 15px; border-radius: 8px; background: #f9fafb; font-size: 14px; white-space: pre-wrap; margin-bottom: 20px; min-height: 100px; }
            .status-badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
            .status-pending { background: #fef3c7; color: #92400e; }
            .status-in_progress { background: #dbeafe; color: #1e40af; }
            .status-completed { background: #d1fae5; color: #065f46; }
            .status-cancelled { background: #fee2e2; color: #991b1b; }
            .footer { margin-top: 50px; display: flex; justify-content: space-between; font-size: 12px; color: #6b7280; }
            .signature { border-top: 1px dashed #9ca3af; width: 200px; text-align: center; padding-top: 5px; margin-top: 40px; }
            @media print {
              body { padding: 0; }
              button { display: none; }
            }
          </style>
        </head>
        <body onload="window.print()">
          <div class="header">
            <h1>SERVICE JOB CARD</h1>
            <p style="margin: 5px 0 0 0;">Ticket ID: #${srv.id} | Date: ${new Date(srv.serviceDate).toLocaleDateString()}</p>
          </div>
          
          <div class="grid">
            <div>
              <div class="section-title">Customer Information</div>
              <div class="info-item"><span class="info-label">Name:</span> ${cust?.name || 'Walk-in'}</div>
              <div class="info-item"><span class="info-label">Phone:</span> ${cust?.phone || 'N/A'}</div>
              ${cust?.email ? `<div class="info-item"><span class="info-label">Email:</span> ${cust.email}</div>` : ''}
              ${cust?.address ? `<div class="info-item"><span class="info-label">Address:</span> ${cust.address}</div>` : ''}
            </div>
            
            <div>
              <div class="section-title">Vehicle & Cost details</div>
              <div class="info-item"><span class="info-label">Vehicle Name:</span> ${srv.vehicleName || 'N/A'}</div>
              <div class="info-item"><span class="info-label">Vehicle Number:</span> <span style="font-family: monospace; font-size: 15px; font-weight: bold;">${srv.vehicleNumber}</span></div>
              <div class="info-item"><span class="info-label">Estimated Cost:</span> ₹${srv.estimatedCost.toFixed(2)}</div>
              <div class="info-item">
                <span class="info-label">Status:</span> 
                <span class="status-badge status-${srv.status}">
                  ${srv.status.replace('_', ' ')}
                </span>
              </div>
            </div>
          </div>
          
          <div class="section-title">Service Description / Requested Tasks</div>
          <div class="desc-box">${srv.description || 'No description provided.'}</div>
          
          <div class="footer">
            <div class="signature">Customer Signature</div>
            <div class="signature">Technician Signature</div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const filteredCustomerOptions = customers.filter(c =>
    c.name.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    c.phone.includes(customerSearchQuery)
  );

  const filteredServices = services.filter(srv => {
    const cust = srv.customerId ? customers.find(c => c.id === srv.customerId) : null;
    const nameMatch = cust?.name.toLowerCase().includes(searchTerm.toLowerCase()) || false;
    const vehicleMatch = srv.vehicleNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         srv.vehicleName.toLowerCase().includes(searchTerm.toLowerCase());
    const descMatch = srv.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const searchMatches = nameMatch || vehicleMatch || descMatch || searchTerm === '';
    const statusMatches = statusFilter === 'all' || srv.status === statusFilter;

    return searchMatches && statusMatches;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
      case 'in_progress':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            <Wrench className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '3s' }} /> In Progress
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> Completed
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-semibold text-rose-800">
            <XCircle className="w-3.5 h-3.5" /> Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  const pendingCount = services.filter(s => s.status === 'pending').length;
  const progressCount = services.filter(s => s.status === 'in_progress').length;
  const completedCount = services.filter(s => s.status === 'completed').length;

  return (
    <div className="min-h-full rounded-[2rem] bg-white/70 p-5 shadow-soft backdrop-blur-sm lg:p-8">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.25em] text-primary-600">Automotive repairs</p>
          <h1 className="mt-2 text-4xl font-bold tracking-tight text-slate-900">Service Tickets</h1>
          <p className="mt-2 max-w-2xl text-slate-600">Track and manage client vehicles, repair progress, and job sheets seamlessly.</p>
        </div>
        <div className="flex gap-3 xl:justify-end">
          <button
            onClick={() => {
              resetForm();
              setShowFormModal(true);
            }}
            className="btn-primary flex items-center gap-2 px-4 py-2"
          >
            <Plus className="w-4 h-4" />
            Create Job Card
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="card border border-white/60 bg-white/95 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-amber-100 p-2.5 text-amber-600">
              <Clock className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Pending Vehicles</p>
              <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
            </div>
          </div>
        </div>
        <div className="card border border-white/60 bg-white/95 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-blue-100 p-2.5 text-blue-600">
              <Wrench className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">In Workshop</p>
              <p className="text-2xl font-bold text-slate-900">{progressCount}</p>
            </div>
          </div>
        </div>
        <div className="card border border-white/60 bg-white/95 shadow-soft">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-semibold uppercase">Ready / Done</p>
              <p className="text-2xl font-bold text-slate-900">{completedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters & search */}
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-1.5 border-b border-slate-200 pb-1.5 md:border-b-0 md:pb-0">
          {(['all', 'pending', 'in_progress', 'completed', 'cancelled'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                statusFilter === tab
                  ? 'bg-slate-900 text-white shadow-md'
                  : 'text-slate-600 hover:bg-slate-100/70'
              }`}
            >
              {tab.replace('_', ' ')}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search by vehicle, client, or details..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="input pr-10 w-full max-w-sm"
          />
          <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        </div>
      </div>

      {/* List Container */}
      <div className="card border border-white/60 bg-white/85 shadow-soft">
        {loading ? (
          <div className="p-8 text-center text-slate-500 font-medium">Loading service list...</div>
        ) : filteredServices.length === 0 ? (
          <div className="text-center py-12">
            <Wrench className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h3 className="mb-2 text-lg font-medium text-slate-900">No service tickets found</h3>
            <p className="text-slate-600">
              {searchTerm || statusFilter !== 'all' ? 'Try adjusting filters or search query' : 'Create your first vehicle job card to start.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredServices.map(srv => {
              const cust = srv.customerId ? customers.find(c => c.id === srv.customerId) : null;
              
              return (
                <div key={srv.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-soft hover:-translate-y-0.5 hover:border-primary-200 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-semibold text-slate-400">Card #{srv.id}</span>
                      {getStatusBadge(srv.status)}
                    </div>

                    <h3 className="font-bold text-slate-950 text-base flex items-center gap-1.5">
                      <span>🚗</span>
                      {srv.vehicleName || 'Unknown Vehicle'}
                    </h3>
                    
                    <p className="mt-1 text-[13px] font-mono font-bold tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-0.5 w-fit uppercase">
                      {srv.vehicleNumber}
                    </p>

                    <div className="mt-4 space-y-1.5 text-xs text-slate-600 font-medium">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Client: <strong className="text-slate-900">{cust ? cust.name : 'Walk-in'}</strong> {cust ? `(${cust.phone})` : ''}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Date: {new Date(srv.serviceDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Estimated Cost: <strong className="text-slate-900 text-sm font-bold">₹{srv.estimatedCost.toFixed(2)}</strong></span>
                      </div>
                    </div>

                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <p className="text-xs text-slate-500 font-semibold uppercase mb-1">Details:</p>
                      <p className="text-xs text-slate-600 bg-slate-50 rounded-xl p-2.5 line-clamp-3 leading-relaxed border border-slate-100 font-medium">
                        {srv.description || 'No work description details provided.'}
                      </p>
                    </div>
                  </div>

                  {/* Actions footer */}
                  <div className="mt-4 border-t border-slate-100 pt-3 flex flex-col gap-2">
                    {/* Status progress shortcut buttons */}
                    <div className="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                      <span className="text-slate-400 font-bold uppercase text-[9px]">Set Status:</span>
                      <div className="flex gap-1">
                        {srv.status !== 'pending' && (
                          <button
                            onClick={() => handleStatusChange(srv, 'pending')}
                            className="bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded text-[10px] hover:bg-amber-200"
                          >
                            Pend
                          </button>
                        )}
                        {srv.status !== 'in_progress' && (
                          <button
                            onClick={() => handleStatusChange(srv, 'in_progress')}
                            className="bg-blue-100 text-blue-700 font-bold px-1.5 py-0.5 rounded text-[10px] hover:bg-blue-200"
                          >
                            Work
                          </button>
                        )}
                        {srv.status !== 'completed' && (
                          <button
                            onClick={() => handleStatusChange(srv, 'completed')}
                            className="bg-emerald-100 text-emerald-700 font-bold px-1.5 py-0.5 rounded text-[10px] hover:bg-emerald-200"
                          >
                            Done
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-1.5">
                      <button
                        onClick={() => printJobCard(srv)}
                        className="btn-secondary flex-1 flex items-center justify-center gap-1 py-1.5 text-xs"
                        title="Print Job Slip"
                      >
                        <Printer className="w-3.5 h-3.5" /> Job Card
                      </button>

                      {srv.status !== 'cancelled' && (
                        <button
                          onClick={() => handleConvertToBill(srv)}
                          className="btn-primary bg-indigo-600 hover:bg-indigo-700 flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-semibold"
                          title="Generate POS Invoice"
                        >
                          Bill POS <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2 justify-end mt-1">
                      <button
                        onClick={() => handleEdit(srv)}
                        className="text-primary-600 hover:text-primary-900 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"
                        title="Edit Job sheet"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(srv.id)}
                        className="text-red-600 hover:text-red-900 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                        title="Delete Card"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Creation/Edit Form Modal */}
      {showFormModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-white/60 bg-white p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Wrench className="text-primary-600" />
                {editingService ? 'Edit Service Job Card' : 'Create New Job Card'}
              </h2>
              <button onClick={resetForm} className="btn-icon btn-icon-neutral text-slate-400 hover:text-slate-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Linked Customer (Autocomplete search) */}
              <div className="relative">
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Search & Link Customer (Optional)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={customerSearchQuery}
                    onChange={(e) => {
                      setCustomerSearchQuery(e.target.value);
                      setShowCustomerDropdown(true);
                      if (e.target.value === '') {
                        setFormData(prev => ({ ...prev, customerId: '' }));
                      }
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    className="input w-full pr-10"
                    placeholder="Type name or phone to search..."
                  />
                  <Search className="absolute right-3 top-1/2 w-4 h-4 -translate-y-1/2 text-slate-400" />
                </div>

                {showCustomerDropdown && customerSearchQuery.trim() !== '' && (
                  <div className="absolute left-0 right-0 z-50 mt-1 max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                    {filteredCustomerOptions.length === 0 ? (
                      <div className="p-3 text-sm text-slate-500 text-center">No customers found.</div>
                    ) : (
                      filteredCustomerOptions.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full text-left p-3 hover:bg-slate-50 border-b border-slate-100 flex flex-col transition-colors"
                        >
                          <span className="font-semibold text-slate-900 text-sm">{c.name}</span>
                          <span className="text-xs text-slate-500">{c.phone} {c.vehicleNumber ? `[🚗 ${c.vehicleNumber}]` : ''}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Vehicle Name
                  </label>
                  <input
                    type="text"
                    value={formData.vehicleName}
                    onChange={(e) => handleInputChange('vehicleName', e.target.value)}
                    className="input w-full"
                    placeholder="e.g. Swift Dzire, Honda Activa"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Vehicle Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.vehicleNumber}
                    onChange={(e) => handleInputChange('vehicleNumber', e.target.value)}
                    className="input w-full uppercase"
                    placeholder="e.g. TN-10-AU-1520"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Service Date
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.serviceDate}
                    onChange={(e) => handleInputChange('serviceDate', e.target.value)}
                    className="input w-full"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">
                    Estimated Cost (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.estimatedCost}
                    onChange={(e) => handleInputChange('estimatedCost', e.target.value)}
                    className="input w-full"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value)}
                  className="input w-full"
                  title="Select Status"
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700">
                  Service Tasks / Descriptions
                </label>
                <textarea
                  required
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="input w-full h-24 resize-none"
                  placeholder="Describe service work (e.g. Engine Oil Change, AC repair...)"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  className="btn-primary flex-1 flex items-center justify-center gap-2 py-2.5"
                >
                  <Save className="w-4 h-4" />
                  {editingService ? 'Update Job Card' : 'Save Job Card'}
                </button>
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-secondary flex-1 py-2.5"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Services;
