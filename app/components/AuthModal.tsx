"use client";

import { FormEvent, useEffect, useState } from "react";
import { createClient } from "../../lib/supabase/client";
import type { AccountRole, HostType } from "../../lib/supabase/types";

export type AuthMode = "login" | "signup";

type AuthModalProps = {
  initialMode: AuthMode;
  accountRole: AccountRole;
  allowSignup?: boolean;
  onClose: () => void;
  onAuthSuccess?: () => void | Promise<void>;
};

const HANGUL_REGEX = /[ㄱ-ㅎㅏ-ㅣ가-힣]/;

function normalizeLoginId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function onlyNumbers(value: string) {
  return value.replace(/\D/g, "");
}

function getRoleLabel(role: AccountRole) {
  if (role === "host") return "호스트";
  if (role === "admin") return "관리자";
  return "테스터";
}

export default function AuthModal({
  initialMode,
  accountRole,
  allowSignup = accountRole !== "admin",
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const [supabase] = useState(() => createClient());
  const [authMode, setAuthMode] = useState<AuthMode>(
    allowSignup ? initialMode : "login"
  );
  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [hostType, setHostType] = useState<Exclude<HostType, null>>("business");
  const [businessNumber, setBusinessNumber] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [businessStartDate, setBusinessStartDate] = useState("");
  const [representativeName, setRepresentativeName] = useState("");
  const [loginIdHasKorean, setLoginIdHasKorean] = useState(false);
  const [identifierHasKorean, setIdentifierHasKorean] = useState(false);
  const [loginIdStatus, setLoginIdStatus] = useState<
    "idle" | "checking" | "duplicate" | "available"
  >("idle");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkStep, setLinkStep] = useState<"credentials" | "confirm">("credentials");
  const [existingLoginId, setExistingLoginId] = useState("");
  const [existingPassword, setExistingPassword] = useState("");
  const [linkedLoginId, setLinkedLoginId] = useState("");
  const [existingAccountName, setExistingAccountName] = useState("");
  const [linkLoading, setLinkLoading] = useState(false);
  const [linkError, setLinkError] = useState("");

  const roleLabel = getRoleLabel(accountRole);
  const existingRole: AccountRole = accountRole === "host" ? "tester" : "host";
  const existingRoleLabel = getRoleLabel(existingRole);
  const canLinkExistingAccount =
    authMode === "signup" &&
    (accountRole === "tester" || accountRole === "host") &&
    !(accountRole === "host" && hostType === "business");
  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  useEffect(() => {
    const cleanLoginId = normalizeLoginId(loginId.trim());
    const shouldCheck =
      authMode === "signup" && !loginIdHasKorean && cleanLoginId.length >= 4;

    const timerId = window.setTimeout(async () => {
      if (!shouldCheck) {
        setLoginIdStatus("idle");
        return;
      }

      setLoginIdStatus("checking");
      const { data, error } = await supabase.rpc("is_login_id_available", {
        input_login_id: cleanLoginId,
      });
      setLoginIdStatus(!error && data === true ? "available" : "duplicate");
    }, shouldCheck ? 500 : 0);

    return () => window.clearTimeout(timerId);
  }, [authMode, loginId, loginIdHasKorean, supabase]);

  const fail = (message: string) => {
    setLoading(false);
    setErrorMessage(message);
  };

  const handleSignup = async () => {
    if (!allowSignup || accountRole === "admin") {
      fail("관리자 계정은 공개 회원가입으로 만들 수 없습니다.");
      return;
    }

    const cleanName = name.trim();
    const cleanLoginId = normalizeLoginId(loginId.trim());
    const cleanEmail = email.trim();
    const cleanBusinessNumber = onlyNumbers(businessNumber);
    const cleanStartDate = onlyNumbers(businessStartDate);

    if (cleanName.length < 2) return fail("이름은 2글자 이상 입력해 주세요.");
    if (loginIdHasKorean)
      return fail("아이디에는 한글을 사용할 수 없습니다. 영문으로 입력해 주세요.");
    if (cleanLoginId.length < 4 || cleanLoginId.length > 20)
      return fail("아이디는 영문 소문자, 숫자, 밑줄로 4~20자 입력해 주세요.");
    if (!cleanEmail.includes("@")) return fail("올바른 이메일 주소를 입력해 주세요.");
    if (password.length < 6) return fail("비밀번호는 6자리 이상 입력해 주세요.");
    if (password !== confirmPassword) return fail("비밀번호 확인이 일치하지 않습니다.");

    if (accountRole === "host" && hostType === "business") {
      if (cleanBusinessNumber.length !== 10)
        return fail("사업자등록번호 10자리를 입력해 주세요.");
      if (!businessName.trim()) return fail("상호를 입력해 주세요.");
      if (cleanStartDate.length !== 8)
        return fail("개업일자를 YYYYMMDD 8자리로 입력해 주세요.");
      if (!representativeName.trim()) return fail("대표자 이름을 입력해 주세요.");
    }

    const { data: available, error: availabilityError } = await supabase.rpc(
      "is_login_id_available",
      { input_login_id: cleanLoginId }
    );
    if (availabilityError || available !== true)
      return fail("테스터·호스트를 포함해 이미 사용 중인 아이디입니다.");

    const isBusinessHost = accountRole === "host" && hostType === "business";
    const { data: signupData, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        data: {
          name: cleanName,
          login_id: cleanLoginId,
          role: accountRole,
          host_type: accountRole === "host" ? hostType : null,
          business_number: isBusinessHost ? cleanBusinessNumber : null,
          business_name: isBusinessHost ? businessName.trim() : null,
          business_start_date: isBusinessHost ? cleanStartDate : null,
          representative_name: isBusinessHost ? representativeName.trim() : null,
        },
      },
    });
    setLoading(false);

    if (error) {
      setErrorMessage(
        error.code === "user_already_exists" || error.message.includes("already")
          ? accountRole === "host" && hostType === "business"
            ? "이미 가입된 이메일입니다. 기업 호스트는 별도의 이메일 계정으로 가입해 주세요."
            : "이미 가입된 이메일입니다. 아래의 기존 계정 연결 기능을 이용해 주세요."
          : "회원가입에 실패했습니다. 입력값과 이메일 사용 여부를 확인해 주세요."
      );
      return;
    }

    if (signupData.user && signupData.user.identities?.length === 0) {
      setErrorMessage(
        accountRole === "host" && hostType === "business"
          ? "이미 가입된 이메일입니다. 기업 호스트는 별도의 이메일 계정으로 가입해 주세요."
          : "이미 가입된 이메일입니다. 아래의 기존 계정 연결 기능을 이용해 주세요."
      );
      return;
    }

    setSuccessMessage(
      accountRole === "host"
        ? hostType === "business"
          ? "가입 메일을 인증해 주세요. 로그인 후 국세청 사업자 정보 확인이 진행됩니다."
          : "가입 메일을 인증해 주세요. 개인 호스트는 관리자 승인 후 활동할 수 있습니다."
        : "회원가입이 완료되었습니다. 이메일 인증 후 로그인해 주세요."
    );
    setAuthMode("login");
    setLoginIdentifier(cleanLoginId);
    setPassword("");
    setConfirmPassword("");
  };

  const closeLinkModal = async () => {
    if (linkStep === "confirm") {
      await supabase.auth.signOut();
    }
    setLinkModalOpen(false);
    setLinkStep("credentials");
    setExistingPassword("");
    setExistingAccountName("");
    setLinkError("");
  };

  const findExistingAccount = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLinkLoading(true);
    setLinkError("");

    const cleanExistingLoginId = normalizeLoginId(existingLoginId);
    const cleanLinkedLoginId = normalizeLoginId(linkedLoginId);
    if (cleanExistingLoginId.length < 4 || cleanLinkedLoginId.length < 4) {
      setLinkLoading(false);
      setLinkError("기존 아이디와 새 역할 아이디를 모두 4자 이상 입력해 주세요.");
      return;
    }
    if (cleanExistingLoginId === cleanLinkedLoginId) {
      setLinkLoading(false);
      setLinkError("역할별 로그인 아이디는 서로 달라야 합니다.");
      return;
    }

    const { data: available, error: availabilityError } = await supabase.rpc(
      "is_login_id_available",
      { input_login_id: cleanLinkedLoginId }
    );
    if (availabilityError || available !== true) {
      setLinkLoading(false);
      setLinkError("새 역할 아이디가 이미 사용 중입니다.");
      return;
    }

    const { data: foundEmail, error: lookupError } = await supabase.rpc(
      "get_email_by_login_id",
      { input_login_id: cleanExistingLoginId, input_role: existingRole }
    );
    if (lookupError || !foundEmail) {
      setLinkLoading(false);
      setLinkError(`기존 ${existingRoleLabel} 아이디를 찾지 못했습니다.`);
      return;
    }

    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: foundEmail,
      password: existingPassword,
    });
    if (signInError || !signInData.user) {
      setLinkLoading(false);
      setLinkError("기존 계정 비밀번호가 일치하지 않습니다.");
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("name, host_type")
      .eq("id", signInData.user.id)
      .single();
    if (profile?.host_type === "business") {
      await supabase.auth.signOut();
      setLinkLoading(false);
      setLinkError("기업 호스트 계정은 개인 역할 계정과 연결할 수 없습니다.");
      return;
    }

    setExistingLoginId(cleanExistingLoginId);
    setLinkedLoginId(cleanLinkedLoginId);
    setExistingAccountName(profile?.name ?? cleanExistingLoginId);
    setLinkStep("confirm");
    setLinkLoading(false);
  };

  const confirmAccountLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLinkLoading(true);
    setLinkError("");

    const { data: sessionData } = await supabase.auth.getSession();
    if (!sessionData.session) {
      setLinkLoading(false);
      setLinkStep("credentials");
      setLinkError("인증 시간이 만료되었습니다. 기존 계정을 다시 확인해 주세요.");
      return;
    }

    const response = await fetch("/api/accounts/link-role", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${sessionData.session.access_token}`,
      },
      body: JSON.stringify({ targetRole: accountRole, loginId: linkedLoginId }),
    });
    const result = (await response.json()) as { message?: string };
    if (!response.ok) {
      setLinkLoading(false);
      setLinkError(result.message ?? "계정을 연결하지 못했습니다.");
      return;
    }

    setLinkLoading(false);
    setLinkModalOpen(false);
    setSuccessMessage(result.message ?? "역할 아이디가 연결되었습니다.");
    await onAuthSuccess?.();
    onClose();
  };

  const handleLogin = async () => {
    if (identifierHasKorean)
      return fail("아이디에는 한글을 사용할 수 없습니다. 영문으로 입력해 주세요.");

    const cleanLoginIdentifier = normalizeLoginId(loginIdentifier.trim());
    if (cleanLoginIdentifier.length < 4) return fail("로그인 아이디를 입력해 주세요.");

    const { data: foundEmail, error: lookupError } = await supabase.rpc(
      "get_email_by_login_id",
      { input_login_id: cleanLoginIdentifier, input_role: accountRole }
    );
    if (lookupError || !foundEmail)
      return fail(`${roleLabel} 계정의 아이디 또는 비밀번호를 확인해 주세요.`);

    const { data, error } = await supabase.auth.signInWithPassword({
      email: foundEmail,
      password,
    });
    if (error || !data.user) return fail("로그인에 실패했습니다. 이메일 인증 여부도 확인해 주세요.");

    const { data: account } = await supabase
      .from("account_roles")
      .select("role")
      .eq("profile_id", data.user.id)
      .eq("role", accountRole)
      .maybeSingle();
    if (!account) {
      await supabase.auth.signOut();
      return fail(`${roleLabel} 계정으로 로그인해 주세요.`);
    }

    setLoading(false);
    await onAuthSuccess?.();
    onClose();
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    clearMessages();
    if (authMode === "signup") await handleSignup();
    else await handleLogin();
  };

  const changeLoginId = (raw: string, signup: boolean) => {
    const hasKorean = HANGUL_REGEX.test(raw);
    if (signup) {
      setLoginIdHasKorean(hasKorean);
      setLoginId(normalizeLoginId(raw));
    } else {
      setIdentifierHasKorean(hasKorean);
      setLoginIdentifier(normalizeLoginId(raw));
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-5">
      <button className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} aria-label="창 닫기" />
      <div className="relative z-10 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <button onClick={onClose} className="absolute right-5 top-5 h-10 w-10 rounded-full bg-gray-100 text-xl font-bold" aria-label="창 닫기">×</button>
        <div className="mb-7 pr-10 text-center">
          <h1 className="mb-2 text-3xl font-black">{roleLabel} {authMode === "login" ? "로그인" : "회원가입"}</h1>
          <p className="text-sm text-gray-500">
            {authMode === "login" ? `${roleLabel} 전용 계정으로 접속해 주세요.` : accountRole === "host" ? "기업 또는 개인 호스트 유형을 선택해 주세요." : "이메일 인증 후 테스터로 활동할 수 있습니다."}
          </p>
        </div>

        {allowSignup && (
          <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
            {(["login", "signup"] as AuthMode[]).map((mode) => (
              <button key={mode} type="button" onClick={() => { setAuthMode(mode); clearMessages(); }} className={`rounded-lg py-2 text-sm font-bold ${authMode === mode ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"}`}>
                {mode === "login" ? "로그인" : "회원가입"}
              </button>
            ))}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          {authMode === "signup" && (
            <>
              {accountRole === "host" && (
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-700">호스트 유형</label>
                  <div className="grid grid-cols-2 gap-2">
                    {(["business", "individual"] as const).map((type) => (
                      <button key={type} type="button" onClick={() => setHostType(type)} className={`rounded-xl border px-3 py-3 text-sm font-bold ${hostType === type ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300 text-gray-600"}`}>
                        {type === "business" ? "기업 호스트" : "개인 호스트"}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <Field label={accountRole === "host" && hostType === "business" ? "담당자 이름" : "이름"} value={name} onChange={setName} />

              {accountRole === "host" && hostType === "business" && (
                <>
                  <Field label="상호(법인명)" value={businessName} onChange={setBusinessName} />
                  <Field label="사업자등록번호" value={businessNumber} onChange={(value) => setBusinessNumber(onlyNumbers(value).slice(0, 10))} placeholder="숫자 10자리" inputMode="numeric" />
                  <Field label="개업일자" value={businessStartDate} onChange={(value) => setBusinessStartDate(onlyNumbers(value).slice(0, 8))} placeholder="YYYYMMDD" inputMode="numeric" />
                  <Field label="대표자 이름" value={representativeName} onChange={setRepresentativeName} />
                  <p className="rounded-xl bg-blue-50 p-3 text-xs leading-5 text-blue-700">이 정보는 국세청 사업자등록 상태조회 API로 확인하며, 확인 완료 후 호스트 기능을 사용할 수 있습니다.</p>
                </>
              )}

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">로그인 아이디</label>
                <input required value={loginId} onChange={(event) => changeLoginId(event.target.value, true)} placeholder="영문 소문자·숫자·밑줄 4~20자" className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" />
                <p className={`mt-1 text-xs ${loginIdStatus === "duplicate" || loginIdHasKorean ? "text-red-500" : loginIdStatus === "available" ? "text-green-600" : "text-gray-400"}`}>
                  {loginIdHasKorean ? "한글은 사용할 수 없습니다." : loginIdStatus === "checking" ? "전체 계정에서 중복 확인 중…" : loginIdStatus === "duplicate" ? "이미 사용 중인 아이디입니다." : loginIdStatus === "available" ? "사용 가능한 아이디입니다." : "테스터·호스트 전체에서 하나의 아이디만 사용할 수 있습니다."}
                </p>
              </div>
              <Field label="이메일 주소" value={email} onChange={setEmail} type="email" placeholder="인증 메일을 받을 주소" />
              <p className="text-xs leading-5 text-gray-400">이메일 인증은 이메일 소유 확인이며 법적 실명인증은 아닙니다.</p>
            </>
          )}

          {authMode === "login" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">로그인 아이디</label>
              <input required value={loginIdentifier} onChange={(event) => changeLoginId(event.target.value, false)} className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500" />
              {identifierHasKorean && <p className="mt-1 text-xs text-red-500">한글은 사용할 수 없습니다.</p>}
            </div>
          )}

          <Field label="비밀번호" value={password} onChange={setPassword} type="password" />
          {authMode === "signup" && <Field label="비밀번호 확인" value={confirmPassword} onChange={setConfirmPassword} type="password" />}
          {errorMessage && <p className="text-center text-sm font-medium text-red-500">{errorMessage}</p>}
          {successMessage && <p className="text-center text-sm font-medium text-green-600">{successMessage}</p>}
          <button type="submit" disabled={loading} className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-700 disabled:bg-gray-400">
            {loading ? "처리 중…" : authMode === "login" ? "로그인하기" : "회원가입하기"}
          </button>
          {canLinkExistingAccount && (
            <button
              type="button"
              onClick={() => {
                setLinkedLoginId(loginId);
                setLinkModalOpen(true);
                setLinkStep("credentials");
                setLinkError("");
              }}
              className="w-full text-center text-xs font-semibold text-gray-500 underline decoration-gray-300 underline-offset-4 hover:text-blue-600"
            >
              기존 모아드림 {existingRoleLabel} 가입 이력이 있나요?
            </button>
          )}
        </form>
      </div>

      {linkModalOpen && (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-5">
          <button className="absolute inset-0 bg-black/45" onClick={() => void closeLinkModal()} aria-label="계정 연결 창 닫기" />
          <div className="relative z-10 w-full max-w-sm rounded-3xl bg-white p-7 shadow-2xl">
            <button type="button" onClick={() => void closeLinkModal()} className="absolute right-4 top-4 h-9 w-9 rounded-full bg-gray-100 font-bold" aria-label="계정 연결 창 닫기">×</button>

            {linkStep === "credentials" ? (
              <form onSubmit={findExistingAccount} className="space-y-4">
                <div className="pr-8">
                  <p className="text-xs font-bold text-blue-600">이메일 인증 없이 역할 추가</p>
                  <h2 className="mt-1 text-xl font-black">기존 {existingRoleLabel} 계정 연결</h2>
                  <p className="mt-2 text-sm leading-6 text-gray-500">
                    기존 계정으로 본인 여부를 확인한 뒤 새 {roleLabel} 아이디를 같은 이메일 계정에 연결합니다.
                  </p>
                </div>
                <Field label={`기존 ${existingRoleLabel} 아이디`} value={existingLoginId} onChange={(value) => setExistingLoginId(normalizeLoginId(value))} />
                <Field label="기존 계정 비밀번호" value={existingPassword} onChange={setExistingPassword} type="password" />
                <Field label={`새 ${roleLabel} 로그인 아이디`} value={linkedLoginId} onChange={(value) => setLinkedLoginId(normalizeLoginId(value))} placeholder="영문 소문자·숫자·밑줄 4~20자" />
                <p className="rounded-xl bg-gray-50 p-3 text-xs leading-5 text-gray-500">
                  두 역할의 로그인 아이디는 서로 달라야 하지만 이메일과 비밀번호는 하나를 함께 사용합니다.
                </p>
                {linkError && <p className="text-sm font-medium text-red-500">{linkError}</p>}
                <button type="submit" disabled={linkLoading} className="w-full rounded-xl bg-blue-600 py-3 font-bold text-white disabled:bg-gray-400">
                  {linkLoading ? "계정 확인 중…" : "기존 계정 확인"}
                </button>
              </form>
            ) : (
              <form onSubmit={confirmAccountLink} className="space-y-5">
                <div className="pr-8">
                  <p className="text-xs font-bold text-green-600">기존 계정 확인 완료</p>
                  <h2 className="mt-1 text-xl font-black">두 역할을 연결할까요?</h2>
                </div>
                <div className="rounded-2xl bg-gray-50 p-4 text-sm leading-7 text-gray-700">
                  <p><strong>{existingAccountName}</strong>님의 계정입니다.</p>
                  <p>{existingRoleLabel}: <strong>@{existingLoginId}</strong></p>
                  <p>{roleLabel}: <strong>@{linkedLoginId}</strong></p>
                </div>
                <p className="text-sm leading-6 text-gray-500">
                  연결하면 이메일 인증을 다시 하지 않고 두 아이디로 각각 로그인할 수 있습니다.
                  {accountRole === "host" && " 개인 호스트 기능은 관리자 승인 후 사용할 수 있습니다."}
                </p>
                {linkError && <p className="text-sm font-medium text-red-500">{linkError}</p>}
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => void closeLinkModal()} className="rounded-xl border border-gray-300 py-3 font-bold text-gray-600">취소</button>
                  <button type="submit" disabled={linkLoading} className="rounded-xl bg-blue-600 py-3 font-bold text-white disabled:bg-gray-400">
                    {linkLoading ? "연결 중…" : "연결하기"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: string; placeholder?: string; inputMode?: "text" | "numeric"; }) {
  const [passwordVisible, setPasswordVisible] = useState(false);
  const renderedType = type === "password" && passwordVisible ? "text" : type;

  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-gray-700">{label}</label>
      <div className="relative">
        <input type={renderedType} required value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} inputMode={inputMode} className={`w-full rounded-xl border border-gray-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${type === "password" ? "pr-16" : ""}`} />
        {type === "password" && (
          <button type="button" onClick={() => setPasswordVisible((visible) => !visible)} className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-500">
            {passwordVisible ? "숨김" : "보기"}
          </button>
        )}
      </div>
    </div>
  );
}
