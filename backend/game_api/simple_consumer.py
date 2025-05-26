# backend/game_api/simple_consumer.py - POPRAWKI dla startowania gry
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
              
              # ✅ NAJPIERW wyślij client_id
              await self.send(text_data=json.dumps({
                  'type': 'client_id',
                  'player_id': self.player_id
              }))
              
              # ✅ POCZEKAJ krótko i wyślij stan gry
              import asyncio
              await asyncio.sleep(0.1)
              
              game_state_data = room['game_state'].serialize()
              print(f"📤 Sending game_state to new player {self.player_id[:8]}")
              print(f"   Players in serialized state: {len(game_state_data.get('players', {}))}")
              
              await self.send(text_data=json.dumps({
                  'type': 'game_state',
                  'game_state': game_state_data
              }))
              
              # ✅ Powiadom innych o nowym graczu
              await self.channel_layer.group_send(
                  self.room_group_name,
                  {
                      'type': 'player_joined_notification',
                      'player_id': self.player_id,
                      'player_color': player_color,
                      'player_count': len(room['connected_players'])
                  }
              )
              
              # ✅ NOWA LOGIKA: Automatycznie rozpocznij grę przy 4 graczach
              if len(room['connected_players']) == 4:
                  print("🏁 AUTO-STARTING game with 4 players")
                  await asyncio.sleep(0.3)  # Krótka pauza żeby wszyscy się połączyli
                  
                  # Rozpocznij grę
                  await self.channel_layer.group_send(
                      self.room_group_name,
                      {
                          'type': 'game_start_notification',
                          'game_state': room['game_state'].serialize()
                      }
                  )
              
              # ✅ POCZEKAJ i wyślij zaktualizowany stan do WSZYSTKICH
              await asyncio.sleep(0.2)
              
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
      print(f"📤 Broadcasting game state to {self.player_id[:8]}")
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
                    'type': 'player_left_notification',
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
                game_state_data = game_state.serialize()
                print(f"   Players in game state: {len(game_state_data.get('players', {}))}")
                
                await self.send(text_data=json.dumps({
                    'type': 'game_state',
                    'game_state': game_state_data
                }))
            
            elif message_type == 'get_client_id':
                await self.send(text_data=json.dumps({
                    'type': 'client_id',
                    'player_id': self.player_id
                }))
            
            # ✅ NOWA AKCJA: start_game_manual - pozwala każdemu graczowi rozpocząć grę
            elif message_type == 'start_game_manual':
                print(f"🎮 Manual game start requested by {self.player_id[:8]}")
                
                if len(room['connected_players']) >= 2:
                    print("🏁 Starting game manually")
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'game_start_notification',
                            'game_state': game_state.serialize()
                        }
                    )
                else:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Need at least 2 players to start'
                    }))
            
            elif message_type == 'game_action':
                action = data.get('action')
                
                # ✅ SPECJALNE PRZYPADKI które nie wymagają sprawdzania tury:
                if action == 'roll_dice' and room['game_state'].phase.value == 'setup':
                    # Ten przypadek był używany do startowania gry - teraz używamy start_game_manual
                    if len(room['connected_players']) >= 2:
                        print("🏁 Starting game via old roll_dice method")
                        await self.channel_layer.group_send(
                            self.room_group_name,
                            {
                                'type': 'game_start_notification',
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
                
                # ✅ DLA WSZYSTKICH INNYCH AKCJI: Sprawdź turę
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
                  
                  # ✅ WYKONAJ RZUT KOŚCI w fazie PLAYING
                  if game_state.phase == GamePhase.PLAYING:
                      print("🎲 Processing dice roll in main game")
                      import random
                      dice1 = random.randint(1, 6)
                      dice2 = random.randint(1, 6)
                      total = dice1 + dice2
                      
                      print(f"   Dice result: {dice1} + {dice2} = {total}")
                      
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
                              'type': 'dice_roll_notification',
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
                    # Broadcast game update
                    update_message = {
                        'type': 'game_update_notification',
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
    
    # ✅ POPRAWIONE Event handlers - dodano _notification sufiksy
    async def player_joined_notification(self, event):
        # Wyślij tylko do innych graczy (nie do siebie)
        if event['player_id'] != self.player_id:
            await self.send(text_data=json.dumps({
                'type': 'player_joined',
                'player_id': event['player_id'],
                'player_color': event['player_color'],
                'player_count': event['player_count']
            }))
    
    async def player_left_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'player_left',
            'player_id': event['player_id'],
            'player_count': event['player_count']
        }))
    
    async def game_start_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_start',
            'game_state': event['game_state']
        }))
    
    async def game_update_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'game_update',
            'action': event['action'],
            'player_id': event['player_id'],
            'game_state': event['game_state']
        }))
    
    async def dice_roll_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'dice_roll',
            'player_id': event['player_id'],
            'dice1': event['dice1'],
            'dice2': event['dice2'],
            'total': event['total'],
            'game_state': event['game_state']
        }))