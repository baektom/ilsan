import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sharedPassword = process.env.SEED_TEST_USER_PASSWORD;

if (!supabaseUrl || !serviceRoleKey || !sharedPassword) {
  throw new Error(
    "NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_TEST_USER_PASSWORD가 필요합니다."
  );
}

if (sharedPassword.length < 8) {
  throw new Error("SEED_TEST_USER_PASSWORD는 8글자 이상이어야 합니다.");
}

const countArgument = process.argv.find((argument) => argument.startsWith("--count="));
const requestedCount = Number(countArgument?.split("=")[1] ?? 10);
const userCount = Math.min(50, Math.max(1, Math.floor(requestedCount)));
const shouldCreateApplications = process.argv.includes("--apply");

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const familyNames = ["김", "이", "박", "최", "정", "강", "조", "윤", "장", "임"];
const givenNames = ["서준", "서연", "도윤", "지우", "하준", "하은", "민준", "수아", "지호", "예은"];
const regions = ["서울", "경기", "인천", "부산", "대전", "대구", "광주"];
const batchId = Date.now().toString(36);

let openTests = [];

if (shouldCreateApplications) {
  const { data, error } = await admin
    .from("tests")
    .select("id, title")
    .eq("status", "모집중");

  if (error) throw new Error(`테스트 조회 실패: ${error.message}`);
  openTests = data ?? [];

  if (openTests.length === 0) {
    throw new Error("지원서를 만들 모집 중 테스트가 없습니다.");
  }
}

const createdUsers = [];

for (let index = 0; index < userCount; index += 1) {
  const sequence = String(index + 1).padStart(2, "0");
  const name = `${familyNames[index % familyNames.length]}${givenNames[index % givenNames.length]}`;
  const loginId = `seed_${batchId}_${sequence}`;
  const email = `moadream.${batchId}.${sequence}@example.com`;

  const { data: authData, error: authError } = await admin.auth.admin.createUser({
    email,
    password: sharedPassword,
    email_confirm: true,
    user_metadata: {
      name,
      login_id: loginId,
      role: "tester",
      is_seed_user: true,
    },
  });

  if (authError || !authData.user) {
    throw new Error(`${loginId} Auth 생성 실패: ${authError?.message ?? "알 수 없는 오류"}`);
  }

  const userId = authData.user.id;
  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    email,
    login_id: loginId,
    name,
    role: "tester",
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(userId);
    throw new Error(`${loginId} profile 생성 실패: ${profileError.message}`);
  }

  let appliedTestTitle = null;

  if (shouldCreateApplications) {
    const selectedTest = openTests[index % openTests.length];
    const { error: applicationError } = await admin.from("applications").insert({
      test_id: selectedTest.id,
      tester_id: userId,
      applicant_name: name,
      age: 20 + (index % 20),
      region: regions[index % regions.length],
      phone: `010-9000-${String(1000 + index).slice(-4)}`,
      message: "화면과 지원자 관리 기능을 확인하기 위한 테스트 지원서입니다.",
      status: "대기",
    });

    if (applicationError) {
      await admin.auth.admin.deleteUser(userId);
      throw new Error(`${loginId} 지원서 생성 실패: ${applicationError.message}`);
    }

    appliedTestTitle = selectedTest.title;
  }

  createdUsers.push({ loginId, email, name, appliedTestTitle });
}

console.table(createdUsers);
console.log(`테스트 사용자 ${createdUsers.length}명이 생성되었습니다.`);
console.log("비밀번호는 SEED_TEST_USER_PASSWORD 값과 같습니다.");
