'use client';
import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { PageHead } from '@/components/ui/PageHead';
import { Icon } from '@/components/ui/Icon';
import { ToastButton } from '@/components/ui/ToastButton';
import { api, errorMessage } from '@/lib/api';
import { useToast } from '@/lib/store';

const OPTIONS = [
  { label: 'Facturation automatique', desc: 'Émettre une facture à chaque séance confirmée.', on: true },
  { label: 'TVA appliquée', desc: 'Inclure la TVA sur les commissions de plateforme.', on: true },
  { label: 'Versements automatiques', desc: 'Reverser les praticiens sans validation manuelle.', on: true },
  { label: 'Retenue en cas de litige', desc: 'Geler le versement tant qu’un litige est ouvert.', on: true },
];

export default function BillingSettingsPage() {
  const toast = useToast();
  const queryClient = useQueryClient();
  const { data } = useQuery({
    queryKey: ['admin', 'settings', 'commission'],
    queryFn: () => api.get('/admin/settings/commission'),
  });
  // Backend stores/returns a decimal fraction (0.15); this field displays/edits a
  // percentage (15) — the only conversion boundary, kept entirely in this component.
  const [ratePercent, setRatePercent] = useState('15');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (typeof data?.data?.commission_rate === 'number') {
      setRatePercent(String(Math.round(data.data.commission_rate * 1000) / 10));
    }
  }, [data]);

  const saveCommission = async () => {
    setSaving(true);
    setError('');
    try {
      await api.put('/admin/settings/commission', { commission_rate: Number(ratePercent) / 100 });
      await queryClient.invalidateQueries({ queryKey: ['admin', 'settings', 'commission'] });
      toast('Taux de commission mis à jour', 'success');
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHead
        title="Facturation"
        subtitle="Commission, versements et fiscalité."
        crumbs={[{ label: 'Admin', href: '/admin' }, { label: 'Réglages', href: '/admin/parametres' }, { label: 'Facturation' }]}
      />

      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Commission & versements</h3>
          <div className="stack gap-4">
            <div className="field">
              <label>Taux de commission (%)</label>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={ratePercent}
                onChange={(e) => setRatePercent(e.target.value)}
              />
              {error && <div className="tiny" style={{ color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
              <div className="tiny" style={{ marginTop: 4 }}>
                Utilisé par Stripe Connect pour calculer la part reversée aux praticiens sur chaque séance payée.
              </div>
            </div>
            <div className="field">
              <label>Fréquence des versements</label>
              <select className="input" defaultValue="hebdo">
                <option value="quotidien">Quotidien</option>
                <option value="hebdo">Hebdomadaire (lundi)</option>
                <option value="mensuel">Mensuel (1er du mois)</option>
              </select>
            </div>
            <div className="field">
              <label>Seuil minimum de versement (€)</label>
              <input className="input" type="number" defaultValue="50" />
            </div>
            <div className="field">
              <label>Délai de rétractation client (jours)</label>
              <input className="input" type="number" defaultValue="14" />
            </div>
          </div>
        </div>

        <div className="card card-pad">
          <h3 className="h-3" style={{ marginBottom: 18 }}>Fiscalité & facturation</h3>
          <div className="stack gap-4">
            <div className="field">
              <label>Taux de TVA (%)</label>
              <input className="input" type="number" defaultValue="20" />
            </div>
            <div className="field">
              <label>Numéro de TVA intracommunautaire</label>
              <input className="input" defaultValue="FR 42 902 145 678" />
            </div>
            <div className="field">
              <label>Raison sociale</label>
              <input className="input" defaultValue="GuériEnergies SAS" />
            </div>
            <div className="field">
              <label>Adresse de facturation</label>
              <textarea className="input" rows={3} defaultValue={"12 rue des Lilas\n74000 Annecy, France"} />
            </div>
          </div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 24 }}>
        <h3 className="h-3" style={{ marginBottom: 18 }}>Options</h3>
        <div className="stack gap-4">
          {OPTIONS.map((o) => (
            <div key={o.label}>
              <div className="row between" style={{ alignItems: 'flex-start' }}>
                <div className="flex-1" style={{ paddingRight: 12 }}>
                  <div style={{ fontWeight: 500, fontSize: 14 }}>{o.label}</div>
                  <div className="tiny">{o.desc}</div>
                </div>
                <span className={`switch${o.on ? ' on' : ''}`} role="switch" aria-checked={o.on}><span className="knob" /></span>
              </div>
              <div className="divider" />
            </div>
          ))}
        </div>
      </div>

      <div className="row" style={{ justifyContent: 'flex-end', gap: 10 }}>
        <ToastButton
          message="Autres réglages de facturation enregistrés"
          tone="success"
          className="btn btn-soft"
          title="Les autres champs de cette page (TVA, versements, options) restent décoratifs — hors périmètre de ce plan"
        >
          Enregistrer les autres champs
        </ToastButton>
        <button type="button" className="btn btn-primary" onClick={saveCommission} disabled={saving}>
          <Icon name="check" size={16} /> {saving ? 'Enregistrement…' : 'Enregistrer la commission'}
        </button>
      </div>
    </>
  );
}
