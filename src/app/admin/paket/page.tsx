'use client';

import React, { useState, useEffect } from 'react';
import {
  Package,
  Edit2,
  Plus,
  Trash2,
  CheckCircle2,
  Save,
  X,
  Clock,
  Layers,
  Sparkles,
  Loader2,
  AlertCircle,
  Tag,
} from 'lucide-react';
import { PlanService, DynamicPlan, PlanDurationItem } from '@/services/plan.service';
import { useModal } from '@/contexts/modal-context';

export default function AdminPaketPage() {
  const { showSuccess, showError, confirmAction } = useModal();
  const [plans, setPlans] = useState<DynamicPlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal State untuk Edit/Tambah Paket
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlan, setEditingPlan] = useState<DynamicPlan | null>(null);

  // Form State Paket
  const [planCode, setPlanCode] = useState('');
  const [planName, setPlanName] = useState('');
  const [planDescription, setPlanDescription] = useState('');
  const [planPrice, setPlanPrice] = useState(0);
  const [planDurationDays, setPlanDurationDays] = useState(30);
  const [maxBrands, setMaxBrands] = useState(1);
  const [maxMembers, setMaxMembers] = useState(0);
  const [maxPosts, setMaxPosts] = useState<number | null>(30);
  const [storageMb, setStorageMb] = useState(200);
  const [maxFileMb, setMaxFileMb] = useState(10);
  const [allowVideo, setAllowVideo] = useState(false);
  const [allowGrid, setAllowGrid] = useState(false);
  const [allowExport, setAllowExport] = useState(false);
  const [allowApproval, setAllowApproval] = useState(false);
  const [allowComments, setAllowComments] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [sortOrder, setSortOrder] = useState(1);
  const [isSavingPlan, setIsSavingPlan] = useState(false);

  // Modal State untuk Tambah/Edit Variasi Durasi
  const [showDurationModal, setShowDurationModal] = useState(false);
  const [targetPlanForDuration, setTargetPlanForDuration] = useState<DynamicPlan | null>(null);
  const [editingDuration, setEditingDuration] = useState<PlanDurationItem | null>(null);
  const [durationName, setDurationName] = useState('3 Bulan');
  const [durationDays, setDurationDays] = useState(90);
  const [durationPrice, setDurationPrice] = useState(139000);
  const [durationDiscount, setDurationDiscount] = useState(5);
  const [isDurationActive, setIsDurationActive] = useState(true);
  const [isSavingDuration, setIsSavingDuration] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const data = await PlanService.getAllPlans();
      setPlans(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openAddPlanModal = () => {
    setEditingPlan(null);
    setPlanCode(`custom_${Date.now().toString().slice(-4)}`);
    setPlanName('');
    setPlanDescription('');
    setPlanPrice(49000);
    setPlanDurationDays(30);
    setMaxBrands(3);
    setMaxMembers(2);
    setMaxPosts(null);
    setStorageMb(2048);
    setMaxFileMb(30);
    setAllowVideo(true);
    setAllowGrid(true);
    setAllowExport(true);
    setAllowApproval(false);
    setAllowComments(false);
    setIsActive(true);
    setSortOrder(plans.length + 1);
    setShowPlanModal(true);
  };

  const openEditPlanModal = (p: DynamicPlan) => {
    setEditingPlan(p);
    setPlanCode(p.code);
    setPlanName(p.name);
    setPlanDescription(p.description || '');
    setPlanPrice(p.price);
    setPlanDurationDays(p.durationDays || 30);
    setMaxBrands(p.maxBrands);
    setMaxMembers(p.maxMembers);
    setMaxPosts(p.maxPosts);
    setStorageMb(p.storageMb);
    setMaxFileMb(p.maxFileMb);
    setAllowVideo(p.allowVideo);
    setAllowGrid(p.allowGrid);
    setAllowExport(p.allowExport);
    setAllowApproval(p.allowApproval);
    setAllowComments(p.allowComments);
    setIsActive(p.isActive);
    setSortOrder(p.sortOrder);
    setShowPlanModal(true);
  };

  const handleSavePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planName || !planCode) {
      showError('Data Tidak Lengkap', 'Nama paket dan kode paket wajib diisi.');
      return;
    }

    setIsSavingPlan(true);
    try {
      if (editingPlan) {
        await PlanService.updatePlan(editingPlan.code, {
          name: planName,
          description: planDescription,
          price: planPrice,
          durationDays: planDurationDays,
          maxBrands,
          maxMembers,
          maxPosts,
          storageMb,
          maxFileMb,
          allowVideo,
          allowGrid,
          allowExport,
          allowApproval,
          allowComments,
          isActive,
          sortOrder,
        });
        showSuccess('Paket Diperbarui!', `Konfigurasi paket ${planName} telah disimpan.`);
      } else {
        await PlanService.createPlan({
          code: planCode.toLowerCase().replace(/[^a-z0-9_]/g, ''),
          name: planName,
          description: planDescription,
          price: planPrice,
          durationDays: planDurationDays,
          maxBrands,
          maxMembers,
          maxPosts,
          storageMb,
          maxFileMb,
          maxSnippets: null,
          allowVideo,
          allowGrid,
          allowExport,
          allowApproval,
          allowComments,
          isActive,
          sortOrder,
          durations: [],
        });
        showSuccess('Paket Ditambahkan!', `Paket ${planName} berhasil dibuat dan tersimpan di database.`);
      }

      setShowPlanModal(false);
      await loadData();
    } catch (err: any) {
      showError('Gagal Menyimpan Paket', err.message);
    } finally {
      setIsSavingPlan(false);
    }
  };

  // VARIATION DURATION HANDLERS
  const openAddDurationModal = (plan: DynamicPlan) => {
    setTargetPlanForDuration(plan);
    setEditingDuration(null);
    setDurationName('3 Bulan');
    setDurationDays(90);
    setDurationPrice(plan.price * 3 * 0.95);
    setDurationDiscount(5);
    setIsDurationActive(true);
    setShowDurationModal(true);
  };

  const openEditDurationModal = (plan: DynamicPlan, dur: PlanDurationItem) => {
    setTargetPlanForDuration(plan);
    setEditingDuration(dur);
    setDurationName(dur.name);
    setDurationDays(dur.durationDays);
    setDurationPrice(dur.price);
    setDurationDiscount(dur.discountPercent);
    setIsDurationActive(dur.isActive);
    setShowDurationModal(true);
  };

  const handleSaveDuration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetPlanForDuration || !durationName) return;

    setIsSavingDuration(true);
    try {
      if (editingDuration) {
        await PlanService.updateDurationVariant(targetPlanForDuration.code, editingDuration.id, {
          name: durationName,
          durationDays,
          price: durationPrice,
          discountPercent: durationDiscount,
          isActive: isDurationActive,
        });
        showSuccess('Variasi Diperbarui', `Variasi durasi ${durationName} berhasil diperbarui.`);
      } else {
        await PlanService.addDurationVariant(targetPlanForDuration.code, {
          name: durationName,
          durationDays,
          price: durationPrice,
          discountPercent: durationDiscount,
          isActive: isDurationActive,
          sortOrder: (targetPlanForDuration.durations?.length || 0) + 1,
        });
        showSuccess('Variasi Ditambahkan', `Variasi ${durationName} berhasil ditambahkan ke paket ${targetPlanForDuration.name}.`);
      }

      setShowDurationModal(false);
      await loadData();
    } catch (err: any) {
      showError('Gagal Menyimpan Variasi', err.message);
    } finally {
      setIsSavingDuration(false);
    }
  };

  const handleDeleteDuration = (plan: DynamicPlan, dur: PlanDurationItem) => {
    confirmAction({
      title: 'Hapus Variasi Durasi?',
      message: `Apakah Anda yakin ingin menghapus variasi "${dur.name}" dari paket ${plan.name}?`,
      danger: true,
      confirmText: 'Ya, Hapus',
      onConfirm: async () => {
        await PlanService.deleteDurationVariant(plan.code, dur.id);
        await loadData();
        showSuccess('Variasi Dihapus', `Variasi durasi ${dur.name} telah dihapus.`);
      },
    });
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Header Halaman */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <Package size={24} style={{ color: '#16a34a' }} />
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>
              Pengelolaan Paket & Variasi Durasi Dinamis
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Tambah paket baru, ubah harga, atur fitur kuota, dan tentukan pilihan variasi durasi berlangganan (1, 3, 6, 12 Bulan) secara dinamis.
          </p>
        </div>

        <button
          onClick={openAddPlanModal}
          className="btn-uda btn-uda-primary btn-uda-sm"
          style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
        >
          <Plus size={16} />
          <span>Tambah Paket Baru</span>
        </button>
      </div>

      {/* Grid Kartu Paket */}
      {isLoading ? (
        <div style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
          <Loader2 size={32} className="animate-spin" style={{ color: '#16a34a', margin: '0 auto 12px' }} />
          <div>Memuat data paket dan variasi durasi...</div>
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))',
            gap: 24,
            alignItems: 'stretch',
          }}
        >
          {plans.map((p) => {
            const isPro = p.code === 'pro';
            const isTeam = p.code === 'team';
            const borderColor = isTeam ? '#7c3aed' : isPro ? '#16a34a' : '#94a3b8';

            return (
              <div
                key={p.code}
                className="uda-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 24,
                  borderRadius: 20,
                  borderTop: `4px solid ${borderColor}`,
                  boxShadow: '0 4px 18px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{p.name}</h3>
                        {!p.isActive && (
                          <span className="status-pill" style={{ backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '0.68rem' }}>
                            Nonaktif
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.74rem', color: '#64748b' }}>Kode: {p.code}</div>
                    </div>

                    <button
                      onClick={() => openEditPlanModal(p)}
                      className="btn-uda btn-uda-secondary btn-uda-sm"
                      style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit2 size={13} />
                      <span>Edit Paket</span>
                    </button>
                  </div>

                  <p style={{ fontSize: '0.82rem', color: '#64748b', minHeight: 36, marginBottom: 14 }}>
                    {p.description || 'Tidak ada deskripsi.'}
                  </p>

                  <div style={{ backgroundColor: '#f8fafc', padding: '12px 14px', borderRadius: 12, marginBottom: 16 }}>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: 600 }}>Harga Dasar (1 Bulan):</div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a', margin: '2px 0 4px' }}>
                      {p.price === 0 ? 'Gratis' : `Rp ${p.price.toLocaleString('id-ID')}`}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#475569' }}>
                      Maks. <strong>{p.maxBrands} Brand</strong> • <strong>{p.maxMembers} Anggota</strong> •{' '}
                      <strong>{p.storageMb >= 1024 ? `${p.storageMb / 1024} GB` : `${p.storageMb} MB`}</strong>
                    </div>
                  </div>

                  {/* DAFTAR VARIASI DURASI */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 14, marginBottom: 16 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: '0.82rem', fontWeight: 800, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Clock size={14} style={{ color: '#0284c7' }} />
                        <span>Variasi Durasi Berlangganan:</span>
                      </span>
                      <button
                        onClick={() => openAddDurationModal(p)}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#16a34a',
                          fontSize: '0.76rem',
                          fontWeight: 800,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 2,
                        }}
                      >
                        <Plus size={13} />
                        <span>Tambah Durasi</span>
                      </button>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {(p.durations || []).length === 0 ? (
                        <div style={{ fontSize: '0.78rem', color: '#94a3b8', fontStyle: 'italic', padding: '6px 0' }}>
                          Belum ada variasi durasi khusus.
                        </div>
                      ) : (
                        p.durations.map((dur) => (
                          <div
                            key={dur.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 10px',
                              borderRadius: 8,
                              backgroundColor: dur.isActive ? '#ffffff' : '#f1f5f9',
                              border: '1px solid #e2e8f0',
                              fontSize: '0.8rem',
                            }}
                          >
                            <div>
                              <span style={{ fontWeight: 800, color: '#0f172a' }}>{dur.name}</span>
                              <span style={{ color: '#64748b', marginLeft: 8 }}>
                                Rp {dur.price.toLocaleString('id-ID')}
                              </span>
                              {dur.discountPercent > 0 && (
                                <span style={{ marginLeft: 6, fontSize: '0.7rem', color: '#16a34a', fontWeight: 800 }}>
                                  (-{dur.discountPercent}%)
                                </span>
                              )}
                            </div>

                            <div style={{ display: 'flex', gap: 4 }}>
                              <button
                                onClick={() => openEditDurationModal(p, dur)}
                                style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 2 }}
                                title="Edit Variasi"
                              >
                                <Edit2 size={13} />
                              </button>
                              <button
                                onClick={() => handleDeleteDuration(p, dur)}
                                style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', padding: 2 }}
                                title="Hapus Variasi"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Fitur Aktif Badge */}
                  <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12, display: 'flex', gap: 6, flexWrap: 'wrap', fontSize: '0.75rem' }}>
                    {p.allowVideo && <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Video</span>}
                    {p.allowGrid && <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Grid IG</span>}
                    {p.allowExport && <span style={{ backgroundColor: '#f0fdf4', color: '#16a34a', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Ekspor CSV/.ics</span>}
                    {p.allowApproval && <span style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Wajib Review</span>}
                    {p.allowComments && <span style={{ backgroundColor: '#f5f3ff', color: '#7c3aed', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>Komentar Tim</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL EDIT / TAMBAH PAKET */}
      {showPlanModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 580,
              width: '100%',
              padding: 24,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Package size={22} style={{ color: '#16a34a' }} />
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingPlan ? `Edit Paket: ${editingPlan.name}` : 'Tambah Paket Baru'}
                </h3>
              </div>
              <button
                onClick={() => setShowPlanModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSavePlan} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div className="admin-modal-grid-2col">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Kode Paket (Unik) *
                  </label>
                  <input
                    type="text"
                    required
                    disabled={!!editingPlan}
                    placeholder="pro, team, agency..."
                    value={planCode}
                    onChange={(e) => setPlanCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      border: '1px solid #cbd5e1',
                      borderRadius: 8,
                      fontSize: '0.88rem',
                      outline: 'none',
                      backgroundColor: editingPlan ? '#f1f5f9' : '#ffffff',
                    }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Nama Paket *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Pro, Tim, Bisnis..."
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Deskripsi Paket
                </label>
                <textarea
                  rows={2}
                  placeholder="Deskripsi singkat target pengguna dan manfaat paket..."
                  value={planDescription}
                  onChange={(e) => setPlanDescription(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none', resize: 'vertical' }}
                />
              </div>

              <div className="admin-modal-grid-2col">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Harga Dasar (Rp) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planPrice}
                    onChange={(e) => setPlanPrice(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Durasi Dasar (Hari) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={planDurationDays}
                    onChange={(e) => setPlanDurationDays(parseInt(e.target.value) || 30)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="admin-modal-grid-2col">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Maksimal Brand
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxBrands}
                    onChange={(e) => setMaxBrands(parseInt(e.target.value) || 1)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Maksimal Anggota Tim
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={maxMembers}
                    onChange={(e) => setMaxMembers(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div className="admin-modal-grid-2col">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Kapasitas Storage (MB)
                  </label>
                  <input
                    type="number"
                    min="10"
                    value={storageMb}
                    onChange={(e) => setStorageMb(parseInt(e.target.value) || 200)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Status Paket
                  </label>
                  <select
                    value={isActive ? 'true' : 'false'}
                    onChange={(e) => setIsActive(e.target.value === 'true')}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none', backgroundColor: '#ffffff' }}
                  >
                    <option value="true">Aktif (Tampil di Landing & Upgrade)</option>
                    <option value="false">Nonaktif (Diarsipkan)</option>
                  </select>
                </div>
              </div>

              {/* Checklist Fitur */}
              <div style={{ backgroundColor: '#f8fafc', padding: '14px', borderRadius: 12 }}>
                <div style={{ fontWeight: 800, fontSize: '0.84rem', color: '#0f172a', marginBottom: 8 }}>
                  Fitur yang Diaktifkan:
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.82rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={allowVideo} onChange={(e) => setAllowVideo(e.target.checked)} />
                    <span>Upload Video</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={allowGrid} onChange={(e) => setAllowGrid(e.target.checked)} />
                    <span>Pratinjau Grid IG</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={allowExport} onChange={(e) => setAllowExport(e.target.checked)} />
                    <span>Ekspor CSV / .ics</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={allowApproval} onChange={(e) => setAllowApproval(e.target.checked)} />
                    <span>Wajib Review Tim</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                    <input type="checkbox" checked={allowComments} onChange={(e) => setAllowComments(e.target.checked)} />
                    <span>Komentar & Revisi</span>
                  </label>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowPlanModal(false)}
                  disabled={isSavingPlan}
                  className="btn-uda btn-uda-secondary"
                  style={{ fontWeight: 700, flex: '1 1 100px', justifyContent: 'center' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlan}
                  className="btn-uda btn-uda-primary"
                  style={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 160px' }}
                >
                  {isSavingPlan ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Simpan Konfigurasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL TAMBAH / EDIT VARIASI DURASI */}
      {showDurationModal && targetPlanForDuration && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: 20,
            animation: 'fadeIn 0.2s ease-out',
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 460,
              width: '100%',
              padding: 24,
              borderRadius: 20,
              backgroundColor: '#ffffff',
              maxHeight: '90vh',
              overflowY: 'auto',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Clock size={20} style={{ color: '#0284c7' }} />
                <h3 style={{ fontSize: '1.18rem', fontWeight: 800, color: '#0f172a' }}>
                  {editingDuration ? 'Edit Variasi Durasi' : `Tambah Durasi: Paket ${targetPlanForDuration?.name}`}
                </h3>
              </div>
              <button
                onClick={() => setShowDurationModal(false)}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 4 }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveDuration} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Label Durasi *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: 1 Bulan, 3 Bulan, 6 Bulan, 12 Bulan"
                  value={durationName}
                  onChange={(e) => setDurationName(e.target.value)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div className="admin-modal-grid-2col">
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Jumlah Hari (Aktif) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={durationDays}
                    onChange={(e) => setDurationDays(parseInt(e.target.value) || 30)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Diskon (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={durationDiscount}
                    onChange={(e) => setDurationDiscount(parseInt(e.target.value) || 0)}
                    style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Harga Paket untuk Durasi Ini (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={durationPrice}
                  onChange={(e) => setDurationPrice(parseInt(e.target.value) || 0)}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                <input
                  type="checkbox"
                  id="durActive"
                  checked={isDurationActive}
                  onChange={(e) => setIsDurationActive(e.target.checked)}
                />
                <label htmlFor="durActive" style={{ fontSize: '0.84rem', color: '#334155', cursor: 'pointer' }}>
                  Variasi durasi ini aktif dan dapat dipilih pengguna saat upgrade
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setShowDurationModal(false)}
                  disabled={isSavingDuration}
                  className="btn-uda btn-uda-secondary"
                  style={{ fontWeight: 700, flex: '1 1 100px', justifyContent: 'center' }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSavingDuration}
                  className="btn-uda btn-uda-primary"
                  style={{ fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flex: '1 1 160px' }}
                >
                  {isSavingDuration ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  <span>Simpan Variasi</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
