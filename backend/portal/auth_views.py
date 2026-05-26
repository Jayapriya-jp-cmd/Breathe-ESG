from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from rest_framework.authtoken.models import Token
from django.contrib.auth.models import User
from django.db import transaction
from data_engine.models import Organization, OrganizationMember

@api_view(['POST'])
@permission_classes([AllowAny])
def register_organization(request):
    """
    Expects:
    {
        "company_name": "...",
        "username": "...",
        "password": "...",
        "email": "..."
    }
    """
    data = request.data
    company_name = data.get('company_name')
    username = data.get('username')
    password = data.get('password')
    email = data.get('email', '')

    if not all([company_name, username, password]):
        return Response({'error': 'Missing required fields'}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(username=username).exists():
        return Response({'error': 'Username already exists'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # 1. Create Organization
            org = Organization.objects.create(name=company_name)
            
            # 2. Create User
            user = User.objects.create_user(username=username, password=password, email=email)
            
            # 3. Create Membership
            OrganizationMember.objects.create(user=user, organization=org, role='ADMIN')
            
            # 4. Generate Token
            token, _ = Token.objects.get_or_create(user=user)
            
            # 5. Pre-seed Demo Data for First Login Experience
            try:
                from populate_data import seed_logic
                seed_logic(org, user)
            except Exception as seed_err:
                # Log or ignore seeding errors so user registration doesn't fail
                print("Seeding failed on registration:", seed_err)
            
            return Response({
                'token': token.key,
                'organization': org.name,
                'username': user.username
            }, status=status.HTTP_201_CREATED)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

from rest_framework.authtoken.views import ObtainAuthToken

class CustomLoginView(ObtainAuthToken):
    def post(self, request, *args, **kwargs):
        serializer = self.serializer_class(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data['user']
        token, created = Token.objects.get_or_create(user=user)
        
        # Check if user has an organization
        try:
            org_name = user.membership.organization.name
        except AttributeError:
            org_name = "None"

        return Response({
            'token': token.key,
            'username': user.username,
            'organization': org_name
        })
