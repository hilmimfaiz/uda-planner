import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const INQUIRIES_FILE = path.join(process.cwd(), '.server_inquiries.json');

function loadInquiries(): any[] {
  try {
    if (fs.existsSync(INQUIRIES_FILE)) {
      const content = fs.readFileSync(INQUIRIES_FILE, 'utf-8');
      return JSON.parse(content) || [];
    }
  } catch {}
  return [];
}

function saveInquiries(list: any[]) {
  try {
    fs.writeFileSync(INQUIRIES_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch {}
}

export async function GET() {
  const inquiries = loadInquiries();
  return NextResponse.json({ success: true, data: inquiries });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, question, name } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { success: false, error: 'Alamat email tidak valid. Harap masukkan email yang benar.' },
        { status: 400 }
      );
    }

    const newInquiry = {
      id: `inq-${Date.now()}`,
      email: email.trim().toLowerCase(),
      name: name ? String(name).trim() : null,
      question: question ? String(question).trim() : 'Pertanyaan / konsultasi awal seputar UdaPlanner',
      created_at: new Date().toISOString(),
      status: 'pending',
    };

    const currentList = loadInquiries();
    const updated = [newInquiry, ...currentList];
    saveInquiries(updated);

    return NextResponse.json({
      success: true,
      message: 'Pertanyaan Anda berhasil dikirim ke tim UdaPlanner!',
      data: newInquiry,
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: err.message || 'Gagal memproses pengiriman data.' },
      { status: 500 }
    );
  }
}
