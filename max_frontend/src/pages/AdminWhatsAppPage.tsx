/**
 * Admin WhatsApp Provisioning Page
 *
 * Section 1: Demandes pending (tenants en attente de provisioning)
 * Section 2: Instances actives (tenants connectes/qr_ready/disabled)
 * Section 3: Instances expirees
 *
 * Actions admin:
 * - Provisionner une instance (entrer instanceId + apiToken)
 * - Afficher QR code d'un tenant
 * - Verifier statut Green-API
 * - Logout hard
 * - Recycler instance (transferer vers un autre tenant)
 */

import { useState, useEffect } from 'react';
import { apiClient } from '../api/client';
import { useToast } from '../hooks/useToast';

interface WhatsAppRequest {
  id: number;
  tenant_id: string;
  tenant_name: string | null;
  owner_email: string | null;
  whatsapp_status: string;
  phone_number: string | null;
  connection_status: string;
  is_active: boolean;
  provisioned_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

interface ProvisionForm {
  tenantId: string;
  instanceId: string;
  apiToken: string;
  expiresAt: string;
}

export function AdminWhatsAppPage() {
  const toast = useToast();

  const [pending, setPending] = useState<WhatsAppRequest[]>([]);
  const [active, setActive] = useState<WhatsAppRequest[]>([]);
  const [expired, setExpired] = useState<WhatsAppRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Provision form
  const [showProvisionForm, setShowProvisionForm] = useState(false);
  const [provisionForm, setProvisionForm] = useState<ProvisionForm>({
    tenantId: '',
    instanceId: '',
    apiToken: '',
    expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [provisioning, setProvisioning] = useState(false);

  // QR code modal
  const [qrModal, setQrModal] = useState<{ tenantId: string; qrCode: string } | null>(null);

  // Reassign modal
  const [reassignModal, setReassignModal] = useState<{ fromTenantId: string } | null>(null);
  const [reassignTarget, setReassignTarget] = useState('');

  useEffect(() => {
    loadRequests();
  }, []);

  const loadRequests = async () => {
    try {
      setLoading(true);
      const response: any = await apiClient.get('/admin/whatsapp/requests');
      setPending(response.pending || []);
      setActive(response.active || []);
      setExpired(response.expired || []);
    } catch (error: any) {
      console.error('[Admin WA] Error:', error);
      toast.error('Erreur chargement des demandes WhatsApp');
    } finally {
      setLoading(false);
    }
  };

  const handleProvision = async () => {
    if (!provisionForm.tenantId || !provisionForm.instanceId || !provisionForm.apiToken) {
      toast.error('Tous les champs sont obligatoires');
      return;
    }

    setProvisioning(true);
    try {
      const response: any = await apiClient.post('/admin/whatsapp/provision', {
        tenantId: provisionForm.tenantId,
        instanceId: provisionForm.instanceId,
        apiToken: provisionForm.apiToken,
        expiresAt: provisionForm.expiresAt ? new Date(provisionForm.expiresAt).toISOString() : undefined
      });
      toast.success(response.message || 'Instance provisionnee!');
      setShowProvisionForm(false);
      setProvisionForm({ tenantId: '', instanceId: '', apiToken: '', expiresAt: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] });
      await loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur provisioning');
    } finally {
      setProvisioning(false);
    }
  };

  const handleShowQR = async (tenantId: string) => {
    try {
      const response: any = await apiClient.get(`/admin/whatsapp/qr/${tenantId}`);
      setQrModal({ tenantId, qrCode: response.qrCode });
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur generation QR');
    }
  };

  const handleCheckStatus = async (tenantId: string) => {
    try {
      const response: any = await apiClient.get(`/admin/whatsapp/status/${tenantId}`);
      toast.info(`${tenantId}: Green-API = ${response.greenApiState || 'N/A'}, Status = ${response.whatsapp_status}`);
      await loadRequests();
    } catch (error: any) {
      toast.error('Erreur verification statut');
    }
  };

  const handleLogout = async (tenantId: string) => {
    if (!confirm(`Logout HARD pour ${tenantId}? Le client devra re-scanner le QR code.`)) return;

    try {
      const response: any = await apiClient.post('/admin/whatsapp/logout', { tenantId });
      toast.success(response.message || 'Logout effectue');
      await loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur logout');
    }
  };

  const handleReassign = async () => {
    if (!reassignModal || !reassignTarget) return;

    if (!confirm(`Transferer l'instance de ${reassignModal.fromTenantId} vers ${reassignTarget}?`)) return;

    try {
      const response: any = await apiClient.post('/admin/whatsapp/reassign', {
        fromTenantId: reassignModal.fromTenantId,
        toTenantId: reassignTarget
      });
      toast.success(response.message || 'Instance transferee');
      setReassignModal(null);
      setReassignTarget('');
      await loadRequests();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erreur reassign');
    }
  };

  const handleQuickProvision = (tenantId: string) => {
    setProvisionForm(prev => ({ ...prev, tenantId }));
    setShowProvisionForm(true);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending_provisioning: 'bg-amber-100 text-amber-800',
      qr_ready: 'bg-blue-100 text-blue-800',
      connected: 'bg-green-100 text-green-800',
      disabled: 'bg-gray-100 text-gray-600',
      expired: 'bg-red-100 text-red-800'
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">WhatsApp Provisioning</h1>
            <p className="text-gray-600 mt-1">
              Gerez les instances WhatsApp de tous les tenants
            </p>
          </div>
          <button
            onClick={() => setShowProvisionForm(!showProvisionForm)}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors"
          >
            + Provisionner une instance
          </button>
        </div>

        {/* Provision Form */}
        {showProvisionForm && (
          <div className="bg-white border-2 border-green-200 rounded-xl p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Provisionner une instance Green-API</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID *</label>
                <input
                  type="text"
                  value={provisionForm.tenantId}
                  onChange={(e) => setProvisionForm(prev => ({ ...prev, tenantId: e.target.value }))}
                  placeholder="ex: alpha-corp"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Instance ID Green-API *</label>
                <input
                  type="text"
                  value={provisionForm.instanceId}
                  onChange={(e) => setProvisionForm(prev => ({ ...prev, instanceId: e.target.value }))}
                  placeholder="ex: 7105440259"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">API Token *</label>
                <input
                  type="password"
                  value={provisionForm.apiToken}
                  onChange={(e) => setProvisionForm(prev => ({ ...prev, apiToken: e.target.value }))}
                  placeholder="Token Green-API"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date d'expiration</label>
                <input
                  type="date"
                  value={provisionForm.expiresAt}
                  onChange={(e) => setProvisionForm(prev => ({ ...prev, expiresAt: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleProvision}
                disabled={provisioning}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium disabled:opacity-50"
              >
                {provisioning ? 'Provisioning...' : 'Provisionner'}
              </button>
              <button
                onClick={() => setShowProvisionForm(false)}
                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                Annuler
              </button>
            </div>
          </div>
        )}

        {/* Section 1: Demandes Pending */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-200">
          <div className="px-6 py-4 border-b border-amber-100 bg-amber-50 rounded-t-xl">
            <h2 className="text-lg font-semibold text-amber-900">
              Demandes en attente ({pending.length})
            </h2>
          </div>
          {pending.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Aucune demande en attente</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pending.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{req.tenant_name || req.tenant_id}</div>
                        <div className="text-xs text-gray-500">{req.tenant_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{req.owner_email || req.created_by || '-'}</td>
                      <td className="px-4 py-3 text-sm font-medium">{req.phone_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(req.created_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleQuickProvision(req.tenant_id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                        >
                          Provisionner
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 2: Instances Actives */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Instances actives ({active.length})
            </h2>
          </div>
          {active.length === 0 ? (
            <div className="p-6 text-center text-gray-500">Aucune instance active</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expire</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {active.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{req.tenant_name || req.tenant_id}</div>
                        <div className="text-xs text-gray-500">{req.tenant_id}</div>
                      </td>
                      <td className="px-4 py-3">{statusBadge(req.whatsapp_status)}</td>
                      <td className="px-4 py-3 text-sm">{req.phone_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{formatDate(req.expires_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleShowQR(req.tenant_id)}
                            className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-800 text-xs rounded"
                            title="Afficher QR"
                          >
                            QR
                          </button>
                          <button
                            onClick={() => handleCheckStatus(req.tenant_id)}
                            className="px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded"
                            title="Verifier statut"
                          >
                            Status
                          </button>
                          <button
                            onClick={() => handleLogout(req.tenant_id)}
                            className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-800 text-xs rounded"
                            title="Logout hard"
                          >
                            Logout
                          </button>
                          <button
                            onClick={() => setReassignModal({ fromTenantId: req.tenant_id })}
                            className="px-2 py-1 bg-purple-100 hover:bg-purple-200 text-purple-800 text-xs rounded"
                            title="Recycler instance"
                          >
                            Recycler
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3: Expired */}
        {expired.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-red-200">
            <div className="px-6 py-4 border-b border-red-100 bg-red-50 rounded-t-xl">
              <h2 className="text-lg font-semibold text-red-900">
                Instances expirees ({expired.length})
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tenant</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Numero</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expire le</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expired.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{req.tenant_name || req.tenant_id}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{req.phone_number || '-'}</td>
                      <td className="px-4 py-3 text-sm text-red-600">{formatDate(req.expires_at)}</td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleQuickProvision(req.tenant_id)}
                          className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-sm rounded-lg"
                        >
                          Renouveler
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* QR Code Modal */}
        {qrModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setQrModal(null)}>
            <div className="bg-white rounded-xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">QR Code - {qrModal.tenantId}</h3>
              <div className="flex justify-center">
                <img src={qrModal.qrCode} alt="QR Code" className="w-64 h-64" />
              </div>
              <button
                onClick={() => setQrModal(null)}
                className="w-full mt-4 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
              >
                Fermer
              </button>
            </div>
          </div>
        )}

        {/* Reassign Modal */}
        {reassignModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setReassignModal(null)}>
            <div className="bg-white rounded-xl p-6 max-w-md" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold mb-4">Recycler instance</h3>
              <p className="text-sm text-gray-600 mb-4">
                Transferer l'instance de <strong>{reassignModal.fromTenantId}</strong> vers:
              </p>
              <input
                type="text"
                value={reassignTarget}
                onChange={(e) => setReassignTarget(e.target.value)}
                placeholder="Tenant ID cible"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-4"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleReassign}
                  disabled={!reassignTarget}
                  className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium disabled:opacity-50"
                >
                  Transferer
                </button>
                <button
                  onClick={() => { setReassignModal(null); setReassignTarget(''); }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
