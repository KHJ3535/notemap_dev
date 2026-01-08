# 📁 프로젝트 폴더 구조 규칙

> Atomic Design(공용 UI) + Feature-Sliced(도메인/기능) 혼합 아키텍처

---

## 1. 기본 구조

- **`components/`** → Atomic Design 기반 **공용 UI**

  - `atoms`: 최소 단위 UI (버튼, 인풋, 라벨 등)
  - `molecules`: 여러 atom 조합 (FormField, SearchBar 등)
  - `organisms`: 큰 UI 블록 (Tooltip, Picker 등)
  - `layouts`: 페이지 레이아웃 (DashboardLayout 등)

- **`features/`** → **도메인/기능 단위 모듈**

  - 예: `auth`, `map`, `properties`, `users`
  - 내부: `components`, `layouts`, `pages`, `schemas`, `types`, `lib` 등 자유롭게 구성

- **`lib/`** → 범용 유틸 (날짜, 랜덤ID, Kakao SDK 로더 등)
- **`hooks/`** → 전역 커스텀 훅
- **`types/`** → 전역 공용 타입 (외부 SDK, ambient 타입 선언 등)

---

## 2. 경계 규칙

- `components` → **features import 금지**
- `features` → **components import 가능**
- 범용 로직 → `lib`, `hooks`
- 도메인 특화 로직/타입 → 반드시 해당 `features` 내부

---

## 3. 승격/귀속 원칙

- **승격 (features → components)**
  - 도메인 의존이 없고 여러 feature에서 재사용되는 경우
- **귀속 (components → features)**
  - 특정 도메인 타입/상수/비즈니스 로직을 참조하는 경우

---

## 4. 네이밍 규칙

- 공용 UI → `@/components/...`
- 기능별 → `@/features/{domain}/...`
- 범용 유틸 → `@/lib/...`
- 도메인 타입 → `@/features/{domain}/types/...`

---

