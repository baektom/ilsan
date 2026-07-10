"use client";

import { FormEvent, useState } from "react";
import { createClient } from "../../lib/supabase/client";

export type AuthMode = "login" | "signup";

type AuthModalProps = {
  initialMode: AuthMode;
  onClose: () => void;
  onAuthSuccess?: () => void | Promise<void>;
};

function normalizeLoginId(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_]/g, "");
}

function EyeIcon({ hidden }: { hidden: boolean }) {
  if (hidden) {
    return (
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 3L21 21"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M10.7 5.1C11.1 5 11.5 5 12 5C17 5 20.5 8.6 22 12C21.5 13.2 20.7 14.4 19.8 15.4"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M6.6 6.7C4.5 8 3 10 2 12C3.5 15.4 7 19 12 19C13.4 19 14.7 18.7 15.8 18.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M9.9 9.9C9.3 10.5 9 11.2 9 12C9 13.7 10.3 15 12 15C12.8 15 13.5 14.7 14.1 14.1"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    );
  }

  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 12C3.5 8.6 7 5 12 5C17 5 20.5 8.6 22 12C20.5 15.4 17 19 12 19C7 19 3.5 15.4 2 12Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinejoin="round"
      />
      <path
        d="M12 15C13.7 15 15 13.7 15 12C15 10.3 13.7 9 12 9C10.3 9 9 10.3 9 12C9 13.7 10.3 15 12 15Z"
        stroke="currentColor"
        strokeWidth="2"
      />
    </svg>
  );
}

