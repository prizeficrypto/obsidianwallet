import { NextResponse } from "next/server";
import { UniversalRelayerSDK } from "universal-sdk";

const sdk = process.env.UP_API_KEY
  ? new UniversalRelayerSDK(process.env.UP_API_KEY)
  : new UniversalRelayerSDK();

export async function POST(request: Request) {
  try {
    const body = await request.json();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = await sdk.submitOrder(body as any);
    return NextResponse.json(result);
  } catch (e) {
    const status =
      (e as { response?: { status?: number } })?.response?.status ?? 500;
    const msg =
      (e as { response?: { data?: { error?: string; message?: string } } })
        ?.response?.data?.error ??
      (e as { response?: { data?: { message?: string } } })?.response?.data
        ?.message ??
      (e instanceof Error ? e.message : "order failed");
    return NextResponse.json({ error: msg }, { status });
  }
}
