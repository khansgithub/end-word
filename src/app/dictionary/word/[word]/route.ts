// I don't think this is used

// app/api/foo/route.ts
import { NextRequest, NextResponse } from "next/server";
import { lookUpWord } from "@/app/server/dictionary/korean-api";

type WordParam = { word: string };
type Params = { params: Promise<WordParam> };

export async function GET(req: NextRequest, { params }: Params) {
  const word = (await params).word;
  const res = await lookUpWord(word);
  return NextResponse.json(res);
}

// export async function POST(req: Request) {
//   const body = await req.json();
//   return NextResponse.json({ received: body });
// }
