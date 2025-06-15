# backend/game_api/simple_consumer.py - POPRAWKI dla startowania gry
import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from game_engine.simple.models import SimpleGameState, GamePhase
from game_api.game_saver import GameSaver
from datetime import datetime

# Store active game rooms - w prawdziwej aplikacji użyj Redis
game_rooms = {}

class SimpleGameConsumer(AsyncWebsocketConsumer):
    
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'game_{self.room_id}'
        self.player_id = str(uuid.uuid4())
        
        # Join room group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        
        # Accept the connection
        await self.accept()
        
        # Initialize or get room
        if self.room_id not in game_rooms:
            game_rooms[self.room_id] = {
                'connected_players': [],
                'max_players': 4,
                'game_state': SimpleGameState(),
                'is_started': False
            }
            print(f"🏠 Created new room {self.room_id}")
        
        room = game_rooms[self.room_id]
        print(f"🎯 Room {self.room_id} currently has {len(room['connected_players'])} players")
        
        # Wait for user data - don't add player yet
        print(f"✅ Player {self.player_id[:8]} connected, waiting for user data")
        
        # Send client_id immediately
        await self.send(text_data=json.dumps({
            'type': 'client_id',
            'player_id': self.player_id
        }))
        
        # Send current game state
        await self.send(text_data=json.dumps({
            'type': 'game_state',
            'game_state': room['game_state'].serialize()
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
            print(f"📨 Data: {data}")  # Added debug
            
            if self.room_id not in game_rooms:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Game room not found'
                }))
                return
            
            room = game_rooms[self.room_id]
            game_state = room['game_state']

            if not hasattr(room, 'start_time'):
                room['start_time'] = datetime.now()
            
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
                    'client_id': self.player_id
                }))
            
            elif message_type == 'set_user_data':
                print(f"🎯 Processing set_user_data for {self.player_id[:8]}")
                
                display_name = data.get('display_name', f'Player_{self.player_id[:6]}')
                desired_color = data.get('color', 'blue')
                
                print(f"📋 User data: name='{display_name}', color='{desired_color}'")
                
                # Rozwiąż konflikty
                final_name = game_state.resolve_name_conflict(display_name)
                final_color = game_state.resolve_color_conflict(desired_color)
                
                print(f"✅ Final data: name='{final_name}', color='{final_color}'")
                
                # Dodaj gracza do gry (TYLKO TUTAJ!)
                game_state.add_player(self.player_id, final_color, final_name)
                
                # Dodaj do connected_players
                room['connected_players'].append({
                    'player_id': self.player_id,
                    'color': final_color,
                    'display_name': final_name
                })
                
                print(f"🎮 Added player to game: {len(game_state.players)} total players")
                
                # Wyślij zaktualizowany stan
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'broadcast_game_state',
                        'game_state': game_state.serialize()
                    }
                )
                
                # Powiadom o dołączeniu gracza
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'player_joined_notification',
                        'player_id': self.player_id,
                        'player_color': final_color,
                        'player_name': final_name,
                        'player_count': len(room['connected_players'])
                    }
                )
            
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

            elif message_type == 'create_trade_offer':
                await self.handle_create_trade_offer(data)

            elif message_type == 'accept_trade_offer':
                await self.handle_accept_trade_offer(data)

            elif message_type == 'reject_trade_offer':
                await self.handle_reject_trade_offer(data)

            elif message_type == 'cancel_trade_offer':
                await self.handle_cancel_trade_offer(data)

            elif message_type == 'bank_trade':
                await self.handle_bank_trade(data)
            
            elif message_type == 'seed_resources':
                print(f"🎯 Seed resources requested")
                
                game_state.seed_resources_for_testing()
                
                # Wyślij zaktualizowany stan
                await self.channel_layer.group_send(
                    self.room_group_name,
                    {
                        'type': 'game_update_notification',
                        'action': 'seed_resources',
                        'player_id': self.player_id,
                        'game_state': game_state.serialize()
                    }
                )
            
            elif message_type == 'game_action':
                action = data.get('action')
                
                # SPECJALNE PRZYPADKI które nie wymagają sprawdzania tury
                if action == 'seed_resources':
                    print(f"🎯 Seed resources requested")
                    game_state.seed_resources_for_testing()
                    
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'game_update_notification',
                            'action': 'seed_resources',
                            'player_id': self.player_id,
                            'game_state': game_state.serialize()
                        }
                    )
                    return
                
                # DLA WSZYSTKICH INNYCH AKCJI: Sprawdź turę
                if not game_state.is_current_player(self.player_id):
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': 'Not your turn'
                    }))
                    return
                
                success = False
                error_msg = None
                game_ended = False
                should_advance_turn = False

                if action == 'build_settlement':
                    vertex_id = data.get('vertex_id')
                    if vertex_id is not None:
                        is_setup = game_state.phase == GamePhase.SETUP
                        
                        if is_setup:
                            # W setup - sprawdź czy może budować osadę
                            if not game_state.can_player_build_settlement_in_setup(self.player_id):
                                progress = game_state.get_setup_progress(self.player_id)
                                error_msg = f"Cannot build settlement now. Round: {game_state.setup_round}, Progress: {progress}"
                                print(f"❌ Settlement rejected: {error_msg}")
                            else:
                                success = game_state.place_settlement(vertex_id, self.player_id, is_setup)
                                if not success:
                                    error_msg = "Cannot place settlement there"
                                else:
                                    print(f"✅ Settlement placed in setup by {self.player_id[:8]}")
                        else:
                            # W normalnej grze - sprawdź czy rzucił kostką
                            if not game_state.can_take_actions(self.player_id):
                                error_msg = "You must roll dice first before building"
                            else:
                                success = game_state.place_settlement(vertex_id, self.player_id, is_setup)
                                if not success:
                                    error_msg = "Cannot place settlement there"
                                else:
                                    # Sprawdź zwycięstwo
                                    if game_state.check_victory_after_action(self.player_id):
                                        game_ended = True
                    else:
                        error_msg = "Missing vertex_id"
                
                elif action == 'build_road':
                    edge_id = data.get('edge_id')
                    if edge_id is not None:
                        is_setup = game_state.phase == GamePhase.SETUP
                        
                        if is_setup:
                            # W setup - sprawdź czy może budować drogę
                            if not game_state.can_player_build_road_in_setup(self.player_id):
                                progress = game_state.get_setup_progress(self.player_id)
                                error_msg = f"Cannot build road now. Round: {game_state.setup_round}, Progress: {progress}"
                                print(f"❌ Road rejected: {error_msg}")
                            else:
                                success = game_state.place_road(edge_id, self.player_id, is_setup)
                                if not success:
                                    error_msg = "Cannot place road there"
                                else:
                                    print(f"✅ Road placed in setup by {self.player_id[:8]}")
                                    
                                    # KLUCZOWE: Sprawdź czy powinniśmy przejść do następnego gracza
                                    if game_state.should_advance_to_next_player(self.player_id):
                                        print(f"🔄 Should advance turn after road placement")
                                        should_advance_turn = True
                        else:
                            # W normalnej grze
                            if not game_state.can_take_actions(self.player_id):
                                error_msg = "You must roll dice first before building"
                            else:
                                success = game_state.place_road(edge_id, self.player_id, is_setup)
                                if not success:
                                    error_msg = "Cannot place road there"
                    else:
                        error_msg = "Missing edge_id"

                elif action == 'build_city':
                    vertex_id = data.get('vertex_id')
                    if vertex_id is not None:
                        if game_state.phase == GamePhase.SETUP:
                            error_msg = "Cannot build city during setup phase"
                        elif not game_state.can_take_actions(self.player_id):
                            error_msg = "You must roll dice first before building"
                        else:
                            success = game_state.place_city(vertex_id, self.player_id)
                            if not success:
                                error_msg = "Cannot build city there"
                            else:
                                if game_state.check_victory_after_action(self.player_id):
                                    game_ended = True
                    else:
                        error_msg = "Missing vertex_id"
                        
                elif action == 'end_turn':
                    print(f"⏭️ End turn request from {self.player_id[:8]}")
                    
                    if game_state.phase == GamePhase.SETUP:
                        # W fazie setup sprawdź czy może zakończyć turę
                        if not game_state.can_end_turn_in_setup(self.player_id):
                            progress = game_state.get_setup_progress(self.player_id)
                            error_msg = f"Cannot end turn - incomplete setup. Progress: {progress}"
                            print(f"❌ {error_msg}")
                        else:
                            # Wykonaj advance_setup_turn
                            old_phase = game_state.phase
                            game_state.advance_setup_turn()
                            success = True
                            should_advance_turn = True
                            
                            # Sprawdź czy gra przeszła do fazy głównej
                            if old_phase == GamePhase.SETUP and game_state.phase == GamePhase.PLAYING:
                                print("🎉 Setup complete! Moving to main game phase")
                            
                            print(f"✅ Setup turn ended by {self.player_id[:8]}")
                    
                    elif game_state.phase == GamePhase.PLAYING:
                        # W normalnej grze sprawdź czy rzucił kostką
                        if not game_state.can_end_turn_in_game(self.player_id):
                            error_msg = "You must roll dice before ending turn"
                            print(f"❌ {error_msg}")
                        else:
                            game_state.end_turn()
                            success = True
                            should_advance_turn = True
                            print(f"✅ Game turn ended by {self.player_id[:8]}")
                    
                    else:
                        error_msg = "Cannot end turn in this game phase"

                elif action == 'roll_dice':
                    print(f"🎲 Roll dice request from {self.player_id[:8]}")
                    
                    if game_state.phase == GamePhase.SETUP:
                        error_msg = "Cannot roll dice in setup phase"
                        print(f"❌ {error_msg}")
                    
                    elif game_state.phase == GamePhase.PLAYING:
                        if not game_state.can_roll_dice(self.player_id):
                            if game_state.has_rolled_dice.get(self.player_id, False):
                                error_msg = "You have already rolled dice this turn"
                            else:
                                error_msg = "You cannot roll dice right now"
                            print(f"❌ {error_msg}")
                        else:
                            print("🎲 Processing dice roll in main game")
                            import random
                            dice1 = random.randint(1, 6)
                            dice2 = random.randint(1, 6)
                            dice_total = dice1 + dice2
                            
                            try:
                                game_state.handle_dice_roll(self.player_id, dice_total)
                                success = True
                                
                                print(f"✅ Dice rolled: {dice1} + {dice2} = {dice_total}")
                                
                                # Wyślij informację o rzucie kości do wszystkich graczy
                                await self.channel_layer.group_send(
                                    self.room_group_name,
                                    {
                                        'type': 'dice_roll_notification',
                                        'player_id': self.player_id,
                                        'dice1': dice1,
                                        'dice2': dice2,
                                        'total': dice_total,
                                        'game_state': game_state.serialize()
                                    }
                                )
                                
                            except ValueError as e:
                                error_msg = str(e)
                                print(f"❌ Dice roll failed: {error_msg}")
                    
                    else:
                        error_msg = "Cannot roll dice in this game phase"

                # OBSŁUGA WYNIKÓW
                if game_ended:
                    # Wyślij informację o końcu gry
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'game_end_notification',
                            'winner_id': self.player_id,
                            'final_standings': game_state.get_final_standings(),
                            'game_state': game_state.serialize()
                        }
                    )
                elif success:
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
                        if game_state.phase == GamePhase.PLAYING:
                            update_message['setup_complete'] = True
                    
                    print(f"📤 SENDING UPDATE: {update_message['type']}, action: {update_message['action']}")
                    
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        update_message
                    )
                elif error_msg:
                    print(f"❌ ACTION FAILED: {action}, error: {error_msg}")
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': error_msg
                    }))
                
        except Exception as e:
            import traceback
            traceback.print_exc()
            print(f"Error processing message: {str(e)}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Server error: {str(e)}'
            }))
            
    # ✅ DODAJ NOWY EVENT HANDLER dla końca gry
    async def game_end_notification(self, event):
        """Powiadom o końcu gry i zapisz do bazy danych"""
        try:
            # Wyślij notyfikację do klienta
            await self.send(text_data=json.dumps({
                'type': 'game_ended',
                'winner_id': event['winner_id'],
                'final_standings': event['final_standings'],
                'game_state': event['game_state']
            }))
            
            # ✅ ZAPISZ GRĘ DO BAZY DANYCH
            if self.room_id in game_rooms:
                room = game_rooms[self.room_id]
                game_state = room['game_state']
                
                # Zapisz grę do bazy danych w tle
                from django.db import transaction
                
                def save_game_to_db():
                    try:
                        with transaction.atomic():
                            # Ustaw czas rozpoczęcia gry (jeśli nie jest już ustawiony)
                            start_time = getattr(room, 'start_time', None) or datetime.now()
                            
                            saved_game = GameSaver.save_completed_game(
                                game_state=game_state,
                                start_time=start_time
                            )
                            
                            if saved_game:
                                print(f"✅ Game {saved_game.id} saved to database successfully")
                            else:
                                print("❌ Failed to save game to database")
                                
                    except Exception as e:
                        print(f"❌ Database save error: {e}")
                        import traceback
                        traceback.print_exc()
                
                # Wykonaj zapis w osobnym wątku, żeby nie blokować WebSocket
                import threading
                save_thread = threading.Thread(target=save_game_to_db)
                save_thread.start()
                
        except Exception as e:
            print(f"❌ Error in game_end_notification: {e}")
            import traceback
            traceback.print_exc()
    
    # ✅ POPRAWIONE Event handlers - dodano _notification sufiksy
    async def player_joined_notification(self, event):
        # Wyślij tylko do innych graczy (nie do siebie)
        if event['player_id'] != self.player_id:
            await self.send(text_data=json.dumps({
                'type': 'player_joined',
                'player_id': event['player_id'],
                'player_color': event['player_color'],
                'player_name': event['player_name'],
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

    # Trade handling methods
    async def handle_create_trade_offer(self, data):
        """Gracz tworzy ofertę handlową"""
        try:
            offering_resources = data.get('offering', {})  # {wood: 2, brick: 1}
            requesting_resources = data.get('requesting', {})  # {sheep: 1, wheat: 1}
            target_player_id = data.get('target_player_id')  # Konkretny gracz lub None
            
            if self.room_id not in game_rooms:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Game room not found'
                }))
                return
            
            room = game_rooms[self.room_id]
            game_state = room['game_state']
            
            # Sprawdź czy to tura gracza
            current_player = game_state.get_current_player()
            if current_player.player_id != self.player_id:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Not your turn'
                }))
                return
            
            # Sprawdź czy gracz ma wystarczająco zasobów
            player = game_state.players[self.player_id]
            for resource, amount in offering_resources.items():
                current_amount = getattr(player.resources, resource, 0)
                if current_amount < amount:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': f'Not enough {resource}'
                    }))
                    return
            
            # Utwórz ofertę
            import uuid
            import time
            trade_offer = {
                'id': str(uuid.uuid4()),
                'from_player_id': self.player_id,
                'offering': offering_resources,
                'requesting': requesting_resources,
                'target_player_id': target_player_id,
                'created_at': time.time()
            }
            
            # Zapisz ofertę w stanie gry
            if not hasattr(game_state, 'active_trade_offers'):
                game_state.active_trade_offers = {}
            game_state.active_trade_offers[trade_offer['id']] = trade_offer
            
            print(f"🤝 Trade offer created by {self.player_id[:8]}: {offering_resources} for {requesting_resources}")
            
            # Wyślij ofertę do wszystkich graczy
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'trade_offer_notification',
                    'trade_offer': trade_offer
                }
            )
            
        except Exception as e:
            print(f"Error creating trade offer: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error creating trade offer: {str(e)}'
            }))

    async def handle_accept_trade_offer(self, data):
        """Gracz akceptuje ofertę handlową"""
        try:
            trade_offer_id = data.get('trade_offer_id')
            
            if self.room_id not in game_rooms:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Game room not found'
                }))
                return
            
            room = game_rooms[self.room_id]
            game_state = room['game_state']
            
            if not hasattr(game_state, 'active_trade_offers'):
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'No active trade offers'
                }))
                return
            
            trade_offer = game_state.active_trade_offers.get(trade_offer_id)
            if not trade_offer:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Trade offer not found'
                }))
                return
            
            # Sprawdź czy gracz może akceptować tę ofertę
            if trade_offer['target_player_id'] and trade_offer['target_player_id'] != self.player_id:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'This offer is not for you'
                }))
                return
            
            if trade_offer['from_player_id'] == self.player_id:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Cannot accept your own offer'
                }))
                return
            
            # Sprawdź czy akceptujący gracz ma wystarczające zasoby
            accepting_player = game_state.players[self.player_id]
            for resource, amount in trade_offer['requesting'].items():
                current_amount = getattr(accepting_player.resources, resource, 0)
                if current_amount < amount:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': f'You don\'t have enough {resource}'
                    }))
                    return
            
            # Sprawdź czy oferujący nadal ma zasoby
            # Sprawdź czy oferujący nadal ma zasoby
            offering_player = game_state.players[trade_offer['from_player_id']]
            for resource, amount in trade_offer['offering'].items():
                current_amount = getattr(offering_player.resources, resource, 0)
                if current_amount < amount:
                    await self.send(text_data=json.dumps({
                        'type': 'error',
                        'message': f'Offering player no longer has enough {resource}'
                    }))
                    return
            
            # Wykonaj wymianę zasobów
            # Zabierz zasoby od oferującego, daj akceptującemu
            for resource, amount in trade_offer['offering'].items():
                # Zabierz od oferującego
                current_offering = getattr(offering_player.resources, resource, 0)
                setattr(offering_player.resources, resource, current_offering - amount)
                
                # Daj akceptującemu
                current_accepting = getattr(accepting_player.resources, resource, 0)
                setattr(accepting_player.resources, resource, current_accepting + amount)

            # Zabierz zasoby od akceptującego, daj oferującemu
            for resource, amount in trade_offer['requesting'].items():
                # Zabierz od akceptującego
                current_accepting = getattr(accepting_player.resources, resource, 0)
                setattr(accepting_player.resources, resource, current_accepting - amount)
                
                # Daj oferującemu
                current_offering = getattr(offering_player.resources, resource, 0)
                setattr(offering_player.resources, resource, current_offering + amount)
            
            print(f"🤝 Trade completed between {trade_offer['from_player_id'][:8]} and {self.player_id[:8]}")
            
            # Usuń ofertę
            del game_state.active_trade_offers[trade_offer_id]
            
            # Powiadom wszystkich o wykonanym handlu
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'trade_completed_notification',
                    'trade_offer': trade_offer,
                    'accepting_player_id': self.player_id,
                    'game_state': game_state.serialize()
                }
            )
            
        except Exception as e:
            print(f"Error accepting trade: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Error accepting trade: {str(e)}'
            }))

    async def handle_reject_trade_offer(self, data):
        """Gracz odrzuca ofertę handlową"""
        trade_offer_id = data.get('trade_offer_id')
        # Po prostu usuń ofertę z listy aktywnych u klienta - nie robimy nic na serwerze
        await self.send(text_data=json.dumps({
            'type': 'trade_offer_rejected',
            'trade_offer_id': trade_offer_id
        }))

    async def handle_cancel_trade_offer(self, data):
        """Gracz anuluje swoją ofertę handlową"""
        try:
            trade_offer_id = data.get('trade_offer_id')
            
            if self.room_id not in game_rooms:
                return
            
            room = game_rooms[self.room_id]
            game_state = room['game_state']
            
            if hasattr(game_state, 'active_trade_offers') and trade_offer_id in game_state.active_trade_offers:
                trade_offer = game_state.active_trade_offers[trade_offer_id]
                
                # Sprawdź czy to oferta tego gracza
                if trade_offer['from_player_id'] == self.player_id:
                    del game_state.active_trade_offers[trade_offer_id]
                    
                    # Powiadom wszystkich o anulowaniu
                    await self.channel_layer.group_send(
                        self.room_group_name,
                        {
                            'type': 'trade_offer_cancelled_notification',
                            'trade_offer_id': trade_offer_id
                        }
                    )
        except Exception as e:
            print(f"Error cancelling trade offer: {e}")

    # Event handlers dla handlu
    async def trade_offer_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'trade_offer_received',
            'trade_offer': event['trade_offer']
        }))

    async def trade_completed_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'trade_completed',
            'trade_offer': event['trade_offer'],
            'accepting_player_id': event['accepting_player_id'],
            'game_state': event['game_state']
        }))

    async def trade_offer_cancelled_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'trade_offer_cancelled',
            'trade_offer_id': event['trade_offer_id']
        }))
    
    async def handle_bank_trade(self, data):
        """Handel z bankiem 4:1"""
        try:
            giving_resource = data.get('giving_resource')  # 'wood'
            giving_amount = data.get('giving_amount', 4)   # domyślnie 4
            requesting_resource = data.get('requesting_resource')  # 'sheep'
            
            if self.room_id not in game_rooms:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Game room not found'
                }))
                return
            
            room = game_rooms[self.room_id]
            game_state = room['game_state']
            
            # Sprawdź czy to tura gracza
            current_player = game_state.get_current_player()
            if current_player.player_id != self.player_id:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': 'Not your turn'
                }))
                return
            
            # Sprawdź czy gracz ma wystarczająco zasobów
            player = game_state.players[self.player_id]
            current_amount = getattr(player.resources, giving_resource, 0)
            
            if current_amount < giving_amount:
                await self.send(text_data=json.dumps({
                    'type': 'error',
                    'message': f'Not enough {giving_resource} (need {giving_amount}, have {current_amount})'
                }))
                return
            
            # Wykonaj handel z bankiem
            # Zabierz zasoby
            setattr(player.resources, giving_resource, current_amount - giving_amount)
            
            # Daj nowy zasób
            current_requesting = getattr(player.resources, requesting_resource, 0)
            setattr(player.resources, requesting_resource, current_requesting + 1)
            
            print(f"🏪 Bank trade: {self.player_id[:8]} gave {giving_amount} {giving_resource} for 1 {requesting_resource}")
            
            # Powiadom wszystkich
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'bank_trade_notification',
                    'player_id': self.player_id,
                    'giving_resource': giving_resource,
                    'giving_amount': giving_amount,
                    'requesting_resource': requesting_resource,
                    'game_state': game_state.serialize()
                }
            )
            
        except Exception as e:
            print(f"Error in bank trade: {e}")
            await self.send(text_data=json.dumps({
                'type': 'error',
                'message': f'Bank trade error: {str(e)}'
            }))

    # Event handler dla bank trade
    async def bank_trade_notification(self, event):
        await self.send(text_data=json.dumps({
            'type': 'bank_trade_completed',
            'player_id': event['player_id'],
            'giving_resource': event['giving_resource'],
            'giving_amount': event['giving_amount'],
            'requesting_resource': event['requesting_resource'],
            'game_state': event['game_state']
        }))