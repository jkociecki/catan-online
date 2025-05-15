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
        const response = await fetch(`${this.API_URL}/board/`);
        if (!response.ok) {
            throw new Error('Failed to fetch board data');
        }
        return response.json();
    }
} 