'use client';

import React, { useState } from 'react';
import { Copy, Plus, Trash2, Edit3, Sparkles } from 'lucide-react';
import { DUMMY_SNIPPETS, DUMMY_BRANDS, DummySnippet, DummyBrand } from '@/lib/dummy-data';
import { SnippetService } from '@/services/snippet.service';
import { BrandService } from '@/services/brand.service';
import { useAuth } from '@/contexts/auth-context';
import { useModal } from '@/contexts/modal-context';
import { GuidedTour, TourStep } from '@/components/guided-tour';

const bankTourSteps: TourStep[] = [
  {
    targetId: 'tour-bank-header',
    title: 'Bank Konten (Caption & Hashtag)',
    description: 'Penyimpanan terpusat untuk teks hook pembuka, penutup CTA, dan kumpulan hashtag yang sering digunakan dalam kampanye Anda.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-bank-tabs',
    title: 'Kategori Template & Filter Brand',
    description: 'Pilih antara tab Bank Caption atau Bank Hashtag, serta filter berdasarkan brand untuk mengorganisir aset copywriting Anda.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-bank-list',
    title: 'Salin Instan 1-Klik',
    description: 'Gunakan tombol Salin untuk menyalin seluruh template ke clipboard komputer seketika tanpa perlu menyeleksi teks secara manual.',
    placement: 'top',
  },
];

