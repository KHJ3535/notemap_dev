import type { PinSearchResult } from "@/features/pins/types/pin-search";

// ======================
// 🚉 역 + 출구 파싱 관련
// ======================

// 역 + 출구 파싱
export function parseStationAndExit(qRaw: string) {
  const q = qRaw.trim().replace(/\s+/g, " ");
  const exitMatch = q.match(/(\d+)\s*번\s*출구/);
  const exitNo = exitMatch ? Number(exitMatch[1]) : null;
  const station = q
    .replace(/(\d+)\s*번\s*출구/g, "")
    .replace(/역/g, "")
    .trim();
  return { stationName: station, exitNo, hasExit: exitNo !== null, raw: q };
}

export const norm = (s: string) => (s || "").replace(/\s+/g, "");

// 역 후보 중 최적 역 선택
export function pickBestStation(data: any[], stationName: string) {
  const s = norm(stationName);
  const stations = data.filter((d) => d.category_group_code === "SW8");
  const cand = stations.length ? stations : data;
  return (
    cand.find((d) => norm(d.place_name) === norm(`${stationName}역`)) ||
    cand.find((d) => norm(d.place_name).includes(s)) ||
    cand[0]
  );
}

// 출구 번호 추출
export function extractExitNo(name: string): number | null {
  const n1 = name.match(/(\d+)\s*번\s*출구/);
  const n2 = name.match(/(\d+)\s*번출구/);
  const n3 = name.match(/[①②③④⑤⑥⑦⑧⑨⑩]/);
  if (n1) return Number(n1[1]);
  if (n2) return Number(n2[1]);
  if (n3) return "①②③④⑤⑥⑦⑧⑨⑩".indexOf(n3[0]) + 1;
  return null;
}

// 역 출구들 중에서 원하는 출구 스코어링해서 선택
export function pickBestExitStrict(
  data: any[],
  stationName: string,
  want?: number | null,
  stationLL?: kakao.maps.LatLng
) {
  if (!data?.length) return null;
  const n = (s: string) => (s || "").replace(/\s+/g, "");
  const sNorm = n(`${stationName}역`);

  const withStation = data.filter(
    (d) => /출구/.test(d.place_name) && n(d.place_name).includes(n(stationName))
  );
  const pool = withStation.length
    ? withStation
    : data.filter((d) => /출구/.test(d.place_name)) || data;

  const scored = pool.map((d) => {
    const no = extractExitNo(d.place_name);
    let score = 0;

    if (want != null && no === want) score += 1000;
    if (n(d.place_name).includes(sNorm)) score += 50;

    let dist = Number(d.distance ?? 999_999);
    if (isNaN(dist) && stationLL) {
      const dy = Math.abs(Number(d.y) - stationLL.getLat());
      const dx = Math.abs(Number(d.x) - stationLL.getLng());
      dist = Math.sqrt(dx * dx + dy * dy) * 111_000;
    }
    score += Math.max(0, 500 - Math.min(dist, 500));
    return { d, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.d ?? data[0];
}

// (지금은 안 쓰이면 제거해도 됨)
export function scorePlaceForSchool(item: any, keywordNorm: string) {
  const nameN = norm(item.place_name);
  const cat = (item.category_name || "").replace(/\s+/g, "");
  let s = 0;

  if (nameN === keywordNorm) s += 1000;
  if (nameN.startsWith(keywordNorm)) s += 400;
  if (nameN.includes(keywordNorm)) s += 150;

  if (/학교|대학교|캠퍼스|정문|본관/.test(item.place_name)) s += 300;
  if (/학교|대학교/.test(cat)) s += 250;

  if (/숲|산|등산|둘레길|산책로|야외|야영/.test(item.place_name)) s -= 500;
  if (/[로|길]$/.test(item.place_name)) s -= 300;

  const dist = Number(item.distance ?? 999_999);
  if (!isNaN(dist)) s += Math.max(0, 400 - Math.min(dist, 400));
  return s;
}

// 일반 장소 선택
export function pickBestPlace(
  data: any[],
  keyword: string,
  center?: kakao.maps.LatLng | null
) {
  if (!data?.length) return null;
  const kw = norm(keyword);

  const exact = data.find((d) => norm(d.place_name) === kw);
  if (exact) return exact;
  const starts = data.find((d) => norm(d.place_name).startsWith(kw));
  if (starts) return starts;
  const partial = data.find((d) => norm(d.place_name).includes(kw));
  if (partial) return partial;

  if (center) {
    const withDist = data
      .map((d) => ({ d, dist: Number(d.distance ?? Infinity) }))
      .sort((a, b) => a.dist - b.dist);
    if (withDist[0]?.d) return withDist[0].d;
  }
  return data[0];
}

// 검색 결과에 핀을 찍을지 여부
export function shouldCreateSearchPin(item: any, keyword: string) {
  const addr =
    item.road_address_name ||
    item.address_name ||
    item.address?.address_name ||
    "";
  const name = item.place_name || addr || keyword;

  const keywordNorm = (keyword || "").trim();
  const isExitQuery = /출구/.test(keywordNorm);
  const catCode = item.category_group_code || "";

  // 🔹 역 이름만 검색(출구 없이) → 핀 안 만들고 이동만
  if (!isExitQuery) {
    if (catCode === "SW8") return false;
    if (/역$/.test(name)) return false;
  }

  const bigRegionPattern = /(대한민국|청사|도청|시청|구청)$/;
  if (bigRegionPattern.test(name) || bigRegionPattern.test(addr)) {
    return false;
  }

  if (/^(.*(시|군|구))$/.test(name) && !/(동|읍|면|리)/.test(name)) {
    return false;
  }

  if (item.category_group_code) return true;

  return true;
}

// ======================
// 🧭 핀 검색 결과 → 서버 포맷
// ======================

export function toServerPointsFromPins(
  pins: NonNullable<PinSearchResult["pins"]>
) {
  return pins.map((p) => {
    const displayName = (p.name ?? "").trim();

    return {
      id: String(p.id),
      name: displayName,
      title: displayName,
      lat: p.lat,
      lng: p.lng,
      badge: p.badge ?? null,
      ageType: p.ageType ?? null,
    };
  });
}

export function toServerDraftsFromDrafts(
  drafts: NonNullable<PinSearchResult["drafts"]>
) {
  return drafts.map((d) => {
    const name = (d.name ?? "").trim();
    const title = (d.title ?? "").trim();
    const label = name || title || "답사예정";

    return {
      id: d.id,
      name: label,
      title: title || label,
      lat: d.lat,
      lng: d.lng,
      draftState: (d as any).draftState,
      badge: d.badge ?? null,
    };
  });
}

// 🔍 searchPins 결과 기준으로 지도 bounds 맞추기
export function fitSearchResultToBounds(args: {
  kakaoSDK: any;
  mapInstance: any;
  res: PinSearchResult;
}) {
  const { kakaoSDK, mapInstance, res } = args;
  if (!kakaoSDK || !mapInstance) return;

  const coords = [
    ...(res.pins ?? []).map((p) => ({ lat: p.lat, lng: p.lng })),
    ...(res.drafts ?? []).map((d) => ({ lat: d.lat, lng: d.lng })),
  ];
  if (!coords.length) return;

  const bounds = new kakaoSDK.maps.LatLngBounds();
  coords.forEach((c) => bounds.extend(new kakaoSDK.maps.LatLng(c.lat, c.lng)));

  try {
    mapInstance.setBounds(bounds);
  } catch {
    // noop
  }
}
