import { NextRequest, NextResponse } from 'next/server';
import { SnippetService } from '@/services/snippet.service';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const brandId = searchParams.get('brandId');
    const type = (searchParams.get('type') as any) || undefined;
    if (!brandId) {
      return NextResponse.json({ success: false, error: 'brandId query param is required' }, { status: 400 });
    }
    const snippets = await SnippetService.getSnippets(brandId, type);
    return NextResponse.json({ success: true, data: snippets });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const snippet = await SnippetService.createSnippet({
      brandId: body.brandId,
      type: body.type,
      title: body.title,
      content: body.content,
      tags: body.tags,
      userId: body.userId,
    });
    return NextResponse.json({ success: true, data: snippet }, { status: 201 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
