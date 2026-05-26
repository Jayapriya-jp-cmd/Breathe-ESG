import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  BarChart3, 
  Clock, 
  Database,
  ChevronRight,
  Plane,
  Zap,
  Droplets,
  X,
  Lock,
  User as UserIcon,
  FileText,
  Upload,
  LogOut,
  TrendingUp,
  LayoutGrid,
  Activity,
  ShieldCheck,
  Server,
  Terminal,
  AlertTriangle,
  Check,
  RefreshCw,
  Trash2,
  Search,
  MessageSquare,
  Sparkles,
  Info
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'http://localhost:8000/api/portal';

interface AuditLog {
  id: number;
  user: {
    id: number;
    username: string;
    email: string;
  } | null;
  action: string;
  previous_state: any;
  new_state: any;
  timestamp: string;
  comments: string;
}


interface NormalizedRecord {
  id: string;
  category: string;
  activity_type: string;
  scope: string;
  activity_date: string;
  original_value: string;
  original_unit: string;
  raw_value: string;
  normalized_value: string;
  unit: string;
  normalized_value_kgco2e: string;
  conversion_factor: string;
  kg_co2e: string;
  emission_factor: string;
  status: 'PENDING' | 'FLAGGED' | 'FAILED' | 'APPROVED' | 'LOCKED';
  flags: string[];
  suspicious_reason: string | null;
  analyst_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: { id: number; username: string } | null;
  approved_by: { id: number; username: string } | null;
  approved_at: string | null;
  is_locked: boolean;
  locked: boolean;
  is_demo: boolean;
  ingestion_record: {
    source_type: string;
    original_filename: string;
    file: string | null;
    raw_payload: any;
    raw_json_summary?: any;
  };
  audit_logs?: AuditLog[];
}

interface Organization {
  id: string;
  name: string;
  last_sync: string | null;
}

interface IngestionSummary {
  processed: number;
  success: number;
  flagged: number;
  failed: number;
}

