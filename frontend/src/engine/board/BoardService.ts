export interface BoardData {
    tiles: Array<{
        coordinates: { q: number; r: number; s: number };
        resource: string;
        number: number | null;
        has_robber: boolean;
    }>;
    vertices: Record<string, {
        coordinates: Array<[number, number, number]>;
        building: {
            type: string;
            player_id: string;
            player_color: string | null;
        } | null;
    }>;
    edges: Record<string, {
        coordinates: Array<[number, number, number]>;
        road: {
            player_id: string;
            player_color: string | null;
        } | null;
    }>;
}

export class BoardService {
    private static readonly API_URL = 'http://localhost:8000/api';

    static async getRandomBoard(): Promise<BoardData> {
        try {
            const response = await fetch(`${this.API_URL}/board/`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch board data: ${response.status} ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log("Received board data:", data);
            return data;
        } catch (error) {
            console.error("Error fetching board:", error);
            throw error;
        }
    }
}