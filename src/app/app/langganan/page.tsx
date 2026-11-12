'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2,
  Copy,
  UploadCloud,
  ShieldCheck,
  Clock,
  Landmark,
  Check,
  ArrowRight,
  AlertCircle,
  Loader2,
  Camera,
  Trash2,
  MessageCircle,
  X,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { PlanService, DynamicPlan, PlanDurationItem, resolvePaymentDuration } from '@/services/plan.service';
import { BankService, BankAccountItem } from '@/services/bank.service';
import { PaymentService } from '@/services/payment.service';
import { AdminService } from '@/services/admin.service';
import { MemberService } from '@/services/member.service';
import { createClient } from '@/lib/supabase/client';
import { uploadPaymentProof } from '@/lib/image-upload';
import { playSuccessSound, playErrorSound } from '@/lib/audio-effects';
import { useAuth } from '@/contexts/auth-context';
import { useModal } from '@/contexts/modal-context';
import { GuidedTour, TourStep } from '@/components/guided-tour';
import { formatWibDate } from '@/lib/date-utils';

const langgananTourSteps: TourStep[] = [
  {
    targetId: 'tour-langganan-status',
    title: 'Status Paket Saat Ini',
    description: 'Lihat paket langganan yang sedang aktif dan tanggal kedaluwarsa masa aktif akun Uda-Planner Anda.',
    placement: 'bottom',
  },
  {
    targetId: 'tour-langganan-plans',
    title: 'Pilih Paket & Opsi Durasi',
    description: 'Pilih paket yang sesuai kebutuhan Anda (Pro atau Tim). Anda juga bisa memilih variasi durasi seperti 30 hari, 90 hari, atau 1 tahun.',
    placement: 'top',
  },
  {
    targetId: 'tour-langganan-payment',
    title: 'Instruksi Transfer & Konfirmasi',
    description: 'Pilih rekening bank tujuan transfer resmi, salin nomor rekening beserta kode unik, lalu unggah bukti transfer untuk verifikasi otomatis admin.',
    placement: 'top',
  },
];

