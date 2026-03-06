import { api } from "@/shared/api/api";

// 프로필 정보 조회
export type ProfileResponse = {
  credentialId: string;
  email: string;
  role: "admin" | "manager" | "staff";
  disabled: boolean;
  profileCompleted: boolean;
  account: {
    id: string;
    name: string | null;
    phone: string | null;
    emergencyContact: string | null;
    addressLine: string | null;
    bankName: string | null;
    bankAccountNo: string | null;
    photoUrl: string | null;
    positionRank: string;
    docUrlResidentRegistration: string | null;
    docUrlResidentAbstract: string | null;
    docUrlIdCard: string | null;
    docUrlFamilyRelation: string | null;
  } | null;
};

export async function getProfile(): Promise<ProfileResponse> {
  try {
    const response = await api.get<{
      message: string;
      data: ProfileResponse;
    }>("/dashboard/accounts/me/profile");

    // 백엔드 원본 응답 확인 (타입 캐스팅 없이)
    console.log("=== 프로필 조회 API 원본 응답 ===");
    console.log("전체 응답:", response);
    console.log("response.data:", response.data);
    console.log("response.data.data:", response.data.data);
    if (response.data.data?.account) {
      console.log(
        "response.data.data.account (전체):",
        response.data.data.account,
      );
      console.log(
        "account 객체의 모든 키:",
        Object.keys(response.data.data.account),
      );
      // 원본 응답 전체 확인 (JSON 문자열로)
      const accountJson = JSON.stringify(response.data.data.account, null, 2);
      console.log("account 객체 (JSON):", accountJson);

      console.log("서류 필드 값:", {
        docUrlResidentRegistration: (response.data.data.account as any)
          .docUrlResidentRegistration,
        docUrlResidentAbstract: (response.data.data.account as any)
          .docUrlResidentAbstract,
        docUrlIdCard: (response.data.data.account as any).docUrlIdCard,
        docUrlFamilyRelation: (response.data.data.account as any)
          .docUrlFamilyRelation,
      });

      // 모든 필드 값 확인
      const allFields = Object.entries(response.data.data.account).map(
        ([key, value]) => ({
          key,
          value,
          type: typeof value,
        }),
      );
      console.log("account 객체의 모든 필드:", allFields);
    }

    return response.data.data;
  } catch (error: any) {
    console.error("프로필 조회 실패:", error);
    throw error;
  }
}

// 프로필 정보 수정
export type UpdateMyProfileRequest = {
  name?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  addressLine?: string | null;
  salaryBankName?: string | null;
  salaryAccount?: string | null;
  profileUrl?: string | null;
  docUrlResidentRegistration?: string | null;
  docUrlResidentAbstract?: string | null;
  docUrlIdCard?: string | null;
  docUrlFamilyRelation?: string | null;
};

export type UpdateMyProfileResponse = {
  id: string;
  credentialId: string;
  name: string;
  phone: string;
  emergencyContact: string;
  addressLine: string;
  salaryAccount: string;
  positionRank: string;
  isProfileCompleted: boolean;
};

export async function updateMyProfile(
  data: UpdateMyProfileRequest,
): Promise<UpdateMyProfileResponse> {
  try {
    const response = await api.post<{
      message: string;
      data: UpdateMyProfileResponse;
    }>("/dashboard/accounts/me/info", data);
    return response.data.data;
  } catch (error: any) {
    console.error("프로필 수정 실패:", error);
    throw error;
  }
}

// 새로운 통합 API: 사원 계정 생성 (계정 + 직원 정보 한 번에)
export type CreateTeamAssignRequest = {
  teamId: string;
  isPrimary?: boolean;
  joinedAt?: string; // YYYY-MM-DD
};

export type UpsertEmployeeInfoRequest = {
  name?: string | null;
  phone?: string | null;
  emergencyContact?: string | null;
  addressLine?: string | null;
  salaryBankName?: string | null;
  salaryAccount?: string | null;
  profileUrl?: string | null;
  positionRank?:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | "CEO";
  docUrlResidentRegistration?: string | null;
  docUrlResidentAbstract?: string | null;
  docUrlIdCard?: string | null;
  docUrlFamilyRelation?: string | null;
};

export type CreateEmployeeRequest = {
  email: string;
  password: string;
  isDisabled?: boolean;
  team?: CreateTeamAssignRequest;
  teamName?: string;
  info?: UpsertEmployeeInfoRequest;
};

export type CreateEmployeeResponse = {
  id: string; // credentialId
  email: string;
  role: "admin" | "manager" | "staff";
  is_disabled: boolean;
  accountId: string;
  positionRank:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | null;
  team?: {
    id: string;
    name: string;
    code: string;
  };
};

// 첫 번째 API: 계정 생성 (credentials) - Deprecated: createEmployee 사용 권장
export type CreateAccountRequest = {
  email: string;
  password: string;
  role: "manager" | "staff";
  team?: {
    teamId: string;
    isPrimary?: boolean;
    joinedAt?: string;
  };
  isDisabled?: boolean;
};

