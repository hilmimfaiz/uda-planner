'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Save,
  MessageSquare,
  Loader2,
  Landmark,
  ArrowRight,
  ExternalLink,
  PhoneCall,
  CheckCircle2,
} from 'lucide-react';
import { AdminService } from '@/services/admin.service';
import { useModal } from '@/contexts/modal-context';

export default function AdminPengaturanPage() {
  const { showSuccess, showError } = useModal();
  const [adminWhatsapp, setAdminWhatsapp] = useState('6281234567890');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  React.useEffect(() => {
    AdminService.getAppSettings().then((data) => {
      if (data && data.adminWhatsapp) {
        setAdminWhatsapp(data.adminWhatsapp);
      }
    });
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanNumber = adminWhatsapp.trim().replace(/[^0-9]/g, '');

    if (!cleanNumber || cleanNumber.length < 9) {
      showError(
        'Nomor WhatsApp Tidak Valid',
        'Silakan masukkan nomor WhatsApp yang valid dengan format internasional (contoh: 6281234567890).'
      );
      return;
    }

    setIsSaving(true);
    try {
      await AdminService.updateAppSettings({
        adminWhatsapp: cleanNumber,
      });
      showSuccess(
        'Pengaturan WhatsApp Berhasil Disimpan!',
        `Nomor WhatsApp resmi admin (${cleanNumber}) telah aktif dan otomatis tersinkronisasi ke seluruh tombol bantuan WhatsApp pengguna.`
      );
    } catch (err: any) {
      showError('Gagal Menyimpan Pengaturan', err.message || 'Coba lagi beberapa saat.');
    } finally {
      setIsSaving(false);
    }
  };

  const cleanTestNumber = adminWhatsapp.replace(/[^0-9]/g, '');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 840, width: '100%', margin: '0 auto' }}>
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

      <div>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Pengaturan Kontak Bantuan WhatsApp</h1>
        <p style={{ color: '#64748b', fontSize: '0.88rem' }}>
          Kelola nomor WhatsApp resmi Admin UdaPlanner yang digunakan untuk konsultasi paket, bantuan pengguna, dan konfirmasi akun terkunci.
        </p>
      </div>

      {/* Info Banner Pengelolaan Rekening Bank Transfer */}
      <div
        className="uda-card"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 14,
          padding: '16px 20px',
          backgroundColor: '#f8fafc',
          border: '2px solid #0f172a',
          boxShadow: '3px 3px 0px #0f172a',
          borderRadius: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              backgroundColor: '#ecfdf5',
              border: '1.5px solid #10b981',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#059669',
              flexShrink: 0,
            }}
          >
            <Landmark size={22} />
          </div>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: 800, color: '#0f172a' }}>
              Pengelolaan Rekening Bank Transfer
            </div>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Pengaturan nomor rekening bank tujuan transfer manual kini dipusatkan secara mandiri pada menu Rekening Bank.
            </div>
          </div>
        </div>

        <Link
          href="/admin/rekening"
          className="btn-uda btn-uda-secondary btn-uda-sm"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            fontWeight: 800,
            fontSize: '0.82rem',
            textDecoration: 'none',
          }}
        >
          <span>Buka Rekening Bank</span>
          <ArrowRight size={14} />
        </Link>
      </div>

      {/* Formulir Kontak WhatsApp Admin */}
      <div className="uda-card" style={{ padding: '24px 22px' }}>
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#16a34a',
              }}
            >
              <MessageSquare size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                Kontak Bantuan WhatsApp Admin
              </h3>
              <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                Nomor ini akan otomatis tersinkronisasi ke widget WhatsApp melayang dan tombol bantuan seluruh pengguna.
              </p>
            </div>
          </div>

          <div>
            <label
              htmlFor="input-admin-wa"
              style={{ fontSize: '0.84rem', fontWeight: 800, color: '#0f172a', display: 'block', marginBottom: 6 }}
            >
              Nomor WhatsApp Admin (Format 62...) *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                id="input-admin-wa"
                type="text"
                required
                value={adminWhatsapp}
                onChange={(e) => setAdminWhatsapp(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Contoh: 6281234567890"
                style={{
                  width: '100%',
                  padding: '11px 14px 11px 40px',
                  border: '2px solid #0f172a',
                  borderRadius: 8,
                  boxShadow: '2px 2px 0px #0f172a',
                  outline: 'none',
                  fontSize: '0.94rem',
                  fontWeight: 700,
                  backgroundColor: '#ffffff',
                }}
              />
              <PhoneCall size={17} style={{ position: 'absolute', left: 14, top: 13, color: '#64748b' }} />
            </div>
            <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 6, lineHeight: 1.45 }}>
              Pastikan memasukkan nomor dengan kode negara (contoh <strong>62812...</strong> tanpa tanda + atau spasi). Nomor ini digunakan untuk tombol &quot;Hubungi Admin&quot; pada status langganan dan floating button WhatsApp.
            </div>
          </div>

          {/* Quick Preview Test WhatsApp */}
          {cleanTestNumber.length >= 9 && (
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 14px',
                backgroundColor: '#f0fdf4',
                border: '1.5px solid #86efac',
                borderRadius: 8,
                fontSize: '0.8rem',
                color: '#166534',
                fontWeight: 700,
                width: 'fit-content',
              }}
            >
              <CheckCircle2 size={15} style={{ color: '#16a34a' }} />
              <span>Pratinjau link WhatsApp: <strong>wa.me/{cleanTestNumber}</strong></span>
              <a
                href={`https://wa.me/${cleanTestNumber}?text=${encodeURIComponent('Halo Admin UdaPlanner, ini pesan uji coba sinkronisasi kontak.')}`}
                target="_blank"
                rel="noreferrer"
                style={{
                  color: '#047857',
                  textDecoration: 'underline',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 3,
                  marginLeft: 6,
                }}
              >
                <span>Uji Buka</span>
                <ExternalLink size={12} />
              </a>
            </div>
          )}

          <div style={{ paddingTop: 8 }}>
            <button
              type="submit"
              disabled={isSaving}
              className="btn-uda btn-uda-primary"
              style={{
                width: '100%',
                maxWidth: 260,
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontWeight: 800,
                height: 44,
              }}
            >
              {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              <span>{isSaving ? 'Menyimpan...' : 'Simpan Nomor WhatsApp'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
