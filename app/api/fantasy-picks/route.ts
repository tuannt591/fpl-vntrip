import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get('teamId');
  const eventId = searchParams.get('eventId');

  if (!teamId || !eventId) {
    return NextResponse.json(
      { error: 'Missing teamId or eventId parameter' },
      { status: 400 }
    );
  }

  try {
    const url = `https://fantasy.premierleague.com/api/entry/${teamId}/event/${eventId}/picks/`;

    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        Accept: 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching picks data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch picks data' },
      { status: 500 }
    );
  }
}
