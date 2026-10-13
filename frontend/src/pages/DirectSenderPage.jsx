import React, { useState } from 'react';
import Papa from 'papaparse';
import { api } from '../services/api';
import {
  Send,
  UploadCloud,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Users,
  Eye,
  Check,
  X
} from 'lucide-react';

export function DirectSenderPage({ onNavigateToQueue }) {
  const [tab, setTab] = useState('manual'); // 'manual' | 'csv'

  // Manual Mode State
  const [recipientNumber, setRecipientNumber] = useState('');
  const [recipientName, setRecipientName] = useState('');
  const [messageTemplate, setMessageTemplate] = useState('Hello {name}, thank you for reaching out to us!');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [manualLoading, setManualLoading] = useState(false);

  // CSV Mode State
  const [campaignName, setCampaignName] = useState('Broadcast Campaign');
  const [csvFile, setCsvFile] = useState(null);
  const [parsedRows, setParsedRows] = useState([]);
  const [columns, setColumns] = useState([]);
  const [phoneCol, setPhoneCol] = useState('');
  const [nameCol, setNameCol] = useState('');
  const [validatedRecipients, setValidatedRecipients] = useState([]);
  const [csvLoading, setCsvLoading] = useState(false);

  // Feedback State
  const [notification, setNotification] = useState(null);

  // Manual mode handler
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!consentConfirmed) {
      setNotification({ type: 'error', message: 'You must confirm recipient consent before dispatching.' });
      return;
    }

    setManualLoading(true);
    setNotification(null);

    try {
      const res = await api.createCampaign({
        name: `Direct Message to ${recipientName || recipientNumber}`,
        template: messageTemplate,
        recipients: [{ phoneNumber: recipientNumber, name: recipientName }]
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Message queued successfully for ${recipientNumber}! You can monitor progress in the Live Queue.`
        });
        setRecipientNumber('');
        setRecipientName('');
        setConsentConfirmed(false);
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to queue direct message.' });
    } finally {
      setManualLoading(false);
    }
  };

  // CSV Upload handler
  const handleCsvFileUpload = (file) => {
    if (!file) return;
    setCsvFile(file);
    setNotification(null);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const data = results.data;
        if (!data || data.length === 0) {
          setNotification({ type: 'error', message: 'The uploaded CSV file is empty.' });
          return;
        }

        const cols = Object.keys(data[0] || {});
        setColumns(cols);
        setParsedRows(data);

        // Auto-detect columns
        const autoPhone = cols.find(c => /phone|mobile|number|contact/i.test(c)) || cols[0];
        const autoName = cols.find(c => /name|recipient|customer/i.test(c)) || (cols[1] || cols[0]);

        setPhoneCol(autoPhone);
        setNameCol(autoName);

        validateCsvRows(data, autoPhone, autoName);
      },
      error: (error) => {
        setNotification({ type: 'error', message: `CSV Parsing error: ${error.message}` });
      }
    });
  };

  // Validate parsed CSV rows
  const validateCsvRows = (rows, pCol, nCol) => {
    const seen = new Set();
    const validated = rows.map((row, index) => {
      const rawNumber = String(row[pCol] || '').trim();
      const rawName = String(row[nCol] || '').trim();

      // Check digits
      const digitsOnly = rawNumber.replace(/[\s\-\(\)\+\.]/g, '');
      let status = 'valid';
      let error = null;

      if (!digitsOnly || digitsOnly.length < 10 || digitsOnly.length > 15) {
        status = 'invalid';
        error = 'Invalid number length (10-15 digits required)';
      } else if (seen.has(digitsOnly)) {
        status = 'duplicate';
        error = 'Duplicate recipient in CSV';
      } else {
        seen.add(digitsOnly);
      }

      return {
        rowNumber: index + 1,
        phoneNumber: rawNumber,
        normalized: digitsOnly,
        name: rawName || 'Valued Customer',
        status,
        error
      };
    });

    setValidatedRecipients(validated);
  };

  const handleColumnChange = (newPCol, newNCol) => {
    setPhoneCol(newPCol);
    setNameCol(newNCol);
    validateCsvRows(parsedRows, newPCol, newNCol);
  };

  // CSV Submit to Queue
  const handleCsvSubmit = async () => {
    const validOnes = validatedRecipients.filter(r => r.status === 'valid');
    if (validOnes.length === 0) {
      setNotification({ type: 'error', message: 'No valid recipients to enqueue.' });
      return;
    }

    setCsvLoading(true);
    setNotification(null);

    try {
      const payloadRecipients = validOnes.map(r => ({
        phoneNumber: r.normalized,
        name: r.name
      }));

      const res = await api.createCampaign({
        name: campaignName || 'CSV Broadcast',
        template: messageTemplate,
        recipients: payloadRecipients
      });

      if (res.success) {
        setNotification({
          type: 'success',
          message: `Successfully queued ${res.data.totalQueued} valid recipients for campaign "${campaignName}"!`
        });
        setCsvFile(null);
        setParsedRows([]);
        setValidatedRecipients([]);
      }
    } catch (err) {
      setNotification({ type: 'error', message: err.message || 'Failed to enqueue campaign.' });
    } finally {
      setCsvLoading(false);
    }
  };

  // Calculated stats for CSV
  const validCount = validatedRecipients.filter(r => r.status === 'valid').length;
  const duplicateCount = validatedRecipients.filter(r => r.status === 'duplicate').length;
  const invalidCount = validatedRecipients.filter(r => r.status === 'invalid').length;

  return (
    <div className="space-y-8">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-white">Direct Sender & CSV Campaigns</h2>
        <p className="text-sm text-slate-400 mt-1">
          Send personalized messages individually or import contacts in bulk with automatic duplicate detection
        </p>
      </div>

      {notification && (
        <div className={`p-4 rounded-xl text-xs flex items-center space-x-2 border ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}>
          {notification.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex rounded-xl bg-card border border-slate-800 p-1 w-full max-w-md">
        <button
          onClick={() => { setTab('manual'); setNotification(null); }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition ${
            tab === 'manual' ? 'bg-secondary text-accent border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Send className="w-3.5 h-3.5" />
          <span>Manual Dispatch</span>
        </button>
        <button
          onClick={() => { setTab('csv'); setNotification(null); }}
          className={`flex-1 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center space-x-2 transition ${
            tab === 'csv' ? 'bg-secondary text-accent border border-slate-700 shadow-sm' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Bulk CSV Import</span>
        </button>
      </div>

      {/* Manual Dispatch Mode */}
      {tab === 'manual' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-7 bg-card border border-slate-800 rounded-2xl p-6 shadow-sm">
            <h3 className="text-base font-semibold text-white mb-4">Compose Direct Message</h3>
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Recipient Number (with country code)</label>
                  <input
                    type="text"
                    required
                    value={recipientNumber}
                    onChange={(e) => setRecipientNumber(e.target.value)}
                    placeholder="+919876543210"
                    className="w-full px-3.5 py-2.5 bg-secondary border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Recipient Name</label>
                  <input
                    type="text"
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                    placeholder="Rahul Sharma"
                    className="w-full px-3.5 py-2.5 bg-secondary border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-accent"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Message Template <span className="text-slate-500 font-normal">(use {'{name}'} for personalized greeting)</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-secondary border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>

              {/* Consent check */}
              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start space-x-3">
                <input
                  type="checkbox"
                  id="consentCheck"
                  checked={consentConfirmed}
                  onChange={(e) => setConsentConfirmed(e.target.checked)}
                  className="mt-0.5 rounded border-slate-700 text-accent focus:ring-accent"
                />
                <label htmlFor="consentCheck" className="text-xs text-slate-300 cursor-pointer">
                  I confirm that recipient consent has been collected in compliance with WhatsApp Business Messaging Policies and local regulations.
                </label>
              </div>

              <button
                type="submit"
                disabled={manualLoading || !consentConfirmed}
                className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-slate-950 font-semibold rounded-xl text-sm transition flex items-center justify-center space-x-2 disabled:opacity-50"
              >
                {manualLoading ? (
                  <span className="inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Enqueue Message</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Preview Card */}
          <div className="lg:col-span-5 bg-card border border-slate-800 rounded-2xl p-6 shadow-sm flex flex-col">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 flex items-center space-x-1.5">
              <Eye className="w-4 h-4 text-accent" />
              <span>Real-Time Message Preview</span>
            </h3>

            <div className="flex-1 p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-end">
              <div className="max-w-[85%] bg-emerald-950/80 border border-emerald-800/60 p-3.5 rounded-2xl rounded-tr-none text-xs text-emerald-100 shadow-lg space-y-1 self-end">
                <p className="whitespace-pre-wrap">
                  {messageTemplate.replace(/\{name\}/g, recipientName || 'Customer')}
                </p>
                <div className="text-[10px] text-emerald-400/80 text-right">
                  12:00 PM • <Check className="w-3 h-3 inline-block" />
                </div>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-2 text-center">
              Rendered as it will appear in recipient's WhatsApp chat.
            </p>
          </div>
        </div>
      )}

      {/* CSV Bulk Import Mode */}
      {tab === 'csv' && (
        <div className="space-y-6">
          {/* Step 1: Upload & Template */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 bg-card border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-white">1. Select CSV File</h3>
              
              <div className="border-2 border-dashed border-slate-700 hover:border-accent/60 rounded-xl p-8 text-center transition cursor-pointer relative bg-slate-900/40">
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => handleCsvFileUpload(e.target.files?.[0])}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="p-3 rounded-full bg-secondary text-accent">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <p className="text-sm font-medium text-white">
                    {csvFile ? csvFile.name : 'Drag & drop or click to upload CSV'}
                  </p>
                  <p className="text-xs text-slate-500">Supports comma-separated contact lists</p>
                </div>
              </div>

              {columns.length > 0 && (
                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Phone Column</label>
                    <select
                      value={phoneCol}
                      onChange={(e) => handleColumnChange(e.target.value, nameCol)}
                      className="w-full px-3 py-2 bg-secondary border border-slate-700 rounded-lg text-xs text-white"
                    >
                      {columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Name Column</label>
                    <select
                      value={nameCol}
                      onChange={(e) => handleColumnChange(phoneCol, e.target.value)}
                      className="w-full px-3 py-2 bg-secondary border border-slate-700 rounded-lg text-xs text-white"
                    >
                      {columns.map(col => <option key={col} value={col}>{col}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:col-span-6 bg-card border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <h3 className="text-base font-semibold text-white">2. Campaign Details</h3>
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Campaign Name</label>
                <input
                  type="text"
                  value={campaignName}
                  onChange={(e) => setCampaignName(e.target.value)}
                  placeholder="e.g. Festival Promotional Broadcast"
                  className="w-full px-3.5 py-2.5 bg-secondary border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">Message Template</label>
                <textarea
                  rows={4}
                  value={messageTemplate}
                  onChange={(e) => setMessageTemplate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-secondary border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-accent"
                />
              </div>
            </div>
          </div>

          {/* Validation Metrics */}
          {validatedRecipients.length > 0 && (
            <div className="bg-card border border-slate-800 rounded-2xl p-6 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold text-white">CSV Validation Breakdown</h3>
                  <p className="text-xs text-slate-400">Inspected {validatedRecipients.length} rows</p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold">
                    {validCount} Valid
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
                    {duplicateCount} Duplicates
                  </div>
                  <div className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
                    {invalidCount} Invalid
                  </div>

                  <button
                    onClick={handleCsvSubmit}
                    disabled={csvLoading || validCount === 0}
                    className="py-2 px-4 bg-accent hover:bg-accent-hover text-slate-950 font-semibold rounded-xl text-xs transition disabled:opacity-50"
                  >
                    {csvLoading ? 'Enqueueing...' : `Submit ${validCount} to Queue`}
                  </button>
                </div>
              </div>

              {/* Preview Table */}
              <div className="overflow-x-auto max-h-72 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-secondary/60 text-slate-400 uppercase tracking-wider font-semibold sticky top-0 border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Raw Phone</th>
                      <th className="py-2.5 px-3">Name</th>
                      <th className="py-2.5 px-3">Validation Status</th>
                      <th className="py-2.5 px-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {validatedRecipients.slice(0, 50).map((r) => (
                      <tr key={r.rowNumber} className="hover:bg-secondary/20 transition">
                        <td className="py-2 px-3 text-slate-500">{r.rowNumber}</td>
                        <td className="py-2 px-3 font-mono">{r.phoneNumber}</td>
                        <td className="py-2 px-3">{r.name}</td>
                        <td className="py-2 px-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                            r.status === 'valid' ? 'bg-emerald-500/10 text-emerald-400' :
                            r.status === 'duplicate' ? 'bg-amber-500/10 text-amber-400' :
                            'bg-rose-500/10 text-rose-400'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2 px-3 text-slate-400 text-[11px]">{r.error || 'Ready for queue'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
