import uuid

class SimpleConsumer:
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id'].lower()
        self.room_group_name = f'simple_game_{self.room_id}'
        self.player_id = str(uuid.uuid4())
        
        print(f"🔍 Player {self.player_id[:8]} connecting to room {self.room_id}") 