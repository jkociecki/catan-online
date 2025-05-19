from django.shortcuts import redirect
from django.conf import settings
from django.contrib.auth.decorators import login_required
from rest_framework.authtoken.models import Token

@login_required
def token_callback(request):
    """
    Creates a DRF token after successful OAuth login and redirects to frontend
    """
    # Generate token for logged in user
    token, _ = Token.objects.get_or_create(user=request.user)
    
    # Redirect to frontend with token
    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
    redirect_url = f'{frontend_url}/auth-callback?token={token.key}'
    
    return redirect(redirect_url) 