// frontend/src/view/Statistics.tsx - POPRAWIONA WERSJA Z OBSŁUGĄ BŁĘDÓW
import React, { useState, useEffect } from 'react';
import { Trophy, TrendingUp, Target, Dice6, Calendar, User, BarChart3, Activity, ChevronDown, ChevronRight, Gamepad2, Users, Clock, Award, LogIn, AlertCircle } from 'lucide-react';
import NavBar from '../navigation/NavigationBar';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

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

// ✅ KOMPONENT - Ekran logowania
const LoginPrompt: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <NavBar />
      
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center">
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-12 max-w-md mx-auto">
            <div className="mb-6">
              <LogIn className="h-16 w-16 text-indigo-600 mx-auto mb-4" />
              <h1 className="text-3xl font-bold text-gray-800 mb-4">
                📊 Statystyki Catan
              </h1>
              <p className="text-gray-600 text-lg mb-8">
                Aby zobaczyć swoje statystyki i analizę rozgrywek, musisz się zalogować.
              </p>
            </div>

            <div className="space-y-4">
              <button
                onClick={() => navigate('/login')}
                className="w-full bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all duration-200 font-semibold text-lg transform hover:scale-105 hover:shadow-xl"
              >
                🚀 Zaloguj się
              </button>
              
              <div className="text-sm text-gray-500">
                <p>Dostępne opcje logowania:</p>
                <ul className="mt-2 space-y-1">
                  <li>• Konto Google</li>
                  <li>• Gra jako gość</li>
                  <li>• Szybki start</li>
                </ul>
              </div>
            </div>

            <div className="mt-8 p-4 bg-gray-50 rounded-xl">
              <h3 className="font-semibold text-gray-800 mb-2">
                Co zobaczysz po zalogowaniu:
              </h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>📈 Szczegółowe statystyki gier</li>
                <li>🏆 Ranking i porównania</li>
                <li>📊 Analizy strategii</li>
                <li>📅 Historia rozgrywek</li>
                <li>🎯 Postępy i osiągnięcia</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ KOMPONENT - Brak danych
const NoDataPrompt: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <NavBar />
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-800 mb-8">📊 Statystyki</h1>
          <div className="bg-white/90 backdrop-blur-sm p-12 rounded-2xl shadow-xl max-w-lg mx-auto">
            <Gamepad2 className="h-20 w-20 text-gray-400 mx-auto mb-6" />
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Brak danych statystycznych</h2>
            <p className="text-gray-600 text-lg mb-6">
              Zagraj kilka gier, aby zobaczyć swoje statystyki i analizy!
            </p>
            <div className="space-y-4">
              <button 
                onClick={() => navigate('/room/new')}
                className="w-full bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition-colors font-semibold text-lg"
              >
                🎮 Rozpocznij pierwszą grę
              </button>
              <button 
                onClick={() => navigate('/active-games')}
                className="w-full bg-gray-200 text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-300 transition-colors font-semibold text-lg"
              >
                👀 Zobacz aktywne gry
              </button>
            </div>
            
            <div className="mt-8 p-4 bg-blue-50 rounded-xl">
              <h3 className="font-semibold text-blue-800 mb-2">
                💡 Jak zdobywać statystyki:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Dokończ rozgrywkę do końca</li>
                <li>• Zagraj z innymi graczami online</li>
                <li>• Twoje wyniki będą automatycznie zapisane</li>
                <li>• Analizy pojawią się po kilku grach</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ✅ KOMPONENT - Błąd autoryzacji