export default function AuthModal({
  initialMode,
  onClose,
  onAuthSuccess,
}: AuthModalProps) {
  const [supabase] = useState(() => createClient());

  const [authMode, setAuthMode] = useState<AuthMode>(initialMode);

  const [name, setName] = useState("");
  const [loginId, setLoginId] = useState("");
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [email, setEmail] = useState("");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const clearMessages = () => {
    setErrorMessage("");
    setSuccessMessage("");
  };

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    clearMessages();

    if (authMode === "signup") {
      const cleanName = name.trim();
      const cleanLoginId = normalizeLoginId(loginId.trim());
      const cleanEmail = email.trim();

      if (cleanName.length < 2) {
        setLoading(false);
        setErrorMessage("이름은 2글자 이상 입력해주세요.");
        return;
      }

      if (cleanLoginId.length < 4) {
        setLoading(false);
        setErrorMessage("로그인 아이디는 최소 4글자 이상 입력해주세요.");
        return;
      }

      if (cleanLoginId.length > 20) {
        setLoading(false);
        setErrorMessage("로그인 아이디는 최대 20글자까지 가능합니다.");
        return;
      }

      if (!cleanEmail.includes("@")) {
        setLoading(false);
        setErrorMessage("올바른 이메일 주소를 입력해주세요.");
        return;
      }

      if (password.length < 6) {
        setLoading(false);
        setErrorMessage("비밀번호는 최소 6자리 이상 입력해주세요.");
        return;
      }

      if (password !== confirmPassword) {
        setLoading(false);
        setErrorMessage("비밀번호와 비밀번호 확인이 서로 다릅니다.");
        return;
      }

      const { data: existingEmail } = await supabase.rpc(
        "get_email_by_login_id",
        {
          input_login_id: cleanLoginId,
        }
      );

      if (existingEmail) {
        setLoading(false);
        setErrorMessage("이미 사용 중인 로그인 아이디입니다.");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            name: cleanName,
            login_id: cleanLoginId,
          },
        },
      });

      setLoading(false);

      if (error) {
        setErrorMessage(
          "회원가입에 실패했습니다. 이미 가입된 이메일이거나 입력값을 확인해주세요."
        );
        return;
      }

      setSuccessMessage(
        "회원가입이 완료되었습니다. 이메일 인증 후 로그인해주세요."
      );

      setAuthMode("login");
      setLoginIdentifier(cleanLoginId);
      setPassword("");
      setConfirmPassword("");
      setShowPassword(false);
      setShowConfirmPassword(false);
      return;
    }

    const cleanLoginIdentifier = normalizeLoginId(loginIdentifier.trim());

    if (cleanLoginIdentifier.length < 4) {
      setLoading(false);
      setErrorMessage("로그인 아이디를 입력해주세요.");
      return;
    }

    const { data: foundEmail, error: lookupError } = await supabase.rpc(
      "get_email_by_login_id",
      {
        input_login_id: cleanLoginIdentifier,
      }
    );

    if (lookupError || !foundEmail) {
      setLoading(false);
      setErrorMessage("로그인 아이디 또는 비밀번호를 확인해주세요.");
      return;
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: foundEmail,
      password,
    });

    setLoading(false);

    if (error || !data.user) {
      setErrorMessage(
        "로그인에 실패했습니다. 아이디, 비밀번호 또는 이메일 인증 상태를 확인해주세요."
      );
      return;
    }

    await onAuthSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center px-5">
      <button
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
        aria-label="로그인창 닫기 배경"
      />

      <div className="relative max-h-[90vh] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-xl font-bold hover:bg-gray-200"
          aria-label="로그인창 닫기"
        >
          ×
        </button>

        <div className="mb-8 pr-10 text-center">
          <h1 className="mb-3 text-3xl font-black">
            {authMode === "login" ? "로그인" : "회원가입"}
          </h1>

          <p className="text-gray-500">
            {authMode === "login"
              ? "로그인 아이디로 접속해주세요."
              : "이메일 인증 후 로그인 아이디로 접속할 수 있습니다."}
          </p>
        </div>

        <div className="mb-6 grid grid-cols-2 rounded-xl bg-gray-100 p-1">
          <button
            type="button"
            onClick={() => {
              setAuthMode("login");
              clearMessages();
              setPassword("");
              setConfirmPassword("");
            }}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              authMode === "login"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            로그인
          </button>

          <button
            type="button"
            onClick={() => {
              setAuthMode("signup");
              clearMessages();
              setPassword("");
              setConfirmPassword("");
            }}
            className={`rounded-lg py-2 text-sm font-bold transition ${
              authMode === "signup"
                ? "bg-white text-blue-600 shadow-sm"
                : "text-gray-500"
            }`}
          >
            회원가입
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          {authMode === "signup" && (
            <>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  이름
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="이름을 입력하세요"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  로그인 아이디
                </label>
                <input
                  type="text"
                  required
                  value={loginId}
                  onChange={(event) =>
                    setLoginId(normalizeLoginId(event.target.value))
                  }
                  placeholder="예: moadream_user"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <p className="mt-2 text-xs text-gray-400">
                  4~20글자, 영문 소문자/숫자/밑줄(_)만 사용할 수 있습니다.
                </p>
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-700">
                  이메일 주소
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="이메일 인증에 사용할 주소"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </>
          )}

          {authMode === "login" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                로그인 아이디
              </label>
              <input
                type="text"
                required
                value={loginIdentifier}
                onChange={(event) =>
                  setLoginIdentifier(normalizeLoginId(event.target.value))
                }
                placeholder="로그인 아이디를 입력하세요"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-700">
              비밀번호
            </label>

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="비밀번호를 입력하세요"
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                aria-label="비밀번호 보기"
              >
                <EyeIcon hidden={showPassword} />
              </button>
            </div>
          </div>

          {authMode === "signup" && (
            <div>
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                비밀번호 확인
              </label>

              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  placeholder="비밀번호를 한 번 더 입력하세요"
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />

                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
                  aria-label="비밀번호 확인 보기"
                >
                  <EyeIcon hidden={showConfirmPassword} />
                </button>
              </div>
            </div>
          )}

          {errorMessage && (
            <p className="text-center text-sm font-medium text-red-500">
              {errorMessage}
            </p>
          )}

          {successMessage && (
            <p className="text-center text-sm font-medium text-green-600">
              {successMessage}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-blue-600 px-5 py-3 font-bold text-white transition hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading
              ? authMode === "login"
                ? "로그인 중..."
                : "회원가입 중..."
              : authMode === "login"
                ? "로그인하기"
                : "회원가입하기"}
          </button>
        </form>
      </div>
    </div>
  );
}