export type RoleKey =
  | "admin"
  | "owner"
  | "manager"
  | "team_leader"
  | "deputy_manager"
  | "general_manager"
  | "department_head"
  | "staff";

export type UserRow = {
  id: string; // accountId 또는 credentialId (사용 위치에 따라 다름)
  name: string;
  email?: string; // UserSettingsPage에서 API를 통해 조회하여 설정
  role?: RoleKey; // AccountsPage에서 credential API를 통해 별도로 조회하여 설정
  phone?: string;
  positionRank?: string;
  photo_url?: string;
  joinedAt?: string | null; // 팀 가입일 (팀 멤버 목록용)
  teamName?: string; // 팀 이름 (부서 표시용)
  isFavorite?: boolean; // 즐겨찾기 여부
  credentialId?: string; // accountId로 credentialId를 조회한 경우 저장
  favoritePins?: Array<{
    id: string;
    name: string | null;
  }>; // 계정별 즐겨찾기 핀 목록
};
