import { NextRequest, NextResponse } from 'next/server';
import { BankService } from '@/services/bank.service';

export async function GET() {
  try {
    const bankAccounts = await BankService.getAllBankAccounts();
    return NextResponse.json({ success: true, data: bankAccounts });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.bankName || !body.accountNumber || !body.accountName) {
      return NextResponse.json({ success: false, error: 'Nama bank, nomor rekening, dan nama pemilik rekening wajib diisi.' }, { status: 400 });
    }

    const created = await BankService.createBankAccount({
      bankName: body.bankName,
      bankCode: body.bankCode || body.bankName.toLowerCase().replace(/[^a-z0-9]/g, ''),
      accountNumber: body.accountNumber,
      accountName: body.accountName,
      logoUrl: body.logoUrl || null,
      isActive: body.isActive ?? true,
      sortOrder: body.sortOrder || 0,
    });

    return NextResponse.json({ success: true, data: created }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, updates } = body;
    if (!id || !updates) {
      return NextResponse.json({ success: false, error: 'ID rekening dan data pembaruan wajib disertakan.' }, { status: 400 });
    }

    await BankService.updateBankAccount(id, updates);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID rekening wajib disertakan.' }, { status: 400 });
    }

    await BankService.deleteBankAccount(id);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
