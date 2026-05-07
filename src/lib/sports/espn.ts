// ESPN Hidden JSON API — no auth required, comprehensive coverage

export interface ESPNGame {
  id: string
  name: string
  date: string
  status: { type: { completed: boolean; name: string } }
  competitions: Array<{
    competitors: Array<{
      id: string
      team: { id: string; name: string; displayName: string; abbreviation: string }
      score: string
      winner: boolean
    }>
  }>
}

const LEAGUES = [
  { sport: "football",   league: "nfl",                    label: "NFL" },
  { sport: "basketball", league: "nba",                    label: "NBA" },
  { sport: "baseball",   league: "mlb",                    label: "MLB" },
  { sport: "hockey",     league: "nhl",                    label: "NHL" },
  { sport: "soccer",     league: "usa.1",                  label: "MLS" },
  { sport: "football",   league: "college-football",        label: "CFB" },
  { sport: "basketball", league: "mens-college-basketball", label: "CBB" },
] as const

export async function fetchCompletedGames(dateStr?: string): Promise<{
  sport: string; league: string; label: string;
  homeTeamName: string; homeTeamId: string; awayTeamName: string; awayTeamId: string;
  homeScore: number; awayScore: number; winnerTeamId: string; winnerTeamName: string;
  gameDate: string; espnEventId: string;
}[]> {
  const today = dateStr ?? new Date().toISOString().split("T")[0].replace(/-/g, "")
  const results: any[] = []

  for (const { sport, league, label } of LEAGUES) {
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/${sport}/${league}/scoreboard?dates=${today}`
      const res = await fetch(url, { next: { revalidate: 0 } })
      if (!res.ok) continue

      const data = await res.json()
      const events: ESPNGame[] = data.events ?? []

      for (const event of events) {
        if (!event.status?.type?.completed) continue

        const comp = event.competitions?.[0]
        if (!comp?.competitors?.length) continue

        const [team1, team2] = comp.competitors as any[]
        const home = team1.homeAway === "home" ? team1 : team2
        const away = team1.homeAway === "away" ? team1 : team2
        const winner = comp.competitors.find(c => c.winner)

        results.push({
          sport: label, league,
          homeTeamName: home.team.displayName,
          homeTeamId: home.team.id,
          awayTeamName: away.team.displayName,
          awayTeamId: away.team.id,
          homeScore: parseInt(home.score ?? "0"),
          awayScore: parseInt(away.score ?? "0"),
          winnerTeamId: winner?.team.id ?? "",
          winnerTeamName: winner?.team.displayName ?? "",
          gameDate: event.date.split("T")[0],
          espnEventId: event.id,
        })
      }
    } catch (e) {
      console.error(`ESPN fetch failed for ${league}:`, e)
    }
  }

  return results
}
