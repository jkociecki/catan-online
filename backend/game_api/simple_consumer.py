# backend/game_api/simple_consumer.py
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from game_engine.simple.models import SimpleGameState, GamePhase

# Store active game rooms - w prawdziwej aplikacji użyj Redis
simple_game_rooms = {}

class SimpleGameConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id'] 
        self.room_group_name = f'simple_game_{self.room_id}'
        self.player_id = str(uuid.uuid4())
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Initialize game room if it doesn't exist
        if self.room_id not in simple_game_rooms:
            simple_game_rooms[self.room_id] = {
                'game_state': SimpleGameState(),
                'connected_players': [],
                'max_players': 4
            }
        
        room = simple_game_rooms[self.room_id]
        
        # Add player to the room
        if len(room['connected_players']) < room['max_players']:
            # Assign color
            colors = ['red', 'blue', 'green', 'yellow']
            used_colors = [p['color'] for p in room['connected_players']]
            available_colors = [c for c in colors if c not in used_colors]
            
            if available_colors:
                player_color = available_colors[0]
                
                # Add to connected players
                room['connected_players'].append({
                    'player_id': self.player_id,
                    'color': player_color
                })
                
                # Add to game state
                room['game_state'].add_player(self.player_id, player_color)
                
                # Send client_id to the new player
                await self.send(text_data=json.dumps({
                    'type': 'client_id',
                    'player_id': self.player_id
                }))
                
                # Notify about new player
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_joined',
                        'player_id': self.player_id,
                        'player_color': player_color,
                        'player_count': len(room['connected_players'])
                    }
                )
                
                # Start game if we have enough players (2+)
                if len(room['connected_players']) >= 2:
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'game_start',
                            'game_state': room['game_state'].serialize()
                        }
                    )
            else:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'No colors available'
                }))
        else:
            await self.send(text_data=json.dumps({
                'type': 'error', 
                'message': 'Room is full'
            }))
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Remove player from room
        if self.room_id in simple_game_rooms:
            room = simple_game_rooms[self.room_id]
            room['connected_players'] = [
                p for p in room['connected_players'] 
                if p['player_id'] != self.player_id
            ]
            
            # Remove from game state
            if self.player_id in room['game_state'].players:
                del room['game_state'].players[self.player_id]
                if self.player_id in room['game_state'].player_order:
                    room['game_state'].player_order.remove(self.player_id)
            
            # Notify about player leaving
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'player_left',
                    'player_id': self.player_id,
                    'player_count': len(room['connected_players'])
                }
            )
            
            # Remove room if empty
            if not room['connected_players']:
                del simple_game_rooms[self.room_id]
    #tu
    # backend/game_api/simple_consumer.py - zastąp metodę receive

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            print(f"Received message: {message_type} from player {self.player_id}")
            
            if self.room_id not in simple_game_rooms:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Game room not found'
                }))
                return
            
            room = simple_game_rooms[self.room_id]
            game_state = room['game_state']
            
            if message_type == 'get_game_state':
                await self.send(text_data=json.dumps({
                    'type': 'game_state',
                    'game_state': game_state.serialize()
                }))
            
            elif message_type == 'get_client_id':
                await self.send(text_data=json.dumps({
                    'type': 'client_id',
                    'player_id': self.player_id
                }))
            
            elif message_type == 'game_action':
                action = data.get('action')
                
                # Check if it's player's turn
                current_player = game_state.get_current_player()
                if current_player.player_id != self.player_id:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Not your turn'
                    }))
                    return
                
                success = False
                error_msg = None
                should_advance_turn = False
                
                if action == 'build_settlement':
                    vertex_id = data.get('vertex_id')
                    if vertex_id is not None:
                        is_setup = game_state.phase == GamePhase.SETUP
                        
                        if is_setup:
                            # W fazie setup sprawdź czy gracz może budować osadę
                            if not game_state.can_player_build_settlement_in_setup(self.player_id):
                                error_msg = "Cannot build more settlements in this setup round"
                            else:
                                success = game_state.place_settlement(vertex_id, self.player_id, is_setup)
                                if not success:
                                    error_msg = "Cannot place settlement there"
                        else:
                            # Normalna gra
                            success = game_state.place_settlement(vertex_id, self.player_id, is_setup)
                            if not success:
                                error_msg = "Cannot place settlement there"
                    else:
                        error_msg = "Missing vertex_id"
                
                elif action == 'build_road':
                    edge_id = data.get('edge_id')
                    if edge_id is not None:
                        is_setup = game_state.phase == GamePhase.SETUP
                        
                        if is_setup:
                            # W fazie setup sprawdź czy gracz może budować drogę
                            if not game_state.can_player_build_road_in_setup(self.player_id):
                                error_msg = "Cannot build road - need settlement first or already built road for this round"
                            else:
                                success = game_state.place_road(edge_id, self.player_id, is_setup)
                                if success:
                                    # Sprawdź czy powinniśmy przejść do następnego gracza
                                    should_advance_turn = game_state.should_advance_to_next_player(self.player_id)
                                    if should_advance_turn:
                                        # Daj surowce za drugą osadę jeśli to druga runda
                                        if game_state.setup_round == 2:
                                            game_state.give_initial_resources_for_second_settlement(self.player_id, 0)  # vertex_id nie jest używane w tej implementacji
                                        
                                        game_state.advance_setup_turn()
                                        print(f"Advanced to next player. Current player index: {game_state.current_player_index}, Round: {game_state.setup_round}, Phase: {game_state.phase}")
                                else:
                                    error_msg = "Cannot place road there"
                        else:
                            # Normalna gra
                            success = game_state.place_road(edge_id, self.player_id, is_setup)
                            if not success:
                                error_msg = "Cannot place road there"
                    else:
                        error_msg = "Missing edge_id"
                
                elif action == 'end_turn':
                    if game_state.phase != GamePhase.SETUP:
                        game_state.next_turn()
                        success = True
                    else:
                        error_msg = "Cannot manually end turn in setup phase"
                
                elif action == 'roll_dice':
                    if game_state.phase == GamePhase.ROLL_DICE:
                        import random
                        dice1 = random.randint(1, 6)
                        dice2 = random.randint(1, 6)
                        total = dice1 + dice2
                        
                        game_state.phase = GamePhase.MAIN
                        
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'dice_roll',
                                'player_id': self.player_id,
                                'dice1': dice1,
                                'dice2': dice2,
                                'total': total,
                                'game_state': game_state.serialize()
                            }
                        )
                        return
                    else:
                        error_msg = "Cannot roll dice in this phase"
                
                if success:
                    # Broadcast game update
                    update_message = {
                        'type': 'game_update',
                        'action': action,
                        'player_id': self.player_id,
                        'game_state': game_state.serialize()
                    }
                    
                    # Dodaj informację o zmianie tury jeśli nastąpiła
                    if should_advance_turn:
                        current_player = game_state.get_current_player()
                        update_message['turn_advanced'] = True
                        update_message['new_current_player'] = current_player.player_id
                        
                        # Jeśli skończyła się faza setup
                        if game_state.phase != GamePhase.SETUP:
                            update_message['setup_complete'] = True
                    
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        update_message
                    )
                else:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': error_msg or f'Failed to execute {action}'
                    }))
        
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error processing message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))
    
    # Event handlers
    async def player_joined(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_joined',
            'player_id': event['player_id'],
            'player_color': event['player_color'],
            'player_count': event['player_count']
        }))
    
    async def player_left(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_left',
            'player_id': event['player_id'],
            'player_count': event['player_count']
        }))
    
    async def game_start(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_start',
            'game_state': event['game_state']
        }))
    
    async def game_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_update',
            'action': event['action'],
            'player_id': event['player_id'],
            'game_state': event['game_state']
        }))
    
    async def dice_roll(self, event):
        await self.send(text_data=json.dumps({
            'type': 'dice_roll',
            'player_id': event['player_id'],
            'dice1': event['dice1'],
            'dice2': event['dice2'],
            'total': event['total'],
            'game_state': event['game_state']
        }))