const AuthErrorPrompt: React.FC<{ error: string; onRetry: () => void }> = ({ error, onRetry }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100">
      <NavBar />
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="text-center">
          <div className="bg-white/90 backdrop-blur-sm p-12 rounded-2xl shadow-2xl max-w-md mx-auto">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-red-800 mb-4">Błąd autoryzacji</h1>
            <p className="text-red-700 mb-6">{error}</p>
            
            <div className="space-y-3">
              <button 
                onClick={onRetry}
                className="w-full bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-colors font-medium"
              >
                🔄 Spróbuj ponownie
              </button>
              
              <button 
                onClick={() => navigate('/login')}
                className="w-full bg-gray-200 text-gray-700 px-6 py-3 rounded-xl hover:bg-gray-300 transition-colors font-medium"
              >
                🔑 Zaloguj się ponownie
              </button>
            </div>
            
            <div className="mt-6 p-4 bg-red-50 rounded-xl">
              <p className="text-sm text-red-700">
                <strong>Możliwe przyczyny:</strong><br/>
                • Sesja wygasła<br/>
                • Błąd połączenia z serwerem<br/>
                • Brak uprawnień do danych
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const CatanStatsDashboard = () => {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [games, setGames] = useState<GameData[]>([]);
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const { user, token } = useAuth();

  const API_BASE = `${process.env.REACT_APP_API_URL}/api`;

  // ✅ SPRAWDŹ LOGOWANIE NA POCZĄTKU
  useEffect(() => {
    if (!user || !token) {
      setLoading(false);
      return;
    }
    
    fetchAllData();
  }, [user, token]);

  const fetchAllData = async () => {
    if (!user?.id || !token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setAuthError(null);

      const headers = {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      };

      console.log('🔍 Fetching stats for user:', user.id);
      
      // ✅ Pobierz dane z obsługą błędów autoryzacji
      const [statsResponse, gamesResponse, globalResponse] = await Promise.allSettled([
        fetch(`${API_BASE}/users/${user.id}/statistics/`, { headers }),
        fetch(`${API_BASE}/users/${user.id}/games/`, { headers }),
        fetch(`${API_BASE}/stats/global_stats/`)  // Global stats bez autoryzacji
      ]);

      // Obsługa statystyk użytkownika
      if (statsResponse.status === 'fulfilled') {
        if (statsResponse.value.status === 401 || statsResponse.value.status === 403) {
          setAuthError('Brak autoryzacji do przeglądania statystyk. Zaloguj się ponownie.');
          return;
        }
        
        if (statsResponse.value.ok) {
          const statsData = await statsResponse.value.json();
          console.log('📊 Stats received:', statsData);
          setStats(statsData);
        } else {
          console.warn('Failed to fetch user statistics:', statsResponse.value.status);
        }
      }

      // Obsługa gier użytkownika  
      if (gamesResponse.status === 'fulfilled') {
        if (gamesResponse.value.status === 401 || gamesResponse.value.status === 403) {
          setAuthError('Brak autoryzacji do przeglądania gier. Zaloguj się ponownie.');
          return;
        }
        
        if (gamesResponse.value.ok) {
          const gamesData = await gamesResponse.value.json();
          console.log('🎮 Games received:', gamesData.length, 'games');
          setGames(gamesData);
        } else {
          console.warn('Failed to fetch user games:', gamesResponse.value.status);
        }
      }

      // Obsługa globalnych statystyk
      if (globalResponse.status === 'fulfilled' && globalResponse.value.ok) {
        const globalData = await globalResponse.value.json();
        console.log('🌍 Global stats received');
        setGlobalStats(globalData);
      }

      console.log('✅ Data fetch completed');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Nieznany błąd';
      console.error('❌ Error fetching data:', err);
      setError('Błąd podczas pobierania danych: ' + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // ✅ JEŚLI NIE ZALOGOWANY - POKAŻ EKRAN LOGOWANIA
  if (!user || !token) {
    return <LoginPrompt />;
  }

  // ✅ JEŚLI BŁĄD AUTORYZACJI - POKAŻ EKRAN BŁĘDU
  if (authError) {
    return <AuthErrorPrompt error={authError} onRetry={fetchAllData} />;
  }

  // Loading state
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

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center">
        <NavBar />
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

  // ✅ JEŚLI BRAK STATYSTYK - POKAŻ INFORMACJĘ
  if (!stats || stats.total_games === 0) {
    return <NoDataPrompt />;
  }

  // Simple chart components (zachowaj istniejące)
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <NavBar />

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">📊 Statystyki Catan</h1>
          <p className="text-gray-600 text-lg">Analiza rozgrywek gracza: {user.display_name || user.username}</p>
        </div>

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

        {/* Charts section */}
        {pointsChart.length > 0 && (
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Activity className="h-6 w-6 text-indigo-600" />
              Analiza wyników
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <SimpleBarChart 
                data={pointsChart} 
                title="Rozkład końcowych punktów"
                color="#8b5cf6"
              />
              
              <SimpleBarChart 
                data={buildingsData} 
                title="Średnie budynki na grę"
                color="#f59e0b"
              />
            </div>
          </div>
        )}

        {/* Historia gier */}
        {games && games.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-indigo-600" />
              Historia gier ({games.length})
            </h2>
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
              <div className="space-y-0">
                {games.slice(0, 10).map((game: GameData, index: number) => (
                  <div 
                    key={index}
                    className={`p-6 border-b border-gray-100/50 ${
                      game.won ? 'bg-gradient-to-r from-green-50/50 to-emerald-50/50' : 'bg-gradient-to-r from-red-50/50 to-pink-50/50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-6">
                        <div className="flex items-center gap-2">
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
                            Gra #{game.game_id}
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
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatanStatsDashboard;