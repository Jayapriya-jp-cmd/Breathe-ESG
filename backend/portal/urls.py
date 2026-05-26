from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import EnvironmentalDataViewSet, OrganizationViewSet
from .ingest_views import ingest_data
from .auth_views import register_organization, CustomLoginView

router = DefaultRouter()
router.register(r'data', EnvironmentalDataViewSet, basename='data')
router.register(r'orgs', OrganizationViewSet, basename='orgs')

urlpatterns = [
    path('auth/register/', register_organization, name='register'),
    path('auth/login/', CustomLoginView.as_view(), name='login'),
    path('ingest/', ingest_data, name='ingest-data'),
    path('', include(router.urls)),
]
