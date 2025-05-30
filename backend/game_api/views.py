# backend/game_api/views.py
import uuid
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt

@csrf_exempt
def create_room(request):
    if request.method in ['GET', 'POST']:  # ✅ OBSŁUŻ OBA
        room_id = str(uuid.uuid4())[:8]  
        return JsonResponse({'room_id': room_id})
    return JsonResponse({'error': 'Method not allowed'}, status=405)