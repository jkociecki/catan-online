import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Dice6, Calendar, User, BarChart3, Activity, ChevronDown, ChevronRight, Gamepad2, Users, Clock, Award } from 'lucide-react';
import NavBar from '../navigation/NavigationBar';
import { useAuth } from '../context/AuthContext';

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

interface GameDetails {
  game_info: {
    id: number;
    start_time: string;
    end_time: string;
    turns: number;
    dice_distribution: { [key: string]: number };
  };
  players: Array<{
    user_id: number;
    username: string;
    victory_points: number;
    roads_built: number;
    settlements_built: number;
    cities_built: number;
    longest_road: boolean;
    largest_army: boolean;
    resources: { [key: string]: number };
    won: boolean;
  }>;
}

const CatanStatsDashboard = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedGame, setExpandedGame] = useState<number | null>(null);
  const [gameDetails, setGameDetails] = useState<{ [key: number]: GameDetails }>({});
  const { user, token } = useAuth();

  const API_BASE = `${process.env.REACT_APP_API_URL}/api`;

  useEffect(() => {
    if (user?.id) {
      fetchAllData();
    }
  }, [user]);

  const fetchAllData = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      
      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      };
      
      const [statsResponse, gamesResponse, globalResponse] = await Promise.all([
        fetch(`${API_BASE}/users/${user.id}/statistics/`, { headers }),
        fetch(`${API_BASE}/users/${user.id}/games/`, { headers }),
        fetch(`${API_BASE}/stats/global_stats/`)  // Global stats are public
      ]);

      if (!statsResponse.ok || !gamesResponse.ok || !globalResponse.ok) {
        throw new Error('Błąd pobierania danych');
      }

      const [statsData, gamesData, globalData] = await Promise.all([
        statsResponse.json(),
        gamesResponse.json(),
        globalResponse.json()
      ]);
      
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

  const fetchGameDetails = async (gameId: number) => {
    try {
      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      };
      
      const response = await fetch(`${API_BASE}/games/${gameId}/players/`, { headers });
      if (!response.ok) throw new Error('Błąd pobierania szczegółów gry');
      
      const details = await response.json();
      setGameDetails(prev => ({ ...prev, [gameId]: details }));
    } catch (err) {
      console.error('Error fetching game details:', err);
    }
  };

  const toggleGameExpansion = (gameId: number) => {
    if (expandedGame === gameId) {
      setExpandedGame(null);
    } else {
      setExpandedGame(gameId);
      if (!gameDetails[gameId]) {
        fetchGameDetails(gameId);
      }
    }
  };

  // Simple charts components remain the same but with updated styling
  const SimpleBarChart = ({ data, title, color = '#6366f1' }: { data: Array<{label: string, value: number}>, title: string, color?: string }) => {
    if (!data || data.length === 0) return null;
    
    const maxValue = Math.max(...data.map(d => d.value));
    
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-indigo-600" />
          {title}
        </h3>
        <div className="space-y-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center">
              <div className="w-24 text-sm text-gray-600 flex-shrink-0 font-medium">{item.label}</div>
              <div className="flex-1 mx-4">
                <div className="bg-gray-100 rounded-full h-8 relative overflow-hidden">
                  <div 
                    className="h-8 rounded-full flex items-center justify-end pr-3 transition-all duration-700 ease-out"
                    style={{ 
                      width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                      background: `linear-gradient(135deg, ${color}, ${color}aa)`
                    }}
                  >
                    <span className="text-white text-sm font-semibold">{item.value}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SimpleLineChart = ({ data, title }: { data: Array<{x: number, y: number, won?: boolean}>, title: string }) => {
    if (!data || data.length === 0) return null;
    
    const maxY = Math.max(...data.map(d => d.y));
    const minY = Math.min(...data.map(d => d.y));
    const range = maxY - minY || 1;
    
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-indigo-600" />
          {title}
        </h3>
        <div className="relative h-64 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6">
          <svg className="w-full h-full" viewBox="0 0 400 200">
            {[0, 1, 2, 3, 4].map(i => (
              <line key={i} x1="0" y1={i * 40} x2="400" y2={i * 40} stroke="#e5e7eb" strokeWidth="1"/>
            ))}
            
            {[0, 1, 2, 3, 4].map(i => {
              const value = Math.round(minY + (range * (4 - i) / 4));
              return (
                <text key={i} x="5" y={i * 40 + 5} fontSize="10" fill="#6b7280" className="font-medium">
                  {value}
                </text>
              );
            })}
            
            {data.length > 1 && (
              <polyline
                fill="none"
                stroke="url(#lineGradient)"
                strokeWidth="3"
                points={data.map((point, index) => 
                  `${(index / (data.length - 1)) * 380 + 20},${190 - ((point.y - minY) / range) * 180}`
                ).join(' ')}
              />
            )}
            
            {data.map((point, index) => (
              <circle
                key={index}
                cx={(index / Math.max(1, data.length - 1)) * 380 + 20}
                cy={190 - ((point.y - minY) / range) * 180}
                r="5"
                fill={point.won ? '#10b981' : '#ef4444'}
                stroke="white"
                strokeWidth="3"
                className="drop-shadow-sm"
              />
            ))}
            
            <defs>
              <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#6366f1" />
                <stop offset="100%" stopColor="#8b5cf6" />
              </linearGradient>
            </defs>
          </svg>
        </div>
        <p className="text-sm text-gray-500 mt-4 flex items-center gap-4">
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-green-500"></div>
            Wygrana
          </span>
          <span className="flex items-center gap-1">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            Przegrana
          </span>
        </p>
      </div>
    );
  };

  const SimplePieChart = ({ data, title }: { data: Array<{name: string, value: number, color: string}>, title: string }) => {
    if (!data || data.length === 0) return null;
    
    const total = data.reduce((sum, item) => sum + item.value, 0);
    if (total === 0) return null;
    
    let currentAngle = 0;
    
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Target className="h-5 w-5 text-indigo-600" />
          {title}
        </h3>
        <div className="flex items-center justify-center">
          <div className="relative">
            <svg className="w-48 h-48 drop-shadow-lg" viewBox="0 0 200 200">
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
                  <path
                    key={index}
                    d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArcFlag} 1 ${x2} ${y2} Z`}
                    fill={slice.color}
                    stroke="white"
                    strokeWidth="3"
                    className="hover:opacity-80 transition-opacity duration-200"
                  />
                );
              })}
            </svg>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          {data.map((item, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full shadow-sm" 
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="font-medium text-gray-700">{item.name}</span>
              </div>
              <span className="font-bold text-gray-800">{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderLeaderboard = () => {
    if (!globalStats?.leaderboard) return null;

    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-indigo-600" />
          Ranking Graczy
        </h3>
        <div className="space-y-4">
          {globalStats.leaderboard.map((player, index) => (
            <div
              key={player.user_id}
              className={`flex items-center justify-between p-4 rounded-xl transition-all duration-300 ${
                player.user_id === user?.id
                  ? 'bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-400 shadow-lg transform scale-105'
                  : 'bg-gray-50/80 hover:bg-gray-100/80'
              }`}
            >
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold">
                  {index + 1}
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-800">{player.username}</span>
                  {player.user_id === user?.id && (
                    <span className="bg-amber-500 text-white px-2 py-1 rounded-full text-xs font-medium">TY</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-sm text-gray-500">Wygrane</div>
                  <div className="font-bold text-indigo-600">{player.wins}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">% Wygranych</div>
                  <div className="font-bold text-indigo-600">{player.win_rate}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-500">Śr. Punkty</div>
                  <div className="font-bold text-indigo-600">{player.avg_points}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="relative">
            <div className="animate-spin rounded-full h-20 w-20 border-4 border-indigo-200 border-t-indigo-600 mx-auto mb-6"></div>
            <Dice6 className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 h-8 w-8 text-indigo-600" />
          </div>
          <p className="text-indigo-800 text-xl font-medium">Ładowanie statystyk...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl max-w-md">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Błąd!</h2>
          <p className="text-red-700 mb-6">{error}</p>
          <button 
            onClick={fetchAllData}
            className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
          >
            Spróbuj ponownie
          </button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 text-xl">Brak danych do wyświetlenia</p>
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
    { label: 'Drogi', value: Math.round(stats.average_roads || 0) },
    { label: 'Osady', value: Math.round(stats.average_settlements || 0) },
    { label: 'Miasta', value: Math.round(stats.average_cities || 0) }
  ];

  const winLossData = [
    { name: 'Wygrane', value: stats.wins || 0, color: '#10b981' },
    { name: 'Przegrane', value: stats.losses || 0, color: '#ef4444' }
  ];

  const DiceDistributionChart = ({ distribution }: { distribution: { [key: string]: number } }) => {
    const diceData = Object.entries(distribution).map(([dice, count]) => ({
      label: dice,
      value: count
    })).sort((a, b) => parseInt(a.label) - parseInt(b.label));

    const maxCount = Math.max(...diceData.map(d => d.value));

    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
        <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <Dice6 className="h-4 w-4 text-blue-600" />
          Rozkład rzutów kostką
        </h4>
        <div className="grid grid-cols-6 gap-2">
          {diceData.map((item) => (
            <div key={item.label} className="text-center">
              <div 
                className="bg-blue-600 rounded mx-auto mb-1 transition-all duration-300"
                style={{ 
                  height: `${maxCount > 0 ? (item.value / maxCount) * 40 + 8 : 8}px`,
                  width: '16px'
                }}
              ></div>
              <div className="text-xs font-medium text-gray-600">{item.label}</div>
              <div className="text-xs text-gray-500">{item.value}</div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      

      <NavBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Główne statystyki */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <Trophy className="h-10 w-10 mb-4 opacity-90" />
            <h3 className="text-3xl font-bold mb-1">{stats.win_rate?.toFixed(1)}%</h3>
            <p className="text-green-100 font-medium">Procent wygranych</p>
            <p className="text-green-200 text-sm mt-1">{stats.wins}/{stats.total_games} gier</p>
          </div>
          
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <Target className="h-10 w-10 mb-4 opacity-90" />
            <h3 className="text-3xl font-bold mb-1">{stats.average_victory_points?.toFixed(1)}</h3>
            <p className="text-blue-100 font-medium">Średnie punkty</p>
            <p className="text-blue-200 text-sm mt-1">na grę</p>
          </div>
          
          <div className="bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <Gamepad2 className="h-10 w-10 mb-4 opacity-90" />
            <h3 className="text-3xl font-bold mb-1">{stats.total_games}</h3>
            <p className="text-purple-100 font-medium">Rozegranych gier</p>
            <p className="text-purple-200 text-sm mt-1">w sumie</p>
          </div>
          
          <div className="bg-gradient-to-br from-orange-500 to-red-500 rounded-2xl shadow-xl p-6 text-white transform hover:scale-105 transition-all duration-300">
            <Award className="h-10 w-10 mb-4 opacity-90" />
            <h3 className="text-3xl font-bold mb-1">{(stats.longest_road_awards || 0) + (stats.largest_army_awards || 0)}</h3>
            <p className="text-orange-100 font-medium">Bonusy zdobyte</p>
            <p className="text-orange-200 text-sm mt-1">droga + armia</p>
          </div>
        </div>

        {/* Performance Section */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Activity className="h-6 w-6 text-indigo-600" />
            Analiza wydajności
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <SimpleLineChart 
              data={pointsTrend} 
              title="Trend punktów w czasie" 
            />
            
            <SimpleBarChart 
              data={pointsChart} 
              title="Rozkład końcowych punktów"
              color="#8b5cf6"
            />
          </div>
        </div>

        {/* Strategy Analysis */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-indigo-600" />
            Analiza strategii
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <SimplePieChart 
              data={winLossData} 
              title="Bilans wygranych" 
            />

            <SimpleBarChart 
              data={buildingsData} 
              title="Średnie budynki na grę"
              color="#f59e0b"
            />

            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Trophy className="h-5 w-5 text-indigo-600" />
                Szczegółowe statystyki
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <span className="font-medium text-gray-700">🎯 Średnie punkty</span>
                  <span className="font-bold text-blue-600">{stats.average_victory_points?.toFixed(1)}/10</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl">
                  <span className="font-medium text-gray-700">🛣️ Średnie drogi</span>
                  <span className="font-bold text-green-600">{stats.average_roads?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-xl">
                  <span className="font-medium text-gray-700">🏘️ Średnie osady</span>
                  <span className="font-bold text-yellow-600">{stats.average_settlements?.toFixed(1)}</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-gradient-to-r from-red-50 to-pink-50 rounded-xl">
                  <span className="font-medium text-gray-700">🏰 Średnie miasta</span>
                  <span className="font-bold text-red-600">{stats.average_cities?.toFixed(1)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Ranking graczy
          </h2>
          {renderLeaderboard()}
        </div>

        {/* Historia gier */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            Historia gier
          </h2>
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
            <div className="space-y-0">
              {games?.slice(0, 10).map((game: GameData, index: number) => (
                <div key={index}>
                  <div 
                    className={`p-6 cursor-pointer transition-all duration-300 border-b border-gray-100/50 hover:bg-gray-50/50 ${
                      game.won ? 'bg-gradient-to-r from-green-50/50 to-emerald-50/50' : 'bg-gradient-to-r from-red-50/50 to-pink-50/50'
                    }`}
                    onClick={() => toggleGameExpansion(game.game_id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center gap-2">
                          {expandedGame === game.game_id ? 
                            <ChevronDown className="h-5 w-5 text-gray-500" /> : 
                            <ChevronRight className="h-5 w-5 text-gray-500" />
                          }
                          <Clock className="h-4 w-4 text-gray-400" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-800">
                            {new Date(game.start_time).toLocaleDateString('pl-PL', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric'
                            })}
                          </div>
                          <div className="text-sm text-gray-500">
                            Gra #{game.game_id} • {game.turns} tur
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-6">
                        <div className="text-center">
                          <div className="text-2xl font-bold text-indigo-600">{game.victory_points}</div>
                          <div className="text-xs text-gray-500">punktów</div>
                        </div>
                        
                        <div className="flex space-x-2">
                          <div className="text-center bg-blue-100 rounded-lg px-3 py-2">
                            <div className="font-semibold text-blue-800">{game.roads_built}</div>
                            <div className="text-xs text-blue-600">drogi</div>
                          </div>
                          <div className="text-center bg-green-100 rounded-lg px-3 py-2">
                            <div className="font-semibold text-green-800">{game.settlements_built}</div>
                            <div className="text-xs text-green-600">osady</div>
                          </div>
                          <div className="text-center bg-orange-100 rounded-lg px-3 py-2">
                            <div className="font-semibold text-orange-800">{game.cities_built}</div>
                            <div className="text-xs text-orange-600">miasta</div>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {game.longest_road && (
                            <div className="bg-blue-500 text-white p-2 rounded-lg" title="Najdłuższa droga">
                              🛣️
                            </div>
                          )}
                          {game.largest_army && (
                            <div className="bg-purple-500 text-white p-2 rounded-lg" title="Największa armia">
                              ⚔️
                            </div>
                          )}
                        </div>
                        
                        <div>
                          <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
                            game.won 
                              ? 'bg-green-500 text-white shadow-lg' 
                              : 'bg-red-500 text-white shadow-lg'
                          }`}>
                            {game.won ? 'WYGRANA' : 'PRZEGRANA'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded game details */}
                  {expandedGame === game.game_id && (
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 border-t border-gray-200/50">
                      {gameDetails[game.game_id] ? (
                        <div className="space-y-6">
                          {/* Game info */}
                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                Informacje o grze
                              </h4>
                              <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Rozpoczęcie:</span>
                                  <span className="font-medium">
                                    {new Date(gameDetails[game.game_id].game_info.start_time).toLocaleString('pl-PL')}
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Zakończenie:</span>
                                  <span className="font-medium">
                                    {gameDetails[game.game_id].game_info.end_time ? 
                                      new Date(gameDetails[game.game_id].game_info.end_time).toLocaleString('pl-PL') : 
                                      'W trakcie'
                                    }
                                  </span>
                                </div>
                                <div className="flex justify-between">
                                  <span className="text-gray-600">Liczba tur:</span>
                                  <span className="font-medium">{gameDetails[game.game_id].game_info.turns}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Dice distribution */}
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                              <DiceDistributionChart distribution={gameDetails[game.game_id].game_info.dice_distribution} />
                            </div>
                            
                            {/* Player rankings */}
                            <div className="bg-white rounded-xl p-4 shadow-sm">
                              <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                                <Trophy className="h-4 w-4 text-yellow-600" />
                                Ranking graczy
                              </h4>
                              <div className="space-y-2">
                                {gameDetails[game.game_id].players.map((player, playerIndex) => (
                                  <div 
                                    key={player.user_id}
                                    className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                                      player.user_id === user?.id 
                                        ? 'bg-amber-100 border border-amber-300' 
                                        : 'bg-gray-50'
                                    }`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                        playerIndex === 0 ? 'bg-yellow-500 text-white' :
                                        playerIndex === 1 ? 'bg-gray-400 text-white' :
                                        playerIndex === 2 ? 'bg-orange-500 text-white' :
                                        'bg-gray-300 text-gray-700'
                                      }`}>
                                        {playerIndex + 1}
                                      </span>
                                      <span className="font-medium">{player.username}</span>
                                      {player.user_id === user?.id && (
                                        <span className="text-xs bg-amber-500 text-white px-1 rounded">TY</span>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-indigo-600">{player.victory_points} pkt</span>
                                      {player.longest_road && <span className="text-xs">🛣️</span>}
                                      {player.largest_army && <span className="text-xs">⚔️</span>}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          {/* Detailed player stats */}
                          <div className="bg-white rounded-xl p-4 shadow-sm">
                            <h4 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                              <BarChart3 className="h-4 w-4 text-green-600" />
                              Szczegółowe statystyki graczy
                            </h4>
                            <div className="overflow-x-auto">
                              <table className="w-full">
                                <thead>
                                  <tr className="border-b border-gray-200">
                                    <th className="text-left py-2 px-3 text-sm font-medium text-gray-600">Gracz</th>
                                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Punkty</th>
                                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Drogi</th>
                                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Osady</th>
                                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Miasta</th>
                                    <th className="text-center py-2 px-3 text-sm font-medium text-gray-600">Zasoby</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {gameDetails[game.game_id].players.map((player) => (
                                    <tr 
                                      key={player.user_id}
                                      className={`border-b border-gray-100 ${
                                        player.user_id === user?.id ? 'bg-amber-50' : ''
                                      }`}
                                    >
                                      <td className="py-3 px-3">
                                        <div className="flex items-center gap-2">
                                          <span className="font-medium">{player.username}</span>
                                          {player.user_id === user?.id && (
                                            <span className="text-xs bg-amber-500 text-white px-1 rounded">TY</span>
                                          )}
                                        </div>
                                      </td>
                                      <td className="text-center py-3 px-3 font-bold text-indigo-600">
                                        {player.victory_points}
                                      </td>
                                      <td className="text-center py-3 px-3">{player.roads_built}</td>
                                      <td className="text-center py-3 px-3">{player.settlements_built}</td>
                                      <td className="text-center py-3 px-3">{player.cities_built}</td>
                                      <td className="text-center py-3 px-3">
                                        <div className="flex items-center justify-center gap-1 text-xs">
                                          {Object.entries(player.resources).map(([resource, amount]) => (
                                            <span key={resource} className="bg-gray-100 rounded px-1">
                                              {resource.charAt(0).toUpperCase()}: {amount}
                                            </span>
                                          ))}
                                        </div>
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center gap-3 text-gray-500">
                            <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-indigo-600"></div>
                            <span>Ładowanie szczegółów gry...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CatanStatsDashboard;