import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Dice6, Calendar, User, BarChart3, Activity } from 'lucide-react';

// TypeScript interfaces
interface GameData {
  game_id: number;
  start_time: string;
  end_time: string;
  turns: number;
  victory_points: number;
  roads_built: number;
  settlements_built: number;
  cities_built: number;
  longest_road: boolean;
  largest_army: boolean;
  won: boolean;
}

interface StatsData {
  total_games: number;
  wins: number;
  losses: number;
  win_rate: number;
  average_victory_points: number;
  average_roads: number;
  average_settlements: number;
  average_cities: number;
  longest_road_awards: number;
  largest_army_awards: number;
}

interface Player {
  user_id: number;
  username: string;
  total_games: number;
  wins: number;
  win_rate: number;
  avg_points: number;
}

interface GlobalStats {
  total_games: number;
  total_players: number;
  total_game_sessions: number;
  leaderboard: Player[];
}

const CatanStatsDashboard = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const PLAYER_ID = 2; // Maria (gracz nr 2)
  const API_BASE = 'http://localhost:8000/api';

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Pobierz statystyki gracza
      const statsResponse = await fetch(`${API_BASE}/users/${PLAYER_ID}/statistics/`);
      const statsData = await statsResponse.json();
      
      // Pobierz gry gracza
      const gamesResponse = await fetch(`${API_BASE}/users/${PLAYER_ID}/games/`);
      const gamesData = await gamesResponse.json();
      
      // Pobierz globalne statystyki
      const globalResponse = await fetch(`${API_BASE}/stats/global_stats/`);
      const globalData = await globalResponse.json();
      
      setStats(statsData);
      setGames(gamesData);
      setGlobalStats(globalData);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      setError('Błąd podczas pobierania danych: ' + errorMessage);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Simple bar chart component
  const SimpleBarChart = ({ data, title, color = '#4ECDC4' }: { data: Array<{label: string, value: number}>, title: string, color?: string }) => {
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        <div className="space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-20 text-sm text-gray-600">{item.label}</div>
              <div className="flex-1 mx-3">
                <div className="bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className="h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ 
                      width: `${(item.value / maxValue) * 100}%`,
                      backgroundColor: color 
                    }}
                  >
                    <span className="text-white text-xs font-medium">{item.value}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Simple line chart component
  const SimpleLineChart = ({ data, title }: { data: Array<{x: number, y: number, won?: boolean}>, title: string }) => {
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const range = maxY - minY || 1;
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        <div className="relative h-64 bg-gray-50 rounded">
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {/* Grid lines */}
            {[0, 1, 2, 3, 4].map(i => (
              <line key={i} x1="0" y1={i * 40} x2="400" y2={i * 40} stroke="#e5e7eb" strokeWidth="1"/>
            ))}
            
            {/* Data line */}
            <polyline
              fill="none"
              stroke="#8884d8"
              strokeWidth="2"
              points={data.map((point, index) => 
                `${(index / (data.length - 1)) * 380 + 10},${190 - ((point.y - minY) / range) * 180}`
              ).join(' ')}
            />
            
            {/* Data points */}
            {data.map((point, index) => (
              <circle
                key={index}
                cx={(index / (data.length - 1)) * 380 + 10}
                cy={190 - ((point.y - minY) / range) * 180}
                r="4"
                fill={point.won ? '#4ECDC4' : '#FF6B6B'}
                stroke="white"
                strokeWidth="2"
              />
            ))}
          </svg>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          🟢 Wygrana | 🔴 Przegrana
        </p>
      </div>
    );
  };

  // Pie chart component
  const SimplePieChart = ({ data, title }: { data: Array<{name: string, value: number, color: string}>, title: string }) => {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let currentAngle = 0;
    
    return (
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{title}</h3>
        <div className="flex items-center justify-center">
          <svg className="w-48 h-48" viewBox="0 0 200 200">
            {data.map((slice, index) => {
              const sliceAngle = (slice.value / total) * 360;
              const startAngle = currentAngle;
              const endAngle = currentAngle + sliceAngle;
              currentAngle += sliceAngle;
              
              const x1 = 100 + 80 * Math.cos((startAngle - 90) * Math.PI / 180);
              const y1 = 100 + 80 * Math.sin((startAngle - 90) * Math.PI / 180);
              const x2 = 100 + 80 * Math.cos((endAngle - 90) * Math.PI / 180);
              const y2 = 100 + 80 * Math.sin((endAngle - 90) * Math.PI / 180);
              
              const largeArcFlag = sliceAngle > 180 ? 1 : 0;
              
              return (
                <g key={index}>
                  <path
                    d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={slice.color}
                    stroke="white"
                    strokeWidth="2"
                  />
                </g>
              );
            })}
          </svg>
        </div>
        <div className="mt-4 space-y-2">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center">
                <div 
                  className="w-4 h-4 rounded mr-2" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm">{item.name}</span>
              </div>
              <span className="font-medium">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-amber-800 text-lg">Ładowanie statystyk...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-lg max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Błąd!</h2>
          <p className="text-red-700 mb-4">{error}</p>
          <button 
            onClick={fetchAllData}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  // Prepare chart data
  const pointsTrend = games.map((game, index) => ({
    x: index + 1,
    y: game.victory_points,
    won: game.won
  })).reverse();

  const pointsDistribution = games.reduce((acc: {[key: number]: number}, game) => {
    acc[game.victory_points] = (acc[game.victory_points] || 0) + 1;
    return acc;
  }, {});

  const pointsChart = Object.entries(pointsDistribution).map(([points, count]) => ({
    label: `${points} pkt`,
    value: count as number
  })).sort((a, b) => parseInt(a.label) - parseInt(b.label));

  const buildingsData = [
    { label: 'Drogi', value: Math.round(stats?.average_roads || 0) },
    { label: 'Osady', value: Math.round(stats?.average_settlements || 0) },
    { label: 'Miasta', value: Math.round(stats?.average_cities || 0) }
  ];

  const winLossData = [
    { name: 'Wygrane', value: stats?.wins || 0, color: '#4ECDC4' },
    { name: 'Przegrane', value: stats?.losses || 0, color: '#FF6B6B' }
  ];

  const monthlyActivity = games.reduce((acc: {[key: string]: number}, game) => {
    const date = new Date(game.start_time);
    const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthKey] = (acc[monthKey] || 0) + 1;
    return acc;
  }, {});

  const activityChart = Object.entries(monthlyActivity).map(([month, count]) => ({
    label: month,
    value: count as number
  })).sort();

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-orange-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-amber-900 mb-2">Statystyki Catan</h1>
          <p className="text-amber-700 text-lg">Analiza rozgrywek gracza: Maria</p>
        </div>

        {/* Główne statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-green-500">
            <Trophy className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-green-600">{stats?.win_rate?.toFixed(1)}%</h3>
            <p className="text-gray-600">Procent wygranych</p>
            <p className="text-sm text-gray-500">{stats?.wins}/{stats?.total_games} gier</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-blue-500">
            <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-blue-600">{stats?.average_victory_points?.toFixed(1)}</h3>
            <p className="text-gray-600">Średnie punkty</p>
            <p className="text-sm text-gray-500">na grę</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-purple-500">
            <Dice6 className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-purple-600">{stats?.total_games}</h3>
            <p className="text-gray-600">Rozegranych gier</p>
            <p className="text-sm text-gray-500">w sumie</p>
          </div>
          
          <div className="bg-white rounded-lg shadow-lg p-6 text-center border-l-4 border-orange-500">
            <TrendingUp className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <h3 className="text-2xl font-bold text-orange-600">{(stats?.longest_road_awards || 0) + (stats?.largest_army_awards || 0)}</h3>
            <p className="text-gray-600">Bonusy zdobyte</p>
            <p className="text-sm text-gray-500">droga + armia</p>
          </div>
        </div>

        {/* Wykresy */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <SimpleLineChart 
            data={pointsTrend} 
            title="Trend punktów w czasie" 
          />
          
          <SimpleBarChart 
            data={pointsChart} 
            title="Rozkład końcowych punktów"
            color="#FFB347"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <SimplePieChart 
            data={winLossData} 
            title="Bilans wygranych" 
          />

          <SimpleBarChart 
            data={buildingsData} 
            title="Średnie budynki na grę"
            color="#DAA520"
          />

          <SimpleBarChart 
            data={activityChart} 
            title="Aktywność miesięczna"
            color="#4ECDC4"
          />
        </div>

        {/* Ranking globalny */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📊 Analiza umiejętności</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>🎯 Średnie punkty</span>
                <span className="font-bold text-blue-600">{stats?.average_victory_points?.toFixed(1)}/10</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>🛣️ Średnie drogi</span>
                <span className="font-bold text-green-600">{stats?.average_roads?.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>🏘️ Średnie osady</span>
                <span className="font-bold text-yellow-600">{stats?.average_settlements?.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>🏰 Średnie miasta</span>
                <span className="font-bold text-red-600">{stats?.average_cities?.toFixed(1)}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <span>🏆 Procent wygranych</span>
                <span className="font-bold text-purple-600">{stats?.win_rate?.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-bold text-gray-800 mb-4">🏆 Ranking graczy</h3>
            <div className="space-y-3">
              {globalStats?.leaderboard?.slice(0, 5).map((player: Player, index: number) => (
                <div 
                  key={player.user_id} 
                  className={`flex items-center justify-between p-3 rounded ${
                    player.user_id === PLAYER_ID 
                      ? 'bg-amber-100 border-2 border-amber-400' 
                      : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className={`font-bold text-lg ${
                      index === 0 ? 'text-yellow-600' :
                      index === 1 ? 'text-gray-600' :
                      index === 2 ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="font-medium">{player.username}</span>
                    {player.user_id === PLAYER_ID && (
                      <span className="bg-amber-500 text-white px-2 py-1 rounded text-xs">TY</span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-green-600">{player.win_rate}%</div>
                    <div className="text-sm text-gray-500">{player.wins}/{player.total_games}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Historia ostatnich gier */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">📅 Ostatnie gry</h3>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">Data</th>
                  <th className="px-4 py-2 text-left">Punkty</th>
                  <th className="px-4 py-2 text-left">Wynik</th>
                  <th className="px-4 py-2 text-left">Drogi</th>
                  <th className="px-4 py-2 text-left">Osady</th>
                  <th className="px-4 py-2 text-left">Miasta</th>
                  <th className="px-4 py-2 text-left">Bonusy</th>
                </tr>
              </thead>
              <tbody>
                {games?.slice(0, 8).map((game: GameData, index: number) => (
                  <tr key={index} className={`border-b ${game.won ? 'bg-green-50' : 'bg-red-50'}`}>
                    <td className="px-4 py-2">
                      {new Date(game.start_time).toLocaleDateString('pl-PL')}
                    </td>
                    <td className="px-4 py-2 font-bold">{game.victory_points}</td>
                    <td className="px-4 py-2">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        game.won 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {game.won ? 'WYGRANA' : 'PRZEGRANA'}
                      </span>
                    </td>
                    <td className="px-4 py-2">{game.roads_built}</td>
                    <td className="px-4 py-2">{game.settlements_built}</td>
                    <td className="px-4 py-2">{game.cities_built}</td>
                    <td className="px-4 py-2">
                      <div className="flex space-x-1">
                        {game.longest_road && (
                          <span className="bg-blue-100 text-blue-800 px-1 py-1 rounded text-xs">🛣️</span>
                        )}
                        {game.largest_army && (
                          <span className="bg-purple-100 text-purple-800 px-1 py-1 rounded text-xs">⚔️</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatanStatsDashboard;
