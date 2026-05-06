export type RepoSnapshot = {
  rank: number;
  owner: string;
  repo: string;
  url: string;
  stars_gained: number | null;
};

export type Mover = {
  owner: string;
  repo: string;
  url: string;
  todayRank: number | null;
  yesterdayRank: number | null;
  rankDelta: number | null; // positive = moved up (rank number decreased)
  starsGained: number | null;
};

export type MoversReport = {
  newEntries: Mover[];
  risers: Mover[];
  fallers: Mover[];
  dropped: Mover[];
};

const key = (r: { owner: string; repo: string }) => `${r.owner}/${r.repo}`;

export function computeMovers(
  today: RepoSnapshot[],
  yesterday: RepoSnapshot[],
): MoversReport {
  const yMap = new Map(yesterday.map((r) => [key(r), r]));
  const tMap = new Map(today.map((r) => [key(r), r]));

  const newEntries: Mover[] = [];
  const risers: Mover[] = [];
  const fallers: Mover[] = [];
  const dropped: Mover[] = [];

  for (const t of today) {
    const y = yMap.get(key(t));
    if (!y) {
      newEntries.push({
        owner: t.owner,
        repo: t.repo,
        url: t.url,
        todayRank: t.rank,
        yesterdayRank: null,
        rankDelta: null,
        starsGained: t.stars_gained,
      });
    } else if (y.rank !== t.rank) {
      const delta = y.rank - t.rank; // positive = improved
      const m: Mover = {
        owner: t.owner,
        repo: t.repo,
        url: t.url,
        todayRank: t.rank,
        yesterdayRank: y.rank,
        rankDelta: delta,
        starsGained: t.stars_gained,
      };
      if (delta > 0) risers.push(m);
      else fallers.push(m);
    }
  }

  for (const y of yesterday) {
    if (!tMap.has(key(y))) {
      dropped.push({
        owner: y.owner,
        repo: y.repo,
        url: y.url,
        todayRank: null,
        yesterdayRank: y.rank,
        rankDelta: null,
        starsGained: null,
      });
    }
  }

  newEntries.sort((a, b) => (a.todayRank ?? 99) - (b.todayRank ?? 99));
  risers.sort((a, b) => (b.rankDelta ?? 0) - (a.rankDelta ?? 0));
  fallers.sort((a, b) => (a.rankDelta ?? 0) - (b.rankDelta ?? 0));
  dropped.sort((a, b) => (a.yesterdayRank ?? 99) - (b.yesterdayRank ?? 99));

  return { newEntries, risers, fallers, dropped };
}