export default function BankKontenPage() {
  const { user, account } = useAuth();
  const { confirmDelete, showSuccess, showError } = useModal();
  const [snippets, setSnippets] = useState<DummySnippet[]>(DUMMY_SNIPPETS);
  const [brands, setBrands] = useState<DummyBrand[]>(DUMMY_BRANDS);
  const [activeTab, setActiveTab] = useState<'caption' | 'hashtag'>('caption');
  const [filterBrand, setFilterBrand] = useState('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Form State
  const [newTitle, setNewTitle] = useState('');
  const [newBody, setNewBody] = useState('');
  const [newBrand, setNewBrand] = useState('brand-1');

  const isFreePlan = !account || account.plan_code === 'free';
  const isSnippetQuotaExceeded = isFreePlan && snippets.length >= 5;

  React.useEffect(() => {
    SnippetService.getSnippets(undefined, undefined, user?.id).then((data) => {
      setSnippets(data || []);
    });

    BrandService.getBrands(user?.id).then((bList) => {
      setBrands(bList || []);
      if (bList && bList.length > 0) {
        setNewBrand(bList[0].id);
      }
    });
  }, [user?.id]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const filtered = snippets.filter((s) => {
    if (s.type !== activeTab) return false;
    if (filterBrand !== 'all' && s.brand_id !== filterBrand) return false;
    return true;
  });

  const handleCopy = (text: string, title: string) => {
    navigator.clipboard.writeText(text);
    showToast(`📋 ${title} berhasil disalin ke clipboard!`);
  };

  const handleOpenAddModal = () => {
    if (isSnippetQuotaExceeded) {
      showError(
        'Batas Kuota Bank Konten Tercapai (5 Item)',
        'Paket Gratis dibatasi maksimal 5 template bank konten. Tingkatkan langganan ke Paket Pro atau Tim untuk menyimpan caption dan hashtag tanpa batas!'
      );
      return;
    }
    setShowAddModal(true);
  };

  const handleAddSnippet = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await SnippetService.createSnippet({
        brandId: newBrand,
        type: activeTab,
        title: newTitle,
        body: newBody,
        userId: user?.id,
      });
      setSnippets((prev) => [created, ...prev.filter((s) => s.id !== created.id)]);
      setShowAddModal(false);
      setNewTitle('');
      setNewBody('');
      showSuccess(
        `Berhasil Menambahkan ${activeTab === 'caption' ? 'Caption' : 'Hashtag'}!`,
        `Template "${created.title}" telah tersimpan ke database Bank Konten dan siap digunakan.`
      );
    } catch (err: any) {
      showError('Gagal Menyimpan Template', err.message || 'Terjadi kesalahan sistem.');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            background: '#0f172a',
            color: '#f8fafc',
            padding: '12px 18px',
            borderRadius: 10,
            boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
            zIndex: 9999,
            fontSize: '0.88rem',
            fontWeight: 600,
          }}
        >
          {toastMessage}
        </div>
      )}

      {/* Header */}
      <div id="tour-bank-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Bank Konten (Caption & Hashtag)</h1>
          <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
            Simpan template pembuka (hook), call-to-action (CTA), dan kumpulan hashtag untuk disalin dalam 1 klik.
          </p>
        </div>

        <button className="btn-uda btn-uda-primary btn-uda-sm" onClick={handleOpenAddModal}>
          <Plus size={16} />
          <span>Tambah Template</span>
        </button>
      </div>

      {/* Tabs & Filter Bar */}
      <div id="tour-bank-tabs" className="uda-card" style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', gap: 8, background: '#f8fafc', padding: 4, borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <button
            onClick={() => setActiveTab('caption')}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'caption' ? '#16a34a' : 'transparent',
              color: activeTab === 'caption' ? '#ffffff' : '#64748b',
            }}
          >
            Bank Caption (Hook / CTA)
          </button>
          <button
            onClick={() => setActiveTab('hashtag')}
            style={{
              padding: '6px 16px',
              borderRadius: 6,
              border: 'none',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              background: activeTab === 'hashtag' ? '#16a34a' : 'transparent',
              color: activeTab === 'hashtag' ? '#ffffff' : '#64748b',
            }}
          >
            Bank Hashtag
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {/* Indikator Kuota Sesuai PRD Bab 8: "3 dari 5 item" jika gratis */}
          <span style={{ fontSize: '0.82rem', color: isSnippetQuotaExceeded ? '#dc2626' : '#64748b', fontWeight: 600 }}>
            Tersimpan: <strong>{snippets.length} {isFreePlan ? 'dari 5 item (Paket Gratis)' : 'item (Tanpa Batas)'}</strong>
          </span>

          <select
            className="brand-dropdown-select"
            value={filterBrand}
            onChange={(e) => setFilterBrand(e.target.value)}
          >
            <option value="all">Semua Brand</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid Kartu Template Responsif */}
      <div id="tour-bank-list" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 18 }}>
        {filtered.map((item) => {
          const brand = brands.find((b) => b.id === item.brand_id);
          return (
            <div
              key={item.id}
              className="uda-card"
              style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                  <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#0f172a' }}>{item.title}</div>
                  {brand && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 4,
                        background: `${brand.color}15`,
                        color: brand.color,
                      }}
                    >
                      {brand.name}
                    </span>
                  )}
                </div>

                <div
                  style={{
                    background: '#f8fafc',
                    padding: 12,
                    borderRadius: 8,
                    fontSize: '0.85rem',
                    lineHeight: 1.5,
                    whiteSpace: 'pre-line',
                    color: '#334155',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  {item.body}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
                <button
                  className="btn-uda btn-uda-primary btn-uda-sm"
                  onClick={() => handleCopy(item.body, item.title)}
                >
                  <Copy size={13} />
                  <span>Salin (1-Klik)</span>
                </button>
                <div style={{ display: 'flex', gap: 6 }}>
                  <button
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    title="Hapus Template"
                    onClick={() => {
                      confirmDelete({
                        title: 'Hapus Template Konten?',
                        message: `Apakah Anda yakin ingin menghapus template "${item.title}"? Template ini akan dihapus permanen.`,
                        onConfirm: async () => {
                          try {
                            await SnippetService.deleteSnippet(item.id, user?.id);
                            setSnippets((prev) => prev.filter((s) => s.id !== item.id));
                            showSuccess('Template Berhasil Dihapus', `Template "${item.title}" telah dihapus.`);
                          } catch (err: any) {
                            showError('Akses Ditolak', err.message || 'Gagal menghapus template');
                          }
                        },
                      });
                    }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Tambah Snippet */}
      {showAddModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            padding: 20,
          }}
        >
          <div className="uda-card" style={{ maxWidth: 480, width: '100%', padding: 24 }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, marginBottom: 14 }}>
              Tambah ke Bank {activeTab === 'caption' ? 'Caption' : 'Hashtag'}
            </h3>

            <form onSubmit={handleAddSnippet} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Brand Target</label>
                <select
                  className="brand-dropdown-select"
                  value={newBrand}
                  onChange={(e) => setNewBrand(e.target.value)}
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Judul Template *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Closing Call to Action Pendaftaran"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    outline: 'none',
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700 }}>Isi Template *</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Tulis kalimat caption atau deretan hashtag..."
                  value={newBody}
                  onChange={(e) => setNewBody(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: 8,
                    outline: 'none',
                    lineHeight: 1.5,
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 10 }}>
                <button type="button" className="btn-uda btn-uda-secondary" onClick={() => setShowAddModal(false)}>
                  Batal
                </button>
                <button type="submit" className="btn-uda btn-uda-primary">
                  Simpan Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <GuidedTour steps={bankTourSteps} tourKey="uda_tour_bank" />
    </div>
  );
}
