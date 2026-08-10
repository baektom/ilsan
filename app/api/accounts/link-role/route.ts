import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import type { AccountRole } from "../../../../lib/supabase/types";

const LOGIN_ID_REGEX = /^[a-z0-9_]{4,20}$/;

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey || !serviceRoleKey) {
    return NextResponse.json(
      { ok: false, message: "계정 연결 서버 환경변수가 설정되지 않았습니다." },
      { status: 503 }
    );
  }

  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) {
    return NextResponse.json({ ok: false, message: "기존 계정 로그인이 필요합니다." }, { status: 401 });
  }

  const body = (await request.json()) as {
    targetRole?: AccountRole;
    loginId?: string;
  };
  const targetRole = body.targetRole;
  const loginId = body.loginId?.trim().toLowerCase() ?? "";

  if ((targetRole !== "tester" && targetRole !== "host") || !LOGIN_ID_REGEX.test(loginId)) {
    return NextResponse.json(
      { ok: false, message: "새 역할과 로그인 아이디를 확인해 주세요." },
      { status: 400 }
    );
  }

  const authClient = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData, error: userError } = await authClient.auth.getUser(token);
  if (userError || !userData.user) {
    return NextResponse.json({ ok: false, message: "기존 계정 인증에 실패했습니다." }, { status: 401 });
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: linkedRoleLabel, error: linkError } = await admin.rpc(
    "link_role_for_profile",
    {
      input_profile_id: userData.user.id,
      input_target_role: targetRole,
      input_login_id: loginId,
    }
  );

  if (linkError) {
    const isConflict = linkError.code === "23505" || linkError.message.includes("이미");
    return NextResponse.json(
      { ok: false, message: isConflict ? "이미 사용 중인 아이디이거나 해당 역할이 이미 연결되어 있습니다." : linkError.message },
      { status: isConflict ? 409 : 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    message: `${linkedRoleLabel} 아이디가 기존 계정에 연결되었습니다.`,
  });
}