const ReviewPortal = () => {
  const { user, organization, logout } = useAuth();
  
  // Data State
  const [records, setRecords] = useState<NormalizedRecord[]>([]);
  const [orgDetails, setOrgDetails] = useState<Organization | null>(null);
  
  // Selection & UI Mode
  const [selectedRecord, setSelectedRecord] = useState<NormalizedRecord | null>(null);
  const [activeTab, setActiveTab] = useState<'REVIEW' | 'ANALYTICS' | 'SOURCES' | 'HEALTH'>('REVIEW');
  const [showIngestModal, setShowIngestModal] = useState(false);
  const [showPublishModal, setShowPublishModal] = useState(false);
  
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'SAP' | 'UTILITY' | 'TRAVEL'>('ALL');
  const [scopeFilter, setScopeFilter] = useState<'ALL' | 'SCOPE_1' | 'SCOPE_2' | 'SCOPE_3'>('ALL');
  const [statusTab, setStatusTab] = useState<'ALL' | 'PENDING' | 'FLAGGED' | 'FAILED' | 'APPROVED' | 'LOCKED'>('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // Ingestion Modal State
  const [ingestType, setIngestType] = useState<'SAP' | 'UTILITY' | 'TRAVEL'>('SAP');
  const [ingestMethod, setIngestMethod] = useState<'FILE' | 'PASTE'>('FILE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [pastedJson, setPastedJson] = useState('');
  const [isIngesting, setIsIngesting] = useState(false);
  const [ingestSummary, setIngestSummary] = useState<IngestionSummary | null>(null);
  
  // Pre-ingestion validation check states
  const [preValidateRows, setPreValidateRows] = useState<any[]>([]);
  const [preValidateStats, setPreValidateStats] = useState<{success: number, flagged: number, failed: number} | null>(null);
  
  // Analyst Actions State
  const [analystNotes, setAnalystNotes] = useState('');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' | 'warning' } | null>(null);
  
  // Loading & Sync state
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState<{[key: string]: boolean}>({});

  // Onboarding states
  const [showOnboardingTooltip, setShowOnboardingTooltip] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const showToast = (message: string, type: 'success' | 'info' | 'error' | 'warning' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [dataRes, orgRes] = await Promise.all([
        axios.get(`${API_BASE}/data/`),
        axios.get(`${API_BASE}/orgs/`)
      ]);
      setRecords(dataRes.data);
      if (orgRes.data.length > 0) setOrgDetails(orgRes.data[0]);
    } catch (err) {
      console.error("Fetch Error:", err);
      showToast("Failed to fetch environmental records", "error");
    } finally {
      setIsLoading(false);
    }
  };

  // Sync details for a specific adapter
  const handleSyncSource = async (source: string, orgId: string) => {
    setIsSyncing(prev => ({ ...prev, [source]: true }));
    try {
      await axios.post(`${API_BASE}/orgs/${orgId}/sync/`);
      showToast(`${source} Adapter synced successfully!`, "success");
      fetchData();
    } catch (err) {
      showToast(`Failed to sync ${source} Adapter`, "error");
    } finally {
      setIsSyncing(prev => ({ ...prev, [source]: false }));
    }
  };

  // Ingestion Modal processing
  const handleIngest = async () => {
    setIsIngesting(true);
    setIngestSummary(null);
    try {
      const formData = new FormData();
      formData.append('source_type', ingestType);
      
      if (ingestMethod === 'FILE') {
        if (!selectedFile) {
          showToast("Please upload a file first", "warning");
          setIsIngesting(false);
          return;
        }
        formData.append('file', selectedFile);
      } else {
        if (!pastedJson.trim()) {
          showToast("Please paste raw JSON array first", "warning");
          setIsIngesting(false);
          return;
        }
        // Test JSON Validity
        try {
          const parsed = JSON.parse(pastedJson);
          formData.append('raw_payload', JSON.stringify(parsed));
        } catch (e) {
          showToast("Invalid JSON syntax. Please verify.", "error");
          setIsIngesting(false);
          return;
        }
      }

      const res = await axios.post(`${API_BASE}/ingest/`, formData);
      const data = res.data;
      
      setIngestSummary({
        processed: data.processed,
        success: data.success_count,
        flagged: data.flagged_count,
        failed: data.failed_count
      });
      
      showToast(`Ingestion completed: ${data.processed} rows processed`, "success");
      setSelectedFile(null);
      setPastedJson('');
      setPreValidateRows([]);
      setPreValidateStats(null);
      fetchData();
    } catch (err: any) {
      const errMsg = err.response?.data?.error || "Ingestion failed. Ensure schema matches source requirements.";
      showToast(errMsg, "error");
    } finally {
      setIsIngesting(false);
    }
  };

  // Pre-ingestion validation simulation on pasted JSON
  const handlePreValidate = () => {
    if (!pastedJson.trim()) {
      showToast("Nothing to validate.", "warning");
      return;
    }
    try {
      const parsed = JSON.parse(pastedJson);
      const rows = Array.isArray(parsed) ? parsed : [parsed];
      
      let success = 0;
      let flagged = 0;
      let failed = 0;
      
      const validated = rows.map((row: any) => {
        let status = 'SUCCESS';
        let warnings: string[] = [];
        let errors: string[] = [];
        
        // Validation logic replication
        const qty = parseFloat(row.quantity || row.usage_kwh || row.distance_km || row.usage || 0);
        const unit = row.uom || row.unit || '';
        
        if (qty < 0) errors.push("Negative quantity");
        if (!unit && ingestType === 'SAP') errors.push("Missing unit");
        
        // Date checks
        const dateStr = row.date || row.period_end || '';
        if (dateStr) {
          try {
            const yr = new Date(dateStr).getFullYear();
            if (yr > 2026) warnings.push("Future date");
            if (yr < 2000) errors.push("Old date");
          } catch(e) {}
        } else {
          errors.push("Missing date");
        }

        if (qty > 1000000) warnings.push("Extremely large value");

        if (errors.length > 0) {
          failed++;
          status = 'FAILED';
        } else if (warnings.length > 0) {
          flagged++;
          status = 'FLAGGED';
        } else {
          success++;
          status = 'SUCCESS';
        }

        return {
          row,
          status,
          message: [...errors, ...warnings].join('; ') || 'Valid record'
        };
      });

      setPreValidateRows(validated);
      setPreValidateStats({ success, flagged, failed });
      showToast("Pre-scan complete! View details below.", "info");
    } catch (e) {
      showToast("Invalid JSON syntax. Cannot parse for pre-scan.", "error");
    }
  };

  // Purge Demo Data
  const handleDeleteDemo = async () => {
    if (!window.confirm("WARNING: This will permanently delete all pre-seeded DEMO DATA records. Are you sure?")) return;
    try {
      const res = await axios.post(`${API_BASE}/data/delete-demo/`);
      showToast(`Purge complete: ${res.data.normalized_deleted} records deleted.`, "success");
      setSelectedRecord(null);
      fetchData();
    } catch (err) {
      showToast("Failed to delete demo data", "error");
    }
  };

  // Publish / Locking approved rows
  const handlePublish = async () => {
    try {
      const res = await axios.post(`${API_BASE}/data/publish/`);
      const count = res.data.count;
      showToast(`Success: ${count} approved records locked for audit reporting.`, "success");
      setShowPublishModal(false);
      setSelectedRecord(null);
      fetchData();
    } catch (err) {
      showToast("Failed to lock approved audit records", "error");
    }
  };

  // Action: Approve
  const handleApproveRecord = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/data/${id}/approve/`, { notes: analystNotes });
      showToast("Record approved & locked for compliance draft.", "success");
      setAnalystNotes('');
      
      // Update selected record in UI to reflect changes immediately
      if (selectedRecord && selectedRecord.id === id) {
        const updated = {
          ...selectedRecord,
          status: 'APPROVED' as const,
          analyst_notes: analystNotes || selectedRecord.analyst_notes
        };
        setSelectedRecord(updated);
      }
      fetchData();
    } catch (err) {
      showToast("Failed to approve record", "error");
    }
  };

  // Action: Reject
  const handleRejectRecord = async (id: string) => {
    try {
      await axios.post(`${API_BASE}/data/${id}/reject/`, { notes: analystNotes });
      showToast("Record marked as rejected (FAILED status).", "warning");
      setAnalystNotes('');
      
      if (selectedRecord && selectedRecord.id === id) {
        const updated = {
          ...selectedRecord,
          status: 'FAILED' as const,
          analyst_notes: analystNotes || selectedRecord.analyst_notes
        };
        setSelectedRecord(updated);
      }
      fetchData();
    } catch (err) {
      showToast("Failed to reject record", "error");
    }
  };

  // Action: Flag
  const handleFlagRecord = async (id: string) => {
    const reason = window.prompt("Enter reason for flagging this record:");
    if (reason === null) return;
    if (!reason.trim()) {
      showToast("A reason is required to flag a record.", "warning");
      return;
    }
    try {
      await axios.post(`${API_BASE}/data/${id}/flag/`, { reason, notes: analystNotes });
      showToast("Record flagged as suspicious.", "warning");
      setAnalystNotes('');
      
      if (selectedRecord && selectedRecord.id === id) {
        const updated = {
          ...selectedRecord,
          status: 'FLAGGED' as const,
          suspicious_reason: reason,
          analyst_notes: analystNotes || selectedRecord.analyst_notes
        };
        setSelectedRecord(updated);
      }
      fetchData();
    } catch (err) {
      showToast("Failed to flag record", "error");
    }
  };

  // Select Record helper (pre-populates analyst notes state)
  const handleSelectRecord = (rec: NormalizedRecord) => {
    setSelectedRecord(rec);
    setAnalystNotes(rec.analyst_notes || '');
  };

  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'SAP': return <Database size={16} className="text-blue-400" />;
      case 'UTILITY': return <Zap size={16} className="text-yellow-400" />;
      case 'TRAVEL': return <Plane size={16} className="text-purple-400" />;
      default: return <FileText size={16} className="text-gray-400" />;
    }
  };

  // Check if dataset contains seeded demo data
  const hasDemoData = useMemo(() => {
    return records.some(r => r.is_demo);
  }, [records]);

  // Analytics Computation
  const analyticsData = useMemo(() => {
    let scope1 = 0;
    let scope2 = 0;
    let scope3 = 0;
    let total = 0;
    let flagged = 0;
    let approved = 0;
    let locked = 0;

    // Monthly trends (mocked months grouping based on actual seeded and uploaded dates)
    const monthlyMap: { [key: string]: number } = {};

    records.forEach(r => {
      const kg = parseFloat(r.kg_co2e || r.normalized_value_kgco2e || '0');
      total += kg;
      
      if (r.scope === 'SCOPE_1') scope1 += kg;
      else if (r.scope === 'SCOPE_2') scope2 += kg;
      else if (r.scope === 'SCOPE_3') scope3 += kg;

      if (r.status === 'FLAGGED') flagged++;
      if (r.status === 'APPROVED') approved++;
      if (r.status === 'LOCKED') {
        locked++;
        approved++;
      }

      // Group emissions by Year-Month
      if (r.activity_date) {
        try {
          const dateStr = r.activity_date.substring(0, 7); // YYYY-MM
          monthlyMap[dateStr] = (monthlyMap[dateStr] || 0) + kg;
        } catch(e){}
      }
    });

    const monthlyTrends = Object.keys(monthlyMap).sort().map(key => ({
      month: key,
      emissions: monthlyMap[key]
    }));

    const totalCount = records.length;
    const progress = totalCount > 0 ? Math.round((approved / totalCount) * 100) : 0;

    return {
      scope1,
      scope2,
      scope3,
      total,
      flagged,
      approved,
      locked,
      totalCount,
      progress,
      monthlyTrends: monthlyTrends.length > 0 ? monthlyTrends : [{ month: '2026-04', emissions: 0 }, { month: '2026-05', emissions: total }]
    };
  }, [records]);

  // Filters application
  const filteredRecords = useMemo(() => {
    return records.filter(r => {
      // 1. Text Search
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = !searchQuery || 
        (r.activity_type && r.activity_type.toLowerCase().includes(searchLower)) ||
        (r.suspicious_reason && r.suspicious_reason.toLowerCase().includes(searchLower)) ||
        (r.unit && r.unit.toLowerCase().includes(searchLower)) ||
        (r.ingestion_record?.original_filename && r.ingestion_record.original_filename.toLowerCase().includes(searchLower));

      // 2. Source Adapter Filter
      const matchesSource = sourceFilter === 'ALL' || r.ingestion_record?.source_type === sourceFilter;

      // 3. Scope Filter
      const matchesScope = scopeFilter === 'ALL' || r.scope === scopeFilter;

      // 4. Status Tab Filter
      let matchesStatus = true;
      if (statusTab !== 'ALL') {
        if (statusTab === 'LOCKED') {
          matchesStatus = r.is_locked || r.locked || r.status === 'LOCKED';
        } else {
          matchesStatus = r.status === statusTab && !r.is_locked && !r.locked;
        }
      }

      return matchesSearch && matchesSource && matchesScope && matchesStatus;
    });
  }, [records, searchQuery, sourceFilter, scopeFilter, statusTab]);

  // Paginated records computation
  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));

  // Reset page on filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sourceFilter, scopeFilter, statusTab]);

  // Onboarding banner controller
  const handleCloseTooltip = () => {
    setShowOnboardingTooltip(false);
  };

  return (
    <div className="app-container" style={{ background: 'var(--bg-primary)' }}>
      {/* Toast System */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          zIndex: 9999,
          padding: '12px 24px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
          background: toast.type === 'success' ? 'rgba(16, 185, 129, 0.95)' : 
                      toast.type === 'error' ? 'rgba(239, 68, 68, 0.95)' : 
                      toast.type === 'warning' ? 'rgba(245, 158, 11, 0.95)' : 'rgba(59, 130, 246, 0.95)',
          color: 'white',
          fontWeight: 600,
          border: '1px solid rgba(255,255,255,0.1)',
          backdropFilter: 'blur(8px)',
          transition: 'all 0.3s ease-out'
        }}>
          {toast.type === 'success' && <ShieldCheck size={18} />}
          {toast.type === 'error' && <AlertTriangle size={18} />}
          {toast.type === 'warning' && <AlertTriangle size={18} />}
          {toast.type === 'info' && <Info size={18} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <div className="sidebar" style={{ background: 'var(--bg-secondary)', borderRight: '1px solid var(--border)' }}>
        <div className="logo" style={{ cursor: 'pointer' }} onClick={() => setActiveTab('REVIEW')}>
          <div className="logo-box" style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Droplets size={18} color="white" />
          </div>
          <span style={{ fontSize: '1.15rem', fontWeight: 800, background: 'linear-gradient(90deg, #60a5fa, #3b82f6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Breathe ESG</span>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className={`nav-item ${activeTab === 'REVIEW' ? 'active' : ''}`} onClick={() => setActiveTab('REVIEW')}>
            <Clock size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Review Queue</span>
            {records.filter(r => r.status === 'PENDING').length > 0 && (
              <span style={{ marginLeft: 'auto', background: 'rgba(245, 158, 11, 0.2)', color: 'var(--status-pending)', fontSize: '0.7rem', padding: '2px 6px', borderRadius: '10px', fontWeight: 700 }}>
                {records.filter(r => r.status === 'PENDING').length}
              </span>
            )}
          </div>
          
          <div className={`nav-item ${activeTab === 'ANALYTICS' ? 'active' : ''}`} onClick={() => setActiveTab('ANALYTICS')}>
            <BarChart3 size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Carbon Analytics</span>
          </div>

          <div className={`nav-item ${activeTab === 'SOURCES' ? 'active' : ''}`} onClick={() => setActiveTab('SOURCES')}>
            <LayoutGrid size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Data Sources</span>
          </div>

          <div className={`nav-item ${activeTab === 'HEALTH' ? 'active' : ''}`} onClick={() => setActiveTab('HEALTH')}>
            <Activity size={18} />
            <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>System Health</span>
          </div>
        </nav>

        {/* User Card */}
        <div style={{ marginTop: 'auto', padding: '1rem 0 0 0', borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '50%', border: '1px solid var(--border)', color: 'var(--accent)' }}>
              <UserIcon size={16} />
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>{user}</div>
              <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{organization}</div>
            </div>
          </div>
          <button className="btn btn-outline" style={{ width: '100%', gap: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', padding: '6px 12px' }} onClick={logout}>
            <LogOut size={14} /> Logout
          </button>
        </div>
      </div>

      {/* Main Container Area */}
      <div className="main-content">
        {/* Header bar */}
        <header style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)', padding: '1.25rem 2rem' }}>
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              ESG Ingestion Pipeline 
              <span style={{ fontSize: '0.75rem', fontWeight: 500, padding: '2px 8px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.1)', color: 'var(--accent)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>compliance ledger</span>
            </h1>
            {orgDetails?.last_sync ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '4px' }}>
                <Clock size={10} /> Active Connection • Tenant Last Synced: {format(new Date(orgDetails.last_sync), 'yyyy-MM-dd HH:mm:ss')}
              </span>
            ) : (
              <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '4px', display: 'block' }}>Tenant Offline • Setup connections</span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            {hasDemoData && (
              <button 
                className="btn btn-outline" 
                style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}
                onClick={handleDeleteDemo}
              >
                <Trash2 size={14} /> Clear Demo Data
              </button>
            )}
            <button className="btn btn-outline animate-glow" onClick={() => { setIngestSummary(null); setShowIngestModal(true); }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
              <Upload size={14} /> Raw Ingest
            </button>
            <button 
              className="btn btn-primary" 
              onClick={() => setShowPublishModal(true)} 
              disabled={records.filter(r => r.status === 'APPROVED' && !r.locked && !r.is_locked).length === 0}
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px', opacity: records.filter(r => r.status === 'APPROVED' && !r.locked && !r.is_locked).length === 0 ? 0.5 : 1 }}
            >
              <ShieldCheck size={14} /> Publish Audit
            </button>
          </div>
        </header>

        {/* Contents */}
        <div className="content-body" style={{ padding: '1.5rem 2rem' }}>
          
          {/* Onboarding and Demo Banner Alert */}
          {showOnboardingTooltip && records.length === 0 && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15), rgba(16, 185, 129, 0.05))',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              borderRadius: '12px',
              padding: '1.5rem',
              marginBottom: '1.5rem',
              position: 'relative',
              boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
            }}>
              <X size={16} style={{ position: 'absolute', top: '12px', right: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={handleCloseTooltip} />
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ padding: '10px', background: 'rgba(59, 130, 246, 0.2)', borderRadius: '10px', color: 'var(--accent)' }}><Sparkles size={20} /></div>
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '4px' }}>Begin Data Ingestion</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Welcome to Breathe ESG! Upload raw enterprise files to begin ingestion. You can select either SAP procurement databases, Utility electricity logs, or Corporate travel lists to generate automated carbon analytics instantly.
                  </p>
                  <button className="btn btn-primary" style={{ marginTop: '12px', fontSize: '0.75rem', padding: '4px 10px' }} onClick={() => { setIngestSummary(null); setShowIngestModal(true); }}>Upload Enterprise Files</button>
                </div>
              </div>
            </div>
          )}

          {showOnboardingTooltip && hasDemoData && (
            <div style={{
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12), rgba(20, 20, 23, 0.4))',
              border: '1px solid rgba(245, 158, 11, 0.2)',
              borderRadius: '12px',
              padding: '1.25rem',
              marginBottom: '1.5rem',
              position: 'relative'
            }}>
              <X size={16} style={{ position: 'absolute', top: '12px', right: '12px', cursor: 'pointer', color: 'var(--text-secondary)' }} onClick={handleCloseTooltip} />
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <div style={{ padding: '6px', background: 'rgba(245, 158, 11, 0.2)', borderRadius: '6px', color: 'var(--status-pending)' }}><Info size={16} /></div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>DEMO MODE:</strong> Currently viewing pre-seeded sample enterprise records. This lets you explore normalizations, validation alerts, and details instantly. Purge all sample rows with one click before ingesting actual files.
                  </span>
                </div>
                <button 
                  className="btn btn-outline" 
                  style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#ef4444', fontSize: '0.7rem', padding: '4px 10px', height: 'fit-content' }}
                  onClick={handleDeleteDemo}
                >
                  Clear Demo Data
                </button>
              </div>
            </div>
          )}

          {/* TAB 1: REVIEW QUEUE VIEW */}
          {activeTab === 'REVIEW' && (
            <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'flex-start', width: '100%' }}>
              {/* Left Side: Table & Filters */}
              <div style={{ flex: selectedRecord ? '0 0 calc(58% - 0.75rem)' : '1 1 100%', minWidth: 0, transition: 'all 0.3s ease' }}>
                
                {/* Advanced Filter Bar Panel */}
                <div className="card glass-card" style={{ marginBottom: '1.5rem', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    {/* Text Search */}
                    <div style={{ position: 'relative', flex: 1 }}>
                      <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }} />
                      <input 
                        type="text" 
                        placeholder="Search records by category, activity type, unit, reasons..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="form-input" 
                        style={{ paddingLeft: '36px', height: '38px', fontSize: '0.8rem' }} 
                      />
                      {searchQuery && (
                        <X size={14} onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', cursor: 'pointer', color: 'var(--text-secondary)' }} />
                      )}
                    </div>

                    {/* Source Type Selector */}
                    <select 
                      value={sourceFilter}
                      onChange={(e) => setSourceFilter(e.target.value as any)}
                      className="form-input" 
                      style={{ width: '130px', height: '38px', padding: '0 8px', fontSize: '0.8rem' }}
                    >
                      <option value="ALL">All Sources</option>
                      <option value="SAP">SAP ERP</option>
                      <option value="UTILITY">Utility Cloud</option>
                      <option value="TRAVEL">Concur Travel</option>
                    </select>

                    {/* Scope Selector */}
                    <select 
                      value={scopeFilter}
                      onChange={(e) => setScopeFilter(e.target.value as any)}
                      className="form-input" 
                      style={{ width: '130px', height: '38px', padding: '0 8px', fontSize: '0.8rem' }}
                    >
                      <option value="ALL">All Scopes</option>
                      <option value="SCOPE_1">Scope 1 (Direct)</option>
                      <option value="SCOPE_2">Scope 2 (Indirect)</option>
                      <option value="SCOPE_3">Scope 3 (Value Chain)</option>
                    </select>
                  </div>

                  {/* Status Tabs Navigation */}
                  <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', paddingBottom: '2px', gap: '8px' }}>
                    {[
                      { key: 'ALL', label: 'All Entries', count: records.length },
                      { key: 'PENDING', label: 'Pending Review', count: records.filter(r => r.status === 'PENDING').length },
                      { key: 'FLAGGED', label: 'Flagged Alerts', count: records.filter(r => r.status === 'FLAGGED').length },
                      { key: 'FAILED', label: 'Failed Errors', count: records.filter(r => r.status === 'FAILED').length },
                      { key: 'APPROVED', label: 'Approved Records', count: records.filter(r => r.status === 'APPROVED' && !r.locked && !r.is_locked).length },
                      { key: 'LOCKED', label: 'Locked Archives', count: records.filter(r => r.status === 'LOCKED' || r.locked || r.is_locked).length },
                    ].map(tab => (
                      <button
                        key={tab.key}
                        onClick={() => setStatusTab(tab.key as any)}
                        style={{
                          padding: '6px 12px',
                          fontSize: '0.75rem',
                          background: 'none',
                          border: 'none',
                          borderBottom: statusTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
                          color: statusTab === tab.key ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: statusTab === tab.key ? 700 : 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          transition: 'all 0.2s'
                        }}
                      >
                        {tab.label}
                        <span style={{ fontSize: '0.65rem', background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: '10px' }}>{tab.count}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Queue Table */}
                <div className="table-container shadow-2xl" style={{ overflowX: 'auto' }}>
                  {isLoading ? (
                    <div style={{ textAlign: 'center', padding: '4rem' }}>
                      <RefreshCw size={24} className="animate-spin text-blue-500" style={{ margin: '0 auto 12px' }} />
                      <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Loading carbon accounts...</p>
                    </div>
                  ) : (
                    <>
                      <table>
                        <thead>
                          <tr>
                            <th>Source</th>
                            <th>Activity Details</th>
                            <th>Date</th>
                            <th>Scope</th>
                            <th>Original Quantity</th>
                            <th style={{ textAlign: 'right' }}>kgCO2e</th>
                            <th>Status</th>
                            <th></th>
                          </tr>
                        </thead>
                        <tbody>
                          {paginatedRecords.length === 0 ? (
                            <tr>
                              <td colSpan={8} style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)' }}>
                                <FileText size={28} style={{ opacity: 0.3, margin: '0 auto 12px' }} />
                                <div style={{ fontWeight: 600, fontSize: '0.85rem' }}>No records discovered in this segment</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '4px' }}>Modify your filters or upload new evidence to process.</div>
                              </td>
                            </tr>
                          ) : (
                            paginatedRecords.map(record => (
                              <tr 
                                key={record.id} 
                                onClick={() => handleSelectRecord(record)} 
                                style={{ 
                                  cursor: 'pointer', 
                                  background: selectedRecord?.id === record.id ? 'rgba(59, 130, 246, 0.08)' : 'transparent',
                                  borderColor: selectedRecord?.id === record.id ? 'rgba(59, 130, 246, 0.2)' : 'var(--border)'
                                }}
                              >
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: 600 }}>
                                    {getSourceIcon(record.ingestion_record?.source_type)} 
                                    {record.ingestion_record?.source_type}
                                  </div>
                                </td>
                                <td>
                                  <div>
                                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {record.activity_type || record.category}
                                    </div>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {record.ingestion_record?.original_filename || 'manual ingest'}
                                    </div>
                                  </div>
                                </td>
                                <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                  {record.activity_date ? format(new Date(record.activity_date), 'MMM d, yyyy') : 'No Date'}
                                </td>
                                <td>
                                  <span style={{ 
                                    fontSize: '0.65rem', 
                                    fontWeight: 700, 
                                    padding: '2px 8px', 
                                    borderRadius: '12px',
                                    border: '1px solid transparent',
                                    background: record.scope === 'SCOPE_1' ? 'rgba(59, 130, 246, 0.1)' : record.scope === 'SCOPE_2' ? 'rgba(245, 158, 11, 0.1)' : 'rgba(167, 139, 250, 0.1)',
                                    color: record.scope === 'SCOPE_1' ? '#60a5fa' : record.scope === 'SCOPE_2' ? '#fbbf24' : '#c084fc',
                                    borderColor: record.scope === 'SCOPE_1' ? 'rgba(59,130,246,0.2)' : record.scope === 'SCOPE_2' ? 'rgba(245,158,11,0.2)' : 'rgba(167,139,250,0.2)'
                                  }}>
                                    {record.scope === 'SCOPE_1' ? 'Scope 1 (Direct)' : record.scope === 'SCOPE_2' ? 'Scope 2 (Indirect)' : 'Scope 3 (Spend/Travel)'}
                                  </span>
                                </td>
                                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                                  {parseFloat(record.raw_value || record.original_value).toLocaleString()} {record.unit || record.original_unit}
                                </td>
                                <td style={{ fontWeight: 800, color: 'var(--text-primary)', textAlign: 'right', fontSize: '0.8rem' }}>
                                  {parseFloat(record.kg_co2e || record.normalized_value_kgco2e).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>
                                <td>
                                  {record.is_locked || record.locked || record.status === 'LOCKED' ? (
                                    <span className="badge" style={{ background: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '0.65rem', border: '1px solid rgba(59,130,246,0.2)' }}>
                                      <Lock size={10} /> Locked
                                    </span>
                                  ) : record.status === 'PENDING' ? (
                                    <span className="badge badge-pending" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '0.65rem' }}>Pending</span>
                                  ) : record.status === 'FLAGGED' ? (
                                    <span className="badge badge-flagged" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '0.65rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)' }}><AlertTriangle size={10} /> Warning</span>
                                  ) : record.status === 'FAILED' ? (
                                    <span className="badge badge-flagged" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '0.65rem' }}><AlertTriangle size={10} /> Failed</span>
                                  ) : (
                                    <span className="badge badge-approved" style={{ display: 'flex', alignItems: 'center', gap: '4px', width: 'fit-content', fontSize: '0.65rem' }}><Check size={10} /> Approved</span>
                                  )}
                                </td>
                                <td><ChevronRight size={14} color="var(--text-secondary)" /></td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>

                      {/* Pagination Controls */}
                      {filteredRecords.length > itemsPerPage && (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, filteredRecords.length)} of {filteredRecords.length} records
                          </span>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }} 
                              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                              disabled={currentPage === 1}
                            >
                              Prev
                            </button>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', padding: '0 8px', fontWeight: 700 }}>
                              {currentPage} / {totalPages}
                            </span>
                            <button 
                              className="btn btn-outline" 
                              style={{ padding: '4px 10px', fontSize: '0.75rem' }} 
                              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                              disabled={currentPage === totalPages}
                            >
                              Next
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Right Side: Interactive Audit detail drawer */}
              {selectedRecord && (
                <div className="card glass-card shadow-2xl border-l-4" style={{ flex: '0 0 calc(42% - 0.75rem)', minWidth: 0, borderLeftColor: 'var(--accent)', minHeight: '600px', display: 'flex', flexDirection: 'column', position: 'sticky', top: '20px' }}>
                  
                  {/* Drawer Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getSourceIcon(selectedRecord.ingestion_record?.source_type)}
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.05em' }}>
                          {selectedRecord.ingestion_record?.source_type} Evidence Record
                        </span>
                      </div>
                      <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '4px' }}>
                        {selectedRecord.activity_type || selectedRecord.category}
                      </h3>
                    </div>
                    <X size={18} cursor="pointer" onClick={() => setSelectedRecord(null)} className="text-gray-400 hover:text-white" />
                  </div>

                  {/* Split Pane Container */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto', flex: 1, paddingRight: '4px' }}>
                    
                    {/* Validation engine cautions */}
                    {selectedRecord.status === 'FLAGGED' && (
                      <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={16} className="text-yellow-500" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-pending)' }}>Pre-Ingestion Alert Flag</h5>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.3' }}>
                            {selectedRecord.suspicious_reason || "Analyzed value triggered normalizer variance check alerts."}
                          </p>
                        </div>
                      </div>
                    )}

                    {selectedRecord.status === 'FAILED' && (
                      <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '8px', padding: '10px 14px', display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                        <AlertTriangle size={16} className="text-red-500" style={{ marginTop: '2px', flexShrink: 0 }} />
                        <div>
                          <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--status-flagged)' }}>Validation Process Failure</h5>
                          <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginTop: '2px', lineHeight: '1.3' }}>
                            {selectedRecord.suspicious_reason || "Critical parsing or calculation error. Marked as invalid."}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Split: LEFT (Raw Payload) */}
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                        <Terminal size={12} className="text-blue-400" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Original Ingested Evidence Payload</span>
                      </div>
                      <div style={{
                        background: '#070709',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        padding: '12px',
                        fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
                        fontSize: '0.72rem',
                        color: '#a7f3d0',
                        overflowX: 'auto',
                        maxHeight: '140px',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {JSON.stringify(selectedRecord.ingestion_record?.raw_payload || selectedRecord.ingestion_record?.raw_json_summary || selectedRecord, null, 2)}
                      </div>
                    </div>

                    {/* Split: RIGHT (Normalized Lineage) */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                        <ShieldCheck size={12} className="text-green-400" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Compliance Lineage Calculation</span>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div className="card" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)' }}>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Reporting Scope</span>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedRecord.scope}</div>
                        </div>
                        <div className="card" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)' }}>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Activity Date</span>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>{selectedRecord.activity_date}</div>
                        </div>
                        <div className="card" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)' }}>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Quantity (Original)</span>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {parseFloat(selectedRecord.raw_value || selectedRecord.original_value).toLocaleString()} {selectedRecord.unit || selectedRecord.original_unit}
                          </div>
                        </div>
                        <div className="card" style={{ padding: '8px 12px', background: 'var(--bg-tertiary)' }}>
                          <span style={{ fontSize: '0.625rem', color: 'var(--text-secondary)' }}>Emission Multiplier</span>
                          <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                            {parseFloat(selectedRecord.emission_factor || selectedRecord.conversion_factor).toFixed(4)}
                          </div>
                        </div>
                      </div>

                      {/* Carbon Emissions Highlight */}
                      <div className="card" style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(16, 185, 129, 0.08))',
                        border: '1px solid rgba(59, 130, 246, 0.15)',
                        borderRadius: '8px',
                        padding: '12px 16px',
                        textAlign: 'center'
                      }}>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Auditable Carbon Footprint</span>
                        <div style={{ fontSize: '1.65rem', fontWeight: 900, color: 'var(--text-primary)', margin: '4px 0 2px' }}>
                          {parseFloat(selectedRecord.kg_co2e || selectedRecord.normalized_value_kgco2e).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          <span style={{ fontSize: '0.9rem', fontWeight: 500, color: 'var(--text-secondary)', marginLeft: '6px' }}>kgCO₂e</span>
                        </div>
                      </div>
                    </div>

                    {/* Analyst notes textarea */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <MessageSquare size={12} className="text-purple-400" />
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>Analyst Audit Notes</span>
                      </div>
                      <textarea
                        value={analystNotes}
                        onChange={(e) => setAnalystNotes(e.target.value)}
                        placeholder="Provide details on unit normalization verification or explain flagged indicators..."
                        disabled={selectedRecord.is_locked || selectedRecord.locked || selectedRecord.status === 'LOCKED'}
                        className="form-input text-area"
                        style={{
                          minHeight: '80px',
                          fontSize: '0.75rem',
                          background: 'var(--bg-tertiary)',
                          resize: 'vertical',
                          lineHeight: '1.4'
                        }}
                      />
                    </div>

                    {/* Change Trace list (Audit Log) */}
                    {selectedRecord.audit_logs && selectedRecord.audit_logs.length > 0 && (
                      <div>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>Audit History Trail</span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '100px', overflowY: 'auto' }}>
                          {selectedRecord.audit_logs.map(log => (
                            <div key={log.id} style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '4px', borderLeft: '2px solid var(--border)' }}>
                              <strong style={{ color: 'var(--text-primary)' }}>{log.action}</strong> by {log.user?.username || 'system'} • {format(new Date(log.timestamp), 'MMM d, HH:mm')}
                              {log.comments && <div style={{ color: 'var(--text-tertiary)', marginTop: '2px' }}>{log.comments}</div>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Drawer Actions Footer */}
                  <div style={{ marginTop: 'auto', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
                    {selectedRecord.is_locked || selectedRecord.locked || selectedRecord.status === 'LOCKED' ? (
                      <div style={{
                        background: 'rgba(59,130,246,0.06)',
                        border: '1px solid rgba(59,130,246,0.15)',
                        borderRadius: '8px',
                        padding: '10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        color: 'var(--accent)',
                        fontSize: '0.8rem',
                        fontWeight: 700
                      }}>
                        <Lock size={14} /> Immutable Audit Ledger Locked
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ flex: 1, borderColor: 'rgba(245, 158, 11, 0.4)', color: '#fbbf24', fontSize: '0.75rem', padding: '8px' }}
                            onClick={() => handleFlagRecord(selectedRecord.id)}
                          >
                            Flag Suspicious
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ flex: 1, borderColor: 'rgba(239, 68, 68, 0.4)', color: '#ef4444', fontSize: '0.75rem', padding: '8px' }}
                            onClick={() => handleRejectRecord(selectedRecord.id)}
                          >
                            Reject Entry
                          </button>
                        </div>
                        <button 
                          className="btn btn-primary" 
                          style={{ width: '100%', padding: '10px', fontSize: '0.8rem', fontWeight: 700, background: 'var(--status-approved)' }}
                          onClick={() => handleApproveRecord(selectedRecord.id)}
                        >
                          Approve Carbon Calculations
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: INTERACTIVE ANALYTICS VIEW */}
          {activeTab === 'ANALYTICS' && (
            <div className="analytics-view">
              
              {/* Scorecard grid */}
              <div className="dashboard-grid">
                <div className="card glass-card scope-card" style={{ borderLeft: '3px solid #60a5fa' }}>
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Scope 1 (Direct Fuel)
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#60a5fa' }} />
                  </div>
                  <div className="card-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {analyticsData.scope1.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>kgCO₂e</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Diesel Liters & Petrol combustion</div>
                </div>

                <div className="card glass-card scope-card" style={{ borderLeft: '3px solid #fbbf24' }}>
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Scope 2 (Indirect Grid)
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#fbbf24' }} />
                  </div>
                  <div className="card-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {analyticsData.scope2.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>kgCO₂e</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Purchased grid electricity</div>
                </div>

                <div className="card glass-card scope-card" style={{ borderLeft: '3px solid #c084fc' }}>
                  <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Scope 3 (Travel & Spend)
                    <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#c084fc' }} />
                  </div>
                  <div className="card-value" style={{ fontSize: '1.5rem', fontWeight: 800 }}>
                    {analyticsData.scope3.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>kgCO₂e</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Flights, hotel stays, procurement spend</div>
                </div>

                <div className="card glass-card scope-card" style={{ borderLeft: '3px solid #10b981', background: 'radial-gradient(circle at top right, rgba(16,185,129,0.06), transparent)' }}>
                  <div className="card-title">Total Ingested Footprint</div>
                  <div className="card-value" style={{ color: 'var(--text-primary)', fontSize: '1.65rem', fontWeight: 900 }}>
                    {analyticsData.total.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginLeft: '4px' }}>kgCO₂e</span>
                  </div>
                  <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>Active audit compliance coverage</div>
                </div>
              </div>

              {/* Progress and Anomalies cards */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '1.5rem' }}>
                {/* Approval audit progress */}
                <div className="card glass-card" style={{ padding: '1.25rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', justifyContent: 'space-between' }}>
                    Audit Sign-Off Progress
                    <span style={{ color: 'var(--accent)' }}>{analyticsData.progress}% Locked</span>
                  </h4>
                  <div className="progress-bar-container" style={{ margin: '12px 0 8px 0', height: '10px' }}>
                    <div className="progress-bar-fill" style={{ width: `${analyticsData.progress}%`, background: 'var(--status-approved)' }} />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--text-secondary)' }}>
                    <span>{analyticsData.locked} records locked on blockchain audit</span>
                    <span>{analyticsData.totalCount} total processed lines</span>
                  </div>
                </div>

                {/* Flags Ratio card */}
                <div className="card glass-card" style={{ padding: '1.25rem', borderLeft: '3px solid #f59e0b' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>Validation Alerts</h4>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, margin: '8px 0 4px', color: '#fbbf24', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <AlertTriangle size={20} />
                    {analyticsData.flagged} Flagged
                  </div>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Requires note logs to authorize locking.</span>
                </div>
              </div>

              {/* Custom SVG Charts panel */}
              <div className="dashboard-grid" style={{ gridTemplateColumns: '3fr 2fr', gap: '1.5rem' }}>
                
                {/* Chart 1: Monthly emissions Area Chart */}
                <div className="card glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '320px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                    Emissions Trajectory Over Time
                  </h4>
                  <div style={{ flex: 1, position: 'relative', width: '100%', height: '100%' }}>
                    {/* Render standard SVG Area Chart */}
                    <svg viewBox="0 0 500 200" style={{ width: '100%', height: '100%' }}>
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
                          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>
                      
                      {/* Grid lines */}
                      <line x1="40" y1="30" x2="480" y2="30" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                      <line x1="40" y1="80" x2="480" y2="80" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                      <line x1="40" y1="130" x2="480" y2="130" stroke="var(--border)" strokeWidth="0.5" strokeDasharray="3" />
                      <line x1="40" y1="170" x2="480" y2="170" stroke="var(--border)" strokeWidth="0.8" />
                      
                      {/* Left axis labels */}
                      <text x="30" y="34" fill="var(--text-secondary)" fontSize="8" textAnchor="end">Max</text>
                      <text x="30" y="104" fill="var(--text-secondary)" fontSize="8" textAnchor="end">Mid</text>
                      <text x="30" y="174" fill="var(--text-secondary)" fontSize="8" textAnchor="end">0</text>

                      {/* Area and Line representation */}
                      {/* Using dynamic points based on computed monthlyTrends */}
                      {(() => {
                        const maxVal = Math.max(...analyticsData.monthlyTrends.map(t => t.emissions), 1);
                        const points = analyticsData.monthlyTrends.map((t, idx) => {
                          const x = 40 + (idx * (440 / Math.max(1, analyticsData.monthlyTrends.length - 1)));
                          const y = 170 - ((t.emissions / maxVal) * 130);
                          return { x, y, label: t.month };
                        });

                        const dPath = points.map((p, i) => `${i===0?'M':'L'} ${p.x} ${p.y}`).join(' ');
                        const areaPath = `${dPath} L ${points[points.length-1].x} 170 L ${points[0].x} 170 Z`;

                        return (
                          <>
                            {/* Area filled */}
                            {points.length > 0 && <path d={areaPath} fill="url(#areaGrad)" />}
                            {/* Trend Line */}
                            {points.length > 0 && <path d={dPath} fill="none" stroke="#3b82f6" strokeWidth="2.5" strokeLinecap="round" />}
                            
                            {/* Render Points and tooltips */}
                            {points.map((p, i) => (
                              <g key={i}>
                                <circle cx={p.x} cy={p.y} r="4" fill="#60a5fa" stroke="var(--bg-secondary)" strokeWidth="1.5" />
                                <text x={p.x} y="185" fill="var(--text-secondary)" fontSize="8" textAnchor="middle">{p.label}</text>
                                {/* Display exact values */}
                                <text x={p.x} y={p.y - 8} fill="var(--text-primary)" fontSize="8" fontWeight="750" textAnchor="middle">
                                  {Math.round(analyticsData.monthlyTrends[i].emissions)} kg
                                </text>
                              </g>
                            ))}
                          </>
                        );
                      })()}
                    </svg>
                  </div>
                </div>

                {/* Chart 2: Scope breakdown Donut Chart */}
                <div className="card glass-card" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', height: '320px' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '1.5rem' }}>
                    Emissions Scope Allocation Ratio
                  </h4>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: '20px' }}>
                    
                    {/* SVG Donut */}
                    <div style={{ width: '160px', height: '160px', position: 'relative' }}>
                      <svg viewBox="0 0 100 100" style={{ width: '100%', height: '100%' }}>
                        {(() => {
                          const s1 = analyticsData.scope1;
                          const s2 = analyticsData.scope2;
                          const s3 = analyticsData.scope3;
                          const total = s1 + s2 + s3 || 1;
                          // Helper to compute stroke dashes
                          const r = 30;
                          const circ = 2 * Math.PI * r;

                          const stroke1 = (s1 / total) * circ;
                          const stroke2 = (s2 / total) * circ;
                          const stroke3 = (s3 / total) * circ;

                          return (
                            <g transform="rotate(-90 50 50)">
                              {/* Background track circle */}
                              <circle cx="50" cy="50" r={r} fill="none" stroke="var(--bg-tertiary)" strokeWidth="10" />
                              
                              {/* Scope 1 Segment */}
                              {s1 > 0 && (
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r={r} 
                                  fill="none" 
                                  stroke="#60a5fa" 
                                  strokeWidth="10" 
                                  strokeDasharray={`${stroke1} ${circ}`} 
                                  strokeDashoffset="0"
                                />
                              )}
                              
                              {/* Scope 2 Segment */}
                              {s2 > 0 && (
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r={r} 
                                  fill="none" 
                                  stroke="#fbbf24" 
                                  strokeWidth="10" 
                                  strokeDasharray={`${stroke2} ${circ}`} 
                                  strokeDashoffset={-stroke1}
                                />
                              )}

                              {/* Scope 3 Segment */}
                              {s3 > 0 && (
                                <circle 
                                  cx="50" 
                                  cy="50" 
                                  r={r} 
                                  fill="none" 
                                  stroke="#a78bfa" 
                                  strokeWidth="10" 
                                  strokeDasharray={`${stroke3} ${circ}`} 
                                  strokeDashoffset={-(stroke1 + stroke2)}
                                />
                              )}
                            </g>
                          );
                        })()}
                      </svg>
                      {/* Center labels */}
                      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center' }}>
                        <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>CO₂e Coverage</div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--text-primary)' }}>100%</div>
                      </div>
                    </div>

                    {/* Chart Legend list */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
                      {[
                        { label: 'Scope 1 (Direct)', color: '#60a5fa', val: analyticsData.scope1 },
                        { label: 'Scope 2 (Indirect)', color: '#fbbf24', val: analyticsData.scope2 },
                        { label: 'Scope 3 (Travel/Procure)', color: '#a78bfa', val: analyticsData.scope3 },
                      ].map((item, idx) => {
                        const total = analyticsData.scope1 + analyticsData.scope2 + analyticsData.scope3 || 1;
                        const pct = Math.round((item.val / total) * 100);
                        return (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }} />
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)' }}>{pct}% {item.label}</span>
                              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>{Math.round(item.val).toLocaleString()} kgCO₂e</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: DATA SOURCES VIEW */}
          {activeTab === 'SOURCES' && (
            <div className="sources-view">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>ESG Pipeline Data Adapters</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Configure connection adapters to sync enterprise data feeds into standard reporting forms.</p>
                </div>
                <button className="btn btn-outline" style={{ gap: '6px', display: 'flex', alignItems: 'center', fontSize: '0.8rem' }} onClick={() => setActiveTab('HEALTH')}>
                  <TrendingUp size={14} /> Telemetry Health
                </button>
              </div>

              <div className="dashboard-grid">
                {[
                  { name: 'SAP S/4HANA (OData API)', type: 'OData API Connector', status: 'Active', source: 'SAP', desc: 'Queries SAP material logs directly for material moves matching standard fuel codes (Scope 1 Direct) or general procurement spend values (Scope 3 Indirect).', color: '#10b981' },
                  { name: 'Utility Billing Cloud', type: 'CSV Meter Mapper', status: 'Active', source: 'UTILITY', desc: 'Syncs ConEd and PGE utility account invoices automatically. Parses monthly billing periods and standardizes energy usage into Scope 2 emissions.', color: '#10b981' },
                  { name: 'Travel Concur Ledger', type: 'Navan SDK / Concur API', status: 'Configured', source: 'TRAVEL', desc: 'Tracks employee travel logs. Maps flight distances and hotel nights into carbon reports. Status is Configured (not Active) because live syncing requires third-party API OAuth keys and webhook authorization.', color: '#f59e0b' },
                  { name: 'Manual Legacy Archive', type: 'CSV & Manual Paste', status: 'Active', source: 'TRAVEL', desc: 'Allows analysts to manually import historical databases or paste CSV audits to compile baseline carbon records. Note: It is active and routes records via the TRAVEL category handler for Scope 3 legacy spend logs.', color: '#10b981' },
                ].map(src => (
                  <div className="card glass-card" key={src.name} style={{ display: 'flex', flexDirection: 'column', minHeight: '260px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                      <div style={{ padding: '8px', background: 'var(--bg-tertiary)', borderRadius: '8px', color: 'var(--accent)', border: '1px solid var(--border)' }}>
                        {getSourceIcon(src.source)}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                        <div style={{ width: '6px', height: '6px', background: src.color, borderRadius: '50%', boxShadow: `0 0 8px ${src.color}` }} className="animate-pulse" />
                        {src.status}
                      </div>
                    </div>
                    
                    <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '2px' }}>{src.name}</h3>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 500 }}>{src.type}</div>
                    
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', lineHeight: '1.4', flex: 1 }}>{src.desc}</p>
                    
                    <div style={{ marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                        {records.filter(r => r.ingestion_record?.source_type === src.source).length} records processed
                      </span>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {orgDetails && (
                          <button 
                            className="btn btn-outline" 
                            style={{ padding: '4px 8px', fontSize: '0.65rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                            onClick={() => handleSyncSource(src.source, orgDetails.id)}
                            disabled={isSyncing[src.source]}
                          >
                            <RefreshCw size={10} className={isSyncing[src.source] ? 'animate-spin' : ''} />
                            {isSyncing[src.source] ? 'Syncing...' : 'Re-sync'}
                          </button>
                        )}
                        <button 
                          className="btn btn-primary" 
                          style={{ padding: '4px 8px', fontSize: '0.65rem' }} 
                          onClick={() => {
                            setIngestType(src.source as any);
                            setIngestSummary(null);
                            setPreValidateRows([]);
                            setPreValidateStats(null);
                            setShowIngestModal(true);
                          }}
                        >
                          Ingest
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: SYSTEM INTEGRITY & LOG TRACE VIEW */}
          {activeTab === 'HEALTH' && (
            <div className="health-view">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)' }}>System Infrastructure Telemetry</h2>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>Real-time parsing node telemetry and adapter verification pipelines.</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#10b981', fontSize: '0.8rem', fontWeight: 700 }}>
                  <Activity size={14} className="text-green-500 animate-pulse" /> Operational
                </div>
              </div>

              <div className="dashboard-grid">
                <div className="card glass-card">
                  <div style={{ color: 'var(--accent)', marginBottom: '0.75rem' }}><Server size={20} /></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>DRF API Gateway Uptime</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0', color: 'var(--text-primary)' }}>99.99%</div>
                  <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>Active checking node: PASS</div>
                </div>
                
                <div className="card glass-card">
                  <div style={{ color: '#fbbf24', marginBottom: '0.75rem' }}><Clock size={20} /></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Normalization Latency</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0', color: 'var(--text-primary)' }}>0.82s</div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Avg carbon multiplier matching node</div>
                </div>

                <div className="card glass-card">
                  <div style={{ color: '#10b981', marginBottom: '0.75rem' }}><ShieldCheck size={20} /></div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Ingested Ledger Integrity</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 900, margin: '4px 0', color: 'var(--text-primary)' }}>100.0%</div>
                  <div style={{ fontSize: '0.65rem', color: '#10b981', fontWeight: 600 }}>Audit hash validation: SUCCESS</div>
                </div>
              </div>

              {/* Console log trace panel */}
              <div className="card" style={{ marginTop: '1.5rem', background: '#070709', border: '1px solid #1c1c24' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', color: 'var(--text-secondary)' }}>
                  <Terminal size={14} className="text-blue-400" /> 
                  <span style={{ fontSize: '0.8rem', fontWeight: 700 }}>Telemetry Sync Log Stream</span>
                </div>
                <div style={{ fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace', fontSize: '0.7rem', color: '#888', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#444' }}>[19:40:22]</span> <span style={{ color: '#10b981', fontWeight: 700 }}>[SUCCESS]</span> SAP Adapter feed ingesting master records</div>
                  <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#444' }}>[19:35:10]</span> <span style={{ color: '#10b981', fontWeight: 700 }}>[SUCCESS]</span> Calculated Scope 2 Utility Baseline meter PGE-4421</div>
                  <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#444' }}>[19:31:05]</span> <span style={{ color: '#3b82f6', fontWeight: 700 }}>[INFO]</span> Validation engine verified integrity scan on Travel flight logs</div>
                  <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#444' }}>[19:28:15]</span> <span style={{ color: '#fbbf24', fontWeight: 700 }}>[WARNING]</span> Potential duplicate check triggered on Utility invoices CONED-9921</div>
                  <div style={{ display: 'flex', gap: '10px' }}><span style={{ color: '#444' }}>[19:20:00]</span> <span style={{ color: '#3b82f6', fontWeight: 700 }}>[INFO]</span> Initialized multitenant isolation manager for user: {user}</div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* MODAL 1: ADVANCED INGEST EVIDENCE MODAL */}
      {showIngestModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-card shadow-2xl" style={{ width: '600px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Upload size={18} className="text-blue-400" />
                Raw Data Ingestion Portal
              </h3>
              <X size={18} cursor="pointer" onClick={() => setShowIngestModal(false)} className="text-gray-400 hover:text-white" />
            </div>

            {/* Ingestion Summary Results */}
            {ingestSummary ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1rem 0' }}>
                <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16,185,129,0.2)', borderRadius: '8px', padding: '12px 16px', textAlign: 'center' }}>
                  <ShieldCheck size={28} className="text-green-500" style={{ margin: '0 auto 8px' }} />
                  <h4 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--status-approved)' }}>Ingestion Ledger Process Complete!</h4>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Raw payload stored successfully. Normalizer calculations appended to review queue.
                  </p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'var(--bg-tertiary)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Processed</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginTop: '2px' }}>{ingestSummary.processed}</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'rgba(16,185,129,0.06)', border: '1px solid rgba(16,185,129,0.1)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Successful</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#10b981', marginTop: '2px' }}>{ingestSummary.success}</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'rgba(245,158,11,0.06)', border: '1px solid rgba(245,158,11,0.1)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Flagged</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#f59e0b', marginTop: '2px' }}>{ingestSummary.flagged}</div>
                  </div>
                  <div className="card" style={{ padding: '10px', textAlign: 'center', background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.1)' }}>
                    <div style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>Failed</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ef4444', marginTop: '2px' }}>{ingestSummary.failed}</div>
                  </div>
                </div>

                <button className="btn btn-primary" style={{ width: '100%', marginTop: '1rem' }} onClick={() => setShowIngestModal(false)}>Close Portal</button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                
                {/* 1. Source Type selector */}
                <div className="form-group">
                  <label style={{ fontSize: '0.75rem', fontWeight: 700 }}>Select Ingestion Adapter Source</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginTop: '6px' }}>
                    {[
                      { key: 'SAP', label: 'SAP ERP (Procure/Fuel)', icon: <Database size={14} /> },
                      { key: 'UTILITY', label: 'Utility Cloud (Energy)', icon: <Zap size={14} /> },
                      { key: 'TRAVEL', label: 'Concur Spend (Travel)', icon: <Plane size={14} /> },
                    ].map(opt => (
                      <button
                        key={opt.key}
                        onClick={() => {
                          setIngestType(opt.key as any);
                          setPreValidateRows([]);
                          setPreValidateStats(null);
                        }}
                        className={`btn ${ingestType === opt.key ? 'btn-primary' : 'btn-outline'}`}
                        style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '10px' }}
                      >
                        {opt.icon}
                        {opt.key}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Method Selector */}
                <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: '16px', paddingBottom: '4px' }}>
                  <button 
                    onClick={() => setIngestMethod('FILE')}
                    style={{ background: 'none', border: 'none', borderBottom: ingestMethod === 'FILE' ? '2px solid var(--accent)' : '2px solid transparent', color: ingestMethod === 'FILE' ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Upload CSV/JSON File
                  </button>
                  <button 
                    onClick={() => setIngestMethod('PASTE')}
                    style={{ background: 'none', border: 'none', borderBottom: ingestMethod === 'PASTE' ? '2px solid var(--accent)' : '2px solid transparent', color: ingestMethod === 'PASTE' ? 'var(--text-primary)' : 'var(--text-secondary)', padding: '4px 8px', fontSize: '0.75rem', cursor: 'pointer', fontWeight: 600 }}
                  >
                    Manual JSON Paste
                  </button>
                </div>

                {/* 3. Ingestion Inputs */}
                {ingestMethod === 'FILE' ? (
                  <div style={{
                    border: '2px dashed var(--border)',
                    borderRadius: '8px',
                    padding: '2rem 1.5rem',
                    textAlign: 'center',
                    background: 'var(--bg-tertiary)',
                    cursor: 'pointer',
                    transition: 'all 0.2s hover'
                  }}>
                    <Upload size={32} style={{ color: 'var(--text-secondary)', margin: '0 auto 12px', opacity: 0.5 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-primary)', display: 'block', fontWeight: 600 }}>Drag and drop evidence exports here</span>
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', marginTop: '4px' }}>Supports structured CSV or JSON formats</span>
                    
                    <input 
                      type="file" 
                      accept=".csv,.json"
                      onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                      className="form-input" 
                      style={{ marginTop: '1rem', fontSize: '0.75rem', padding: '6px' }} 
                    />
                    {selectedFile && (
                      <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, marginTop: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <Check size={14} /> Selected: {selectedFile.name} ({Math.round(selectedFile.size / 1024)} KB)
                      </div>
                    )}
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>Paste raw JSON array matching adapter structure</label>
                    <textarea
                      value={pastedJson}
                      onChange={(e) => {
                        setPastedJson(e.target.value);
                        setPreValidateRows([]);
                        setPreValidateStats(null);
                      }}
                      placeholder={
                        ingestType === 'SAP' ? `[\n  { "MBLNR": "SAP-01", "material_text": "DIESEL", "quantity": 1200, "uom": "L", "date": "2026-05-01" }\n]` :
                        ingestType === 'UTILITY' ? `[\n  { "account_id": "CONED-01", "usage_kwh": 5400, "period_end": "2026-05-15" }\n]` :
                        `[\n  { "type": "flight", "distance_km": 1450, "date": "2026-05-10" },\n  { "type": "hotel", "nights": 3, "date": "2026-05-12" }\n]`
                      }
                      className="form-input text-area"
                      style={{
                        minHeight: '120px',
                        fontFamily: 'SFMono-Regular, Consolas, Monaco, monospace',
                        fontSize: '0.7rem',
                        background: 'var(--bg-tertiary)',
                        lineHeight: '1.4'
                      }}
                    />
                    <button className="btn btn-outline" style={{ alignSelf: 'flex-end', fontSize: '0.65rem', padding: '4px 10px' }} onClick={handlePreValidate}>Pre-scan Data Integrity</button>
                  </div>
                )}

                {/* Pre-ingestion validation scan preview */}
                {preValidateStats && (
                  <div style={{ border: '1px solid var(--border)', borderRadius: '8px', background: 'rgba(7,7,9,0.5)', padding: '10px 14px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '6px', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-primary)' }}>Pre-Ingestion Integrity Scan Preview</span>
                      <div style={{ display: 'flex', gap: '8px', fontSize: '0.65rem', fontWeight: 700 }}>
                        <span style={{ color: '#10b981' }}>{preValidateStats.success} valid</span>
                        <span style={{ color: '#f59e0b' }}>{preValidateStats.flagged} flagged</span>
                        <span style={{ color: '#ef4444' }}>{preValidateStats.failed} failed</span>
                      </div>
                    </div>

                    <div style={{ maxHeight: '100px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {preValidateRows.map((r, idx) => (
                        <div key={idx} style={{ display: 'flex', justifySelf: 'space-between', justifyContent: 'space-between', fontSize: '0.65rem', padding: '4px 6px', background: 'var(--bg-tertiary)', borderRadius: '4px' }}>
                          <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Row #{idx+1} ({r.row.material_text || r.row.type || r.row.account_id || 'item'})</span>
                          <span style={{ 
                            color: r.status === 'SUCCESS' ? '#10b981' : r.status === 'FLAGGED' ? '#f59e0b' : '#ef4444',
                            fontWeight: 700
                          }}>{r.message}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '1rem' }}>
                  <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowIngestModal(false)} disabled={isIngesting}>Cancel</button>
                  <button 
                    className="btn btn-primary" 
                    style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }} 
                    onClick={handleIngest}
                    disabled={isIngesting}
                  >
                    {isIngesting ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" /> Ingesting...
                      </>
                    ) : 'Commit to Ingestion Ledger'}
                  </button>
                </div>

              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL 2: CONFIRM PUBLISH / AUDIT LOCK MODAL */}
      {showPublishModal && (
        <div className="modal-overlay" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div className="modal-content glass-card shadow-2xl" style={{ width: '450px', padding: '1.75rem', textAlign: 'center' }}>
            <ShieldCheck size={44} className="text-green-500" style={{ margin: '0 auto 12px' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>Lock Audit Compliance Ledger</h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '8px', lineHeight: '1.4' }}>
              Publishing will lock all <strong style={{ color: '#10b981' }}>APPROVED ({records.filter(r => r.status === 'APPROVED' && !r.locked && !r.is_locked).length})</strong> records. 
              Once published, these records become part of the compliance archives and cannot be edited, deleted, or re-approved. This guarantees absolute lineage auditability.
            </p>

            <div style={{ display: 'flex', gap: '10px', marginTop: '1.5rem' }}>
              <button className="btn btn-outline" style={{ flex: 1 }} onClick={() => setShowPublishModal(false)}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, background: 'var(--status-approved)' }} onClick={handlePublish}>Publish & Lock Records</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewPortal;