export type CreateAccountResponse = {
  id: number;
  email: string;
  role: "manager" | "staff";
  isDisabled: boolean;
};

// 두 번째 API: 직원 정보 생성 - Deprecated: createEmployee 사용 권장
export type CreateEmployeeInfoRequest = {
  name: string;
  phone: string;
  emergencyContact: string;
  addressLine: string;
  salaryBankName: string;
  salaryAccount: string;
  positionRank?:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | "CEO";
  profileUrl?: string;
  docUrlIdCard?: string;
  docUrlResidentRegistration?: string;
  docUrlResidentAbstract?: string;
  docUrlFamilyRelation?: string;
};

export type CreateEmployeeInfoResponse = {
  id: string;
  credentialId: string;
  name: string;
  phone: string;
  emergencyContact: string;
  addressLine: string;
  salaryAccount: string;
  positionRank: string;
  isProfileCompleted: boolean;
};

// 새로운 통합 API: 사원 계정 생성 (계정 + 직원 정보 한 번에)
export async function createEmployee(
  data: CreateEmployeeRequest,
): Promise<CreateEmployeeResponse> {
  try {
    console.log("사원 계정 생성 API 호출:", data);
    const response = await api.post<{
      message: string;
      data: CreateEmployeeResponse;
    }>("/dashboard/accounts/credentials", data);
    console.log("사원 계정 생성 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("사원 계정 생성 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지:", error?.response?.data?.messages);
    throw error;
  }
}

// 첫 번째 API: 계정 생성 (Deprecated: createEmployee 사용 권장)
export async function createAccount(
  data: CreateAccountRequest,
): Promise<CreateAccountResponse> {
  try {
    console.log("계정 생성 API 호출:", data);
    const response = await api.post<{
      message: string;
      data: CreateAccountResponse;
    }>("/dashboard/accounts/credentials", data);
    console.log("계정 생성 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("계정 생성 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    throw error;
  }
}

// 두 번째 API: 직원 정보 생성
export async function createEmployeeInfo(
  credentialId: string,
  data: CreateEmployeeInfoRequest,
): Promise<CreateEmployeeInfoResponse> {
  try {
    console.log("직원 정보 생성 API 호출:", { credentialId, data });
    const response = await api.post<{
      message: string;
      data: CreateEmployeeInfoResponse;
    }>(`/dashboard/accounts/employees/${credentialId}/info`, data);
    console.log("직원 정보 생성 API 응답:", response.data);
    return response.data.data;
  } catch (error: any) {
    console.error("직원 정보 생성 API 호출 실패:", error);
    console.error("에러 상세:", error?.response?.data);
    console.error("에러 메시지:", error?.response?.data?.messages);
    throw error;
  }
}

// 계정 상세 조회 (credentialId로) - 백엔드 기존 API 사용
export type CredentialDetailResponse = {
  id: string;
  email: string;
  role: "admin" | "manager" | "staff";
  disabled: boolean;
  account: {
    id: string;
    name: string | null;
    phone: string | null;
    emergencyContact: string | null;
    address: string | null;
    salaryBankName: string | null;
    salaryAccount: string | null;
    profileUrl: string | null;
    isProfileCompleted: boolean;
    isDeleted: boolean;
    deletedAt: string | null;
  } | null;
  team: {
    id: string;
    name: string;
    code: string;
    isActive: boolean;
    role: "manager" | "staff" | null;
    isPrimary: boolean;
    joinedAt: string | null;
  } | null;
};

export async function getCredentialDetail(
  credentialId: string,
): Promise<CredentialDetailResponse> {
  try {
    const response = await api.get<{
      message: string;
      data: CredentialDetailResponse;
    }>(`/dashboard/accounts/credentials/${credentialId}`);
    return response.data.data;
  } catch (error: any) {
    console.error("계정 상세 조회 실패:", error);
    throw error;
  }
}

// 계정 목록 조회 (admin only) - 구버전 API (deprecated)
export type AccountListItem = {
  id: string;
  email: string;
  role: "admin" | "manager" | "staff";
  disabled: boolean;
  name: string | null;
  phone: string | null;
};

export async function getAccountsList(): Promise<AccountListItem[]> {
  try {
    const response = await api.get<{
      message: string;
      data: AccountListItem[];
    }>("/dashboard/accounts/credentials");
    return response.data.data;
  } catch (error: any) {
    console.error("계정 목록 조회 실패:", error);
    throw error;
  }
}

// 새로운 계정/사원 리스트 조회 API
export type PositionRank =
  | "ASSISTANT_MANAGER"
  | "MANAGER"
  | "DEPUTY_GENERAL"
  | "GENERAL_MANAGER"
  | "TEAM_LEADER"
  | "DIRECTOR"
  | "CEO";

export type EmployeeListQuery = {
  sort?: "name" | "rank";
  name?: string;
};

export type EmployeeListItem = {
  accountId: string;
  profileUrl: string | null;
  name: string | null;
  positionRank: PositionRank | null;
  teamName: string; // "미소속" 포함
  phone: string | null;
  reservedPinDrafts: Array<{
    id: string;
    name: string | null;
    addressLine: string;
    reservedDate: string; // YYYY-MM-DD
  }>;
  favoritePins: Array<{
    id: string;
    name: string | null;
  }>;
  ongoingContracts: Array<{
    id: number;
    contractNo: string;
    customerName: string;
    contractDate: string; // YYYY-MM-DD
  }>;
};

export async function getEmployeesList(
  query?: EmployeeListQuery,
): Promise<EmployeeListItem[]> {
  try {
    const params = new URLSearchParams();
    if (query?.sort) {
      params.append("sort", query.sort);
    }
    if (query?.name) {
      params.append("name", query.name);
    }

    const queryString = params.toString();
    const url = `/dashboard/accounts/employees${queryString ? `?${queryString}` : ""}`;

    const response = await api.get<{
      message: string;
      data: EmployeeListItem[];
    }>(url);
    return response.data.data;
  } catch (error: any) {
    console.error("사원 리스트 조회 실패:", error);
    throw error;
  }
}

// 직급 변경 API (팀장 직급일 때 팀 자동 생성)
export type PatchPositionRankRequest = {
  positionRank:
    | "ASSISTANT_MANAGER"
    | "MANAGER"
    | "DEPUTY_GENERAL"
    | "GENERAL_MANAGER"
    | "TEAM_LEADER"
    | "DIRECTOR"
    | "CEO";
  teamName?: string; // TEAM_LEADER일 때만 사용
};

export async function patchPositionRank(
  credentialId: string,
  data: PatchPositionRankRequest,
): Promise<void> {
  try {
    await api.patch(
      `/dashboard/accounts/credentials/${credentialId}/position-rank`,
      data,
    );
  } catch (error: any) {
    console.error("직급 변경 API 호출 실패:", error);
    throw error;
  }
}

// accountId 목록에 대해 credentialId + role을 한 번에 조회 (중복 호출 방지)
export async function batchResolveAccountIdToCredentialAndRole(
  accountIds: string[],
): Promise<
  Map<
    string,
    { credentialId: string; role: "admin" | "manager" | "staff" }
  >
> {
  const result = new Map<
    string,
    { credentialId: string; role: "admin" | "manager" | "staff" }
  >();
  const idSet = new Set(accountIds);
  if (idSet.size === 0) return result;

  try {
    const listResponse = await api.get<{
      message: string;
      data: Array<{ id: string }>;
    }>("/dashboard/accounts/credentials");

    if (!listResponse.data.data || listResponse.data.data.length === 0) {
      return result;
    }

    const credentialsToCheck = listResponse.data.data.slice(0, 100);
    for (const cred of credentialsToCheck) {
      if (result.size >= idSet.size) break;
      try {
        const detail = await getCredentialDetail(cred.id);
        const accountId = detail.account?.id;
        if (accountId && idSet.has(accountId)) {
          result.set(accountId, { credentialId: cred.id, role: detail.role });
        }
      } catch {
        continue;
      }
    }
    return result;
  } catch (error: any) {
    console.warn(
      "계정 배치 조회 실패:",
      error?.response?.status || error?.message,
    );
    return result;
  }
}

// accountId로 credentialId 조회
// 참고: 백엔드 API에 accountId로 credentialId를 직접 조회하는 API가 없으므로,
// credentials 목록을 조회하여 찾으려고 시도합니다.
// 만약 이 API가 실패하면 null을 반환하여 기본 정보만 표시합니다.
export async function getCredentialIdFromAccountId(
  accountId: string,
): Promise<string | null> {
  try {
    const listResponse = await api.get<{
      message: string;
      data: Array<{
        id: string;
      }>;
    }>("/dashboard/accounts/credentials");

    if (!listResponse.data.data || listResponse.data.data.length === 0) {
      return null;
    }

    // 각 credential의 detail을 조회하여 accountId와 일치하는 것을 찾기
    // 성능상 최대 50개까지만 확인
    const credentialsToCheck = listResponse.data.data.slice(0, 50);

    for (const cred of credentialsToCheck) {
      try {
        const detailResponse = await api.get<{
          message: string;
          data: {
            id: string;
            account: {
              id: string;
            } | null;
          };
        }>(`/dashboard/accounts/credentials/${cred.id}`);

        if (detailResponse.data.data.account?.id === accountId) {
          return cred.id;
        }
      } catch (e) {
        // 개별 credential 조회 실패는 무시하고 계속
        continue;
      }
    }

    return null;
  } catch (error: any) {
    // credentials 목록 조회 실패 시 에러를 로그로만 남기고 null 반환
    // (기본 정보만 표시하도록 함)
    console.warn(
      "credentialId 조회 실패 (기본 정보만 표시):",
      error?.response?.status || error?.message,
    );
    return null;
  }
}
