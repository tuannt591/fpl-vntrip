import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fantasy Premier League không có API standings riêng
    // Thay vào đó ta lấy thông tin teams từ bootstrap-static và tính standings
    const url = 'https://fantasy.premierleague.com/api/bootstrap-static/';

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Trả về thông tin teams với các stats cơ bản
    const teamsWithStats = data.teams.map((team: any, index: number) => ({
      position: index + 1, // Tạm thời sắp xếp theo thứ tự alphabet
      team: {
        id: team.id,
        name: team.name,
        short_name: team.short_name,
        crest: '',
      },
      playedGames: team.played || 0,
      won: team.win || 0,
      draw: team.draw || 0,
      lost: team.loss || 0,
      points: team.points || 0,
      goalsFor: 0, // Không có trong API FPL
      goalsAgainst: 0, // Không có trong API FPL
      goalDifference: 0,
      strength: team.strength || 0,
      form: team.form || null,
    }));

    return NextResponse.json(teamsWithStats);
  } catch (error) {
    console.error('Error fetching standings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch standings data' },
      { status: 500 }
    );
  }
}
