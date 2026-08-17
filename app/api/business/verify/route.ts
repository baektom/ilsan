import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type BusinessProfile = {
  host_type: string | null;
  business_number: string | null;
  business_name: string | null;
  business_start_date: string | null;
  representative_name: string | null;
  business_verification_status: string | null;
};

function decodeServiceKey(value: string) {
  const trimmed = value.trim();

  try {
    // 공공데이터포털은 일반 인증키를 URL 인코딩된 형태로 보여주기도 합니다.
    // 환경변수에는 Encoding/Decoding 키 어느 쪽을 넣어도 한 번만 인코딩해 전송합니다.
    return decodeURIComponent(trimmed);
  } catch {
    return trimmed;
  }
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const ntsKey = process.env.NTS_BUSINESS_API_KEY;

  if (!supabaseUrl || !supabaseKey || !serviceRoleKey || !ntsKey) {
    return NextResponse.json(
      { ok: false, message: "사업자 검증 서버 환경변수가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, message: "유효하지 않은 로그인입니다." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: hostRole, error: hostRoleError } = await admin
    .from("account_roles")
    .select("id")
    .eq("profile_id", userData.user.id)
    .eq("role", "host")
    .maybeSingle();
  const { data, error: profileError } = await admin
    .from("host_profiles")
    .select("host_type, business_number, business_name, business_start_date, representative_name, business_verification_status")
    .eq("profile_id", userData.user.id)
    .single();
  const profile = data as BusinessProfile | null;

  if (hostRoleError || !hostRole || profileError || !profile || profile.host_type !== "business") {
    return NextResponse.json({ ok: false, message: "기업 호스트 계정만 검증할 수 있습니다." }, { status: 403 });
  }
  if (profile.business_verification_status === "verified") {
    return NextResponse.json({ ok: true, message: "이미 확인된 사업자입니다." });
  }
  if (!profile.business_number || !profile.business_name || !profile.business_start_date || !profile.representative_name) {
    return NextResponse.json({ ok: false, message: "사업자 정보가 완전하지 않습니다." }, { status: 400 });
  }

  const baseUrl = "https://api.odcloud.kr/api/nts-businessman/v1";
  const query = `serviceKey=${encodeURIComponent(decodeServiceKey(ntsKey))}&returnType=JSON`;
  try {
    const [validationResponse, statusResponse] = await Promise.all([
      fetch(`${baseUrl}/validate?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businesses: [{
            b_no: profile.business_number,
            start_dt: profile.business_start_date,
            p_nm: profile.representative_name,
            p_nm2: "",
            b_nm: profile.business_name,
            corp_no: "",
            b_sector: "",
            b_type: "",
            b_adr: "",
          }],
        }),
        cache: "no-store",
      }),
      fetch(`${baseUrl}/status?${query}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ b_no: [profile.business_number] }),
        cache: "no-store",
      }),
    ]);

    if (!validationResponse.ok || !statusResponse.ok) throw new Error("NTS request failed");
    const validation = await validationResponse.json();
    const status = await statusResponse.json();
    const informationMatches = validation.data?.[0]?.valid === "01";
    const isActiveBusiness = status.data?.[0]?.b_stt_cd === "01";
    const verified = informationMatches && isActiveBusiness;
    const message = verified
      ? "국세청 사업자 정보와 정상 사업 상태를 확인했습니다."
      : "입력 정보가 국세청 등록 정보와 일치하지 않거나 계속사업자가 아닙니다.";

    await admin.from("host_profiles").update({
      business_verification_status: verified ? "verified" : "failed",
      business_verified_at: verified ? new Date().toISOString() : null,
      business_verification_message: message,
      approval_status: verified ? "approved" : "pending",
    }).eq("profile_id", userData.user.id);

    return NextResponse.json({ ok: verified, message }, { status: verified ? 200 : 422 });
  } catch {
    const message = "국세청 API 연결에 실패했습니다. 잠시 후 다시 시도해 주세요.";
    await admin.from("host_profiles").update({ business_verification_message: message }).eq("profile_id", userData.user.id);
    return NextResponse.json({ ok: false, message }, { status: 502 });
  }
}