export default function LanggananPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user, account, refreshUserData } = useAuth();
  const { showSuccess, showError } = useModal();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Inisialisasi langsung dari cache/default tanpa layar loading yang menghambat
  const [plans, setPlans] = useState<DynamicPlan[]>(() => PlanService.getCachedActivePlans());
  const [bankAccounts, setBankAccounts] = useState<BankAccountItem[]>(() => BankService.getCachedActiveBankAccounts());
  const [selectedPlanCode, setSelectedPlanCode] = useState<string>('pro');
  const [selectedDurationIndex, setSelectedDurationIndex] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    PlanService.getCachedActivePlans().forEach((p) => {
      initial[p.code] = 0;
    });
    return initial;
  });
  const [selectedBankId, setSelectedBankId] = useState<string>(() => {
    const cachedBanks = BankService.getCachedActiveBankAccounts();
    return cachedBanks[0]?.id || 'bank-bca';
  });
  const [isPageLoading, setIsPageLoading] = useState(false);

  // Status Keanggotaan TIM
  const [teamMembership, setTeamMembership] = useState<{
    brand_id: string;
    brand_name: string;
    role: string;
    joined_at?: string;
    inviter_name?: string;
    inviter_email?: string;
  } | null>(null);
  const [showLeaveTeamModal, setShowLeaveTeamModal] = useState(false);
  const [isLeavingTeam, setIsLeavingTeam] = useState(false);

  // Modal Konfirmasi Beralih dari Pro ke Tim (Paket Sebelumnya Hangus)
  const [showUpgradeToTeamModal, setShowUpgradeToTeamModal] = useState(false);

  // Status Berhenti Langganan (Downgrade ke Free)
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [isCancelingSubscription, setIsCancelingSubscription] = useState(false);
  const [cancelledLocally, setCancelledLocally] = useState(false);

  const isUserExplicitlyFree =
    cancelledLocally ||
    (typeof window !== 'undefined' &&
      (localStorage.getItem(`uda_subscription_cancelled_${user?.id}`) === 'true' ||
        (user?.email && localStorage.getItem(`uda_subscription_cancelled_${user.email.toLowerCase()}`) === 'true') ||
        localStorage.getItem(`uda_user_plan_${user?.id}`) === 'free' ||
        (user?.email && localStorage.getItem(`uda_user_plan_${user.email.toLowerCase()}`) === 'free')));

  const effectivePlanCode = isUserExplicitlyFree ? 'free' : (account?.plan_code || 'free');
  const effectivePlanUntil = isUserExplicitlyFree ? null : (account?.plan_until || null);

  const handleSelectPlan = (targetPlanCode: string, targetDurationIdx?: number) => {
    if (teamMembership && targetPlanCode !== 'free') {
      setShowLeaveTeamModal(true);
      return;
    }

    // Jika pengguna saat ini berlangganan PRO dan ingin beralih ke paket TIM:
    // Tampilkan pop up modal konfirmasi bahwa paket Pro sebelumnya akan hangus
    if (effectivePlanCode === 'pro' && targetPlanCode === 'team') {
      if (targetDurationIdx !== undefined) {
        setSelectedDurationIndex((prev) => ({
          ...prev,
          team: targetDurationIdx,
        }));
      }
      setShowUpgradeToTeamModal(true);
      return;
    }

    setSelectedPlanCode(targetPlanCode);
    if (targetDurationIdx !== undefined) {
      setSelectedDurationIndex((prev) => ({
        ...prev,
        [targetPlanCode]: targetDurationIdx,
      }));
    }
  };

  const handleConfirmUpgradeToTeam = () => {
    setSelectedPlanCode('team');
    setShowUpgradeToTeamModal(false);
    playSuccessSound();
    showSuccess(
      'Beralih ke Paket TIM',
      'Paket TIM berhasil dipilih. Perhatian: Sisa masa aktif Paket Pro Anda sebelumnya akan hangus dan digantikan oleh masa aktif Paket TIM.'
    );
    setTimeout(() => {
      const el = document.getElementById('tour-langganan-payment');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 200);
  };

  // Form Pembayaran
  const [senderName, setSenderName] = useState('');
  const [senderBank, setSenderBank] = useState('BCA');
  const [selectedProofFile, setSelectedProofFile] = useState<File | null>(null);
  const [proofPreviewUrl, setProofPreviewUrl] = useState<string | null>(null);
  const [proofFileUrl, setProofFileUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState('6281234567890');

  // Modal Sukses Pembayaran
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successPaymentData, setSuccessPaymentData] = useState<any | null>(null);

  // Status Transaksi Pengguna
  const [userPayments, setUserPayments] = useState<any[]>([]);
  const userPaymentsRef = useRef<any[]>([]);
  const notifiedPaymentsRef = useRef<Set<string>>(new Set());
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Keep ref synchronized with state
  useEffect(() => {
    userPaymentsRef.current = userPayments;
  }, [userPayments]);

  // Unique 3-digit payment code per user
  const paymentCode = 247;

  const loadData = async () => {
    try {
      // Tampilkan cache pembayaran secara instan terlebih dahulu
      if (user?.id || user?.email) {
        const cachedPays = PaymentService.getCachedPayments(user?.id, user?.email);
        if (cachedPays.length > 0 && userPaymentsRef.current.length === 0) {
          setUserPayments(cachedPays);
          userPaymentsRef.current = cachedPays;
        }
      }

      const [pList, bList, myPayments, appSettings] = await Promise.all([
        PlanService.getActivePlans(),
        BankService.getActiveBankAccounts(),
        PaymentService.getPayments(user?.id, user?.email),
        AdminService.getAppSettings(),
      ]);

      if (appSettings?.adminWhatsapp) {
        setAdminWhatsapp(appSettings.adminWhatsapp);
      }

      if (pList && pList.length > 0) {
        setPlans(pList);
        setSelectedDurationIndex((prev) => {
          const next = { ...prev };
          pList.forEach((p) => {
            if (next[p.code] === undefined) next[p.code] = 0;
          });
          return next;
        });
      }

      if (bList && bList.length > 0) {
        setBankAccounts(bList);
        setSelectedBankId((prev) => (bList.some((b) => b.id === prev) ? prev : bList[0].id));
      }

      if (myPayments) {
        setUserPayments(myPayments);
        userPaymentsRef.current = myPayments;

        // Tandai pembayaran yang sudah approved sebelumnya agar tidak memicu popup notifikasi berulang
        myPayments.forEach((p: any) => {
          if (p.status === 'approved') {
            notifiedPaymentsRef.current.add(p.id);
            try {
              localStorage.setItem('uda_notified_approved_' + p.id, 'true');
            } catch (e) {}
          }
        });

        // B1 & Sinkronisasi Paket Pro / Team: Verifikasi jika user memiliki pembayaran berstatus approved
        const approvedList = myPayments.filter((p: any) => p.status === 'approved');
        if (approvedList.length > 0) {
          const latestApproved = approvedList[0];
          const dur = resolvePaymentDuration(
            latestApproved.duration_days,
            latestApproved.duration_label,
            latestApproved.amount,
            latestApproved.plan_code
          );
          const approvedPlan = (latestApproved.plan_code || 'pro').toLowerCase();
          let currentPlanUntil = account?.plan_until;
          if (typeof window !== 'undefined') {
            try {
              const rawAcc = localStorage.getItem('uda_auth_account');
              if (rawAcc) {
                const parsed = JSON.parse(rawAcc);
                currentPlanUntil = parsed.plan_until || currentPlanUntil;
              }
            } catch (e) {}
          }

          const isDirectlyFree = typeof window !== 'undefined' && (
            localStorage.getItem(`uda_subscription_cancelled_${user?.id}`) === 'true' ||
            (user?.email && localStorage.getItem(`uda_subscription_cancelled_${user.email.toLowerCase()}`) === 'true') ||
            localStorage.getItem(`uda_user_plan_${user?.id}`) === 'free' ||
            (user?.email && localStorage.getItem(`uda_user_plan_${user.email.toLowerCase()}`) === 'free') ||
            account?.plan_code === 'free'
          );
          if (isDirectlyFree) {
            // Pengguna berstatus paket Free atau telah berhenti langganan, jangan paksa upgrade ulang
            return;
          }

          const currentExpiry = currentPlanUntil ? new Date(currentPlanUntil).getTime() : 0;
          const isExpiredOrMissing = isNaN(currentExpiry) || currentExpiry <= Date.now();
          const needsPlanUpgrade =
            account?.plan_code !== approvedPlan ||
            !account?.plan_code ||
            isExpiredOrMissing ||
            (dur.days >= 90 && (currentExpiry - Date.now()) / 86400000 < dur.days - 30);

          if (needsPlanUpgrade) {
            const payTime = latestApproved.created_at ? new Date(latestApproved.created_at).getTime() : Date.now();
            const baseTime = isNaN(payTime) ? Date.now() : payTime;
            const fixedPlanUntil = new Date(baseTime + Math.max(dur.days, 30) * 86400000).toISOString();

            if (typeof window !== 'undefined') {
              try {
                const rawAcc = localStorage.getItem('uda_auth_account');
                const accObj = rawAcc ? JSON.parse(rawAcc) : {};
                const updatedAcc = {
                  ...accObj,
                  plan_code: approvedPlan,
                  plan_until: fixedPlanUntil,
                };
                localStorage.setItem('uda_auth_account', JSON.stringify(updatedAcc));
                if (user?.id) localStorage.setItem(`uda_user_plan_${user.id}`, approvedPlan);
                if (user?.email) localStorage.setItem(`uda_user_plan_${user.email.toLowerCase()}`, approvedPlan);
              } catch (e) {}
            }

            if (supabase && user?.id) {
              (supabase.from('accounts' as any) as any)
                .update({ plan_code: approvedPlan, plan_until: fixedPlanUntil })
                .or(`user_id.eq.${user.id},id.eq.${user.id}`)
                .then(() => {})
                .catch(() => {});
            }

            AdminService.updateUserPlan(user?.id || account?.id || 'usr-1', approvedPlan as any, dur.days, {
              customPlanUntil: fixedPlanUntil,
            }).catch(() => {});

            window.dispatchEvent(
              new CustomEvent('uda_account_updated', {
                detail: {
                  userId: user?.id,
                  email: user?.email,
                  planCode: approvedPlan,
                  planUntil: fixedPlanUntil,
                },
              })
            );
          }
        }
      }

      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        const qPlan = urlParams.get('plan');
        const qDur = urlParams.get('dur');
        if (qPlan && (qPlan === 'pro' || qPlan === 'team' || qPlan === 'free')) {
          setSelectedPlanCode(qPlan);
          if (qDur && pList) {
            const targetP = pList.find((p) => p.code === qPlan);
            if (targetP) {
              const durList = (targetP.durations || []).filter((d) => d.isActive);
              const foundIdx = durList.findIndex((d) => d.id === qDur || String(d.durationDays) === qDur);
              if (foundIdx >= 0) {
                setSelectedDurationIndex((prev) => ({ ...prev, [qPlan]: foundIdx }));
              }
            }
          }
          if (window.location.hash === '#tour-langganan-payment') {
            setTimeout(() => {
              const el = document.getElementById('tour-langganan-payment');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }, 300);
          }
        }
      }

      // Cek apakah pengguna saat ini berstatus sebagai Anggota TIM di suatu brand
      if (user?.id || user?.email) {
        const membership = await MemberService.getTeamMembership(user?.id || '', user?.email);
        setTeamMembership(membership);
      }
    } catch (err) {
      console.warn('LanggananPage loadData fallback:', err);
    } finally {
      setIsPageLoading(false);
    }
  };

  // Fungsi untuk keluar dari Anggota TIM
  const handleLeaveTeam = async () => {
    if (!teamMembership) return;
    setIsLeavingTeam(true);
    try {
      await MemberService.leaveTeam(user?.id || '', user?.email, teamMembership.brand_id);
      setTeamMembership(null);
      setShowLeaveTeamModal(false);
      playSuccessSound();
      showSuccess(
        'Berhasil Keluar dari Tim',
        `Anda telah berhasil keluar dari brand "${teamMembership.brand_name}". Status paket langganan Anda kini kembali ke Paket Free. Sekarang Anda dapat bebas memilih dan membeli paket langganan pribadi!`
      );
      if (refreshUserData) await refreshUserData();
      await loadData();
    } catch (err: any) {
      playErrorSound();
      showError('Gagal Keluar dari Tim', err.message || 'Terjadi kesalahan sistem saat memproses keluar dari tim.');
    } finally {
      setIsLeavingTeam(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!user?.id) return;
    setIsCancelingSubscription(true);

    try {
      // 1. Panggil API server untuk batalkan langganan di database Supabase (bypass RLS)
      try {
        const cancelRes = await fetch('/api/subscription/cancel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            email: user.email,
          }),
        });
        const cancelJson = await cancelRes.json();
        if (!cancelJson.success) {
          console.warn('API cancel subscription warning:', cancelJson.error);
        }
      } catch (apiErr) {
        console.warn('API cancel subscription error:', apiErr);
      }

      // 2. Jika user adalah anggota tim brand lain, batalkan keanggotaannya
      if (teamMembership) {
        try {
          await MemberService.leaveTeam(user.id, user.email, teamMembership.brand_id);
          setTeamMembership(null);
        } catch (teamErr) {
          console.warn('Leave team error:', teamErr);
        }
      }

      const supabase = createClient();
      if (supabase) {
        try {
          await (supabase.from('accounts' as any) as any)
            .update({
              plan_code: 'free',
              plan_until: null,
            })
            .or(`user_id.eq.${user.id},id.eq.${user.id}`);
        } catch {}
      }

      // 3. Update local storage & broadcast event
      if (typeof window !== 'undefined') {
        try {
          // Tandai status langganan dibatalkan secara permanen
          localStorage.setItem(`uda_subscription_cancelled_${user.id}`, 'true');
          localStorage.setItem(`uda_user_plan_${user.id}`, 'free');
          localStorage.removeItem(`uda_user_plan_until_${user.id}`);
          if (user.email) {
            const emailLower = user.email.toLowerCase();
            localStorage.setItem(`uda_subscription_cancelled_${emailLower}`, 'true');
            localStorage.setItem(`uda_user_plan_${emailLower}`, 'free');
            localStorage.removeItem(`uda_user_plan_until_${emailLower}`);
          }
          localStorage.removeItem('uda_last_upgraded_user');

          // Perbarui semua data pembayaran di localStorage (uda_admin_payments) agar statusnya menjadi 'cancelled'
          const rawAdminPays = localStorage.getItem('uda_admin_payments');
          if (rawAdminPays) {
            try {
              const payList = JSON.parse(rawAdminPays);
              if (Array.isArray(payList)) {
                const updated = payList.map((p: any) => {
                  const isMyPay =
                    p.userId === user.id ||
                    (user.email && p.email?.toLowerCase() === user.email.toLowerCase()) ||
                    (user.email && p.user?.toLowerCase() === user.email.toLowerCase());
                  if (isMyPay && (p.status === 'approved' || p.status === 'pending')) {
                    return { ...p, status: 'cancelled', reason: 'Langganan dihentikan oleh pengguna' };
                  }
                  return p;
                });
                localStorage.setItem('uda_admin_payments', JSON.stringify(updated));
              }
            } catch (e) {}
          }

          // Tandai semua id pembayaran yang ada saat ini sebagai telah dinotifikasi agar tidak memicu pop-up / upgrade
          if (userPaymentsRef.current) {
            userPaymentsRef.current.forEach((p: any) => {
              notifiedPaymentsRef.current.add(p.id);
              localStorage.setItem('uda_notified_approved_' + p.id, 'true');
            });
          }

          const rawAcc = localStorage.getItem('uda_auth_account');
          if (rawAcc) {
            const parsed = JSON.parse(rawAcc);
            parsed.plan_code = 'free';
            parsed.plan_until = null;
            delete parsed.team_member_brand_id;
            delete parsed.team_member_brand_name;
            localStorage.setItem('uda_auth_account', JSON.stringify(parsed));
          }

          window.dispatchEvent(
            new CustomEvent('uda_account_updated', {
              detail: { userId: user.id, email: user.email, planCode: 'free', planUntil: null },
            })
          );
          window.dispatchEvent(new Event('storage'));
        } catch (e) {}
      }

      // Update state React secara instan di UI
      setCancelledLocally(true);
      setUserPayments((prev) =>
        prev.map((p) => (p.status === 'approved' || p.status === 'pending' ? { ...p, status: 'cancelled' } : p))
      );
      userPaymentsRef.current = userPaymentsRef.current.map((p) =>
        p.status === 'approved' || p.status === 'pending' ? { ...p, status: 'cancelled' } : p
      );

      setShowCancelModal(false);
      playSuccessSound();
      showSuccess(
        'Berhenti Langganan Berhasil',
        'Akun Anda kini telah beralih ke Paket Free (Gratis). Jika Anda memiliki lebih dari 1 brand, brand tambahan Anda telah dikunci dengan aman (tidak dihapus) dan dapat diaktifkan kembali kapan saja dengan berlangganan Pro atau Team.'
      );

      if (refreshUserData) await refreshUserData();
      await loadData();
    } catch (err: any) {
      playErrorSound();
      showError('Gagal Berhenti Langganan', err?.message || 'Terjadi kesalahan sistem saat memproses pembatalan.');
    } finally {
      setIsCancelingSubscription(false);
    }
  };

  useEffect(() => {
    loadData();

    // Fungsi untuk mengecek apakah pembayaran baru saja disetujui admin
    const checkNewlyApprovedPayment = async () => {
      const isExplicitlyFree = typeof window !== 'undefined' && (
        localStorage.getItem(`uda_subscription_cancelled_${user?.id}`) === 'true' ||
        (user?.email && localStorage.getItem(`uda_subscription_cancelled_${user.email.toLowerCase()}`) === 'true') ||
        localStorage.getItem(`uda_user_plan_${user?.id}`) === 'free' ||
        (user?.email && localStorage.getItem(`uda_user_plan_${user.email.toLowerCase()}`) === 'free') ||
        account?.plan_code === 'free'
      );
      if (isExplicitlyFree) return;

      const fresh = await PaymentService.getPayments(user?.id, user?.email);
      if (!fresh || fresh.length === 0) return;

      setUserPayments(fresh);
      userPaymentsRef.current = fresh;

      // Cari pembayaran yang disetujui DAN belum pernah ditampilkan notifikasinya
      const newlyApproved = fresh.find((p: any) => {
        if (p.status !== 'approved') return false;
        const key = 'uda_notified_approved_' + p.id;
        const alreadyNotified =
          notifiedPaymentsRef.current.has(p.id) ||
          (typeof window !== 'undefined' && localStorage.getItem(key) === 'true');
        return !alreadyNotified;
      });

      if (newlyApproved) {
        notifiedPaymentsRef.current.add(newlyApproved.id);
        const targetPlan = (newlyApproved.plan_code || 'pro').toLowerCase();
        const durDays = Number(newlyApproved.duration_days) || 30;
        const fixedUntil = new Date(Date.now() + durDays * 86400000).toISOString();

        try {
          localStorage.setItem('uda_notified_approved_' + newlyApproved.id, 'true');
          if (user?.id) localStorage.setItem(`uda_user_plan_${user.id}`, targetPlan);
          if (user?.email) localStorage.setItem(`uda_user_plan_${user.email.toLowerCase()}`, targetPlan);
          const rawAcc = localStorage.getItem('uda_auth_account');
          const accObj = rawAcc ? JSON.parse(rawAcc) : {};
          localStorage.setItem(
            'uda_auth_account',
            JSON.stringify({
              ...accObj,
              plan_code: targetPlan,
              plan_until: fixedUntil,
            })
          );
        } catch (e) {}

        window.dispatchEvent(
          new CustomEvent('uda_account_updated', {
            detail: {
              userId: user?.id,
              email: user?.email,
              planCode: targetPlan,
              planUntil: fixedUntil,
            },
          })
        );

        await refreshUserData();
        showSuccess(
          'Paket Berhasil Diaktifkan!',
          `Selamat! Pembayaran Anda telah dikonfirmasi oleh Admin. Akun Anda kini resmi berlangganan paket ${targetPlan.toUpperCase()}.`
        );
      }
    };

    const handleSync = async () => {
      await checkNewlyApprovedPayment();
      await refreshUserData();
      const fresh = await PaymentService.getPayments(user?.id, user?.email);
      if (fresh) {
        setUserPayments(fresh);
        userPaymentsRef.current = fresh;
      }
      AdminService.getAppSettings().then((s) => {
        if (s?.adminWhatsapp) setAdminWhatsapp(s.adminWhatsapp);
      });
      BankService.getActiveBankAccounts().then((bList) => {
        if (bList && bList.length > 0) {
          setBankAccounts(bList);
          setSelectedBankId((prev) => (bList.some((b) => b.id === prev) ? prev : bList[0].id));
        }
      });
    };

    const handleSettingsUpdate = (e?: any) => {
      if (e?.detail?.adminWhatsapp) {
        setAdminWhatsapp(e.detail.adminWhatsapp);
      } else {
        AdminService.getAppSettings().then((s) => {
          if (s?.adminWhatsapp) setAdminWhatsapp(s.adminWhatsapp);
        });
      }
    };

    window.addEventListener('storage', handleSync);
    window.addEventListener('uda_account_updated', handleSync);
    window.addEventListener('uda_bank_accounts_updated', handleSync);
    window.addEventListener('uda_settings_updated', handleSettingsUpdate);
    window.addEventListener('focus', handleSync);

    // Polling setiap 8 detik saat ada pembayaran pending (mencegah bandwidth berlebih & lag)
    const interval = setInterval(async () => {
      if (userPaymentsRef.current.some((p) => p.status === 'pending')) {
        await checkNewlyApprovedPayment();
      }
    }, 8000);

    return () => {
      window.removeEventListener('storage', handleSync);
      window.removeEventListener('uda_account_updated', handleSync);
      window.removeEventListener('uda_bank_accounts_updated', handleSync);
      window.removeEventListener('uda_settings_updated', handleSettingsUpdate);
      window.removeEventListener('focus', handleSync);
      clearInterval(interval);
    };
  }, [user?.id, user?.email]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2500);
    showSuccess('Berhasil Disalin!', `${label} telah disalin ke clipboard.`);
  };

  // Kalkulasi paket dan nominal yang dipilih
  const currentPlan = plans.find((p) => p.code === selectedPlanCode) || plans[0];
  const activeDurations = currentPlan ? (currentPlan.durations || []).filter((d) => d.isActive) : [];
  const curDurIdx = currentPlan ? selectedDurationIndex[currentPlan.code] || 0 : 0;
  const currentDuration: PlanDurationItem | undefined = activeDurations[curDurIdx] || activeDurations[0];

  const basePrice = currentDuration ? currentDuration.price : (currentPlan?.price || 0);
  const totalAmountToTransfer = basePrice === 0 ? 0 : basePrice + paymentCode;

  const selectedBank = bankAccounts.find((b) => b.id === selectedBankId) || bankAccounts[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError('Format Tidak Didukung', 'Harap pilih file gambar bukti transfer (JPG, PNG, atau WebP).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      showError('Ukuran Terlalu Besar', 'Ukuran foto maksimal adalah 10 MB.');
      return;
    }

    setSelectedProofFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setProofPreviewUrl(ev.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveProofPhoto = () => {
    setSelectedProofFile(null);
    setProofPreviewUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const cleanAdminPhone = adminWhatsapp.replace(/[^0-9]/g, '');

  const getWhatsAppUrl = (pData?: any) => {
    const data = pData || successPaymentData || pendingPayment;
    const planName = (data?.plan_code || selectedPlanCode || 'Pro').toUpperCase();
    const amountStr = (data?.amount || totalAmountToTransfer).toLocaleString('id-ID');
    const sender = data?.sender_name || senderName || user?.user_metadata?.full_name || 'Pelanggan';
    const sBank = data?.sender_bank || senderBank;
    const email = user?.email ? ` (${user.email})` : '';

    const text = `Halo Admin UdaPlanner, saya sudah melakukan transfer pembayaran paket ${planName} sebesar Rp ${amountStr} dari rekening ${sBank} a.n ${sender}${email}. Bukti transfer sudah saya kirimkan melalui sistem. Mohon bantuannya untuk diverifikasi. Terima kasih!`;
    return `https://wa.me/${cleanAdminPhone}?text=${encodeURIComponent(text)}`;
  };

  const handleSubmitProof = async (e: React.FormEvent) => {
    e.preventDefault();

    // Guard: Jika user masih berstatus Anggota TIM, wajib keluar terlebih dahulu
    if (teamMembership) {
      setShowLeaveTeamModal(true);
      return;
    }

    // B4: Cegah pengajuan berulang kali jika masih ada pembayaran yang pending
    if (pendingPayment) {
      showError(
        'Pengajuan Sedang Diproses',
        'Anda masih memiliki pengajuan pembayaran yang sedang menunggu verifikasi admin. Harap tunggu persetujuan admin atau hubungi admin via WhatsApp sebelum mengirim pengajuan baru.'
      );
      return;
    }

    if (!senderName.trim()) {
      showError('Nama Pengirim Wajib Diisi', 'Silakan masukkan nama pemilik rekening pengirim.');
      return;
    }

    if (!selectedProofFile && !proofFileUrl.trim()) {
      showError('Bukti Transfer Wajib Diunggah', 'Silakan pilih foto bukti struk transfer pembayaran Anda.');
      return;
    }

    setIsSubmitting(true);
    try {
      let finalProofUrl = proofFileUrl.trim();

      if (selectedProofFile) {
        finalProofUrl = await uploadPaymentProof(supabase, selectedProofFile, user?.id || 'guest');
      }

      const newPayment = await PaymentService.submitPayment({
        userId: user?.id,
        accountId: account?.id || user?.id,
        userEmail: user?.email,
        userName: user?.user_metadata?.full_name || senderName.trim(),
        planCode: selectedPlanCode,
        planDurationId: currentDuration?.id,
        durationLabel: currentDuration?.name || '1 Bulan',
        durationDays: currentDuration?.durationDays || 30,
        amount: totalAmountToTransfer,
        senderName: senderName.trim(),
        senderBank: senderBank.trim(),
        targetBankName: selectedBank?.bankName,
        targetAccountNumber: selectedBank?.accountNumber,
        targetAccountName: selectedBank?.accountName,
        proofUrl: finalProofUrl,
        proofPath: finalProofUrl,
      });

      setUserPayments((prev) => [newPayment, ...prev.filter((p) => p.id !== newPayment.id)]);
      userPaymentsRef.current = [newPayment, ...userPaymentsRef.current.filter((p) => p.id !== newPayment.id)];
      setSuccessPaymentData({
        ...newPayment,
        targetBankName: selectedBank?.bankName,
        targetAccountNumber: selectedBank?.accountNumber,
        targetAccountName: selectedBank?.accountName,
      });

      if (typeof window !== 'undefined') {
        try {
          if (user?.id) localStorage.removeItem(`uda_subscription_cancelled_${user.id}`);
          if (user?.email) localStorage.removeItem(`uda_subscription_cancelled_${user.email.toLowerCase()}`);
        } catch (e) {}
      }
      setCancelledLocally(false);

      playSuccessSound();
      setShowSuccessModal(true);
      showSuccess(
        'Konfirmasi Pembayaran Berhasil Terkirim!',
        'Bukti transfer pembayaran Anda telah berhasil kami terima. Admin akan memverifikasi dan paket akun Anda otomatis aktif!'
      );

      // Reset form
      setSenderName('');
      setSelectedProofFile(null);
      setProofPreviewUrl(null);
      setProofFileUrl('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err: any) {
      showError('Gagal Mengirim Bukti Pembayaran', err.message || 'Terjadi kesalahan sistem, silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Tampilkan banner menunggu verifikasi jika masih ada transaksi dengan status pending
  const pendingPayment = userPayments.find((p) => p.status === 'pending');

  if (isPageLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1040, margin: '0 auto', width: '100%', padding: '40px 0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <ShieldCheck size={24} style={{ color: '#16a34a', flexShrink: 0 }} />
            <h1 style={{ fontSize: 'clamp(1.18rem, 3.8vw, 1.55rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
              Paket Langganan & Upgrade Akun
            </h1>
          </div>
          <p style={{ color: '#64748b', fontSize: 'clamp(0.78rem, 2.2vw, 0.88rem)', lineHeight: 1.5, margin: '4px 0 0' }}>
            Memuat data paket dan status akun Anda...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28, maxWidth: 1040, margin: '0 auto', width: '100%' }}>
      {/* Header Halaman Responsif Mobile & Tablet */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <ShieldCheck size={24} style={{ color: '#16a34a', flexShrink: 0 }} />
          <h1 style={{ fontSize: 'clamp(1.18rem, 3.8vw, 1.55rem)', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', margin: 0 }}>
            Paket Langganan & Upgrade Akun
          </h1>
        </div>
        <p style={{ color: '#64748b', fontSize: 'clamp(0.78rem, 2.2vw, 0.88rem)', lineHeight: 1.5, margin: '4px 0 0' }}>
          Tingkatkan kuota brand bisnis Anda, buka pratinjau Grid Instagram, dan aktifkan alur review kolaborasi tim agensi.
        </p>
      </div>

      {/* Banner Menunggu Verifikasi Pembayaran (Jika ada transaksi pending) */}
      {pendingPayment && (
        <div
          className="uda-card"
          style={{
            backgroundColor: '#fefce8',
            borderColor: '#eab308',
            boxShadow: '4px 4px 0px #0f172a',
            padding: '20px 24px',
            borderRadius: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 10,
                  backgroundColor: '#fef08a',
                  color: '#854d0e',
                  border: '2px solid #0f172a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Clock size={24} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <span
                    style={{
                      fontSize: '0.74rem',
                      fontWeight: 900,
                      backgroundColor: '#eab308',
                      color: '#0f172a',
                      padding: '2px 8px',
                      borderRadius: 4,
                      border: '1.5px solid #0f172a',
                    }}
                  >
                    MENUNGGU VERIFIKASI ADMIN
                  </span>
                  <span style={{ fontSize: '0.8rem', color: '#854d0e', fontWeight: 700 }}>
                    {pendingPayment.created_at ? formatWibDate(pendingPayment.created_at) : 'Hari ini'}
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: '1.05rem', color: '#0f172a' }}>
                  Pengajuan Pembayaran Paket{' '}
                  <span style={{ color: '#16a34a', textTransform: 'uppercase' }}>
                    {pendingPayment.plan_code || 'Pro'}
                  </span>{' '}
                  — Rp {(pendingPayment.amount || 0).toLocaleString('id-ID')}
                </div>
                <div style={{ fontSize: '0.84rem', color: '#713f12', marginTop: 4 }}>
                  Bukti transfer Anda sudah tercatat di sistem. Admin akan memverifikasi mutasi bank. Hubungi WhatsApp Admin untuk mempercepat proses.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <a
                href={getWhatsAppUrl(pendingPayment)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-uda"
                style={{
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  padding: '9px 16px',
                  borderRadius: 8,
                  fontSize: '0.86rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={16} />
                <span>Hubungi Admin via WA</span>
              </a>
              <button
                type="button"
                onClick={() => router.push('/app')}
                className="btn-uda btn-uda-secondary"
                style={{
                  fontSize: '0.86rem',
                  padding: '9px 16px',
                }}
              >
                Ke Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Banner Status Akun Saat Ini */}
      <div
        id="tour-langganan-status"
        className="uda-card"
        style={{
          backgroundColor: teamMembership ? '#fdf4ff' : effectivePlanCode === 'team' ? '#f5f3ff' : effectivePlanCode === 'pro' ? '#f0fdf4' : '#f8fafc',
          borderColor: teamMembership ? '#f0abfc' : effectivePlanCode === 'team' ? '#ddd6fe' : effectivePlanCode === 'pro' ? '#bbf7d0' : '#e2e8f0',
          padding: '20px 24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: '50%',
                backgroundColor: teamMembership ? '#fae8ff' : effectivePlanCode === 'team' ? '#ede9fe' : effectivePlanCode === 'pro' ? '#dcfce7' : '#e2e8f0',
                color: teamMembership ? '#c026d3' : effectivePlanCode === 'team' ? '#7c3aed' : effectivePlanCode === 'pro' ? '#16a34a' : '#64748b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShieldCheck size={24} />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>
                Paket Aktif:{' '}
                <span
                  style={{
                    textTransform: 'uppercase',
                    color: teamMembership
                      ? '#c026d3'
                      : effectivePlanCode === 'team'
                      ? '#7c3aed'
                      : effectivePlanCode === 'pro'
                      ? '#16a34a'
                      : '#64748b',
                  }}
                >
                  {teamMembership
                    ? 'TIM (ANGGOTA TIM)'
                    : effectivePlanCode && effectivePlanCode !== 'free'
                    ? effectivePlanCode
                    : 'Gratis (Free)'}
                </span>
              </div>
              <div style={{ fontSize: '0.84rem', color: '#64748b', marginTop: 2 }}>
                {teamMembership ? (
                  <>
                    Tergabung sebagai <strong>{teamMembership.role.toUpperCase()}</strong> di brand{' '}
                    <strong style={{ color: '#0f172a' }}>"{teamMembership.brand_name}"</strong>.
                  </>
                ) : effectivePlanUntil && effectivePlanCode && effectivePlanCode !== 'free' ? (
                  `Masa aktif paket berlaku hingga: ${new Date(effectivePlanUntil).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}`
                ) : (
                  'Paket dasar gratis tanpa batasan waktu.'
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            {teamMembership && (
              <button
                type="button"
                onClick={() => setShowLeaveTeamModal(true)}
                className="btn-uda btn-uda-secondary btn-uda-sm"
                style={{
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  backgroundColor: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <Trash2 size={14} />
                <span>Keluar dari Anggota TIM</span>
              </button>
            )}

            {!teamMembership && effectivePlanCode && effectivePlanCode !== 'free' && (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                className="btn-uda btn-uda-secondary btn-uda-sm"
                style={{
                  color: '#dc2626',
                  borderColor: '#fca5a5',
                  backgroundColor: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                }}
                title="Berhenti berlangganan dan kembali ke paket Free (Gratis)"
              >
                <XCircle size={14} />
                <span>Berhenti Langganan</span>
              </button>
            )}

            <span
              className="status-pill"
              style={{
                backgroundColor: teamMembership
                  ? '#fae8ff'
                  : effectivePlanCode === 'team'
                  ? '#ede9fe'
                  : effectivePlanCode === 'pro'
                  ? '#dcfce7'
                  : '#f1f5f9',
                color: teamMembership
                  ? '#a21caf'
                  : effectivePlanCode === 'team'
                  ? '#7c3aed'
                  : effectivePlanCode === 'pro'
                  ? '#15803d'
                  : '#475569',
                fontWeight: 800,
              }}
            >
              {teamMembership
                ? 'Anggota Tim'
                : effectivePlanCode && effectivePlanCode !== 'free'
                ? 'Langganan Aktif'
                : 'Paket Free'}
            </span>
          </div>
        </div>

        {/* Pemberitahuan Penting untuk Anggota Tim */}
        {teamMembership && (
          <div
            style={{
              marginTop: 16,
              padding: '12px 16px',
              borderRadius: 10,
              backgroundColor: '#fffbeb',
              border: '1.5px solid #fde68a',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 12,
            }}
          >
            <AlertCircle size={20} style={{ color: '#d97706', flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.84rem', color: '#92400e', lineHeight: 1.5 }}>
              <div style={{ fontWeight: 800, marginBottom: 2 }}>
                Pemberitahuan Pembelian Langganan:
              </div>
              Anda saat ini menikmati fasilitas paket <strong>TIM</strong> karena bergabung sebagai Anggota Tim di brand <strong>"{teamMembership.brand_name}"</strong>. Jika sewaktu-waktu Anda ingin membeli paket langganan pribadi (Pro atau Tim milik Anda sendiri), Anda harus <strong>keluar dari Anggota TIM terlebih dahulu</strong>.
            </div>
          </div>
        )}
      </div>

      {/* PILIHAN PAKET DINAMIS */}
      <div id="tour-langganan-plans">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
          1. Pilih Paket & Durasi Berlangganan
        </h2>
        <p style={{ color: '#64748b', fontSize: '0.86rem', marginBottom: 18 }}>
          Data paket dan variasi durasi terhubung langsung dengan database konfigurasi admin.
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))',
            gap: 20,
          }}
        >
          {plans.map((plan) => {
            const isSelected = selectedPlanCode === plan.code;
            const durations = (plan.durations || []).filter((d) => d.isActive);
            const activeIdx = selectedDurationIndex[plan.code] || 0;
            const currentDur = durations[activeIdx] || durations[0];
            const displayPrice = currentDur ? currentDur.price : plan.price;

            return (
              <div
                key={plan.code}
                onClick={() => handleSelectPlan(plan.code)}
                className="uda-card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: 24,
                  borderRadius: 20,
                  border: isSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  boxShadow: isSelected ? '0 12px 30px rgba(22, 163, 74, 0.12)' : 'none',
                  backgroundColor: '#ffffff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'all 0.2s ease',
                }}
              >
                {isSelected && (
                  <div
                    style={{
                      position: 'absolute',
                      top: -12,
                      right: 20,
                      backgroundColor: '#16a34a',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      padding: '3px 12px',
                      borderRadius: 999,
                    }}
                  >
                    Pilihan Anda
                  </div>
                )}

                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>{plan.name}</h3>
                  <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: 2, minHeight: 36 }}>
                    {plan.description}
                  </div>

                  {/* Variasi Durasi Pills */}
                  {durations.length > 1 && (
                    <div style={{ margin: '14px 0 16px' }} onClick={(e) => e.stopPropagation()}>
                      <div style={{ fontSize: '0.74rem', fontWeight: 700, color: '#475569', marginBottom: 6 }}>
                        Pilih Durasi:
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {durations.map((dur, dIdx) => (
                          <button
                            key={dur.id}
                            type="button"
                            onClick={() => handleSelectPlan(plan.code, dIdx)}
                            style={{
                              padding: '4px 10px',
                              borderRadius: 8,
                              border: '1px solid',
                              borderColor: activeIdx === dIdx ? '#16a34a' : '#cbd5e1',
                              backgroundColor: activeIdx === dIdx ? '#f0fdf4' : '#ffffff',
                              color: activeIdx === dIdx ? '#15803d' : '#475569',
                              fontSize: '0.75rem',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {dur.name}
                            {dur.discountPercent > 0 && (
                              <span style={{ marginLeft: 4, color: '#16a34a', fontWeight: 800 }}>
                                -{dur.discountPercent}%
                              </span>
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ margin: '14px 0 20px' }}>
                    <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>
                      {displayPrice === 0 ? 'Gratis' : `Rp ${displayPrice.toLocaleString('id-ID')}`}
                    </div>
                    <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 4 }}>
                      {displayPrice === 0 ? 'Tanpa biaya' : `Untuk masa aktif ${currentDur?.name || '30 hari'}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: '0.84rem', borderTop: '1px solid #f1f5f9', paddingTop: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <span>Maks. <strong>{plan.maxBrands} Akun Brand</strong></span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <span>{plan.maxMembers > 0 ? `${plan.maxMembers} Anggota Tim` : 'Single User (Solo)'}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                      <span>Storage {plan.storageMb >= 1024 ? `${plan.storageMb / 1024} GB` : `${plan.storageMb} MB`}</span>
                    </div>
                    {plan.allowGrid && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <CheckCircle2 size={16} style={{ color: '#16a34a', flexShrink: 0 }} />
                        <span>Pratinjau Grid Instagram</span>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleSelectPlan(plan.code)}
                  className={`btn-uda ${isSelected ? 'btn-uda-primary' : 'btn-uda-secondary'}`}
                  style={{ width: '100%', marginTop: 20, height: 40, fontSize: '0.88rem', fontWeight: 800 }}
                >
                  {teamMembership && plan.code !== 'free'
                    ? 'Keluar dari TIM untuk Beli'
                    : isSelected
                    ? '✓ Paket Terpilih'
                    : `Pilih ${plan.name}`}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* FORM PEMBAYARAN TRANSFER BANK DINAMIS */}
      {selectedPlanCode !== 'free' && (
        <div id="tour-langganan-payment" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 360px), 1fr))', gap: 24 }}>
          {/* Kolom Kiri: Detail Rekening Bank & Nominal Transfer */}
          <div className="uda-card" style={{ padding: 26, borderRadius: 20 }}>
            {effectivePlanCode === 'pro' && selectedPlanCode === 'team' && (
              <div
                style={{
                  background: '#fff1f2',
                  border: '1.5px solid #fecdd3',
                  borderRadius: 12,
                  padding: '12px 16px',
                  fontSize: '0.84rem',
                  color: '#9f1239',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 10,
                  marginBottom: 18,
                  lineHeight: 1.5,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  <strong>Perhatian Beralih ke Paket TIM:</strong> Anda beralih dari <strong>Paket Pro</strong>. Setelah pembayaran diverifikasi oleh Admin, masa aktif Paket Pro sebelumnya akan otomatis <strong>hangus</strong> dan masa aktif akun Anda dihitung penuh dari Paket TIM.
                </span>
              </div>
            )}
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
              2. Rekening Tujuan Transfer
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 18 }}>
              Pilih rekening bank resmi tujuan transfer di bawah ini:
            </p>

            {/* Pilihan Rekening Aktif */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {bankAccounts.map((b) => {
                const isBankSelected = selectedBankId === b.id;
                return (
                  <div
                    key={b.id}
                    onClick={() => setSelectedBankId(b.id)}
                    style={{
                      padding: '14px 16px',
                      borderRadius: 14,
                      border: isBankSelected ? '2px solid #16a34a' : '1px solid #e2e8f0',
                      backgroundColor: isBankSelected ? '#f0fdf4' : '#ffffff',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      transition: 'all 0.2s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 40,
                          height: 40,
                          borderRadius: 8,
                          backgroundColor: '#ffffff',
                          border: '1px solid #e2e8f0',
                          padding: 4,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        {b.logoUrl ? (
                          <img
                            src={b.logoUrl}
                            alt={b.bankName}
                            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              (e.currentTarget as any).style.display = 'none';
                            }}
                          />
                        ) : (
                          <Landmark size={20} style={{ color: '#64748b' }} />
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.94rem', color: '#0f172a' }}>{b.bankName}</div>
                        <div style={{ fontSize: '0.78rem', color: '#64748b' }}>A/N {b.accountName}</div>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.98rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.03em' }}>
                        {b.accountNumber}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Rekening Terpilih Detail + Tombol Salin */}
            {selectedBank && (
              <div
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 14,
                  padding: '16px',
                  marginBottom: 20,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: '0.78rem', color: '#64748b', fontWeight: 700 }}>Nomor Rekening {selectedBank.bankName}:</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(selectedBank.accountNumber, `Nomor Rekening ${selectedBank.bankName}`)}
                    className="btn-uda btn-uda-secondary btn-uda-sm"
                    style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    {copiedText === selectedBank.accountNumber ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedText === selectedBank.accountNumber ? 'Tersalin' : 'Salin Rekening'}</span>
                  </button>
                </div>
                <div style={{ fontSize: '1.35rem', fontWeight: 900, color: '#0f172a', letterSpacing: '0.04em' }}>
                  {selectedBank.accountNumber}
                </div>
                <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4 }}>
                  Atas Nama: <strong>{selectedBank.accountName}</strong>
                </div>
              </div>
            )}

            {/* Nominal Pembayaran dengan Kode Unik */}
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 14,
                padding: '16px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#166534' }}>
                  Nominal Transfer Tepat (Termasuk Kode Unik):
                </span>
                <button
                  type="button"
                  onClick={() => handleCopy(totalAmountToTransfer.toString(), 'Nominal Pembayaran')}
                  className="btn-uda btn-uda-secondary btn-uda-sm"
                  style={{ fontSize: '0.76rem', padding: '4px 10px', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                >
                  {copiedText === totalAmountToTransfer.toString() ? <Check size={13} /> : <Copy size={13} />}
                  <span>Salin Nominal</span>
                </button>
              </div>

              <div style={{ fontSize: '1.75rem', fontWeight: 900, color: '#15803d' }}>
                Rp {totalAmountToTransfer.toLocaleString('id-ID')}
              </div>
              <div style={{ fontSize: '0.76rem', color: '#166534', marginTop: 4 }}>
                * 3 digit terakhir (<strong>{paymentCode}</strong>) adalah kode unik untuk mempercepat verifikasi otomatis.
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Formulir Konfirmasi Bukti Transfer */}
          <div className="uda-card" style={{ padding: 26, borderRadius: 20 }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginBottom: 4 }}>
              3. Unggah Bukti Transfer
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 18 }}>
              Kirimkan bukti transaksi Anda untuk diverifikasi oleh admin UdaPlanner.
            </p>

            <form onSubmit={handleSubmitProof} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Nama Pemilik Rekening Pengirim *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Muhammad Rizki"
                  value={senderName}
                  onChange={(e) => setSenderName(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Bank / E-Wallet Pengirim *
                </label>
                <select
                  required
                  value={senderBank}
                  onChange={(e) => setSenderBank(e.target.value)}
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.88rem', outline: 'none', backgroundColor: '#ffffff', cursor: 'pointer' }}
                >
                  <optgroup label="Bank Populer & Syariah">
                    <option value="BCA">BCA (Bank Central Asia)</option>
                    <option value="Bank Mandiri">Bank Mandiri</option>
                    <option value="BNI">BNI (Bank Negara Indonesia)</option>
                    <option value="BRI">BRI (Bank Rakyat Indonesia)</option>
                    <option value="BSI">BSI (Bank Syariah Indonesia)</option>
                    <option value="CIMB Niaga">CIMB Niaga</option>
                    <option value="Permata Bank">Permata Bank</option>
                    <option value="Bank Danamon">Bank Danamon</option>
                    <option value="BTN">Bank BTN</option>
                    <option value="Jenius / BTPN">Jenius / BTPN</option>
                    <option value="SeaBank">SeaBank</option>
                    <option value="Bank Jago">Bank Jago</option>
                    <option value="Bank Neo Commerce">Bank Neo Commerce</option>
                    <option value="Bank Panin">Bank Panin</option>
                    <option value="Bank Mega">Bank Mega</option>
                    <option value="Bank OCBC NISP">Bank OCBC NISP</option>
                  </optgroup>
                  <optgroup label="Dompet Digital / E-Wallet">
                    <option value="GoPay">GoPay</option>
                    <option value="OVO">OVO</option>
                    <option value="DANA">DANA</option>
                    <option value="ShopeePay">ShopeePay</option>
                    <option value="LinkAja">LinkAja</option>
                  </optgroup>
                </select>
              </div>

              {/* Upload Foto Bukti Struk Transfer */}
              <div>
                <label style={{ fontSize: '0.82rem', fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Foto Bukti Struk Transfer *
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png,image/jpeg,image/jpg,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />

                {proofPreviewUrl ? (
                  <div
                    style={{
                      border: '2px solid #0f172a',
                      borderRadius: 12,
                      padding: 12,
                      backgroundColor: '#f8fafc',
                      boxShadow: '3px 3px 0px #0f172a',
                    }}
                  >
                    <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', maxHeight: 220, backgroundColor: '#0f172a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <img
                        src={proofPreviewUrl}
                        alt="Bukti Transfer Preview"
                        style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }}
                      />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 }}>
                      <div style={{ fontSize: '0.78rem', color: '#475569', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {selectedProofFile?.name || 'Foto Bukti Dipilih'}
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="btn-uda btn-uda-secondary btn-uda-sm"
                          style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                        >
                          <Camera size={13} />
                          <span>Ganti Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleRemoveProofPhoto}
                          className="btn-uda btn-uda-danger btn-uda-sm"
                          style={{ fontSize: '0.76rem', padding: '4px 10px' }}
                        >
                          <Trash2 size={13} />
                          <span>Hapus</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      border: '2px dashed #0f172a',
                      borderRadius: 12,
                      padding: '24px 16px',
                      textAlign: 'center',
                      backgroundColor: '#f8fafc',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f1f5f9')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: '50%',
                        backgroundColor: '#dcfce7',
                        color: '#16a34a',
                        border: '1.5px solid #0f172a',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <UploadCloud size={22} />
                    </div>
                    <div>
                      <div style={{ fontSize: '0.9rem', fontWeight: 800, color: '#0f172a' }}>
                        Pilih Foto Bukti Transfer
                      </div>
                      <div style={{ fontSize: '0.76rem', color: '#64748b', marginTop: 2 }}>
                        Klik untuk memilih file struk / tangkapan layar (JPG, PNG, WebP maks. 10 MB)
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tautan URL Opsional */}
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 4 }}>
                  Atau masukkan Tautan File Bukti (Opsional / Image URL):
                </label>
                <input
                  type="url"
                  placeholder="https://.../bukti-transfer.jpg"
                  value={proofFileUrl}
                  onChange={(e) => setProofFileUrl(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: 8, fontSize: '0.84rem', outline: 'none' }}
                />
              </div>

              {/* Info Akumulasi Durasi Masa Aktif Real-time */}
              {(() => {
                const isSamePlan = account?.plan_code === selectedPlanCode;
                const isStillActive = account?.plan_until && new Date(account.plan_until).getTime() > Date.now();
                const currentExpiry = account?.plan_until ? new Date(account.plan_until) : new Date();
                const addedDays = currentDuration?.durationDays || 30;

                if (isSamePlan && isStillActive) {
                  const newExpiry = new Date(currentExpiry.getTime() + addedDays * 86400000);
                  return (
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#f0fdf4',
                        border: '1.5px solid #86efac',
                        borderRadius: 10,
                        fontSize: '0.82rem',
                        color: '#166534',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <Sparkles size={18} style={{ flexShrink: 0, marginTop: 2, color: '#16a34a' }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#14532d', marginBottom: 2 }}>
                          Perpanjangan Masa Aktif Akumulatif (+{addedDays} Hari)
                        </div>
                        <div>
                          Masa aktif paket <strong>{selectedPlanCode.toUpperCase()}</strong> Anda saat ini berlaku hingga{' '}
                          <strong>{currentExpiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>.
                          Setelah dikonfirmasi admin, masa aktif akan bertambah menjadi hingga:{' '}
                          <strong style={{ color: '#15803d' }}>
                            {newExpiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </strong>.
                        </div>
                      </div>
                    </div>
                  );
                }

                if (account?.plan_code === 'pro' && selectedPlanCode === 'team') {
                  const newExpiry = new Date(Date.now() + addedDays * 86400000);
                  return (
                    <div
                      style={{
                        padding: '12px 14px',
                        backgroundColor: '#f5f3ff',
                        border: '1.5px solid #ddd6fe',
                        borderRadius: 10,
                        fontSize: '0.82rem',
                        color: '#6b21a8',
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 10,
                      }}
                    >
                      <Sparkles size={18} style={{ flexShrink: 0, marginTop: 2, color: '#7c3aed' }} />
                      <div>
                        <div style={{ fontWeight: 800, color: '#581c87', marginBottom: 2 }}>
                          Upgrade ke Paket Tim ({addedDays} Hari)
                        </div>
                        <div>
                          Akun Anda akan ditingkatkan dari paket Pro menjadi paket <strong>TEAM</strong>. Masa aktif baru berlaku hingga{' '}
                          <strong style={{ color: '#7c3aed' }}>
                            {newExpiry.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </strong>.
                        </div>
                      </div>
                    </div>
                  );
                }

                return null;
              })()}

              <div
                style={{
                  padding: '12px 14px',
                  backgroundColor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  fontSize: '0.8rem',
                  color: '#475569',
                  lineHeight: 1.5,
                }}
              >
                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Alur Verifikasi:</div>
                1. Transfer nominal tepat ke rekening di samping.<br />
                2. Unggah foto struk dan klik tombol Konfirmasi Pembayaran.<br />
                3. Admin memeriksa mutasi dan akun Anda otomatis berubah sesuai paket yang dipilih!
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="btn-uda btn-uda-primary"
                style={{
                  height: 48,
                  fontWeight: 900,
                  fontSize: '0.94rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                  marginTop: 4,
                  boxShadow: '3px 3px 0px #0f172a',
                  border: '2px solid #0f172a',
                  backgroundColor: selectedPlanCode === 'team' ? '#7c3aed' : '#16a34a',
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Mengunggah & Mengirim Bukti...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud size={18} />
                    <span>
                      {account?.plan_code === selectedPlanCode && account?.plan_until && new Date(account.plan_until).getTime() > Date.now()
                        ? `Konfirmasi Tambah Durasi (+${currentDuration?.durationDays || 30} Hari)`
                        : account?.plan_code === 'pro' && selectedPlanCode === 'team'
                        ? `Konfirmasi Upgrade ke Paket Tim`
                        : 'Kirim Konfirmasi Pembayaran'}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL SUKSES PEMBAYARAN & WHATSAPP QUICK ACTION */}
      {showSuccessModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(6px)',
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
              maxWidth: 520,
              width: '100%',
              padding: '32px 28px',
              borderRadius: 18,
              border: '2.5px solid #0f172a',
              boxShadow: '8px 8px 0px #0f172a',
              backgroundColor: '#ffffff',
              textAlign: 'center',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowSuccessModal(false)}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={20} />
            </button>

            <div
              style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                backgroundColor: '#dcfce7',
                color: '#16a34a',
                border: '2.5px solid #0f172a',
                boxShadow: '3px 3px 0px #0f172a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 18,
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h2 style={{ fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', marginBottom: 6 }}>
              Bukti Transfer Berhasil Terkirim!
            </h2>
            <p style={{ fontSize: '0.88rem', color: '#475569', lineHeight: 1.5, margin: '0 auto 20px', maxWidth: 440 }}>
              Terima kasih! Bukti transfer Anda telah masuk ke sistem dan sedang menunggu konfirmasi admin.
            </p>

            {/* Rincian Konfirmasi */}
            <div
              style={{
                backgroundColor: '#f8fafc',
                border: '2px solid #0f172a',
                borderRadius: 12,
                padding: '16px 18px',
                textAlign: 'left',
                marginBottom: 20,
                boxShadow: '3px 3px 0px #0f172a',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.84rem' }}>
                <span style={{ color: '#64748b' }}>Paket Langganan:</span>
                <span style={{ fontWeight: 800, color: '#16a34a', textTransform: 'uppercase' }}>
                  {successPaymentData?.plan_code || selectedPlanCode}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.84rem' }}>
                <span style={{ color: '#64748b' }}>Nominal Transfer:</span>
                <span style={{ fontWeight: 800, color: '#0f172a' }}>
                  Rp {(successPaymentData?.amount || totalAmountToTransfer).toLocaleString('id-ID')}
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: '0.84rem' }}>
                <span style={{ color: '#64748b' }}>Rekening Tujuan:</span>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>
                  {successPaymentData?.targetBankName || selectedBank?.bankName} ({successPaymentData?.targetAccountNumber || selectedBank?.accountNumber})
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.84rem' }}>
                <span style={{ color: '#64748b' }}>Status Verifikasi:</span>
                <span style={{ fontWeight: 800, color: '#ca8a04', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={13} />
                  <span>Menunggu Konfirmasi Admin</span>
                </span>
              </div>
            </div>

            <div
              style={{
                fontSize: '0.8rem',
                color: '#64748b',
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: 8,
                padding: '10px 14px',
                marginBottom: 22,
                lineHeight: 1.45,
              }}
            >
              Admin kami akan memverifikasi mutasi bank Anda dalam waktu singkat. Anda juga dapat menghubungi admin via WhatsApp sekarang untuk mempercepat proses.
            </div>

            {/* Tombol Aksi */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <a
                href={getWhatsAppUrl(successPaymentData)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-uda"
                style={{
                  width: '100%',
                  height: 48,
                  backgroundColor: '#25D366',
                  color: '#ffffff',
                  border: '2px solid #0f172a',
                  boxShadow: '3px 3px 0px #0f172a',
                  borderRadius: 10,
                  fontSize: '0.94rem',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 10,
                  textDecoration: 'none',
                }}
              >
                <MessageCircle size={18} />
                <span>Hubungi Admin via WhatsApp (Percepat Proses)</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setShowSuccessModal(false);
                  router.push('/app');
                }}
                className="btn-uda btn-uda-secondary"
                style={{
                  width: '100%',
                  height: 44,
                  fontSize: '0.9rem',
                  fontWeight: 800,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span>Lanjut ke Dashboard</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI BERALIH DARI PRO KE TIM (PAKET SEBELUMNYA HANGUS) */}
      {showUpgradeToTeamModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowUpgradeToTeamModal(false);
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 500,
              width: '100%',
              padding: 26,
              borderRadius: 20,
              border: '3px solid #0f172a',
              boxShadow: '6px 6px 0px #0f172a',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
              backgroundColor: '#ffffff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div
                style={{
                  width: 50,
                  height: 50,
                  borderRadius: 14,
                  background: '#fef3c7',
                  border: '2px solid #f59e0b',
                  color: '#b45309',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 3px' }}>
                  Beralih ke Paket TIM?
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Paket aktif Anda saat ini: <strong style={{ color: '#16a34a' }}>PRO</strong>
                  {effectivePlanUntil && (
                    <span> (berlaku s.d {new Date(effectivePlanUntil).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })})</span>
                  )}
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#fff1f2',
                border: '1.5px solid #fecdd3',
                borderRadius: 12,
                padding: '14px 16px',
                fontSize: '0.84rem',
                color: '#9f1239',
                lineHeight: 1.55,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontWeight: 800, marginBottom: 4 }}>
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>Ketentuan Pergantian Paket:</span>
              </div>
              <p style={{ margin: 0, paddingLeft: 26 }}>
                Ketika Anda beralih ke <strong>Paket TIM</strong>, maka <strong>paket Pro sebelumnya beserta sisa masa aktifnya akan hangus</strong> dan langsung digantikan sepenuhnya oleh masa aktif Paket TIM yang baru.
              </p>
            </div>

            <div
              style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: 12,
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: '#334155',
              }}
            >
              <div style={{ fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
                Benefit Paket TIM yang Akan Anda Dapatkan:
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>Kuota brand bertambah hingga <strong>20 Akun Brand</strong> (sebelumnya hanya 5).</li>
                <li>Membuka fitur kolaborasi hingga <strong>10 Anggota Tim</strong> (Editor, Reviewer, Viewer).</li>
                <li>Kapasitas penyimpanan meningkat hingga <strong>20 GB</strong>.</li>
                <li>Fitur alur persetujuan (approval) & review konten antar tim aktif penuh.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1, height: 42 }}
                onClick={() => setShowUpgradeToTeamModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-uda btn-uda-primary"
                style={{ flex: 1.4, height: 42, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontWeight: 800 }}
                onClick={handleConfirmUpgradeToTeam}
              >
                <span>Ya, Beralih ke Paket TIM</span>
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI KELUAR DARI ANGGOTA TIM SEBELUM BELI LANGGANAN */}
      {showLeaveTeamModal && teamMembership && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.7)',
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
              maxWidth: 480,
              width: '100%',
              padding: '28px 24px',
              borderRadius: 18,
              border: '2px solid #0f172a',
              boxShadow: '6px 6px 0px #0f172a',
              backgroundColor: '#ffffff',
              position: 'relative',
            }}
          >
            <button
              type="button"
              onClick={() => setShowLeaveTeamModal(false)}
              disabled={isLeavingTeam}
              style={{
                position: 'absolute',
                top: 16,
                right: 16,
                background: 'none',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                padding: 4,
              }}
            >
              <X size={20} />
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  backgroundColor: '#fee2e2',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  border: '1.5px solid #0f172a',
                }}
              >
                <AlertCircle size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: 900, color: '#0f172a', margin: 0 }}>
                  Keluar dari Anggota TIM?
                </h3>
                <div style={{ fontSize: '0.82rem', color: '#64748b', marginTop: 2 }}>
                  Brand: <strong>{teamMembership.brand_name}</strong> (Peran: {teamMembership.role.toUpperCase()})
                </div>
              </div>
            </div>

            <div
              style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: '0.84rem',
                color: '#991b1b',
                lineHeight: 1.5,
                marginBottom: 18,
              }}
            >
              Anda saat ini masih terdaftar sebagai <strong>Anggota TIM</strong>. Untuk dapat membeli paket langganan pribadi (Pro atau Tim sendiri), sistem mengharuskan Anda untuk <strong>keluar dari keanggotaan TIM</strong> terlebih dahulu.
            </div>

            <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.6, margin: '0 0 22px' }}>
              Setelah keluar dari tim, akses Anda ke brand "{teamMembership.brand_name}" akan dilepas dan status akun Anda kembali ke <strong>Paket Free</strong>. Anda dapat langsung melanjutkan checkout dan melakukan pembayaran untuk paket langganan pribadi yang dipilih.
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                onClick={() => setShowLeaveTeamModal(false)}
                disabled={isLeavingTeam}
                style={{ fontSize: '0.86rem', padding: '8px 18px' }}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-uda btn-uda-danger"
                onClick={handleLeaveTeam}
                disabled={isLeavingTeam}
                style={{
                  fontSize: '0.86rem',
                  padding: '8px 20px',
                  fontWeight: 900,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                {isLeavingTeam ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memproses Keluar...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={15} />
                    <span>Ya, Keluar dari TIM</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL KONFIRMASI BERHENTI LANGGANAN (DOWNGRADE KE FREE) */}
      {showCancelModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.72)',
            backdropFilter: 'blur(5px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: 16,
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !isCancelingSubscription) setShowCancelModal(false);
          }}
        >
          <div
            className="uda-card"
            style={{
              maxWidth: 480,
              width: '100%',
              padding: 26,
              borderRadius: 18,
              border: '3px solid #0f172a',
              boxShadow: '6px 6px 0px #0f172a',
              display: 'flex',
              flexDirection: 'column',
              gap: 16,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 12,
                  background: '#fef2f2',
                  border: '2px solid #ef4444',
                  color: '#dc2626',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <XCircle size={26} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', margin: '0 0 3px' }}>
                  Konfirmasi Berhenti Langganan
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748b', margin: 0 }}>
                  Paket aktif Anda: <strong style={{ color: '#16a34a', textTransform: 'uppercase' }}>{account?.plan_code}</strong>
                </p>
              </div>
            </div>

            <div
              style={{
                background: '#fffbeb',
                border: '1.5px solid #fde68a',
                borderRadius: 10,
                padding: '12px 14px',
                fontSize: '0.82rem',
                color: '#92400e',
                lineHeight: 1.5,
              }}
            >
              <strong>Ketentuan Berhenti Langganan:</strong>
              <ul style={{ margin: '6px 0 0', paddingLeft: 18 }}>
                <li>Status akun Anda akan langsung beralih ke <strong>Paket Free (Gratis)</strong>.</li>
                <li>Pada paket Gratis, Anda hanya diperbolehkan mengelola <strong>1 Brand aktif</strong>.</li>
                <li>Jika sebelumnya Anda memiliki lebih dari 1 brand, <strong>brand tambahan Anda akan dikunci (TIDAK AKAN DIHAPUS)</strong>.</li>
                <li>Anda dapat membuka kembali dan mengelola seluruh brand tersebut kapan saja dengan berlangganan paket Pro atau Team.</li>
              </ul>
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn-uda btn-uda-secondary"
                style={{ flex: 1 }}
                disabled={isCancelingSubscription}
                onClick={() => setShowCancelModal(false)}
              >
                Batal
              </button>
              <button
                type="button"
                className="btn-uda btn-uda-danger"
                style={{ flex: 1.3, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
                disabled={isCancelingSubscription}
                onClick={handleCancelSubscription}
              >
                {isCancelingSubscription ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    <span>Ya, Berhenti</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <GuidedTour steps={langgananTourSteps} tourKey="uda_tour_langganan" />
    </div>
  );
}
