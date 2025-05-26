# backend/game_api/simple_consumer.py - poprawiona metoda receive
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from game_engine.simple.models import SimpleGameState, GamePhase

# Store active game rooms - w prawdziwej aplikacji użyj Redis
game_rooms = {}

class SimpleGameConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
      self.room_id = self.scope['url_route']['kwargs']['room_id'] 
      self.room_group_name = f'simple_game_{self.room_id}'
      self.player_id = str(uuid.uuid4())
      
      print(f"🔍 Player {self.player_id[:8]} connecting to room {self.room_id}")
      
      # Join room group
      await self.channel_layer.group_add(
          self.room_group_name,
          self.channel_name
      )
      
      await self.accept()
      
      # Initialize game room if it doesn't exist
      if self.room_id not in game_rooms:
          game_rooms[self.room_id] = {
              'game_state': SimpleGameState(),
              'connected_players': [],
              'max_players': 4
          }
          print(f"🏠 Created new room {self.room_id}")
      
      room = game_rooms[self.room_id]
      print(f"🎯 Room {self.room_id} currently has {len(room['connected_players'])} players")
      
      # Add player to the room
      if len(room['connected_players']) < room['max_players']:
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
              
              print(f"✅ Added player {self.player_id[:8]} with color {player_color}")
              print(f"🔢 Room now has {len(room['connected_players'])} players:")
              for p in room['connected_players']:
                  print(f"   - {p['player_id'][:8]} ({p['color']})")
              
              # KLUCZOWE: Wyślij client_id do nowego gracza
              await self.send(text_data=json.dumps({
                  'type': 'client_id',
                  'player_id': self.player_id
              }))
              
              # KLUCZOWE: Wyślij pełny stan gry do nowego gracza
              await self.send(text_data=json.dumps({
                  'type': 'game_state',
                  'game_state': room['game_state'].serialize()
              }))
              
              # KLUCZOWE: Powiadom WSZYSTKICH graczy o nowym graczu
              await self.channel_layer.group_send(
                  self.room_group_name,
                  {
                      'type': 'player_joined',
                      'player_id': self.player_id,
                      'player_color': player_color,
                      'player_count': len(room['connected_players'])
                  }
              )
              
              # KLUCZOWE: Wyślij zaktualizowany stan gry do WSZYSTKICH graczy
              await self.channel_layer.group_send(
                  self.room_group_name,
                  {
                      'type': 'broadcast_game_state',
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
    async def broadcast_game_state(self, event):
      """Wyślij stan gry do tego gracza"""
      await self.send(text_data=json.dumps({
          'type': 'game_state',
          'game_state': event['game_state']
      }))
    async def game_state_update(self, event):
      await self.send(text_data=json.dumps({
          'type': 'game_state',
          'game_state': event['game_state']
      }))
    
    async def disconnect(self, close_code):
        # Leave room group
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        
        # Remove player from room
        if self.room_id in game_rooms:
            room = game_rooms[self.room_id]
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
                del game_rooms[self.room_id]

    async def receive(self, text_data):

        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            print(f"📨 Received {message_type} from player {self.player_id[:8]}")
            
            if self.room_id not in game_rooms:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Game room not found'
                }))
                return
            
            room = game_rooms[self.room_id]
            game_state = room['game_state']
            
            if message_type == 'get_game_state':
                print(f"🎮 Sending game state to player {self.player_id[:8]}")
                print(f"   Players in game state: {len(game_state.players)}")
                
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

                if action == 'roll_dice' and room['game_state'].phase.value == 'setup':
                  # Jeśli to pierwszy rzut kości w setup, oznacza to start gry
                  if len(room['connected_players']) >= 2:
                      # Wyślij powiadomienie o starcie gry
                      await self.channel_layer.group_send(
                          self.room_group_name,
                          {
                              'type': 'game_start',
                              'game_state': room['game_state'].serialize()
                          }
                      )
                      return
                  else:
                      await self.send(text_data=json.dumps({
                          'type': 'error',
                          'message': 'Need at least 2 players to start'
                      }))
                      return
                
                if action == 'build_settlement':
                    vertex_id = data.get('vertex_id')
                    if vertex_id is not None:
                        is_setup = game_state.phase == GamePhase.SETUP
                        
                        if is_setup:
                            # W fazie setup sprawdź czy gracz może budować osadę
                            if not game_state.can_player_build_settlement_in_setup(self.player_id):
                                error_msg = f"Cannot build settlement in setup - round {game_state.setup_round}"
                                print(f"Settlement build rejected for player {self.player_id}: {error_msg}")
                                print(f"Current progress: {game_state.get_setup_progress(self.player_id)}")
                            else:
                                success = game_state.place_settlement(vertex_id, self.player_id, is_setup)
                                if not success:
                                    error_msg = "Cannot place settlement there"
                                else:
                                    print(f"Settlement placed successfully for player {self.player_id}")
                                    print(f"New progress: {game_state.get_setup_progress(self.player_id)}")
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
                                error_msg = f"Cannot build road in setup - round {game_state.setup_round}"
                                print(f"Road build rejected for player {self.player_id}: {error_msg}")
                                print(f"Current progress: {game_state.get_setup_progress(self.player_id)}")
                            else:
                                success = game_state.place_road(edge_id, self.player_id, is_setup)
                                if success:
                                    print(f"Road placed successfully for player {self.player_id}")
                                    print(f"New progress: {game_state.get_setup_progress(self.player_id)}")
                                    
                                    # Sprawdź czy powinniśmy przejść do następnego gracza
                                    should_advance_turn = game_state.should_advance_to_next_player(self.player_id)
                                    print(f"Should advance turn: {should_advance_turn}")
                                    
                                    if should_advance_turn:
                                        # Daj surowce za drugą osadę jeśli to druga runda
                                        if game_state.setup_round == 2:
                                            print(f"Giving initial resources to player {self.player_id}")
                                            # POPRAWKA: Przekaż edge_id zamiast vertex_id (lub 0 jako placeholder)
                                            game_state.give_initial_resources_for_second_settlement(self.player_id, 0)
                                        
                                        # Przejdź do następnego gracza
                                        old_player = game_state.get_current_player().player_id
                                        game_state.advance_setup_turn()
                                        new_player = game_state.get_current_player().player_id
                                        print(f"Turn advanced from {old_player} to {new_player}")
                                        print(f"Game phase is now: {game_state.phase}")
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
                      # ✅ SPRAWDŹ CZY GRACZ RZUCIŁ KOŚĆMI
                      if hasattr(game_state, 'has_rolled_dice') and not game_state.has_rolled_dice.get(self.player_id, False):
                          error_msg = "You must roll dice before ending turn"
                          print(f"❌ {error_msg}")
                      else:
                          # ✅ WYCZYŚĆ FLAGĘ RZUTU KOŚCI
                          if hasattr(game_state, 'has_rolled_dice'):
                              game_state.has_rolled_dice[self.player_id] = False
                          
                          old_player = game_state.get_current_player().player_id
                          game_state.end_turn()
                          new_player = game_state.get_current_player().player_id
                          print(f"Turn ended by {old_player}, new turn: {new_player}")
                          success = True
                  else:
                      error_msg = "Cannot manually end turn in setup phase"
                
                elif action == 'roll_dice':
                  print(f"🎲 Roll dice request from {self.player_id[:8]}")
                  print(f"   Current phase: {game_state.phase}")
                  print(f"   Current player: {game_state.get_current_player().player_id[:8]}")
                  
                  if game_state.phase == GamePhase.SETUP:
                      # Start gry z setup
                      if len(room['connected_players']) >= 2:
                          print("🏁 Starting main game from setup")
                          game_state.phase = GamePhase.PLAYING
                          
                          # Wyślij powiadomienie o starcie gry
                          await self.channel_layer.group_send(
                              self.room_group_name,
                              {
                                  'type': 'game_start',
                                  'game_state': game_state.serialize()
                              }
                          )
                          
                          # ✅ KONTYNUUJ I WYKONAJ RZUT KOŚCI
                          print("🎲 Continuing with dice roll...")
                      else:
                          await self.send(text_data=json.dumps({
                              'type': 'error',
                              'message': 'Need at least 2 players to start'
                          }))
                          return
                  
                  # ✅ WYKONAJ RZUT KOŚCI w fazie PLAYING
                  if game_state.phase == GamePhase.PLAYING:
                      print("🎲 Processing dice roll in main game")
                      import random
                      dice1 = random.randint(1, 6)
                      dice2 = random.randint(1, 6)
                      total = dice1 + dice2
                      
                      print(f"   Dice result: {dice1} + {dice2} = {total}")
                      
                      # ✅ ZOSTAŃ W FAZIE PLAYING - gracz może dalej handlować/budować
                      # NIE ZMIENIAJ FAZY!
                      
                      # Rozdaj surowce za rzut kością
                      game_state.distribute_resources_for_dice_roll(total)
                      
                      # ✅ USTAW FLAGĘ że gracz już rzucił kośćmi w tej turze
                      if not hasattr(game_state, 'has_rolled_dice'):
                          game_state.has_rolled_dice = {}
                      game_state.has_rolled_dice[self.player_id] = True
                      
                      # Wyślij wynik rzutu
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
                      success = True
                      
                  else:
                      error_msg = f"Cannot roll dice in phase {game_state.phase.value}"
                      print(f"❌ {error_msg}")
                if success:
                    # Broadcast game update - TEGO BRAKOWAŁO!
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
                    
                    print(f"SENDING UPDATE: {update_message['type']}, action: {update_message['action']}")
                    
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        update_message
                    )
                elif error_msg:
                    print(f"ACTION FAILED: {action}, error: {error_msg}")
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