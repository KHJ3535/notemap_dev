"use client";

import { useMemo, useCallback, useEffect } from "react";
import { useHeaderFields } from "./slices/useHeaderFields";
import { useBasicInfo } from "./slices/useBasicInfo";
import { useNumbers } from "./slices/useNumbers";
import { useParking } from "./slices/useParking";
import { useGrades } from "./slices/useGrades";
import { useAspects } from "./slices/useAspects";
import { useAreaSets } from "./slices/useAreaSets";
import { useUnitLines } from "./slices/useUnitLines";
import { useOptionsMemos } from "./slices/useOptionsMemos";
import { useCreateValidation } from "../useCreateValidation";
import { sanitizeAreaGroups } from "@/features/properties/lib/forms/dtoUtils";
import { getPinDraftDetailOnce } from "@/shared/api/pins";

type Args = {
  initialAddress?: string;
  /** MapHome → ModalsHost → CreateModalBody */
  pinDraftId?: number | string | null;
  /** 임시핀에서 가져온 헤더 정보 (있으면 API보다 우선 사용) */
  draftHeaderPrefill?: {
    title?: string;
    officePhone?: string;
    officePhone2?: string;
  } | null;
};

export function useCreateForm({
  initialAddress,
  pinDraftId,
  draftHeaderPrefill,
}: Args) {
  const header = useHeaderFields();
  const basic = useBasicInfo({ initialAddress });
  const nums = useNumbers();
  const parking = useParking();
  const grades = useGrades();
  const aspects = useAspects();
  const areas = useAreaSets();
  const units = useUnitLines();
  const opts = useOptionsMemos();

  // ─────────────────────────────────────────────────────────
  // ✅ pinDraftId / draftHeaderPrefill 기반 헤더 프리필
  //   - 조건 너무 복잡해서 꼬였을 가능성 → 최대한 단순하게 재구성
  //   - 상위에서 내려준 값 먼저 적용, 그다음 서버에서 보충
  // ─────────────────────────────────────────────────────────
  useEffect(() => {
    const headerActions: any = header.actions;
    const basicActions: any = basic.actions;

    // 1) 상위(MapHome)에서 직접 내려준 값 우선 적용
    const titleFromProps = String(draftHeaderPrefill?.title ?? "").trim();
    const phoneFromProps = String(draftHeaderPrefill?.officePhone ?? "").trim();

    if (titleFromProps && typeof headerActions.setTitle === "function") {
      headerActions.setTitle(titleFromProps);
    }
    if (phoneFromProps && typeof basicActions.setOfficePhone === "function") {
      basicActions.setOfficePhone(phoneFromProps);
    }

    // pinDraftId 없으면 여기서 끝
    if (pinDraftId == null || pinDraftId === "") return;

    const idNum = Number(pinDraftId);
    if (!Number.isFinite(idNum)) {
      return;
    }

    let aborted = false;

    (async () => {
      try {
        const draftRaw = await getPinDraftDetailOnce(idNum);
        if (aborted || !draftRaw) return;

        // 🔍 /pin-drafts/:id 응답이 { path, data } 또는 그냥 { ... } 둘 다 대응
        const anyDraft: any = draftRaw;
        const draft = anyDraft.data ?? anyDraft;

        const name = String(draft.name ?? "").trim();
        const phone = String(draft.contactMainPhone ?? "").trim();
        const phone2 = String((draft as { contactSubPhone?: string }).contactSubPhone ?? "").trim();
        const addressLine = String(
          draft.addressLine ?? draft.address ?? ""
        ).trim();

        if (name && typeof headerActions.setTitle === "function") {
          headerActions.setTitle(name);
        }

        if (phone && typeof basicActions.setOfficePhone === "function") {
          basicActions.setOfficePhone(phone);
        }

        if (phone2 && typeof basicActions.setOfficePhone2 === "function") {
          basicActions.setOfficePhone2(phone2);
        }

        if (addressLine && typeof basicActions.setAddress === "function") {
          basicActions.setAddress(addressLine);
        }
      } catch (err) {
        if (aborted) return;
        console.error("[useCreateForm] getPinDraftDetailOnce failed", err);
      }
    })();

    return () => {
      aborted = true;
    };
  }, [pinDraftId, draftHeaderPrefill, header.actions, basic.actions]);

  // ─────────────────────────────────────────────────────────
  // ① 기본 저장 가능 여부 (전체 검증용)
  // ─────────────────────────────────────────────────────────
  const { isSaveEnabled: rawIsSaveEnabled } = useCreateValidation({
    ...header.state,
    ...basic.state,
    ...nums.state,
    ...parking.state,
    ...grades.state,
    ...aspects.state,
    ...areas.state,
    ...units.state,
    ...opts.state,
  });

  const areaSetsCombined = useMemo(() => {
    const base = (areas.state as any)?.baseAreaSet;
    const extras = (areas.state as any)?.extraAreaSets;
    return [base, ...(Array.isArray(extras) ? extras : [])].filter(Boolean);
  }, [areas.state]);

  const areaGroups = useMemo(
    () => sanitizeAreaGroups(areaSetsCombined),
    [areaSetsCombined]
  );

  const getAreaGroups = useCallback(
    () => sanitizeAreaGroups(areaSetsCombined),
    [areaSetsCombined]
  );

  const noop = (() => {}) as any;
  const setIsNew =
    (grades.actions as any)?.setIsNew ??
    (grades.actions as any)?.set_isNew ??
    noop;
  const setIsOld =
    (grades.actions as any)?.setIsOld ??
    (grades.actions as any)?.set_isOld ??
    noop;

  const selectNew = useCallback(() => {
    setIsNew(true);
    setIsOld(false);
  }, [setIsNew, setIsOld]);

  const selectOld = useCallback(() => {
    setIsNew(false);
    setIsOld(true);
  }, [setIsNew, setIsOld]);

  const isSaveEnabled = rawIsSaveEnabled;

  return useMemo(() => {
    const noopLocal = (() => {}) as any;

    const buildingType = (basic.state as any).buildingType ?? null;
    const setBuildingType = (basic.actions as any).setBuildingType ?? noopLocal;

    const registrationTypeId =
      (parking.state as any).registrationTypeId ?? null;
    const setRegistrationTypeId =
      (parking.actions as any).setRegistrationTypeId ?? noopLocal;

    return {
      // actions
      ...header.actions,
      ...basic.actions,
      ...nums.actions,
      ...parking.actions,
      ...grades.actions,
      ...aspects.actions,
      ...areas.actions,
      ...units.actions,
      ...opts.actions,

      // state
      ...header.state,
      ...basic.state,
      ...nums.state,
      ...parking.state,
      ...grades.state,
      ...aspects.state,
      ...areas.state,
      ...units.state,
      ...opts.state,

      buildingType,
      setBuildingType,
      registrationTypeId,
      setRegistrationTypeId,

      areaSetsCombined,
      areaGroups,
      getAreaGroups,

      selectNew,
      selectOld,

      isSaveEnabled,
    };
  }, [
    header,
    basic,
    nums,
    parking,
    grades,
    aspects,
    areas,
    units,
    opts,
    areaSetsCombined,
    areaGroups,
    selectNew,
    selectOld,
    isSaveEnabled,
  ]);
}
