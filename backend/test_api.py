import os
import django
import traceback

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.test import Client
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User

user = User.objects.get(username='jaya')
token, _ = Token.objects.get_or_create(user=user)

client = Client(HTTP_AUTHORIZATION=f'Token {token.key}')
try:
    response = client.get('/api/portal/data/')
    print("Status:", response.status_code)
    if response.status_code == 500:
        print("Server error occurred.")
        print(response.content[:500])
except Exception as e:
    traceback.print_exc()
